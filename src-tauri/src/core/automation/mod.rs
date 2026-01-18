//! Application Automation Module (One-Click Apply)
//!
//! **⚠️ ETHICAL GUIDELINES ⚠️**
//!
//! This module provides infrastructure for automated job application submission.
//! Users MUST:
//! - Comply with all company Terms of Service
//! - Never bypass CAPTCHAs or security measures
//! - Respect rate limits (default: max 10 applications/day)
//! - Only apply to jobs they genuinely intend to pursue
#![allow(clippy::unwrap_used, clippy::expect_used)] // DateTime parsing from validated database values
//! - Review applications before submission (human-in-the-loop)
//!
//! **Legal Considerations:**
//! - Some companies prohibit automated applications in their ToS
//! - Bypassing security measures may violate CFAA (Computer Fraud and Abuse Act)
//! - Users are responsible for ensuring compliance
//!
//! **Our Approach:**
//! - Transparency: Users must explicitly enable automation
//! - Quality: Only apply to 80%+ match jobs
//! - Approval: User reviews before submission (default)
//! - Respect: Honor robots.txt and no-bot policies
//! - CAPTCHA: Never bypass - always prompt user
//!
//! ## Architecture
//!
//! This is a **Phase 1 Foundation** implementation providing:
//! - Application profile management
//! - ATS platform detection
//! - Screening answer configuration
//! - Automation attempt logging
//!
//! **Future Phases:**
//! - Phase 2: Headless browser integration (`fantoccini` or `headless_chrome`)
//! - Phase 3: Form field mapping and auto-fill
//! - Phase 4: CAPTCHA detection and user prompting
//! - Phase 5: Resume/cover letter customization per job

use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

pub mod ats_detector;
pub mod browser;
pub mod form_filler;
pub mod profile;

pub use ats_detector::AtsDetector;
pub use browser::{AutomationPage, BrowserManager, FillResult};
pub use form_filler::FormFiller;
pub use profile::ApplicationProfile;

/// Application automation status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AutomationStatus {
    Pending,
    InProgress,
    AwaitingApproval,
    Submitted,
    Failed,
    Cancelled,
}

impl AutomationStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::AwaitingApproval => "awaiting_approval",
            Self::Submitted => "submitted",
            Self::Failed => "failed",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "pending" => Self::Pending,
            "in_progress" => Self::InProgress,
            "awaiting_approval" => Self::AwaitingApproval,
            "submitted" => Self::Submitted,
            "failed" => Self::Failed,
            "cancelled" => Self::Cancelled,
            _ => Self::Failed,
        }
    }
}

/// ATS platform type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AtsPlatform {
    Greenhouse,
    Lever,
    Workday,
    Taleo,
    Icims,
    BambooHr,
    AshbyHq,
    Unknown,
}

impl AtsPlatform {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Greenhouse => "greenhouse",
            Self::Lever => "lever",
            Self::Workday => "workday",
            Self::Taleo => "taleo",
            Self::Icims => "icims",
            Self::BambooHr => "bamboohr",
            Self::AshbyHq => "ashbyhq",
            Self::Unknown => "unknown",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "greenhouse" => Self::Greenhouse,
            "lever" => Self::Lever,
            "workday" => Self::Workday,
            "taleo" => Self::Taleo,
            "icims" => Self::Icims,
            "bamboohr" => Self::BambooHr,
            "ashbyhq" => Self::AshbyHq,
            _ => Self::Unknown,
        }
    }
}

