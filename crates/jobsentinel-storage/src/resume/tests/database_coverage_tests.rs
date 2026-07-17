use super::*;

// Additional database function tests for full coverage

#[tokio::test]
async fn test_get_resume_success() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

    // Insert a resume with all fields
    let result = sqlx::query(
        "INSERT INTO resumes (name, file_path, parsed_text, is_active) VALUES (?, ?, ?, 1)",
    )
    .bind("Complete Resume")
    .bind("fixtures/resumes/complete.pdf")
    .bind("Complete content with skills")
    .execute(&pool)
    .await
    .unwrap();
    let resume_id = result.last_insert_rowid();

    // Test get_resume
    let resume = matcher.get_resume(resume_id).await.unwrap();
    assert_eq!(resume.id, resume_id);
    assert_eq!(resume.name, "Complete Resume");
    assert_eq!(resume.file_path, "fixtures/resumes/complete.pdf");
    assert_eq!(
        resume.parsed_text,
        Some("Complete content with skills".to_string())
    );
    assert!(resume.is_active);
}

#[tokio::test]
async fn test_get_resume_with_null_text() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let result = sqlx::query(
        "INSERT INTO resumes (name, file_path, parsed_text, is_active) VALUES (?, ?, ?, 0)",
    )
    .bind("Null Text Resume")
    .bind("fixtures/resumes/null_text.pdf")
    .bind::<Option<String>>(None)
    .execute(&pool)
    .await
    .unwrap();
    let resume_id = result.last_insert_rowid();

    let resume = matcher.get_resume(resume_id).await.unwrap();
    assert_eq!(resume.id, resume_id);
    assert_eq!(resume.parsed_text, None);
    assert!(!resume.is_active);
}

#[tokio::test]
async fn test_get_active_resume_success() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

    // Create multiple resumes with different timestamps
    sqlx::query(
        "INSERT INTO resumes (name, file_path, parsed_text, is_active, created_at) VALUES (?, ?, ?, 1, datetime('now', '-5 seconds'))",
    )
    .bind("Old Resume")
    .bind("fixtures/resumes/old.pdf")
    .bind("Old content")
    .execute(&pool)
    .await
    .unwrap();

    let result = sqlx::query(
        "INSERT INTO resumes (name, file_path, parsed_text, is_active, created_at) VALUES (?, ?, ?, 1, datetime('now'))",
    )
    .bind("New Resume")
    .bind("fixtures/resumes/new.pdf")
    .bind("New content")
    .execute(&pool)
    .await
    .unwrap();
    let newest_id = result.last_insert_rowid();

    // Test get_active_resume returns most recent
    let active = matcher.get_active_resume().await.unwrap();
    assert!(active.is_some());
    let active_resume = active.unwrap();
    assert_eq!(active_resume.id, newest_id);
    assert_eq!(active_resume.name, "New Resume");
}

#[tokio::test]
async fn test_get_active_resume_no_active() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

    // Create inactive resumes
    sqlx::query(
        "INSERT INTO resumes (name, file_path, parsed_text, is_active) VALUES (?, ?, ?, 0)",
    )
    .bind("Inactive Resume")
    .bind("fixtures/resumes/inactive.pdf")
    .bind("Content")
    .execute(&pool)
    .await
    .unwrap();

    let active = matcher.get_active_resume().await.unwrap();
    assert!(active.is_none());
}

#[tokio::test]
async fn test_get_match_result_success() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let resume_id = create_test_resume(&pool, "Resume", "Python JavaScript").await;
    let job_hash = "job_get_match";
    create_test_job(
        &pool,
        job_hash,
        "Care Coordinator",
        "Python JavaScript React",
    )
    .await;

    // Create match
    let created_match = matcher
        .match_resume_to_job(resume_id, job_hash)
        .await
        .unwrap();

    // Test get_match_result
    let retrieved = matcher.get_match_result(resume_id, job_hash).await.unwrap();
    assert!(retrieved.is_some());
    let result = retrieved.unwrap();
    assert_eq!(result.id, created_match.id);
    assert_eq!(result.resume_id, resume_id);
    assert_eq!(result.job_hash, job_hash);
    assert_eq!(
        result.overall_match_score,
        created_match.overall_match_score
    );
    assert_eq!(result.skills_match_score, created_match.skills_match_score);
    assert_eq!(result.missing_skills, created_match.missing_skills);
    assert_eq!(result.matching_skills, created_match.matching_skills);
}

