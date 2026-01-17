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
    use sqlx::sqlite::SqlitePoolOptions;

    // Helper function to create test database with schema
    async fn create_test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .connect(":memory:")
            .await
            .expect("Failed to create in-memory database");

        // Create negotiation_templates table
        sqlx::query(
            r#"
            CREATE TABLE negotiation_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_name TEXT NOT NULL,
                scenario TEXT NOT NULL,
                template_text TEXT NOT NULL,
                placeholders TEXT,
                is_default INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create table");

        pool
    }

    // Helper function to insert test template
    async fn insert_test_template(
        pool: &SqlitePool,
        name: &str,
        scenario: &str,
        template_text: &str,
        is_default: bool,
    ) {
        sqlx::query(
            r#"
            INSERT INTO negotiation_templates (template_name, scenario, template_text, placeholders, is_default)
            VALUES (?, ?, ?, '[]', ?)
            "#,
        )
        .bind(name)
        .bind(scenario)
        .bind(template_text)
        .bind(is_default as i32)
        .execute(pool)
        .await
        .expect("Failed to insert test template");
    }

    #[tokio::test]
    async fn test_generate_basic() {
        let pool = create_test_db().await;
        insert_test_template(
            &pool,
            "Basic Greeting",
            "greeting",
            "Hello {{name}}, your salary is {{salary}}.",
            true,
        )
        .await;

        let generator = NegotiationScriptGenerator::new(pool);

        let mut params = HashMap::new();
        params.insert("name".to_string(), "John".to_string());
        params.insert("salary".to_string(), "$150,000".to_string());

        let result = generator.generate("greeting", params).await.unwrap();

        assert_eq!(result, "Hello John, your salary is $150,000.");
    }

    #[tokio::test]
    async fn test_generate_multiple_placeholders() {
        let pool = create_test_db().await;
        insert_test_template(
            &pool,
            "Full Template",
            "initial_offer",
            "Dear {{recruiter}}, thank you for the {{amount}} offer for the {{position}} role at {{company}}.",
            true,
        )
        .await;

        let generator = NegotiationScriptGenerator::new(pool);

        let mut params = HashMap::new();
        params.insert("recruiter".to_string(), "Sarah".to_string());
        params.insert("amount".to_string(), "$160,000".to_string());
        params.insert(
            "position".to_string(),
            "Senior Software Engineer".to_string(),
        );
        params.insert("company".to_string(), "TechCorp".to_string());

        let result = generator.generate("initial_offer", params).await.unwrap();

        assert_eq!(
            result,
            "Dear Sarah, thank you for the $160,000 offer for the Senior Software Engineer role at TechCorp."
        );
    }

    #[tokio::test]
    async fn test_generate_no_placeholders() {
        let pool = create_test_db().await;
        insert_test_template(
            &pool,
            "Plain Text",
            "plain",
            "This is a plain text template.",
            true,
        )
        .await;

        let generator = NegotiationScriptGenerator::new(pool);

        let params: HashMap<String, String> = HashMap::new();

        let result = generator.generate("plain", params).await.unwrap();

        assert_eq!(result, "This is a plain text template.");
    }

    #[tokio::test]
    async fn test_generate_missing_params() {
        let pool = create_test_db().await;
        insert_test_template(
            &pool,
            "Missing Params",
            "missing",
            "Hello {{name}}, you are {{age}} years old.",
            true,
        )
        .await;

        let generator = NegotiationScriptGenerator::new(pool);

        let mut params = HashMap::new();
        params.insert("name".to_string(), "Bob".to_string());

        let result = generator.generate("missing", params).await.unwrap();

        // Age placeholder remains unreplaced
        assert_eq!(result, "Hello Bob, you are {{age}} years old.");
    }

    #[tokio::test]
    async fn test_generate_empty_values() {
        let pool = create_test_db().await;
        insert_test_template(
            &pool,
            "Empty Values",
            "empty",
            "Hello {{name}}, your title is {{title}}.",
            true,
        )
        .await;

        let generator = NegotiationScriptGenerator::new(pool);

        let mut params = HashMap::new();
        params.insert("name".to_string(), "Charlie".to_string());
        params.insert("title".to_string(), "".to_string());

        let result = generator.generate("empty", params).await.unwrap();

        assert_eq!(result, "Hello Charlie, your title is .");
    }

    #[tokio::test]
    async fn test_generate_special_characters() {
        let pool = create_test_db().await;
        insert_test_template(
            &pool,
            "Special Chars",
            "special",
            "Your salary of {{amount}} is {{percentage}}% above market.",
            true,
        )
        .await;

        let generator = NegotiationScriptGenerator::new(pool);

        let mut params = HashMap::new();
        params.insert("amount".to_string(), "$150,000".to_string());
        params.insert("percentage".to_string(), "15".to_string());

        let result = generator.generate("special", params).await.unwrap();

        assert_eq!(result, "Your salary of $150,000 is 15% above market.");
    }

    #[tokio::test]
    async fn test_generate_case_sensitive() {
        let pool = create_test_db().await;
        insert_test_template(
            &pool,
            "Case Sensitive",
            "case",
            "Hello {{name}} and {{Name}}.",
            true,
        )
        .await;

        let generator = NegotiationScriptGenerator::new(pool);

        let mut params = HashMap::new();
        params.insert("name".to_string(), "lowercase".to_string());
        params.insert("Name".to_string(), "Capitalized".to_string());

        let result = generator.generate("case", params).await.unwrap();

        assert_eq!(result, "Hello lowercase and Capitalized.");
    }

    #[tokio::test]
    async fn test_generate_full_negotiation_script() {
        let pool = create_test_db().await;
        let template = r#"Dear {{recruiter_name}},

Thank you for extending the offer for the {{position}} role. After careful consideration and market research, I would like to discuss the compensation package.

Based on my {{years_experience}} years of experience and market data for similar roles in {{location}}, I was expecting a base salary in the range of {{expected_min}}-{{expected_max}}.

Current offer: {{current_offer}}
Market median: {{market_median}}
Requested salary: {{requested_salary}}

I am very excited about this opportunity and believe I can bring significant value to the team. Would you be open to discussing this further?

Best regards,
{{candidate_name}}"#;

        insert_test_template(&pool, "Full Script", "counter_offer", template, true).await;

        let generator = NegotiationScriptGenerator::new(pool);

        let mut params = HashMap::new();
        params.insert("recruiter_name".to_string(), "Sarah Johnson".to_string());
        params.insert(
            "position".to_string(),
            "Senior Software Engineer".to_string(),
        );
        params.insert("years_experience".to_string(), "7".to_string());
        params.insert("location".to_string(), "San Francisco, CA".to_string());
        params.insert("expected_min".to_string(), "$180,000".to_string());
        params.insert("expected_max".to_string(), "$210,000".to_string());
        params.insert("current_offer".to_string(), "$160,000".to_string());
        params.insert("market_median".to_string(), "$185,000".to_string());
        params.insert("requested_salary".to_string(), "$190,000".to_string());
        params.insert("candidate_name".to_string(), "Alex Chen".to_string());

        let result = generator.generate("counter_offer", params).await.unwrap();

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

    #[tokio::test]
    async fn test_generate_nonexistent_scenario() {
        let pool = create_test_db().await;

        let generator = NegotiationScriptGenerator::new(pool);

        let params: HashMap<String, String> = HashMap::new();

        let result = generator.generate("nonexistent", params).await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_get_template() {
        let pool = create_test_db().await;
        insert_test_template(
            &pool,
            "Test Template",
            "test_scenario",
            "Template text with {{placeholder}}",
            true,
        )
        .await;

        let generator = NegotiationScriptGenerator::new(pool);

        let result = generator.get_template("test_scenario").await.unwrap();

        assert_eq!(result, "Template text with {{placeholder}}");
    }

    #[tokio::test]
    async fn test_get_template_nonexistent() {
        let pool = create_test_db().await;

        let generator = NegotiationScriptGenerator::new(pool);

        let result = generator.get_template("nonexistent").await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_get_template_prefers_default() {
        let pool = create_test_db().await;
        insert_test_template(
            &pool,
            "Custom Template",
            "test_scenario",
            "Custom text",
            false,
        )
        .await;
        insert_test_template(
            &pool,
            "Default Template",
            "test_scenario",
            "Default text",
            true,
        )
        .await;

        let generator = NegotiationScriptGenerator::new(pool);

        let result = generator.get_template("test_scenario").await.unwrap();

        // Should return the default template
        assert_eq!(result, "Default text");
    }

    #[tokio::test]
    async fn test_get_templates_empty() {
        let pool = create_test_db().await;

        let generator = NegotiationScriptGenerator::new(pool);

        let result = generator.get_templates().await.unwrap();

        assert_eq!(result.len(), 0);
    }

    #[tokio::test]
    async fn test_get_templates_single() {
        let pool = create_test_db().await;
        insert_test_template(
            &pool,
            "Test Template",
            "test_scenario",
            "Template text",
            true,
        )
        .await;

        let generator = NegotiationScriptGenerator::new(pool);

        let result = generator.get_templates().await.unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].0, "Test Template");
        assert_eq!(result[0].1, "test_scenario");
    }

    #[tokio::test]
    async fn test_get_templates_multiple() {
        let pool = create_test_db().await;
        insert_test_template(&pool, "Template A", "scenario_a", "Text A", false).await;
        insert_test_template(&pool, "Template B", "scenario_b", "Text B", true).await;
        insert_test_template(&pool, "Template C", "scenario_c", "Text C", false).await;

        let generator = NegotiationScriptGenerator::new(pool);

        let result = generator.get_templates().await.unwrap();

        assert_eq!(result.len(), 3);
        // Default template should be first
        assert_eq!(result[0].0, "Template B");
        assert_eq!(result[0].1, "scenario_b");
    }

    #[tokio::test]
    async fn test_get_templates_ordering() {
        let pool = create_test_db().await;
        insert_test_template(&pool, "Z Template", "scenario_z", "Text Z", false).await;
        insert_test_template(&pool, "A Template", "scenario_a", "Text A", false).await;
        insert_test_template(&pool, "M Template", "scenario_m", "Text M", true).await;

        let generator = NegotiationScriptGenerator::new(pool);

        let result = generator.get_templates().await.unwrap();

        assert_eq!(result.len(), 3);
        // Default first, then alphabetical
        assert_eq!(result[0].0, "M Template");
        assert_eq!(result[1].0, "A Template");
        assert_eq!(result[2].0, "Z Template");
    }

    #[tokio::test]
    async fn test_add_template() {
        let pool = create_test_db().await;

        let generator = NegotiationScriptGenerator::new(pool.clone());

        let placeholders = vec!["name".to_string(), "salary".to_string()];

        generator
            .add_template(
                "New Template",
                "new_scenario",
                "Hello {{name}}, your salary is {{salary}}.",
                placeholders,
            )
            .await
            .unwrap();

        // Verify template was added
        let templates = generator.get_templates().await.unwrap();
        assert_eq!(templates.len(), 1);
        assert_eq!(templates[0].0, "New Template");
        assert_eq!(templates[0].1, "new_scenario");

        // Verify template can be retrieved
        let template = generator.get_template("new_scenario").await;
        assert!(template.is_err()); // Not default, should not be retrieved by get_template
    }

    #[tokio::test]
    async fn test_add_template_with_special_characters() {
        let pool = create_test_db().await;

        let generator = NegotiationScriptGenerator::new(pool.clone());

        let placeholders = vec!["amount".to_string(), "percentage".to_string()];

        generator
            .add_template(
                "Special Template",
                "special_scenario",
                "Salary {{amount}} is {{percentage}}% above market.",
                placeholders,
            )
            .await
            .unwrap();

        let templates = generator.get_templates().await.unwrap();
        assert_eq!(templates.len(), 1);
    }

    #[tokio::test]
    async fn test_add_template_empty_placeholders() {
        let pool = create_test_db().await;

        let generator = NegotiationScriptGenerator::new(pool.clone());

        let placeholders = vec![];

        generator
            .add_template(
                "No Placeholders",
                "no_placeholders",
                "Plain text template.",
                placeholders,
            )
            .await
            .unwrap();

        let templates = generator.get_templates().await.unwrap();
        assert_eq!(templates.len(), 1);
    }

    #[tokio::test]
    async fn test_add_template_is_not_default() {
        let pool = create_test_db().await;

        let generator = NegotiationScriptGenerator::new(pool.clone());

        let placeholders = vec!["name".to_string()];

        generator
            .add_template(
                "Custom Template",
                "custom_scenario",
                "Hello {{name}}.",
                placeholders,
            )
            .await
            .unwrap();

        // Verify is_default is 0
        let row = sqlx::query(
            "SELECT is_default FROM negotiation_templates WHERE scenario = 'custom_scenario'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        let is_default: i32 = row.try_get("is_default").unwrap();
        assert_eq!(is_default, 0);
    }

    #[tokio::test]
    async fn test_add_multiple_templates() {
        let pool = create_test_db().await;

        let generator = NegotiationScriptGenerator::new(pool.clone());

        generator
            .add_template("Template 1", "scenario_1", "Text 1", vec![])
            .await
            .unwrap();
        generator
            .add_template("Template 2", "scenario_2", "Text 2", vec![])
            .await
            .unwrap();
        generator
            .add_template("Template 3", "scenario_3", "Text 3", vec![])
            .await
            .unwrap();

        let templates = generator.get_templates().await.unwrap();
        assert_eq!(templates.len(), 3);
    }

    // Unit tests for placeholder replacement logic
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
}
