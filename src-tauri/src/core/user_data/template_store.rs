use chrono::Utc;
use tracing::{debug, instrument};
use uuid::Uuid;

use super::models::TemplateRow;
use super::{CoverLetterTemplate, TemplateCategory, UserDataManager};

impl UserDataManager {
    /// List all cover letter templates
    #[instrument(skip(self))]
    pub async fn list_templates(&self) -> Result<Vec<CoverLetterTemplate>, sqlx::Error> {
        debug!("Listing cover letter templates");

        let rows: Vec<TemplateRow> = sqlx::query_as(
            r#"
            SELECT id, name, content, category, created_at, updated_at
            FROM cover_letter_templates
            ORDER BY updated_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    /// Get a single template by ID
    #[instrument(skip(self))]
    pub async fn get_template(&self, id: &str) -> Result<Option<CoverLetterTemplate>, sqlx::Error> {
        debug!("Getting template: {}", id);

        let row: Option<TemplateRow> = sqlx::query_as(
            r#"
            SELECT id, name, content, category, created_at, updated_at
            FROM cover_letter_templates
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(Into::into))
    }

    /// Create a new template
    #[instrument(skip(self, name, content))]
    pub async fn create_template(
        &self,
        name: &str,
        content: &str,
        category: TemplateCategory,
    ) -> Result<CoverLetterTemplate, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let category_str = category.to_string();

        debug!(
            name_len = name.chars().count(),
            category = %category_str,
            "Creating template"
        );

        sqlx::query(
            r#"
            INSERT INTO cover_letter_templates (id, name, content, category, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(name)
        .bind(content)
        .bind(&category_str)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(CoverLetterTemplate {
            id,
            name: name.to_string(),
            content: content.to_string(),
            category,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    /// Update an existing template
    #[instrument(skip(self, name, content))]
    pub async fn update_template(
        &self,
        id: &str,
        name: &str,
        content: &str,
        category: TemplateCategory,
    ) -> Result<Option<CoverLetterTemplate>, sqlx::Error> {
        let now = Utc::now().to_rfc3339();
        let category_str = category.to_string();

        debug!("Updating template: {} ({})", id, category_str);

        let result = sqlx::query(
            r#"
            UPDATE cover_letter_templates
            SET name = ?, content = ?, category = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(name)
        .bind(content)
        .bind(&category_str)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Ok(None);
        }

        self.get_template(id).await
    }

    /// Delete a template
    #[instrument(skip(self))]
    pub async fn delete_template(&self, id: &str) -> Result<bool, sqlx::Error> {
        debug!("Deleting template: {}", id);

        let result = sqlx::query(
            r#"
            DELETE FROM cover_letter_templates WHERE id = ?
            "#,
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Seed default templates if none exist
    /// Called on first app launch to provide starter templates
    #[instrument(skip(self))]
    pub async fn seed_default_templates(&self) -> Result<usize, sqlx::Error> {
        let existing: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM cover_letter_templates")
            .fetch_one(&self.pool)
            .await?;

        if existing.0 > 0 {
            debug!("Templates already exist, skipping seed");
            return Ok(0);
        }

        debug!("Seeding default templates");
        let mut seeded = 0;

        let defaults = vec![
            (
                "Professional Cover Letter",
                TemplateCategory::General,
                r#"Dear {hiring_manager},

I am writing to express my strong interest in the {position} position at {company}. With {years_experience} years of experience in {skill1} and a proven track record of delivering results, I am confident I would be a valuable addition to your team.

In my current role, I have developed expertise in {skill1} and {skill2}, consistently exceeding expectations and driving measurable outcomes. I am particularly drawn to {company}'s commitment to innovation and believe my background aligns well with your team's goals.

I would welcome the opportunity to discuss how my skills and experiences can contribute to {company}'s continued success. Thank you for considering my application.

Best regards,
{your_name}"#,
            ),
            (
                "Care Coordination Cover Letter",
                TemplateCategory::Healthcare,
                r#"Dear {hiring_manager},

I am excited to apply for the {position} role at {company}. With {years_experience} years of experience supporting people through {skill1} and {skill2}, I am eager to bring calm coordination and dependable follow-through to your team.

Throughout my career, I have:
• Coordinated schedules, follow-up steps, and service updates across busy teams
• Supported clients and coworkers with clear communication and organized records
• Helped improve daily workflows so people received timely, consistent support

I am particularly impressed by {company}'s commitment to helping people and keeping services organized. I would love to contribute to your mission.

Looking forward to discussing how I can add value to your team.

Best regards,
{your_name}"#,
            ),
            (
                "Thank You - Post Interview",
                TemplateCategory::ThankYou,
                r#"Dear {hiring_manager},

Thank you for taking the time to meet with me today to discuss the {position} role at {company}. I thoroughly enjoyed our conversation and learning more about the team's goals and challenges.

Our discussion reinforced my enthusiasm for this opportunity. I was particularly excited to hear about [specific topic discussed] and believe my experience in {skill1} would allow me to make an immediate impact.

Please don't hesitate to reach out if you need any additional information. I look forward to the possibility of joining {company}.

Best regards,
{your_name}"#,
            ),
            (
                "Application Follow-Up",
                TemplateCategory::FollowUp,
                r#"Dear {hiring_manager},

I hope this message finds you well. I wanted to follow up on my application for the {position} position at {company}, which I submitted on {date}.

I remain very interested in this opportunity and believe my experience in {skill1} and {skill2} would make me a strong fit for your team. I understand you are likely reviewing many qualified candidates, but I wanted to reiterate my enthusiasm for the role.

If you need any additional information or would like to schedule a conversation, I am happy to accommodate your schedule.

Thank you for your consideration.

Best regards,
{your_name}"#,
            ),
            (
                "Interview Follow-Up (No Response)",
                TemplateCategory::FollowUp,
                r#"Dear {hiring_manager},

I wanted to follow up on our interview for the {position} position on {date}. I truly enjoyed our discussion about {company}'s vision and the team's projects.

I remain very interested in this opportunity and wanted to check in on the status of the hiring process. Please let me know if there's any additional information I can provide to support your decision.

Thank you again for considering my application. I look forward to hearing from you.

Best regards,
{your_name}"#,
            ),
            (
                "Withdraw Application",
                TemplateCategory::Withdrawal,
                r#"Dear {hiring_manager},

I hope this message finds you well. After careful consideration, I have decided to withdraw my application for the {position} position at {company}.

I want to express my sincere gratitude for your time and the opportunity to learn more about your team. This was not an easy decision, but I have accepted another opportunity that aligns more closely with my career goals at this time.

I have great respect for {company} and hope our paths may cross again in the future. Thank you again for your consideration.

Best regards,
{your_name}"#,
            ),
        ];

        for (name, category, content) in defaults {
            if let Err(e) = self.create_template(name, content, category).await {
                debug!("Failed to create template '{}': {}", name, e);
            } else {
                seeded += 1;
            }
        }

        debug!("Seeded {} default templates", seeded);
        Ok(seeded)
    }
}