#[tokio::test]
async fn test_get_match_result_with_empty_skills() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let resume_id = create_test_resume(&pool, "Resume", "").await;
    let job_hash = "job_empty_skills";
    create_test_job(&pool, job_hash, "Care Coordinator", "").await;

    let created_match = matcher
        .match_resume_to_job(resume_id, job_hash)
        .await
        .unwrap();

    let result = matcher.get_match_result(resume_id, job_hash).await.unwrap();
    assert!(result.is_some());
    let match_data = result.unwrap();
    assert_eq!(match_data.id, created_match.id);
    assert!(match_data.missing_skills.is_empty() || match_data.missing_skills == vec![""]);
    assert!(match_data.matching_skills.is_empty() || match_data.matching_skills == vec![""]);
}

#[tokio::test]
async fn test_set_active_resume_nonexistent() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());
    let active_id = create_test_resume(&pool, "Active Resume", "Scheduling").await;

    let result = matcher.set_active_resume(999).await;
    assert!(result.is_err());

    let active = matcher.get_active_resume().await.unwrap();
    assert!(active.is_some());
    assert_eq!(active.unwrap().id, active_id);
}

#[tokio::test]
async fn test_get_user_skills_ordering() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

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

    // Insert skills with same confidence but different names
    for (skill, score) in &[("Zebra", 0.9), ("Alpha", 0.9), ("Beta", 0.5)] {
        sqlx::query(
            "INSERT INTO user_skills (resume_id, skill_name, skill_category, confidence_score, source) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(resume_id)
        .bind(skill)
        .bind("test")
        .bind(score)
        .bind("resume")
        .execute(&pool)
        .await
        .unwrap();
    }

    let skills = matcher.get_user_skills(resume_id).await.unwrap();
    assert_eq!(skills.len(), 3);

    // Should be sorted by confidence DESC, then skill_name ASC
    assert_eq!(skills[0].confidence_score, 0.9);
    assert_eq!(skills[1].confidence_score, 0.9);
    assert_eq!(skills[2].confidence_score, 0.5);

    // Among 0.9 scores, should be alphabetical
    assert!(skills[0].skill_name < skills[1].skill_name);
}

#[tokio::test]
async fn test_get_user_skills_with_all_fields() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let result = sqlx::query(
        "INSERT INTO resumes (name, file_path, parsed_text, is_active) VALUES (?, ?, ?, 1)",
    )
    .bind("Full Fields Resume")
    .bind("fixtures/resumes/full.pdf")
    .bind("")
    .execute(&pool)
    .await
    .unwrap();
    let resume_id = result.last_insert_rowid();

    // Insert skill with all optional fields
    sqlx::query(
        r#"
        INSERT INTO user_skills (
            resume_id, skill_name, skill_category, confidence_score,
            years_experience, proficiency_level, source
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(resume_id)
    .bind("Expert Skill")
    .bind("technical")
    .bind(0.95)
    .bind(5.5)
    .bind("Expert")
    .bind("user_input")
    .execute(&pool)
    .await
    .unwrap();

    let skills = matcher.get_user_skills(resume_id).await.unwrap();
    assert_eq!(skills.len(), 1);
    assert_eq!(skills[0].skill_name, "Expert Skill");
    assert_eq!(skills[0].skill_category, Some("technical".to_string()));
    assert_eq!(skills[0].confidence_score, 0.95);
    assert_eq!(skills[0].years_experience, Some(5.5));
    assert_eq!(skills[0].proficiency_level, Some("Expert".to_string()));
    assert_eq!(skills[0].source, "user_input");
}

#[tokio::test]
async fn test_update_user_skill_clears_optional_fields_and_trims_name() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());
    let resume_id = create_test_resume(&pool, "Resume", "Resident support").await;

    let skill_id = matcher
        .add_user_skill(
            resume_id,
            NewSkill {
                skill_name: "  Case Management  ".to_string(),
                skill_category: Some("  Community Support  ".to_string()),
                proficiency_level: Some("  Regular use  ".to_string()),
                years_experience: Some(4.0),
            },
        )
        .await
        .unwrap();

    matcher
        .update_user_skill(
            skill_id,
            SkillUpdate {
                skill_name: Some("  Care Planning  ".to_string()),
                skill_category: NullableFieldUpdate::Clear,
                proficiency_level: NullableFieldUpdate::Clear,
                years_experience: NullableFieldUpdate::Clear,
            },
        )
        .await
        .unwrap();

    let skills = matcher.get_user_skills(resume_id).await.unwrap();
    assert_eq!(skills.len(), 1);
    assert_eq!(skills[0].skill_name, "Care Planning");
    assert_eq!(skills[0].skill_category, None);
    assert_eq!(skills[0].proficiency_level, None);
    assert_eq!(skills[0].years_experience, None);
}

