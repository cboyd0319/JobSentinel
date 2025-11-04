//! JobsWithGPT MCP Client
//!
//! Integrates with JobsWithGPT via Model Context Protocol for 500K+ job listings.
//! MCP is a JSON-RPC based protocol for querying structured data.

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

        let client = reqwest::Client::builder()
            .user_agent("JobSentinel/2.0")
            .timeout(std::time::Duration::from_secs(60))
            .build()?;

        let response = client
            .post(&self.endpoint)
            .json(&request)
            .send()
            .await?;

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
    fn parse_mcp_job(
        &self,
        data: &serde_json::Value,
    ) -> Result<Option<Job>> {
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

    #[test]
    fn test_compute_hash() {
        let hash1 = JobsWithGptScraper::compute_hash("Apple", "iOS Engineer", Some("Cupertino"), "https://example.com/1");
        let hash2 = JobsWithGptScraper::compute_hash("Apple", "iOS Engineer", Some("Cupertino"), "https://example.com/1");
        let hash3 = JobsWithGptScraper::compute_hash("Apple", "iOS Engineer", Some("Remote"), "https://example.com/1");

        assert_eq!(hash1, hash2);
        assert_ne!(hash1, hash3);
    }
}
