use super::*;

#[tokio::test]
async fn test_prediction_with_location_like_pattern() {
    let pool = crate::test_support::migrated_pool().await;
    insert_test_job(&pool, "job_like", "Case Manager", "San Francisco Bay Area").await;
    insert_benchmark(
        &pool,
        "case manager",
        "san francisco, ca",
        "mid",
        140000,
        165000,
        195000,
        75,
    )
    .await;

    let predictor = SalaryPredictor::new(pool);
    let prediction = predictor
        .predict_for_job("job_like", Some(5))
        .await
        .expect("location-normalized prediction");

    assert_eq!(prediction.predicted_median, 165000);
    assert_eq!(prediction.prediction_method, "h1b_match");
}

#[tokio::test]
async fn test_seniority_detection_from_title() {
    let pool = crate::test_support::migrated_pool().await;

    insert_test_job(&pool, "job_jr", "Junior Case Manager", "Remote").await;
    insert_benchmark(
        &pool,
        "junior case manager",
        "remote",
        "entry",
        70000,
        85000,
        100000,
        40,
    )
    .await;

    let predictor = SalaryPredictor::new(pool.clone());
    let result = predictor.predict_for_job("job_jr", None).await.unwrap();
    assert_eq!(result.predicted_median, 85000);

    insert_test_job(&pool, "job_sr", "Senior Case Manager", "Remote").await;
    insert_benchmark(
        &pool,
        "senior case manager",
        "remote",
        "senior",
        150000,
        170000,
        200000,
        50,
    )
    .await;

    let result = predictor.predict_for_job("job_sr", None).await.unwrap();
    assert_eq!(result.predicted_median, 170000);
}
