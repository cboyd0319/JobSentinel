use super::*;

mod hide_unhide_tests {
    use super::*;

    #[tokio::test]
    async fn test_hide_job() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("hide_test", "Test Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // Initially not hidden
        let before = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(!before.hidden);

        // Hide the job
        db.hide_job(id).await.unwrap();

        // Verify it's hidden
        let after = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(after.hidden);
    }

    #[tokio::test]
    async fn test_unhide_job() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("unhide_test", "Test Job", 0.9);
        job.hidden = true;
        let id = db.upsert_job(&job).await.unwrap();

        // Manually hide first
        db.hide_job(id).await.unwrap();

        // Verify hidden
        let hidden = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(hidden.hidden);

        // Unhide the job
        db.unhide_job(id).await.unwrap();

        // Verify it's visible again
        let visible = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(!visible.hidden);
    }

    #[tokio::test]
    async fn test_hide_unhide_cycle() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("cycle_test", "Test Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // Hide
        db.hide_job(id).await.unwrap();
        let after_hide = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(after_hide.hidden);

        // Unhide
        db.unhide_job(id).await.unwrap();
        let after_unhide = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(!after_unhide.hidden);

        // Hide again
        db.hide_job(id).await.unwrap();
        let after_rehide = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(after_rehide.hidden);
    }

    #[tokio::test]
    async fn test_hidden_jobs_excluded_from_recent() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert visible job
        let job1 = create_test_job("visible1", "Visible Job", 0.9);
        db.upsert_job(&job1).await.unwrap();

        // Insert hidden job
        let job2 = create_test_job("hidden1", "Hidden Job", 0.95);
        let id2 = db.upsert_job(&job2).await.unwrap();
        db.hide_job(id2).await.unwrap();

        // Get recent jobs
        let recent = db.get_recent_jobs(10).await.unwrap();

        // Should only return visible job
        assert_eq!(recent.len(), 1);
        assert_eq!(recent[0].title, "Visible Job");
    }

    #[tokio::test]
    async fn test_hidden_jobs_excluded_from_score_query() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert visible high-score job
        let job1 = create_test_job("visible_high", "Visible High", 0.95);
        db.upsert_job(&job1).await.unwrap();

        // Insert hidden high-score job
        let job2 = create_test_job("hidden_high", "Hidden High", 0.98);
        let id2 = db.upsert_job(&job2).await.unwrap();
        db.hide_job(id2).await.unwrap();

        // Get jobs by score
        let high_score = db.get_jobs_by_score(0.9, 10).await.unwrap();

        // Should only return visible job
        assert_eq!(high_score.len(), 1);
        assert_eq!(high_score[0].title, "Visible High");
    }

    #[tokio::test]
    async fn test_hidden_jobs_excluded_from_source_query() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert visible job from greenhouse
        let mut job1 = create_test_job("visible_gh", "Visible Greenhouse", 0.9);
        job1.source = "greenhouse".to_string();
        db.upsert_job(&job1).await.unwrap();

        // Insert hidden job from greenhouse
        let mut job2 = create_test_job("hidden_gh", "Hidden Greenhouse", 0.95);
        job2.source = "greenhouse".to_string();
        let id2 = db.upsert_job(&job2).await.unwrap();
        db.hide_job(id2).await.unwrap();

        // Get greenhouse jobs
        let greenhouse = db.get_jobs_by_source("greenhouse", 10).await.unwrap();

        // Should only return visible job
        assert_eq!(greenhouse.len(), 1);
        assert_eq!(greenhouse[0].title, "Visible Greenhouse");
    }
}

mod bookmark_tests {
    use super::*;

    #[tokio::test]
    async fn test_toggle_bookmark_on() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("toggle_on", "Test Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // Initially not bookmarked
        let before = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(!before.bookmarked);

        // Toggle bookmark (should turn ON)
        let new_state = db.toggle_bookmark(id).await.unwrap();
        assert!(new_state);

        // Verify in database
        let after = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(after.bookmarked);
    }

    #[tokio::test]
    async fn test_toggle_bookmark_off() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("toggle_off", "Test Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // First toggle to ON
        let state1 = db.toggle_bookmark(id).await.unwrap();
        assert!(state1, "First toggle should return true");

        // Verify it's ON
        let mid = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(
            mid.bookmarked,
            "Job should be bookmarked after first toggle"
        );

        // Toggle again (should turn OFF)
        let state2 = db.toggle_bookmark(id).await.unwrap();
        assert!(!state2, "Second toggle should return false");

        // Verify in database
        let after = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(
            !after.bookmarked,
            "Job should not be bookmarked after second toggle"
        );
    }

