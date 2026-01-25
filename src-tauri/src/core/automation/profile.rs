//! Application Profile Management
//!
//! Manages user profile information for automated job applications.
#![allow(clippy::unwrap_used, clippy::expect_used)] // DateTime parsing from validated database values

use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

/// User's application profile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationProfile {
    pub id: i64,
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub github_url: Option<String>,
    pub portfolio_url: Option<String>,
    pub website_url: Option<String>,
    pub default_resume_id: Option<i64>,
    pub resume_file_path: Option<String>,
    pub default_cover_letter_template: Option<String>,
    pub us_work_authorized: bool,
    pub requires_sponsorship: bool,
    pub max_applications_per_day: i32,
    pub require_manual_approval: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Profile manager
#[derive(Debug)]
pub struct ProfileManager {
    db: SqlitePool,
}

impl ProfileManager {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Create or update application profile
    pub async fn upsert_profile(&self, profile: &ApplicationProfileInput) -> Result<i64> {
        // Check if profile exists
        let existing = sqlx::query_scalar::<_, i64>("SELECT id FROM application_profile LIMIT 1")
            .fetch_optional(&self.db)
            .await?;

        if let Some(id) = existing {
            // Update existing
            sqlx::query(
                r#"
                UPDATE application_profile
                SET full_name = ?, email = ?, phone = ?, linkedin_url = ?,
                    github_url = ?, portfolio_url = ?, website_url = ?,
                    default_resume_id = ?, resume_file_path = ?, default_cover_letter_template = ?,
                    us_work_authorized = ?, requires_sponsorship = ?,
                    max_applications_per_day = ?, require_manual_approval = ?,
                    updated_at = datetime('now')
                WHERE id = ?
                "#,
            )
            .bind(&profile.full_name)
            .bind(&profile.email)
            .bind(&profile.phone)
            .bind(&profile.linkedin_url)
            .bind(&profile.github_url)
            .bind(&profile.portfolio_url)
            .bind(&profile.website_url)
            .bind(profile.default_resume_id)
            .bind(&profile.resume_file_path)
            .bind(&profile.default_cover_letter_template)
            .bind(profile.us_work_authorized as i32)
            .bind(profile.requires_sponsorship as i32)
            .bind(profile.max_applications_per_day)
            .bind(profile.require_manual_approval as i32)
            .bind(id)
            .execute(&self.db)
            .await?;

            Ok(id)
        } else {
            // Insert new
            let result = sqlx::query(
                r#"
                INSERT INTO application_profile (
                    full_name, email, phone, linkedin_url, github_url,
                    portfolio_url, website_url, default_resume_id,
                    resume_file_path, default_cover_letter_template, us_work_authorized,
                    requires_sponsorship, max_applications_per_day,
                    require_manual_approval
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(&profile.full_name)
            .bind(&profile.email)
            .bind(&profile.phone)
            .bind(&profile.linkedin_url)
            .bind(&profile.github_url)
            .bind(&profile.portfolio_url)
            .bind(&profile.website_url)
            .bind(profile.default_resume_id)
            .bind(&profile.resume_file_path)
            .bind(&profile.default_cover_letter_template)
            .bind(profile.us_work_authorized as i32)
            .bind(profile.requires_sponsorship as i32)
            .bind(profile.max_applications_per_day)
            .bind(profile.require_manual_approval as i32)
            .execute(&self.db)
            .await?;

            Ok(result.last_insert_rowid())
        }
    }

    /// Get application profile
    pub async fn get_profile(&self) -> Result<Option<ApplicationProfile>> {
        let row = sqlx::query(
            r#"
            SELECT id, full_name, email, phone, linkedin_url, github_url,
                   portfolio_url, website_url, default_resume_id,
                   resume_file_path, default_cover_letter_template, us_work_authorized,
                   requires_sponsorship, max_applications_per_day,
                   require_manual_approval, created_at, updated_at
            FROM application_profile
            LIMIT 1
            "#,
        )
        .fetch_optional(&self.db)
        .await?;

        use sqlx::Row;
        match row {
            Some(r) => {
                let created_at: String = r.get("created_at");
                let updated_at: String = r.get("updated_at");
                Ok(Some(ApplicationProfile {
                    id: r.get("id"),
                    full_name: r.get("full_name"),
                    email: r.get("email"),
                    phone: r.get("phone"),
                    linkedin_url: r.get("linkedin_url"),
                    github_url: r.get("github_url"),
                    portfolio_url: r.get("portfolio_url"),
                    website_url: r.get("website_url"),
                    default_resume_id: r.get("default_resume_id"),
                    resume_file_path: r.get("resume_file_path"),
                    default_cover_letter_template: r.get("default_cover_letter_template"),
                    us_work_authorized: r.get::<i32, _>("us_work_authorized") != 0,
                    requires_sponsorship: r.get::<i32, _>("requires_sponsorship") != 0,
                    max_applications_per_day: r.get("max_applications_per_day"),
                    require_manual_approval: r.get::<i32, _>("require_manual_approval") != 0,
                    created_at: DateTime::parse_from_rfc3339(&created_at)?.with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&updated_at)?.with_timezone(&Utc),
                }))
            }
            None => Ok(None),
        }
    }

    /// Add or update screening answer
    pub async fn upsert_screening_answer(
        &self,
        question_pattern: &str,
        answer: &str,
        answer_type: &str,
        notes: Option<&str>,
    ) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO screening_answers (question_pattern, answer, answer_type, notes)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(question_pattern) DO UPDATE SET
                answer = excluded.answer,
                answer_type = excluded.answer_type,
                notes = excluded.notes,
                updated_at = datetime('now')
            "#,
        )
        .bind(question_pattern)
        .bind(answer)
        .bind(answer_type)
        .bind(notes)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Get all screening answers
    ///
    /// OPTIMIZATION: Added reasonable LIMIT (1000) to prevent unbounded result sets.
    /// Most users will have <100 screening patterns; 1000 is a safe upper bound.
    pub async fn get_screening_answers(&self) -> Result<Vec<ScreeningAnswer>> {
        let rows = sqlx::query(
            r#"
            SELECT id, question_pattern, answer, answer_type, notes, created_at, updated_at
            FROM screening_answers
            ORDER BY created_at DESC
            LIMIT 1000
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        use sqlx::Row;
        Ok(rows
            .into_iter()
            .map(|r| {
                let created_at: String = r.get("created_at");
                let updated_at: String = r.get("updated_at");
                ScreeningAnswer {
                    id: r.get("id"),
                    question_pattern: r.get("question_pattern"),
                    answer: r.get("answer"),
                    answer_type: r.get("answer_type"),
                    notes: r.get("notes"),
                    created_at: DateTime::parse_from_rfc3339(&created_at)
                        .unwrap()
                        .with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&updated_at)
                        .unwrap()
                        .with_timezone(&Utc),
                }
            })
            .collect())
    }

