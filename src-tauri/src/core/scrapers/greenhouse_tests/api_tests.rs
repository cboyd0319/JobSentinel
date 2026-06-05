use super::*;

#[test]
fn test_parse_api_response_single_job() {
    let json_data = r#"
    {
        "jobs": [
            {
                "id": 123456,
                "title": "Inventory Planner",
                "location": {
                    "name": "Remote"
                }
            }
        ]
    }
    "#;

    let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

    if let Some(jobs_array) = parsed["jobs"].as_array() {
        assert_eq!(jobs_array.len(), 1);

        let job = &jobs_array[0];
        assert_eq!(job["id"].as_i64(), Some(123456));
        assert_eq!(job["title"].as_str(), Some("Inventory Planner"));
        assert_eq!(job["location"]["name"].as_str(), Some("Remote"));
    } else {
        panic!("jobs should be an array");
    }
}

#[test]
fn test_parse_api_response_multiple_jobs() {
    let json_data = r#"
    {
        "jobs": [
            {
                "id": 1,
                "title": "Care Coordinator",
                "location": {
                    "name": "Denver, CO"
                }
            },
            {
                "id": 2,
                "title": "Public Health Analyst",
                "location": {
                    "name": "Remote"
                }
            },
            {
                "id": 3,
                "title": "Customer Support Manager",
                "location": {
                    "name": "New York, NY"
                }
            }
        ]
    }
    "#;

    let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

    if let Some(jobs_array) = parsed["jobs"].as_array() {
        assert_eq!(jobs_array.len(), 3);

        assert_eq!(jobs_array[0]["title"].as_str(), Some("Care Coordinator"));
        assert_eq!(
            jobs_array[1]["title"].as_str(),
            Some("Public Health Analyst")
        );
        assert_eq!(
            jobs_array[2]["title"].as_str(),
            Some("Customer Support Manager")
        );
    }
}

#[test]
fn test_parse_api_response_empty_jobs() {
    let json_data = r#"
    {
        "jobs": []
    }
    "#;

    let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

    if let Some(jobs_array) = parsed["jobs"].as_array() {
        assert_eq!(jobs_array.len(), 0);
    }
}

#[test]
fn test_parse_api_response_missing_jobs_key() {
    let json_data = r#"
    {
        "error": "Not found"
    }
    "#;

    let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

    if let Some(_jobs_array) = parsed["jobs"].as_array() {
        panic!("jobs should not exist");
    }
}

#[test]
fn test_parse_api_response_missing_location() {
    let json_data = r#"
    {
        "jobs": [
            {
                "id": 123,
                "title": "Program Coordinator"
            }
        ]
    }
    "#;

    let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

    if let Some(jobs_array) = parsed["jobs"].as_array() {
        let job = &jobs_array[0];

        let location = job["location"]["name"].as_str();
        assert_eq!(location, None);
    }
}

#[test]
fn test_parse_api_response_missing_title() {
    let json_data = r#"
    {
        "jobs": [
            {
                "id": 456,
                "location": {
                    "name": "Remote"
                }
            }
        ]
    }
    "#;

    let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

    if let Some(jobs_array) = parsed["jobs"].as_array() {
        let job = &jobs_array[0];

        let title = job["title"].as_str().unwrap_or("");
        assert_eq!(title, "");
    }
}

#[test]
fn test_parse_api_response_missing_id() {
    let json_data = r#"
    {
        "jobs": [
            {
                "title": "Inventory Planner",
                "location": {
                    "name": "Remote"
                }
            }
        ]
    }
    "#;

    let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

    if let Some(jobs_array) = parsed["jobs"].as_array() {
        let job = &jobs_array[0];

        let id = job["id"].as_i64().unwrap_or(0);
        assert_eq!(id, 0);
    }
}

#[test]
fn test_api_url_construction() {
    let company_id = "communitycarenetwork";
    let api_url = format!(
        "https://boards-api.greenhouse.io/v1/boards/{}/jobs",
        company_id
    );

    assert_eq!(
        api_url,
        "https://boards-api.greenhouse.io/v1/boards/communitycarenetwork/jobs"
    );
}

#[test]
fn test_api_url_from_company_url() {
    let company_url = "https://boards.greenhouse.io/communitycarenetwork";
    let company_id = company_url
        .trim_end_matches('/')
        .split('/')
        .next_back()
        .unwrap();

    assert_eq!(company_id, "communitycarenetwork");

    let api_url = format!(
        "https://boards-api.greenhouse.io/v1/boards/{}/jobs",
        company_id
    );
    assert_eq!(
        api_url,
        "https://boards-api.greenhouse.io/v1/boards/communitycarenetwork/jobs"
    );
}

