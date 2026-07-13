use super::super::*;
use super::create_test_notification;

#[test]
fn test_build_header_block_structure() {
    let block = build_header_block("Care Coordinator");

    assert_eq!(block["type"], "header");
    assert_eq!(block["text"]["type"], "plain_text");
    assert_eq!(block["text"]["text"], "🎯 High Match: Care Coordinator");
}

#[test]
fn test_build_header_block_emoji() {
    let block = build_header_block("Test Title");
    let text = block["text"]["text"].as_str().unwrap();
    assert!(text.starts_with("🎯 High Match:"));
}

#[test]
fn test_build_header_block_with_special_chars() {
    let block = build_header_block("Care Coordinator @ \"Clinic\" <script>");
    let text = block["text"]["text"].as_str().unwrap();
    assert!(text.contains("@"));
    assert!(text.contains("\""));
    assert!(text.contains("<script>"));
}

#[test]
fn test_build_header_block_with_unicode() {
    let block = build_header_block("🌟 Care Coordinator™");
    let text = block["text"]["text"].as_str().unwrap();
    assert!(text.contains("🌟"));
    assert!(text.contains("™"));
}

#[test]
fn test_build_header_block_empty_title() {
    let block = build_header_block("");
    assert_eq!(block["text"]["text"], "🎯 High Match: ");
}

#[test]
fn test_build_fields_section_block_structure() {
    let notification = create_test_notification();
    let block = build_fields_section_block(&notification);

    assert_eq!(block["type"], "section");
    assert!(block["fields"].is_array());
    assert_eq!(block["fields"].as_array().unwrap().len(), 4);
}

#[test]
fn test_build_fields_section_block_company_field() {
    let notification = create_test_notification();
    let block = build_fields_section_block(&notification);

    let company_field = &block["fields"][0];
    assert_eq!(company_field["type"], "mrkdwn");
    let text = company_field["text"].as_str().unwrap();
    assert!(text.starts_with("*Company:*\n"));
    assert!(text.contains("Community Care Network"));
}

#[test]
fn test_build_fields_section_block_location_field() {
    let notification = create_test_notification();
    let block = build_fields_section_block(&notification);

    let location_field = &block["fields"][1];
    assert_eq!(location_field["type"], "mrkdwn");
    let text = location_field["text"].as_str().unwrap();
    assert!(text.starts_with("*Location:*\n"));
    assert!(text.contains("Remote"));
}

#[test]
fn test_build_fields_section_block_location_none() {
    let mut notification = create_test_notification();
    notification.job.location = None;
    let block = build_fields_section_block(&notification);

    let location_field = &block["fields"][1];
    let text = location_field["text"].as_str().unwrap();
    assert!(text.contains("N/A"));
}

#[test]
fn test_build_fields_section_block_score_field() {
    let notification = create_test_notification();
    let block = build_fields_section_block(&notification);

    let score_field = &block["fields"][2];
    assert_eq!(score_field["type"], "mrkdwn");
    let text = score_field["text"].as_str().unwrap();
    assert!(text.starts_with("*Score:*\n"));
    assert!(text.contains("95%"));
}

#[test]
fn test_build_fields_section_block_score_formatting() {
    let mut notification = create_test_notification();
    notification.score.total = 0.876;
    let block = build_fields_section_block(&notification);

    let score_field = &block["fields"][2];
    let text = score_field["text"].as_str().unwrap();
    assert!(text.contains("88%"));
}

#[test]
fn test_build_fields_section_block_source_field() {
    let notification = create_test_notification();
    let block = build_fields_section_block(&notification);

    let source_field = &block["fields"][3];
    assert_eq!(source_field["type"], "mrkdwn");
    let text = source_field["text"].as_str().unwrap();
    assert!(text.starts_with("*Source:*\n"));
    assert!(text.contains("greenhouse"));
}

