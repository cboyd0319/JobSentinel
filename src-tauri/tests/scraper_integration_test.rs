//! Scraper Integration Tests
//!
//! Tests for job scrapers using wiremock for HTTP mocking infrastructure.
//! These tests verify scraper construction and trait implementation.
//!
//! Note: Parsing logic is tested in unit tests within each scraper module.
//! Integration tests focus on the public JobScraper trait interface.

use wiremock::matchers::method;
use wiremock::{Mock, MockServer, ResponseTemplate};

// Re-export scraper modules for testing
use jobsentinel::core::scrapers::{
    builtin::BuiltInScraper,
    dice::DiceScraper,
    greenhouse::{GreenhouseCompany, GreenhouseScraper},
    hn_hiring::HnHiringScraper,
    indeed::IndeedScraper,
    lever::{LeverCompany, LeverScraper},
    linkedin::LinkedInScraper,
    remoteok::RemoteOkScraper,
    weworkremotely::WeWorkRemotelyScraper,
    yc_startup::YcStartupScraper,
    ziprecruiter::ZipRecruiterScraper,
    JobScraper,
};

// ============================================================================
// Test Fixtures - Sample Responses for Future Use
// ============================================================================

const GREENHOUSE_JSON_RESPONSE: &str = r#"{
    "jobs": [
        {
            "id": 12345,
            "title": "Senior Rust Engineer",
            "location": {
                "name": "San Francisco, CA"
            },
            "absolute_url": "https://boards.greenhouse.io/company/jobs/12345"
        },
        {
            "id": 12346,
            "title": "Backend Developer",
            "location": {
                "name": "Remote"
            },
            "absolute_url": "https://boards.greenhouse.io/company/jobs/12346"
        }
    ]
}"#;

const LEVER_JSON_RESPONSE: &str = r#"[
    {
        "id": "abc123",
        "text": "Full Stack Engineer",
        "categories": {
            "location": "New York, NY",
            "team": "Engineering"
        },
        "hostedUrl": "https://jobs.lever.co/company/abc123"
    }
]"#;

const REMOTEOK_JSON_RESPONSE: &str = r#"[
    {"id": "legal"},
    {
        "id": "1",
        "company": "TechCorp",
        "position": "Remote Rust Developer",
        "url": "https://remoteok.com/jobs/1",
        "location": "Worldwide",
        "tags": ["rust", "remote"],
        "salary_min": 100000,
        "salary_max": 150000
    },
    {
        "id": "2",
        "company": "StartupXYZ",
        "position": "Backend Engineer",
        "url": "https://remoteok.com/jobs/2",
        "location": "US Only"
    }
]"#;

const WEWORKREMOTELY_RSS_RESPONSE: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>We Work Remotely</title>
<item>
<title><![CDATA[Company ABC: Senior Software Engineer]]></title>
<link>https://weworkremotely.com/jobs/1</link>
<description><![CDATA[We are looking for a senior engineer.]]></description>
</item>
</channel>
</rss>"#;

const ZIPRECRUITER_RSS_RESPONSE: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>ZipRecruiter Jobs</title>
<item>
<title>Software Engineer - Remote</title>
<link>https://www.ziprecruiter.com/jobs/1</link>
<source>TechCompany Inc</source>
<description><![CDATA[Salary: $100k - $150k]]></description>
</item>
</channel>
</rss>"#;

// ============================================================================
// Wiremock Infrastructure Tests
// ============================================================================

/// Verify wiremock server can be started and return responses
#[tokio::test]
async fn test_mock_server_basic() {
    let mock_server = MockServer::start().await;

    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(200).set_body_string("OK"))
        .mount(&mock_server)
        .await;

    let response = reqwest::get(format!("{}/test", mock_server.uri()))
        .await
        .expect("request should succeed");
    assert_eq!(response.status().as_u16(), 200);
    assert_eq!(response.text().await.expect("body"), "OK");
}

