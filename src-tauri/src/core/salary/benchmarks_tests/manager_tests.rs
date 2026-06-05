use super::*;

async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();

    sqlx::query(
        r#"
            CREATE TABLE IF NOT EXISTS salary_benchmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_title_normalized TEXT NOT NULL,
                location_normalized TEXT NOT NULL,
                seniority_level TEXT NOT NULL,
                min_salary INTEGER NOT NULL,
                p25_salary INTEGER NOT NULL,
                median_salary INTEGER NOT NULL,
                p75_salary INTEGER NOT NULL,
                max_salary INTEGER NOT NULL,
                average_salary INTEGER NOT NULL,
                sample_size INTEGER NOT NULL,
                data_source TEXT NOT NULL DEFAULT 'h1b',
                last_updated TEXT NOT NULL,
                UNIQUE(job_title_normalized, location_normalized, seniority_level, data_source)
            )
            "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    pool
}

#[tokio::test]
async fn test_benchmark_manager_new() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool);
    assert_eq!(
        std::mem::size_of_val(&manager),
        std::mem::size_of::<SqlitePool>()
    );
}

#[tokio::test]
async fn test_upsert_benchmark_insert() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let benchmark = create_test_benchmark();
    let result = manager.upsert_benchmark(&benchmark).await;

    assert!(result.is_ok());

    let row = sqlx::query(
        "SELECT COUNT(*) as count FROM salary_benchmarks WHERE job_title_normalized = ?",
    )
    .bind(&benchmark.job_title)
    .fetch_one(&pool)
    .await
    .unwrap();

    let count: i64 = row.try_get("count").unwrap();
    assert_eq!(count, 1);
}

#[tokio::test]
async fn test_upsert_benchmark_update() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let mut benchmark = create_test_benchmark();
    manager.upsert_benchmark(&benchmark).await.unwrap();

    benchmark.median_salary = 160000;
    benchmark.sample_size = 600;
    manager.upsert_benchmark(&benchmark).await.unwrap();

    let row = sqlx::query(
        "SELECT COUNT(*) as count FROM salary_benchmarks WHERE job_title_normalized = ?",
    )
    .bind(&benchmark.job_title)
    .fetch_one(&pool)
    .await
    .unwrap();

    let count: i64 = row.try_get("count").unwrap();
    assert_eq!(count, 1);

    let row = sqlx::query(
        "SELECT median_salary, sample_size FROM salary_benchmarks WHERE job_title_normalized = ?",
    )
    .bind(&benchmark.job_title)
    .fetch_one(&pool)
    .await
    .unwrap();

    let median: i64 = row.try_get("median_salary").unwrap();
    let sample: i64 = row.try_get("sample_size").unwrap();
    assert_eq!(median, 160000);
    assert_eq!(sample, 600);
}

#[tokio::test]
async fn test_upsert_benchmark_different_seniority() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let mut benchmark = create_test_benchmark();
    benchmark.seniority_level = SeniorityLevel::Entry;
    manager.upsert_benchmark(&benchmark).await.unwrap();

    benchmark.seniority_level = SeniorityLevel::Senior;
    benchmark.median_salary = 200000;
    manager.upsert_benchmark(&benchmark).await.unwrap();

    let row = sqlx::query(
        "SELECT COUNT(*) as count FROM salary_benchmarks WHERE job_title_normalized = ?",
    )
    .bind(&benchmark.job_title)
    .fetch_one(&pool)
    .await
    .unwrap();

    let count: i64 = row.try_get("count").unwrap();
    assert_eq!(count, 2);
}

#[tokio::test]
async fn test_upsert_benchmark_different_location() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let mut benchmark = create_test_benchmark();
    benchmark.location = "Chicago, IL".to_string();
    manager.upsert_benchmark(&benchmark).await.unwrap();

    benchmark.location = "Atlanta, GA".to_string();
    benchmark.median_salary = 130000;
    manager.upsert_benchmark(&benchmark).await.unwrap();

    let row = sqlx::query(
        "SELECT COUNT(*) as count FROM salary_benchmarks WHERE job_title_normalized = ?",
    )
    .bind(&benchmark.job_title)
    .fetch_one(&pool)
    .await
    .unwrap();

    let count: i64 = row.try_get("count").unwrap();
    assert_eq!(count, 2);
}

#[tokio::test]
async fn test_get_benchmarks_for_title_exact_match() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let benchmark = create_test_benchmark();
    manager.upsert_benchmark(&benchmark).await.unwrap();

    let results = manager
        .get_benchmarks_for_title("Case Manager")
        .await
        .unwrap();

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].job_title, "Case Manager");
    assert_eq!(results[0].median_salary, 150000);
}

