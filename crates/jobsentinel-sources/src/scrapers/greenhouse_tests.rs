use super::*;

#[path = "greenhouse_tests/api_tests.rs"]
mod api_tests;

#[test]
fn test_compute_hash_deterministic() {
    let hash1 = GreenhouseScraper::compute_hash(
        "Community Care Network",
        "Care Coordinator",
        Some("Remote"),
        "https://example.com/1",
    );
    let hash2 = GreenhouseScraper::compute_hash(
        "Community Care Network",
        "Care Coordinator",
        Some("Remote"),
        "https://example.com/1",
    );

    assert_eq!(hash1, hash2, "Same inputs should produce same hash");
    assert_eq!(hash1.len(), 64, "SHA-256 hash should be 64 hex chars");
}

#[test]
fn test_compute_hash_different_company() {
    let hash1 = GreenhouseScraper::compute_hash(
        "Community Care Network",
        "Program Coordinator",
        None,
        "https://example.com/1",
    );
    let hash2 = GreenhouseScraper::compute_hash(
        "FreshMart",
        "Program Coordinator",
        None,
        "https://example.com/1",
    );

    assert_ne!(
        hash1, hash2,
        "Different company should produce different hash"
    );
}

#[test]
fn test_compute_hash_different_title() {
    let hash1 = GreenhouseScraper::compute_hash(
        "Company",
        "Care Coordinator",
        None,
        "https://example.com/1",
    );
    let hash2 = GreenhouseScraper::compute_hash(
        "Company",
        "Public Health Analyst",
        None,
        "https://example.com/1",
    );

    assert_ne!(
        hash1, hash2,
        "Different title should produce different hash"
    );
}

#[test]
fn test_compute_hash_different_location() {
    let hash1 = GreenhouseScraper::compute_hash(
        "Company",
        "Program Coordinator",
        Some("Remote"),
        "https://example.com/1",
    );
    let hash2 = GreenhouseScraper::compute_hash(
        "Company",
        "Program Coordinator",
        Some("Hybrid"),
        "https://example.com/1",
    );

    assert_ne!(
        hash1, hash2,
        "Different location should produce different hash"
    );
}

#[test]
fn test_compute_hash_location_none_vs_some() {
    let hash1 = GreenhouseScraper::compute_hash(
        "Company",
        "Program Coordinator",
        None,
        "https://example.com/1",
    );
    let hash2 = GreenhouseScraper::compute_hash(
        "Company",
        "Program Coordinator",
        Some("Remote"),
        "https://example.com/1",
    );

    assert_ne!(
        hash1, hash2,
        "None location should produce different hash than Some"
    );
}

#[test]
fn test_compute_hash_different_url() {
    let hash1 = GreenhouseScraper::compute_hash(
        "Company",
        "Program Coordinator",
        None,
        "https://example.com/1",
    );
    let hash2 = GreenhouseScraper::compute_hash(
        "Company",
        "Program Coordinator",
        None,
        "https://example.com/2",
    );

    assert_ne!(hash1, hash2, "Different URL should produce different hash");
}

#[test]
fn test_compute_hash_empty_strings() {
    let hash = GreenhouseScraper::compute_hash("", "", None, "");

    assert_eq!(
        hash.len(),
        64,
        "Hash of empty strings should still be valid"
    );
}

#[test]
fn test_compute_hash_special_characters() {
    let hash = GreenhouseScraper::compute_hash(
        "Community Care Network™",
        "Senior Care Coordinator (Remote) - 🚀",
        Some("Denver, CO"),
        "https://example.com/jobs?id=123&ref=test",
    );

    assert_eq!(hash.len(), 64, "Hash should handle special characters");
}

#[test]
fn test_scraper_name() {
    let scraper = GreenhouseScraper::new(vec![]);
    assert_eq!(scraper.name(), "greenhouse");
}

#[test]
fn test_company_scrape_failure_copy_omits_company_and_error_detail() {
    assert!(!COMPANY_SCRAPE_FAILED.contains("{}"));
    assert!(!COMPANY_SCRAPE_FAILED.contains("https://"));
    assert!(!COMPANY_SCRAPE_FAILED.contains("secret"));
    assert!(!COMPANY_SCRAPE_FAILED.contains("Community Care Network"));
}

