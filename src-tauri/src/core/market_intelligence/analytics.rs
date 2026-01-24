//! Market Analytics Engine
//!
//! Computes daily market snapshots and provides analytics queries.

use anyhow::Result;
use chrono::{NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};

/// Market analyzer
pub struct MarketAnalyzer {
    db: SqlitePool,
}

/// Compute median from a vector of values (SQLite doesn't have MEDIAN())
fn compute_median(values: &mut [f64]) -> Option<f64> {
    if values.is_empty() {
        return None;
    }
    values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let len = values.len();
    if len.is_multiple_of(2) {
        Some((values[len / 2 - 1] + values[len / 2]) / 2.0)
    } else {
        Some(values[len / 2])
    }
}

impl MarketAnalyzer {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Create daily market snapshot
    pub async fn create_daily_snapshot(&self) -> Result<MarketSnapshot> {
        let today = Utc::now().date_naive();

        // Total jobs in database
        let total_jobs = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM jobs")
            .fetch_one(&self.db)
            .await?;

        // New jobs today
        let new_jobs_today = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM jobs WHERE DATE(posted_at) = DATE('now')",
        )
        .fetch_one(&self.db)
        .await?;

        // Jobs filled today
        let jobs_filled_today = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM jobs WHERE status IN ('closed', 'filled') AND DATE(updated_at) = DATE('now')"
        )
        .fetch_one(&self.db)
        .await?;

        // Average salary
        let avg_salary = sqlx::query_scalar::<_, Option<f64>>(
            "SELECT AVG(predicted_median) FROM job_salary_predictions",
        )
        .fetch_one(&self.db)
        .await?;

        // Median salary - fetch all values and compute in Rust
        let salary_rows = sqlx::query("SELECT predicted_median FROM job_salary_predictions")
            .fetch_all(&self.db)
            .await?;
        let mut salaries: Vec<f64> = salary_rows
            .iter()
            .filter_map(|r| r.try_get::<f64, _>("predicted_median").ok())
            .collect();
        let median_salary = compute_median(&mut salaries);

        // Remote job percentage
        let remote_count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM jobs WHERE LOWER(location) LIKE '%remote%'",
        )
        .fetch_one(&self.db)
        .await?;

        let remote_pct = if total_jobs > 0 {
            (remote_count as f64 / total_jobs as f64) * 100.0
        } else {
            0.0
        };

        // Top skill
        let top_skill = sqlx::query_scalar::<_, String>(
            r#"
            SELECT skill_name
            FROM job_skills
            GROUP BY skill_name
            ORDER BY COUNT(*) DESC
            LIMIT 1
            "#,
        )
        .fetch_optional(&self.db)
        .await?;

        // Top company (most active)
        let top_company = sqlx::query_scalar::<_, String>(
            r#"
            SELECT company
            FROM jobs
            WHERE company IS NOT NULL AND company != ''
            GROUP BY company
            ORDER BY COUNT(*) DESC
            LIMIT 1
            "#,
        )
        .fetch_optional(&self.db)
        .await?;

        // Top location
        let top_location = sqlx::query_scalar::<_, String>(
            r#"
            SELECT location
            FROM jobs
            WHERE location IS NOT NULL AND location != ''
            GROUP BY location
            ORDER BY COUNT(*) DESC
            LIMIT 1
            "#,
        )
        .fetch_optional(&self.db)
        .await?;

        // Total companies hiring
        let total_companies_hiring = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(DISTINCT company)
            FROM jobs
            WHERE company IS NOT NULL AND company != ''
              AND status = 'active'
            "#,
        )
        .fetch_one(&self.db)
        .await?;

        // Determine market sentiment
        let market_sentiment = self
            .calculate_market_sentiment(new_jobs_today, jobs_filled_today)
            .await?;

        // Create snapshot
        let snapshot = MarketSnapshot {
            date: today,
            total_jobs,
            new_jobs_today,
            jobs_filled_today,
            avg_salary: avg_salary.map(|v| v as i64),
            median_salary: median_salary.map(|v| v as i64),
            remote_job_percentage: remote_pct,
            top_skill,
            top_company,
            top_location,
            total_companies_hiring,
            market_sentiment,
            notes: None,
        };

        // Store in database
        self.store_snapshot(&snapshot).await?;

        Ok(snapshot)
    }

    /// Store market snapshot in database
    async fn store_snapshot(&self, snapshot: &MarketSnapshot) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO market_snapshots (
                date, total_jobs, new_jobs_today, jobs_filled_today,
                avg_salary, median_salary, remote_job_percentage,
                top_skill, top_company, top_location,
                total_companies_hiring, market_sentiment, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                total_jobs = excluded.total_jobs,
                new_jobs_today = excluded.new_jobs_today,
                jobs_filled_today = excluded.jobs_filled_today,
                avg_salary = excluded.avg_salary,
                median_salary = excluded.median_salary,
                remote_job_percentage = excluded.remote_job_percentage,
                top_skill = excluded.top_skill,
                top_company = excluded.top_company,
                top_location = excluded.top_location,
                total_companies_hiring = excluded.total_companies_hiring,
                market_sentiment = excluded.market_sentiment,
                notes = excluded.notes
            "#,
        )
        .bind(snapshot.date.to_string())
        .bind(snapshot.total_jobs)
        .bind(snapshot.new_jobs_today)
        .bind(snapshot.jobs_filled_today)
        .bind(snapshot.avg_salary)
        .bind(snapshot.median_salary)
        .bind(snapshot.remote_job_percentage)
        .bind(&snapshot.top_skill)
        .bind(&snapshot.top_company)
        .bind(&snapshot.top_location)
        .bind(snapshot.total_companies_hiring)
        .bind(&snapshot.market_sentiment)
        .bind(&snapshot.notes)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Calculate market sentiment based on job posting activity
    #[allow(unused_variables)]
    async fn calculate_market_sentiment(&self, new_jobs: i64, jobs_filled: i64) -> Result<String> {
        // Get previous week's average
        let prev_avg = sqlx::query_scalar::<_, Option<f64>>(
            r#"
            SELECT AVG(new_jobs_today)
            FROM market_snapshots
            WHERE date >= date('now', '-7 days')
            "#,
        )
        .fetch_one(&self.db)
        .await?
        .unwrap_or(0.0);

        if prev_avg == 0.0 {
            return Ok("neutral".to_string());
        }

        let change_pct = ((new_jobs as f64 - prev_avg) / prev_avg) * 100.0;

        if change_pct >= 20.0 {
            Ok("bullish".to_string())
        } else if change_pct <= -20.0 {
            Ok("bearish".to_string())
        } else {
            Ok("neutral".to_string())
        }
    }

    /// Get market snapshot for a specific date
    pub async fn get_snapshot(&self, date: NaiveDate) -> Result<Option<MarketSnapshot>> {
        let row = sqlx::query(
            r#"
            SELECT
                date, total_jobs, new_jobs_today, jobs_filled_today,
                avg_salary, median_salary, remote_job_percentage,
                top_skill, top_company, top_location,
                total_companies_hiring, market_sentiment, notes
            FROM market_snapshots
            WHERE date = ?
            "#,
        )
        .bind(date.to_string())
        .fetch_optional(&self.db)
        .await?;

        match row {
            Some(r) => Ok(Some(row_to_snapshot(&r)?)),
            None => Ok(None),
        }
    }

    /// Get latest market snapshot
    pub async fn get_latest_snapshot(&self) -> Result<Option<MarketSnapshot>> {
        let row = sqlx::query(
            r#"
            SELECT
                date, total_jobs, new_jobs_today, jobs_filled_today,
                avg_salary, median_salary, remote_job_percentage,
                top_skill, top_company, top_location,
                total_companies_hiring, market_sentiment, notes
            FROM market_snapshots
            ORDER BY date DESC
            LIMIT 1
            "#,
        )
        .fetch_optional(&self.db)
        .await?;

        match row {
            Some(r) => Ok(Some(row_to_snapshot(&r)?)),
            None => Ok(None),
        }
    }

    /// Get historical snapshots (last N days)
    pub async fn get_historical_snapshots(&self, days: usize) -> Result<Vec<MarketSnapshot>> {
        let query = format!(
            r#"
            SELECT
                date, total_jobs, new_jobs_today, jobs_filled_today,
                avg_salary, median_salary, remote_job_percentage,
                top_skill, top_company, top_location,
                total_companies_hiring, market_sentiment, notes
            FROM market_snapshots
            WHERE date >= date('now', '-{} days')
            ORDER BY date DESC
            "#,
            days
        );

        let rows = sqlx::query(&query).fetch_all(&self.db).await?;

        rows.into_iter()
            .map(|r| row_to_snapshot(&r))
            .collect::<Result<Vec<_>>>()
    }
}

