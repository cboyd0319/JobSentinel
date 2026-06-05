use super::*;

#[tokio::test]
async fn test_compute_skill_demand_trends_no_data() {
    let pool = setup_test_db().await;
    let mi = MarketIntelligence::new(pool.clone());

    // Should not error on empty database
    let result = mi.compute_skill_demand_trends().await;
    assert!(result.is_ok());

    // Verify no trends were created
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM skill_demand_trends")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 0);
}

#[tokio::test]
async fn test_compute_skill_demand_trends_with_data() {
    let pool = setup_test_db().await;

    // Insert test jobs and skills
    sqlx::query(
        r#"
        INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
        VALUES ('job1', 'Care Coordinator', 'Community Care Network', 'Denver, CO', datetime('now'), datetime('now'))
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO job_skills (job_hash, skill_name, created_at)
        VALUES ('job1', 'Case Management', datetime('now'))
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO job_salary_predictions (job_hash, predicted_median)
        VALUES ('job1', 65000.0)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.compute_skill_demand_trends().await;
    assert!(result.is_ok());

    // Verify trend was created
    let trend: (String, i64, i64) = sqlx::query_as(
        "SELECT skill_name, mention_count, job_count FROM skill_demand_trends WHERE skill_name = 'Case Management'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(trend.0, "Case Management");
    assert_eq!(trend.1, 1); // mention_count
    assert_eq!(trend.2, 1); // job_count
}

#[tokio::test]
async fn test_compute_salary_trends_no_data() {
    let pool = setup_test_db().await;
    let mi = MarketIntelligence::new(pool.clone());

    let result = mi.compute_salary_trends().await;
    assert!(result.is_ok());

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM salary_trends")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 0);
}

#[tokio::test]
async fn test_compute_salary_trends_with_data() {
    let pool = setup_test_db().await;

    // Insert benchmark data
    sqlx::query(
        r#"
        INSERT INTO salary_benchmarks (
            job_title_normalized, location_normalized, min_salary, p25_salary,
            median_salary, p75_salary, max_salary, average_salary, sample_size
        )
        VALUES ('care coordinator', 'denver, co', 50000, 55000, 60000, 65000, 70000, 60000, 50)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.compute_salary_trends().await;
    assert!(result.is_ok());

    // Verify trend was created
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM salary_trends")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 1);

    let median: i64 = sqlx::query_scalar(
        "SELECT median_salary FROM salary_trends WHERE job_title_normalized = 'care coordinator'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(median, 60000);
}

#[tokio::test]
async fn test_compute_company_hiring_velocity_no_data() {
    let pool = setup_test_db().await;
    let mi = MarketIntelligence::new(pool.clone());

    let result = mi.compute_company_hiring_velocity().await;
    assert!(result.is_ok());

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM company_hiring_velocity")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 0);
}

#[tokio::test]
async fn test_compute_company_hiring_velocity_with_data() {
    let pool = setup_test_db().await;

    // Insert test jobs
    sqlx::query(
        r#"
        INSERT INTO jobs (hash, title, company, location, posted_at, updated_at, status)
        VALUES
            ('job1', 'Care Coordinator', 'Community Care Network', 'Denver, CO', date('now'), datetime('now'), 'active'),
            ('job2', 'Program Coordinator', 'Community Care Network', 'Denver, CO', date('now'), datetime('now'), 'active')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.compute_company_hiring_velocity().await;
    assert!(result.is_ok());

    // Verify velocity was recorded
    let velocity: (i64, i64) = sqlx::query_as(
        "SELECT jobs_posted_count, jobs_active_count FROM company_hiring_velocity WHERE company_name = 'Community Care Network'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(velocity.0, 2); // jobs_posted_count
    assert_eq!(velocity.1, 2); // jobs_active_count
}

#[tokio::test]
async fn test_compute_location_job_density_no_data() {
    let pool = setup_test_db().await;
    let mi = MarketIntelligence::new(pool.clone());

    let result = mi.compute_location_job_density().await;
    assert!(result.is_ok());

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM location_job_density")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 0);
}

#[tokio::test]
async fn test_compute_location_job_density_with_data() {
    let pool = setup_test_db().await;

    // Insert test jobs
    sqlx::query(
        r#"
        INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
        VALUES
            ('job1', 'Care Coordinator', 'Community Care Network', 'Seattle, WA', datetime('now'), datetime('now')),
            ('job2', 'Inventory Planner', 'FreshMart', 'Seattle, WA', datetime('now'), datetime('now'))
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Insert skills for the jobs
    sqlx::query(
        r#"
        INSERT INTO job_skills (job_hash, skill_name)
        VALUES
            ('job1', 'Case Management'),
            ('job2', 'Inventory Planning')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.compute_location_job_density().await;
    if let Err(e) = &result {
        eprintln!("Error: {}", e);
    }
    assert!(result.is_ok());

    // Verify density was recorded
    let density: (String, Option<String>, Option<String>, i64) = sqlx::query_as(
        "SELECT location_normalized, city, state, job_count FROM location_job_density",
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(density.0, "seattle, wa");
    assert_eq!(density.1, Some("Seattle".to_string()));
    assert_eq!(density.2, Some("WA".to_string()));
    assert_eq!(density.3, 2);
}

#[tokio::test]
async fn test_compute_role_demand_trends_no_data() {
    let pool = setup_test_db().await;
    let mi = MarketIntelligence::new(pool.clone());

    let result = mi.compute_role_demand_trends().await;
    assert!(result.is_ok());

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM role_demand_trends")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 0);
}

#[tokio::test]
async fn test_compute_role_demand_trends_with_data() {
    let pool = setup_test_db().await;

    // Insert salary benchmark (source of normalized titles)
    sqlx::query(
        r#"
        INSERT INTO salary_benchmarks (
            job_title_normalized, location_normalized, min_salary, p25_salary,
            median_salary, p75_salary, max_salary, average_salary, sample_size
        )
        VALUES ('care coordinator', 'remote', 50000, 55000, 60000, 65000, 70000, 60000, 10)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Insert job with matching title
    sqlx::query(
        r#"
        INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
        VALUES ('job1', 'Senior Care Coordinator', 'Community Care Network', 'Remote', datetime('now'), datetime('now'))
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.compute_role_demand_trends().await;
    assert!(result.is_ok());

    // Verify trend was created
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM role_demand_trends WHERE job_title_normalized = 'care coordinator'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(count, 1);
}

#[tokio::test]
async fn test_detect_market_alerts_skill_surge() {
    let pool = setup_test_db().await;

    // Insert skill data with surge
    sqlx::query(
        r#"
        INSERT INTO skill_demand_trends (skill_name, date, mention_count, job_count)
        VALUES
            ('Case Management', date('now', '-7 days'), 10, 5),
            ('Case Management', date('now'), 20, 12)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.detect_market_alerts().await;
    assert!(result.is_ok());

    // Verify alert was created
    let alert_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM market_alerts WHERE alert_type = 'skill_surge'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(alert_count, 1);
}

#[tokio::test]
async fn test_detect_market_alerts_salary_spike() {
    let pool = setup_test_db().await;

    // Insert salary trend with spike
    sqlx::query(
        r#"
        INSERT INTO salary_trends (
            job_title_normalized, location_normalized, date,
            min_salary, p25_salary, median_salary, p75_salary, max_salary,
            avg_salary, sample_size, salary_growth_pct
        )
        VALUES ('care coordinator', 'denver', date('now'), 50000, 55000, 70000, 75000, 80000, 70000, 50, 30.0)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.detect_market_alerts().await;
    assert!(result.is_ok());

    // Verify alert was created
    let alert_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM market_alerts WHERE alert_type = 'salary_spike'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(alert_count, 1);
}

#[tokio::test]
async fn test_detect_market_alerts_hiring_spree() {
    let pool = setup_test_db().await;

    // Insert company with high velocity
    sqlx::query(
        r#"
        INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count)
        VALUES ('Regional Health Network', date('now'), 15, 50)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.detect_market_alerts().await;
    assert!(result.is_ok());

    // Verify alert was created
    let alert_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM market_alerts WHERE alert_type = 'hiring_spree'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(alert_count, 1);
}

#[tokio::test]
async fn test_get_unread_alerts_empty() {
    let pool = setup_test_db().await;
    let mi = MarketIntelligence::new(pool);

    let alerts = mi.get_unread_alerts().await.unwrap();
    assert_eq!(alerts.len(), 0);
}

#[tokio::test]
async fn test_get_unread_alerts_with_data() {
    let pool = setup_test_db().await;

    // Insert test alerts
    sqlx::query(
        r#"
        INSERT INTO market_alerts (alert_type, title, description, severity, is_read)
        VALUES
            ('skill_surge', 'Case Management Surging', 'Case management demand is rising', 'info', 0),
            ('salary_spike', 'Salaries Up', 'Pay is rising', 'info', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool);
    let alerts = mi.get_unread_alerts().await.unwrap();

    // Should only get unread alerts
    assert_eq!(alerts.len(), 1);
    assert_eq!(alerts[0].title, "Case Management Surging");
}