#[test]
fn test_new_scraper_with_companies() {
    let companies = vec![
        GreenhouseCompany {
            id: "communitycarenetwork".to_string(),
            name: "Community Care Network".to_string(),
            url: "https://boards.greenhouse.io/communitycarenetwork".to_string(),
        },
        GreenhouseCompany {
            id: "freshmart".to_string(),
            name: "FreshMart".to_string(),
            url: "https://boards.greenhouse.io/freshmart".to_string(),
        },
    ];

    let scraper = GreenhouseScraper::new(companies.clone());

    assert_eq!(scraper.companies.len(), 2);
    assert_eq!(scraper.companies[0].name, "Community Care Network");
    assert_eq!(scraper.companies[1].name, "FreshMart");
}

#[test]
fn test_new_scraper_empty() {
    let scraper = GreenhouseScraper::new(vec![]);
    assert_eq!(scraper.companies.len(), 0);
}

#[tokio::test]
async fn test_scrape_reports_error_when_all_companies_fail() {
    let scraper = GreenhouseScraper::new(vec![GreenhouseCompany {
        id: "broken".to_string(),
        name: "Broken Company".to_string(),
        url: "not a valid url".to_string(),
    }]);

    let error = scraper
        .scrape()
        .await
        .expect_err("all failed companies should not look like an empty success");

    assert!(matches!(
        error,
        ScraperError::Generic {
            scraper,
            message
        } if scraper == "greenhouse" && message.contains("All configured company boards failed")
    ));
}

// ========================================
// Property-Based Tests
// ========================================

use proptest::prelude::*;

#[path = "greenhouse_tests/parsing_tests.rs"]
mod parsing_tests;

#[test]
fn test_scraper_initialization() {
    let companies = vec![
        GreenhouseCompany {
            id: "communitycarenetwork".to_string(),
            name: "Community Care Network".to_string(),
            url: "https://boards.greenhouse.io/communitycarenetwork".to_string(),
        },
        GreenhouseCompany {
            id: "freshmart".to_string(),
            name: "FreshMart".to_string(),
            url: "https://boards.greenhouse.io/freshmart".to_string(),
        },
    ];

    let scraper = GreenhouseScraper::new(companies.clone());

    assert_eq!(scraper.companies.len(), 2);
    assert_eq!(scraper.companies[0].id, "communitycarenetwork");
    assert_eq!(scraper.companies[1].id, "freshmart");
}

#[test]
fn test_company_struct_clone() {
    let company = GreenhouseCompany {
        id: "test-id".to_string(),
        name: "Test Company".to_string(),
        url: "https://boards.greenhouse.io/test".to_string(),
    };

    let cloned = company.clone();

    assert_eq!(company.id, cloned.id);
    assert_eq!(company.name, cloned.name);
    assert_eq!(company.url, cloned.url);
}

#[test]
fn test_company_struct_debug() {
    let company = GreenhouseCompany {
        id: "debug-test".to_string(),
        name: "Debug Test Company".to_string(),
        url: "https://boards.greenhouse.io/debug".to_string(),
    };

    let debug_str = format!("{:?}", company);
    assert!(debug_str.contains("debug-test"));
    assert!(debug_str.contains("Debug Test Company"));
}

