//! JobsWithGPT MCP Client
//!
//! Integrates with JobsWithGPT via Model Context Protocol for 500K+ job listings.
//! MCP is a JSON-RPC based protocol for querying structured data.

use super::http_client::get_client;
use super::{JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use sha2::{Digest, Sha256};

/// JobsWithGPT MCP scraper
pub struct JobsWithGptScraper {
    /// MCP server endpoint
    pub endpoint: String,
    /// Search query parameters
    pub query: JobQuery,
}

#[derive(Debug, Clone)]
pub struct JobQuery {
    /// Job titles to search for
    pub titles: Vec<String>,
    /// Location filter (optional)
    pub location: Option<String>,
    /// Remote filter
    pub remote_only: bool,
    /// Maximum results to return
    pub limit: usize,
}

impl JobsWithGptScraper {
    pub fn new(endpoint: String, query: JobQuery) -> Self {
        Self { endpoint, query }
    }

    /// Query JobsWithGPT MCP server
    async fn query_mcp(&self) -> ScraperResult {
        tracing::info!("Querying JobsWithGPT MCP server");

        // Build MCP JSON-RPC request
        // MCP format: { "jsonrpc": "2.0", "method": "search", "params": {...}, "id": 1 }
        let request = serde_json::json!({
            "jsonrpc": "2.0",
            "method": "jobs/search",
            "params": {
                "titles": self.query.titles,
                "location": self.query.location,
                "remote_only": self.query.remote_only,
                "limit": self.query.limit,
            },
            "id": 1
        });

        tracing::debug!("MCP request: {}", request);

        let client = get_client();

        let response = client.post(&self.endpoint).json(&request).send().await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("MCP server failed: {}", response.status()));
        }

        let json: serde_json::Value = response.json().await?;

        // Parse MCP response: { "jsonrpc": "2.0", "result": [...], "id": 1 }
        if let Some(error) = json.get("error") {
            return Err(anyhow::anyhow!("MCP error: {}", error));
        }

        let mut jobs = Vec::new();

        if let Some(result) = json.get("result").and_then(|r| r.as_array()) {
            for job_data in result {
                if let Some(job) = self.parse_mcp_job(job_data)? {
                    jobs.push(job);
                }
            }
        }

        tracing::info!("Found {} jobs from JobsWithGPT", jobs.len());
        Ok(jobs)
    }

    /// Parse a job from MCP response
    fn parse_mcp_job(&self, data: &serde_json::Value) -> Result<Option<Job>> {
        let title = data["title"].as_str().unwrap_or("").to_string();
        let company = data["company"].as_str().unwrap_or("Unknown").to_string();
        let url = data["url"].as_str().unwrap_or("").to_string();
        let location = data["location"].as_str().map(|s| s.to_string());
        let description = data["description"].as_str().map(|s| s.to_string());
        let remote = data["remote"].as_bool();

        // Parse salary if available
        let salary_min = data["salary_min"].as_i64();
        let salary_max = data["salary_max"].as_i64();
        let currency = data["currency"].as_str().map(|s| s.to_string());

        if title.is_empty() || url.is_empty() {
            return Ok(None);
        }

        let hash = Self::compute_hash(&company, &title, location.as_deref(), &url);

        Ok(Some(Job {
            id: 0,
            hash,
            title,
            company,
            url,
            location,
            description,
            score: None,
            score_reasons: None,
            source: "jobswithgpt".to_string(),
            remote,
            salary_min,
            salary_max,
            currency,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_seen: Utc::now(),
            times_seen: 1,
            immediate_alert_sent: false,
            included_in_digest: false,
        }))
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
impl JobScraper for JobsWithGptScraper {
    async fn scrape(&self) -> ScraperResult {
        self.query_mcp().await
    }

    fn name(&self) -> &'static str {
        "jobswithgpt"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Hash computation tests
    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = JobsWithGptScraper::compute_hash(
            "Apple",
            "iOS Engineer",
            Some("Cupertino"),
            "https://example.com/1",
        );
        let hash2 = JobsWithGptScraper::compute_hash(
            "Apple",
            "iOS Engineer",
            Some("Cupertino"),
            "https://example.com/1",
        );

        assert_eq!(hash1, hash2, "Same inputs should produce same hash");
        assert_eq!(hash1.len(), 64, "SHA-256 hash should be 64 hex chars");
    }

    #[test]
    fn test_compute_hash_different_company() {
        let hash1 = JobsWithGptScraper::compute_hash("Apple", "Engineer", None, "https://example.com/1");
        let hash2 = JobsWithGptScraper::compute_hash("Google", "Engineer", None, "https://example.com/1");

        assert_ne!(hash1, hash2, "Different company should produce different hash");
    }

    #[test]
    fn test_compute_hash_different_title() {
        let hash1 = JobsWithGptScraper::compute_hash("Company", "iOS Engineer", None, "https://example.com/1");
        let hash2 = JobsWithGptScraper::compute_hash("Company", "Android Engineer", None, "https://example.com/1");

        assert_ne!(hash1, hash2, "Different title should produce different hash");
    }

    #[test]
    fn test_compute_hash_different_location() {
        let hash1 = JobsWithGptScraper::compute_hash("Company", "Engineer", Some("SF"), "https://example.com/1");
        let hash2 = JobsWithGptScraper::compute_hash("Company", "Engineer", Some("NY"), "https://example.com/1");

        assert_ne!(hash1, hash2, "Different location should produce different hash");
    }

    #[test]
    fn test_compute_hash_location_none_vs_some() {
        let hash1 = JobsWithGptScraper::compute_hash("Company", "Engineer", None, "https://example.com/1");
        let hash2 = JobsWithGptScraper::compute_hash("Company", "Engineer", Some("Remote"), "https://example.com/1");

        assert_ne!(hash1, hash2, "None location should differ from Some");
    }

    #[test]
    fn test_compute_hash_different_url() {
        let hash1 = JobsWithGptScraper::compute_hash("Company", "Engineer", None, "https://example.com/1");
        let hash2 = JobsWithGptScraper::compute_hash("Company", "Engineer", None, "https://example.com/2");

        assert_ne!(hash1, hash2, "Different URL should produce different hash");
    }

    #[test]
    fn test_compute_hash_empty_strings() {
        let hash = JobsWithGptScraper::compute_hash("", "", None, "");
        assert_eq!(hash.len(), 64, "Hash of empty strings should still be valid");
    }

    #[test]
    fn test_compute_hash_special_characters() {
        let hash = JobsWithGptScraper::compute_hash(
            "Company™",
            "Senior Engineer (Remote) 🎯",
            Some("San Francisco, CA / Remote"),
            "https://jobs.example.com/job?id=123&utm_source=jobswithgpt",
        );

        assert_eq!(hash.len(), 64, "Hash should handle special characters and query params");
    }

    // MCP job parsing tests
    #[test]
    fn test_parse_mcp_job_complete() {
        let scraper = JobsWithGptScraper::new(
            "http://localhost:3000/mcp".to_string(),
            JobQuery {
                titles: vec!["Engineer".to_string()],
                location: None,
                remote_only: false,
                limit: 10,
            },
        );

        let job_data = serde_json::json!({
            "title": "Senior Rust Engineer",
            "company": "TechCorp",
            "url": "https://example.com/job/123",
            "location": "Remote",
            "description": "Build amazing things",
            "remote": true,
            "salary_min": 150000,
            "salary_max": 200000,
            "currency": "USD"
        });

        let job = scraper.parse_mcp_job(&job_data).unwrap().unwrap();

        assert_eq!(job.title, "Senior Rust Engineer");
        assert_eq!(job.company, "TechCorp");
        assert_eq!(job.url, "https://example.com/job/123");
        assert_eq!(job.location, Some("Remote".to_string()));
        assert_eq!(job.description, Some("Build amazing things".to_string()));
        assert_eq!(job.remote, Some(true));
        assert_eq!(job.salary_min, Some(150000));
        assert_eq!(job.salary_max, Some(200000));
        assert_eq!(job.currency, Some("USD".to_string()));
        assert_eq!(job.source, "jobswithgpt");
    }

    #[test]
    fn test_parse_mcp_job_minimal() {
        let scraper = JobsWithGptScraper::new(
            "http://localhost:3000/mcp".to_string(),
            JobQuery {
                titles: vec![],
                location: None,
                remote_only: false,
                limit: 10,
            },
        );

        let job_data = serde_json::json!({
            "title": "Engineer",
            "company": "Company",
            "url": "https://example.com/job"
        });

        let job = scraper.parse_mcp_job(&job_data).unwrap().unwrap();

        assert_eq!(job.title, "Engineer");
        assert_eq!(job.company, "Company");
        assert_eq!(job.url, "https://example.com/job");
        assert_eq!(job.location, None);
        assert_eq!(job.description, None);
        assert_eq!(job.remote, None);
        assert_eq!(job.salary_min, None);
        assert_eq!(job.salary_max, None);
        assert_eq!(job.currency, None);
    }

    #[test]
    fn test_parse_mcp_job_empty_title_returns_none() {
        let scraper = JobsWithGptScraper::new(
            "http://localhost:3000/mcp".to_string(),
            JobQuery {
                titles: vec![],
                location: None,
                remote_only: false,
                limit: 10,
            },
        );

        let job_data = serde_json::json!({
            "title": "",
            "company": "Company",
            "url": "https://example.com/job"
        });

        let result = scraper.parse_mcp_job(&job_data).unwrap();
        assert!(result.is_none(), "Empty title should return None");
    }

    #[test]
    fn test_parse_mcp_job_empty_url_returns_none() {
        let scraper = JobsWithGptScraper::new(
            "http://localhost:3000/mcp".to_string(),
            JobQuery {
                titles: vec![],
                location: None,
                remote_only: false,
                limit: 10,
            },
        );

        let job_data = serde_json::json!({
            "title": "Engineer",
            "company": "Company",
            "url": ""
        });

        let result = scraper.parse_mcp_job(&job_data).unwrap();
        assert!(result.is_none(), "Empty URL should return None");
    }

    #[test]
    fn test_parse_mcp_job_missing_company_defaults_to_unknown() {
        let scraper = JobsWithGptScraper::new(
            "http://localhost:3000/mcp".to_string(),
            JobQuery {
                titles: vec![],
                location: None,
                remote_only: false,
                limit: 10,
            },
        );

        let job_data = serde_json::json!({
            "title": "Engineer",
            "url": "https://example.com/job"
        });

        let job = scraper.parse_mcp_job(&job_data).unwrap().unwrap();
        assert_eq!(job.company, "Unknown");
    }

    // JobQuery tests
    #[test]
    fn test_job_query_creation() {
        let query = JobQuery {
            titles: vec!["Rust Engineer".to_string(), "Backend Developer".to_string()],
            location: Some("San Francisco".to_string()),
            remote_only: true,
            limit: 50,
        };

        assert_eq!(query.titles.len(), 2);
        assert_eq!(query.titles[0], "Rust Engineer");
        assert_eq!(query.location, Some("San Francisco".to_string()));
        assert!(query.remote_only);
        assert_eq!(query.limit, 50);
    }

    #[test]
    fn test_job_query_remote_only() {
        let query = JobQuery {
            titles: vec!["Engineer".to_string()],
            location: None,
            remote_only: true,
            limit: 100,
        };

        assert!(query.remote_only);
        assert_eq!(query.location, None);
    }

    // Scraper initialization tests
    #[test]
    fn test_scraper_name() {
        let scraper = JobsWithGptScraper::new(
            "http://localhost:3000/mcp".to_string(),
            JobQuery {
                titles: vec![],
                location: None,
                remote_only: false,
                limit: 10,
            },
        );

        assert_eq!(scraper.name(), "jobswithgpt");
    }

    #[test]
    fn test_new_scraper_with_endpoint() {
        let endpoint = "https://api.jobswithgpt.com/mcp".to_string();
        let query = JobQuery {
            titles: vec!["Engineer".to_string()],
            location: Some("Remote".to_string()),
            remote_only: true,
            limit: 25,
        };

        let scraper = JobsWithGptScraper::new(endpoint.clone(), query.clone());

        assert_eq!(scraper.endpoint, endpoint);
        assert_eq!(scraper.query.titles, query.titles);
        assert_eq!(scraper.query.location, query.location);
        assert_eq!(scraper.query.remote_only, query.remote_only);
        assert_eq!(scraper.query.limit, query.limit);
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
            let hash1 = JobsWithGptScraper::compute_hash(&company, &title, location.as_deref(), &url);
            let hash2 = JobsWithGptScraper::compute_hash(&company, &title, location.as_deref(), &url);

            prop_assert_eq!(hash1.clone(), hash2);
            prop_assert_eq!(hash1.len(), 64);
        }

        /// Property: Hash format is always valid
        #[test]
        fn prop_hash_format_valid(
            company in "\\PC*",
            title in "\\PC*",
            location in proptest::option::of("\\PC*"),
            url in "\\PC*",
        ) {
            let hash = JobsWithGptScraper::compute_hash(&company, &title, location.as_deref(), &url);

            prop_assert_eq!(hash.len(), 64);
            prop_assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
        }

        /// Property: Different inputs produce different hashes
        #[test]
        fn prop_hash_collision_resistance(
            company1 in "\\PC{1,100}",
            company2 in "\\PC{1,100}",
            title in "\\PC{1,200}",
            url in "https?://[a-z0-9./]+",
        ) {
            prop_assume!(company1 != company2);

            let hash1 = JobsWithGptScraper::compute_hash(&company1, &title, None, &url);
            let hash2 = JobsWithGptScraper::compute_hash(&company2, &title, None, &url);

            prop_assert_ne!(hash1, hash2);
        }

        /// Property: Query limit is always respected
        #[test]
        fn prop_query_limit_bounds(
            limit in 1usize..1000usize,
        ) {
            let query = JobQuery {
                titles: vec!["Engineer".to_string()],
                location: None,
                remote_only: false,
                limit,
            };

            prop_assert_eq!(query.limit, limit);
            prop_assert!(query.limit > 0);
            prop_assert!(query.limit < 1000);
        }

        /// Property: JobQuery preserves title list
        #[test]
        fn prop_query_preserves_titles(
            titles in proptest::collection::vec("[a-zA-Z ]{3,30}", 1..10),
            remote_only in proptest::bool::ANY,
            limit in 1usize..500usize,
        ) {
            let query = JobQuery {
                titles: titles.clone(),
                location: None,
                remote_only,
                limit,
            };

            prop_assert_eq!(query.titles, titles);
            prop_assert_eq!(query.remote_only, remote_only);
        }

        /// Property: Hash handles all Unicode safely
        #[test]
        fn prop_hash_unicode_safe(
            company in "[\\PC🦀™®]{1,50}",
            title in "[\\PC🚀💼]{1,100}",
            url in "\\PC{10,200}",
        ) {
            let hash = JobsWithGptScraper::compute_hash(&company, &title, None, &url);

            prop_assert_eq!(hash.len(), 64);
            prop_assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
        }
    }
}