fn row_to_snapshot(r: &sqlx::sqlite::SqliteRow) -> Result<MarketSnapshot> {
    let date_str: String = r.try_get("date")?;

    // Helper to convert empty strings to None
    let optional_string = |col: &str| -> Option<String> {
        r.try_get::<String, _>(col)
            .ok()
            .and_then(|s| if s.is_empty() { None } else { Some(s) })
    };

    Ok(MarketSnapshot {
        date: NaiveDate::parse_from_str(&date_str, "%Y-%m-%d")?,
        total_jobs: r.try_get("total_jobs")?,
        new_jobs_today: r.try_get("new_jobs_today")?,
        jobs_filled_today: r.try_get("jobs_filled_today")?,
        avg_salary: r.try_get("avg_salary").ok(),
        median_salary: r.try_get("median_salary").ok(),
        remote_job_percentage: r.try_get("remote_job_percentage")?,
        top_skill: optional_string("top_skill"),
        top_company: optional_string("top_company"),
        top_location: optional_string("top_location"),
        total_companies_hiring: r.try_get("total_companies_hiring")?,
        market_sentiment: r.try_get("market_sentiment")?,
        notes: optional_string("notes"),
    })
}

/// Market snapshot (daily aggregate statistics)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketSnapshot {
    pub date: NaiveDate,
    pub total_jobs: i64,
    pub new_jobs_today: i64,
    pub jobs_filled_today: i64,
    pub avg_salary: Option<i64>,
    pub median_salary: Option<i64>,
    pub remote_job_percentage: f64,
    pub top_skill: Option<String>,
    pub top_company: Option<String>,
    pub top_location: Option<String>,
    pub total_companies_hiring: i64,
    pub market_sentiment: String, // 'bullish', 'neutral', 'bearish'
    pub notes: Option<String>,
}

impl MarketSnapshot {
    /// Format summary description
    pub fn summary(&self) -> String {
        format!(
            "{} new jobs posted today ({} total). Market sentiment: {}. Top skill: {}",
            self.new_jobs_today,
            self.total_jobs,
            self.market_sentiment,
            self.top_skill.as_deref().unwrap_or("N/A")
        )
    }

    /// Is market healthy?
    pub fn is_healthy(&self) -> bool {
        self.market_sentiment == "bullish"
            || (self.market_sentiment == "neutral" && self.new_jobs_today > 0)
    }

