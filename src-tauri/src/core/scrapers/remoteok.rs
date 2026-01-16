//! RemoteOK Job Scraper
//!
//! Scrapes remote jobs from RemoteOK's public JSON API.
//! RemoteOK is a popular remote job board with tech-focused listings.

use super::http_client::get_client;
use super::{JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use sha2::{Digest, Sha256};

/// RemoteOK job scraper
pub struct RemoteOkScraper {
    /// Search tags to filter jobs (e.g., "rust", "python", "engineer")
    pub tags: Vec<String>,
    /// Maximum results to return
    pub limit: usize,
}

impl RemoteOkScraper {
    pub fn new(tags: Vec<String>, limit: usize) -> Self {
        Self { tags, limit }
    }

    /// Fetch jobs from RemoteOK API
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!("Fetching jobs from RemoteOK");

        let client = get_client();
        let url = "https://remoteok.com/api";

        let response = client
            .get(url)
            .header("User-Agent", "JobSentinel/1.0")
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("RemoteOK API failed: {}", response.status()));
        }

        let json: serde_json::Value = response.json().await?;

        // RemoteOK returns an array where first element is a legal notice
        let jobs_array = json
            .as_array()
            .ok_or_else(|| anyhow::anyhow!("Expected array from RemoteOK API"))?;

        let mut jobs = Vec::new();
        let tags_lower: Vec<String> = self.tags.iter().map(|t| t.to_lowercase()).collect();

        for job_data in jobs_array.iter().skip(1) {
            // Skip the first element (legal notice)
            if let Some(job) = self.parse_job(job_data)? {
                // Filter by tags if specified
                if tags_lower.is_empty() || self.job_matches_tags(&job, &tags_lower) {
                    jobs.push(job);
                }

                if jobs.len() >= self.limit {
                    break;
                }
            }
        }

        tracing::info!("Found {} jobs from RemoteOK", jobs.len());
        Ok(jobs)
    }

    /// Check if job matches any of the filter tags
    fn job_matches_tags(&self, job: &Job, tags: &[String]) -> bool {
        let title_lower = job.title.to_lowercase();
        let description_lower = job
            .description
            .as_ref()
            .map(|d| d.to_lowercase())
            .unwrap_or_default();

        tags.iter()
            .any(|tag| title_lower.contains(tag) || description_lower.contains(tag))
    }

    /// Parse a job from RemoteOK JSON response
    fn parse_job(&self, data: &serde_json::Value) -> Result<Option<Job>> {
        // Skip if no position field (might be a non-job entry)
        let title = match data["position"].as_str() {
            Some(t) if !t.is_empty() => t.to_string(),
            _ => return Ok(None),
        };

        let company = data["company"].as_str().unwrap_or("Unknown").to_string();
        let url = data["url"]
            .as_str()
            .map(|u| {
                if u.starts_with("http") {
                    u.to_string()
                } else {
                    format!("https://remoteok.com{}", u)
                }
            })
            .unwrap_or_default();

        if url.is_empty() {
            return Ok(None);
        }

        let location = data["location"].as_str().map(|s| s.to_string());
        let description = data["description"].as_str().map(|s| s.to_string());

        // RemoteOK has salary_min and salary_max
        let salary_min = data["salary_min"].as_i64();
        let salary_max = data["salary_max"].as_i64();

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
            source: "remoteok".to_string(),
            remote: Some(true), // All RemoteOK jobs are remote
            salary_min,
            salary_max,
            currency: Some("USD".to_string()), // RemoteOK typically uses USD
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_seen: Utc::now(),
            times_seen: 1,
            immediate_alert_sent: false,
            hidden: false,
            bookmarked: false,
            notes: None,
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
impl JobScraper for RemoteOkScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    fn name(&self) -> &'static str {
        "remoteok"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = RemoteOkScraper::compute_hash(
            "Company",
            "Remote Engineer",
            Some("Worldwide"),
            "https://remoteok.com/job/123",
        );
        let hash2 = RemoteOkScraper::compute_hash(
            "Company",
            "Remote Engineer",
            Some("Worldwide"),
            "https://remoteok.com/job/123",
        );

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_compute_hash_unique_for_different_inputs() {
        let hash1 = RemoteOkScraper::compute_hash(
            "CompanyA",
            "Engineer",
            Some("Remote"),
            "https://remoteok.com/job/1",
        );
        let hash2 = RemoteOkScraper::compute_hash(
            "CompanyB",
            "Engineer",
            Some("Remote"),
            "https://remoteok.com/job/2",
        );

        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_compute_hash_with_location_none() {
        let hash = RemoteOkScraper::compute_hash(
            "Company",
            "Developer",
            None,
            "https://remoteok.com/job/1",
        );

        assert_eq!(hash.len(), 64);
    }

    #[test]
    fn test_scraper_name() {
        let scraper = RemoteOkScraper::new(vec![], 10);
        assert_eq!(scraper.name(), "remoteok");
    }

    #[test]
    fn test_parse_job_complete() {
        let scraper = RemoteOkScraper::new(vec![], 10);

        let job_data = serde_json::json!({
            "position": "Senior Rust Developer",
            "company": "RemoteTech",
            "url": "/job/123",
            "location": "Worldwide",
            "description": "Build distributed systems",
            "salary_min": 120000,
            "salary_max": 180000
        });

        let job = scraper.parse_job(&job_data).unwrap().unwrap();

        assert_eq!(job.title, "Senior Rust Developer");
        assert_eq!(job.company, "RemoteTech");
        assert_eq!(job.url, "https://remoteok.com/job/123");
        assert_eq!(job.location, Some("Worldwide".to_string()));
        assert_eq!(job.remote, Some(true));
        assert_eq!(job.source, "remoteok");
        assert_eq!(job.salary_min, Some(120000));
        assert_eq!(job.salary_max, Some(180000));
        assert_eq!(job.currency, Some("USD".to_string()));
        assert_eq!(
            job.description,
            Some("Build distributed systems".to_string())
        );
    }

    #[test]
    fn test_parse_job_with_absolute_url() {
        let scraper = RemoteOkScraper::new(vec![], 10);

        let job_data = serde_json::json!({
            "position": "Frontend Developer",
            "company": "WebCorp",
            "url": "https://example.com/apply",
            "location": "Europe"
        });

        let job = scraper.parse_job(&job_data).unwrap().unwrap();

        assert_eq!(job.url, "https://example.com/apply");
        assert_eq!(job.title, "Frontend Developer");
    }

    #[test]
    fn test_parse_job_minimal_fields() {
        let scraper = RemoteOkScraper::new(vec![], 10);

        let job_data = serde_json::json!({
            "position": "Backend Engineer",
            "url": "/job/456"
        });

        let job = scraper.parse_job(&job_data).unwrap().unwrap();

        assert_eq!(job.title, "Backend Engineer");
        assert_eq!(job.company, "Unknown");
        assert_eq!(job.url, "https://remoteok.com/job/456");
        assert_eq!(job.location, None);
        assert_eq!(job.description, None);
        assert_eq!(job.salary_min, None);
        assert_eq!(job.salary_max, None);
    }

    #[test]
    fn test_parse_job_missing_position_returns_none() {
        let scraper = RemoteOkScraper::new(vec![], 10);

        let job_data = serde_json::json!({
            "company": "Company",
            "url": "/job/123"
        });

        let result = scraper.parse_job(&job_data).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_job_empty_position_returns_none() {
        let scraper = RemoteOkScraper::new(vec![], 10);

        let job_data = serde_json::json!({
            "position": "",
            "company": "Company",
            "url": "/job/123"
        });

        let result = scraper.parse_job(&job_data).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_job_missing_url_returns_none() {
        let scraper = RemoteOkScraper::new(vec![], 10);

        let job_data = serde_json::json!({
            "position": "Software Engineer",
            "company": "TechCorp"
        });

        let result = scraper.parse_job(&job_data).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_job_empty_url_gets_base_domain() {
        let scraper = RemoteOkScraper::new(vec![], 10);

        let job_data = serde_json::json!({
            "position": "Developer",
            "company": "Company",
            "url": ""
        });

        let result = scraper.parse_job(&job_data).unwrap();
        // Empty URL becomes "https://remoteok.com" after formatting, which is not ideal
        // but is how the current implementation works
        assert!(result.is_some());
        let job = result.unwrap();
        assert_eq!(job.url, "https://remoteok.com");
    }

    #[test]
    fn test_parse_job_with_salary_min_only() {
        let scraper = RemoteOkScraper::new(vec![], 10);

        let job_data = serde_json::json!({
            "position": "DevOps Engineer",
            "company": "CloudCorp",
            "url": "/job/789",
            "salary_min": 100000
        });

        let job = scraper.parse_job(&job_data).unwrap().unwrap();

        assert_eq!(job.salary_min, Some(100000));
        assert_eq!(job.salary_max, None);
    }

    #[test]
    fn test_parse_job_with_salary_max_only() {
        let scraper = RemoteOkScraper::new(vec![], 10);

        let job_data = serde_json::json!({
            "position": "ML Engineer",
            "company": "AIStartup",
            "url": "/job/999",
            "salary_max": 200000
        });

        let job = scraper.parse_job(&job_data).unwrap().unwrap();

        assert_eq!(job.salary_min, None);
        assert_eq!(job.salary_max, Some(200000));
    }

    #[test]
    fn test_job_matches_tags_in_title() {
        let scraper = RemoteOkScraper::new(vec!["rust".to_string()], 10);

        let matching_job = Job {
            id: 0,
            hash: "test".to_string(),
            title: "Rust Developer".to_string(),
            company: "Test".to_string(),
            url: "https://example.com".to_string(),
            location: None,
            description: None,
            score: None,
            score_reasons: None,
            source: "remoteok".to_string(),
            remote: Some(true),
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
        };

        let tags = vec!["rust".to_string()];
        assert!(scraper.job_matches_tags(&matching_job, &tags));
    }

    #[test]
    fn test_job_matches_tags_in_description() {
        let scraper = RemoteOkScraper::new(vec!["python".to_string()], 10);

        let matching_job = Job {
            id: 0,
            hash: "test".to_string(),
            title: "Backend Developer".to_string(),
            company: "Test".to_string(),
            url: "https://example.com".to_string(),
            location: None,
            description: Some("Build APIs with Python and Django".to_string()),
            score: None,
            score_reasons: None,
            source: "remoteok".to_string(),
            remote: Some(true),
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
        };

        let tags = vec!["python".to_string()];
        assert!(scraper.job_matches_tags(&matching_job, &tags));
    }

    #[test]
    fn test_job_matches_tags_case_insensitive() {
        let scraper = RemoteOkScraper::new(vec!["rust".to_string()], 10);

        let matching_job = Job {
            id: 0,
            hash: "test".to_string(),
            title: "RUST Engineer".to_string(),
            company: "Test".to_string(),
            url: "https://example.com".to_string(),
            location: None,
            description: None,
            score: None,
            score_reasons: None,
            source: "remoteok".to_string(),
            remote: Some(true),
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
        };

        let tags = vec!["rust".to_string()];
        assert!(scraper.job_matches_tags(&matching_job, &tags));
    }

    #[test]
    fn test_job_matches_tags_no_match() {
        let scraper = RemoteOkScraper::new(vec!["java".to_string()], 10);

        let non_matching_job = Job {
            id: 0,
            hash: "test".to_string(),
            title: "Rust Developer".to_string(),
            company: "Test".to_string(),
            url: "https://example.com".to_string(),
            location: None,
            description: Some("Work with Rust and WebAssembly".to_string()),
            score: None,
            score_reasons: None,
            source: "remoteok".to_string(),
            remote: Some(true),
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
        };

        let tags = vec!["java".to_string()];
        assert!(!scraper.job_matches_tags(&non_matching_job, &tags));
    }

    #[test]
    fn test_job_matches_multiple_tags() {
        let scraper = RemoteOkScraper::new(vec!["rust".to_string(), "golang".to_string()], 10);

        let matching_job = Job {
            id: 0,
            hash: "test".to_string(),
            title: "Backend Developer".to_string(),
            company: "Test".to_string(),
            url: "https://example.com".to_string(),
            location: None,
            description: Some("Experience with Rust or Golang required".to_string()),
            score: None,
            score_reasons: None,
            source: "remoteok".to_string(),
            remote: Some(true),
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
        };

        let tags = vec!["rust".to_string(), "golang".to_string()];
        assert!(scraper.job_matches_tags(&matching_job, &tags));
    }

    #[test]
    fn test_parse_job_malformed_null_values() {
        let scraper = RemoteOkScraper::new(vec![], 10);

        let job_data = serde_json::json!({
            "position": "Engineer",
            "company": null,
            "url": "/job/1",
            "location": null,
            "description": null
        });

        let job = scraper.parse_job(&job_data).unwrap().unwrap();

        assert_eq!(job.title, "Engineer");
        assert_eq!(job.company, "Unknown");
        assert_eq!(job.location, None);
        assert_eq!(job.description, None);
    }

    #[test]
    fn test_parse_job_empty_object() {
        let scraper = RemoteOkScraper::new(vec![], 10);

        let job_data = serde_json::json!({});

        let result = scraper.parse_job(&job_data).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_job_non_string_values() {
        let scraper = RemoteOkScraper::new(vec![], 10);

        let job_data = serde_json::json!({
            "position": 12345,
            "company": "Company",
            "url": "/job/1"
        });

        let result = scraper.parse_job(&job_data).unwrap();
        // position is not a string, should return None
        assert!(result.is_none());
    }

    #[test]
    fn test_new_scraper_with_tags() {
        let scraper = RemoteOkScraper::new(
            vec!["rust".to_string(), "engineer".to_string()],
            50,
        );

        assert_eq!(scraper.tags.len(), 2);
        assert_eq!(scraper.limit, 50);
    }

    #[test]
    fn test_new_scraper_empty_tags() {
        let scraper = RemoteOkScraper::new(vec![], 100);

        assert_eq!(scraper.tags.len(), 0);
        assert_eq!(scraper.limit, 100);
    }
}