#[test]
fn test_api_url_with_trailing_slash() {
    let company_url = "https://boards.greenhouse.io/freshmart/";
    let company_id = company_url
        .trim_end_matches('/')
        .split('/')
        .next_back()
        .unwrap();

    assert_eq!(company_id, "freshmart");
}

#[test]
fn test_job_url_construction_from_api() {
    let company_id = "cityhealthdepartment";
    let job_id = 987654;
    let url = format!(
        "https://boards.greenhouse.io/{}/jobs/{}",
        company_id, job_id
    );

    assert_eq!(
        url,
        "https://boards.greenhouse.io/cityhealthdepartment/jobs/987654"
    );
}

#[test]
fn test_hash_consistency_across_runs() {
    let company = "Community Care Network™";
    let title = "Senior Care Coordinator (Remote) 🚀";
    let location = Some("Denver, CO");
    let url = "https://boards.greenhouse.io/test/jobs/123";

    let hashes: Vec<String> = (0..10)
        .map(|_| GreenhouseScraper::compute_hash(company, title, location, url))
        .collect();

    for i in 1..hashes.len() {
        assert_eq!(hashes[0], hashes[i]);
    }
}

#[test]
fn test_hash_with_query_parameters_normalized() {
    let hash1 = GreenhouseScraper::compute_hash(
        "Company",
        "Program Coordinator",
        None,
        "https://boards.greenhouse.io/company/jobs/1?ref=linkedin",
    );
    let hash2 = GreenhouseScraper::compute_hash(
        "Company",
        "Program Coordinator",
        None,
        "https://boards.greenhouse.io/company/jobs/1?ref=twitter",
    );
    let hash3 = GreenhouseScraper::compute_hash(
        "Company",
        "Program Coordinator",
        None,
        "https://boards.greenhouse.io/company/jobs/1",
    );

    assert_eq!(hash1, hash2);
    assert_eq!(hash1, hash3);
    assert_eq!(hash2, hash3);
}

#[test]
fn test_parse_job_element_all_fields_present() {
    let scraper = GreenhouseScraper::new(vec![]);
    let company = GreenhouseCompany {
        id: "test".to_string(),
        name: "Test Company".to_string(),
        url: "https://boards.greenhouse.io/test".to_string(),
    };

    let html = r#"
        <div class="opening">
            <a href="/test/jobs/999">Customer Support Manager</a>
            <span class="location">Remote - Worldwide</span>
        </div>
    "#;

    let document = Html::parse_document(html);
    let selector = Selector::parse(".opening").unwrap();
    let element = document.select(&selector).next().unwrap();

    let job = scraper
        .parse_job_element(&element, &company)
        .expect("should parse job")
        .expect("should have job");

    assert_eq!(job.title, "Customer Support Manager");
    assert_eq!(job.company, "Test Company");
    assert_eq!(job.location, Some("Remote - Worldwide".to_string()));
    assert_eq!(job.source, "greenhouse");
    assert_eq!(job.description, None);
    assert_eq!(job.remote, None);
    assert_eq!(job.hash.len(), 64);
}

#[test]
fn test_parse_job_element_nested_text() {
    let scraper = GreenhouseScraper::new(vec![]);
    let company = GreenhouseCompany {
        id: "test".to_string(),
        name: "Test".to_string(),
        url: "https://boards.greenhouse.io/test".to_string(),
    };

    let html = r#"
        <div class="opening">
            <a href="/test/jobs/1">
                <span class="title">Senior</span>
                <span>Coordinator</span>
            </a>
            <span class="location">Boston, MA</span>
        </div>
    "#;

    let document = Html::parse_document(html);
    let selector = Selector::parse(".opening").unwrap();
    let element = document.select(&selector).next().unwrap();

    let job = scraper
        .parse_job_element(&element, &company)
        .expect("should parse job")
        .expect("should have job");

    assert!(job.title.contains("Senior"));
    assert!(job.title.contains("Coordinator"));
}

#[test]
fn test_parse_api_response_with_capacity() {
    let json_data = r#"
    {
        "jobs": [
            {"id": 1, "title": "Job 1"},
            {"id": 2, "title": "Job 2"},
            {"id": 3, "title": "Job 3"}
        ]
    }
    "#;

    let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

    if let Some(jobs_array) = parsed["jobs"].as_array() {
        let mut jobs = Vec::with_capacity(jobs_array.len());

        for job_data in jobs_array {
            let title = job_data["title"].as_str().unwrap_or("").to_string();
            jobs.push(title);
        }

        assert_eq!(jobs.len(), 3);
        assert_eq!(jobs.capacity(), 3);
    }
}
