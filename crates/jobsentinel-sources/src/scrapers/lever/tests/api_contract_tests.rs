use super::*;

#[test]
fn test_api_url_format() {
    let company = LeverCompany {
        id: "freshmart".to_string(),
        name: "FreshMart".to_string(),
        url: "https://jobs.lever.co/freshmart".to_string(),
    };

    let api_url = format!("https://api.lever.co/v0/postings/{}", company.id);

    assert_eq!(api_url, "https://api.lever.co/v0/postings/freshmart");
    assert!(api_url.starts_with("https://api.lever.co/v0/postings/"));
}

#[test]
fn test_empty_title_and_url_filtering() {
    let test_cases = vec![
        ("Valid Job", "https://test.com/1", true),
        ("", "https://test.com/2", false),
        ("Valid Job", "", false),
        ("", "", false),
    ];

    for (title, url, should_be_valid) in test_cases {
        let is_valid = !title.is_empty() && !url.is_empty();
        assert_eq!(
            is_valid, should_be_valid,
            "Failed for title='{}', url='{}'",
            title, url
        );
    }
}

#[test]
fn test_vec_with_capacity_hint() {
    let postings = vec![
        serde_json::json!({"text": "Job 1", "hostedUrl": "https://test.com/1"}),
        serde_json::json!({"text": "Job 2", "hostedUrl": "https://test.com/2"}),
        serde_json::json!({"text": "Job 3", "hostedUrl": "https://test.com/3"}),
    ];

    let mut jobs: Vec<String> = Vec::with_capacity(postings.len());

    for posting in &postings {
        if let Some(title) = posting["text"].as_str() {
            jobs.push(title.to_string());
        }
    }

    assert_eq!(jobs.len(), 3);
    assert_eq!(jobs.capacity(), 3);
}

#[test]
fn test_multiple_companies_processing() {
    let companies = vec![
        LeverCompany {
            id: "company1".to_string(),
            name: "Company 1".to_string(),
            url: "https://jobs.lever.co/company1".to_string(),
        },
        LeverCompany {
            id: "company2".to_string(),
            name: "Company 2".to_string(),
            url: "https://jobs.lever.co/company2".to_string(),
        },
        LeverCompany {
            id: "company3".to_string(),
            name: "Company 3".to_string(),
            url: "https://jobs.lever.co/company3".to_string(),
        },
    ];

    let scraper = LeverScraper::new(companies.clone());

    assert_eq!(scraper.companies.len(), 3);
    assert_eq!(scraper.name(), "lever");

    for (index, company) in scraper.companies.iter().enumerate() {
        assert_eq!(company.name, companies[index].name);
        assert_eq!(company.id, companies[index].id);
    }
}
