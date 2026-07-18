use super::*;

mod duplicate_detection_tests {
    use super::*;

    #[tokio::test]
    async fn test_find_duplicate_groups_same_title_company() {
        let db = crate::test_support::migrated_database().await;

        // Insert same job from different sources
        let mut job1 = create_test_job("dup1", "Senior Case Manager", 0.95);
        job1.company = "CommunityCare".to_string();
        job1.source = "greenhouse".to_string();
        db.upsert_job(&job1).await.unwrap();

        let mut job2 = create_test_job("dup2", "Senior Case Manager", 0.90);
        job2.company = "CommunityCare".to_string();
        job2.source = "lever".to_string();
        db.upsert_job(&job2).await.unwrap();

        let mut job3 = create_test_job("dup3", "Senior Case Manager", 0.88);
        job3.company = "CommunityCare".to_string();
        job3.source = "linkedin".to_string();
        db.upsert_job(&job3).await.unwrap();

        // Find duplicates
        let groups = db.find_duplicate_groups().await.unwrap();

        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].jobs.len(), 3);
        assert_eq!(groups[0].sources.len(), 3);
    }

    #[tokio::test]
    async fn test_find_duplicate_groups_case_insensitive() {
        let db = crate::test_support::migrated_database().await;

        // Insert jobs with different casing
        let mut job1 = create_test_job("case1", "Case Manager", 0.9);
        job1.company = "CommunityCare".to_string();
        db.upsert_job(&job1).await.unwrap();

        let mut job2 = create_test_job("case2", "CASE MANAGER", 0.85);
        job2.company = "communitycare".to_string();
        db.upsert_job(&job2).await.unwrap();

        let groups = db.find_duplicate_groups().await.unwrap();

        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].jobs.len(), 2);
    }

    #[tokio::test]
    async fn test_find_duplicate_groups_primary_is_highest_score() {
        let db = crate::test_support::migrated_database().await;

        // Insert duplicates with different scores
        let mut job1 = create_test_job("score1", "Job Title", 0.85);
        job1.company = "Company".to_string();
        let _id1 = db.upsert_job(&job1).await.unwrap();

        let mut job2 = create_test_job("score2", "Job Title", 0.95);
        job2.company = "Company".to_string();
        let id2 = db.upsert_job(&job2).await.unwrap();

        let groups = db.find_duplicate_groups().await.unwrap();

        assert_eq!(groups.len(), 1);
        // Primary should be the highest score (id2)
        assert_eq!(groups[0].primary_id, id2);
    }

    #[tokio::test]
    async fn test_find_duplicate_groups_excludes_hidden() {
        let db = crate::test_support::migrated_database().await;

        // Insert visible duplicate
        let mut job1 = create_test_job("visible_dup", "Duplicate Job", 0.9);
        job1.company = "Company".to_string();
        db.upsert_job(&job1).await.unwrap();

        // Insert hidden duplicate
        let mut job2 = create_test_job("hidden_dup", "Duplicate Job", 0.85);
        job2.company = "Company".to_string();
        let id2 = db.upsert_job(&job2).await.unwrap();
        db.hide_job(id2).await.unwrap();

        let groups = db.find_duplicate_groups().await.unwrap();

        // Should not form a duplicate group if one is hidden
        assert_eq!(groups.len(), 0);
    }

    #[tokio::test]
    async fn test_find_duplicate_groups_no_duplicates() {
        let db = crate::test_support::migrated_database().await;

        // Insert unique jobs
        let job1 = create_test_job("unique1", "Job A", 0.9);
        db.upsert_job(&job1).await.unwrap();

        let job2 = create_test_job("unique2", "Job B", 0.85);
        db.upsert_job(&job2).await.unwrap();

        let groups = db.find_duplicate_groups().await.unwrap();

        assert_eq!(groups.len(), 0);
    }

    #[tokio::test]
    async fn test_find_duplicate_groups_multiple_groups() {
        let db = crate::test_support::migrated_database().await;

        // Group 1: Job A at CompanyX
        let mut job1a = create_test_job("1a", "Job A", 0.9);
        job1a.company = "CompanyX".to_string();
        db.upsert_job(&job1a).await.unwrap();

        let mut group_one_second = create_test_job("1b", "Job A", 0.85);
        group_one_second.company = "CompanyX".to_string();
        db.upsert_job(&group_one_second).await.unwrap();

        // Group 2: Job B at CompanyY
        let mut job2a = create_test_job("2a", "Job B", 0.95);
        job2a.company = "CompanyY".to_string();
        db.upsert_job(&job2a).await.unwrap();

        let mut group_two_second = create_test_job("2b", "Job B", 0.80);
        group_two_second.company = "CompanyY".to_string();
        db.upsert_job(&group_two_second).await.unwrap();

        let groups = db.find_duplicate_groups().await.unwrap();

        assert_eq!(groups.len(), 2);
    }

    #[tokio::test]
    async fn test_merge_duplicates() {
        let db = crate::test_support::migrated_database().await;

        // Insert duplicates
        let mut job1 = create_test_job("merge1", "Job Title", 0.95);
        job1.company = "Company".to_string();
        let primary_id = db.upsert_job(&job1).await.unwrap();

        let mut job2 = create_test_job("merge2", "Job Title", 0.90);
        job2.company = "Company".to_string();
        let dup_id1 = db.upsert_job(&job2).await.unwrap();

        let mut job3 = create_test_job("merge3", "Job Title", 0.85);
        job3.company = "Company".to_string();
        let dup_id2 = db.upsert_job(&job3).await.unwrap();

        // Merge duplicates
        db.merge_duplicates(primary_id, &[primary_id, dup_id1, dup_id2])
            .await
            .unwrap();

        // Primary should still be visible
        let primary = db.get_job_by_id(primary_id).await.unwrap().unwrap();
        assert!(!primary.hidden);

        // Duplicates should be hidden
        let dup1 = db.get_job_by_id(dup_id1).await.unwrap().unwrap();
        assert!(dup1.hidden);

        let dup2 = db.get_job_by_id(dup_id2).await.unwrap().unwrap();
        assert!(dup2.hidden);
    }

    #[tokio::test]
    async fn test_merge_duplicates_primary_not_hidden() {
        let db = crate::test_support::migrated_database().await;

        let job1 = create_test_job("primary", "Job", 0.9);
        let primary_id = db.upsert_job(&job1).await.unwrap();

        let job2 = create_test_job("duplicate", "Job", 0.8);
        let dup_id = db.upsert_job(&job2).await.unwrap();

        // Merge with primary in the list
        db.merge_duplicates(primary_id, &[primary_id, dup_id])
            .await
            .unwrap();

        // Primary should NOT be hidden
        let primary = db.get_job_by_id(primary_id).await.unwrap().unwrap();
        assert!(!primary.hidden);
    }

    #[tokio::test]
    async fn test_merge_duplicates_empty_list() {
        let db = crate::test_support::migrated_database().await;

        let job = create_test_job("single", "Single Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // Merge with empty list (should be no-op)
        db.merge_duplicates(id, &[]).await.unwrap();

        let after = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(!after.hidden);
    }
}