    #[tokio::test]
    async fn test_toggle_bookmark_cycle() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("toggle_cycle", "Test Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // Cycle: OFF -> ON -> OFF -> ON
        let state1 = db.toggle_bookmark(id).await.unwrap();
        assert!(state1, "First toggle should be ON");

        let state2 = db.toggle_bookmark(id).await.unwrap();
        assert!(!state2, "Second toggle should be OFF");

        let state3 = db.toggle_bookmark(id).await.unwrap();
        assert!(state3, "Third toggle should be ON");
    }

    #[tokio::test]
    async fn test_toggle_bookmark_nonexistent_job() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Try to toggle bookmark on non-existent job
        let result = db.toggle_bookmark(999999).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_set_bookmark_true() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("set_true", "Test Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // Set bookmark to true
        db.set_bookmark(id, true).await.unwrap();

        let after = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(after.bookmarked);
    }

    #[tokio::test]
    async fn test_set_bookmark_false() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("set_false", "Test Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // Bookmark it first
        db.set_bookmark(id, true).await.unwrap();

        // Then set to false
        db.set_bookmark(id, false).await.unwrap();

        let after = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(!after.bookmarked);
    }

    #[tokio::test]
    async fn test_set_bookmark_idempotent() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("idempotent", "Test Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // Set to true multiple times
        db.set_bookmark(id, true).await.unwrap();
        db.set_bookmark(id, true).await.unwrap();
        db.set_bookmark(id, true).await.unwrap();

        let after = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(after.bookmarked);
    }

    #[tokio::test]
    async fn test_get_bookmarked_jobs() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert bookmarked jobs with different scores
        let job1 = create_test_job("bookmarked1", "Bookmarked High", 0.95);
        let id1 = db.upsert_job(&job1).await.unwrap();
        db.set_bookmark(id1, true).await.unwrap();

        let job2 = create_test_job("bookmarked2", "Bookmarked Medium", 0.80);
        let id2 = db.upsert_job(&job2).await.unwrap();
        db.set_bookmark(id2, true).await.unwrap();

        // Insert non-bookmarked job
        let job3 = create_test_job("not_bookmarked", "Not Bookmarked", 0.99);
        db.upsert_job(&job3).await.unwrap();

        // Get bookmarked jobs
        let bookmarked = db.get_bookmarked_jobs(10).await.unwrap();

        // Should only return bookmarked jobs
        assert_eq!(bookmarked.len(), 2);
        assert!(bookmarked.iter().all(|j| j.bookmarked));

        // Should be ordered by score DESC
        assert!(bookmarked[0].score.unwrap() >= bookmarked[1].score.unwrap());
    }

    #[tokio::test]
    async fn test_get_bookmarked_jobs_limit() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert 5 bookmarked jobs
        for i in 0..5 {
            let job = create_test_job(&format!("bookmark_{}", i), &format!("Job {}", i), 0.8);
            let id = db.upsert_job(&job).await.unwrap();
            db.set_bookmark(id, true).await.unwrap();
        }

        // Get only 3
        let bookmarked = db.get_bookmarked_jobs(3).await.unwrap();
        assert_eq!(bookmarked.len(), 3);
    }

    #[tokio::test]
    async fn test_get_bookmarked_jobs_excludes_hidden() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert bookmarked but hidden job
        let job1 = create_test_job("bookmarked_hidden", "Bookmarked Hidden", 0.9);
        let id1 = db.upsert_job(&job1).await.unwrap();
        db.set_bookmark(id1, true).await.unwrap();
        db.hide_job(id1).await.unwrap();

        // Insert bookmarked visible job
        let job2 = create_test_job("bookmarked_visible", "Bookmarked Visible", 0.85);
        let id2 = db.upsert_job(&job2).await.unwrap();
        db.set_bookmark(id2, true).await.unwrap();

        // Should only return visible bookmarked job
        let bookmarked = db.get_bookmarked_jobs(10).await.unwrap();
        assert_eq!(bookmarked.len(), 1);
        assert_eq!(bookmarked[0].title, "Bookmarked Visible");
    }

    #[tokio::test]
    async fn test_get_bookmarked_jobs_empty() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert non-bookmarked job
        let job = create_test_job("not_bookmarked", "Not Bookmarked", 0.9);
        db.upsert_job(&job).await.unwrap();

        let bookmarked = db.get_bookmarked_jobs(10).await.unwrap();
        assert_eq!(bookmarked.len(), 0);
    }
}
