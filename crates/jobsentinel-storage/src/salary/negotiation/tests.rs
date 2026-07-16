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
    params.insert("position".to_string(), "Senior Case Manager".to_string());
    params.insert("company".to_string(), "CommunityCare".to_string());

    let result = generator.generate("initial_offer", params).await.unwrap();

    assert_eq!(
        result,
        "Dear Sarah, thank you for the $160,000 offer for the Senior Case Manager role at CommunityCare."
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
    params.insert("position".to_string(), "Senior Case Manager".to_string());
    params.insert("years_experience".to_string(), "7".to_string());
    params.insert("location".to_string(), "Chicago, IL".to_string());
    params.insert("expected_min".to_string(), "$180,000".to_string());
    params.insert("expected_max".to_string(), "$210,000".to_string());
    params.insert("current_offer".to_string(), "$160,000".to_string());
    params.insert("market_median".to_string(), "$185,000".to_string());
    params.insert("requested_salary".to_string(), "$190,000".to_string());
    params.insert("candidate_name".to_string(), "Alex Chen".to_string());

    let result = generator.generate("counter_offer", params).await.unwrap();

    assert!(result.contains("Sarah Johnson"));
    assert!(result.contains("Senior Case Manager"));
    assert!(result.contains("7 years"));
    assert!(result.contains("Chicago, IL"));
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
