//! Resume-Job Matching Algorithm
//!
//! Compares resume skills against job requirements and generates match scores.

use super::skills::{ExtractedSkill, SkillExtractor};
use super::{MatchResult, UserSkill};
use crate::core::db::Job;
use anyhow::Result;
use chrono::Utc;
use sqlx::SqlitePool;
use std::collections::HashSet;

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
            sqlx::query!(
                r#"
                INSERT INTO job_skills (job_hash, skill_name, is_required, skill_category)
                VALUES (?, ?, 1, ?)
                ON CONFLICT(job_hash, skill_name) DO UPDATE SET
                    skill_category = excluded.skill_category
                "#,
                job_hash,
                skill.skill_name,
                skill.skill_category
            )
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
    async fn get_job(&self, job_hash: &str) -> Result<Job> {
        let record = sqlx::query!(
            r#"
            SELECT hash, title, company, location, description, url, score, found_at, source
            FROM jobs
            WHERE hash = ?
            "#,
            job_hash
        )
        .fetch_one(&self.db)
        .await?;

        Ok(Job {
            hash: record.hash,
            title: record.title,
            company: record.company,
            location: record.location.unwrap_or_default(),
            description: record.description,
            url: record.url,
            score: record.score,
            found_at: chrono::DateTime::parse_from_rfc3339(&record.found_at)?
                .with_timezone(&Utc),
            source: record.source,
        })
    }

    /// Get user skills for resume
    async fn get_user_skills(&self, resume_id: i64) -> Result<Vec<UserSkill>> {
        let records = sqlx::query!(
            r#"
            SELECT id, resume_id, skill_name, skill_category, confidence_score,
                   years_experience, proficiency_level, source
            FROM user_skills
            WHERE resume_id = ?
            ORDER BY confidence_score DESC
            "#,
            resume_id
        )
        .fetch_all(&self.db)
        .await?;

        Ok(records
            .into_iter()
            .map(|r| UserSkill {
                id: r.id,
                resume_id: r.resume_id,
                skill_name: r.skill_name,
                skill_category: r.skill_category,
                confidence_score: r.confidence_score,
                years_experience: r.years_experience,
                proficiency_level: r.proficiency_level,
                source: r.source,
            })
            .collect())
    }

    /// Get job skills
    async fn get_job_skills(&self, job_hash: &str) -> Result<Vec<String>> {
        let records = sqlx::query!(
            r#"
            SELECT skill_name
            FROM job_skills
            WHERE job_hash = ?
            ORDER BY is_required DESC, skill_name ASC
            "#,
            job_hash
        )
        .fetch_all(&self.db)
        .await?;

        Ok(records.into_iter().map(|r| r.skill_name).collect())
    }
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

    async fn create_test_job(pool: &SqlitePool, job_hash: &str) {
        sqlx::query!(
            r#"
            INSERT INTO jobs (hash, title, company, location, description, url, score, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            job_hash,
            "Software Engineer",
            "TechCorp",
            "Remote",
            "Looking for Python and React developer",
            "https://example.com/job",
            0.9,
            "greenhouse"
        )
        .execute(pool)
        .await
        .unwrap();
    }

    async fn create_test_resume_with_skills(pool: &SqlitePool) -> i64 {
        let resume_id = sqlx::query!(
            r#"
            INSERT INTO resumes (name, file_path, parsed_text, is_active)
            VALUES (?, ?, ?, 1)
            "#,
            "Test Resume",
            "/tmp/test.pdf",
            "Python, JavaScript, Docker experience"
        )
        .execute(pool)
        .await
        .unwrap()
        .last_insert_rowid();

        // Add user skills
        for skill in &["Python", "JavaScript", "Docker"] {
            sqlx::query!(
                r#"
                INSERT INTO user_skills (resume_id, skill_name, skill_category, confidence_score, source)
                VALUES (?, ?, ?, ?, ?)
                "#,
                resume_id,
                skill,
                "programming_language",
                0.9,
                "resume"
            )
            .execute(pool)
            .await
            .unwrap();
        }

        resume_id
    }

    #[tokio::test]
    async fn test_extract_job_skills() {
        let (pool, _temp_dir) = setup_test_db().await;
        let matcher = JobMatcher::new(pool.clone());

        let job_hash = "test_job_123";
        create_test_job(&pool, job_hash).await;

        let skills = matcher.extract_job_skills(job_hash).await.unwrap();

        assert!(skills.contains(&"Python".to_string()));
        assert!(skills.contains(&"React".to_string()));
    }

    #[tokio::test]
    async fn test_calculate_match() {
        let (pool, _temp_dir) = setup_test_db().await;
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
        let (pool, _temp_dir) = setup_test_db().await;
        let matcher = JobMatcher::new(pool.clone());

        let job_hash = "test_job_789";
        create_test_job(&pool, job_hash).await;
        let resume_id = create_test_resume_with_skills(&pool).await;

        // Add job skills manually for precise testing
        for skill in &["Python", "JavaScript", "TypeScript", "React"] {
            sqlx::query!(
                "INSERT INTO job_skills (job_hash, skill_name, is_required, skill_category) VALUES (?, ?, 1, ?)",
                job_hash,
                skill,
                "programming_language"
            )
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
}
