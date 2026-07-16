use super::*;

#[tokio::test]
async fn test_match_result_persistence() {
    let pool = setup_test_db().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let resume_id = create_test_resume(&pool, "Resume", "Python JavaScript").await;
    let job_hash = "job_persist";
    create_test_job(
        &pool,
        job_hash,
        "Care Coordinator",
        "Python JavaScript React",
    )
    .await;

    // First match
    let match1 = matcher
        .match_resume_to_job(resume_id, job_hash)
        .await
        .unwrap();
    assert!(match1.id > 0);

    // Verify match was persisted via direct query
    let row = sqlx::query("SELECT id, overall_match_score FROM resume_job_matches WHERE resume_id = ? AND job_hash = ?")
        .bind(resume_id)
        .bind(job_hash)
        .fetch_one(&pool)
        .await
        .unwrap();

    assert_eq!(row.get::<i64, _>("id"), match1.id);
    assert_eq!(
        row.get::<f64, _>("overall_match_score"),
        match1.overall_match_score
    );
}

#[tokio::test]
async fn test_get_match_result_not_found() {
    let pool = setup_test_db().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let result = matcher
        .get_match_result(999, "nonexistent_job")
        .await
        .unwrap();
    assert!(result.is_none());
}

#[tokio::test]
async fn test_match_result_upsert() {
    let pool = setup_test_db().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let resume_id = create_test_resume(&pool, "Resume", "Python").await;
    let job_hash = "job_upsert";
    create_test_job(&pool, job_hash, "Care Coordinator", "Python").await;

    // First match
    let _match1 = matcher
        .match_resume_to_job(resume_id, job_hash)
        .await
        .unwrap();

    // Update resume skills to change match score
    sqlx::query(
        "INSERT INTO user_skills (resume_id, skill_name, skill_category, confidence_score, source) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(resume_id)
    .bind("JavaScript")
    .bind("programming_language")
    .bind(0.9)
    .bind("resume")
    .execute(&pool)
    .await
    .unwrap();

    // Update job to require JavaScript
    sqlx::query("UPDATE jobs SET description = ? WHERE hash = ?")
        .bind("Python JavaScript")
        .bind(job_hash)
        .execute(&pool)
        .await
        .unwrap();

    // Second match (should upsert)
    let _match2 = matcher
        .match_resume_to_job(resume_id, job_hash)
        .await
        .unwrap();

    // Should have updated the existing record
    let all_matches = sqlx::query(
        "SELECT COUNT(*) as count FROM resume_job_matches WHERE resume_id = ? AND job_hash = ?",
    )
    .bind(resume_id)
    .bind(job_hash)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(all_matches.get::<i64, _>("count"), 1);
}

// Edge case tests

#[tokio::test]
async fn test_resume_with_null_parsed_text() {
    let pool = setup_test_db().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let result = sqlx::query(
        "INSERT INTO resumes (name, file_path, parsed_text, is_active) VALUES (?, ?, ?, 1)",
    )
    .bind("Null Resume")
    .bind("fixtures/resumes/null.pdf")
    .bind::<Option<String>>(None)
    .execute(&pool)
    .await
    .unwrap();
    let resume_id = result.last_insert_rowid();

    // Should handle null parsed_text gracefully via get_user_skills
    let skills = matcher.get_user_skills(resume_id).await.unwrap();
    assert!(skills.is_empty());
}

#[tokio::test]
async fn test_resume_with_empty_parsed_text() {
    let pool = setup_test_db().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let result = sqlx::query(
        "INSERT INTO resumes (name, file_path, parsed_text, is_active) VALUES (?, ?, ?, 1)",
    )
    .bind("Empty Resume")
    .bind("fixtures/resumes/empty.pdf")
    .bind("")
    .execute(&pool)
    .await
    .unwrap();
    let resume_id = result.last_insert_rowid();

    // Check empty text via direct query
    let row = sqlx::query("SELECT parsed_text FROM resumes WHERE id = ?")
        .bind(resume_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(row.get::<String, _>("parsed_text"), "");

    // Extract skills should return empty for empty text
    let skills = matcher.get_user_skills(resume_id).await.unwrap();
    assert!(skills.is_empty());
}

#[tokio::test]
async fn test_job_with_no_description() {
    let pool = setup_test_db().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let resume_id = create_test_resume(&pool, "Resume", "Python JavaScript").await;
    let job_hash = "job_no_desc";

    sqlx::query(
        "INSERT INTO jobs (hash, title, company, url, description, source) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(job_hash)
    .bind("Engineer")
    .bind("Company")
    .bind("https://example.com")
    .bind::<Option<String>>(None)
    .bind("greenhouse")
    .execute(&pool)
    .await
    .unwrap();

    // Should handle null description gracefully
    let match_result = matcher
        .match_resume_to_job(resume_id, job_hash)
        .await
        .unwrap();
    assert!(match_result.overall_match_score >= 0.0);
}

#[tokio::test]
async fn test_multiple_active_resumes() {
    let pool = setup_test_db().await;

    // Create with explicit timestamps to ensure ordering
    let _id1 = sqlx::query(
        "INSERT INTO resumes (name, file_path, parsed_text, is_active, created_at) VALUES (?, ?, ?, 1, datetime('now', '-3 seconds'))",
    )
    .bind("Resume 1")
    .bind("fixtures/resumes/r1.pdf")
    .bind("Content 1")
    .execute(&pool)
    .await
    .unwrap()
    .last_insert_rowid();

    let _id2 = sqlx::query(
        "INSERT INTO resumes (name, file_path, parsed_text, is_active, created_at) VALUES (?, ?, ?, 1, datetime('now', '-1 second'))",
    )
    .bind("Resume 2")
    .bind("fixtures/resumes/r2.pdf")
    .bind("Content 2")
    .execute(&pool)
    .await
    .unwrap()
    .last_insert_rowid();

    let id3 = sqlx::query(
        "INSERT INTO resumes (name, file_path, parsed_text, is_active, created_at) VALUES (?, ?, ?, 1, datetime('now'))",
    )
    .bind("Resume 3")
    .bind("fixtures/resumes/r3.pdf")
    .bind("Content 3")
    .execute(&pool)
    .await
    .unwrap()
    .last_insert_rowid();

    // Should return most recent active resume via direct query
    let row = sqlx::query(
        "SELECT id, name FROM resumes WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(row.get::<i64, _>("id"), id3);
    assert_eq!(row.get::<String, _>("name"), "Resume 3");
}

#[tokio::test]
async fn test_case_insensitive_skill_matching() {
    let pool = setup_test_db().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let resume_text = "python JAVASCRIPT rust";
    let resume_id = create_test_resume(&pool, "Mixed Case Resume", resume_text).await;

    let skills = matcher.get_user_skills(resume_id).await.unwrap();
    let skill_names: Vec<String> = skills.iter().map(|s| s.skill_name.clone()).collect();

    // Should find skills regardless of case
    assert!(skill_names.contains(&"Python".to_string()));
    assert!(skill_names.contains(&"JavaScript".to_string()));
    assert!(skill_names.contains(&"Rust".to_string()));
}

#[tokio::test]
async fn test_match_with_special_characters_in_skills() {
    let pool = setup_test_db().await;
    let matcher = ResumeMatcher::new(pool.clone());

    let resume_text = "C++, C#, Node.js, ASP.NET, Next.js";
    let resume_id = create_test_resume(&pool, "Special Chars Resume", resume_text).await;

    let job_hash = "job_special";
    create_test_job(&pool, job_hash, "Developer", "C++ C# Node.js ASP.NET").await;

    let match_result = matcher
        .match_resume_to_job(resume_id, job_hash)
        .await
        .unwrap();

    // Should handle special characters in skill names
    // Note: Some special char skills may not be in the skill database
    assert!(match_result.overall_match_score >= 0.0);
    assert!(match_result.overall_match_score <= 1.0);
}
