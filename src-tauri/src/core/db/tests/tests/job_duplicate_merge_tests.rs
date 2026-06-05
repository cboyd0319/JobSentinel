use super::*;

mod duplicate_merge_coverage {
    use super::*;

    #[tokio::test]
    async fn test_merge_duplicates_hides_all_except_primary() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Create 4 duplicate jobs
        let mut jobs = vec![];
        for i in 0..4 {
            let mut job = create_test_job(
                &format!("dup_merge_{}", i),
                "Duplicate Job",
                0.9 - (i as f64 * 0.1),
            );
            job.company = "Company".to_string();
            let id = db.upsert_job(&job).await.unwrap();
            jobs.push(id);
        }

        // Merge with first job as primary
        db.merge_duplicates(jobs[0], &jobs).await.unwrap();

        // Verify primary visible, others hidden
        let primary = db.get_job_by_id(jobs[0]).await.unwrap().unwrap();
        assert!(!primary.hidden);

        for &id in &jobs[1..] {
            let dup = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(dup.hidden);
        }
    }

    #[tokio::test]
    async fn test_find_duplicate_groups_min_two_duplicates() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Single job - no group
        let mut job1 = create_test_job("single", "Unique Job", 0.9);
        job1.company = "UniqueCompany".to_string();
        db.upsert_job(&job1).await.unwrap();

        // Two jobs - should form group
        let mut job2a = create_test_job("dup_a", "Duplicate Job", 0.9);
        job2a.company = "DupCompany".to_string();
        db.upsert_job(&job2a).await.unwrap();

        let mut job2b = create_test_job("dup_b", "Duplicate Job", 0.85);
        job2b.company = "DupCompany".to_string();
        db.upsert_job(&job2b).await.unwrap();

        let groups = db.find_duplicate_groups().await.unwrap();
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].jobs.len(), 2);
    }
}