#[test]
fn test_skill_update_deserializes_missing_and_null_differently() {
    let missing: SkillUpdate = serde_json::from_value(serde_json::json!({})).unwrap();
    assert_eq!(missing.skill_category, NullableFieldUpdate::Unset);
    assert_eq!(missing.proficiency_level, NullableFieldUpdate::Unset);
    assert_eq!(missing.years_experience, NullableFieldUpdate::Unset);

    let explicit_clear: SkillUpdate = serde_json::from_value(serde_json::json!({
        "skill_category": null,
        "proficiency_level": null,
        "years_experience": null
    }))
    .unwrap();
    assert_eq!(explicit_clear.skill_category, NullableFieldUpdate::Clear);
    assert_eq!(explicit_clear.proficiency_level, NullableFieldUpdate::Clear);
    assert_eq!(explicit_clear.years_experience, NullableFieldUpdate::Clear);

    let explicit_values: SkillUpdate = serde_json::from_value(serde_json::json!({
        "skill_category": "Customer support",
        "proficiency_level": "Regular use",
        "years_experience": 3.5
    }))
    .unwrap();
    assert_eq!(
        explicit_values.skill_category,
        NullableFieldUpdate::Set("Customer support".to_string())
    );
    assert_eq!(
        explicit_values.proficiency_level,
        NullableFieldUpdate::Set("Regular use".to_string())
    );
    assert_eq!(
        explicit_values.years_experience,
        NullableFieldUpdate::Set(3.5)
    );
}

#[tokio::test]
async fn test_user_skill_validation_rejects_blank_names_and_invalid_years() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());
    let resume_id = create_test_resume(&pool, "Resume", "Scheduling").await;

    let blank_add = matcher
        .add_user_skill(
            resume_id,
            NewSkill {
                skill_name: "   ".to_string(),
                skill_category: None,
                proficiency_level: None,
                years_experience: None,
            },
        )
        .await;
    assert!(blank_add.is_err());

    let invalid_years = matcher
        .add_user_skill(
            resume_id,
            NewSkill {
                skill_name: "Scheduling".to_string(),
                skill_category: None,
                proficiency_level: None,
                years_experience: Some(51.0),
            },
        )
        .await;
    assert!(invalid_years.is_err());

    let skill_id = matcher
        .add_user_skill(
            resume_id,
            NewSkill {
                skill_name: "Scheduling".to_string(),
                skill_category: None,
                proficiency_level: None,
                years_experience: Some(2.0),
            },
        )
        .await
        .unwrap();

    let blank_update = matcher
        .update_user_skill(
            skill_id,
            SkillUpdate {
                skill_name: Some("   ".to_string()),
                skill_category: NullableFieldUpdate::Unset,
                proficiency_level: NullableFieldUpdate::Unset,
                years_experience: NullableFieldUpdate::Unset,
            },
        )
        .await;
    assert!(blank_update.is_err());

    let invalid_update_years = matcher
        .update_user_skill(
            skill_id,
            SkillUpdate {
                skill_name: None,
                skill_category: NullableFieldUpdate::Unset,
                proficiency_level: NullableFieldUpdate::Unset,
                years_experience: NullableFieldUpdate::Set(-1.0),
            },
        )
        .await;
    assert!(invalid_update_years.is_err());
}

#[tokio::test]
async fn test_update_user_skill_nonexistent_returns_error() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let result = matcher
        .update_user_skill(
            999,
            SkillUpdate {
                skill_name: Some("Care Planning".to_string()),
                skill_category: NullableFieldUpdate::Unset,
                proficiency_level: NullableFieldUpdate::Unset,
                years_experience: NullableFieldUpdate::Unset,
            },
        )
        .await;

    assert!(result.is_err());
}

#[path = "database_coverage_tests/match_and_edge_tests.rs"]
mod match_and_edge_tests;