/// Application automation attempt
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationAttempt {
    pub id: i64,
    pub job_hash: String,
    pub application_id: Option<i64>,
    pub status: AutomationStatus,
    pub ats_platform: AtsPlatform,
    pub error_message: Option<String>,
    pub screenshot_path: Option<String>,
    pub confirmation_screenshot_path: Option<String>,
    pub automation_duration_ms: Option<i64>,
    pub user_approved: bool,
    pub submitted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Automation manager
pub struct AutomationManager {
    db: SqlitePool,
}

impl AutomationManager {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Create a new automation attempt for a job
    pub async fn create_attempt(&self, job_hash: &str, ats_platform: AtsPlatform) -> Result<i64> {
        let result = sqlx::query(
            r#"
            INSERT INTO application_attempts (job_hash, status, ats_platform)
            VALUES (?, ?, ?)
            "#,
        )
        .bind(job_hash)
        .bind(AutomationStatus::Pending.as_str())
        .bind(ats_platform.as_str())
        .execute(&self.db)
        .await?;

        Ok(result.last_insert_rowid())
    }

    /// Get automation attempt by ID
    pub async fn get_attempt(&self, attempt_id: i64) -> Result<ApplicationAttempt> {
        let row = sqlx::query(
            r#"
            SELECT id, job_hash, application_id, status, ats_platform,
                   error_message, screenshot_path, confirmation_screenshot_path,
                   automation_duration_ms, user_approved, submitted_at, created_at
            FROM application_attempts
            WHERE id = ?
            "#,
        )
        .bind(attempt_id)
        .fetch_one(&self.db)
        .await?;

        use sqlx::Row;
        let submitted_at: Option<String> = row.get("submitted_at");
        let created_at: String = row.get("created_at");

        Ok(ApplicationAttempt {
            id: row.get("id"),
            job_hash: row.get("job_hash"),
            application_id: row.get("application_id"),
            status: AutomationStatus::from_str(row.get("status")),
            ats_platform: AtsPlatform::from_str(row.get("ats_platform")),
            error_message: row.get("error_message"),
            screenshot_path: row.get("screenshot_path"),
            confirmation_screenshot_path: row.get("confirmation_screenshot_path"),
            automation_duration_ms: row.get("automation_duration_ms"),
            user_approved: row.get::<i32, _>("user_approved") != 0,
            submitted_at: submitted_at.and_then(|s| {
                DateTime::parse_from_rfc3339(&s)
                    .ok()
                    .map(|dt| dt.with_timezone(&Utc))
            }),
            created_at: DateTime::parse_from_rfc3339(&created_at)?.with_timezone(&Utc),
        })
    }

    /// Update automation attempt status
    pub async fn update_status(
        &self,
        attempt_id: i64,
        status: AutomationStatus,
        error_message: Option<&str>,
    ) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE application_attempts
            SET status = ?, error_message = ?
            WHERE id = ?
            "#,
        )
        .bind(status.as_str())
        .bind(error_message)
        .bind(attempt_id)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Mark attempt as user approved
    pub async fn approve_attempt(&self, attempt_id: i64) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE application_attempts
            SET user_approved = 1, status = ?
            WHERE id = ?
            "#,
        )
        .bind(AutomationStatus::Pending.as_str())
        .bind(attempt_id)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Mark attempt as submitted with timestamp
    pub async fn mark_submitted(&self, attempt_id: i64) -> Result<()> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            UPDATE application_attempts
            SET status = ?, submitted_at = ?
            WHERE id = ?
            "#,
        )
        .bind(AutomationStatus::Submitted.as_str())
        .bind(&now)
        .bind(attempt_id)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Get pending automation attempts (approved and ready to process)
    pub async fn get_pending_attempts(&self, limit: usize) -> Result<Vec<ApplicationAttempt>> {
        let rows = sqlx::query(
            r#"
            SELECT id, job_hash, application_id, status, ats_platform,
                   error_message, screenshot_path, confirmation_screenshot_path,
                   automation_duration_ms, user_approved, submitted_at, created_at
            FROM application_attempts
            WHERE status = ? AND user_approved = 1
            ORDER BY created_at ASC
            LIMIT ?
            "#,
        )
        .bind(AutomationStatus::Pending.as_str())
        .bind(limit as i64)
        .fetch_all(&self.db)
        .await?;

        use sqlx::Row;
        Ok(rows
            .into_iter()
            .map(|row| {
                let submitted_at: Option<String> = row.get("submitted_at");
                let created_at: String = row.get("created_at");
                ApplicationAttempt {
                    id: row.get("id"),
                    job_hash: row.get("job_hash"),
                    application_id: row.get("application_id"),
                    status: AutomationStatus::from_str(row.get("status")),
                    ats_platform: AtsPlatform::from_str(row.get("ats_platform")),
                    error_message: row.get("error_message"),
                    screenshot_path: row.get("screenshot_path"),
                    confirmation_screenshot_path: row.get("confirmation_screenshot_path"),
                    automation_duration_ms: row.get("automation_duration_ms"),
                    user_approved: row.get::<i32, _>("user_approved") != 0,
                    submitted_at: submitted_at.and_then(|s| {
                        DateTime::parse_from_rfc3339(&s)
                            .ok()
                            .map(|dt| dt.with_timezone(&Utc))
                    }),
                    created_at: DateTime::parse_from_rfc3339(&created_at)
                        .unwrap()
                        .with_timezone(&Utc),
                }
            })
            .collect())
    }

    /// Get automation statistics
    pub async fn get_stats(&self) -> Result<AutomationStats> {
        let total = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM application_attempts")
            .fetch_one(&self.db)
            .await?;

        let submitted = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM application_attempts WHERE status = 'submitted'",
        )
        .fetch_one(&self.db)
        .await?;

        let failed = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM application_attempts WHERE status = 'failed'",
        )
        .fetch_one(&self.db)
        .await?;

        let pending = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM application_attempts WHERE status = 'pending' AND user_approved = 1",
        )
        .fetch_one(&self.db)
        .await?;

        Ok(AutomationStats {
            total_attempts: total,
            submitted: submitted,
            failed: failed,
            pending: pending,
            success_rate: if total > 0 {
                (submitted as f64 / total as f64) * 100.0
            } else {
                0.0
            },
        })
    }
}