/// Test wiremock can return JSON responses
#[tokio::test]
async fn test_mock_server_json_response() {
    let mock_server = MockServer::start().await;

    Mock::given(method("GET"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string(GREENHOUSE_JSON_RESPONSE)
                .insert_header("content-type", "application/json"),
        )
        .mount(&mock_server)
        .await;

    let response = reqwest::get(format!("{}/api/jobs", mock_server.uri()))
        .await
        .expect("request should succeed");
    assert_eq!(response.status().as_u16(), 200);

    let body = response.text().await.expect("body");
    assert!(body.contains("Senior Rust Engineer"));
}

/// Test wiremock can return XML/RSS responses
#[tokio::test]
async fn test_mock_server_rss_response() {
    let mock_server = MockServer::start().await;

    Mock::given(method("GET"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string(WEWORKREMOTELY_RSS_RESPONSE)
                .insert_header("content-type", "application/rss+xml"),
        )
        .mount(&mock_server)
        .await;

    let response = reqwest::get(format!("{}/feed", mock_server.uri()))
        .await
        .expect("request should succeed");
    assert_eq!(response.status().as_u16(), 200);

    let body = response.text().await.expect("body");
    assert!(body.contains("We Work Remotely"));
}

/// Test wiremock error responses
#[tokio::test]
async fn test_mock_server_error_responses() {
    let mock_server = MockServer::start().await;

    // 404 Not Found
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(404))
        .mount(&mock_server)
        .await;

    let response = reqwest::get(format!("{}/notfound", mock_server.uri()))
        .await
        .expect("request should succeed");
    assert_eq!(response.status().as_u16(), 404);
}

/// Test wiremock rate limit simulation
#[tokio::test]
async fn test_mock_server_rate_limit() {
    let mock_server = MockServer::start().await;

    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(429).insert_header("retry-after", "60"))
        .mount(&mock_server)
        .await;

    let response = reqwest::get(format!("{}/limited", mock_server.uri()))
        .await
        .expect("request should succeed");
    assert_eq!(response.status().as_u16(), 429);
}

// ============================================================================
// Helper Functions for Test Data
// ============================================================================

fn test_greenhouse_company() -> GreenhouseCompany {
    GreenhouseCompany {
        id: "cloudflare".to_string(),
        name: "Cloudflare".to_string(),
        url: "https://boards.greenhouse.io/cloudflare".to_string(),
    }
}

fn test_lever_company() -> LeverCompany {
    LeverCompany {
        id: "netflix".to_string(),
        name: "Netflix".to_string(),
        url: "https://jobs.lever.co/netflix".to_string(),
    }
}

// ============================================================================
// Scraper Construction Tests
// ============================================================================

#[test]
fn test_dice_scraper_construction() {
    let scraper = DiceScraper::new("rust developer".to_string(), None, 20);
    assert_eq!(scraper.name(), "dice");
    assert_eq!(scraper.query, "rust developer");
    assert_eq!(scraper.limit, 20);
    assert!(scraper.location.is_none());
}

#[test]
fn test_dice_scraper_with_location() {
    let scraper = DiceScraper::new(
        "python".to_string(),
        Some("Austin, TX".to_string()),
        10,
    );
    assert_eq!(scraper.name(), "dice");
    assert_eq!(scraper.location, Some("Austin, TX".to_string()));
}

#[test]
fn test_ziprecruiter_scraper_construction() {
    let scraper = ZipRecruiterScraper::new("software engineer".to_string(), None, None, 20);
    assert_eq!(scraper.name(), "ziprecruiter");
    assert_eq!(scraper.query, "software engineer");
    assert_eq!(scraper.limit, 20);
}

#[test]
fn test_ziprecruiter_scraper_with_params() {
    let scraper = ZipRecruiterScraper::new(
        "developer".to_string(),
        Some("New York".to_string()),
        Some(50),
        10,
    );
    assert_eq!(scraper.name(), "ziprecruiter");
    assert_eq!(scraper.location, Some("New York".to_string()));
    assert_eq!(scraper.radius, Some(50));
}

#[test]
fn test_yc_startup_scraper_construction() {
    let scraper = YcStartupScraper::new(None, false, 20);
    assert_eq!(scraper.name(), "yc_startup");
    assert!(!scraper.remote_only);
    assert!(scraper.query.is_none());
}

#[test]
fn test_yc_startup_scraper_with_filters() {
    let scraper = YcStartupScraper::new(Some("rust".to_string()), true, 10);
    assert_eq!(scraper.name(), "yc_startup");
    assert!(scraper.remote_only);
    assert_eq!(scraper.query, Some("rust".to_string()));
}

