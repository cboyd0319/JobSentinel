//! Lever ATS Scraper
//!
//! Scrapes jobs from Lever-powered career pages.
//! Lever is used by companies like Netflix, Shopify, IDEO, etc.

use super::http_client::get_client;
use super::{JobScraper, ScraperResult};
use crate::core::db::Job;
use async_trait::async_trait;
use chrono::Utc;
use sha2::{Digest, Sha256};

/// Lever scraper configuration
pub struct LeverScraper {
    /// List of Lever company URLs to scrape
    pub companies: Vec<LeverCompany>,
}

#[derive(Debug, Clone)]
pub struct LeverCompany {
    pub id: String,
    pub name: String,
    pub url: String,
}

impl LeverScraper {
    pub fn new(companies: Vec<LeverCompany>) -> Self {
        Self { companies }
    }

    /// Scrape a single Lever company via API
    async fn scrape_company(&self, company: &LeverCompany) -> ScraperResult {
        tracing::info!("Scraping Lever: {}", company.name);

        // Lever has a public JSON API: https://api.lever.co/v0/postings/{company_id}
        let api_url = format!("https://api.lever.co/v0/postings/{}", company.id);

        tracing::debug!("Fetching Lever API: {}", api_url);

        let client = get_client();

        let response = client.get(&api_url).send().await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Lever API failed: {}", response.status()));
        }

        let json: serde_json::Value = response.json().await?;

        let jobs = if let Some(postings) = json.as_array() {
            let mut jobs = Vec::with_capacity(postings.len());
            for posting in postings {
                let title = posting["text"].as_str().unwrap_or("").to_string();
                let url = posting["hostedUrl"].as_str().unwrap_or("").to_string();
                let location = posting["categories"]["location"]
                    .as_str()
                    .map(|s| s.to_string())
                    .or_else(|| {
                        posting["categories"]["team"]
                            .as_str()
                            .map(|s| s.to_string())
                    });

                // Extract description
                let description = posting["description"]
                    .as_str()
                    .or_else(|| posting["descriptionPlain"].as_str())
                    .map(|s| s.to_string());

                // Infer remote from location or title
                let remote = Self::infer_remote(&title, location.as_deref());

                // Compute hash for deduplication
                let hash = Self::compute_hash(&company.name, &title, location.as_deref(), &url);

                if !title.is_empty() && !url.is_empty() {
                    jobs.push(Job {
                        id: 0,
                        hash,
                        title,
                        company: company.name.clone(),
                        url,
                        location,
                        description,
                        score: None,
                        score_reasons: None,
                        source: "lever".to_string(),
                        remote: Some(remote),
                        salary_min: None,
                        salary_max: None,
                        currency: None,
                        created_at: Utc::now(),
                        updated_at: Utc::now(),
                        last_seen: Utc::now(),
                        times_seen: 1,
                        immediate_alert_sent: false,
            hidden: false,
            bookmarked: false,
            notes: None,
                        included_in_digest: false,
                    });
                }
            }
            jobs
        } else {
            Vec::new()
        };

        tracing::info!("Found {} jobs from {}", jobs.len(), company.name);
        Ok(jobs)
    }

    /// Infer if job is remote from title or location
    fn infer_remote(title: &str, location: Option<&str>) -> bool {
        let title_lower = title.to_lowercase();
        let location_lower = location.map(|l| l.to_lowercase()).unwrap_or_default();

        // Check title
        if title_lower.contains("remote")
            || title_lower.contains("work from home")
            || title_lower.contains("wfh")
        {
            return true;
        }

        // Check location
        if location_lower.contains("remote")
            || location_lower.contains("anywhere")
            || location_lower.contains("worldwide")
        {
            return true;
        }

        false
    }

    /// Compute SHA-256 hash for deduplication
    fn compute_hash(company: &str, title: &str, location: Option<&str>, url: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(company.as_bytes());
        hasher.update(title.as_bytes());
        if let Some(loc) = location {
            hasher.update(loc.as_bytes());
        }
        hasher.update(url.as_bytes());
        hex::encode(hasher.finalize())
    }
}

