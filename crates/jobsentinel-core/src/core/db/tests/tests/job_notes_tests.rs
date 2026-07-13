use super::*;

mod notes_tests {
    use super::*;

    #[tokio::test]
    async fn test_set_job_notes() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("notes_test", "Test Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // Set notes
        db.set_job_notes(id, Some("Great company culture!"))
            .await
            .unwrap();

        // Verify notes were set
        let after = db.get_job_by_id(id).await.unwrap().unwrap();
        assert_eq!(after.notes.as_deref(), Some("Great company culture!"));
    }

    #[tokio::test]
    async fn test_set_job_notes_update() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("notes_update", "Test Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // Set initial notes
        db.set_job_notes(id, Some("Original notes")).await.unwrap();

        // Update notes
        db.set_job_notes(id, Some("Updated notes")).await.unwrap();

        let after = db.get_job_by_id(id).await.unwrap().unwrap();
        assert_eq!(after.notes.as_deref(), Some("Updated notes"));
    }

    #[tokio::test]
    async fn test_set_job_notes_clear() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("notes_clear", "Test Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // Set notes
        db.set_job_notes(id, Some("Some notes")).await.unwrap();

        // Clear notes by setting to None
        db.set_job_notes(id, None).await.unwrap();

        let after = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(after.notes.is_none());
    }

    #[tokio::test]
    async fn test_get_job_notes() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("get_notes", "Test Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // Set notes
        db.set_job_notes(id, Some("Test notes")).await.unwrap();

        // Get notes using dedicated method
        let notes = db.get_job_notes(id).await.unwrap();
        assert_eq!(notes.as_deref(), Some("Test notes"));
    }

    #[tokio::test]
    async fn test_get_job_notes_none() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("no_notes", "Test Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // Get notes (should be None)
        let notes = db.get_job_notes(id).await.unwrap();
        assert!(notes.is_none());
    }

    #[tokio::test]
    async fn test_get_job_notes_nonexistent() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Get notes for non-existent job
        let notes = db.get_job_notes(999999).await.unwrap();
        assert!(notes.is_none());
    }

    #[tokio::test]
    async fn test_get_jobs_with_notes() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert job with notes
        let job1 = create_test_job("with_notes1", "Job 1", 0.9);
        let id1 = db.upsert_job(&job1).await.unwrap();
        db.set_job_notes(id1, Some("Notes 1")).await.unwrap();

        // Insert job without notes
        let job2 = create_test_job("no_notes", "Job 2", 0.85);
        db.upsert_job(&job2).await.unwrap();

        // Insert another job with notes
        let job3 = create_test_job("with_notes2", "Job 3", 0.95);
        let id3 = db.upsert_job(&job3).await.unwrap();
        db.set_job_notes(id3, Some("Notes 2")).await.unwrap();

        // Get jobs with notes
        let jobs_with_notes = db.get_jobs_with_notes(10).await.unwrap();

        assert_eq!(jobs_with_notes.len(), 2);
        assert!(jobs_with_notes.iter().all(|j| j.notes.is_some()));
    }

    #[tokio::test]
    async fn test_get_jobs_with_notes_ordered_by_updated() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert first job with notes
        let job1 = create_test_job("notes_old", "Old Job", 0.9);
        let id1 = db.upsert_job(&job1).await.unwrap();
        db.set_job_notes(id1, Some("Old notes")).await.unwrap();

        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

        // Insert second job with notes
        let job2 = create_test_job("notes_new", "New Job", 0.85);
        let id2 = db.upsert_job(&job2).await.unwrap();
        db.set_job_notes(id2, Some("New notes")).await.unwrap();

        let jobs = db.get_jobs_with_notes(10).await.unwrap();

        // Should be ordered by updated_at DESC (newest first)
        assert_eq!(jobs[0].title, "New Job");
        assert_eq!(jobs[1].title, "Old Job");
    }

    #[tokio::test]
    async fn test_get_jobs_with_notes_limit() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert 5 jobs with notes
        for i in 0..5 {
            let job = create_test_job(&format!("notes_{}", i), &format!("Job {}", i), 0.8);
            let id = db.upsert_job(&job).await.unwrap();
            db.set_job_notes(id, Some(&format!("Notes {}", i)))
                .await
                .unwrap();
        }

        let jobs = db.get_jobs_with_notes(3).await.unwrap();
        assert_eq!(jobs.len(), 3);
    }

    #[tokio::test]
    async fn test_get_jobs_with_notes_excludes_hidden() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert job with notes but hidden
        let job1 = create_test_job("notes_hidden", "Hidden Job", 0.9);
        let id1 = db.upsert_job(&job1).await.unwrap();
        db.set_job_notes(id1, Some("Hidden notes")).await.unwrap();
        db.hide_job(id1).await.unwrap();

        // Insert job with notes and visible
        let job2 = create_test_job("notes_visible", "Visible Job", 0.85);
        let id2 = db.upsert_job(&job2).await.unwrap();
        db.set_job_notes(id2, Some("Visible notes")).await.unwrap();

        let jobs = db.get_jobs_with_notes(10).await.unwrap();
        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].title, "Visible Job");
    }

    #[tokio::test]
    async fn test_notes_with_special_characters() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("special_chars", "Test Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        let special_notes = "Notes with 'quotes', \"double quotes\", and émojis 🎉";
        db.set_job_notes(id, Some(special_notes)).await.unwrap();

        let notes = db.get_job_notes(id).await.unwrap();
        assert_eq!(notes.as_deref(), Some(special_notes));
    }

    #[tokio::test]
    async fn test_notes_with_long_text() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("long_notes", "Test Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        let long_notes = "x".repeat(10000);
        db.set_job_notes(id, Some(&long_notes)).await.unwrap();

        let notes = db.get_job_notes(id).await.unwrap();
        assert_eq!(notes.as_deref(), Some(long_notes.as_str()));
    }
}

mod notes_coverage {
    use super::*;

    #[tokio::test]
    async fn test_get_jobs_with_notes_empty_database() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let results = db.get_jobs_with_notes(10).await.unwrap();
        assert_eq!(results.len(), 0);
    }

    #[tokio::test]
    async fn test_set_job_notes_overwrites_existing() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("notes_overwrite", "Test", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // Set initial notes
        db.set_job_notes(id, Some("First notes")).await.unwrap();

        // Overwrite with new notes
        db.set_job_notes(id, Some("Second notes")).await.unwrap();

        let notes = db.get_job_notes(id).await.unwrap();
        assert_eq!(notes.as_deref(), Some("Second notes"));
    }

    #[tokio::test]
    async fn test_notes_with_newlines_and_tabs() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("notes_whitespace", "Test", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        let notes_with_whitespace = "Line 1\nLine 2\n\tIndented\r\nWindows line";
        db.set_job_notes(id, Some(notes_with_whitespace))
            .await
            .unwrap();

        let notes = db.get_job_notes(id).await.unwrap();
        assert_eq!(notes.as_deref(), Some(notes_with_whitespace));
    }
}