#[test]
fn test_build_fields_section_block_all_fields_mrkdwn() {
    let notification = create_test_notification();
    let block = build_fields_section_block(&notification);

    for i in 0..4 {
        assert_eq!(block["fields"][i]["type"], "mrkdwn");
    }
}

#[test]
fn test_build_reasons_section_block_structure() {
    let reasons = vec!["Reason 1".to_string(), "Reason 2".to_string()];
    let block = build_reasons_section_block(&reasons);

    assert_eq!(block["type"], "section");
    assert_eq!(block["text"]["type"], "mrkdwn");
}

#[test]
fn test_build_reasons_section_block_content() {
    let reasons = vec![
        "Title matches".to_string(),
        "Keyword match: case management".to_string(),
        "Salary 120% of target (100% credit)".to_string(),
    ];
    let block = build_reasons_section_block(&reasons);

    let text = block["text"]["text"].as_str().unwrap();
    assert!(text.starts_with("*Why this matches:*\n"));
    assert!(text.contains("Title matches"));
    assert!(text.contains("Keyword match: case management"));
    assert!(text.contains("Salary 120% of target (100% credit)"));
}

#[test]
fn test_build_reasons_section_block_join() {
    let reasons = vec![
        "First".to_string(),
        "Second".to_string(),
        "Third".to_string(),
    ];
    let block = build_reasons_section_block(&reasons);

    let text = block["text"]["text"].as_str().unwrap();
    assert!(text.contains("First\nSecond\nThird"));
}

#[test]
fn test_build_reasons_section_block_empty() {
    let reasons: Vec<String> = vec![];
    let block = build_reasons_section_block(&reasons);

    let text = block["text"]["text"].as_str().unwrap();
    assert_eq!(text, "*Why this matches:*\n");
}

#[test]
fn test_build_reasons_section_block_single_reason() {
    let reasons = vec!["Only one reason".to_string()];
    let block = build_reasons_section_block(&reasons);

    let text = block["text"]["text"].as_str().unwrap();
    assert!(text.contains("Only one reason"));
    assert_eq!(text.matches('\n').count(), 1); // Only the header newline
}

#[test]
fn test_build_reasons_section_block_with_markdown() {
    let reasons = vec![
        "Has *asterisks* and _underscores_".to_string(),
        "Contains `backticks`".to_string(),
    ];
    let block = build_reasons_section_block(&reasons);

    let text = block["text"]["text"].as_str().unwrap();
    assert!(text.contains("*asterisks*"));
    assert!(text.contains("_underscores_"));
    assert!(text.contains("`backticks`"));
}

#[test]
fn test_build_actions_block_structure() {
    let block = build_actions_block("https://example.com/jobs/123").expect("public job link");

    assert_eq!(block["type"], "actions");
    assert!(block["elements"].is_array());
    assert_eq!(block["elements"].as_array().unwrap().len(), 1);
}

#[test]
fn test_build_actions_block_button() {
    let block = build_actions_block("https://example.com/jobs/123").expect("public job link");

    let button = &block["elements"][0];
    assert_eq!(button["type"], "button");
    assert_eq!(button["text"]["type"], "plain_text");
    assert_eq!(button["text"]["text"], "View Job");
    assert_eq!(button["url"], "https://example.com/jobs/123");
    assert_eq!(button["style"], "primary");
}

#[test]
fn test_build_actions_block_strips_tracking_ref() {
    let url = "https://jobs.example.com/apply/123456?ref=jobsentinel";
    let block = build_actions_block(url).expect("public job link");

    assert_eq!(
        block["elements"][0]["url"],
        "https://jobs.example.com/apply/123456"
    );
}

#[test]
fn test_build_actions_block_canonicalizes_query_encoding() {
    let url = "https://example.com/jobs/123?name=Care%20Coordinator&location=Remote";
    let block = build_actions_block(url).expect("public job link");

    assert_eq!(
        block["elements"][0]["url"],
        "https://example.com/jobs/123?name=Care+Coordinator&location=Remote"
    );
}