proptest! {
    /// Property: Hash function is deterministic
    /// Given the same inputs, compute_hash should always return the same output
    #[test]
    fn prop_hash_deterministic(
        company in "\\PC{1,100}",
        title in "\\PC{1,200}",
        location in proptest::option::of("\\PC{1,100}"),
        url in "https?://[a-z0-9./]+",
    ) {
        let hash1 = GreenhouseScraper::compute_hash(&company, &title, location.as_deref(), &url);
        let hash2 = GreenhouseScraper::compute_hash(&company, &title, location.as_deref(), &url);

        prop_assert_eq!(hash1.clone(), hash2, "Hash should be deterministic");
        prop_assert_eq!(hash1.len(), 64, "Hash should be 64 hex chars");
    }

    /// Property: Hash format is always valid
    /// All hashes should be exactly 64 hexadecimal characters
    #[test]
    fn prop_hash_format_valid(
        company in "\\PC*",
        title in "\\PC*",
        location in proptest::option::of("\\PC*"),
        url in "\\PC*",
    ) {
        let hash = GreenhouseScraper::compute_hash(&company, &title, location.as_deref(), &url);

        prop_assert_eq!(hash.len(), 64, "Hash length should be 64");
        prop_assert!(hash.chars().all(|c| c.is_ascii_hexdigit()), "Hash should only contain hex chars");
    }

    /// Property: Different companies produce different hashes
    /// Changing only the company name should change the hash
    #[test]
    fn prop_hash_company_sensitivity(
        company1 in "\\PC{1,100}",
        company2 in "\\PC{1,100}",
        title in "\\PC{1,200}",
        url in "https?://[a-z0-9./]+",
    ) {
        prop_assume!(company1 != company2);

        let hash1 = GreenhouseScraper::compute_hash(&company1, &title, None, &url);
        let hash2 = GreenhouseScraper::compute_hash(&company2, &title, None, &url);

        prop_assert_ne!(hash1, hash2, "Different companies should produce different hashes");
    }

    /// Property: Different titles produce different hashes
    /// Changing only the title should change the hash
    #[test]
    fn prop_hash_title_sensitivity(
        company in "\\PC{1,100}",
        title1 in "\\PC{1,200}",
        title2 in "\\PC{1,200}",
        url in "https?://[a-z0-9./]+",
    ) {
        prop_assume!(title1 != title2);

        let hash1 = GreenhouseScraper::compute_hash(&company, &title1, None, &url);
        let hash2 = GreenhouseScraper::compute_hash(&company, &title2, None, &url);

        prop_assert_ne!(hash1, hash2, "Different titles should produce different hashes");
    }

    /// Property: Different URLs produce different hashes
    /// Changing only the URL should change the hash
    #[test]
    fn prop_hash_url_sensitivity(
        company in "\\PC{1,100}",
        title in "\\PC{1,200}",
        url1 in "https?://[a-z0-9./]+",
        url2 in "https?://[a-z0-9./]+",
    ) {
        prop_assume!(url1 != url2);

        let hash1 = GreenhouseScraper::compute_hash(&company, &title, None, &url1);
        let hash2 = GreenhouseScraper::compute_hash(&company, &title, None, &url2);

        prop_assert_ne!(hash1, hash2, "Different URLs should produce different hashes");
    }

    /// Property: Location presence affects hash
    /// None vs Some(non-empty location) should produce different hashes
    /// Note: Whitespace-only locations normalize to empty, same as None (correct behavior)
    #[test]
    fn prop_hash_location_none_vs_some(
        company in "\\PC{1,100}",
        title in "\\PC{1,200}",
        location in "[a-zA-Z0-9][\\PC]{0,99}",  // Ensure at least one non-whitespace char
        url in "https?://[a-z0-9./]+",
    ) {
        // Skip if location would normalize to empty (whitespace-only)
        prop_assume!(!location.trim().is_empty());

        let hash_none = GreenhouseScraper::compute_hash(&company, &title, None, &url);
        let hash_some = GreenhouseScraper::compute_hash(&company, &title, Some(&location), &url);

        prop_assert_ne!(hash_none, hash_some, "None vs Some(non-empty) location should produce different hashes");
    }

    /// Property: Hash handles all valid Unicode
    /// Hash should work with any UTF-8 string including emoji and special chars
    #[test]
    fn prop_hash_unicode_safe(
        company in "[\\PC🦀™®]{1,50}",
        title in "[\\PC🚀💼]{1,100}",
        location in proptest::option::of("[\\PC🌍]{1,50}"),
        url in "\\PC{1,200}",
    ) {
        let hash = GreenhouseScraper::compute_hash(&company, &title, location.as_deref(), &url);

        prop_assert_eq!(hash.len(), 64);
        prop_assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
