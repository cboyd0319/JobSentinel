//! Database operations for scoring configuration

use super::ScoringConfig;
use sqlx::SqlitePool;

/// Load scoring configuration from database
pub async fn load_scoring_config(pool: &SqlitePool) -> Result<ScoringConfig, String> {
    sqlx::query_as::<_, ScoringConfigRow>(
        "SELECT skills_weight, salary_weight, location_weight, company_weight, recency_weight
         FROM scoring_config WHERE id = 1",
    )
    .fetch_one(pool)
    .await
    .map(|row| ScoringConfig {
        skills_weight: row.skills_weight,
        salary_weight: row.salary_weight,
        location_weight: row.location_weight,
        company_weight: row.company_weight,
        recency_weight: row.recency_weight,
    })
    .map_err(|e| format!("Failed to load scoring config: {}", e))
}

/// Save scoring configuration to database
pub async fn save_scoring_config(pool: &SqlitePool, config: &ScoringConfig) -> Result<(), String> {
    // Validate before saving
    config.validate()?;

    sqlx::query(
        "UPDATE scoring_config
         SET skills_weight = ?, salary_weight = ?, location_weight = ?,
             company_weight = ?, recency_weight = ?, updated_at = datetime('now')
         WHERE id = 1",
    )
    .bind(config.skills_weight)
    .bind(config.salary_weight)
    .bind(config.location_weight)
    .bind(config.company_weight)
    .bind(config.recency_weight)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to save scoring config: {}", e))?;

    Ok(())
}

/// Reset scoring configuration to defaults
pub async fn reset_scoring_config(pool: &SqlitePool) -> Result<(), String> {
    let default_config = ScoringConfig::default();
    save_scoring_config(pool, &default_config).await
}

#[derive(sqlx::FromRow)]
struct ScoringConfigRow {
    skills_weight: f64,
    salary_weight: f64,
    location_weight: f64,
    company_weight: f64,
    recency_weight: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:")
            .await
            .expect("Failed to create in-memory database");

        // Run migration
        sqlx::query(
            "CREATE TABLE scoring_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                skills_weight REAL NOT NULL DEFAULT 0.40,
                salary_weight REAL NOT NULL DEFAULT 0.25,
                location_weight REAL NOT NULL DEFAULT 0.20,
                company_weight REAL NOT NULL DEFAULT 0.10,
                recency_weight REAL NOT NULL DEFAULT 0.05,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
        )
        .execute(&pool)
        .await
        .expect("Failed to create table");

        sqlx::query(
            "INSERT INTO scoring_config (id, skills_weight, salary_weight, location_weight, company_weight, recency_weight)
             VALUES (1, 0.40, 0.25, 0.20, 0.10, 0.05)"
        )
        .execute(&pool)
        .await
        .expect("Failed to insert defaults");

        pool
    }

    #[tokio::test]
    async fn test_load_default_config() {
        let pool = setup_test_db().await;
        let config = load_scoring_config(&pool).await.unwrap();

        assert_eq!(config.skills_weight, 0.40);
        assert_eq!(config.salary_weight, 0.25);
        assert_eq!(config.location_weight, 0.20);
        assert_eq!(config.company_weight, 0.10);
        assert_eq!(config.recency_weight, 0.05);
    }

    #[tokio::test]
    async fn test_save_and_load_config() {
        let pool = setup_test_db().await;

        let custom_config = ScoringConfig {
            skills_weight: 0.50,
            salary_weight: 0.20,
            location_weight: 0.15,
            company_weight: 0.10,
            recency_weight: 0.05,
        };

        save_scoring_config(&pool, &custom_config).await.unwrap();
        let loaded_config = load_scoring_config(&pool).await.unwrap();

        assert_eq!(loaded_config.skills_weight, 0.50);
        assert_eq!(loaded_config.salary_weight, 0.20);
        assert_eq!(loaded_config.location_weight, 0.15);
        assert_eq!(loaded_config.company_weight, 0.10);
        assert_eq!(loaded_config.recency_weight, 0.05);
    }

    #[tokio::test]
    async fn test_save_invalid_config() {
        let pool = setup_test_db().await;

        let invalid_config = ScoringConfig {
            skills_weight: 0.50,
            salary_weight: 0.30,
            location_weight: 0.30, // Sum > 1.0
            company_weight: 0.10,
            recency_weight: 0.05,
        };

        let result = save_scoring_config(&pool, &invalid_config).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_reset_config() {
        let pool = setup_test_db().await;

        // Save custom config
        let custom_config = ScoringConfig {
            skills_weight: 0.50,
            salary_weight: 0.20,
            location_weight: 0.15,
            company_weight: 0.10,
            recency_weight: 0.05,
        };
        save_scoring_config(&pool, &custom_config).await.unwrap();

        // Reset to defaults
        reset_scoring_config(&pool).await.unwrap();

        // Verify defaults
        let loaded_config = load_scoring_config(&pool).await.unwrap();
        assert_eq!(loaded_config.skills_weight, 0.40);
        assert_eq!(loaded_config.salary_weight, 0.25);
        assert_eq!(loaded_config.location_weight, 0.20);
        assert_eq!(loaded_config.company_weight, 0.10);
        assert_eq!(loaded_config.recency_weight, 0.05);
    }
}
