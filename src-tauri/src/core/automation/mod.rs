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

/// Lifecycle status of an automated job application.
///
/// Applications move through these states:
/// 1. `Pending` - Created but not yet started
/// 2. `InProgress` - Currently being automated
/// 3. `AwaitingApproval` - Filled, waiting for user review (default mode)
/// 4. `Submitted` - Successfully submitted
/// 5. `Failed` - Automation failed (error logged)
/// 6. `Cancelled` - User cancelled before submission
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
    /// Convert status to database string representation.
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

    /// Parse status from database string.
    ///
    /// Returns `Failed` for unknown strings (fail-safe).
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

/// Applicant Tracking System (ATS) platform identifier.
///
/// Used to select the correct automation strategy for form filling.
/// Each platform has unique DOM structure and API patterns.
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
    /// Convert platform to database string representation.
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

    /// Parse platform from database string.
    ///
    /// Returns `Unknown` for unrecognized platforms.
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

/// Record of a single automation attempt for a job application.
///
/// Tracks the full lifecycle including timing, status, errors, and user approval.
/// Screenshots are stored for debugging and user verification.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationAttempt {
    /// Database ID of this attempt.
    pub id: i64,
    /// Job hash linking to the jobs table.
    pub job_hash: String,
    /// Optional link to saved application record.
    pub application_id: Option<i64>,
    /// Current lifecycle status.
    pub status: AutomationStatus,
    /// Detected ATS platform for this job.
    pub ats_platform: AtsPlatform,
    /// Error message if automation failed.
    pub error_message: Option<String>,
    /// Path to screenshot taken during automation (debugging).
    pub screenshot_path: Option<String>,
    /// Path to confirmation page screenshot (proof of submission).
    pub confirmation_screenshot_path: Option<String>,
    /// Total time spent automating this application (milliseconds).
    pub automation_duration_ms: Option<i64>,
    /// Whether user has approved this for submission (human-in-the-loop).
    pub user_approved: bool,
    /// Timestamp when application was submitted (if successful).
    pub submitted_at: Option<DateTime<Utc>>,
    /// When this attempt was created.
    pub created_at: DateTime<Utc>,
}

/// Manages application automation lifecycle and database tracking.
///
/// Handles CRUD operations for automation attempts, status updates,
/// and aggregated statistics.
///
/// # Examples
///
/// ```no_run
/// # use job_sentinel::core::automation::{AutomationManager, AtsPlatform};
/// # async fn example(db: sqlx::SqlitePool) -> anyhow::Result<()> {
/// let manager = AutomationManager::new(db);
///
/// // Create new automation attempt
/// let attempt_id = manager.create_attempt("job_abc123", AtsPlatform::Greenhouse).await?;
///
/// // User reviews and approves
/// manager.approve_attempt(attempt_id).await?;
///
/// // Mark as submitted after automation completes
/// manager.mark_submitted(attempt_id).await?;
/// # Ok(())
/// # }
/// ```
pub struct AutomationManager {
    db: SqlitePool,
}

impl AutomationManager {
    /// Create a new automation manager with database connection.
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Create a new automation attempt for a job.
    ///
    /// Initializes a new attempt with `Pending` status and the detected ATS platform.
    /// User approval is required before submission (default behavior).
    ///
    /// # Arguments
    ///
    /// * `job_hash` - Unique identifier for the job from the jobs table
    /// * `ats_platform` - Detected ATS platform (from `AtsDetector`)
    ///
    /// # Returns
    ///
    /// Database ID of the newly created attempt.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use job_sentinel::core::automation::{AutomationManager, AtsPlatform};
    /// # async fn example(manager: &AutomationManager) -> anyhow::Result<()> {
    /// let attempt_id = manager.create_attempt("job_xyz", AtsPlatform::Lever).await?;
    /// println!("Created attempt {}", attempt_id);
    /// # Ok(())
    /// # }
    /// ```
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