/// Automation statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationStats {
    pub total_attempts: i64,
    pub submitted: i64,
    pub failed: i64,
    pub pending: i64,
    pub success_rate: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;
    use tempfile::TempDir;

    async fn setup_test_db() -> (SqlitePool, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let db_url = format!("sqlite:{}", db_path.display());

        let pool = SqlitePoolOptions::new().connect(&db_url).await.unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        (pool, temp_dir)
    }

    #[tokio::test]
    #[ignore = "Requires file-based database - run with --ignored"]
    async fn test_create_automation_attempt() {
        let (pool, _temp_dir) = setup_test_db().await;
        let manager = AutomationManager::new(pool);

        // Create test job first
        sqlx::query(
            "INSERT INTO jobs (hash, title, company, location, description, url, score, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("test_hash")
        .bind("Software Engineer")
        .bind("TechCorp")
        .bind("Remote")
        .bind("Test description")
        .bind("https://example.com")
        .bind(0.9)
        .bind("greenhouse")
        .execute(&manager.db)
        .await
        .unwrap();

        let attempt_id = manager
            .create_attempt("test_hash", AtsPlatform::Greenhouse)
            .await
            .unwrap();

        assert!(attempt_id > 0);

        let attempt = manager.get_attempt(attempt_id).await.unwrap();
        assert_eq!(attempt.job_hash, "test_hash");
        assert_eq!(attempt.status, AutomationStatus::Pending);
        assert_eq!(attempt.ats_platform, AtsPlatform::Greenhouse);
    }

    #[tokio::test]
    #[ignore = "Requires file-based database - run with --ignored"]
    async fn test_update_attempt_status() {
        let (pool, _temp_dir) = setup_test_db().await;
        let manager = AutomationManager::new(pool.clone());

        // Create test job
        sqlx::query(
            "INSERT INTO jobs (hash, title, company, location, description, url, score, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("test_hash")
        .bind("Engineer")
        .bind("Company")
        .bind("Remote")
        .bind("Desc")
        .bind("https://test.com")
        .bind(0.8)
        .bind("lever")
        .execute(&pool)
        .await
        .unwrap();

        let attempt_id = manager
            .create_attempt("test_hash", AtsPlatform::Lever)
            .await
            .unwrap();

        manager
            .update_status(attempt_id, AutomationStatus::Failed, Some("Test error"))
            .await
            .unwrap();

        let attempt = manager.get_attempt(attempt_id).await.unwrap();
        assert_eq!(attempt.status, AutomationStatus::Failed);
        assert_eq!(attempt.error_message, Some("Test error".to_string()));
    }

    #[tokio::test]
    #[ignore = "Requires file-based database - run with --ignored"]
    async fn test_approve_and_submit() {
        let (pool, _temp_dir) = setup_test_db().await;
        let manager = AutomationManager::new(pool.clone());

        sqlx::query(
            "INSERT INTO jobs (hash, title, company, location, description, url, score, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("test_hash")
        .bind("Engineer")
        .bind("Company")
        .bind("Remote")
        .bind("Desc")
        .bind("https://test.com")
        .bind(0.8)
        .bind("workday")
        .execute(&pool)
        .await
        .unwrap();

        let attempt_id = manager
            .create_attempt("test_hash", AtsPlatform::Workday)
            .await
            .unwrap();

        // Approve
        manager.approve_attempt(attempt_id).await.unwrap();

        let attempt = manager.get_attempt(attempt_id).await.unwrap();
        assert!(attempt.user_approved);

        // Submit
        manager.mark_submitted(attempt_id).await.unwrap();

        let attempt = manager.get_attempt(attempt_id).await.unwrap();
        assert_eq!(attempt.status, AutomationStatus::Submitted);
        assert!(attempt.submitted_at.is_some());
    }
}
