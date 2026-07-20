//! SQL-backed resume workflow facade.

use jobsentinel_storage::Database;
use std::io::Read;
use std::path::Path;

#[cfg(feature = "embedded-ml")]
mod semantic;

pub use jobsentinel_storage::resume::*;
#[cfg(feature = "embedded-ml")]
pub use semantic::{match_resume_semantic, EvidenceBoundSemanticMatch};

pub const MAX_RESUME_FILE_BYTES: u64 = 10 * 1024 * 1024;

#[derive(Debug, thiserror::Error)]
pub enum ActiveResumeAnalysisError {
    #[error("active resume not found")]
    Missing,
    #[error("active resume has no readable text")]
    Unreadable,
    #[error("active resume changed during analysis")]
    Changed,
    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

#[derive(Debug, PartialEq, Eq)]
struct ActiveResumeAnalysisContext {
    resume_id: i64,
    name: String,
    file_path: String,
    parsed_text: String,
    revision: chrono::DateTime<chrono::Utc>,
    skill_names: Vec<String>,
    source_text: Option<String>,
}

async fn load_active_resume_analysis_context(
    database: &Database,
) -> Result<ActiveResumeAnalysisContext, ActiveResumeAnalysisError> {
    let matcher = database.resume_matcher();
    let resume = matcher
        .get_active_resume()
        .await?
        .ok_or(ActiveResumeAnalysisError::Missing)?;
    let skill_names = matcher
        .get_user_skills(resume.id)
        .await?
        .into_iter()
        .map(|skill| skill.skill_name)
        .collect();
    let current = matcher
        .get_active_resume()
        .await?
        .ok_or(ActiveResumeAnalysisError::Changed)?;
    if resume.id != current.id
        || resume.name != current.name
        || resume.file_path != current.file_path
        || resume.parsed_text != current.parsed_text
        || resume.updated_at != current.updated_at
    {
        return Err(ActiveResumeAnalysisError::Changed);
    }
    let parsed_text = resume
        .parsed_text
        .filter(|text| !text.trim().is_empty())
        .ok_or(ActiveResumeAnalysisError::Unreadable)?;
    let source_text = read_html_resume_source_for_format_review(&resume.file_path);
    Ok(ActiveResumeAnalysisContext {
        resume_id: resume.id,
        name: resume.name,
        file_path: resume.file_path,
        parsed_text,
        revision: resume.updated_at,
        skill_names,
        source_text,
    })
}

async fn ensure_active_resume_analysis_context(
    database: &Database,
    expected: &ActiveResumeAnalysisContext,
) -> Result<(), ActiveResumeAnalysisError> {
    match load_active_resume_analysis_context(database).await {
        Ok(current) if &current == expected => Ok(()),
        Ok(_) | Err(ActiveResumeAnalysisError::Missing | ActiveResumeAnalysisError::Unreadable) => {
            Err(ActiveResumeAnalysisError::Changed)
        }
        Err(error) => Err(error),
    }
}

pub async fn analyze_active_resume_for_job(
    database: &Database,
    job_description: &str,
) -> Result<AtsAnalysisResult, ActiveResumeAnalysisError> {
    let context = load_active_resume_analysis_context(database).await?;
    let evidence_snapshot = ResumeEvidenceSnapshot {
        source_id: format!("resume:{}", context.resume_id),
        revision: context.revision.to_rfc3339(),
    };
    let result = AtsAnalyzer::analyze_text_for_job_with_source_and_snapshot(
        context.parsed_text.trim(),
        &context.skill_names,
        job_description,
        context.source_text.as_deref(),
        &evidence_snapshot,
    );
    ensure_active_resume_analysis_context(database, &context).await?;
    Ok(result)
}

fn read_html_resume_source_for_format_review(file_path: &str) -> Option<String> {
    let path = Path::new(file_path);
    let extension = path.extension()?.to_str()?.to_ascii_lowercase();
    if !matches!(extension.as_str(), "html" | "htm") {
        return None;
    }
    let file = std::fs::File::open(path).ok()?;
    let metadata = file.metadata().ok()?;
    if !metadata.is_file() || metadata.len() > MAX_RESUME_FILE_BYTES {
        return None;
    }
    read_bounded_resume_source(file)
}

fn read_bounded_resume_source(file: std::fs::File) -> Option<String> {
    let mut bytes = Vec::new();
    file.take(MAX_RESUME_FILE_BYTES + 1)
        .read_to_end(&mut bytes)
        .ok()?;
    if bytes.len() > MAX_RESUME_FILE_BYTES as usize {
        return None;
    }
    String::from_utf8(bytes).ok()
}

#[cfg(test)]
mod active_analysis_tests {
    use super::*;
    use jobsentinel_storage::Database;

    async fn saved_resume(
        database: &Database,
        directory: &tempfile::TempDir,
        name: &str,
        text: &str,
    ) -> i64 {
        let path = directory.path().join(format!("{name}.txt"));
        std::fs::write(&path, text).unwrap();
        database
            .resume_matcher()
            .upload_resume(name, path.to_str().unwrap())
            .await
            .unwrap()
    }

