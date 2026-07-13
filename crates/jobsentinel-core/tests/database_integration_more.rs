use super::*;

#[tokio::test]
async fn test_empty_database_operations() {
    let (db, _temp_dir) = setup_test_db().await;

    // Operations on empty database should not fail
    let stats = db.get_statistics().await.unwrap();
    assert_eq!(stats.total_jobs, 0);

    let recent = db.get_recent_jobs(10).await.unwrap();
    assert!(recent.is_empty());

    let search = db.search_jobs("anything", 10).await.unwrap();
    assert!(search.is_empty());

    let nonexistent = db.get_job_by_hash("nonexistent").await.unwrap();
    assert!(nonexistent.is_none());
}

#[tokio::test]
async fn test_special_characters_in_job_data() {
    let (db, _temp_dir) = setup_test_db().await;

    let job = Job {
        hash: "special_001".to_string(),
        title: "Engineer \"with\" 'quotes' & <special> chars".to_string(),
        company: "O'Reilly & Associates".to_string(),
        description: Some("Description with \n newlines \t tabs and 'quotes'".to_string()),
        notes: Some("User's notes with \"quotes\"".to_string()),
        ..create_test_job("special_001", "Test", "Test")
    };

    db.upsert_job(&job).await.unwrap();

    let retrieved = db.get_job_by_hash("special_001").await.unwrap().unwrap();
    assert!(retrieved.title.contains("\"with\""));
    assert!(retrieved.company.contains("O'Reilly"));
}

#[tokio::test]
async fn test_unicode_in_job_data() {
    let (db, _temp_dir) = setup_test_db().await;

    let job = Job {
        hash: "unicode_001".to_string(),
        title: "工程师 Engineer 🚀".to_string(),
        company: "日本株式会社".to_string(),
        description: Some("Description with émojis 🎉 and ünïcödé".to_string()),
        ..create_test_job("unicode_001", "Test", "Test")
    };

    db.upsert_job(&job).await.unwrap();

    let retrieved = db.get_job_by_hash("unicode_001").await.unwrap().unwrap();
    assert!(retrieved.title.contains("工程师"));
    assert!(retrieved.title.contains("🚀"));
}

#[tokio::test]
async fn test_very_long_content() {
    let (db, _temp_dir) = setup_test_db().await;

    // MAX_DESCRIPTION_LENGTH is 50,000 chars (see crud.rs)
    let long_description = "A".repeat(49_000); // Just under the limit

    let job = Job {
        hash: "long_001".to_string(),
        description: Some(long_description.clone()),
        ..create_test_job("long_001", "Test", "Test")
    };

    db.upsert_job(&job).await.unwrap();

    let retrieved = db.get_job_by_hash("long_001").await.unwrap().unwrap();
    assert_eq!(retrieved.description.unwrap().len(), 49_000);
}
