use super::super::*;
use super::create_test_notification;

#[test]
fn test_full_message_card_payload_structure() {
    let notification = create_test_notification();
    let job = &notification.job;
    let score = &notification.score;

    let theme_color = if score.total >= 0.9 {
        "00FF00"
    } else if score.total >= 0.8 {
        "FFA500"
    } else {
        "0078D4"
    };

    let salary_display = if let (Some(min), Some(max)) = (job.salary_min, job.salary_max) {
        format!("${},000 - ${},000", min / 1000, max / 1000)
    } else if let Some(min) = job.salary_min {
        format!("${},000+", min / 1000)
    } else {
        "Not specified".to_string()
    };

    let payload = json!({
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "summary": format!("New job alert: {} at {}", job.title, job.company),
        "themeColor": theme_color,
        "title": format!("🎯 High Match Job Alert ({}% Match)", (score.total * 100.0).round()),
        "sections": [
            {
                "activityTitle": format!("**{}**", job.title),
                "activitySubtitle": format!("{} • {}", job.company, job.source),
                "facts": [
                    {
                        "name": "Location:",
                        "value": job.location.as_deref().unwrap_or("N/A")
                    },
                    {
                        "name": "Salary:",
                        "value": salary_display
                    },
                    {
                        "name": "Remote:",
                        "value": if job.remote.unwrap_or(false) { "✅ Yes" } else { "❌ No" }
                    },
                    {
                        "name": "Match Score:",
                        "value": format!("{}%", (score.total * 100.0).round())
                    }
                ],
                "text": format!("**Why this matches:**\n\n{}", score.reasons.join("\n\n"))
            }
        ],
        "potentialAction": [
            {
                "@type": "OpenUri",
                "name": "View Full Job Posting",
                "targets": [
                    {
                        "os": "default",
                        "uri": job.url
                    }
                ]
            }
        ]
    });

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
        .contains("Title matches"));

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
    let mut notification = create_test_notification();
    notification.job.location = None;

    let location_value = notification.job.location.as_deref().unwrap_or("N/A");
    assert_eq!(location_value, "N/A");
}

#[test]
fn test_message_card_with_empty_location() {
    let mut notification = create_test_notification();
    notification.job.location = Some("".to_string());

    let location_value = notification.job.location.as_deref().unwrap_or("N/A");
    assert_eq!(location_value, "");
}

#[test]
fn test_message_card_summary_format() {
    let notification = create_test_notification();
    let summary = format!(
        "New job alert: {} at {}",
        notification.job.title, notification.job.company
    );
    assert_eq!(
        summary,
        "New job alert: Care Coordinator at Community Care Network"
    );
}
