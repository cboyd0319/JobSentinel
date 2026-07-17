use crate::Database;
use chrono::Utc;
use sqlx::SqlitePool;

pub(crate) async fn migrated_pool() -> SqlitePool {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    database.pool().clone()
}

pub(crate) async fn insert_test_job(
    pool: &SqlitePool,
    hash: &str,
    title: &str,
    company: Option<&str>,
    location: Option<&str>,
    created_at: &str,
) {
    sqlx::query(
        r#"
        INSERT INTO jobs (
            hash, title, company, url, location, source,
            created_at, updated_at, last_seen
        )
        VALUES (?, ?, ?, ?, ?, 'test', ?, ?, ?)
        "#,
    )
    .bind(hash)
    .bind(title)
    .bind(company.unwrap_or_default())
    .bind(format!("https://example.com/{hash}"))
    .bind(location)
    .bind(created_at)
    .bind(created_at)
    .bind(created_at)
    .execute(pool)
    .await
    .unwrap();
}

pub(crate) async fn insert_current_test_jobs(
    pool: &SqlitePool,
    jobs: &[(&str, &str, &str, Option<&str>)],
) {
    let created_at = Utc::now().to_rfc3339();
    for (hash, title, company, location) in jobs {
        insert_test_job(pool, hash, title, Some(company), *location, &created_at).await;
    }
}

pub(crate) async fn insert_numbered_current_test_jobs(
    pool: &SqlitePool,
    count: usize,
    title: &str,
    company: &str,
    location: Option<&str>,
) {
    let created_at = Utc::now().to_rfc3339();
    for index in 1..=count {
        insert_test_job(
            pool,
            &format!("job{index}"),
            title,
            Some(company),
            location,
            &created_at,
        )
        .await;
    }
}
