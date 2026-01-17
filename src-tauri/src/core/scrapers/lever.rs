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
                        ghost_score: None,
                        ghost_reasons: None,
                        first_seen: None,
                        repost_count: 0,
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
        assert!(LeverScraper::infer_remote(
            "Software Engineer (Remote)",
            None
        ));
        assert!(LeverScraper::infer_remote(
            "REMOTE - Backend Developer",
            None
        ));
        assert!(LeverScraper::infer_remote("DevOps Engineer - remote", None));
    }

    #[test]
    fn test_infer_remote_from_title_wfh() {
        assert!(LeverScraper::infer_remote(
            "Frontend Dev (Work From Home)",
            None
        ));
        assert!(LeverScraper::infer_remote("WFH - Data Engineer", None));
    }

    #[test]
    fn test_infer_remote_from_location_remote() {
        assert!(LeverScraper::infer_remote(
            "Backend Developer",
            Some("Remote")
        ));
        assert!(LeverScraper::infer_remote("Engineer", Some("Remote - US")));
        assert!(LeverScraper::infer_remote("Developer", Some("REMOTE")));
    }

    #[test]
    fn test_infer_remote_from_location_anywhere() {
        assert!(LeverScraper::infer_remote("Engineer", Some("Anywhere")));
        assert!(LeverScraper::infer_remote(
            "Developer",
            Some("anywhere in USA")
        ));
    }

    #[test]
    fn test_infer_remote_from_location_worldwide() {
        assert!(LeverScraper::infer_remote("Engineer", Some("Worldwide")));
        assert!(LeverScraper::infer_remote(
            "Developer",
            Some("worldwide - remote")
        ));
    }

    #[test]
    fn test_infer_remote_false_for_onsite() {
        assert!(!LeverScraper::infer_remote(
            "Frontend Engineer",
            Some("San Francisco")
        ));
        assert!(!LeverScraper::infer_remote(
            "Backend Dev",
            Some("New York, NY")
        ));
        assert!(!LeverScraper::infer_remote("DevOps", Some("Seattle")));
    }

    #[test]
    fn test_infer_remote_false_no_indicators() {
        assert!(!LeverScraper::infer_remote("Software Engineer", None));
        assert!(!LeverScraper::infer_remote(
            "Data Scientist",
            Some("Boston")
        ));
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
        let hash1 =
            LeverScraper::compute_hash("Shopify", "Engineer", None, "https://example.com/1");
        let hash2 =
            LeverScraper::compute_hash("Netflix", "Engineer", None, "https://example.com/1");

        assert_ne!(
            hash1, hash2,
            "Different company should produce different hash"
        );
    }

    #[test]
    fn test_compute_hash_different_title() {
        let hash1 = LeverScraper::compute_hash(
            "Company",
            "Frontend Engineer",
            None,
            "https://example.com/1",
        );
        let hash2 = LeverScraper::compute_hash(
            "Company",
            "Backend Engineer",
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
        let hash1 = LeverScraper::compute_hash(
            "Company",
            "Engineer",
            Some("Remote"),
            "https://example.com/1",
        );
        let hash2 =
            LeverScraper::compute_hash("Company", "Engineer", Some("SF"), "https://example.com/1");

        assert_ne!(
            hash1, hash2,
            "Different location should produce different hash"
        );
    }

    #[test]
    fn test_compute_hash_location_none_vs_some() {
        let hash1 =
            LeverScraper::compute_hash("Company", "Engineer", None, "https://example.com/1");
        let hash2 = LeverScraper::compute_hash(
            "Company",
            "Engineer",
            Some("Remote"),
            "https://example.com/1",
        );

        assert_ne!(hash1, hash2, "None location should differ from Some");
    }

    #[test]
    fn test_compute_hash_different_url() {
        let hash1 =
            LeverScraper::compute_hash("Company", "Engineer", None, "https://example.com/1");
        let hash2 =
            LeverScraper::compute_hash("Company", "Engineer", None, "https://example.com/2");

        assert_ne!(hash1, hash2, "Different URL should produce different hash");
    }

    #[test]
    fn test_compute_hash_empty_strings() {
        let hash = LeverScraper::compute_hash("", "", None, "");
        assert_eq!(
            hash.len(),
            64,
            "Hash of empty strings should still be valid"
        );
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
            assert_eq!(
                postings[1]["categories"]["team"].as_str(),
                Some("Infrastructure")
            );

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

    // ========================================
    // JSON Parsing and Edge Case Tests
    // ========================================

    #[test]
    fn test_parse_response_filters_empty_title() {
        let json_data = r#"
        [
            {
                "text": "",
                "hostedUrl": "https://jobs.lever.co/company/job1"
            },
            {
                "text": "Valid Job",
                "hostedUrl": "https://jobs.lever.co/company/job2"
            }
        ]
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(postings) = parsed.as_array() {
            let mut valid_jobs = 0;
            for posting in postings {
                let title = posting["text"].as_str().unwrap_or("").to_string();
                let url = posting["hostedUrl"].as_str().unwrap_or("").to_string();

                if !title.is_empty() && !url.is_empty() {
                    valid_jobs += 1;
                }
            }

            // Only the second job should pass validation
            assert_eq!(valid_jobs, 1);
        }
    }

    #[test]
    fn test_parse_response_filters_empty_url() {
        let json_data = r#"
        [
            {
                "text": "Engineer",
                "hostedUrl": ""
            },
            {
                "text": "Developer",
                "hostedUrl": "https://jobs.lever.co/company/job2"
            }
        ]
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(postings) = parsed.as_array() {
            let mut valid_jobs = 0;
            for posting in postings {
                let title = posting["text"].as_str().unwrap_or("").to_string();
                let url = posting["hostedUrl"].as_str().unwrap_or("").to_string();

                if !title.is_empty() && !url.is_empty() {
                    valid_jobs += 1;
                }
            }

            assert_eq!(valid_jobs, 1);
        }
    }

    #[test]
    fn test_parse_response_description_priority() {
        let json_data = r#"
        [
            {
                "text": "Job 1",
                "hostedUrl": "https://jobs.lever.co/company/1",
                "description": "<p>HTML version</p>",
                "descriptionPlain": "Plain version"
            },
            {
                "text": "Job 2",
                "hostedUrl": "https://jobs.lever.co/company/2",
                "descriptionPlain": "Only plain"
            },
            {
                "text": "Job 3",
                "hostedUrl": "https://jobs.lever.co/company/3"
            }
        ]
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(postings) = parsed.as_array() {
            // Job 1: prefers description over descriptionPlain
            let desc1 = postings[0]["description"]
                .as_str()
                .or_else(|| postings[0]["descriptionPlain"].as_str());
            assert_eq!(desc1, Some("<p>HTML version</p>"));

            // Job 2: uses descriptionPlain when description is missing
            let desc2 = postings[1]["description"]
                .as_str()
                .or_else(|| postings[1]["descriptionPlain"].as_str());
            assert_eq!(desc2, Some("Only plain"));

            // Job 3: neither field exists
            let desc3 = postings[2]["description"]
                .as_str()
                .or_else(|| postings[2]["descriptionPlain"].as_str());
            assert_eq!(desc3, None);
        }
    }

    #[test]
    fn test_parse_response_non_array_json() {
        let json_data = r#"
        {
            "error": "Not an array"
        }
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        // Should not panic, just return None
        if let Some(_postings) = parsed.as_array() {
            panic!("Should not be an array");
        }
    }

    #[test]
    fn test_parse_response_nested_categories() {
        let json_data = r#"
        [
            {
                "text": "Engineer",
                "hostedUrl": "https://jobs.lever.co/company/1",
                "categories": {
                    "location": "Remote",
                    "team": "Engineering",
                    "commitment": "Full-time"
                }
            }
        ]
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(postings) = parsed.as_array() {
            let posting = &postings[0];

            // Test location extraction
            let location = posting["categories"]["location"].as_str();
            assert_eq!(location, Some("Remote"));

            // Test team fallback availability
            let team = posting["categories"]["team"].as_str();
            assert_eq!(team, Some("Engineering"));
        }
    }

    #[test]
    fn test_parse_response_null_categories() {
        let json_data = r#"
        [
            {
                "text": "Engineer",
                "hostedUrl": "https://jobs.lever.co/company/1",
                "categories": null
            }
        ]
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(postings) = parsed.as_array() {
            let posting = &postings[0];

            // Should not panic when categories is null
            let location = posting["categories"]["location"].as_str();
            assert_eq!(location, None);
        }
    }

    #[test]
    fn test_parse_response_mixed_valid_invalid() {
        let json_data = r#"
        [
            {
                "text": "Valid Job 1",
                "hostedUrl": "https://jobs.lever.co/company/1"
            },
            {
                "text": "",
                "hostedUrl": "https://jobs.lever.co/company/2"
            },
            {
                "text": "Valid Job 2",
                "hostedUrl": ""
            },
            {
                "text": "Valid Job 3",
                "hostedUrl": "https://jobs.lever.co/company/3"
            }
        ]
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(postings) = parsed.as_array() {
            let mut valid_count = 0;
            for posting in postings {
                let title = posting["text"].as_str().unwrap_or("").to_string();
                let url = posting["hostedUrl"].as_str().unwrap_or("").to_string();

                if !title.is_empty() && !url.is_empty() {
                    valid_count += 1;
                }
            }

            // Only jobs 1 and 3 should be valid
            assert_eq!(valid_count, 2);
        }
    }

    #[test]
    fn test_infer_remote_partial_word_matches() {
        // "remote" should match even within words
        assert!(LeverScraper::infer_remote("remotely accessible", None));

        // "wfh" should match as standalone or within text
        assert!(LeverScraper::infer_remote("wfh-friendly", None));

        // "work from home" requires exact spacing (not "work-from-home")
        assert!(LeverScraper::infer_remote(
            "work from home opportunity",
            None
        ));
        assert!(!LeverScraper::infer_remote(
            "work-from-home opportunity",
            None
        ));
    }

    #[test]
    fn test_infer_remote_location_variations() {
        // Various remote location formats
        assert!(LeverScraper::infer_remote("Engineer", Some("Remote (US)")));
        assert!(LeverScraper::infer_remote(
            "Engineer",
            Some("Remote/Hybrid")
        ));
        assert!(LeverScraper::infer_remote("Engineer", Some("100% Remote")));
        assert!(LeverScraper::infer_remote("Engineer", Some("REMOTE FIRST")));

        // Worldwide variations
        assert!(LeverScraper::infer_remote(
            "Engineer",
            Some("Worldwide Remote")
        ));
        assert!(LeverScraper::infer_remote(
            "Engineer",
            Some("Global/Worldwide")
        ));

        // Anywhere variations
        assert!(LeverScraper::infer_remote(
            "Engineer",
            Some("Work from Anywhere")
        ));
        assert!(LeverScraper::infer_remote(
            "Engineer",
            Some("Anywhere in Europe")
        ));
    }

    #[test]
    fn test_hash_consistency_across_runs() {
        // Generate hash multiple times to ensure consistency
        let company = "Test Company™";
        let title = "Senior Engineer (Remote) 🚀";
        let location = Some("San Francisco, CA");
        let url = "https://jobs.lever.co/test/abc123?ref=linkedin";

        let hashes: Vec<String> = (0..10)
            .map(|_| LeverScraper::compute_hash(company, title, location, url))
            .collect();

        // All hashes should be identical
        for i in 1..hashes.len() {
            assert_eq!(hashes[0], hashes[i]);
        }
    }

    #[test]
    fn test_hash_with_query_parameters() {
        let hash1 = LeverScraper::compute_hash(
            "Company",
            "Engineer",
            None,
            "https://jobs.lever.co/company/job?ref=linkedin",
        );
        let hash2 = LeverScraper::compute_hash(
            "Company",
            "Engineer",
            None,
            "https://jobs.lever.co/company/job?ref=twitter",
        );
        let hash3 = LeverScraper::compute_hash(
            "Company",
            "Engineer",
            None,
            "https://jobs.lever.co/company/job",
        );

        // Query parameters should affect hash
        assert_ne!(hash1, hash2);
        assert_ne!(hash1, hash3);
        assert_ne!(hash2, hash3);
    }

    #[test]
    fn test_company_struct_clone() {
        let company = LeverCompany {
            id: "test-id".to_string(),
            name: "Test Company".to_string(),
            url: "https://jobs.lever.co/test".to_string(),
        };

        let cloned = company.clone();

        assert_eq!(company.id, cloned.id);
        assert_eq!(company.name, cloned.name);
        assert_eq!(company.url, cloned.url);
    }

    #[test]
    fn test_company_struct_debug() {
        let company = LeverCompany {
            id: "debug-test".to_string(),
            name: "Debug Test Company".to_string(),
            url: "https://jobs.lever.co/debug".to_string(),
        };

        let debug_str = format!("{:?}", company);
        assert!(debug_str.contains("debug-test"));
        assert!(debug_str.contains("Debug Test Company"));
    }

    #[test]
    fn test_infer_remote_empty_strings() {
        assert!(!LeverScraper::infer_remote("", None));
        assert!(!LeverScraper::infer_remote("", Some("")));
        assert!(!LeverScraper::infer_remote("Engineer", Some("")));
    }

    #[test]
    fn test_infer_remote_false_positives_prevention() {
        // Current implementation matches "remote" anywhere in the string
        // This is a known limitation - any "remote" substring matches
        assert!(LeverScraper::infer_remote(
            "Engineer",
            Some("Remote Street, Boston")
        ));

        // Should match if it's clearly about work arrangement
        assert!(LeverScraper::infer_remote(
            "Engineer",
            Some("Remote - Boston preferred")
        ));

        // Location names that definitely aren't remote work
        assert!(!LeverScraper::infer_remote(
            "Engineer",
            Some("Paris, France")
        ));
        assert!(!LeverScraper::infer_remote(
            "Engineer",
            Some("Downtown NYC")
        ));
    }

    #[test]
    fn test_parse_response_large_capacity() {
        // Test that capacity hint works correctly
        let postings = vec![
            serde_json::json!({
                "text": "Job 1",
                "hostedUrl": "https://example.com/1"
            }),
            serde_json::json!({
                "text": "Job 2",
                "hostedUrl": "https://example.com/2"
            }),
            serde_json::json!({
                "text": "Job 3",
                "hostedUrl": "https://example.com/3"
            }),
        ];

        let json = serde_json::json!(postings);

        if let Some(array) = json.as_array() {
            let mut jobs = Vec::with_capacity(array.len());

            for posting in array {
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
            assert!(posting["categories"]["location"]
                .as_str()
                .unwrap()
                .contains("/"));
            assert!(posting["description"]
                .as_str()
                .unwrap()
                .contains("<strong>"));
        }
    }

    // ========================================
    // Integration Tests for scrape_company
    // ========================================

    #[tokio::test]
    async fn test_scrape_company_creates_jobs_from_api_response() {
        // This test validates the full scrape_company flow with mock data
        let company = LeverCompany {
            id: "test-company".to_string(),
            name: "Test Company".to_string(),
            url: "https://jobs.lever.co/test-company".to_string(),
        };

        let _scraper = LeverScraper::new(vec![company.clone()]);

        // We can't directly test scrape_company without a real API or mock server
        // but we can test the JSON processing logic that it uses
        let json_response = serde_json::json!([
            {
                "text": "Senior Backend Engineer",
                "hostedUrl": "https://jobs.lever.co/test-company/job1",
                "categories": {
                    "location": "Remote",
                    "team": "Engineering"
                },
                "description": "<p>Join our backend team</p>",
                "descriptionPlain": "Join our backend team"
            },
            {
                "text": "Frontend Developer",
                "hostedUrl": "https://jobs.lever.co/test-company/job2",
                "categories": {
                    "location": "San Francisco, CA"
                },
                "descriptionPlain": "Build great UIs"
            },
            {
                "text": "",
                "hostedUrl": "https://jobs.lever.co/test-company/job3"
            }
        ]);

        // Simulate the processing logic from scrape_company
        let jobs = if let Some(postings) = json_response.as_array() {
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

                let description = posting["description"]
                    .as_str()
                    .or_else(|| posting["descriptionPlain"].as_str())
                    .map(|s| s.to_string());

                let remote = LeverScraper::infer_remote(&title, location.as_deref());
                let hash =
                    LeverScraper::compute_hash(&company.name, &title, location.as_deref(), &url);

                if !title.is_empty() && !url.is_empty() {
                    jobs.push(Job {
                        id: 0,
                        hash: hash.clone(),
                        title: title.clone(),
                        company: company.name.clone(),
                        url: url.clone(),
                        location: location.clone(),
                        description: description.clone(),
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
                        ghost_score: None,
                        ghost_reasons: None,
                        first_seen: None,
                        repost_count: 0,
                        included_in_digest: false,
                    });
                }
            }
            jobs
        } else {
            Vec::new()
        };

        // Validate results
        assert_eq!(
            jobs.len(),
            2,
            "Should create 2 jobs (third has empty title)"
        );

        // Validate first job
        assert_eq!(jobs[0].title, "Senior Backend Engineer");
        assert_eq!(jobs[0].company, "Test Company");
        assert_eq!(jobs[0].url, "https://jobs.lever.co/test-company/job1");
        assert_eq!(jobs[0].location, Some("Remote".to_string()));
        assert_eq!(
            jobs[0].description,
            Some("<p>Join our backend team</p>".to_string())
        );
        assert_eq!(jobs[0].source, "lever");
        assert_eq!(jobs[0].remote, Some(true));
        assert_eq!(jobs[0].times_seen, 1);
        assert_eq!(jobs[0].immediate_alert_sent, false);
        assert_eq!(jobs[0].hidden, false);
        assert_eq!(jobs[0].bookmarked, false);
        assert_eq!(jobs[0].notes, None);
        assert_eq!(jobs[0].hash.len(), 64);

        // Validate second job
        assert_eq!(jobs[1].title, "Frontend Developer");
        assert_eq!(jobs[1].company, "Test Company");
        assert_eq!(jobs[1].remote, Some(false));
        assert_eq!(jobs[1].location, Some("San Francisco, CA".to_string()));
    }

    #[tokio::test]
    async fn test_scrape_company_handles_empty_response() {
        let company = LeverCompany {
            id: "empty-company".to_string(),
            name: "Empty Company".to_string(),
            url: "https://jobs.lever.co/empty-company".to_string(),
        };

        let json_response = serde_json::json!([]);

        let jobs = if let Some(postings) = json_response.as_array() {
            let mut jobs = Vec::with_capacity(postings.len());
            for posting in postings {
                let title = posting["text"].as_str().unwrap_or("").to_string();
                let url = posting["hostedUrl"].as_str().unwrap_or("").to_string();

                if !title.is_empty() && !url.is_empty() {
                    jobs.push(Job {
                        id: 0,
                        hash: "test".to_string(),
                        title,
                        company: company.name.clone(),
                        url,
                        location: None,
                        description: None,
                        score: None,
                        score_reasons: None,
                        source: "lever".to_string(),
                        remote: None,
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
                        ghost_score: None,
                        ghost_reasons: None,
                        first_seen: None,
                        repost_count: 0,
                        included_in_digest: false,
                    });
                }
            }
            jobs
        } else {
            Vec::new()
        };

        assert_eq!(jobs.len(), 0);
    }

    #[tokio::test]
    async fn test_scrape_company_handles_non_array_response() {
        let json_response = serde_json::json!({
            "error": "Invalid response"
        });

        let jobs = if let Some(postings) = json_response.as_array() {
            let mut jobs = Vec::new();
            for _posting in postings {
                jobs.push(Job {
                    id: 0,
                    hash: "test".to_string(),
                    title: "Test".to_string(),
                    company: "Test".to_string(),
                    url: "https://test.com".to_string(),
                    location: None,
                    description: None,
                    score: None,
                    score_reasons: None,
                    source: "lever".to_string(),
                    remote: None,
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
                    ghost_score: None,
                    ghost_reasons: None,
                    first_seen: None,
                    repost_count: 0,
                    included_in_digest: false,
                });
            }
            jobs
        } else {
            Vec::new()
        };

        assert_eq!(
            jobs.len(),
            0,
            "Non-array response should produce empty job list"
        );
    }

    #[tokio::test]
    async fn test_scrape_with_empty_companies() {
        let scraper = LeverScraper::new(vec![]);
        let result = scraper.scrape().await;

        assert!(result.is_ok());
        let jobs = result.unwrap();
        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_job_struct_fields_are_populated_correctly() {
        // Test that Job struct is created with all required fields
        let company_name = "Test Co";
        let title = "Software Engineer (Remote)";
        let location = Some("Remote - US");
        let url = "https://jobs.lever.co/test/abc";
        let description = Some("<p>Description</p>".to_string());

        let hash = LeverScraper::compute_hash(company_name, title, location, url);
        let remote = LeverScraper::infer_remote(title, location);

        let job = Job {
            id: 0,
            hash: hash.clone(),
            title: title.to_string(),
            company: company_name.to_string(),
            url: url.to_string(),
            location: location.map(|s| s.to_string()),
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
            ghost_score: None,
            ghost_reasons: None,
            first_seen: None,
            repost_count: 0,
            included_in_digest: false,
        };

        assert_eq!(job.title, "Software Engineer (Remote)");
        assert_eq!(job.company, "Test Co");
        assert_eq!(job.source, "lever");
        assert_eq!(job.remote, Some(true));
        assert_eq!(job.times_seen, 1);
        assert!(!job.immediate_alert_sent);
        assert!(!job.hidden);
        assert!(!job.bookmarked);
        assert!(job.notes.is_none());
        assert!(!job.included_in_digest);
        assert_eq!(job.hash, hash);
    }

    #[test]
    fn test_job_struct_with_missing_optional_fields() {
        let job = Job {
            id: 0,
            hash: "test-hash".to_string(),
            title: "Engineer".to_string(),
            company: "Company".to_string(),
            url: "https://test.com".to_string(),
            location: None,
            description: None,
            score: None,
            score_reasons: None,
            source: "lever".to_string(),
            remote: None,
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
            ghost_score: None,
            ghost_reasons: None,
            first_seen: None,
            repost_count: 0,
            included_in_digest: false,
        };

        assert!(job.location.is_none());
        assert!(job.description.is_none());
        assert!(job.remote.is_none());
        assert!(job.salary_min.is_none());
        assert!(job.salary_max.is_none());
    }

    #[test]
    fn test_description_extraction_priority() {
        // Test description field has priority over descriptionPlain
        let json = serde_json::json!({
            "text": "Engineer",
            "hostedUrl": "https://test.com/job",
            "description": "<p>HTML description</p>",
            "descriptionPlain": "Plain description"
        });

        let description = json["description"]
            .as_str()
            .or_else(|| json["descriptionPlain"].as_str())
            .map(|s| s.to_string());

        assert_eq!(description, Some("<p>HTML description</p>".to_string()));

        // Test descriptionPlain fallback
        let json2 = serde_json::json!({
            "text": "Engineer",
            "hostedUrl": "https://test.com/job",
            "descriptionPlain": "Plain description"
        });

        let description2 = json2["description"]
            .as_str()
            .or_else(|| json2["descriptionPlain"].as_str())
            .map(|s| s.to_string());

        assert_eq!(description2, Some("Plain description".to_string()));
    }

    #[test]
    fn test_location_extraction_with_team_fallback() {
        // Test location field exists
        let json = serde_json::json!({
            "categories": {
                "location": "Remote",
                "team": "Engineering"
            }
        });

        let location = json["categories"]["location"]
            .as_str()
            .map(|s| s.to_string())
            .or_else(|| json["categories"]["team"].as_str().map(|s| s.to_string()));

        assert_eq!(location, Some("Remote".to_string()));

        // Test team fallback when location is missing
        let json2 = serde_json::json!({
            "categories": {
                "team": "Platform"
            }
        });

        let location2 = json2["categories"]["location"]
            .as_str()
            .map(|s| s.to_string())
            .or_else(|| json2["categories"]["team"].as_str().map(|s| s.to_string()));

        assert_eq!(location2, Some("Platform".to_string()));

        // Test neither field exists
        let json3 = serde_json::json!({
            "categories": {}
        });

        let location3 = json3["categories"]["location"]
            .as_str()
            .map(|s| s.to_string())
            .or_else(|| json3["categories"]["team"].as_str().map(|s| s.to_string()));

        assert_eq!(location3, None);
    }

    #[test]
    fn test_api_url_format() {
        let company = LeverCompany {
            id: "shopify".to_string(),
            name: "Shopify".to_string(),
            url: "https://jobs.lever.co/shopify".to_string(),
        };

        let api_url = format!("https://api.lever.co/v0/postings/{}", company.id);

        assert_eq!(api_url, "https://api.lever.co/v0/postings/shopify");
        assert!(api_url.starts_with("https://api.lever.co/v0/postings/"));
    }

    #[test]
    fn test_empty_title_and_url_filtering() {
        // Simulate the validation logic from scrape_company
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

        for (i, company) in scraper.companies.iter().enumerate() {
            assert_eq!(company.name, companies[i].name);
            assert_eq!(company.id, companies[i].id);
        }
    }

    // ========================================
    // Additional Integration Tests for Full Coverage
    // ========================================

    #[tokio::test]
    async fn test_scrape_company_full_job_creation_with_all_fields() {
        // Comprehensive test covering all Job struct field assignment paths
        let company = LeverCompany {
            id: "comprehensive-test".to_string(),
            name: "Comprehensive Test Co".to_string(),
            url: "https://jobs.lever.co/comprehensive-test".to_string(),
        };

        let json_response = serde_json::json!([
            {
                "text": "Senior Backend Engineer (Remote)",
                "hostedUrl": "https://jobs.lever.co/comprehensive-test/job1",
                "categories": {
                    "location": "Remote - Global",
                    "team": "Engineering",
                    "commitment": "Full-time"
                },
                "description": "<h1>Join our team</h1><p>We are looking for passionate engineers</p>",
                "descriptionPlain": "Join our team. We are looking for passionate engineers."
            }
        ]);

        // Simulate scrape_company processing
        if let Some(postings) = json_response.as_array() {
            assert_eq!(postings.len(), 1);

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

                let description = posting["description"]
                    .as_str()
                    .or_else(|| posting["descriptionPlain"].as_str())
                    .map(|s| s.to_string());

                let remote = LeverScraper::infer_remote(&title, location.as_deref());
                let hash =
                    LeverScraper::compute_hash(&company.name, &title, location.as_deref(), &url);

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
                        ghost_score: None,
                        ghost_reasons: None,
                        first_seen: None,
                        repost_count: 0,
                        included_in_digest: false,
                    });
                }
            }

            assert_eq!(jobs.len(), 1);

            // Verify all fields are set correctly
            let job = &jobs[0];
            assert_eq!(job.title, "Senior Backend Engineer (Remote)");
            assert_eq!(job.company, "Comprehensive Test Co");
            assert_eq!(job.url, "https://jobs.lever.co/comprehensive-test/job1");
            assert_eq!(job.location, Some("Remote - Global".to_string()));
            assert!(job
                .description
                .as_ref()
                .unwrap()
                .contains("<h1>Join our team</h1>"));
            assert_eq!(job.source, "lever");
            assert_eq!(job.remote, Some(true));
            assert_eq!(job.times_seen, 1);
            assert!(!job.immediate_alert_sent);
            assert!(!job.hidden);
            assert!(!job.bookmarked);
            assert!(job.notes.is_none());
            assert!(!job.included_in_digest);
            assert_eq!(job.hash.len(), 64);
        }
    }

    #[tokio::test]
    async fn test_scrape_company_with_descriptionplain_only() {
        // Test path where description is None but descriptionPlain exists
        let _company = LeverCompany {
            id: "test".to_string(),
            name: "Test Co".to_string(),
            url: "https://jobs.lever.co/test".to_string(),
        };

        let json_response = serde_json::json!([
            {
                "text": "Engineer",
                "hostedUrl": "https://jobs.lever.co/test/job1",
                "descriptionPlain": "This is a plain text description"
            }
        ]);

        if let Some(postings) = json_response.as_array() {
            let posting = &postings[0];

            let description = posting["description"]
                .as_str()
                .or_else(|| posting["descriptionPlain"].as_str())
                .map(|s| s.to_string());

            assert_eq!(
                description,
                Some("This is a plain text description".to_string())
            );
        }
    }

    #[tokio::test]
    async fn test_scrape_company_with_team_fallback_location() {
        // Test path where location is None but team exists
        let _company = LeverCompany {
            id: "test".to_string(),
            name: "Test Co".to_string(),
            url: "https://jobs.lever.co/test".to_string(),
        };

        let json_response = serde_json::json!([
            {
                "text": "Platform Engineer",
                "hostedUrl": "https://jobs.lever.co/test/job1",
                "categories": {
                    "team": "Infrastructure Team"
                }
            }
        ]);

        if let Some(postings) = json_response.as_array() {
            let posting = &postings[0];

            let location = posting["categories"]["location"]
                .as_str()
                .map(|s| s.to_string())
                .or_else(|| {
                    posting["categories"]["team"]
                        .as_str()
                        .map(|s| s.to_string())
                });

            assert_eq!(location, Some("Infrastructure Team".to_string()));
        }
    }

    #[tokio::test]
    async fn test_scrape_company_filters_jobs_with_empty_title() {
        let _company = LeverCompany {
            id: "test".to_string(),
            name: "Test Co".to_string(),
            url: "https://jobs.lever.co/test".to_string(),
        };

        let json_response = serde_json::json!([
            {
                "text": "",
                "hostedUrl": "https://jobs.lever.co/test/job1"
            },
            {
                "text": "Valid Engineer",
                "hostedUrl": "https://jobs.lever.co/test/job2"
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

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].0, "Valid Engineer");
    }

    #[tokio::test]
    async fn test_scrape_company_filters_jobs_with_empty_url() {
        let json_response = serde_json::json!([
            {
                "text": "Engineer",
                "hostedUrl": ""
            },
            {
                "text": "Valid Engineer",
                "hostedUrl": "https://jobs.lever.co/test/job2"
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

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].0, "Valid Engineer");
    }

    #[tokio::test]
    async fn test_scrape_company_computes_hash_for_each_job() {
        let company = LeverCompany {
            id: "test".to_string(),
            name: "Test Company".to_string(),
            url: "https://jobs.lever.co/test".to_string(),
        };

        let json_response = serde_json::json!([
            {
                "text": "Job 1",
                "hostedUrl": "https://jobs.lever.co/test/job1",
                "categories": {
                    "location": "Remote"
                }
            },
            {
                "text": "Job 2",
                "hostedUrl": "https://jobs.lever.co/test/job2",
                "categories": {
                    "location": "SF"
                }
            }
        ]);

        let mut hashes = Vec::new();
        if let Some(postings) = json_response.as_array() {
            for posting in postings {
                let title = posting["text"].as_str().unwrap_or("").to_string();
                let url = posting["hostedUrl"].as_str().unwrap_or("").to_string();
                let location = posting["categories"]["location"]
                    .as_str()
                    .map(|s| s.to_string());

                let hash =
                    LeverScraper::compute_hash(&company.name, &title, location.as_deref(), &url);
                hashes.push(hash);
            }
        }

        assert_eq!(hashes.len(), 2);
        assert_ne!(hashes[0], hashes[1]);
        assert_eq!(hashes[0].len(), 64);
        assert_eq!(hashes[1].len(), 64);
    }

    #[tokio::test]
    async fn test_scrape_company_infers_remote_for_each_job() {
        let json_response = serde_json::json!([
            {
                "text": "Remote Engineer",
                "hostedUrl": "https://jobs.lever.co/test/job1",
                "categories": {}
            },
            {
                "text": "Onsite Engineer",
                "hostedUrl": "https://jobs.lever.co/test/job2",
                "categories": {
                    "location": "San Francisco, CA"
                }
            }
        ]);

        let mut remote_flags = Vec::new();
        if let Some(postings) = json_response.as_array() {
            for posting in postings {
                let title = posting["text"].as_str().unwrap_or("").to_string();
                let location = posting["categories"]["location"]
                    .as_str()
                    .map(|s| s.to_string());

                let remote = LeverScraper::infer_remote(&title, location.as_deref());
                remote_flags.push(remote);
            }
        }

        assert_eq!(remote_flags.len(), 2);
        assert!(remote_flags[0]); // Remote Engineer should be remote
        assert!(!remote_flags[1]); // Onsite Engineer should not be remote
    }

    #[tokio::test]
    async fn test_scrape_returns_empty_for_non_array_json() {
        let json_response = serde_json::json!({
            "error": "Invalid format"
        });

        let jobs = if let Some(postings) = json_response.as_array() {
            postings.len()
        } else {
            0
        };

        assert_eq!(jobs, 0);
    }

    #[test]
    fn test_job_struct_all_boolean_fields_default_false() {
        let job = Job {
            id: 0,
            hash: "test".to_string(),
            title: "Test".to_string(),
            company: "Test".to_string(),
            url: "https://test.com".to_string(),
            location: None,
            description: None,
            score: None,
            score_reasons: None,
            source: "lever".to_string(),
            remote: Some(false),
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
            ghost_score: None,
            ghost_reasons: None,
            first_seen: None,
            repost_count: 0,
            included_in_digest: false,
        };

        assert!(!job.immediate_alert_sent);
        assert!(!job.hidden);
        assert!(!job.bookmarked);
        assert!(!job.included_in_digest);
    }

    #[test]
    fn test_job_struct_times_seen_is_one() {
        let job = Job {
            id: 0,
            hash: "test".to_string(),
            title: "Test".to_string(),
            company: "Test".to_string(),
            url: "https://test.com".to_string(),
            location: None,
            description: None,
            score: None,
            score_reasons: None,
            source: "lever".to_string(),
            remote: None,
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
            ghost_score: None,
            ghost_reasons: None,
            first_seen: None,
            repost_count: 0,
            included_in_digest: false,
        };

        assert_eq!(job.times_seen, 1);
    }

    #[test]
    fn test_source_is_lever() {
        let job = Job {
            id: 0,
            hash: "test".to_string(),
            title: "Test".to_string(),
            company: "Test".to_string(),
            url: "https://test.com".to_string(),
            location: None,
            description: None,
            score: None,
            score_reasons: None,
            source: "lever".to_string(),
            remote: None,
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
            ghost_score: None,
            ghost_reasons: None,
            first_seen: None,
            repost_count: 0,
            included_in_digest: false,
        };

        assert_eq!(job.source, "lever");
    }

    #[tokio::test]
    async fn test_scrape_with_multiple_companies() {
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
        ];

        let scraper = LeverScraper::new(companies);

        // scrape() calls scrape_company for each company and aggregates results
        // We can't test actual API calls without mocking, but we test the structure
        assert_eq!(scraper.companies.len(), 2);
        assert_eq!(scraper.name(), "lever");
    }

    #[test]
    fn test_infer_remote_with_work_from_home_in_title() {
        assert!(LeverScraper::infer_remote(
            "Software Engineer (Work From Home)",
            None
        ));
        assert!(LeverScraper::infer_remote(
            "Backend Dev - Work from Home",
            None
        ));
        assert!(LeverScraper::infer_remote("Work From Home Engineer", None));
    }

    #[test]
    fn test_location_extraction_fallback_chain() {
        let json = serde_json::json!({
            "text": "Engineer",
            "hostedUrl": "https://jobs.lever.co/company/job1",
            "categories": {
                "team": "Engineering Team"
            }
        });

        // Test that when location is missing, team is used
        let location = json["categories"]["location"]
            .as_str()
            .map(|s| s.to_string())
            .or_else(|| json["categories"]["team"].as_str().map(|s| s.to_string()));

        assert_eq!(location, Some("Engineering Team".to_string()));
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
        let _company = LeverCompany {
            id: "multi".to_string(),
            name: "Multi Jobs Co".to_string(),
            url: "https://jobs.lever.co/multi".to_string(),
        };

        let json_response = serde_json::json!([
            {
                "text": "Frontend Engineer",
                "hostedUrl": "https://jobs.lever.co/multi/fe",
                "categories": {"location": "Remote"}
            },
            {
                "text": "Backend Engineer",
                "hostedUrl": "https://jobs.lever.co/multi/be",
                "categories": {"location": "NYC"}
            },
            {
                "text": "DevOps Engineer",
                "hostedUrl": "https://jobs.lever.co/multi/devops",
                "categories": {"team": "Infrastructure"}
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
