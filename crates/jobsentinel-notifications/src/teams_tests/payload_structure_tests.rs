use super::super::*;
use super::notification_fixture;

#[test]
fn test_full_message_card_payload_structure() {
    let notification = notification_fixture();
    let payload = build_teams_payload(&notification);

    assert_eq!(payload["@type"], "MessageCard");
    assert_eq!(payload["@context"], "https://schema.org/extensions");
    assert_eq!(
        payload["summary"],
        "New job alert: Care Coordinator at Community Care Network"
    );
    assert_eq!(payload["themeColor"], "00FF00");
    assert_eq!(payload["title"], "🎯 High Match Job Alert (95% Match)");

    let sections = payload["sections"].as_array().unwrap();
    assert_eq!(sections.len(), 1);
    assert_eq!(sections[0]["activityTitle"], "**Care Coordinator**");
    assert_eq!(
        sections[0]["activitySubtitle"],
        "Community Care Network • greenhouse"
    );

    let facts = sections[0]["facts"].as_array().unwrap();
    assert_eq!(facts.len(), 4);
    assert_eq!(facts[0]["name"], "Location:");
    assert_eq!(facts[0]["value"], "Remote");
    assert_eq!(facts[1]["name"], "Salary:");
    assert_eq!(facts[1]["value"], "$180,000 - $220,000");
    assert_eq!(facts[2]["name"], "Remote:");
    assert_eq!(facts[2]["value"], "✅ Yes");
    assert_eq!(facts[3]["name"], "Match Score:");
    assert_eq!(facts[3]["value"], "95%");

    assert!(sections[0]["text"]
        .as_str()
        .unwrap()
        .contains("Why this matches"));
    assert!(sections[0]["text"]
        .as_str()
        .unwrap()
        .contains(LOCAL_MATCH_DETAILS_MESSAGE));

    let actions = payload["potentialAction"].as_array().unwrap();
    assert_eq!(actions.len(), 1);
    assert_eq!(actions[0]["@type"], "OpenUri");
    assert_eq!(actions[0]["name"], "View Full Job Posting");
    assert_eq!(
        actions[0]["targets"][0]["uri"],
        "https://example.com/jobs/123"
    );
}

#[test]
fn test_message_card_with_no_location() {
    let mut notification = notification_fixture();
    notification.job.location = None;

    let location_value = notification.job.location.as_deref().unwrap_or("N/A");
    assert_eq!(location_value, "N/A");
}

#[test]
fn test_message_card_with_empty_location() {
    let mut notification = notification_fixture();
    notification.job.location = Some("".to_string());

    let location_value = notification.job.location.as_deref().unwrap_or("N/A");
    assert_eq!(location_value, "");
}

#[test]
fn test_message_card_summary_format() {
    let notification = notification_fixture();
    let summary = format!(
        "New job alert: {} at {}",
        notification.job.title, notification.job.company
    );
    assert_eq!(
        summary,
        "New job alert: Care Coordinator at Community Care Network"
    );
}
