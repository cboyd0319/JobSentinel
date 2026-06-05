//! RemoteOK Job Scraper
//!
//! Scrapes remote jobs from RemoteOK's public JSON API.
//! RemoteOK is a popular remote job board with tech-focused listings.

use super::error::ScraperError;
use super::http_client::{read_json_with_limit, send_with_retry};
use super::rate_limiter::RateLimiter;
use super::{location_utils, title_utils, url_utils, JobScraper, ScraperResult};
use crate::core::db::Job;
use async_trait::async_trait;
use chrono::Utc;
use sha2::{Digest, Sha256};

/// RemoteOK job scraper
#[derive(Debug, Clone)]
pub struct RemoteOkScraper {
    /// Search tags to filter jobs (e.g., "rust", "python", "engineer")
    pub tags: Vec<String>,
    /// Maximum results to return
    pub limit: usize,
    /// Rate limiter for respecting RemoteOK's request limits
    pub rate_limiter: RateLimiter,
}

impl RemoteOkScraper {
    pub fn new(tags: Vec<String>, limit: usize) -> Self {
        Self {
            tags,
            limit,
            rate_limiter: RateLimiter::shared(),
        }
    }

    /// Fetch jobs from RemoteOK API
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!("Fetching jobs from RemoteOK");

        // Use rate limiter (500 req/hr - public API)
        self.rate_limiter.wait("remoteok", 500).await;

        let url = "https://remoteok.com/api";

        let response = send_with_retry(url, |client| {
            client.get(url).header("User-Agent", "JobSentinel/1.0")
        })
        .await
        .map_err(|e| ScraperError::from_anyhow("remoteok", e))?;

        if !response.status().is_success() {
            return Err(ScraperError::http_status(
                response.status().as_u16(),
                url,
                format!("RemoteOK API failed: {}", response.status()),
            ));
        }

        let json: serde_json::Value = read_json_with_limit(response, url).await?;

        // RemoteOK returns an array where first element is a legal notice
        let jobs_array = json.as_array().ok_or_else(|| {
            ScraperError::parse(
                "JSON",
                url,
                std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "Expected array from RemoteOK API",
                ),
            )
        })?;

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
    fn parse_job(&self, data: &serde_json::Value) -> Result<Option<Job>, ScraperError> {
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
            ghost_score: None,
            ghost_reasons: None,
            first_seen: None,
            repost_count: 0,
        }))
    }

    /// Compute SHA-256 hash for deduplication
    fn compute_hash(company: &str, title: &str, location: Option<&str>, url: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(company.to_lowercase().as_bytes());
        hasher.update(title_utils::normalize_title(title).as_bytes());
        if let Some(loc) = location {
            hasher.update(location_utils::normalize_location(loc).as_bytes());
        }
        hasher.update(url_utils::normalize_url(url).as_bytes());
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
mod tests;
