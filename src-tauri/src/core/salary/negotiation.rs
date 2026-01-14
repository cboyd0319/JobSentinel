//! Negotiation Script Generator
//!
//! Generates personalized negotiation scripts based on templates and parameters.

use anyhow::Result;
use sqlx::{Row, SqlitePool};
use std::collections::HashMap;

/// Negotiation script generator
pub struct NegotiationScriptGenerator {
    db: SqlitePool,
}

impl NegotiationScriptGenerator {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Generate negotiation script from template
    ///
    /// # Arguments
    /// * `scenario` - Template scenario (e.g., "initial_offer", "counter_offer")
    /// * `params` - Key-value pairs to fill placeholders
    pub async fn generate(
        &self,
        scenario: &str,
        params: HashMap<String, String>,
    ) -> Result<String> {
        // Get template
        let template = self.get_template(scenario).await?;

        // Replace placeholders
        let mut script = template;
        for (key, value) in params {
            let placeholder = format!("{{{{{}}}}}", key);
            script = script.replace(&placeholder, &value);
        }

        Ok(script)
    }

    /// Get template by scenario
    async fn get_template(&self, scenario: &str) -> Result<String> {
        let row = sqlx::query(
            "SELECT template_text FROM negotiation_templates WHERE scenario = ? AND is_default = 1 LIMIT 1",
        )
        .bind(scenario)
        .fetch_one(&self.db)
        .await?;

        Ok(row.try_get::<String, _>("template_text")?)
    }

    /// Get all available templates
    pub async fn get_templates(&self) -> Result<Vec<(String, String)>> {
        let rows = sqlx::query(
            "SELECT template_name, scenario FROM negotiation_templates ORDER BY is_default DESC, template_name ASC",
        )
        .fetch_all(&self.db)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| {
                (
                    r.try_get::<String, _>("template_name").unwrap_or_default(),
                    r.try_get::<String, _>("scenario").unwrap_or_default(),
                )
            })
            .collect())
    }

    /// Add custom template
    pub async fn add_template(
        &self,
        name: &str,
        scenario: &str,
        template_text: &str,
        placeholders: Vec<String>,
    ) -> Result<()> {
        let placeholders_json = serde_json::to_string(&placeholders)?;

        sqlx::query(
            r#"
            INSERT INTO negotiation_templates (template_name, scenario, template_text, placeholders, is_default)
            VALUES (?, ?, ?, ?, 0)
            "#,
        )
        .bind(name)
        .bind(scenario)
        .bind(template_text)
        .bind(&placeholders_json)
        .execute(&self.db)
        .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_placeholder_replacement() {
        let template = "Hello {{name}}, your salary is {{salary}}.";
        let mut params = HashMap::new();
        params.insert("name".to_string(), "John".to_string());
        params.insert("salary".to_string(), "$150,000".to_string());

        let mut result = template.to_string();
        for (key, value) in params {
            let placeholder = format!("{{{{{}}}}}", key);
            result = result.replace(&placeholder, &value);
        }

        assert_eq!(result, "Hello John, your salary is $150,000.");
    }
}