#[tokio::test]
async fn test_get_benchmarks_for_title_partial_match() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let benchmark = create_test_benchmark();
    manager.upsert_benchmark(&benchmark).await.unwrap();

    let results = manager.get_benchmarks_for_title("Manager").await.unwrap();
    assert_eq!(results.len(), 1);

    let results = manager.get_benchmarks_for_title("Case").await.unwrap();
    assert_eq!(results.len(), 1);

    let results = manager.get_benchmarks_for_title("case").await.unwrap();
    assert_eq!(results.len(), 1);
}

#[tokio::test]
async fn test_get_benchmarks_for_title_no_match() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let benchmark = create_test_benchmark();
    manager.upsert_benchmark(&benchmark).await.unwrap();

    let results = manager
        .get_benchmarks_for_title("Project Coordinator")
        .await
        .unwrap();

    assert_eq!(results.len(), 0);
}

#[tokio::test]
async fn test_get_benchmarks_for_title_multiple_results() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let mut benchmark1 = create_test_benchmark();
    benchmark1.job_title = "Case Manager".to_string();
    benchmark1.sample_size = 500;
    manager.upsert_benchmark(&benchmark1).await.unwrap();

    let mut benchmark2 = create_test_benchmark();
    benchmark2.job_title = "Senior Case Manager".to_string();
    benchmark2.location = "Denver, CO".to_string();
    benchmark2.sample_size = 300;
    manager.upsert_benchmark(&benchmark2).await.unwrap();

    let mut benchmark3 = create_test_benchmark();
    benchmark3.job_title = "Lead Case Manager".to_string();
    benchmark3.location = "Atlanta, GA".to_string();
    benchmark3.sample_size = 800;
    manager.upsert_benchmark(&benchmark3).await.unwrap();

    let results = manager.get_benchmarks_for_title("Case").await.unwrap();
    assert_eq!(results.len(), 3);
    assert_eq!(results[0].sample_size, 800);
    assert_eq!(results[1].sample_size, 500);
    assert_eq!(results[2].sample_size, 300);
}

#[tokio::test]
async fn test_get_benchmarks_for_title_limit_50() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    for i in 0..60 {
        let mut benchmark = create_test_benchmark();
        benchmark.job_title = "Case Manager".to_string();
        benchmark.location = format!("City {}", i);
        benchmark.sample_size = 100 + i;
        manager.upsert_benchmark(&benchmark).await.unwrap();
    }

    let results = manager.get_benchmarks_for_title("Case").await.unwrap();

    assert_eq!(results.len(), 50);
    assert!(results[0].sample_size >= results[49].sample_size);
}

#[tokio::test]
async fn test_get_benchmarks_for_title_case_insensitive() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let benchmark = create_test_benchmark();
    manager.upsert_benchmark(&benchmark).await.unwrap();

    let results1 = manager
        .get_benchmarks_for_title("case manager")
        .await
        .unwrap();
    let results2 = manager
        .get_benchmarks_for_title("CASE MANAGER")
        .await
        .unwrap();
    let results3 = manager
        .get_benchmarks_for_title("CaSe MaNaGeR")
        .await
        .unwrap();

    assert_eq!(results1.len(), 1);
    assert_eq!(results2.len(), 1);
    assert_eq!(results3.len(), 1);
}

#[tokio::test]
async fn test_get_benchmarks_preserves_sqlite_last_updated() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    sqlx::query(
        r#"
            INSERT INTO salary_benchmarks (
                job_title_normalized, location_normalized, seniority_level,
                min_salary, p25_salary, median_salary, p75_salary,
                max_salary, average_salary, sample_size, data_source, last_updated
            )
            VALUES (
                'case manager', 'remote', 'mid',
                100000, 120000, 140000, 160000,
                180000, 145000, 42, 'h1b', '2026-05-20 12:34:56'
            )
            "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let benchmarks = manager
        .get_benchmarks_for_title("case manager")
        .await
        .unwrap();

    assert_eq!(benchmarks.len(), 1);
    assert_eq!(
        benchmarks[0].last_updated.to_rfc3339(),
        "2026-05-20T12:34:56+00:00"
    );
}

#[tokio::test]
async fn test_get_top_paying_locations_basic() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let mut benchmark1 = create_test_benchmark();
    benchmark1.location = "Chicago, IL".to_string();
    benchmark1.median_salary = 180000;
    manager.upsert_benchmark(&benchmark1).await.unwrap();

    let mut benchmark2 = create_test_benchmark();
    benchmark2.location = "Atlanta, GA".to_string();
    benchmark2.median_salary = 130000;
    manager.upsert_benchmark(&benchmark2).await.unwrap();

    let mut benchmark3 = create_test_benchmark();
    benchmark3.location = "Denver, CO".to_string();
    benchmark3.median_salary = 160000;
    manager.upsert_benchmark(&benchmark3).await.unwrap();

    let results = manager
        .get_top_paying_locations("Case Manager", 3)
        .await
        .unwrap();

    assert_eq!(results.len(), 3);
    assert_eq!(results[0].0, "Chicago, IL");
    assert_eq!(results[0].1, 180000);
    assert_eq!(results[1].0, "Denver, CO");
    assert_eq!(results[1].1, 160000);
    assert_eq!(results[2].0, "Atlanta, GA");
    assert_eq!(results[2].1, 130000);
}

