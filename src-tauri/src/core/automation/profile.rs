//! Application Profile Management
//!
//! Manages user profile information for candidate-controlled application help.

use crate::core::ats::parse_sqlite_datetime;
use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::collections::HashSet;

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

fn normalize_screening_answer_type(answer_type: &str) -> Result<&'static str> {
    match answer_type.trim().to_ascii_lowercase().as_str() {
        "text" | "number" => Ok("text"),
        "yes_no" | "boolean" => Ok("yes_no"),
        "textarea" => Ok("textarea"),
        "select" | "multiple_choice" => Ok("select"),
        other => anyhow::bail!("invalid screening answer type: {other}"),
    }
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
                    default_resume_id = ?,
                    resume_file_path = CASE
                        WHEN ? != 0 THEN NULL
                        WHEN ? != 0 THEN ?
                        ELSE resume_file_path
                    END,
                    default_cover_letter_template = ?,
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
            .bind(profile.clear_resume_file.unwrap_or(false) as i32)
            .bind(profile.resume_file_path.is_some() as i32)
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
                    created_at: parse_sqlite_datetime(&created_at)?,
                    updated_at: parse_sqlite_datetime(&updated_at)?,
                }))
            }
            None => Ok(None),
        }
    }

    /// Check whether an application profile exists without returning private profile data.
    pub async fn has_profile(&self) -> Result<bool> {
        let profile_id = sqlx::query_scalar::<_, i64>("SELECT id FROM application_profile LIMIT 1")
            .fetch_optional(&self.db)
            .await?;

        Ok(profile_id.is_some())
    }

    /// Add or update screening answer
    pub async fn upsert_screening_answer(
        &self,
        question_pattern: &str,
        answer: &str,
        answer_type: &str,
        notes: Option<&str>,
    ) -> Result<()> {
        let answer_type = normalize_screening_answer_type(answer_type)?;

        sqlx::query(
            r#"
            INSERT INTO screening_answers (question_pattern, answer, answer_type, notes)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(question_pattern) DO UPDATE SET
                answer = excluded.answer,
                answer_type = excluded.answer_type,
                notes = excluded.notes,
                times_modified = times_modified + 1,
                confidence_score = 1.0,
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
            SELECT id, question_pattern, answer, answer_type, notes,
                   times_used, times_modified, confidence_score, last_used_at,
                   created_at, updated_at
            FROM screening_answers
            ORDER BY created_at DESC
            LIMIT 1000
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        use sqlx::Row;
        rows.into_iter()
            .map(|r| {
                let created_at: String = r.get("created_at");
                let updated_at: String = r.get("updated_at");
                Ok(ScreeningAnswer {
                    id: r.get("id"),
                    question_pattern: r.get("question_pattern"),
                    answer: r.get("answer"),
                    answer_type: r.get("answer_type"),
                    notes: r.get("notes"),
                    times_used: r.get("times_used"),
                    times_modified: r.get("times_modified"),
                    confidence_score: r.get("confidence_score"),
                    last_used_at: r
                        .get::<Option<String>, _>("last_used_at")
                        .and_then(|date| parse_sqlite_datetime(&date).ok()),
                    created_at: parse_sqlite_datetime(&created_at)?,
                    updated_at: parse_sqlite_datetime(&updated_at)?,
                })
            })
            .collect()
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

            if screening_question_matches(&pattern, question) {
                return Ok(Some(answer));
            }
        }

        Ok(None)
    }
}

/// Match saved screening-answer wording as plain text, not executable regex.
pub(crate) fn screening_question_matches(pattern: &str, question: &str) -> bool {
    let normalized_question = normalize_screening_match_text(question);
    if normalized_question.is_empty() {
        return false;
    }

    let question_tokens: HashSet<&str> = normalized_question.split_whitespace().collect();

    screening_match_candidates(pattern)
        .into_iter()
        .any(|candidate| {
            let normalized_candidate = normalize_screening_match_text(&candidate);
            if normalized_candidate.is_empty() {
                return false;
            }

            if normalized_question.contains(&normalized_candidate) {
                return true;
            }

            let candidate_tokens: Vec<&str> = normalized_candidate.split_whitespace().collect();
            !candidate_tokens.is_empty()
                && candidate_tokens
                    .iter()
                    .all(|token| question_tokens.contains(token))
        })
}

fn screening_match_candidates(pattern: &str) -> Vec<String> {
    let trimmed = pattern.trim();
    if trimmed.is_empty() {
        return Vec::new();
    }

    let mut candidates = vec![trimmed.to_string()];
    candidates.extend(
        legacy_screening_pattern_aliases(trimmed)
            .iter()
            .map(|candidate| (*candidate).to_string()),
    );

    if looks_like_legacy_screening_pattern(trimmed) {
        let simplified = simplify_legacy_screening_pattern(trimmed);
        if !simplified.is_empty() {
            candidates.push(simplified.clone());
            candidates.extend(
                simplified
                    .split('|')
                    .map(str::trim)
                    .filter(|candidate| !candidate.is_empty())
                    .map(ToOwned::to_owned),
            );
        }
    }

    candidates.sort();
    candidates.dedup();
    candidates
}