    /// Retrieve an automation attempt by its database ID.
    ///
    /// # Arguments
    ///
    /// * `attempt_id` - Database ID returned from `create_attempt`
    ///
    /// # Returns
    ///
    /// Full `ApplicationAttempt` record with all fields populated.
    ///
    /// # Errors
    ///
    /// Returns error if attempt_id doesn't exist or database query fails.
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

    /// Update the status of an automation attempt.
    ///
    /// Use this to transition between lifecycle states and optionally record error messages.
    ///
    /// # Arguments
    ///
    /// * `attempt_id` - Database ID of the attempt
    /// * `status` - New status to set
    /// * `error_message` - Optional error message (typically for `Failed` status)
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use job_sentinel::core::automation::{AutomationManager, AutomationStatus};
    /// # async fn example(manager: &AutomationManager) -> anyhow::Result<()> {
    /// manager.update_status(
    ///     123,
    ///     AutomationStatus::Failed,
    ///     Some("CAPTCHA detected")
    /// ).await?;
    /// # Ok(())
    /// # }
    /// ```
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

    /// Mark an attempt as approved by the user (human-in-the-loop).
    ///
    /// Sets `user_approved = true` and transitions status to `Pending` so the
    /// automation can proceed. This enforces the human review requirement.
    ///
    /// # Arguments
    ///
    /// * `attempt_id` - Database ID of the attempt to approve
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use job_sentinel::core::automation::AutomationManager;
    /// # async fn example(manager: &AutomationManager) -> anyhow::Result<()> {
    /// // User reviews filled application and approves it
    /// manager.approve_attempt(123).await?;
    /// # Ok(())
    /// # }
    /// ```
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

    /// Mark an attempt as successfully submitted.
    ///
    /// Sets status to `Submitted` and records the submission timestamp.
    /// This is the final state for successful automation.
    ///
    /// # Arguments
    ///
    /// * `attempt_id` - Database ID of the attempt
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

    /// Retrieve pending automation attempts that are ready to process.
    ///
    /// Returns attempts with `Pending` status AND `user_approved = true`,
    /// ordered by creation time (FIFO queue).
    ///
    /// # Arguments
    ///
    /// * `limit` - Maximum number of attempts to return
    ///
    /// # Returns
    ///
    /// Vector of approved attempts ready for automation, oldest first.
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

    /// Calculate aggregated automation statistics.
    ///
    /// Returns counts for all attempt statuses and calculates success rate.
    ///
    /// # Performance
    ///
    /// Optimized single query using CASE expressions instead of 4 separate queries.
    /// Reduces database round-trips from 4 to 1 and enables better query planning.
    ///
    /// # Returns
    ///
    /// Statistics including total attempts, submitted count, failed count,
    /// pending count, and overall success rate percentage.
    pub async fn get_stats(&self) -> Result<AutomationStats> {
        let row = sqlx::query(
            r#"
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'pending' AND user_approved = 1 THEN 1 ELSE 0 END) as pending
            FROM application_attempts
            "#,
        )
        .fetch_one(&self.db)
        .await?;

        use sqlx::Row;
        let total: i64 = row.try_get("total")?;
        let submitted: i64 = row.try_get("submitted")?;

        Ok(AutomationStats {
            total_attempts: total,
            submitted,
            failed: row.try_get("failed")?,
            pending: row.try_get("pending")?,
            success_rate: if total > 0 {
                (submitted as f64 / total as f64) * 100.0
            } else {
                0.0
            },
        })
    }
}

/// Aggregated statistics for automation performance tracking.
///
/// Used for dashboard metrics and health monitoring.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationStats {
    /// Total number of automation attempts (all statuses).
    pub total_attempts: i64,
    /// Count of successfully submitted applications.
    pub submitted: i64,
    /// Count of failed attempts.
    pub failed: i64,
    /// Count of approved attempts waiting to be processed.
    pub pending: i64,
    /// Success rate percentage (submitted / total * 100).
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
