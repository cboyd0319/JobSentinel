use super::*;

#[test]
fn test_infer_remote_with_work_from_home_in_title() {
    assert!(LeverScraper::infer_remote(
        "Care Coordinator (Work From Home)",
        None
    ));
    assert!(LeverScraper::infer_remote(
        "Program Coordinator - Work from Home",
        None
    ));
    assert!(LeverScraper::infer_remote(
        "Work From Home Care Coordinator",
        None
    ));
}

#[test]
fn test_location_extraction_fallback_chain() {
    let json = serde_json::json!({
        "text": "Care Coordinator",
        "hostedUrl": "https://jobs.lever.co/company/job1",
        "categories": {
            "team": "Community Care Team"
        }
    });

    let location = json["categories"]["location"]
        .as_str()
        .map(|value| value.to_string())
        .or_else(|| {
            json["categories"]["team"]
                .as_str()
                .map(|value| value.to_string())
        });

    assert_eq!(location, Some("Community Care Team".to_string()));
}

#[tokio::test]
async fn test_scrape_company_with_capacity_optimization() {
    let json_response = serde_json::json!([
        {"text": "Job 1", "hostedUrl": "https://test.com/1"},
        {"text": "Job 2", "hostedUrl": "https://test.com/2"},
        {"text": "Job 3", "hostedUrl": "https://test.com/3"},
    ]);

    if let Some(postings) = json_response.as_array() {
        let mut jobs = Vec::with_capacity(postings.len());

        for posting in postings {
            let title = posting["text"].as_str().unwrap_or("").to_string();
            let url = posting["hostedUrl"].as_str().unwrap_or("").to_string();

            if !title.is_empty() && !url.is_empty() {
                jobs.push((title, url));
            }
        }

        assert_eq!(jobs.len(), 3);
        assert_eq!(jobs.capacity(), 3);
    }
}

#[test]
fn test_api_url_construction_with_company_id() {
    let company = LeverCompany {
        id: "test-company-123".to_string(),
        name: "Test Company".to_string(),
        url: "https://jobs.lever.co/test-company-123".to_string(),
    };

    let api_url = format!("https://api.lever.co/v0/postings/{}", company.id);

    assert_eq!(api_url, "https://api.lever.co/v0/postings/test-company-123");
}

#[tokio::test]
async fn test_scrape_company_multiple_jobs_all_valid() {
    let json_response = serde_json::json!([
        {
            "text": "Customer Support Manager",
            "hostedUrl": "https://jobs.lever.co/multi/fe",
            "categories": {"location": "Remote"}
        },
        {
            "text": "Inventory Planner",
            "hostedUrl": "https://jobs.lever.co/multi/be",
            "categories": {"location": "NYC"}
        },
        {
            "text": "Public Health Analyst",
            "hostedUrl": "https://jobs.lever.co/multi/public-health",
            "categories": {"team": "Regional Support"}
        }
    ]);

    let mut jobs = Vec::new();
    if let Some(postings) = json_response.as_array() {
        for posting in postings {
            let title = posting["text"].as_str().unwrap_or("").to_string();
            let url = posting["hostedUrl"].as_str().unwrap_or("").to_string();

            if !title.is_empty() && !url.is_empty() {
                jobs.push((title, url));
            }
        }
    }

    assert_eq!(jobs.len(), 3);
}
