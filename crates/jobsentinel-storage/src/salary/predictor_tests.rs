use super::*;
use sqlx::SqlitePool;

#[path = "predictor_tests/normalization_seniority_tests.rs"]
mod normalization_seniority_tests;
#[path = "predictor_tests/pure_tests.rs"]
mod pure_tests;

// Insert a test job
async fn insert_test_job(pool: &SqlitePool, hash: &str, title: &str, location: &str) {
    sqlx::query(
        r#"
        INSERT INTO jobs (hash, title, company, url, location, source)
        VALUES (?, ?, 'Test Company', 'https://example.com', ?, 'test')
        "#,
    )
    .bind(hash)
    .bind(title)
    .bind(location)
    .execute(pool)
    .await
    .expect("Failed to insert test job");
}

// Insert a salary benchmark
async fn insert_benchmark(
    pool: &SqlitePool,
    title: &str,
    location: &str,
    seniority: &str,
    min: i64,
    median: i64,
    p75: i64,
    sample_size: i64,
) {
    sqlx::query(
        r#"
        INSERT INTO salary_benchmarks (
            job_title_normalized, location_normalized, seniority_level,
            min_salary, p25_salary, median_salary, p75_salary, max_salary,
            average_salary, sample_size
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(title)
    .bind(location)
    .bind(seniority)
    .bind(min)
    .bind((min + median) / 2) // p25
    .bind(median)
    .bind(p75)
    .bind(p75 + 10000) // max
    .bind((min + median + p75) / 3) // average
    .bind(sample_size)
    .execute(pool)
    .await
    .expect("Failed to insert benchmark");
}

#[tokio::test]
async fn test_new_creates_predictor() {
    let pool = crate::test_support::migrated_pool().await;
    let predictor = SalaryPredictor::new(pool);
    // Just verify it was created (struct is simple)
    assert_eq!(
        std::mem::size_of_val(&predictor),
        std::mem::size_of::<SqlitePool>()
    );
}

#[tokio::test]
async fn test_predict_for_job_exact_match() {
    let pool = crate::test_support::migrated_pool().await;
    insert_test_job(&pool, "job123", "Senior Case Manager", "San Francisco, CA").await;
    insert_benchmark(
        &pool,
        "senior case manager",
        "san francisco, ca",
        "senior",
        150000,
        180000,
        220000,
        100,
    )
    .await;

    let predictor = SalaryPredictor::new(pool);
    let result = predictor.predict_for_job("job123", None).await;

    assert!(result.is_ok());
    let prediction = result.unwrap();
    assert_eq!(prediction.job_hash, "job123");
    assert_eq!(prediction.predicted_min, 150000);
    assert_eq!(prediction.predicted_median, 180000);
    assert_eq!(prediction.predicted_max, 220000);
    assert_eq!(prediction.confidence_score, 0.9); // High confidence for exact match
    assert_eq!(prediction.prediction_method, "h1b_match");
    assert_eq!(prediction.data_points_used, 100);
}

#[tokio::test]
async fn test_predict_for_job_with_experience_override() {
    let pool = crate::test_support::migrated_pool().await;
    // Job title suggests "senior" but we override with experience for "entry"
    insert_test_job(
        &pool,
        "job456",
        "Senior Program Coordinator",
        "New York, NY",
    )
    .await;
    insert_benchmark(
        &pool,
        "senior program coordinator",
        "new york, ny",
        "entry",
        90000,
        110000,
        130000,
        50,
    )
    .await;

    let predictor = SalaryPredictor::new(pool);
    // 2 years of experience = Entry level
    let result = predictor.predict_for_job("job456", Some(2)).await;

    assert!(result.is_ok());
    let prediction = result.unwrap();
    assert_eq!(prediction.predicted_min, 90000);
    assert_eq!(prediction.predicted_median, 110000);
    assert_eq!(prediction.predicted_max, 130000);
    assert_eq!(prediction.confidence_score, 0.9);
}

#[tokio::test]
async fn test_predict_for_job_fallback_average() {
    let pool = crate::test_support::migrated_pool().await;
    insert_test_job(&pool, "job789", "Case Manager", "Austin, TX").await;

    // No exact location match, but have data for same title/seniority in other locations
    insert_benchmark(
        &pool,
        "case manager",
        "san francisco, ca",
        "mid",
        140000,
        160000,
        190000,
        80,
    )
    .await;
    insert_benchmark(
        &pool,
        "case manager",
        "new york, ny",
        "mid",
        130000,
        150000,
        180000,
        60,
    )
    .await;

    let predictor = SalaryPredictor::new(pool);
    let result = predictor.predict_for_job("job789", Some(5)).await; // 5 years = Mid

    assert!(result.is_ok());
    let prediction = result.unwrap();
    // Should use average of both benchmarks
    assert_eq!(prediction.predicted_min, (140000 + 130000) / 2); // 135000
    assert_eq!(prediction.predicted_median, (160000 + 150000) / 2); // 155000
    assert_eq!(prediction.predicted_max, (190000 + 180000) / 2); // 185000
    assert_eq!(prediction.confidence_score, 0.6); // Lower confidence for averaged data
    assert_eq!(prediction.prediction_method, "h1b_average");
    assert_eq!(prediction.data_points_used, 140); // Sum of sample sizes
}

#[tokio::test]
async fn test_predict_for_job_default_fallback_entry() {
    let pool = crate::test_support::migrated_pool().await;
    insert_test_job(&pool, "job_entry", "Junior Inventory Planner", "Remote").await;

    let predictor = SalaryPredictor::new(pool);
    // No benchmark data at all, should use defaults
    let result = predictor.predict_for_job("job_entry", Some(1)).await; // 1 year = Entry

    assert!(result.is_ok());
    let prediction = result.unwrap();
    assert_eq!(prediction.predicted_median, 80000); // Entry base
    assert_eq!(prediction.predicted_min, 64000); // 80000 * 0.8
    assert_eq!(prediction.predicted_max, 104000); // 80000 * 1.3
    assert_eq!(prediction.confidence_score, 0.3); // Low confidence for defaults
    assert_eq!(prediction.prediction_method, "default");
    assert_eq!(prediction.data_points_used, 0);
}

#[tokio::test]
async fn test_predict_for_job_default_fallback_senior() {
    let pool = crate::test_support::migrated_pool().await;
    insert_test_job(
        &pool,
        "job_senior",
        "Senior Training Coordinator",
        "Portland, OR",
    )
    .await;

    let predictor = SalaryPredictor::new(pool);
    let result = predictor.predict_for_job("job_senior", Some(10)).await; // 10 years = Senior

    assert!(result.is_ok());
    let prediction = result.unwrap();
    assert_eq!(prediction.predicted_median, 160000); // Senior base
    assert_eq!(prediction.predicted_min, 128000); // 160000 * 0.8
    assert_eq!(prediction.predicted_max, 208000); // 160000 * 1.3
}

#[tokio::test]
async fn test_predict_for_job_default_fallback_staff() {
    let pool = crate::test_support::migrated_pool().await;
    insert_test_job(&pool, "job_staff", "Staff Case Manager", "Seattle, WA").await;

    let predictor = SalaryPredictor::new(pool);
    let result = predictor.predict_for_job("job_staff", Some(12)).await; // 12 years = Staff

    assert!(result.is_ok());
    let prediction = result.unwrap();
    assert_eq!(prediction.predicted_median, 200000); // Staff base
    assert_eq!(prediction.predicted_min, 160000);
    assert_eq!(prediction.predicted_max, 260000);
}

#[tokio::test]
async fn test_predict_for_job_default_fallback_principal() {
    let pool = crate::test_support::migrated_pool().await;
    insert_test_job(
        &pool,
        "job_principal",
        "Principal Operations Analyst",
        "Boston, MA",
    )
    .await;

    let predictor = SalaryPredictor::new(pool);
    let result = predictor.predict_for_job("job_principal", Some(18)).await; // 18 years = Principal

    assert!(result.is_ok());
    let prediction = result.unwrap();
    assert_eq!(prediction.predicted_median, 250000); // Principal base
    assert_eq!(prediction.predicted_min, 200000);
    assert_eq!(prediction.predicted_max, 325000);
}

#[tokio::test]
async fn test_predict_for_job_stores_prediction() {
    let pool = crate::test_support::migrated_pool().await;
    insert_test_job(&pool, "job_store", "Data Scientist", "Chicago, IL").await;

    let predictor = SalaryPredictor::new(pool);
    predictor.predict_for_job("job_store", None).await.unwrap();

    // Verify prediction was stored in database
    let stored = sqlx::query("SELECT * FROM job_salary_predictions WHERE job_hash = ?")
        .bind("job_store")
        .fetch_one(&predictor.db)
        .await;

    assert!(stored.is_ok());
    let row = stored.unwrap();
    let hash: String = row.try_get("job_hash").unwrap();
    assert_eq!(hash, "job_store");
}

#[tokio::test]
async fn test_predict_for_job_updates_existing_prediction() {
    let pool = crate::test_support::migrated_pool().await;
    insert_test_job(&pool, "job_update", "Product Manager", "Denver, CO").await;

    let predictor = SalaryPredictor::new(pool.clone());

    // First prediction
    let first = predictor
        .predict_for_job("job_update", Some(5))
        .await
        .unwrap();
    assert_eq!(first.predicted_median, 120000); // Mid level default

    // Add benchmark data (use cloned pool)
    insert_benchmark(
        &pool,
        "product manager",
        "denver, co",
        "mid",
        110000,
        130000,
        150000,
        30,
    )
    .await;

    // Second prediction should update
    let second = predictor
        .predict_for_job("job_update", Some(5))
        .await
        .unwrap();
    assert_eq!(second.predicted_median, 130000); // Now uses benchmark

    // Verify only one record exists
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM job_salary_predictions WHERE job_hash = ?")
            .bind("job_update")
            .fetch_one(&predictor.db)
            .await
            .unwrap();
    assert_eq!(count, 1);
}

#[tokio::test]
async fn test_predict_for_job_nonexistent_job() {
    let pool = crate::test_support::migrated_pool().await;
    let predictor = SalaryPredictor::new(pool);

    let result = predictor.predict_for_job("nonexistent", None).await;
    assert!(result.is_err()); // Should fail because job doesn't exist
}

#[tokio::test]
async fn test_predict_for_job_empty_location() {
    let pool = crate::test_support::migrated_pool().await;
    insert_test_job(&pool, "job_noloc", "Program Coordinator", "").await;

    let predictor = SalaryPredictor::new(pool);
    let result = predictor.predict_for_job("job_noloc", Some(3)).await;

    assert!(result.is_ok());
    // Should fall back to defaults since no location match
    let prediction = result.unwrap();
    assert_eq!(prediction.predicted_median, 120000); // Mid level default
}

#[tokio::test]
async fn test_get_prediction_exists() {
    let pool = crate::test_support::migrated_pool().await;
    insert_test_job(&pool, "job_get", "Training Coordinator", "Atlanta, GA").await;

    let predictor = SalaryPredictor::new(pool);
    predictor.predict_for_job("job_get", Some(7)).await.unwrap();

    let result = predictor.get_prediction("job_get").await;
    assert!(result.is_ok());

    let prediction = result.unwrap();
    assert!(prediction.is_some());

    let pred = prediction.unwrap();
    assert_eq!(pred.job_hash, "job_get");
    assert!(pred.predicted_min > 0);
    assert!(pred.predicted_median > 0);
    assert!(pred.predicted_max > 0);
}

#[tokio::test]
async fn test_get_prediction_not_found() {
    let pool = crate::test_support::migrated_pool().await;
    let predictor = SalaryPredictor::new(pool);

    let result = predictor.get_prediction("nonexistent").await;
    assert!(result.is_ok());
    assert!(result.unwrap().is_none());
}

#[tokio::test]
async fn test_get_prediction_returns_correct_data() {
    let pool = crate::test_support::migrated_pool().await;
    insert_test_job(&pool, "job_data", "Workforce Analyst", "Los Angeles, CA").await;
    insert_benchmark(
        &pool,
        "workforce analyst",
        "los angeles, ca",
        "mid",
        125000,
        145000,
        175000,
        25,
    )
    .await;

    let predictor = SalaryPredictor::new(pool);
    let predicted = predictor
        .predict_for_job("job_data", Some(6))
        .await
        .unwrap();

    let retrieved = predictor.get_prediction("job_data").await.unwrap().unwrap();

    assert_eq!(predicted.job_hash, retrieved.job_hash);
    assert_eq!(predicted.predicted_min, retrieved.predicted_min);
    assert_eq!(predicted.predicted_median, retrieved.predicted_median);
    assert_eq!(predicted.predicted_max, retrieved.predicted_max);
    assert_eq!(predicted.confidence_score, retrieved.confidence_score);
    assert_eq!(predicted.prediction_method, retrieved.prediction_method);
    assert_eq!(predicted.data_points_used, retrieved.data_points_used);
}