#[tokio::test]
async fn test_get_top_paying_locations_with_limit() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    for i in 0..5 {
        let mut benchmark = create_test_benchmark();
        benchmark.location = format!("City {}", i);
        benchmark.median_salary = 100000 + (i * 10000);
        manager.upsert_benchmark(&benchmark).await.unwrap();
    }

    let results = manager
        .get_top_paying_locations("Case Manager", 3)
        .await
        .unwrap();

    assert_eq!(results.len(), 3);
    assert_eq!(results[0].1, 140000);
    assert_eq!(results[1].1, 130000);
    assert_eq!(results[2].1, 120000);
}

#[tokio::test]
async fn test_get_top_paying_locations_no_results() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let benchmark = create_test_benchmark();
    manager.upsert_benchmark(&benchmark).await.unwrap();

    let results = manager
        .get_top_paying_locations("Project Coordinator", 5)
        .await
        .unwrap();

    assert_eq!(results.len(), 0);
}

#[tokio::test]
async fn test_get_top_paying_locations_exact_title_match() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let mut benchmark1 = create_test_benchmark();
    benchmark1.job_title = "Case Manager".to_string();
    benchmark1.location = "CHI".to_string();
    benchmark1.median_salary = 180000;
    manager.upsert_benchmark(&benchmark1).await.unwrap();

    let mut benchmark2 = create_test_benchmark();
    benchmark2.job_title = "Senior Case Manager".to_string();
    benchmark2.location = "Atlanta".to_string();
    benchmark2.median_salary = 200000;
    manager.upsert_benchmark(&benchmark2).await.unwrap();

    let results = manager
        .get_top_paying_locations("Case Manager", 5)
        .await
        .unwrap();

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].0, "CHI");
}

#[tokio::test]
async fn test_get_top_paying_locations_zero_limit() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let benchmark = create_test_benchmark();
    manager.upsert_benchmark(&benchmark).await.unwrap();

    let results = manager
        .get_top_paying_locations("Case Manager", 0)
        .await
        .unwrap();

    assert_eq!(results.len(), 0);
}

#[tokio::test]
async fn test_upsert_benchmark_all_seniority_levels() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let seniority_levels = vec![
        SeniorityLevel::Entry,
        SeniorityLevel::Mid,
        SeniorityLevel::Senior,
        SeniorityLevel::Staff,
        SeniorityLevel::Principal,
        SeniorityLevel::Unknown,
    ];

    for level in seniority_levels {
        let mut benchmark = create_test_benchmark();
        benchmark.seniority_level = level;
        let result = manager.upsert_benchmark(&benchmark).await;
        assert!(result.is_ok());
    }

    let row = sqlx::query("SELECT COUNT(*) as count FROM salary_benchmarks")
        .fetch_one(&pool)
        .await
        .unwrap();
    let count: i64 = row.try_get("count").unwrap();
    assert_eq!(count, 6);
}

#[tokio::test]
async fn test_get_benchmarks_preserves_all_fields() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let original = create_test_benchmark();
    manager.upsert_benchmark(&original).await.unwrap();

    let results = manager
        .get_benchmarks_for_title("Case Manager")
        .await
        .unwrap();

    assert_eq!(results.len(), 1);
    let retrieved = &results[0];

    assert_eq!(retrieved.job_title, original.job_title);
    assert_eq!(retrieved.location, original.location);
    assert_eq!(retrieved.min_salary, original.min_salary);
    assert_eq!(retrieved.p25_salary, original.p25_salary);
    assert_eq!(retrieved.median_salary, original.median_salary);
    assert_eq!(retrieved.p75_salary, original.p75_salary);
    assert_eq!(retrieved.max_salary, original.max_salary);
    assert_eq!(retrieved.average_salary, original.average_salary);
    assert_eq!(retrieved.sample_size, original.sample_size);
}

#[tokio::test]
async fn test_get_benchmarks_empty_title() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let benchmark = create_test_benchmark();
    manager.upsert_benchmark(&benchmark).await.unwrap();

    let results = manager.get_benchmarks_for_title("").await.unwrap();
    assert!(results.len() > 0);
}

#[tokio::test]
async fn test_multiple_data_sources_same_title_location() {
    let pool = setup_test_db().await;
    let manager = BenchmarkManager::new(pool.clone());

    let benchmark = create_test_benchmark();
    manager.upsert_benchmark(&benchmark).await.unwrap();
    manager.upsert_benchmark(&benchmark).await.unwrap();

    let row = sqlx::query("SELECT COUNT(*) as count FROM salary_benchmarks")
        .fetch_one(&pool)
        .await
        .unwrap();
    let count: i64 = row.try_get("count").unwrap();
    assert_eq!(count, 1);
}
