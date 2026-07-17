use super::*;

#[tokio::test]
async fn test_extract_skills_from_resume() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let resume_text = r#"
        SKILLS
        Proficient in Python, JavaScript, and Rust.
        Experience with React, Django, and PostgreSQL.
        Familiar with Docker and AWS.
    "#;

    let resume_id = create_test_resume(&pool, "Tech Resume", resume_text).await;

    // Get extracted skills (already done in create_test_resume)
    let skills = matcher.get_user_skills(resume_id).await.unwrap();

    // Should find multiple skills
    assert!(!skills.is_empty());

    let skill_names: Vec<String> = skills.iter().map(|s| s.skill_name.clone()).collect();
    assert!(skill_names.contains(&"Python".to_string()));
    assert!(skill_names.contains(&"JavaScript".to_string()));
    assert!(skill_names.contains(&"Rust".to_string()));
    assert!(skill_names.contains(&"React".to_string()));
}

#[tokio::test]
async fn test_extract_skills_duplicate_prevention() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let resume_text = "Python Python Python JavaScript JavaScript";
    let resume_id = create_test_resume(&pool, "Duplicate Resume", resume_text).await;

    let skills = matcher.get_user_skills(resume_id).await.unwrap();

    let python_count = skills.iter().filter(|s| s.skill_name == "Python").count();
    assert_eq!(python_count, 1, "Should only have one Python skill");
}

#[tokio::test]
async fn test_get_user_skills() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

    // Create resume without skills first
    let result = sqlx::query(
        "INSERT INTO resumes (name, file_path, parsed_text, is_active) VALUES (?, ?, ?, 1)",
    )
    .bind("Test Resume")
    .bind("fixtures/resumes/test.pdf")
    .bind("")
    .execute(&pool)
    .await
    .unwrap();
    let resume_id = result.last_insert_rowid();

    // Manually insert skills with specific scores
    for (skill, score) in &[("Python", 0.9), ("JavaScript", 0.7), ("TypeScript", 0.5)] {
        sqlx::query(
            "INSERT INTO user_skills (resume_id, skill_name, skill_category, confidence_score, source) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(resume_id)
        .bind(skill)
        .bind("programming_language")
        .bind(score)
        .bind("resume")
        .execute(&pool)
        .await
        .unwrap();
    }

    let skills = matcher.get_user_skills(resume_id).await.unwrap();

    assert_eq!(skills.len(), 3);
    // Should be sorted by confidence score DESC
    assert_eq!(skills[0].skill_name, "Python");
    assert_eq!(skills[0].confidence_score, 0.9);
    assert_eq!(skills[2].skill_name, "TypeScript");
}

#[tokio::test]
async fn test_get_user_skills_empty() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let resume_id = create_test_resume(&pool, "Empty Resume", "").await;

    // Delete auto-extracted skills
    sqlx::query("DELETE FROM user_skills WHERE resume_id = ?")
        .bind(resume_id)
        .execute(&pool)
        .await
        .unwrap();

    let skills = matcher.get_user_skills(resume_id).await.unwrap();
    assert!(skills.is_empty());
}

#[tokio::test]
async fn test_match_resume_to_job() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let resume_text = "Excel, CRM, reporting, scheduling";
    let resume_id = create_test_resume(&pool, "Operations Resume", resume_text).await;

    let job_hash = "job_123";
    create_test_job(
        &pool,
        job_hash,
        "Data Reporting Specialist",
        "Excel, CRM, case notes, reporting",
    )
    .await;

    let match_result = matcher
        .match_resume_to_job(resume_id, job_hash)
        .await
        .unwrap();

    assert_eq!(match_result.resume_id, resume_id);
    assert_eq!(match_result.job_hash, job_hash);
    assert!(match_result.overall_match_score > 0.0);
    assert!(match_result.skills_match_score.is_some());
    assert!(!match_result.matching_skills.is_empty());
    assert!(match_result.gap_analysis.is_some());
}

#[tokio::test]
async fn test_match_resume_to_job_perfect_match() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let resume_text = "Python, JavaScript, React, Django";
    let resume_id = create_test_resume(&pool, "Full Stack Resume", resume_text).await;

    let job_hash = "job_perfect";
    create_test_job(
        &pool,
        job_hash,
        "Full Stack Dev",
        "Python JavaScript React Django",
    )
    .await;

    let match_result = matcher
        .match_resume_to_job(resume_id, job_hash)
        .await
        .unwrap();

    // Should be a good match (skills were extracted from both)
    assert!(match_result.overall_match_score >= 0.5);
    assert!(!match_result.matching_skills.is_empty());
}

#[tokio::test]
async fn test_match_resume_to_job_no_overlap() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let resume_text = "Python, Django";
    let resume_id = create_test_resume(&pool, "Python Resume", resume_text).await;

    let job_hash = "job_mismatch";
    create_test_job(
        &pool,
        job_hash,
        "Java Developer",
        "Java Spring Hibernate Maven",
    )
    .await;

    let match_result = matcher
        .match_resume_to_job(resume_id, job_hash)
        .await
        .unwrap();

    // Should have low skills match (0% since Python/Django don't match Java/Spring/Hibernate/Maven)
    // Overall score formula: skills*0.5 + experience*0.3 + education*0.2
    // With no experience/education requirements, those default to 1.0
    // So minimum overall = 0*0.5 + 1.0*0.3 + 1.0*0.2 = 0.5
    assert!(
        match_result.skills_match_score.unwrap_or(0.0) < 0.3,
        "Skills match should be low"
    );
    assert!(match_result.matching_skills.is_empty() || match_result.matching_skills.len() <= 1);
    assert!(!match_result.missing_skills.is_empty());
}
