use super::*;

#[tokio::test]
async fn test_find_duplicate_groups_different_companies() {
    let db = crate::test_support::migrated_database().await;

    // Same title, different companies - should NOT be duplicates
    let mut job1 = create_test_job("diff1", "Senior Case Manager", 0.9);
    job1.company = "CompanyA".to_string();
    db.upsert_job(&job1).await.unwrap();

    let mut job2 = create_test_job("diff2", "Senior Case Manager", 0.85);
    job2.company = "CompanyB".to_string();
    db.upsert_job(&job2).await.unwrap();

    let groups = db.find_duplicate_groups().await.unwrap();
    assert_eq!(groups.len(), 0);
}

#[tokio::test]
async fn test_find_duplicate_groups_different_titles() {
    let db = crate::test_support::migrated_database().await;

    // Same company, different titles - should NOT be duplicates
    let mut job1 = create_test_job("diff_title1", "Senior Case Manager", 0.9);
    job1.company = "Company".to_string();
    db.upsert_job(&job1).await.unwrap();

    let mut job2 = create_test_job("diff_title2", "Junior Case Manager", 0.85);
    job2.company = "Company".to_string();
    db.upsert_job(&job2).await.unwrap();

    let groups = db.find_duplicate_groups().await.unwrap();
    assert_eq!(groups.len(), 0);
}

#[tokio::test]
async fn test_merge_duplicates_preserves_bookmarks() {
    let db = crate::test_support::migrated_database().await;

    // Primary job (not bookmarked)
    let mut job1 = create_test_job("merge_bm1", "Job", 0.9);
    job1.company = "Company".to_string();
    let id1 = db.upsert_job(&job1).await.unwrap();

    // Duplicate job (bookmarked)
    let mut job2 = create_test_job("merge_bm2", "Job", 0.8);
    job2.company = "Company".to_string();
    let id2 = db.upsert_job(&job2).await.unwrap();
    db.set_bookmark(id2, true).await.unwrap();

    // Merge (hides duplicate)
    db.merge_duplicates(id1, &[id1, id2]).await.unwrap();

    // Primary visible, duplicate hidden but bookmark preserved
    let primary = db.get_job_by_id(id1).await.unwrap().unwrap();
    assert!(!primary.hidden);

    let duplicate = db.get_job_by_id(id2).await.unwrap().unwrap();
    assert!(duplicate.hidden);
    assert!(duplicate.bookmarked); // Bookmark should still exist
}