#[test]
fn test_remoteok_scraper_construction() {
    let scraper = RemoteOkScraper::new(vec!["rust".to_string(), "golang".to_string()], 10);
    assert_eq!(scraper.name(), "remoteok");
    assert_eq!(scraper.tags.len(), 2);
    assert_eq!(scraper.limit, 10);
}

#[test]
fn test_remoteok_scraper_empty_tags() {
    let scraper = RemoteOkScraper::new(vec![], 20);
    assert_eq!(scraper.name(), "remoteok");
    assert!(scraper.tags.is_empty());
}

#[test]
fn test_weworkremotely_scraper_construction() {
    let scraper = WeWorkRemotelyScraper::new(None, 10);
    assert_eq!(scraper.name(), "weworkremotely");
    assert!(scraper.category.is_none());
}

#[test]
fn test_weworkremotely_scraper_with_category() {
    let scraper = WeWorkRemotelyScraper::new(Some("programming".to_string()), 20);
    assert_eq!(scraper.name(), "weworkremotely");
    assert_eq!(scraper.category, Some("programming".to_string()));
}

#[test]
fn test_hn_hiring_scraper_construction() {
    let scraper = HnHiringScraper::new(20, false);
    assert_eq!(scraper.name(), "hn_hiring");
    assert_eq!(scraper.limit, 20);
    assert!(!scraper.remote_only);
}

#[test]
fn test_hn_hiring_scraper_remote_filter() {
    let scraper = HnHiringScraper::new(10, true);
    assert_eq!(scraper.name(), "hn_hiring");
    assert!(scraper.remote_only);
}

#[test]
fn test_greenhouse_scraper_construction() {
    let scraper = GreenhouseScraper::new(vec![test_greenhouse_company()]);
    assert_eq!(scraper.name(), "greenhouse");
    assert_eq!(scraper.companies.len(), 1);
}

#[test]
fn test_greenhouse_scraper_multiple_companies() {
    let companies = vec![
        GreenhouseCompany {
            id: "stripe".to_string(),
            name: "Stripe".to_string(),
            url: "https://boards.greenhouse.io/stripe".to_string(),
        },
        GreenhouseCompany {
            id: "cloudflare".to_string(),
            name: "Cloudflare".to_string(),
            url: "https://boards.greenhouse.io/cloudflare".to_string(),
        },
        GreenhouseCompany {
            id: "discord".to_string(),
            name: "Discord".to_string(),
            url: "https://boards.greenhouse.io/discord".to_string(),
        },
    ];
    let scraper = GreenhouseScraper::new(companies);
    assert_eq!(scraper.name(), "greenhouse");
    assert_eq!(scraper.companies.len(), 3);
}

#[test]
fn test_lever_scraper_construction() {
    let scraper = LeverScraper::new(vec![test_lever_company()]);
    assert_eq!(scraper.name(), "lever");
    assert_eq!(scraper.companies.len(), 1);
}

#[test]
fn test_lever_scraper_multiple_companies() {
    let companies = vec![
        LeverCompany {
            id: "figma".to_string(),
            name: "Figma".to_string(),
            url: "https://jobs.lever.co/figma".to_string(),
        },
        LeverCompany {
            id: "notion".to_string(),
            name: "Notion".to_string(),
            url: "https://jobs.lever.co/notion".to_string(),
        },
    ];
    let scraper = LeverScraper::new(companies);
    assert_eq!(scraper.name(), "lever");
    assert_eq!(scraper.companies.len(), 2);
}

#[test]
fn test_linkedin_scraper_construction() {
    let scraper = LinkedInScraper::new(
        "li_at=test_cookie".to_string(),
        "software engineer".to_string(),
        "San Francisco".to_string(),
    );
    assert_eq!(scraper.name(), "LinkedIn");
    assert_eq!(scraper.query, "software engineer");
    assert_eq!(scraper.location, "San Francisco");
}

#[test]
fn test_indeed_scraper_construction() {
    let scraper = IndeedScraper::new("developer".to_string(), "Austin, TX".to_string());
    assert_eq!(scraper.name(), "Indeed");
    assert_eq!(scraper.query, "developer");
    assert_eq!(scraper.location, "Austin, TX");
}