#[test]
fn test_build_slack_payload_structure() {
    let notification = create_test_notification();
    let payload = build_slack_payload(&notification);

    assert!(payload["blocks"].is_array());
    assert_eq!(payload["blocks"].as_array().unwrap().len(), 4);
}

#[test]
fn test_build_slack_payload_block_types() {
    let notification = create_test_notification();
    let payload = build_slack_payload(&notification);

    assert_eq!(payload["blocks"][0]["type"], "header");
    assert_eq!(payload["blocks"][1]["type"], "section");
    assert_eq!(payload["blocks"][2]["type"], "section");
    assert_eq!(payload["blocks"][3]["type"], "actions");
}

#[test]
fn test_build_slack_payload_header_content() {
    let notification = create_test_notification();
    let payload = build_slack_payload(&notification);

    let header_text = payload["blocks"][0]["text"]["text"].as_str().unwrap();
    assert!(header_text.contains("Care Coordinator"));
}

#[test]
fn test_build_slack_payload_fields_content() {
    let notification = create_test_notification();
    let payload = build_slack_payload(&notification);

    let fields = &payload["blocks"][1]["fields"];
    assert_eq!(fields.as_array().unwrap().len(), 4);

    // Check that fields contain expected data
    let company_text = fields[0]["text"].as_str().unwrap();
    assert!(company_text.contains("Community Care Network"));

    let score_text = fields[2]["text"].as_str().unwrap();
    assert!(score_text.contains("95%"));
}

#[test]
fn test_build_slack_payload_reasons_content() {
    let notification = create_test_notification();
    let payload = build_slack_payload(&notification);

    let reasons_text = payload["blocks"][2]["text"]["text"].as_str().unwrap();
    assert!(reasons_text.contains(LOCAL_MATCH_DETAILS_MESSAGE));
    assert!(!reasons_text.contains("Title matches"));
    assert!(!reasons_text.contains("Keyword match: case management"));
}

#[test]
fn test_build_slack_payload_actions_content() {
    let notification = create_test_notification();
    let payload = build_slack_payload(&notification);

    let button_url = payload["blocks"][3]["elements"][0]["url"].as_str().unwrap();
    assert_eq!(button_url, "https://example.com/jobs/123");
}

#[test]
fn test_build_slack_payload_minimizes_job_url() {
    let mut notification = create_test_notification();
    notification.job.url =
        "https://example.com/jobs?utm_source=alert&gh_jid=123&token=secret&candidate_email=person@example.com#private"
            .to_string();

    let payload = build_slack_payload(&notification);
    let blocks = payload["blocks"].as_array().unwrap();
    let action_block = blocks
        .iter()
        .find(|block| block["type"] == "actions")
        .expect("public job link should create actions block");
    let url = action_block["elements"][0]["url"].as_str().unwrap();

    assert_eq!(url, "https://example.com/jobs?gh_jid=123");
    assert!(!url.contains("utm_source"));
    assert!(!url.contains("token"));
    assert!(!url.contains("candidate_email"));
    assert!(!url.contains("person@example.com"));
    assert!(!url.contains("private"));
}

#[test]
fn test_build_slack_payload_serializable() {
    let notification = create_test_notification();
    let payload = build_slack_payload(&notification);

    let json_string = serde_json::to_string(&payload);
    assert!(json_string.is_ok());

    let deserialized: serde_json::Value = serde_json::from_str(&json_string.unwrap()).unwrap();
    assert_eq!(deserialized, payload);
}

#[test]
fn test_build_slack_payload_with_different_scores() {
    let test_scores = vec![0.0, 0.5, 0.95, 1.0];

    for score in test_scores {
        let mut notification = create_test_notification();
        notification.score.total = score;

        let payload = build_slack_payload(&notification);
        let score_text = payload["blocks"][1]["fields"][2]["text"].as_str().unwrap();

        let expected = format!("{}%", (score * 100.0).round() as i32);
        assert!(score_text.contains(&expected));
    }
}

