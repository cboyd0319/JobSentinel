use super::*;

#[tokio::test]
async fn test_case_insensitive_skill_matching() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = JobMatcher::new(pool.clone());

    let job_hash = "test_job_case";
    create_test_job(&pool, job_hash).await;

    let result = sqlx::query("INSERT INTO resumes (name, file_path, is_active) VALUES (?, ?, 1)")
        .bind("Test Resume")
        .bind("fixtures/resumes/test.pdf")
        .execute(&pool)
        .await
        .unwrap();
    let resume_id = result.last_insert_rowid();

    sqlx::query(
        "INSERT INTO user_skills (resume_id, skill_name, confidence_score, source) VALUES (?, ?, ?, ?)",
    )
    .bind(resume_id)
    .bind("case management")
    .bind(0.9)
    .bind("resume")
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query("INSERT INTO job_skills (job_hash, skill_name, is_required) VALUES (?, ?, 1)")
        .bind(job_hash)
        .bind("Case Management")
        .execute(&pool)
        .await
        .unwrap();

    let match_result = matcher.calculate_match(resume_id, job_hash).await.unwrap();

    assert_eq!(match_result.matching_skills.len(), 1);
    assert_eq!(match_result.skills_match_score, Some(1.0));
}

#[tokio::test]
async fn test_get_job_with_null_description() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = JobMatcher::new(pool.clone());
    let job_hash = "test_job_null_desc";

    sqlx::query(
        r#"
        INSERT INTO jobs (hash, title, company, url, description, score, source)
        VALUES (?, ?, ?, ?, NULL, ?, ?)
        "#,
    )
    .bind(job_hash)
    .bind("Client Support Coordinator")
    .bind("Harbor Community Services")
    .bind("https://example.com/job")
    .bind(0.9)
    .bind("greenhouse")
    .execute(&pool)
    .await
    .unwrap();

    let job = matcher.get_job(job_hash).await.unwrap();
    assert_eq!(job.description, "");
}

#[tokio::test]
async fn test_user_skills_with_all_optional_fields() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = JobMatcher::new(pool.clone());

    let result = sqlx::query("INSERT INTO resumes (name, file_path, is_active) VALUES (?, ?, 1)")
        .bind("Test Resume")
        .bind("fixtures/resumes/test.pdf")
        .execute(&pool)
        .await
        .unwrap();
    let resume_id = result.last_insert_rowid();

    sqlx::query(
        r#"
        INSERT INTO user_skills
        (resume_id, skill_name, skill_category, confidence_score, years_experience, proficiency_level, source)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(resume_id)
    .bind("Case Management")
    .bind("client_services")
    .bind(0.95)
    .bind(5.5)
    .bind("expert")
    .bind("resume")
    .execute(&pool)
    .await
    .unwrap();

    let skills = matcher.get_user_skills(resume_id).await.unwrap();
    assert_eq!(skills.len(), 1);

    let skill = &skills[0];
    assert_eq!(skill.skill_name, "Case Management");
    assert_eq!(skill.skill_category, Some("client_services".to_string()));
    assert_eq!(skill.confidence_score, 0.95);
    assert_eq!(skill.years_experience, Some(5.5));
    assert_eq!(skill.proficiency_level, Some("expert".to_string()));
}
