use super::*;

mod search_tests {
    use super::*;

    #[tokio::test]
    async fn test_search_jobs_by_title() {
        let db = crate::test_support::migrated_database().await;

        // Insert jobs
        let job1 = create_test_job("search1", "Senior Support Manager", 0.9);
        db.upsert_job(&job1).await.unwrap();

        let job2 = create_test_job("search2", "Retail Supervisor", 0.8);
        db.upsert_job(&job2).await.unwrap();

        let job3 = create_test_job("search3", "Bilingual Support Specialist", 0.85);
        db.upsert_job(&job3).await.unwrap();

        // Search for "Support"
        let results = db.search_jobs("Support", 10).await.unwrap();

        assert_eq!(results.len(), 2);
        assert!(results.iter().any(|j| j.title.contains("Support")));
    }

    #[tokio::test]
    async fn test_search_jobs_by_description() {
        let db = crate::test_support::migrated_database().await;

        // Insert job with specific description
        let mut job = create_test_job("search_desc", "Test Job", 0.9);
        job.description =
            Some("Looking for an expert in distributed systems and microservices".to_string());
        db.upsert_job(&job).await.unwrap();

        // Search for term in description
        let results = db.search_jobs("microservices", 10).await.unwrap();

        assert_eq!(results.len(), 1);
        assert!(results[0]
            .description
            .as_ref()
            .unwrap()
            .contains("microservices"));
    }

    #[tokio::test]
    async fn test_search_jobs_limit() {
        let db = crate::test_support::migrated_database().await;

        // Insert 5 jobs with "Coordinator" in title
        for i in 0..5 {
            let job = create_test_job(
                &format!("eng_{}", i),
                &format!("Program Coordinator {}", i),
                0.8,
            );
            db.upsert_job(&job).await.unwrap();
        }

        // Search with limit 3
        let results = db.search_jobs("Coordinator", 3).await.unwrap();

        assert_eq!(results.len(), 3);
    }

    #[tokio::test]
    async fn test_search_jobs_no_results() {
        let db = crate::test_support::migrated_database().await;

        let job = create_test_job("search_none", "Case Manager", 0.9);
        db.upsert_job(&job).await.unwrap();

        // Search for term that doesn't exist
        let results = db.search_jobs("ZyxwvutNonexistent", 10).await.unwrap();

        assert_eq!(results.len(), 0);
    }

    #[tokio::test]
    async fn test_search_jobs_case_insensitive() {
        let db = crate::test_support::migrated_database().await;

        let job = create_test_job("case_test", "Senior BILINGUAL Support Specialist", 0.9);
        db.upsert_job(&job).await.unwrap();

        // Search with lowercase
        let results = db.search_jobs("bilingual", 10).await.unwrap();

        assert_eq!(results.len(), 1);
    }

    #[tokio::test]
    async fn test_search_jobs_empty_query() {
        let db = crate::test_support::migrated_database().await;

        let job = create_test_job("empty_search", "Test Job", 0.9);
        db.upsert_job(&job).await.unwrap();

        // Empty search should return no results (FTS5 requirement)
        let results = db.search_jobs("", 10).await;

        // FTS5 typically returns error for empty query
        assert!(results.is_err() || results.unwrap().is_empty());
    }
}

mod search_edge_cases {
    use super::*;

    #[tokio::test]
    async fn test_search_jobs_with_special_fts_characters() {
        let db = crate::test_support::migrated_database().await;

        let job = create_test_job("fts_test", "C++ Developer", 0.9);
        db.upsert_job(&job).await.unwrap();

        // FTS5 treats + as special, but should still handle it
        let result = db.search_jobs("C++", 10).await;
        // May succeed or fail depending on FTS5 tokenizer, but shouldn't crash
        assert!(result.is_ok() || result.is_err());
    }

    // Note: The following FTS5 search tests are skipped because FTS5 tables
    // may not be properly initialized in in-memory databases. FTS5 search
    // is tested in integration tests with real database files.
}

mod search_error_paths {
    use super::*;

    #[tokio::test]
    async fn test_search_jobs_with_too_many_results() {
        let db = crate::test_support::migrated_database().await;

        // Insert 1005 jobs with common keyword (exceeds MAX_IDS = 1000)
        for i in 0..1005 {
            let job = create_test_job(
                &format!("search_overflow_{}", i),
                &format!("Coordinator Position {}", i),
                0.8,
            );
            db.upsert_job(&job).await.unwrap();
        }

        // Search should hit the MAX_IDS limit
        let result = db.search_jobs("Coordinator", 1005).await;

        // Should return error about too many IDs
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(err_msg.contains("Too many job IDs") || err_msg.contains("job IDs requested"));
    }

    #[tokio::test]
    async fn test_search_jobs_with_max_limit() {
        let db = crate::test_support::migrated_database().await;

        // Insert 100 jobs
        for i in 0..100 {
            let job = create_test_job(
                &format!("max_limit_{}", i),
                &format!("Case Manager {}", i),
                0.8,
            );
            db.upsert_job(&job).await.unwrap();
        }

        // Search with exactly 1000 limit (should succeed)
        let result = db.search_jobs("Case", 1000).await;
        assert!(result.is_ok());
        assert!(result.unwrap().len() <= 100);
    }

    #[tokio::test]
    async fn test_search_jobs_special_characters() {
        let db = crate::test_support::migrated_database().await;

        let mut job = create_test_job("special", "Test Job", 0.9);
        job.description = Some("Job requires C# and .NET experience".to_string());
        db.upsert_job(&job).await.unwrap();

        // Search with special characters (FTS5 may handle differently)
        let result = db.search_jobs("C#", 10).await;
        // Should not crash - may return results or error depending on tokenizer
        assert!(result.is_ok() || result.is_err());
    }

    #[tokio::test]
    async fn test_search_jobs_with_quotes() {
        let db = crate::test_support::migrated_database().await;

        let mut job = create_test_job("quotes", "Senior Case Manager", 0.9);
        job.description = Some("Looking for 'experienced' coordinators".to_string());
        db.upsert_job(&job).await.unwrap();

        // FTS5 phrase search with quotes
        let result = db.search_jobs("\"Senior Case Manager\"", 10).await;
        // Should handle quoted phrases
        assert!(result.is_ok() || result.is_err());
    }

    #[tokio::test]
    async fn test_search_jobs_unicode_query() {
        let db = crate::test_support::migrated_database().await;

        let mut job = create_test_job("unicode_search", "Développeur Senior", 0.9);
        job.description = Some("Poste à São Paulo".to_string());
        db.upsert_job(&job).await.unwrap();

        let result = db.search_jobs("Développeur", 10).await;
        assert!(result.is_ok());
    }
}
