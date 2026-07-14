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
}

#[cfg(test)]
mod tests;
