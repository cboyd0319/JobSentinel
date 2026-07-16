use super::*;

#[path = "trend_edge_tests/location_parsing_tests.rs"]
mod location_parsing_tests;

#[tokio::test]
async fn test_compute_salary_trends_with_growth() {
    let pool = setup_test_db().await;

    // Insert previous salary trend
    sqlx::query(
        r#"
        INSERT INTO salary_trends (
            job_title_normalized, location_normalized, date,
            min_salary, p25_salary, median_salary, p75_salary, max_salary,
            avg_salary, sample_size, salary_growth_pct
        )
        VALUES ('care coordinator', 'denver', date('now', '-7 days'), 45000, 50000, 55000, 60000, 65000, 55000, 50, 0.0)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Insert current benchmark
    sqlx::query(
        r#"
        INSERT INTO salary_benchmarks (
            job_title_normalized, location_normalized, min_salary, p25_salary,
            median_salary, p75_salary, max_salary, average_salary, sample_size
        )
        VALUES ('care coordinator', 'denver', 50000, 55000, 70000, 75000, 80000, 70000, 50)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.compute_salary_trends().await;
    assert!(result.is_ok());

    // Verify growth was calculated
    let growth: f64 = sqlx::query_scalar(
        "SELECT salary_growth_pct FROM salary_trends WHERE job_title_normalized = 'care coordinator' AND date = date('now')",
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    // Growth from 55000 to 70000 = (15000/55000)*100 = 27.27%
    assert!((growth - 27.27).abs() < 1.0);
}

#[tokio::test]
async fn test_compute_salary_trends_zero_previous() {
    let pool = setup_test_db().await;

    // Insert previous with zero median (edge case)
    sqlx::query(
        r#"
        INSERT INTO salary_trends (
            job_title_normalized, location_normalized, date,
            min_salary, p25_salary, median_salary, p75_salary, max_salary,
            avg_salary, sample_size, salary_growth_pct
        )
        VALUES ('care coordinator', 'denver', date('now', '-7 days'), 0, 0, 0, 0, 0, 0, 1, 0.0)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO salary_benchmarks (
            job_title_normalized, location_normalized, min_salary, p25_salary,
            median_salary, p75_salary, max_salary, average_salary, sample_size
        )
        VALUES ('care coordinator', 'denver', 50000, 55000, 60000, 65000, 70000, 60000, 50)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.compute_salary_trends().await;
    assert!(result.is_ok());

    // Growth should be 0 when previous is 0
    let growth: f64 = sqlx::query_scalar(
        "SELECT salary_growth_pct FROM salary_trends WHERE job_title_normalized = 'care coordinator' AND date = date('now')",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(growth, 0.0);
}

#[tokio::test]
async fn test_compute_company_hiring_velocity_trends() {
    let pool = setup_test_db().await;

    // Insert previous week velocity
    sqlx::query(
        r#"
        INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count)
        VALUES ('Community Care Network', date('now', '-5 days'), 5, 20)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Insert current jobs
    sqlx::query(
        r#"
        INSERT INTO jobs (hash, title, company, location, posted_at, updated_at, status)
        VALUES
            ('job1', 'Care Coordinator', 'Community Care Network', 'Denver, CO', date('now'), datetime('now'), 'active'),
            ('job2', 'Program Coordinator', 'Community Care Network', 'Denver, CO', date('now'), datetime('now'), 'active'),
            ('job3', 'Clinic Manager', 'Community Care Network', 'Denver, CO', date('now'), datetime('now'), 'active')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.compute_company_hiring_velocity().await;
    assert!(result.is_ok());

    // Verify trend is "decreasing" (3 < 5)
    let trend: String = sqlx::query_scalar(
        "SELECT hiring_trend FROM company_hiring_velocity WHERE company_name = 'Community Care Network' AND date = date('now')",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(trend, "decreasing");
}

#[tokio::test]
async fn test_compute_company_hiring_velocity_increasing() {
    let pool = setup_test_db().await;

    // Previous week with fewer jobs
    sqlx::query(
        r#"
        INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count)
        VALUES ('Community Services Co-op', date('now', '-3 days'), 2, 10)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // More jobs today
    for i in 1..=5 {
        sqlx::query(
            r#"
            INSERT INTO jobs (hash, title, company, location, posted_at, updated_at, status)
            VALUES (?, 'Case Manager', 'Community Services Co-op', 'Austin', date('now'), datetime('now'), 'active')
            "#,
        )
        .bind(format!("job{}", i))
        .execute(&pool)
        .await
        .unwrap();
    }

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.compute_company_hiring_velocity().await;
    assert!(result.is_ok());

    let trend: String = sqlx::query_scalar(
        "SELECT hiring_trend FROM company_hiring_velocity WHERE company_name = 'Community Services Co-op' AND date = date('now')",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(trend, "increasing");
}

#[tokio::test]
async fn test_compute_company_hiring_velocity_stable() {
    let pool = setup_test_db().await;

    // Previous week with same count
    sqlx::query(
        r#"
        INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count)
        VALUES ('StableCare Clinic', date('now', '-4 days'), 3, 15)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Same number of jobs today
    for i in 1..=3 {
        sqlx::query(
            r#"
            INSERT INTO jobs (hash, title, company, location, posted_at, updated_at, status)
            VALUES (?, 'Clinic Coordinator', 'StableCare Clinic', 'Seattle', date('now'), datetime('now'), 'active')
            "#,
        )
        .bind(format!("job{}", i))
        .execute(&pool)
        .await
        .unwrap();
    }

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.compute_company_hiring_velocity().await;
    assert!(result.is_ok());

    let trend: String = sqlx::query_scalar(
        "SELECT hiring_trend FROM company_hiring_velocity WHERE company_name = 'StableCare Clinic' AND date = date('now')",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(trend, "stable");
}

#[tokio::test]
async fn test_compute_role_demand_trends_rising() {
    let pool = setup_test_db().await;

    // Previous week demand
    sqlx::query(
        r#"
        INSERT INTO role_demand_trends (
            job_title_normalized, date, job_count,
            avg_salary, median_salary, demand_trend
        )
        VALUES ('care coordinator', date('now', '-5 days'), 10, 60000, 60000, 'stable')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Current salary benchmark
    sqlx::query(
        r#"
        INSERT INTO salary_benchmarks (
            job_title_normalized, location_normalized, min_salary, p25_salary,
            median_salary, p75_salary, max_salary, average_salary, sample_size
        )
        VALUES ('care coordinator', 'remote', 50000, 55000, 60000, 65000, 70000, 60000, 20)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // More jobs today
    for i in 1..=15 {
        sqlx::query(
            r#"
            INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
            VALUES (?, 'Senior Care Coordinator', 'Community Care Network', 'Remote', datetime('now'), datetime('now'))
            "#,
        )
        .bind(format!("job{}", i))
        .execute(&pool)
        .await
        .unwrap();
    }

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.compute_role_demand_trends().await;
    assert!(result.is_ok());

    let trend: String = sqlx::query_scalar(
        "SELECT demand_trend FROM role_demand_trends WHERE job_title_normalized = 'care coordinator' AND date = date('now')",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(trend, "rising");
}

#[tokio::test]
async fn test_compute_role_demand_trends_falling() {
    let pool = setup_test_db().await;

    // Previous week with high demand
    sqlx::query(
        r#"
        INSERT INTO role_demand_trends (
            job_title_normalized, date, job_count,
            avg_salary, median_salary, demand_trend
        )
        VALUES ('designer', date('now', '-6 days'), 20, 100000, 100000, 'rising')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO salary_benchmarks (
            job_title_normalized, location_normalized, min_salary, p25_salary,
            median_salary, p75_salary, max_salary, average_salary, sample_size
        )
        VALUES ('designer', 'remote', 80000, 90000, 100000, 110000, 120000, 100000, 10)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Fewer jobs today
    for i in 1..=5 {
        sqlx::query(
            r#"
            INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
            VALUES (?, 'UX Designer', 'DesignCo', 'Remote', datetime('now'), datetime('now'))
            "#,
        )
        .bind(format!("job{}", i))
        .execute(&pool)
        .await
        .unwrap();
    }

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.compute_role_demand_trends().await;
    assert!(result.is_ok());

    let trend: String = sqlx::query_scalar(
        "SELECT demand_trend FROM role_demand_trends WHERE job_title_normalized = 'designer' AND date = date('now')",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(trend, "falling");
}

#[tokio::test]
async fn test_compute_location_job_density_remote_jobs() {
    let pool = setup_test_db().await;

    // Insert remote jobs
    sqlx::query(
        r#"
        INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
        VALUES
            ('job1', 'Remote Care Coordinator', 'Org1', 'Remote - US', datetime('now'), datetime('now')),
            ('job2', 'Care Coordinator', 'Org2', 'Remote', datetime('now'), datetime('now')),
            ('job3', 'Program Coordinator', 'Org3', 'Austin, TX', datetime('now'), datetime('now'))
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO job_skills (job_hash, skill_name)
        VALUES
            ('job1', 'Case Management'),
            ('job2', 'Case Management'),
            ('job3', 'Program Reporting')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.compute_location_job_density().await;
    assert!(result.is_ok());

    // Check remote location was tracked
    let remote_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM location_job_density WHERE location_normalized LIKE '%remote%'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(remote_count > 0);
}

#[tokio::test]
async fn test_run_daily_analysis_integration() {
    let pool = setup_test_db().await;

    // Insert comprehensive test data
    sqlx::query(
        r#"
        INSERT INTO jobs (hash, title, company, location, posted_at, updated_at, status)
        VALUES
            ('job1', 'Care Coordinator', 'Community Care Network', 'Denver, CO', datetime('now'), datetime('now'), 'active'),
            ('job2', 'Inventory Planner', 'FreshMart', 'Chicago, IL', datetime('now'), datetime('now'), 'active')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO job_skills (job_hash, skill_name, created_at)
        VALUES
            ('job1', 'Case Management', datetime('now')),
            ('job1', 'Customer Support', datetime('now')),
            ('job2', 'Inventory Planning', datetime('now'))
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO job_salary_predictions (job_hash, predicted_median)
        VALUES
            ('job1', 65000.0),
            ('job2', 58000.0)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO salary_benchmarks (
            job_title_normalized, location_normalized, min_salary, p25_salary,
            median_salary, p75_salary, max_salary, average_salary, sample_size
        )
        VALUES ('care coordinator', 'denver, co', 50000, 55000, 60000, 65000, 70000, 60000, 10)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool.clone());
    let result = mi.run_daily_analysis().await;

    // If it fails, print the error
    if let Err(e) = &result {
        eprintln!("Daily analysis failed: {}", e);
    }
    assert!(result.is_ok(), "Daily analysis should succeed");

    // Verify at least skill trends were populated (others depend on more complex data)
    let skill_trends: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM skill_demand_trends")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert!(skill_trends > 0, "Should have skill trends");

    let salary_trends: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM salary_trends")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert!(salary_trends > 0, "Should have salary trends");

    let company_velocity: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM company_hiring_velocity")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert!(company_velocity > 0, "Should have company velocity data");

    let location_density: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM location_job_density")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert!(location_density > 0, "Should have location density data");
}