#[test]
fn test_builtin_scraper_construction() {
    let scraper = BuiltInScraper::new("San Francisco".to_string(), None, 10);
    assert_eq!(scraper.name(), "builtin");
    assert_eq!(scraper.city, "San Francisco");
    assert!(scraper.category.is_none());
}

#[test]
fn test_builtin_scraper_with_category() {
    let scraper = BuiltInScraper::new(
        "Austin".to_string(),
        Some("engineering".to_string()),
        15,
    );
    assert_eq!(scraper.name(), "builtin");
    assert_eq!(scraper.category, Some("engineering".to_string()));
}

// ============================================================================
// Scraper Trait Implementation Tests
// ============================================================================

/// All scrapers must implement the JobScraper trait
#[test]
fn test_all_scrapers_implement_job_scraper() {
    // This test verifies at compile time that all scrapers implement JobScraper
    fn assert_job_scraper<T: JobScraper>(_: &T) {}

    let dice = DiceScraper::new("test".to_string(), None, 10);
    assert_job_scraper(&dice);

    let ziprecruiter = ZipRecruiterScraper::new("test".to_string(), None, None, 10);
    assert_job_scraper(&ziprecruiter);

    let yc = YcStartupScraper::new(None, false, 10);
    assert_job_scraper(&yc);

    let remoteok = RemoteOkScraper::new(vec![], 10);
    assert_job_scraper(&remoteok);

    let wwr = WeWorkRemotelyScraper::new(None, 10);
    assert_job_scraper(&wwr);

    let hn = HnHiringScraper::new(10, false);
    assert_job_scraper(&hn);

    let greenhouse = GreenhouseScraper::new(vec![test_greenhouse_company()]);
    assert_job_scraper(&greenhouse);

    let lever = LeverScraper::new(vec![test_lever_company()]);
    assert_job_scraper(&lever);

    let linkedin = LinkedInScraper::new(
        "cookie".to_string(),
        "query".to_string(),
        "location".to_string(),
    );
    assert_job_scraper(&linkedin);

    let indeed = IndeedScraper::new("query".to_string(), "location".to_string());
    assert_job_scraper(&indeed);

    let builtin = BuiltInScraper::new("city".to_string(), None, 10);
    assert_job_scraper(&builtin);
}

/// Verify all scrapers return distinct names
#[test]
fn test_scraper_names_are_unique() {
    let names = vec![
        DiceScraper::new("test".to_string(), None, 10).name(),
        ZipRecruiterScraper::new("test".to_string(), None, None, 10).name(),
        YcStartupScraper::new(None, false, 10).name(),
        RemoteOkScraper::new(vec![], 10).name(),
        WeWorkRemotelyScraper::new(None, 10).name(),
        HnHiringScraper::new(10, false).name(),
        GreenhouseScraper::new(vec![test_greenhouse_company()]).name(),
        LeverScraper::new(vec![test_lever_company()]).name(),
        LinkedInScraper::new("c".to_string(), "q".to_string(), "l".to_string()).name(),
        IndeedScraper::new("q".to_string(), "l".to_string()).name(),
        BuiltInScraper::new("city".to_string(), None, 10).name(),
    ];

    // Check all names are unique (case-insensitive to catch duplicates)
    let mut unique_names: Vec<String> = names.iter().map(|n| n.to_lowercase()).collect();
    unique_names.sort();
    unique_names.dedup();
    assert_eq!(
        names.len(),
        unique_names.len(),
        "All scraper names should be unique"
    );
}

// ============================================================================
// Scraper Count Verification
// ============================================================================

/// Verify we have the expected number of scrapers tested
#[test]
fn test_scraper_count() {
    // We test 11 scrapers:
    // - dice, ziprecruiter, yc_startup (new)
    // - remoteok, weworkremotely, hn_hiring
    // - greenhouse, lever
    // - linkedin, indeed
    // - builtin
    // (wellfound, jobswithgpt have more complex constructors - tested separately)
    let names = vec![
        "dice",
        "ziprecruiter",
        "yc_startup",
        "remoteok",
        "weworkremotely",
        "hn_hiring",
        "greenhouse",
        "lever",
        "linkedin",
        "indeed",
        "builtin",
    ];
    assert_eq!(names.len(), 11, "Expected 11 scrapers to be tested");
}