#[test]
fn test_build_slack_payload_with_no_location() {
    let mut notification = create_test_notification();
    notification.job.location = None;

    let payload = build_slack_payload(&notification);
    let location_text = payload["blocks"][1]["fields"][1]["text"].as_str().unwrap();
    assert!(location_text.contains("N/A"));
}

#[test]
fn test_build_slack_payload_with_empty_reasons() {
    let mut notification = create_test_notification();
    notification.score.reasons = vec![];

    let payload = build_slack_payload(&notification);
    let reasons_text = payload["blocks"][2]["text"]["text"].as_str().unwrap();
    assert_eq!(
        reasons_text,
        format!("*Why this matches:*\n{}", LOCAL_MATCH_DETAILS_MESSAGE)
    );
}

#[test]
fn test_build_slack_payload_preserves_unicode() {
    let mut notification = create_test_notification();
    notification.job.title = "🌟 Care Coordinator™".to_string();
    notification.job.company = "São Paulo Inc.".to_string();
    notification.job.location = Some("Zürich 🇨🇭".to_string());

    let payload = build_slack_payload(&notification);

    let header_text = payload["blocks"][0]["text"]["text"].as_str().unwrap();
    assert!(header_text.contains("🌟"));
    assert!(header_text.contains("™"));

    let company_text = payload["blocks"][1]["fields"][0]["text"].as_str().unwrap();
    assert!(company_text.contains("São Paulo"));

    let location_text = payload["blocks"][1]["fields"][1]["text"].as_str().unwrap();
    assert!(location_text.contains("Zürich"));
    assert!(location_text.contains("🇨🇭"));
}

#[test]
fn test_build_header_block_with_long_title() {
    let long_title = "Very Long Job Title ".repeat(20);
    let block = build_header_block(&long_title);

    let text = block["text"]["text"].as_str().unwrap();
    assert!(text.contains("Very Long Job Title"));
    assert!(text.len() > 100);
}

#[test]
fn test_build_fields_section_with_unicode_company() {
    let mut notification = create_test_notification();
    notification.job.company = "株式会社テスト".to_string();

    let block = build_fields_section_block(&notification);
    let company_text = block["fields"][0]["text"].as_str().unwrap();
    assert!(company_text.contains("株式会社テスト"));
}

#[test]
fn test_build_reasons_with_very_long_text() {
    let long_reason = "Very long reason: ".to_string() + &"x".repeat(500);
    let reasons = vec![long_reason.clone()];

    let block = build_reasons_section_block(&reasons);
    let text = block["text"]["text"].as_str().unwrap();
    assert!(text.contains(&long_reason));
}

#[test]
fn test_build_actions_block_with_long_url() {
    let long_url = "https://example.com/jobs/".to_string() + &"a".repeat(200);
    let block = build_actions_block(&long_url).expect("public job link");

    assert_eq!(block["elements"][0]["url"], long_url);
}

#[test]
fn test_builder_functions_integration() {
    let notification = create_test_notification();

    // Test individual builders
    let header = build_header_block(&notification.job.title);
    let fields = build_fields_section_block(&notification);
    let reasons = build_match_details_section_block();
    let actions = build_actions_block(&notification.job.url).expect("public job link");

    // Verify they can be assembled
    let manual_payload = json!({
        "blocks": [header, fields, reasons, actions]
    });

    // Compare with build_slack_payload
    let auto_payload = build_slack_payload(&notification);

    assert_eq!(manual_payload, auto_payload);
}

// Note: We cannot easily test actual HTTP calls without setting up a mock server,
// but we've tested all the validation and JSON construction logic.
// In a production environment, you could use `mockito` or `wiremock` crates
// to mock HTTP responses.
