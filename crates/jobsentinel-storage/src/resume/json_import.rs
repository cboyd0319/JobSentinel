use anyhow::{Context, Result};

use super::{builder, json_resume, ResumeMatcher};

impl ResumeMatcher {
    /// Import a JSON Resume document as a local resume draft.
    pub async fn import_json_resume(&self, _name: String, json_string: &str) -> Result<i64> {
        let resume = json_resume::JsonResume::from_json(json_string)
            .context("Failed to parse JSON Resume")?
            .to_structured_resume()
            .context("Failed to convert JSON Resume to internal format")?;

        let builder = builder::ResumeBuilder::new(self.db.clone());
        let resume_id = builder.create_resume().await?;
        builder.replace_content(resume_id, resume).await?;

        tracing::info!(resume_id, "Imported JSON Resume as draft");
        Ok(resume_id)
    }
}