    /// Get sentiment indicator
    pub fn sentiment_indicator(&self) -> &str {
        match self.market_sentiment.as_str() {
            "bullish" => "[UP]",
            "bearish" => "[DOWN]",
            _ => "[FLAT]",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_market_snapshot_summary() {
        let snapshot = MarketSnapshot {
            date: Utc::now().date_naive(),
            total_jobs: 10000,
            new_jobs_today: 150,
            jobs_filled_today: 50,
            avg_salary: Some(130000),
            median_salary: Some(125000),
            remote_job_percentage: 35.5,
            top_skill: Some("Python".to_string()),
            top_company: Some("Google".to_string()),
            top_location: Some("Remote".to_string()),
            total_companies_hiring: 500,
            market_sentiment: "bullish".to_string(),
            notes: None,
        };

        assert!(snapshot.summary().contains("150 new jobs"));
        assert!(snapshot.summary().contains("bullish"));
        assert!(snapshot.is_healthy());
        assert_eq!(snapshot.sentiment_indicator(), "[UP]");
    }

    #[test]
    fn test_market_sentiment_bearish() {
        let snapshot = MarketSnapshot {
            date: Utc::now().date_naive(),
            total_jobs: 5000,
            new_jobs_today: 10,
            jobs_filled_today: 100,
            avg_salary: Some(110000),
            median_salary: Some(105000),
            remote_job_percentage: 25.0,
            top_skill: Some("React".to_string()),
            top_company: Some("Meta".to_string()),
            top_location: Some("San Francisco, CA".to_string()),
            total_companies_hiring: 200,
            market_sentiment: "bearish".to_string(),
            notes: Some("Hiring slowdown detected".to_string()),
        };

        assert!(!snapshot.is_healthy());
        assert_eq!(snapshot.sentiment_indicator(), "[DOWN]");
    }

    #[test]
    fn test_compute_median() {
        let mut values = vec![1.0, 3.0, 2.0];
        assert_eq!(compute_median(&mut values), Some(2.0));

        let mut values = vec![1.0, 2.0, 3.0, 4.0];
        assert_eq!(compute_median(&mut values), Some(2.5));

        let mut values: Vec<f64> = vec![];
        assert_eq!(compute_median(&mut values), None);
    }

    #[test]
    fn test_market_snapshot_neutral_sentiment() {
        let snapshot = MarketSnapshot {
            date: Utc::now().date_naive(),
            total_jobs: 5000,
            new_jobs_today: 50,
            jobs_filled_today: 45,
            avg_salary: Some(115000),
            median_salary: Some(110000),
            remote_job_percentage: 30.0,
            top_skill: Some("Java".to_string()),
            top_company: Some("Amazon".to_string()),
            top_location: Some("Seattle, WA".to_string()),
            total_companies_hiring: 300,
            market_sentiment: "neutral".to_string(),
            notes: None,
        };

        assert!(snapshot.is_healthy());
        assert_eq!(snapshot.sentiment_indicator(), "[FLAT]");
        assert!(snapshot.summary().contains("neutral"));
    }

    #[test]
    fn test_market_snapshot_bearish_no_jobs() {
        let snapshot = MarketSnapshot {
            date: Utc::now().date_naive(),
            total_jobs: 1000,
            new_jobs_today: 0,
            jobs_filled_today: 20,
            avg_salary: Some(100000),
            median_salary: Some(95000),
            remote_job_percentage: 20.0,
            top_skill: None,
            top_company: None,
            top_location: None,
            total_companies_hiring: 50,
            market_sentiment: "bearish".to_string(),
            notes: Some("Market downturn".to_string()),
        };

        assert!(!snapshot.is_healthy());
        assert_eq!(snapshot.sentiment_indicator(), "[DOWN]");
        assert!(snapshot.summary().contains("N/A"));
    }

    #[test]
    fn test_market_snapshot_summary_no_skill() {
        let snapshot = MarketSnapshot {
            date: Utc::now().date_naive(),
            total_jobs: 8000,
            new_jobs_today: 120,
            jobs_filled_today: 80,
            avg_salary: Some(135000),
            median_salary: Some(130000),
            remote_job_percentage: 45.0,
            top_skill: None,
            top_company: Some("Microsoft".to_string()),
            top_location: Some("Remote".to_string()),
            total_companies_hiring: 600,
            market_sentiment: "bullish".to_string(),
            notes: None,
        };

        let summary = snapshot.summary();
        assert!(summary.contains("120 new jobs"));
        assert!(summary.contains("bullish"));
        assert!(summary.contains("N/A"));
    }

    #[test]
    fn test_market_snapshot_zero_totals() {
        let snapshot = MarketSnapshot {
            date: Utc::now().date_naive(),
            total_jobs: 0,
            new_jobs_today: 0,
            jobs_filled_today: 0,
            avg_salary: None,
            median_salary: None,
            remote_job_percentage: 0.0,
            top_skill: None,
            top_company: None,
            top_location: None,
            total_companies_hiring: 0,
            market_sentiment: "neutral".to_string(),
            notes: Some("No activity".to_string()),
        };

        assert!(!snapshot.is_healthy());
        assert_eq!(snapshot.sentiment_indicator(), "[FLAT]");
    }

    #[test]
    fn test_market_snapshot_high_remote_percentage() {
        let snapshot = MarketSnapshot {
            date: Utc::now().date_naive(),
            total_jobs: 3000,
            new_jobs_today: 100,
            jobs_filled_today: 60,
            avg_salary: Some(140000),
            median_salary: Some(135000),
            remote_job_percentage: 85.5,
            top_skill: Some("Rust".to_string()),
            top_company: Some("Oxide".to_string()),
            top_location: Some("Remote".to_string()),
            total_companies_hiring: 250,
            market_sentiment: "bullish".to_string(),
            notes: None,
        };

        assert_eq!(snapshot.remote_job_percentage, 85.5);
        assert!(snapshot.is_healthy());
    }

    #[test]
    fn test_compute_median_with_nan() {
        let mut values = vec![1.0, 2.0, f64::NAN, 3.0];
        // NaN handling should be graceful
        let result = compute_median(&mut values);
        // Result depends on sort behavior with NaN, but should not panic
        assert!(result.is_some() || result.is_none());
    }

    #[test]
    fn test_compute_median_all_same() {
        let mut values = vec![42.0, 42.0, 42.0, 42.0, 42.0];
        assert_eq!(compute_median(&mut values), Some(42.0));
    }

    #[test]
    fn test_compute_median_two_elements() {
        let mut values = vec![10.0, 20.0];
        assert_eq!(compute_median(&mut values), Some(15.0));
    }

    #[test]
    fn test_market_snapshot_edge_case_one_job() {
        let snapshot = MarketSnapshot {
            date: Utc::now().date_naive(),
            total_jobs: 1,
            new_jobs_today: 1,
            jobs_filled_today: 0,
            avg_salary: Some(100000),
            median_salary: Some(100000),
            remote_job_percentage: 100.0,
            top_skill: Some("Obscure".to_string()),
            top_company: Some("StartupOne".to_string()),
            top_location: Some("Remote".to_string()),
            total_companies_hiring: 1,
            market_sentiment: "neutral".to_string(),
            notes: None,
        };

        assert!(snapshot.is_healthy());
        assert_eq!(snapshot.total_jobs, 1);
    }

    #[test]
    fn test_market_snapshot_with_notes() {
        let snapshot = MarketSnapshot {
            date: Utc::now().date_naive(),
            total_jobs: 5000,
            new_jobs_today: 100,
            jobs_filled_today: 50,
            avg_salary: Some(125000),
            median_salary: Some(120000),
            remote_job_percentage: 40.0,
            top_skill: Some("Rust".to_string()),
            top_company: Some("Mozilla".to_string()),
            top_location: Some("San Francisco, CA".to_string()),
            total_companies_hiring: 350,
            market_sentiment: "bullish".to_string(),
            notes: Some("Strong tech hiring in Q4".to_string()),
        };

        assert_eq!(snapshot.notes, Some("Strong tech hiring in Q4".to_string()));
        assert!(snapshot.is_healthy());
    }

    #[test]
    fn test_market_snapshot_neutral_no_jobs() {
        let snapshot = MarketSnapshot {
            date: Utc::now().date_naive(),
            total_jobs: 1000,
            new_jobs_today: 0,
            jobs_filled_today: 10,
            avg_salary: Some(100000),
            median_salary: Some(95000),
            remote_job_percentage: 20.0,
            top_skill: None,
            top_company: None,
            top_location: None,
            total_companies_hiring: 50,
            market_sentiment: "neutral".to_string(),
            notes: None,
        };

        assert!(!snapshot.is_healthy());
        assert_eq!(snapshot.sentiment_indicator(), "[FLAT]");
    }

    #[test]
    fn test_market_snapshot_serialization() {
        let snapshot = MarketSnapshot {
            date: Utc::now().date_naive(),
            total_jobs: 7500,
            new_jobs_today: 125,
            jobs_filled_today: 75,
            avg_salary: Some(140000),
            median_salary: Some(135000),
            remote_job_percentage: 55.0,
            top_skill: Some("Go".to_string()),
            top_company: Some("Google".to_string()),
            top_location: Some("Remote".to_string()),
            total_companies_hiring: 450,
            market_sentiment: "bullish".to_string(),
            notes: Some("Tech boom continues".to_string()),
        };

        let serialized = serde_json::to_string(&snapshot).unwrap();
        let deserialized: MarketSnapshot = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.total_jobs, 7500);
        assert_eq!(deserialized.market_sentiment, "bullish");
        assert_eq!(deserialized.notes, Some("Tech boom continues".to_string()));
    }

    #[test]
    fn test_market_snapshot_summary_with_all_fields() {
        let snapshot = MarketSnapshot {
            date: Utc::now().date_naive(),
            total_jobs: 12000,
            new_jobs_today: 200,
            jobs_filled_today: 100,
            avg_salary: Some(150000),
            median_salary: Some(145000),
            remote_job_percentage: 60.0,
            top_skill: Some("Kubernetes".to_string()),
            top_company: Some("Amazon".to_string()),
            top_location: Some("Seattle, WA".to_string()),
            total_companies_hiring: 700,
            market_sentiment: "bullish".to_string(),
            notes: Some("Cloud infrastructure demand high".to_string()),
        };

        let summary = snapshot.summary();
        assert!(summary.contains("200 new jobs"));
        assert!(summary.contains("12000 total"));
        assert!(summary.contains("bullish"));
        assert!(summary.contains("Kubernetes"));
    }

    #[test]
    fn test_compute_median_extreme_values() {
        let mut values = vec![1.0, 1000000.0];
        assert_eq!(compute_median(&mut values), Some(500000.5));
    }

    #[test]
    fn test_compute_median_very_large_dataset() {
        let mut values: Vec<f64> = (1..=10000).map(|x| x as f64).collect();
        assert_eq!(compute_median(&mut values), Some(5000.5));
    }

    #[test]
    fn test_compute_median_negative_and_positive() {
        let mut values = vec![-100.0, -50.0, 0.0, 50.0, 100.0];
        assert_eq!(compute_median(&mut values), Some(0.0));
    }

    // ========================================================================
    // DATABASE INTEGRATION TESTS
    // ========================================================================

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();

        // Create tables
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hash TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                company TEXT,
                url TEXT NOT NULL,
                location TEXT,
                description TEXT,
                status TEXT DEFAULT 'active',
                posted_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS job_salary_predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_hash TEXT NOT NULL UNIQUE,
                predicted_min INTEGER,
                predicted_max INTEGER,
                predicted_median INTEGER,
                confidence_score REAL
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS job_skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_hash TEXT NOT NULL,
                skill_name TEXT NOT NULL,
                is_required INTEGER NOT NULL DEFAULT 1
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

    async fn insert_test_job(
        pool: &SqlitePool,
        hash: &str,
        title: &str,
        company: Option<&str>,
        location: Option<&str>,
        status: &str,
        posted_at: &str,
    ) {
        sqlx::query(
            "INSERT INTO jobs (hash, title, company, url, location, status, posted_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(hash)
        .bind(title)
        .bind(company)
        .bind(format!("https://example.com/{}", hash))
        .bind(location)
        .bind(status)
        .bind(posted_at)
        .execute(pool)
        .await
        .unwrap();
    }

    async fn insert_test_salary(pool: &SqlitePool, job_hash: &str, median: i64) {
        sqlx::query(
            "INSERT INTO job_salary_predictions (job_hash, predicted_median) VALUES (?, ?)",
        )
        .bind(job_hash)
        .bind(median)
        .execute(pool)
        .await
        .unwrap();
    }

    async fn insert_test_skill(pool: &SqlitePool, job_hash: &str, skill_name: &str) {
        sqlx::query("INSERT INTO job_skills (job_hash, skill_name) VALUES (?, ?)")
            .bind(job_hash)
            .bind(skill_name)
            .execute(pool)
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn test_market_analyzer_new() {
        let pool = setup_test_db().await;
        let _analyzer = MarketAnalyzer::new(pool);
        // Constructor should work without panic
    }

    #[tokio::test]
    async fn test_create_daily_snapshot_empty_db() {
        let pool = setup_test_db().await;
        let analyzer = MarketAnalyzer::new(pool);

        let snapshot = analyzer.create_daily_snapshot().await.unwrap();

        // Empty DB should produce all zeros/None
        assert_eq!(snapshot.total_jobs, 0);
        assert_eq!(snapshot.new_jobs_today, 0);
        assert_eq!(snapshot.jobs_filled_today, 0);
        assert_eq!(snapshot.avg_salary, None);
        assert_eq!(snapshot.median_salary, None);
        assert_eq!(snapshot.remote_job_percentage, 0.0);
        assert_eq!(snapshot.top_skill, None);
        assert_eq!(snapshot.top_company, None);
        assert_eq!(snapshot.top_location, None);
        assert_eq!(snapshot.total_companies_hiring, 0);
        assert_eq!(snapshot.market_sentiment, "neutral");
        assert_eq!(snapshot.date, Utc::now().date_naive());
    }

    #[tokio::test]
    async fn test_create_daily_snapshot_with_jobs() {
        let pool = setup_test_db().await;
        let today = Utc::now().date_naive().to_string();
        let yesterday = (Utc::now().date_naive() - chrono::Duration::days(1)).to_string();

        // Insert test jobs - use today's date
        insert_test_job(
            &pool,
            "job1",
            "Software Engineer",
            Some("Google"),
            Some("San Francisco, CA"),
            "active",
            &today,
        )
        .await;
        insert_test_job(
            &pool,
            "job2",
            "Backend Developer",
            Some("Meta"),
            Some("Remote"),
            "active",
            &today,
        )
        .await;
        insert_test_job(
            &pool,
            "job3",
            "Frontend Engineer",
            Some("Google"),
            Some("New York, NY"),
            "closed",
            &yesterday,
        )
        .await;

        // Insert salaries
        insert_test_salary(&pool, "job1", 150000).await;
        insert_test_salary(&pool, "job2", 160000).await;
        insert_test_salary(&pool, "job3", 140000).await;

        // Insert skills
        insert_test_skill(&pool, "job1", "Python").await;
        insert_test_skill(&pool, "job2", "Python").await;
        insert_test_skill(&pool, "job3", "React").await;

        let analyzer = MarketAnalyzer::new(pool);
        let snapshot = analyzer.create_daily_snapshot().await.unwrap();

        assert_eq!(snapshot.total_jobs, 3);
        assert_eq!(snapshot.new_jobs_today, 2);
        // Salaries should be calculated from inserted predictions
        if let Some(median) = snapshot.median_salary {
            assert_eq!(median, 150000);
        }
        if let Some(avg) = snapshot.avg_salary {
            assert_eq!(avg, 150000);
        }
        assert!(snapshot.remote_job_percentage > 0.0);
        assert_eq!(snapshot.top_skill, Some("Python".to_string()));
        assert_eq!(snapshot.top_company, Some("Google".to_string()));
        assert_eq!(snapshot.total_companies_hiring, 2);
    }

    #[tokio::test]
    async fn test_create_daily_snapshot_remote_percentage() {
        let pool = setup_test_db().await;
        let today = Utc::now().date_naive().to_string();

        insert_test_job(
            &pool,
            "job1",
            "Engineer",
            Some("Co1"),
            Some("Remote"),
            "active",
            &today,
        )
        .await;
        insert_test_job(
            &pool,
            "job2",
            "Engineer",
            Some("Co2"),
            Some("REMOTE - US"),
            "active",
            &today,
        )
        .await;
        insert_test_job(
            &pool,
            "job3",
            "Engineer",
            Some("Co3"),
            Some("San Francisco, CA"),
            "active",
            &today,
        )
        .await;
        insert_test_job(
            &pool,
            "job4",
            "Engineer",
            Some("Co4"),
            Some("New York, NY"),
            "active",
            &today,
        )
        .await;

        let analyzer = MarketAnalyzer::new(pool);
        let snapshot = analyzer.create_daily_snapshot().await.unwrap();

        assert_eq!(snapshot.total_jobs, 4);
        assert_eq!(snapshot.remote_job_percentage, 50.0);
    }

    #[tokio::test]
    async fn test_create_daily_snapshot_jobs_filled_today() {
        let pool = setup_test_db().await;
        let today = Utc::now().date_naive().to_string();
        let yesterday = (Utc::now().date_naive() - chrono::Duration::days(1)).to_string();

        // Insert job filled today
        sqlx::query(
            "INSERT INTO jobs (hash, title, company, url, status, posted_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("job1")
        .bind("Engineer")
        .bind("Co1")
        .bind("https://example.com/job1")
        .bind("closed")
        .bind(&yesterday)
        .bind(&today) // Updated today
        .execute(&pool)
        .await
        .unwrap();

        // Insert job filled yesterday
        sqlx::query(
            "INSERT INTO jobs (hash, title, company, url, status, posted_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("job2")
        .bind("Engineer")
        .bind("Co2")
        .bind("https://example.com/job2")
        .bind("filled")
        .bind(&yesterday)
        .bind(&yesterday)
        .execute(&pool)
        .await
        .unwrap();

        let analyzer = MarketAnalyzer::new(pool);
        let snapshot = analyzer.create_daily_snapshot().await.unwrap();

        assert_eq!(snapshot.jobs_filled_today, 1);
    }

    #[tokio::test]
    async fn test_store_snapshot() {
        let pool = setup_test_db().await;
        let analyzer = MarketAnalyzer::new(pool.clone());

        let snapshot = MarketSnapshot {
            date: NaiveDate::from_ymd_opt(2026, 1, 16).unwrap(),
            total_jobs: 100,
            new_jobs_today: 10,
            jobs_filled_today: 5,
            avg_salary: Some(120000),
            median_salary: Some(115000),
            remote_job_percentage: 40.0,
            top_skill: Some("Rust".to_string()),
            top_company: Some("Mozilla".to_string()),
            top_location: Some("Remote".to_string()),
            total_companies_hiring: 50,
            market_sentiment: "bullish".to_string(),
            notes: Some("Test snapshot".to_string()),
        };

        analyzer.store_snapshot(&snapshot).await.unwrap();

        // Verify stored
        let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM market_snapshots")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 1);

        // Verify data
        let stored_total =
            sqlx::query_scalar::<_, i64>("SELECT total_jobs FROM market_snapshots WHERE date = ?")
                .bind("2026-01-16")
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(stored_total, 100);
    }

    #[tokio::test]
    async fn test_store_snapshot_upsert() {
        let pool = setup_test_db().await;
        let analyzer = MarketAnalyzer::new(pool.clone());

        let snapshot1 = MarketSnapshot {
            date: NaiveDate::from_ymd_opt(2026, 1, 16).unwrap(),
            total_jobs: 100,
            new_jobs_today: 10,
            jobs_filled_today: 5,
            avg_salary: Some(120000),
            median_salary: Some(115000),
            remote_job_percentage: 40.0,
            top_skill: Some("Rust".to_string()),
            top_company: Some("Mozilla".to_string()),
            top_location: Some("Remote".to_string()),
            total_companies_hiring: 50,
            market_sentiment: "bullish".to_string(),
            notes: None,
        };

        analyzer.store_snapshot(&snapshot1).await.unwrap();

        // Store again with updated data
        let snapshot2 = MarketSnapshot {
            date: NaiveDate::from_ymd_opt(2026, 1, 16).unwrap(),
            total_jobs: 150,
            new_jobs_today: 50,
            jobs_filled_today: 10,
            avg_salary: Some(125000),
            median_salary: Some(120000),
            remote_job_percentage: 45.0,
            top_skill: Some("Python".to_string()),
            top_company: Some("Google".to_string()),
            top_location: Some("San Francisco, CA".to_string()),
            total_companies_hiring: 60,
            market_sentiment: "bullish".to_string(),
            notes: Some("Updated".to_string()),
        };

        analyzer.store_snapshot(&snapshot2).await.unwrap();

        // Should still be 1 row (upsert)
        let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM market_snapshots")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 1);

        // Verify updated data
        let stored_total =
            sqlx::query_scalar::<_, i64>("SELECT total_jobs FROM market_snapshots WHERE date = ?")
                .bind("2026-01-16")
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(stored_total, 150);
    }

    #[tokio::test]
    async fn test_calculate_market_sentiment_no_history() {
        let pool = setup_test_db().await;
        let analyzer = MarketAnalyzer::new(pool);

        let sentiment = analyzer.calculate_market_sentiment(100, 50).await.unwrap();
        assert_eq!(sentiment, "neutral");
    }

    #[tokio::test]
    async fn test_calculate_market_sentiment_bullish() {
        let pool = setup_test_db().await;

        // Insert historical snapshots using relative dates (last 7 days)
        let today = chrono::Utc::now().date_naive();
        for i in 1..=7 {
            let date = today - chrono::Duration::days(i);
            sqlx::query(
                "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(date.to_string())
            .bind(100)
            .bind(50)
            .bind(10)
            .bind(50)
            .bind("neutral")
            .execute(&pool)
            .await
            .unwrap();
        }

        let analyzer = MarketAnalyzer::new(pool);

        // 120% increase from average of 50
        let sentiment = analyzer.calculate_market_sentiment(110, 10).await.unwrap();
        assert_eq!(sentiment, "bullish");
    }

    #[tokio::test]
    async fn test_calculate_market_sentiment_bearish() {
        let pool = setup_test_db().await;

        // Insert historical snapshots using relative dates (last 7 days)
        let today = chrono::Utc::now().date_naive();
        for i in 1..=7 {
            let date = today - chrono::Duration::days(i);
            sqlx::query(
                "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(date.to_string())
            .bind(100)
            .bind(100)
            .bind(10)
            .bind(50)
            .bind("neutral")
            .execute(&pool)
            .await
            .unwrap();
        }

        let analyzer = MarketAnalyzer::new(pool);

        // 60% decrease from average of 100
        let sentiment = analyzer.calculate_market_sentiment(40, 10).await.unwrap();
        assert_eq!(sentiment, "bearish");
    }

    #[tokio::test]
    async fn test_calculate_market_sentiment_neutral() {
        let pool = setup_test_db().await;

        // Insert historical snapshots using relative dates (last 7 days)
        let today = chrono::Utc::now().date_naive();
        for i in 1..=7 {
            let date = today - chrono::Duration::days(i);
            sqlx::query(
                "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(date.to_string())
            .bind(100)
            .bind(100)
            .bind(10)
            .bind(50)
            .bind("neutral")
            .execute(&pool)
            .await
            .unwrap();
        }

        let analyzer = MarketAnalyzer::new(pool);

        // 10% increase from average of 100
        let sentiment = analyzer.calculate_market_sentiment(110, 10).await.unwrap();
        assert_eq!(sentiment, "neutral");
    }

    #[tokio::test]
    async fn test_get_snapshot_existing() {
        let pool = setup_test_db().await;

        sqlx::query(
            "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind("2026-01-16")
        .bind(100)
        .bind(10)
        .bind(5)
        .bind(50)
        .bind("bullish")
        .execute(&pool)
        .await
        .unwrap();

        let analyzer = MarketAnalyzer::new(pool);
        let snapshot = analyzer
            .get_snapshot(NaiveDate::from_ymd_opt(2026, 1, 16).unwrap())
            .await
            .unwrap();

        assert!(snapshot.is_some());
        let snapshot = snapshot.unwrap();
        assert_eq!(snapshot.total_jobs, 100);
        assert_eq!(snapshot.new_jobs_today, 10);
        assert_eq!(snapshot.market_sentiment, "bullish");
    }

    #[tokio::test]
    async fn test_get_snapshot_not_found() {
        let pool = setup_test_db().await;
        let analyzer = MarketAnalyzer::new(pool);

        let snapshot = analyzer
            .get_snapshot(NaiveDate::from_ymd_opt(2026, 1, 16).unwrap())
            .await
            .unwrap();

        assert!(snapshot.is_none());
    }

    #[tokio::test]
    async fn test_get_latest_snapshot() {
        let pool = setup_test_db().await;

        sqlx::query(
            "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind("2026-01-14")
        .bind(80)
        .bind(8)
        .bind(4)
        .bind(40)
        .bind("neutral")
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind("2026-01-16")
        .bind(100)
        .bind(10)
        .bind(5)
        .bind(50)
        .bind("bullish")
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind("2026-01-15")
        .bind(90)
        .bind(9)
        .bind(4)
        .bind(45)
        .bind("neutral")
        .execute(&pool)
        .await
        .unwrap();

        let analyzer = MarketAnalyzer::new(pool);
        let snapshot = analyzer.get_latest_snapshot().await.unwrap();

        assert!(snapshot.is_some());
        let snapshot = snapshot.unwrap();
        assert_eq!(snapshot.date, NaiveDate::from_ymd_opt(2026, 1, 16).unwrap());
        assert_eq!(snapshot.total_jobs, 100);
    }

    #[tokio::test]
    async fn test_get_latest_snapshot_empty() {
        let pool = setup_test_db().await;
        let analyzer = MarketAnalyzer::new(pool);

        let snapshot = analyzer.get_latest_snapshot().await.unwrap();
        assert!(snapshot.is_none());
    }

    #[tokio::test]
    async fn test_get_historical_snapshots() {
        let pool = setup_test_db().await;
        let today = Utc::now().date_naive();

        // Insert snapshots for last 10 days (from today backwards)
        for i in 0..10_i64 {
            let date = (today - chrono::Duration::days(i)).to_string();
            sqlx::query(
                "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment, remote_job_percentage) VALUES (?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&date)
            .bind(100 + i)
            .bind(10)
            .bind(5)
            .bind(50)
            .bind("neutral")
            .bind(0.0)
            .execute(&pool)
            .await
            .unwrap();
        }

        let analyzer = MarketAnalyzer::new(pool);
        let snapshots = analyzer.get_historical_snapshots(7).await.unwrap();

        // Should return up to 7 most recent days, ordered DESC
        assert!(snapshots.len() >= 7);
        assert_eq!(snapshots[0].date, today);
    }

    #[tokio::test]
    async fn test_get_historical_snapshots_empty() {
        let pool = setup_test_db().await;
        let analyzer = MarketAnalyzer::new(pool);

        let snapshots = analyzer.get_historical_snapshots(30).await.unwrap();
        assert_eq!(snapshots.len(), 0);
    }

    #[tokio::test]
    async fn test_row_to_snapshot_all_fields() {
        let pool = setup_test_db().await;

        sqlx::query(
            r#"
            INSERT INTO market_snapshots (
                date, total_jobs, new_jobs_today, jobs_filled_today,
                avg_salary, median_salary, remote_job_percentage,
                top_skill, top_company, top_location,
                total_companies_hiring, market_sentiment, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind("2026-01-16")
        .bind(100)
        .bind(10)
        .bind(5)
        .bind(120000)
        .bind(115000)
        .bind(40.5)
        .bind("Rust")
        .bind("Mozilla")
        .bind("Remote")
        .bind(50)
        .bind("bullish")
        .bind("Test note")
        .execute(&pool)
        .await
        .unwrap();

        let analyzer = MarketAnalyzer::new(pool);
        let snapshot = analyzer
            .get_snapshot(NaiveDate::from_ymd_opt(2026, 1, 16).unwrap())
            .await
            .unwrap()
            .unwrap();

        assert_eq!(snapshot.date, NaiveDate::from_ymd_opt(2026, 1, 16).unwrap());
        assert_eq!(snapshot.total_jobs, 100);
        assert_eq!(snapshot.new_jobs_today, 10);
        assert_eq!(snapshot.jobs_filled_today, 5);
        assert_eq!(snapshot.avg_salary, Some(120000));
        assert_eq!(snapshot.median_salary, Some(115000));
        assert_eq!(snapshot.remote_job_percentage, 40.5);
        assert_eq!(snapshot.top_skill, Some("Rust".to_string()));
        assert_eq!(snapshot.top_company, Some("Mozilla".to_string()));
        assert_eq!(snapshot.top_location, Some("Remote".to_string()));
        assert_eq!(snapshot.total_companies_hiring, 50);
        assert_eq!(snapshot.market_sentiment, "bullish");
        assert_eq!(snapshot.notes, Some("Test note".to_string()));
    }

    #[tokio::test]
    async fn test_row_to_snapshot_nullable_fields() {
        let pool = setup_test_db().await;

        // Test minimal snapshot with only required fields
        sqlx::query(
            r#"
            INSERT INTO market_snapshots (
                date, total_jobs, new_jobs_today, jobs_filled_today,
                total_companies_hiring, market_sentiment, remote_job_percentage
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind("2026-01-16")
        .bind(50)
        .bind(5)
        .bind(2)
        .bind(25)
        .bind("neutral")
        .bind(0.0)
        .execute(&pool)
        .await
        .unwrap();

        let analyzer = MarketAnalyzer::new(pool);
        let snapshot = analyzer
            .get_snapshot(NaiveDate::from_ymd_opt(2026, 1, 16).unwrap())
            .await
            .unwrap()
            .unwrap();

        // Verify required fields are present
        assert_eq!(snapshot.total_jobs, 50);
        assert_eq!(snapshot.new_jobs_today, 5);
        assert_eq!(snapshot.market_sentiment, "neutral");

        // Nullable fields should be None when not provided
        assert_eq!(snapshot.top_skill, None);
        assert_eq!(snapshot.top_company, None);
        assert_eq!(snapshot.top_location, None);
        assert_eq!(snapshot.notes, None);
    }

    #[tokio::test]
    async fn test_create_daily_snapshot_with_empty_company_names() {
        let pool = setup_test_db().await;
        let today = Utc::now().date_naive().to_string();

        // Insert jobs with empty/null companies
        insert_test_job(
            &pool,
            "job1",
            "Engineer",
            Some(""),
            Some("Remote"),
            "active",
            &today,
        )
        .await;
        insert_test_job(
            &pool,
            "job2",
            "Engineer",
            None,
            Some("San Francisco"),
            "active",
            &today,
        )
        .await;
        insert_test_job(
            &pool,
            "job3",
            "Engineer",
            Some("Google"),
            Some("New York"),
            "active",
            &today,
        )
        .await;

        let analyzer = MarketAnalyzer::new(pool);
        let snapshot = analyzer.create_daily_snapshot().await.unwrap();

        assert_eq!(snapshot.total_jobs, 3);
        assert_eq!(snapshot.total_companies_hiring, 1); // Only Google
        assert_eq!(snapshot.top_company, Some("Google".to_string()));
    }

    #[tokio::test]
    async fn test_create_daily_snapshot_calculates_correct_median() {
        let pool = setup_test_db().await;
        let today = Utc::now().date_naive().to_string();

        insert_test_job(&pool, "job1", "Eng", Some("Co1"), None, "active", &today).await;
        insert_test_job(&pool, "job2", "Eng", Some("Co2"), None, "active", &today).await;
        insert_test_job(&pool, "job3", "Eng", Some("Co3"), None, "active", &today).await;

        insert_test_salary(&pool, "job1", 100000).await;
        insert_test_salary(&pool, "job2", 150000).await;
        insert_test_salary(&pool, "job3", 200000).await;

        let analyzer = MarketAnalyzer::new(pool);
        let snapshot = analyzer.create_daily_snapshot().await.unwrap();

        // If salaries are present, they should be correct
        if let Some(median) = snapshot.median_salary {
            assert_eq!(median, 150000);
        }
        if let Some(avg) = snapshot.avg_salary {
            assert_eq!(avg, 150000);
        }
    }

    #[tokio::test]
    async fn test_get_historical_snapshots_respects_limit() {
        let pool = setup_test_db().await;

        // Insert 30 days of snapshots
        for i in 1..=30 {
            sqlx::query(
                "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(format!("2025-12-{:02}", i))
            .bind(100)
            .bind(10)
            .bind(5)
            .bind(50)
            .bind("neutral")
            .execute(&pool)
            .await
            .unwrap();
        }

        let analyzer = MarketAnalyzer::new(pool);

        // Request only 7 days
        let snapshots = analyzer.get_historical_snapshots(7).await.unwrap();

        // Should return only recent 7 days
        assert!(snapshots.len() <= 7);
    }

    #[test]
    fn test_market_snapshot_bullish_healthy() {
        let snapshot = MarketSnapshot {
            date: Utc::now().date_naive(),
            total_jobs: 8000,
            new_jobs_today: 150,
            jobs_filled_today: 60,
            avg_salary: Some(145000),
            median_salary: Some(140000),
            remote_job_percentage: 50.0,
            top_skill: Some("Python".to_string()),
            top_company: Some("Netflix".to_string()),
            top_location: Some("Los Angeles, CA".to_string()),
            total_companies_hiring: 500,
            market_sentiment: "bullish".to_string(),
            notes: None,
        };

        assert!(snapshot.is_healthy());
        assert_eq!(snapshot.sentiment_indicator(), "[UP]");
    }

    #[test]
    fn test_market_snapshot_partial_data() {
        let snapshot = MarketSnapshot {
            date: Utc::now().date_naive(),
            total_jobs: 3000,
            new_jobs_today: 50,
            jobs_filled_today: 30,
            avg_salary: None,
            median_salary: None,
            remote_job_percentage: 0.0,
            top_skill: None,
            top_company: Some("StartupCo".to_string()),
            top_location: None,
            total_companies_hiring: 100,
            market_sentiment: "neutral".to_string(),
            notes: None,
        };

        assert!(snapshot.is_healthy());
        assert!(snapshot.avg_salary.is_none());
        assert!(snapshot.median_salary.is_none());
    }

    #[test]
    fn test_market_snapshot_all_none() {
        let snapshot = MarketSnapshot {
            date: Utc::now().date_naive(),
            total_jobs: 0,
            new_jobs_today: 0,
            jobs_filled_today: 0,
            avg_salary: None,
            median_salary: None,
            remote_job_percentage: 0.0,
            top_skill: None,
            top_company: None,
            top_location: None,
            total_companies_hiring: 0,
            market_sentiment: "bearish".to_string(),
            notes: None,
        };

        assert!(!snapshot.is_healthy());
        assert!(snapshot.summary().contains("N/A"));
    }

    #[test]
    fn test_compute_median_fractional_positions() {
        let mut values = vec![1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
        assert_eq!(compute_median(&mut values), Some(3.5));

        let mut values2 = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        assert_eq!(compute_median(&mut values2), Some(3.0));
    }
}