#[async_trait]
impl JobScraper for LeverScraper {
    async fn scrape(&self) -> ScraperResult {
        let mut all_jobs = Vec::new();

        for company in &self.companies {
            match self.scrape_company(company).await {
                Ok(jobs) => {
                    all_jobs.extend(jobs);
                }
                Err(e) => {
                    tracing::error!("Failed to scrape {}: {}", company.name, e);
                    // Continue with other companies
                }
            }

            // Rate limiting: wait 2 seconds between companies
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        }

        Ok(all_jobs)
    }

    fn name(&self) -> &'static str {
        "lever"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Remote inference tests
    #[test]
    fn test_infer_remote_from_title_remote() {
        assert!(LeverScraper::infer_remote("Software Engineer (Remote)", None));
        assert!(LeverScraper::infer_remote("REMOTE - Backend Developer", None));
        assert!(LeverScraper::infer_remote("DevOps Engineer - remote", None));
    }

    #[test]
    fn test_infer_remote_from_title_wfh() {
        assert!(LeverScraper::infer_remote("Frontend Dev (Work From Home)", None));
        assert!(LeverScraper::infer_remote("WFH - Data Engineer", None));
    }

    #[test]
    fn test_infer_remote_from_location_remote() {
        assert!(LeverScraper::infer_remote("Backend Developer", Some("Remote")));
        assert!(LeverScraper::infer_remote("Engineer", Some("Remote - US")));
        assert!(LeverScraper::infer_remote("Developer", Some("REMOTE")));
    }

    #[test]
    fn test_infer_remote_from_location_anywhere() {
        assert!(LeverScraper::infer_remote("Engineer", Some("Anywhere")));
        assert!(LeverScraper::infer_remote("Developer", Some("anywhere in USA")));
    }

    #[test]
    fn test_infer_remote_from_location_worldwide() {
        assert!(LeverScraper::infer_remote("Engineer", Some("Worldwide")));
        assert!(LeverScraper::infer_remote("Developer", Some("worldwide - remote")));
    }

    #[test]
    fn test_infer_remote_false_for_onsite() {
        assert!(!LeverScraper::infer_remote("Frontend Engineer", Some("San Francisco")));
        assert!(!LeverScraper::infer_remote("Backend Dev", Some("New York, NY")));
        assert!(!LeverScraper::infer_remote("DevOps", Some("Seattle")));
    }

    #[test]
    fn test_infer_remote_false_no_indicators() {
        assert!(!LeverScraper::infer_remote("Software Engineer", None));
        assert!(!LeverScraper::infer_remote("Data Scientist", Some("Boston")));
    }

    #[test]
    fn test_infer_remote_case_insensitive() {
        assert!(LeverScraper::infer_remote("Engineer (REMOTE)", None));
        assert!(LeverScraper::infer_remote("Dev", Some("ReMoTe")));
    }

    // Hash computation tests
    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = LeverScraper::compute_hash(
            "Shopify",
            "Engineer",
            Some("Remote"),
            "https://example.com/1",
        );
        let hash2 = LeverScraper::compute_hash(
            "Shopify",
            "Engineer",
            Some("Remote"),
            "https://example.com/1",
        );

