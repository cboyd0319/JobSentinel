//! Resume-Job Matching Algorithm
//!
//! Compares resume skills against job requirements and generates match scores.

use super::skills::SkillExtractor;
use super::{MatchResult, UserSkill};
use anyhow::Result;
use chrono::Utc;
use sqlx::{Row, SqlitePool};
use std::collections::HashSet;

/// Minimal job info for matching
struct JobInfo {
    title: String,
    description: String,
}

/// Job matcher for calculating resume-job compatibility
pub struct JobMatcher {
    db: SqlitePool,
    skill_extractor: SkillExtractor,
}

impl JobMatcher {
    pub fn new(db: SqlitePool) -> Self {
        Self {
            db,
            skill_extractor: SkillExtractor::new(),
        }
    }

    /// Extract skills from job description and store in database
    pub async fn extract_job_skills(&self, job_hash: &str) -> Result<Vec<String>> {
        // Get job details
        let job = self.get_job(job_hash).await?;

        // Extract skills from description
        let job_text = format!("{} {}", job.title, job.description);
        let extracted_skills = self.skill_extractor.extract_skills(&job_text);

        // Insert skills into database
        for skill in &extracted_skills {
            sqlx::query(
                r#"
                INSERT INTO job_skills (job_hash, skill_name, is_required, skill_category)
                VALUES (?, ?, 1, ?)
                ON CONFLICT(job_hash, skill_name) DO UPDATE SET
                    skill_category = excluded.skill_category
                "#,
            )
            .bind(job_hash)
            .bind(&skill.skill_name)
            .bind(&skill.skill_category)
            .execute(&self.db)
            .await?;
        }

        Ok(extracted_skills.iter().map(|s| s.skill_name.clone()).collect())
    }

    /// Calculate match between resume and job
    pub async fn calculate_match(&self, resume_id: i64, job_hash: &str) -> Result<MatchResult> {
        // Get user skills
        let user_skills = self.get_user_skills(resume_id).await?;
        let user_skill_names: HashSet<String> = user_skills
            .iter()
            .map(|s| s.skill_name.to_lowercase())
            .collect();

        // Get job skills
        let job_skills = self.get_job_skills(job_hash).await?;
        let job_skill_names: HashSet<String> = job_skills.iter().map(|s| s.to_lowercase()).collect();

        // Calculate matching skills
        let matching_skills: Vec<String> = job_skill_names
            .intersection(&user_skill_names)
            .map(|s| {
                // Find original casing from job_skills
                job_skills
                    .iter()
                    .find(|js| js.to_lowercase() == *s)
                    .unwrap_or(s)
                    .clone()
            })
            .collect();

        // Calculate missing skills
        let missing_skills: Vec<String> = job_skill_names
            .difference(&user_skill_names)
            .map(|s| {
                job_skills
                    .iter()
                    .find(|js| js.to_lowercase() == *s)
                    .unwrap_or(s)
                    .clone()
            })
            .collect();

        // Calculate skills match score
        let skills_match_score = if !job_skill_names.is_empty() {
            matching_skills.len() as f64 / job_skill_names.len() as f64
        } else {
            1.0 // No required skills = 100% match
        };

        // Overall match score (currently just skills, can expand later)
        let overall_match_score = skills_match_score;

        // Generate gap analysis
        let gap_analysis = self.generate_gap_analysis(
            &matching_skills,
            &missing_skills,
            overall_match_score,
        );

        Ok(MatchResult {
            id: 0, // Will be set by caller
            resume_id,
            job_hash: job_hash.to_string(),
            overall_match_score,
            skills_match_score: Some(skills_match_score),
            experience_match_score: None, // Future enhancement
            education_match_score: None,  // Future enhancement
            missing_skills,
            matching_skills,
            gap_analysis: Some(gap_analysis),
            created_at: Utc::now(),
        })
    }