fn normalize_screening_match_text(input: &str) -> String {
    let lowered = input
        .to_lowercase()
        .replace("u. s.", "us")
        .replace("u.s.", "us");
    let mut normalized = String::with_capacity(lowered.len());
    let mut previous_was_space = true;

    for ch in lowered.chars() {
        if ch.is_alphanumeric() || matches!(ch, '+' | '#') {
            normalized.push(ch);
            previous_was_space = false;
        } else if !matches!(ch, '\'' | '’') && !previous_was_space {
            normalized.push(' ');
            previous_was_space = true;
        }
    }

    normalized.trim().to_string()
}

fn looks_like_legacy_screening_pattern(pattern: &str) -> bool {
    let lower = pattern.to_ascii_lowercase();
    lower.starts_with("(?i)")
        || lower.contains(".*")
        || lower.contains(".+")
        || lower.contains("\\s")
        || lower.contains('|')
        || lower.contains("\\b")
}

fn simplify_legacy_screening_pattern(pattern: &str) -> String {
    let mut simplified = pattern.trim();
    if simplified
        .get(..4)
        .is_some_and(|prefix| prefix.eq_ignore_ascii_case("(?i)"))
    {
        simplified = &simplified[4..];
    }

    let simplified = simplified
        .replace("\\s+", " ")
        .replace("\\s*", " ")
        .replace("\\b", " ")
        .replace(".*", " ")
        .replace(".+", " ");

    simplified
        .chars()
        .map(|ch| match ch {
            '(' | ')' | '[' | ']' | '{' | '}' | '^' | '$' | '?' | '*' | '\\' => ' ',
            _ => ch,
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn legacy_screening_pattern_aliases(pattern: &str) -> &'static [&'static str] {
    match pattern {
        "(?i)authorized.*work.*(united states|us|usa)" => &[
            "authorized to work",
            "authorized work",
            "work authorization",
        ],
        "(?i)require.*sponsor.*work" => &[
            "require sponsorship to work",
            "need sponsorship to work",
            "sponsorship",
        ],
        "(?i)require.*sponsor.*(now|future)" => &[
            "require sponsorship",
            "need sponsorship",
            "visa sponsorship",
        ],
        "(?i)18.*years.*age" => &["18 years of age", "18 years age"],
        "(?i)drug.*test" => &["drug test", "drug screen"],
        "(?i)background.*check" => &["background check"],
        "(?i)security.*clearance" => &["security clearance"],
        "(?i)willing.*relocate" => &["willing to relocate", "willing relocate", "relocate"],
        "(?i)notice.*period" => &["notice period"],
        "(?i)salary.*expectation" => &["salary expectation", "expected salary"],
        _ => &[],
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
    pub resume_file_token: Option<String>,
    pub clear_resume_file: Option<bool>,
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
    pub times_used: i32,
    pub times_modified: i32,
    pub confidence_score: f64,
    pub last_used_at: Option<DateTime<Utc>>,
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
        let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

        let pool = SqlitePoolOptions::new().connect(&db_url).await.unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        (pool, temp_dir)
    }

    #[tokio::test]
    async fn test_create_profile() {
        let (pool, _temp_dir) = setup_test_db().await;
        let manager = ProfileManager::new(pool);

        let input = ApplicationProfileInput {
            full_name: "Jordan Lee".to_string(),
            email: "jordan@example.com".to_string(),
            phone: Some("+1234567890".to_string()),
            linkedin_url: Some("https://linkedin.com/in/jordanlee".to_string()),
            github_url: None,
            portfolio_url: None,
            website_url: None,
            default_resume_id: None,
            resume_file_path: None,
            resume_file_token: None,
            clear_resume_file: None,
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
        assert_eq!(profile.full_name, "Jordan Lee");
        assert_eq!(profile.email, "jordan@example.com");
        assert!(profile.us_work_authorized);
    }

    #[tokio::test]
    async fn test_update_profile() {
        let (pool, _temp_dir) = setup_test_db().await;
        let manager = ProfileManager::new(pool);

        let input1 = ApplicationProfileInput {
            full_name: "Jordan Lee".to_string(),
            email: "jordan@example.com".to_string(),
            phone: None,
            linkedin_url: None,
            github_url: None,
            portfolio_url: None,
            website_url: None,
            default_resume_id: None,
            resume_file_path: None,
            resume_file_token: None,
            clear_resume_file: None,
            default_cover_letter_template: None,
            us_work_authorized: true,
            requires_sponsorship: false,
            max_applications_per_day: 10,
            require_manual_approval: true,
        };

        let id1 = manager.upsert_profile(&input1).await.unwrap();

        // Update
        let input2 = ApplicationProfileInput {
            full_name: "Sam Rivera".to_string(),
            email: "sam@example.com".to_string(),
            ..input1
        };

        let id2 = manager.upsert_profile(&input2).await.unwrap();

        // Should be same ID (update, not insert)
        assert_eq!(id1, id2);

        let profile = manager.get_profile().await.unwrap().unwrap();
        assert_eq!(profile.full_name, "Sam Rivera");
        assert_eq!(profile.email, "sam@example.com");
    }

    #[tokio::test]
    async fn test_update_profile_preserves_resume_file_without_explicit_change() {
        let (pool, _temp_dir) = setup_test_db().await;
        let manager = ProfileManager::new(pool);

        let input1 = ApplicationProfileInput {
            full_name: "Jordan Lee".to_string(),
            email: "jordan@example.com".to_string(),
            phone: None,
            linkedin_url: None,
            github_url: None,
            portfolio_url: None,
            website_url: None,
            default_resume_id: None,
            resume_file_path: Some("/Users/jordan/private/resume.pdf".to_string()),
            resume_file_token: None,
            clear_resume_file: None,
            default_cover_letter_template: None,
            us_work_authorized: true,
            requires_sponsorship: false,
            max_applications_per_day: 10,
            require_manual_approval: true,
        };

        manager.upsert_profile(&input1).await.unwrap();

        let input2 = ApplicationProfileInput {
            email: "jordan.updated@example.com".to_string(),
            resume_file_path: None,
            clear_resume_file: None,
            ..input1
        };

        manager.upsert_profile(&input2).await.unwrap();

        let profile = manager.get_profile().await.unwrap().unwrap();
        assert_eq!(
            profile.resume_file_path,
            Some("/Users/jordan/private/resume.pdf".to_string())
        );
    }

    #[tokio::test]
    async fn test_update_profile_replaces_and_clears_resume_file_explicitly() {
        let (pool, _temp_dir) = setup_test_db().await;
        let manager = ProfileManager::new(pool);

        let input1 = ApplicationProfileInput {
            full_name: "Jordan Lee".to_string(),
            email: "jordan@example.com".to_string(),
            phone: None,
            linkedin_url: None,
            github_url: None,
            portfolio_url: None,
            website_url: None,
            default_resume_id: None,
            resume_file_path: Some("/Users/jordan/private/resume.pdf".to_string()),
            resume_file_token: None,
            clear_resume_file: None,
            default_cover_letter_template: None,
            us_work_authorized: true,
            requires_sponsorship: false,
            max_applications_per_day: 10,
            require_manual_approval: true,
        };

        manager.upsert_profile(&input1).await.unwrap();

        let input2 = ApplicationProfileInput {
            resume_file_path: Some("C:\\Users\\Jordan\\Desktop\\new-resume.docx".to_string()),
            ..input1.clone()
        };
        manager.upsert_profile(&input2).await.unwrap();

        let profile = manager.get_profile().await.unwrap().unwrap();
        assert_eq!(
            profile.resume_file_path,
            Some("C:\\Users\\Jordan\\Desktop\\new-resume.docx".to_string())
        );

        let input3 = ApplicationProfileInput {
            resume_file_path: None,
            clear_resume_file: Some(true),
            ..input1
        };
        manager.upsert_profile(&input3).await.unwrap();

        let profile = manager.get_profile().await.unwrap().unwrap();
        assert_eq!(profile.resume_file_path, None);
    }

    #[test]
    fn test_screening_question_matching_treats_symbols_as_literal_text() {
        assert!(screening_question_matches(
            "Security+",
            "Do you have a Security+ certification?"
        ));
        assert!(!screening_question_matches(
            "Security+",
            "Do you have a security clearance?"
        ));
    }

    #[test]
    fn test_screening_question_matching_handles_plain_words_and_legacy_defaults() {
        assert!(screening_question_matches(
            "US citizen",
            "Are you a U.S. citizen?"
        ));
        assert!(screening_question_matches(
            "background check",
            "Can you complete a background check?"
        ));
        assert!(screening_question_matches(
            "(?i)authorized.*work.*(united states|us|usa)",
            "Are you authorized to work in the US?"
        ));
    }

    #[tokio::test]
    async fn test_screening_answers() {
        let (pool, _temp_dir) = setup_test_db().await;
        let manager = ProfileManager::new(pool);

        manager
            .upsert_screening_answer(
                "(?i)authorized.*work.*us",
                "Yes",
                "yes_no",
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

    #[tokio::test]
    async fn test_screening_answer_legacy_boolean_type_is_normalized() {
        let (pool, _temp_dir) = setup_test_db().await;
        let manager = ProfileManager::new(pool);

        manager
            .upsert_screening_answer("(?i)authorized.*work", "Yes", "boolean", None)
            .await
            .unwrap();

        let answers = manager.get_screening_answers().await.unwrap();
        let answer = answers
            .iter()
            .find(|answer| answer.question_pattern == "(?i)authorized.*work")
            .unwrap();

        assert_eq!(answer.answer_type.as_deref(), Some("yes_no"));
    }

    #[tokio::test]
    async fn test_screening_answer_invalid_type_is_rejected() {
        let (pool, _temp_dir) = setup_test_db().await;
        let manager = ProfileManager::new(pool);

        let result = manager
            .upsert_screening_answer("(?i)invalid.*type", "Yes", "checkbox", None)
            .await;

        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("checkbox"));
    }
}