        assert_eq!(hash1, hash2, "Same inputs should produce same hash");
        assert_eq!(hash1.len(), 64, "SHA-256 hash should be 64 hex chars");
    }

    #[test]
    fn test_compute_hash_different_company() {
        let hash1 = LeverScraper::compute_hash("Shopify", "Engineer", None, "https://example.com/1");
        let hash2 = LeverScraper::compute_hash("Netflix", "Engineer", None, "https://example.com/1");

        assert_ne!(hash1, hash2, "Different company should produce different hash");
    }

    #[test]
    fn test_compute_hash_different_title() {
        let hash1 = LeverScraper::compute_hash("Company", "Frontend Engineer", None, "https://example.com/1");
        let hash2 = LeverScraper::compute_hash("Company", "Backend Engineer", None, "https://example.com/1");

        assert_ne!(hash1, hash2, "Different title should produce different hash");
    }

    #[test]
    fn test_compute_hash_different_location() {
        let hash1 = LeverScraper::compute_hash("Company", "Engineer", Some("Remote"), "https://example.com/1");
        let hash2 = LeverScraper::compute_hash("Company", "Engineer", Some("SF"), "https://example.com/1");

        assert_ne!(hash1, hash2, "Different location should produce different hash");
    }

    #[test]
    fn test_compute_hash_location_none_vs_some() {
        let hash1 = LeverScraper::compute_hash("Company", "Engineer", None, "https://example.com/1");
        let hash2 = LeverScraper::compute_hash("Company", "Engineer", Some("Remote"), "https://example.com/1");

        assert_ne!(hash1, hash2, "None location should differ from Some");
    }

    #[test]
    fn test_compute_hash_different_url() {
        let hash1 = LeverScraper::compute_hash("Company", "Engineer", None, "https://example.com/1");
        let hash2 = LeverScraper::compute_hash("Company", "Engineer", None, "https://example.com/2");

        assert_ne!(hash1, hash2, "Different URL should produce different hash");
    }

    #[test]
    fn test_compute_hash_empty_strings() {
        let hash = LeverScraper::compute_hash("", "", None, "");
        assert_eq!(hash.len(), 64, "Hash of empty strings should still be valid");
    }

    #[test]
    fn test_compute_hash_special_characters() {
        let hash = LeverScraper::compute_hash(
            "Company™",
            "Senior Engineer (Remote) 🚀",
            Some("San Francisco, CA"),
            "https://jobs.lever.co/company/job-id?ref=test&utm_source=linkedin",
        );

        assert_eq!(hash.len(), 64, "Hash should handle special characters");
    }

    // Scraper initialization tests
    #[test]
    fn test_scraper_name() {
        let scraper = LeverScraper::new(vec![]);
        assert_eq!(scraper.name(), "lever");
    }

    #[test]
    fn test_new_scraper_with_companies() {
        let companies = vec![
            LeverCompany {
                id: "shopify".to_string(),
                name: "Shopify".to_string(),
                url: "https://jobs.lever.co/shopify".to_string(),
            },
            LeverCompany {
                id: "netflix".to_string(),
                name: "Netflix".to_string(),
                url: "https://jobs.lever.co/netflix".to_string(),
            },
        ];

        let scraper = LeverScraper::new(companies.clone());

        assert_eq!(scraper.companies.len(), 2);
        assert_eq!(scraper.companies[0].name, "Shopify");
        assert_eq!(scraper.companies[1].name, "Netflix");
        assert_eq!(scraper.companies[0].id, "shopify");
    }

    #[test]
    fn test_new_scraper_empty() {
        let scraper = LeverScraper::new(vec![]);
        assert_eq!(scraper.companies.len(), 0);
    }

    #[test]
    fn test_parse_response_single_job() {
        let json_data = r#"
        [
            {
                "text": "Senior Backend Engineer",
                "hostedUrl": "https://jobs.lever.co/shopify/abc123",
                "categories": {
                    "location": "Remote",
                    "team": "Engineering"
                },
                "description": "<p>Join our backend team</p>",
                "descriptionPlain": "Join our backend team"
            }
        ]
        "#;

        let _scraper = LeverScraper::new(vec![LeverCompany {
            id: "shopify".to_string(),
            name: "Shopify".to_string(),
            url: "https://jobs.lever.co/shopify".to_string(),
        }]);

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(postings) = parsed.as_array() {
            assert_eq!(postings.len(), 1);

            let posting = &postings[0];
            let title = posting["text"].as_str().unwrap();
            let url = posting["hostedUrl"].as_str().unwrap();
            let location = posting["categories"]["location"].as_str();

            assert_eq!(title, "Senior Backend Engineer");
            assert_eq!(url, "https://jobs.lever.co/shopify/abc123");
            assert_eq!(location, Some("Remote"));
        }
    }

    #[test]
    fn test_parse_response_multiple_jobs() {
        let json_data = r#"
        [
            {
                "text": "Frontend Engineer",
                "hostedUrl": "https://jobs.lever.co/netflix/job1",
                "categories": {
                    "location": "Los Gatos, CA"
                }
            },
            {
                "text": "Platform Engineer",
                "hostedUrl": "https://jobs.lever.co/netflix/job2",
                "categories": {
                    "team": "Infrastructure"
                }
            },
            {
                "text": "DevOps Engineer",
                "hostedUrl": "https://jobs.lever.co/netflix/job3",
                "categories": {
                    "location": "Remote - US"
                }
            }
        ]
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(postings) = parsed.as_array() {
            assert_eq!(postings.len(), 3);

            assert_eq!(postings[0]["text"].as_str(), Some("Frontend Engineer"));
            assert_eq!(postings[1]["text"].as_str(), Some("Platform Engineer"));
            assert_eq!(postings[2]["text"].as_str(), Some("DevOps Engineer"));

            // First has location in categories.location
            assert_eq!(
                postings[0]["categories"]["location"].as_str(),
                Some("Los Gatos, CA")
            );

            // Second has team instead of location
            assert_eq!(postings[1]["categories"]["location"].as_str(), None);
            assert_eq!(postings[1]["categories"]["team"].as_str(), Some("Infrastructure"));

            // Third has remote location
            assert_eq!(
                postings[2]["categories"]["location"].as_str(),
                Some("Remote - US")
            );
        }
    }

    #[test]
    fn test_parse_response_empty_array() {
        let json_data = "[]";
        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(postings) = parsed.as_array() {
            assert_eq!(postings.len(), 0);
        }
    }

    #[test]
    fn test_parse_response_missing_fields() {
        let json_data = r#"
        [
            {
                "text": "Engineer",
                "hostedUrl": "https://jobs.lever.co/company/job1"
            },
            {
                "hostedUrl": "https://jobs.lever.co/company/job2"
            },
            {
                "text": "Developer"
            },
            {
                "text": "",
                "hostedUrl": ""
            }
        ]
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(postings) = parsed.as_array() {
            assert_eq!(postings.len(), 4);

            // First has both fields
            assert!(postings[0]["text"].as_str().is_some());
            assert!(postings[0]["hostedUrl"].as_str().is_some());

            // Second missing text
            assert!(postings[1]["text"].as_str().is_none());

            // Third missing hostedUrl
            assert!(postings[2]["hostedUrl"].as_str().is_none());

            // Fourth has empty strings (should be filtered by scraper logic)
            assert_eq!(postings[3]["text"].as_str(), Some(""));
            assert_eq!(postings[3]["hostedUrl"].as_str(), Some(""));
        }
    }

    #[test]
    fn test_parse_response_with_description_variants() {
        let json_data = r#"
        [
            {
                "text": "Job 1",
                "hostedUrl": "https://jobs.lever.co/company/1",
                "description": "<p>HTML description</p>"
            },
            {
                "text": "Job 2",
                "hostedUrl": "https://jobs.lever.co/company/2",
                "descriptionPlain": "Plain text description"
            },
            {
                "text": "Job 3",
                "hostedUrl": "https://jobs.lever.co/company/3",
                "description": "<p>HTML version</p>",
                "descriptionPlain": "Plain version"
            },
            {
                "text": "Job 4",
                "hostedUrl": "https://jobs.lever.co/company/4"
            }
        ]
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(postings) = parsed.as_array() {
            // Job 1: has description (HTML)
            assert_eq!(
                postings[0]["description"].as_str(),
                Some("<p>HTML description</p>")
            );

            // Job 2: has descriptionPlain only
            assert_eq!(
                postings[1]["descriptionPlain"].as_str(),
                Some("Plain text description")
            );

            // Job 3: has both (should prefer description first)
            assert!(postings[2]["description"].as_str().is_some());
            assert!(postings[2]["descriptionPlain"].as_str().is_some());

            // Job 4: has neither
            assert!(postings[3]["description"].as_str().is_none());
            assert!(postings[3]["descriptionPlain"].as_str().is_none());
        }
    }

    #[test]
    fn test_infer_remote_from_combined_indicators() {
        // Both title and location indicate remote
        assert!(LeverScraper::infer_remote(
            "Remote Senior Engineer",
            Some("Remote - Global")
        ));

        // Title says remote, location doesn't
        assert!(LeverScraper::infer_remote(
            "Remote Engineer",
            Some("San Francisco")
        ));

        // Location says remote, title doesn't
        assert!(LeverScraper::infer_remote(
            "Senior Engineer",
            Some("Remote - US")
        ));

        // Neither indicates remote
        assert!(!LeverScraper::infer_remote(
            "Senior Engineer",
            Some("New York, NY")
        ));
    }

    #[test]
    fn test_infer_remote_edge_cases() {
        // "remote" as part of a larger word should still match
        assert!(LeverScraper::infer_remote("remotely", None));

        // Multiple remote indicators
        assert!(LeverScraper::infer_remote(
            "Remote Work From Home Engineer",
            Some("Anywhere")
        ));

        // Empty location
        assert!(!LeverScraper::infer_remote("Engineer", Some("")));

        // None location with non-remote title
        assert!(!LeverScraper::infer_remote("Senior Engineer", None));
    }

    #[test]
    fn test_api_url_construction() {
        let companies = vec![
            LeverCompany {
                id: "shopify".to_string(),
                name: "Shopify".to_string(),
                url: "https://jobs.lever.co/shopify".to_string(),
            },
            LeverCompany {
                id: "netflix".to_string(),
                name: "Netflix".to_string(),
                url: "https://jobs.lever.co/netflix".to_string(),
            },
        ];

        for company in &companies {
            let api_url = format!("https://api.lever.co/v0/postings/{}", company.id);
            assert!(api_url.starts_with("https://api.lever.co/v0/postings/"));
            assert!(api_url.ends_with(&company.id));
        }
    }

    #[test]
    fn test_hash_with_json_data() {
        let company = "Shopify";
        let title = "Senior Backend Engineer";
        let location = Some("Remote");
        let url = "https://jobs.lever.co/shopify/abc123";

        let hash = LeverScraper::compute_hash(company, title, location, url);

        assert_eq!(hash.len(), 64);
        assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_hash_different_with_different_location_values() {
        let hash1 = LeverScraper::compute_hash(
            "Company",
            "Engineer",
            Some("Remote"),
            "https://example.com/1",
        );
        let hash2 = LeverScraper::compute_hash(
            "Company",
            "Engineer",
            Some("Remote - US"),
            "https://example.com/1",
        );
        let hash3 = LeverScraper::compute_hash(
            "Company",
            "Engineer",
            Some("Remote - Global"),
            "https://example.com/1",
        );

        assert_ne!(hash1, hash2);
        assert_ne!(hash2, hash3);
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_parse_response_location_fallback_to_team() {
        let json_data = r#"
        [
            {
                "text": "Engineer",
                "hostedUrl": "https://jobs.lever.co/company/job1",
                "categories": {
                    "team": "Platform Team"
                }
            }
        ]
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(postings) = parsed.as_array() {
            let posting = &postings[0];

            // No location field, should fall back to team
            let location = posting["categories"]["location"]
                .as_str()
                .map(|s| s.to_string())
                .or_else(|| {
                    posting["categories"]["team"]
                        .as_str()
                        .map(|s| s.to_string())
                });

            assert_eq!(location, Some("Platform Team".to_string()));
        }
    }

    #[test]
    fn test_parse_response_special_characters_in_json() {
        let json_data = r#"
        [
            {
                "text": "Senior Engineer (Backend) - 🚀",
                "hostedUrl": "https://jobs.lever.co/company™/job-id",
                "categories": {
                    "location": "San Francisco, CA / Remote"
                },
                "description": "We're looking for a <strong>talented</strong> engineer!"
            }
        ]
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(postings) = parsed.as_array() {
            let posting = &postings[0];

            assert!(posting["text"].as_str().unwrap().contains("🚀"));
            assert!(posting["hostedUrl"].as_str().unwrap().contains("™"));
            assert!(posting["categories"]["location"].as_str().unwrap().contains("/"));
            assert!(posting["description"].as_str().unwrap().contains("<strong>"));
        }
    }

    // ========================================
    // Property-Based Tests
    // ========================================

    use proptest::prelude::*;

    proptest! {
        /// Property: Hash function is deterministic
        #[test]
        fn prop_hash_deterministic(
            company in "\\PC{1,100}",
            title in "\\PC{1,200}",
            location in proptest::option::of("\\PC{1,100}"),
            url in "https?://[a-z0-9./]+",
        ) {
            let hash1 = LeverScraper::compute_hash(&company, &title, location.as_deref(), &url);
            let hash2 = LeverScraper::compute_hash(&company, &title, location.as_deref(), &url);

            prop_assert_eq!(hash1.clone(), hash2);
            prop_assert_eq!(hash1.len(), 64);
        }

        /// Property: Hash collision resistance
        #[test]
        fn prop_hash_collision_resistance(
            company1 in "\\PC{1,100}",
            company2 in "\\PC{1,100}",
            title in "\\PC{1,200}",
            url in "https?://[a-z0-9./]+",
        ) {
            prop_assume!(company1 != company2);

            let hash1 = LeverScraper::compute_hash(&company1, &title, None, &url);
            let hash2 = LeverScraper::compute_hash(&company2, &title, None, &url);

            prop_assert_ne!(hash1, hash2);
        }

        /// Property: Remote inference from title is case-insensitive
        #[test]
        fn prop_remote_inference_case_insensitive(
            prefix in "(remote|REMOTE|Remote|ReMoTe)",
            title in "[a-zA-Z ]{5,50}",
        ) {
            let full_title = format!("{} {}", prefix, title);
            prop_assert!(LeverScraper::infer_remote(&full_title, None));
        }

        /// Property: Remote inference from location handles various "remote" spellings
        #[test]
        fn prop_remote_inference_from_location(
            location in "(Remote|remote|REMOTE|Anywhere|anywhere|Worldwide|worldwide)",
        ) {
            prop_assert!(LeverScraper::infer_remote("Engineer", Some(&location)));
        }

        /// Property: Non-remote titles don't trigger false positives
        #[test]
        fn prop_remote_inference_no_false_positives(
            title in "[a-zA-Z ]{5,50}",
            location in "(New York|San Francisco|London|Tokyo|Austin)",
        ) {
            prop_assume!(!title.to_lowercase().contains("remote"));
            prop_assume!(!title.to_lowercase().contains("work from home"));
            prop_assume!(!title.to_lowercase().contains("wfh"));

            prop_assert!(!LeverScraper::infer_remote(&title, Some(&location)));
        }

        /// Property: Hash handles Unicode characters
        #[test]
        fn prop_hash_unicode_support(
            company in "[\\PC🦀]{1,50}",
            title in "[\\PC💼]{1,100}",
            url in "\\PC{10,200}",
        ) {
            let hash = LeverScraper::compute_hash(&company, &title, None, &url);

            prop_assert_eq!(hash.len(), 64);
            prop_assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
        }
    }
}