    /// Generate human-readable gap analysis
    fn generate_gap_analysis(
        &self,
        matching_skills: &[String],
        missing_skills: &[String],
        overall_score: f64,
    ) -> String {
        let match_percentage = (overall_score * 100.0).round() as i32;

        let mut analysis = format!("Match: {}%\n\n", match_percentage);

        if !matching_skills.is_empty() {
            analysis.push_str(&format!(
                "✓ Matching Skills ({}):\n",
                matching_skills.len()
            ));
            for skill in matching_skills {
                analysis.push_str(&format!("  • {}\n", skill));
            }
            analysis.push('\n');
        }

        if !missing_skills.is_empty() {
            analysis.push_str(&format!("✗ Missing Skills ({}):\n", missing_skills.len()));
            for skill in missing_skills {
                analysis.push_str(&format!("  • {}\n", skill));
            }
            analysis.push('\n');
        }

        // Recommendation
        if overall_score >= 0.8 {
            analysis.push_str("💡 Strong match! Apply immediately.");
        } else if overall_score >= 0.6 {
            analysis.push_str(
                "💡 Good match. Consider highlighting transferable skills in your application.",
            );
        } else if overall_score >= 0.4 {
            analysis.push_str(
                "💡 Moderate match. Study the missing skills and mention any related experience.",
            );
        } else {
            analysis.push_str(
                "💡 Low match. Consider upskilling in the missing areas before applying.",
            );
        }

        analysis
    }

    /// Get job by hash
    async fn get_job(&self, job_hash: &str) -> Result<JobInfo> {
        let row = sqlx::query(
            r#"
            SELECT title, description
            FROM jobs
            WHERE hash = ?
            "#,
        )
        .bind(job_hash)
        .fetch_one(&self.db)
        .await?;

        Ok(JobInfo {
            title: row.try_get("title")?,
            description: row.try_get::<Option<String>, _>("description")?.unwrap_or_default(),
        })
    }

