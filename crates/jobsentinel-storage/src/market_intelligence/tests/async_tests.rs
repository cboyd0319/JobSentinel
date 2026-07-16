use super::*;
use sqlx::SqlitePool;

async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();

    // Create all required tables
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS jobs (
            hash TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            company TEXT,
            location TEXT,
            posted_at TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL,
            hidden INTEGER NOT NULL DEFAULT 0,
            status TEXT DEFAULT 'active'
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_skills (
            job_hash TEXT NOT NULL,
            skill_name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (job_hash, skill_name)
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS job_salary_predictions (
            job_hash TEXT PRIMARY KEY,
            predicted_median REAL NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS skill_demand_trends (
            skill_name TEXT NOT NULL,
            date TEXT NOT NULL,
            mention_count INTEGER NOT NULL,
            job_count INTEGER NOT NULL,
            avg_salary INTEGER,
            median_salary INTEGER,
            top_company TEXT,
            top_location TEXT,
            PRIMARY KEY (skill_name, date)
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS salary_benchmarks (
            job_title_normalized TEXT NOT NULL,
            location_normalized TEXT NOT NULL,
            min_salary INTEGER NOT NULL,
            p25_salary INTEGER NOT NULL,
            median_salary INTEGER NOT NULL,
            p75_salary INTEGER NOT NULL,
            max_salary INTEGER NOT NULL,
            average_salary INTEGER NOT NULL,
            sample_size INTEGER NOT NULL,
            PRIMARY KEY (job_title_normalized, location_normalized)
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS salary_trends (
            job_title_normalized TEXT NOT NULL,
            location_normalized TEXT NOT NULL,
            date TEXT NOT NULL,
            min_salary INTEGER NOT NULL,
            p25_salary INTEGER NOT NULL,
            median_salary INTEGER NOT NULL,
            p75_salary INTEGER NOT NULL,
            max_salary INTEGER NOT NULL,
            avg_salary INTEGER NOT NULL,
            sample_size INTEGER NOT NULL,
            salary_growth_pct REAL DEFAULT 0.0,
            PRIMARY KEY (job_title_normalized, location_normalized, date)
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS company_hiring_velocity (
            company_name TEXT NOT NULL,
            date TEXT NOT NULL,
            jobs_posted_count INTEGER NOT NULL,
            jobs_filled_count INTEGER DEFAULT 0,
            jobs_active_count INTEGER DEFAULT 0,
            avg_salary_offered INTEGER,
            top_role TEXT,
            top_location TEXT,
            is_actively_hiring INTEGER DEFAULT 0,
            hiring_trend TEXT DEFAULT 'stable',
            PRIMARY KEY (company_name, date)
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS location_job_density (
            location_normalized TEXT NOT NULL,
            city TEXT,
            state TEXT,
            date TEXT NOT NULL,
            job_count INTEGER NOT NULL,
            remote_job_count INTEGER DEFAULT 0,
            avg_salary INTEGER,
            median_salary INTEGER,
            top_skill TEXT,
            top_company TEXT,
            top_role TEXT,
            PRIMARY KEY (location_normalized, date)
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS role_demand_trends (
            job_title_normalized TEXT NOT NULL,
            date TEXT NOT NULL,
            job_count INTEGER NOT NULL,
            avg_salary INTEGER,
            median_salary INTEGER,
            top_company TEXT,
            top_location TEXT,
            remote_percentage REAL,
            demand_trend TEXT DEFAULT 'stable',
            PRIMARY KEY (job_title_normalized, date)
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS market_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            severity TEXT DEFAULT 'info',
            related_entity TEXT,
            related_entity_type TEXT,
            metric_value REAL,
            metric_change_pct REAL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            is_read INTEGER DEFAULT 0
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS market_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL UNIQUE,
            total_jobs INTEGER NOT NULL DEFAULT 0,
            new_jobs_today INTEGER NOT NULL DEFAULT 0,
            jobs_filled_today INTEGER NOT NULL DEFAULT 0,
            avg_salary INTEGER,
            median_salary INTEGER,
            remote_job_percentage REAL,
            top_skill TEXT,
            top_company TEXT,
            top_location TEXT,
            total_companies_hiring INTEGER,
            market_sentiment TEXT CHECK(market_sentiment IN ('bullish', 'neutral', 'bearish')),
            notes TEXT,
            created_at TIMESTAMP DEFAULT (datetime('now'))
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    pool
}

#[path = "async_tests/query_tests.rs"]
mod query_tests;
#[path = "async_tests/trend_compute_tests.rs"]
mod trend_compute_tests;
#[path = "async_tests/trend_edge_tests.rs"]
mod trend_edge_tests;
