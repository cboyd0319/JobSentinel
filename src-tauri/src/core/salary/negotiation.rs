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

    #[test]
    fn test_placeholder_replacement_multiple() {
        let template = "Dear {{recruiter}}, thank you for the {{amount}} offer for the {{position}} role at {{company}}.";
        let mut params = HashMap::new();
        params.insert("recruiter".to_string(), "Sarah".to_string());
        params.insert("amount".to_string(), "$160,000".to_string());
        params.insert("position".to_string(), "Senior Software Engineer".to_string());
        params.insert("company".to_string(), "TechCorp".to_string());

        let mut result = template.to_string();
        for (key, value) in params {
            let placeholder = format!("{{{{{}}}}}", key);
            result = result.replace(&placeholder, &value);
        }

        assert_eq!(
            result,
            "Dear Sarah, thank you for the $160,000 offer for the Senior Software Engineer role at TechCorp."
        );
    }

    #[test]
    fn test_placeholder_replacement_no_placeholders() {
        let template = "This is a plain text template.";
        let params: HashMap<String, String> = HashMap::new();

        let mut result = template.to_string();
        for (key, value) in &params {
            let placeholder = format!("{{{{{}}}}}", key);
            result = result.replace(&placeholder, value);
        }

        assert_eq!(result, "This is a plain text template.");
    }

    #[test]
    fn test_placeholder_replacement_unused_params() {
        let template = "Hello {{name}}.";
        let mut params = HashMap::new();
        params.insert("name".to_string(), "Alice".to_string());
        params.insert("unused".to_string(), "value".to_string());

        let mut result = template.to_string();
        for (key, value) in params {
            let placeholder = format!("{{{{{}}}}}", key);
            result = result.replace(&placeholder, &value);
        }

        assert_eq!(result, "Hello Alice.");
    }

    #[test]
    fn test_placeholder_replacement_missing_params() {
        let template = "Hello {{name}}, you are {{age}} years old.";
        let mut params = HashMap::new();
        params.insert("name".to_string(), "Bob".to_string());

        let mut result = template.to_string();
        for (key, value) in params {
            let placeholder = format!("{{{{{}}}}}", key);
            result = result.replace(&placeholder, &value);
        }

        // Age placeholder remains unreplaced
        assert_eq!(result, "Hello Bob, you are {{age}} years old.");
    }

    #[test]
    fn test_placeholder_replacement_empty_values() {
        let template = "Hello {{name}}, your title is {{title}}.";
        let mut params = HashMap::new();
        params.insert("name".to_string(), "Charlie".to_string());
        params.insert("title".to_string(), "".to_string());

        let mut result = template.to_string();
        for (key, value) in params {
            let placeholder = format!("{{{{{}}}}}", key);
            result = result.replace(&placeholder, &value);
        }

        assert_eq!(result, "Hello Charlie, your title is .");
    }

    #[test]
    fn test_placeholder_format() {
        // Test that we generate the correct placeholder format
        let key = "name";
        let placeholder = format!("{{{{{}}}}}", key);
        assert_eq!(placeholder, "{{name}}");

        let key = "salary";
        let placeholder = format!("{{{{{}}}}}", key);
        assert_eq!(placeholder, "{{salary}}");
    }

    #[test]
    fn test_placeholder_replacement_special_characters() {
        let template = "Your salary of {{amount}} is {{percentage}}% above market.";
        let mut params = HashMap::new();
        params.insert("amount".to_string(), "$150,000".to_string());
        params.insert("percentage".to_string(), "15".to_string());

        let mut result = template.to_string();
        for (key, value) in params {
            let placeholder = format!("{{{{{}}}}}", key);
            result = result.replace(&placeholder, &value);
        }

        assert_eq!(result, "Your salary of $150,000 is 15% above market.");
    }

    #[test]
    fn test_placeholder_replacement_case_sensitive() {
        let template = "Hello {{name}} and {{Name}}.";
        let mut params = HashMap::new();
        params.insert("name".to_string(), "lowercase".to_string());
        params.insert("Name".to_string(), "Capitalized".to_string());

        let mut result = template.to_string();
        for (key, value) in params {
            let placeholder = format!("{{{{{}}}}}", key);
            result = result.replace(&placeholder, &value);
        }

        assert_eq!(result, "Hello lowercase and Capitalized.");
    }

    #[test]
    fn test_negotiation_script_template_structure() {
        // Test a realistic negotiation script template
        let template = r#"Dear {{recruiter_name}},

Thank you for extending the offer for the {{position}} role. After careful consideration and market research, I would like to discuss the compensation package.

Based on my {{years_experience}} years of experience and market data for similar roles in {{location}}, I was expecting a base salary in the range of {{expected_min}}-{{expected_max}}.

Current offer: {{current_offer}}
Market median: {{market_median}}
Requested salary: {{requested_salary}}

I am very excited about this opportunity and believe I can bring significant value to the team. Would you be open to discussing this further?

Best regards,
{{candidate_name}}"#;

        let mut params = HashMap::new();
        params.insert("recruiter_name".to_string(), "Sarah Johnson".to_string());
        params.insert("position".to_string(), "Senior Software Engineer".to_string());
        params.insert("years_experience".to_string(), "7".to_string());
        params.insert("location".to_string(), "San Francisco, CA".to_string());
        params.insert("expected_min".to_string(), "$180,000".to_string());
        params.insert("expected_max".to_string(), "$210,000".to_string());
        params.insert("current_offer".to_string(), "$160,000".to_string());
        params.insert("market_median".to_string(), "$185,000".to_string());
        params.insert("requested_salary".to_string(), "$190,000".to_string());
        params.insert("candidate_name".to_string(), "Alex Chen".to_string());

        let mut result = template.to_string();
        for (key, value) in params {
            let placeholder = format!("{{{{{}}}}}", key);
            result = result.replace(&placeholder, &value);
        }

        assert!(result.contains("Sarah Johnson"));
        assert!(result.contains("Senior Software Engineer"));
        assert!(result.contains("7 years"));
        assert!(result.contains("San Francisco, CA"));
        assert!(result.contains("$180,000-$210,000"));
        assert!(result.contains("$160,000"));
        assert!(result.contains("$185,000"));
        assert!(result.contains("$190,000"));
        assert!(result.contains("Alex Chen"));
        assert!(!result.contains("{{"));
        assert!(!result.contains("}}"));
    }
}