    /// Get user skills for resume
    async fn get_user_skills(&self, resume_id: i64) -> Result<Vec<UserSkill>> {
        let rows = sqlx::query(
            r#"
            SELECT id, resume_id, skill_name, skill_category, confidence_score,
                   years_experience, proficiency_level, source
            FROM user_skills
            WHERE resume_id = ?
            ORDER BY confidence_score DESC
            "#,
        )
        .bind(resume_id)
        .fetch_all(&self.db)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| UserSkill {
                id: r.try_get::<i64, _>("id").unwrap_or(0),
                resume_id: r.try_get::<i64, _>("resume_id").unwrap_or(0),
                skill_name: r.try_get::<String, _>("skill_name").unwrap_or_default(),
                skill_category: r.try_get::<Option<String>, _>("skill_category").unwrap_or(None),
                confidence_score: r.try_get::<f64, _>("confidence_score").unwrap_or(0.0),
                years_experience: r.try_get::<Option<f64>, _>("years_experience").unwrap_or(None),
                proficiency_level: r.try_get::<Option<String>, _>("proficiency_level").unwrap_or(None),
                source: r.try_get::<String, _>("source").unwrap_or_default(),
            })
            .collect())
    }

    /// Get job skills
    async fn get_job_skills(&self, job_hash: &str) -> Result<Vec<String>> {
        let rows = sqlx::query(
            r#"
            SELECT skill_name
            FROM job_skills
            WHERE job_hash = ?
            ORDER BY is_required DESC, skill_name ASC
            "#,
        )
        .bind(job_hash)
        .fetch_all(&self.db)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| r.try_get::<String, _>("skill_name").unwrap_or_default())
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();

        // Create schema inline for tests
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hash TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                url TEXT NOT NULL,
                location TEXT,
                description TEXT,
                score REAL,
                source TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS resumes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                parsed_text TEXT,
                is_active INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS user_skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resume_id INTEGER NOT NULL,
                skill_name TEXT NOT NULL,
                skill_category TEXT,
                confidence_score REAL NOT NULL DEFAULT 0.0,
                years_experience REAL,
                proficiency_level TEXT,
                source TEXT NOT NULL DEFAULT 'resume',
                UNIQUE(resume_id, skill_name)
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
                is_required INTEGER NOT NULL DEFAULT 1,
                skill_category TEXT,
                UNIQUE(job_hash, skill_name)
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    async fn create_test_job(pool: &SqlitePool, job_hash: &str) {
        sqlx::query(
            r#"
            INSERT INTO jobs (hash, title, company, location, description, url, score, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(job_hash)
        .bind("Software Engineer")
        .bind("TechCorp")
        .bind("Remote")
        .bind("Looking for Python and React developer")
        .bind("https://example.com/job")
        .bind(0.9)
        .bind("greenhouse")
        .execute(pool)
        .await
        .unwrap();
    }

    async fn create_test_resume_with_skills(pool: &SqlitePool) -> i64 {
        let result = sqlx::query(
            r#"
            INSERT INTO resumes (name, file_path, parsed_text, is_active)
            VALUES (?, ?, ?, 1)
            "#,
        )
        .bind("Test Resume")
        .bind("/tmp/test.pdf")
        .bind("Python, JavaScript, Docker experience")
        .execute(pool)
        .await
        .unwrap();
        let resume_id = result.last_insert_rowid();

        // Add user skills
        for skill in &["Python", "JavaScript", "Docker"] {
            sqlx::query(
                r#"
                INSERT INTO user_skills (resume_id, skill_name, skill_category, confidence_score, source)
                VALUES (?, ?, ?, ?, ?)
                "#,
            )
            .bind(resume_id)
            .bind(*skill)
            .bind("programming_language")
            .bind(0.9)
            .bind("resume")
            .execute(pool)
            .await
            .unwrap();
        }

        resume_id
    }

    #[tokio::test]
    async fn test_extract_job_skills() {
        let pool = setup_test_db().await;
        let matcher = JobMatcher::new(pool.clone());

        let job_hash = "test_job_123";
        create_test_job(&pool, job_hash).await;

        let skills = matcher.extract_job_skills(job_hash).await.unwrap();

        assert!(skills.contains(&"Python".to_string()));
        assert!(skills.contains(&"React".to_string()));
    }

    #[tokio::test]
    async fn test_calculate_match() {
        let pool = setup_test_db().await;
        let matcher = JobMatcher::new(pool.clone());

        let job_hash = "test_job_456";
        create_test_job(&pool, job_hash).await;
        let resume_id = create_test_resume_with_skills(&pool).await;

        // Extract job skills first
        matcher.extract_job_skills(job_hash).await.unwrap();

        // Calculate match
        let match_result = matcher.calculate_match(resume_id, job_hash).await.unwrap();

        assert!(match_result.overall_match_score > 0.0);
        assert!(!match_result.matching_skills.is_empty());
    }

    #[tokio::test]
    async fn test_gap_analysis() {
        let matcher = JobMatcher::new(SqlitePool::connect("sqlite::memory:").await.unwrap());

        let matching = vec!["Python".to_string(), "JavaScript".to_string()];
        let missing = vec!["React".to_string(), "TypeScript".to_string()];

        let analysis = matcher.generate_gap_analysis(&matching, &missing, 0.5);

        assert!(analysis.contains("50%"));
        assert!(analysis.contains("Python"));
        assert!(analysis.contains("JavaScript"));
        assert!(analysis.contains("React"));
        assert!(analysis.contains("TypeScript"));
        assert!(analysis.contains("Matching Skills (2)"));
        assert!(analysis.contains("Missing Skills (2)"));
    }

    #[tokio::test]
    async fn test_match_score_calculation() {
        let pool = setup_test_db().await;
        let matcher = JobMatcher::new(pool.clone());

        let job_hash = "test_job_789";
        create_test_job(&pool, job_hash).await;
        let resume_id = create_test_resume_with_skills(&pool).await;

        // Add job skills manually for precise testing
        for skill in &["Python", "JavaScript", "TypeScript", "React"] {
            sqlx::query(
                "INSERT INTO job_skills (job_hash, skill_name, is_required, skill_category) VALUES (?, ?, 1, ?)",
            )
            .bind(job_hash)
            .bind(*skill)
            .bind("programming_language")
            .execute(&pool)
            .await
            .unwrap();
        }

        let match_result = matcher.calculate_match(resume_id, job_hash).await.unwrap();

        // User has Python, JavaScript (2/4 = 50%)
        assert_eq!(match_result.skills_match_score, Some(0.5));
        assert_eq!(match_result.matching_skills.len(), 2);
        assert_eq!(match_result.missing_skills.len(), 2);
    }

    #[tokio::test]
    async fn test_calculate_match_no_job_skills() {
        let pool = setup_test_db().await;
        let matcher = JobMatcher::new(pool.clone());

        let job_hash = "test_job_no_skills";
        create_test_job(&pool, job_hash).await;
        let resume_id = create_test_resume_with_skills(&pool).await;

        // Don't add any job skills
        let match_result = matcher.calculate_match(resume_id, job_hash).await.unwrap();

        // No required skills = 100% match
        assert_eq!(match_result.skills_match_score, Some(1.0));
        assert_eq!(match_result.overall_match_score, 1.0);
        assert_eq!(match_result.matching_skills.len(), 0);
        assert_eq!(match_result.missing_skills.len(), 0);
    }

    #[tokio::test]
    async fn test_calculate_match_no_user_skills() {
        let pool = setup_test_db().await;
        let matcher = JobMatcher::new(pool.clone());

        let job_hash = "test_job_user_no_skills";
        create_test_job(&pool, job_hash).await;

        // Create resume without skills
        let result = sqlx::query(
            r#"
            INSERT INTO resumes (name, file_path, parsed_text, is_active)
            VALUES (?, ?, ?, 1)
            "#,
        )
        .bind("Empty Resume")
        .bind("/tmp/empty.pdf")
        .bind("No skills here")
        .execute(&pool)
        .await
        .unwrap();
        let resume_id = result.last_insert_rowid();

        // Add job skills
        sqlx::query("INSERT INTO job_skills (job_hash, skill_name, is_required) VALUES (?, ?, 1)")
            .bind(job_hash)
            .bind("Python")
            .execute(&pool)
            .await
            .unwrap();

        let match_result = matcher.calculate_match(resume_id, job_hash).await.unwrap();

        // User has no skills = 0% match
        assert_eq!(match_result.skills_match_score, Some(0.0));
        assert_eq!(match_result.matching_skills.len(), 0);
        assert_eq!(match_result.missing_skills.len(), 1);
    }

    #[tokio::test]
    async fn test_gap_analysis_strong_match() {
        let matcher = JobMatcher::new(SqlitePool::connect("sqlite::memory:").await.unwrap());

        let matching = vec!["Python".to_string(), "JavaScript".to_string(), "React".to_string()];
        let missing = vec!["TypeScript".to_string()];

        let analysis = matcher.generate_gap_analysis(&matching, &missing, 0.85);

        assert!(analysis.contains("85%"));
        assert!(analysis.contains("Strong match"));
        assert!(analysis.contains("Apply immediately"));
    }

    #[tokio::test]
    async fn test_gap_analysis_good_match() {
        let matcher = JobMatcher::new(SqlitePool::connect("sqlite::memory:").await.unwrap());

        let matching = vec!["Python".to_string(), "JavaScript".to_string()];
        let missing = vec!["React".to_string()];

        let analysis = matcher.generate_gap_analysis(&matching, &missing, 0.67);

        assert!(analysis.contains("67%"));
        assert!(analysis.contains("Good match"));
        assert!(analysis.contains("transferable skills"));
    }

    #[tokio::test]
    async fn test_gap_analysis_moderate_match() {
        let matcher = JobMatcher::new(SqlitePool::connect("sqlite::memory:").await.unwrap());

        let matching = vec!["Python".to_string()];
        let missing = vec!["JavaScript".to_string(), "React".to_string()];

        let analysis = matcher.generate_gap_analysis(&matching, &missing, 0.5);

        assert!(analysis.contains("50%"));
        assert!(analysis.contains("Moderate match"));
        assert!(analysis.contains("missing skills"));
    }

    #[tokio::test]
    async fn test_gap_analysis_low_match() {
        let matcher = JobMatcher::new(SqlitePool::connect("sqlite::memory:").await.unwrap());

        let matching = vec![];
        let missing = vec![
            "Python".to_string(),
            "JavaScript".to_string(),
            "React".to_string(),
        ];

        let analysis = matcher.generate_gap_analysis(&matching, &missing, 0.2);

        assert!(analysis.contains("20%"));
        assert!(analysis.contains("Low match"));
        assert!(analysis.contains("upskilling"));
    }

    #[tokio::test]
    async fn test_gap_analysis_empty_skills() {
        let matcher = JobMatcher::new(SqlitePool::connect("sqlite::memory:").await.unwrap());

        let analysis = matcher.generate_gap_analysis(&[], &[], 1.0);

        assert!(analysis.contains("100%"));
        assert!(analysis.contains("Strong match"));
    }

    #[tokio::test]
    async fn test_get_job_missing() {
        let pool = setup_test_db().await;
        let matcher = JobMatcher::new(pool.clone());

        let result = matcher.get_job("nonexistent_job").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_get_user_skills_empty() {
        let pool = setup_test_db().await;
        let matcher = JobMatcher::new(pool.clone());

        // Create resume without skills
        let result = sqlx::query(
            "INSERT INTO resumes (name, file_path, is_active) VALUES (?, ?, 1)"
        )
        .bind("Empty Resume")
        .bind("/tmp/empty.pdf")
        .execute(&pool)
        .await
        .unwrap();
        let resume_id = result.last_insert_rowid();

        let skills = matcher.get_user_skills(resume_id).await.unwrap();
        assert_eq!(skills.len(), 0);
    }

    #[tokio::test]
    async fn test_get_job_skills_empty() {
        let pool = setup_test_db().await;
        let matcher = JobMatcher::new(pool.clone());

        let job_hash = "job_no_skills";
        create_test_job(&pool, job_hash).await;

        let skills = matcher.get_job_skills(job_hash).await.unwrap();
        assert_eq!(skills.len(), 0);
    }

    #[tokio::test]
    async fn test_extract_job_skills_duplicate_prevention() {
        let pool = setup_test_db().await;
        let matcher = JobMatcher::new(pool.clone());

        let job_hash = "test_job_duplicates";
        create_test_job(&pool, job_hash).await;

        // Extract skills twice
        let skills1 = matcher.extract_job_skills(job_hash).await.unwrap();
        let skills2 = matcher.extract_job_skills(job_hash).await.unwrap();

        // Should not create duplicates due to UNIQUE constraint
        assert_eq!(skills1.len(), skills2.len());

        // Verify in database
        let rows = sqlx::query("SELECT COUNT(*) as count FROM job_skills WHERE job_hash = ?")
            .bind(job_hash)
            .fetch_one(&pool)
            .await
            .unwrap();
        let count: i64 = rows.try_get("count").unwrap();
        assert_eq!(count as usize, skills1.len());
    }

    #[tokio::test]
    async fn test_case_insensitive_skill_matching() {
        let pool = setup_test_db().await;
        let matcher = JobMatcher::new(pool.clone());

        let job_hash = "test_job_case";
        create_test_job(&pool, job_hash).await;

        // Create resume with lowercase skills
        let result = sqlx::query(
            "INSERT INTO resumes (name, file_path, is_active) VALUES (?, ?, 1)"
        )
        .bind("Test Resume")
        .bind("/tmp/test.pdf")
        .execute(&pool)
        .await
        .unwrap();
        let resume_id = result.last_insert_rowid();

        sqlx::query(
            "INSERT INTO user_skills (resume_id, skill_name, confidence_score, source) VALUES (?, ?, ?, ?)"
        )
        .bind(resume_id)
        .bind("python") // lowercase
        .bind(0.9)
        .bind("resume")
        .execute(&pool)
        .await
        .unwrap();

        // Add job skill with different case
        sqlx::query("INSERT INTO job_skills (job_hash, skill_name, is_required) VALUES (?, ?, 1)")
            .bind(job_hash)
            .bind("Python") // capitalized
            .execute(&pool)
            .await
            .unwrap();

        let match_result = matcher.calculate_match(resume_id, job_hash).await.unwrap();

        // Should match despite case difference
        assert_eq!(match_result.matching_skills.len(), 1);
        assert_eq!(match_result.skills_match_score, Some(1.0));
    }

    #[tokio::test]
    async fn test_get_job_with_null_description() {
        let pool = setup_test_db().await;
        let matcher = JobMatcher::new(pool.clone());

        let job_hash = "test_job_null_desc";

        // Create job with NULL description
        sqlx::query(
            r#"
            INSERT INTO jobs (hash, title, company, url, description, score, source)
            VALUES (?, ?, ?, ?, NULL, ?, ?)
            "#,
        )
        .bind(job_hash)
        .bind("Software Engineer")
        .bind("TechCorp")
        .bind("https://example.com/job")
        .bind(0.9)
        .bind("greenhouse")
        .execute(&pool)
        .await
        .unwrap();

        let job = matcher.get_job(job_hash).await.unwrap();
        assert_eq!(job.description, ""); // Should default to empty string
    }

    #[tokio::test]
    async fn test_user_skills_with_all_optional_fields() {
        let pool = setup_test_db().await;
        let matcher = JobMatcher::new(pool.clone());

        let result = sqlx::query(
            "INSERT INTO resumes (name, file_path, is_active) VALUES (?, ?, 1)"
        )
        .bind("Test Resume")
        .bind("/tmp/test.pdf")
        .execute(&pool)
        .await
        .unwrap();
        let resume_id = result.last_insert_rowid();

        // Insert skill with all optional fields populated
        sqlx::query(
            r#"
            INSERT INTO user_skills
            (resume_id, skill_name, skill_category, confidence_score, years_experience, proficiency_level, source)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(resume_id)
        .bind("Python")
        .bind("programming_language")
        .bind(0.95)
        .bind(5.5)
        .bind("expert")
        .bind("resume")
        .execute(&pool)
        .await
        .unwrap();

        let skills = matcher.get_user_skills(resume_id).await.unwrap();
        assert_eq!(skills.len(), 1);

        let skill = &skills[0];
        assert_eq!(skill.skill_name, "Python");
        assert_eq!(skill.skill_category, Some("programming_language".to_string()));
        assert_eq!(skill.confidence_score, 0.95);
        assert_eq!(skill.years_experience, Some(5.5));
        assert_eq!(skill.proficiency_level, Some("expert".to_string()));
    }
}