    #[test]
    fn html_resume_source_is_available_only_for_bounded_format_review() {
        let directory = tempfile::tempdir().unwrap();
        let html_path = directory.path().join("Private Resume.html");
        let text_path = directory.path().join("Private Resume.txt");
        let oversized_path = directory.path().join("Private Large Resume.html");
        std::fs::write(&html_path, "<html><body>Jordan Lee</body></html>").unwrap();
        std::fs::write(&text_path, "Jordan Lee").unwrap();
        std::fs::File::create(&oversized_path)
            .unwrap()
            .set_len(MAX_RESUME_FILE_BYTES + 1)
            .unwrap();

        let source = read_html_resume_source_for_format_review(&html_path.to_string_lossy())
            .expect("HTML source should be available for local format review");

        assert!(source.contains("Jordan Lee"));
        assert!(read_html_resume_source_for_format_review(&text_path.to_string_lossy()).is_none());
        assert!(
            read_html_resume_source_for_format_review(&oversized_path.to_string_lossy()).is_none()
        );
        assert!(
            read_bounded_resume_source(std::fs::File::open(&oversized_path).unwrap()).is_none()
        );
    }

    #[tokio::test]
    async fn active_analysis_context_rejects_html_source_change() {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("resume.html");
        std::fs::write(&path, "<html><body>Rust</body></html>").unwrap();
        database
            .resume_matcher()
            .upload_resume("resume", path.to_str().unwrap())
            .await
            .unwrap();
        let context = load_active_resume_analysis_context(&database)
            .await
            .unwrap();

        std::fs::write(&path, "<html><body>TypeScript</body></html>").unwrap();

        assert!(matches!(
            ensure_active_resume_analysis_context(&database, &context).await,
            Err(ActiveResumeAnalysisError::Changed)
        ));
    }

    #[tokio::test]
    async fn active_saved_resume_analysis_returns_current_evidence() {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        let directory = tempfile::tempdir().unwrap();
        saved_resume(&database, &directory, "resume", "Skills\nRust").await;

        let result = analyze_active_resume_for_job(&database, "Required\nRust")
            .await
            .unwrap();

        assert!(result
            .requirement_reviews
            .iter()
            .any(|review| !review.evidence_citations.is_empty()));
    }

    #[tokio::test]
    async fn active_saved_resume_analysis_preserves_missing_and_unreadable_states() {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        assert!(matches!(
            analyze_active_resume_for_job(&database, "Required\nRust").await,
            Err(ActiveResumeAnalysisError::Missing)
        ));

        let directory = tempfile::tempdir().unwrap();
        saved_resume(&database, &directory, "empty", "").await;
        assert!(matches!(
            analyze_active_resume_for_job(&database, "Required\nRust").await,
            Err(ActiveResumeAnalysisError::Unreadable)
        ));
    }

    #[tokio::test]
    async fn active_analysis_context_rejects_skill_mutation_and_reextraction() {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        let directory = tempfile::tempdir().unwrap();
        let resume_id = saved_resume(&database, &directory, "resume", "Skills\nRust").await;
        let matcher = database.resume_matcher();
        let context = load_active_resume_analysis_context(&database)
            .await
            .unwrap();

        matcher
            .add_user_skill(
                resume_id,
                NewSkill {
                    skill_name: "TypeScript".to_string(),
                    skill_category: None,
                    proficiency_level: None,
                    years_experience: None,
                },
            )
            .await
            .unwrap();
        assert!(matches!(
            ensure_active_resume_analysis_context(&database, &context).await,
            Err(ActiveResumeAnalysisError::Changed)
        ));

        let context = load_active_resume_analysis_context(&database)
            .await
            .unwrap();
        matcher.extract_skills(resume_id).await.unwrap();
        assert!(matches!(
            ensure_active_resume_analysis_context(&database, &context).await,
            Err(ActiveResumeAnalysisError::Changed)
        ));
    }

    #[tokio::test]
    async fn active_analysis_context_rejects_selection_change_and_deletion() {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        let directory = tempfile::tempdir().unwrap();
        let first_id = saved_resume(&database, &directory, "first", "Skills\nRust").await;
        let matcher = database.resume_matcher();
        matcher.set_active_resume(first_id).await.unwrap();
        let first_context = load_active_resume_analysis_context(&database)
            .await
            .unwrap();
        let second_id = saved_resume(&database, &directory, "second", "Skills\nTypeScript").await;

        matcher.set_active_resume(second_id).await.unwrap();
        assert!(matches!(
            ensure_active_resume_analysis_context(&database, &first_context).await,
            Err(ActiveResumeAnalysisError::Changed)
        ));

        let second_context = load_active_resume_analysis_context(&database)
            .await
            .unwrap();
        matcher.delete_resume(second_id).await.unwrap();
        assert!(matches!(
            ensure_active_resume_analysis_context(&database, &second_context).await,
            Err(ActiveResumeAnalysisError::Changed)
        ));
    }
}