    /// Find matching screening answer for a question
    ///
    /// OPTIMIZATION: Fetch only pattern+answer columns instead of full rows.
    /// Reduces data transfer and memory allocation for pattern matching.
    pub async fn find_answer_for_question(&self, question: &str) -> Result<Option<String>> {
        // Fetch only needed columns for pattern matching
        let rows = sqlx::query(
            "SELECT question_pattern, answer FROM screening_answers ORDER BY created_at DESC",
        )
        .fetch_all(&self.db)
        .await?;

        use sqlx::Row;
        for row in rows {
            let pattern: String = row.try_get("question_pattern")?;
            let answer: String = row.try_get("answer")?;

            if let Ok(regex) = regex::Regex::new(&pattern) {
                if regex.is_match(question) {
                    return Ok(Some(answer));
                }
            }
        }

        Ok(None)
    }
}

/// Input for creating/updating profile
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ApplicationProfileInput {
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub github_url: Option<String>,
    pub portfolio_url: Option<String>,
    pub website_url: Option<String>,
    pub default_resume_id: Option<i64>,
    pub resume_file_path: Option<String>,
    pub default_cover_letter_template: Option<String>,
    pub us_work_authorized: bool,
    pub requires_sponsorship: bool,
    pub max_applications_per_day: i32,
    pub require_manual_approval: bool,
}

/// Screening question answer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreeningAnswer {
    pub id: i64,
    pub question_pattern: String,
    pub answer: String,
    pub answer_type: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
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
    async fn test_create_profile() {
        let (pool, _temp_dir) = setup_test_db().await;
        let manager = ProfileManager::new(pool);

        let input = ApplicationProfileInput {
            full_name: "John Doe".to_string(),
            email: "john@example.com".to_string(),
            phone: Some("+1234567890".to_string()),
            linkedin_url: Some("https://linkedin.com/in/johndoe".to_string()),
            github_url: Some("https://github.com/johndoe".to_string()),
            portfolio_url: None,
            website_url: None,
            default_resume_id: None,
            resume_file_path: None,
            default_cover_letter_template: None,
            us_work_authorized: true,
            requires_sponsorship: false,
            max_applications_per_day: 10,
            require_manual_approval: true,
        };

        let profile_id = manager.upsert_profile(&input).await.unwrap();
        assert!(profile_id > 0);

        let profile = manager.get_profile().await.unwrap();
        assert!(profile.is_some());
        let profile = profile.unwrap();
        assert_eq!(profile.full_name, "John Doe");
        assert_eq!(profile.email, "john@example.com");
        assert!(profile.us_work_authorized);
    }

    #[tokio::test]
    #[ignore = "Requires file-based database - run with --ignored"]
    async fn test_update_profile() {
        let (pool, _temp_dir) = setup_test_db().await;
        let manager = ProfileManager::new(pool);

        let input1 = ApplicationProfileInput {
            full_name: "John Doe".to_string(),
            email: "john@example.com".to_string(),
            phone: None,
            linkedin_url: None,
            github_url: None,
            portfolio_url: None,
            website_url: None,
            default_resume_id: None,
            resume_file_path: None,
            default_cover_letter_template: None,
            us_work_authorized: true,
            requires_sponsorship: false,
            max_applications_per_day: 10,
            require_manual_approval: true,
        };

        let id1 = manager.upsert_profile(&input1).await.unwrap();

        // Update
        let input2 = ApplicationProfileInput {
            full_name: "Jane Doe".to_string(),
            email: "jane@example.com".to_string(),
            ..input1
        };

        let id2 = manager.upsert_profile(&input2).await.unwrap();

        // Should be same ID (update, not insert)
        assert_eq!(id1, id2);

        let profile = manager.get_profile().await.unwrap().unwrap();
        assert_eq!(profile.full_name, "Jane Doe");
        assert_eq!(profile.email, "jane@example.com");
    }

    #[tokio::test]
    #[ignore = "Requires file-based database - run with --ignored"]
    async fn test_screening_answers() {
        let (pool, _temp_dir) = setup_test_db().await;
        let manager = ProfileManager::new(pool);

        manager
            .upsert_screening_answer(
                "(?i)authorized.*work.*us",
                "Yes",
                "boolean",
                Some("US work authorization"),
            )
            .await
            .unwrap();

        let answers = manager.get_screening_answers().await.unwrap();
        assert!(answers.len() >= 1); // At least 1 (plus default ones from migration)

        // Test pattern matching
        let answer = manager
            .find_answer_for_question("Are you authorized to work in the US?")
            .await
            .unwrap();
        assert_eq!(answer, Some("Yes".to_string()));
    }
}
