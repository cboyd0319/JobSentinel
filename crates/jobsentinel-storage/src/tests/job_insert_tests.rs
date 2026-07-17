use super::*;

#[tokio::test]
async fn insert_job_if_new_does_not_mutate_an_existing_job() {
    let db = crate::test_support::migrated_database().await;

    let original = create_test_job("insert-once", "Original title", 0.9);
    let first_id = db
        .insert_job_if_new(&original)
        .await
        .unwrap()
        .expect("first insert should create a job");

    let mut duplicate = original.clone();
    duplicate.title = "Changed title".to_string();
    let second_id = db.insert_job_if_new(&duplicate).await.unwrap();

    assert_eq!(second_id, None);
    let stored = db.get_job_by_id(first_id).await.unwrap().unwrap();
    assert_eq!(stored.title, "Original title");
    assert_eq!(stored.times_seen, 1);
}
