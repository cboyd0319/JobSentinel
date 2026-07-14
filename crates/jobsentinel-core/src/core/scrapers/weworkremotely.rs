//! WeWorkRemotely Job Scraper
//!
//! Scrapes remote jobs from WeWorkRemotely's RSS feed.
//! WeWorkRemotely is a popular remote-only job board.

use super::error::ScraperError;
use super::http_client::{read_text_with_limit, send_with_retry};
use super::rate_limiter::RateLimiter;
#[cfg(test)]
use super::rss::extract_xml_tag;
use super::rss::parse_rss_items;
use super::{JobScraper, ScraperResult};
use crate::core::calculate_job_hash;
use crate::core::Job;

use async_trait::async_trait;
use chrono::Utc;

/// WeWorkRemotely job scraper
#[derive(Debug, Clone)]
pub(crate) struct WeWorkRemotelyScraper {
    /// Category to search (e.g., "programming", "design", "devops")
    pub category: Option<String>,
    /// Maximum results to return
    pub limit: usize,
    /// Rate limiter for respecting WeWorkRemotely's request limits
    pub rate_limiter: RateLimiter,
}

impl WeWorkRemotelyScraper {
    pub(crate) fn new(category: Option<String>, limit: usize) -> Self {
        Self {
            category,
            limit,
            rate_limiter: RateLimiter::shared(),
        }
    }

    /// Build the RSS feed URL
    fn build_url(&self) -> String {
        match &self.category {
            Some(cat) => format!("https://weworkremotely.com/categories/{}.rss", cat),
            None => "https://weworkremotely.com/remote-jobs.rss".to_string(),
        }
    }

    /// Fetch jobs from WeWorkRemotely RSS feed
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!("Fetching jobs from WeWorkRemotely");

        // Use rate limiter (RSS feed, be conservative)
        self.rate_limiter.wait("weworkremotely", 300).await;

        let url = self.build_url();

        let response = send_with_retry(&url, |client| {
            client.get(&url).header("User-Agent", "JobSentinel/1.0")
        })
        .await
        .map_err(|e| ScraperError::from_anyhow("weworkremotely", e))?;

        if !response.status().is_success() {
            return Err(ScraperError::http_status(
                response.status().as_u16(),
                &url,
                format!("WeWorkRemotely request failed: {}", response.status()),
            ));
        }

        let xml = read_text_with_limit(response, &url).await?;
        let jobs = self.parse_rss(&xml)?;

        tracing::info!("Found {} jobs from WeWorkRemotely", jobs.len());
        Ok(jobs)
    }

    /// Parse RSS XML to extract job listings
    fn parse_rss(&self, xml: &str) -> Result<Vec<Job>, ScraperError> {
        let mut jobs = Vec::with_capacity(self.limit);

        let items =
            parse_rss_items(xml, self.limit).map_err(|source| ScraperError::ParseError {
                format: "RSS".to_string(),
                url: self.build_url(),
                source,
            })?;

        for item in items {
            let title = item
                .get("title")
                .map(Self::decode_html_entities)
                .unwrap_or_default();

            let url = item.get("link").unwrap_or_default().to_string();

            // WeWorkRemotely titles often include company: "Company: Job Title"
            let (company, job_title) = if let Some(pos) = title.find(':') {
                let (c, t) = title.split_at(pos);
                (c.trim().to_string(), t[1..].trim().to_string())
            } else {
                ("Unknown Company".to_string(), title)
            };

            if job_title.is_empty() || url.is_empty() {
                continue;
            }

            // Extract description and clean HTML
            let description = item
                .get("description")
                .map(Self::decode_html_entities)
                .map(|d| Self::strip_html_tags(&d));

            // Try to extract location from description
            let location = description.as_ref().and_then(|d| Self::extract_location(d));

            let hash = Self::compute_hash(&company, &job_title, location.as_deref(), &url);

            jobs.push(Job {
                id: 0,
                hash,
                title: job_title,
                company,
                url,
                location,
                description,
                score: None,
                score_reasons: None,
                source: "weworkremotely".to_string(),
                remote: Some(true), // All WeWorkRemotely jobs are remote
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

        Ok(jobs)
    }

    /// Extract content between XML tags
    #[cfg(test)]
    fn extract_tag(xml: &str, tag: &str) -> Option<String> {
        extract_xml_tag(xml, tag)
    }

    /// Decode HTML entities
    fn decode_html_entities(text: &str) -> String {
        text.replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&nbsp;", " ")
    }

    /// Strip HTML tags from text
    fn strip_html_tags(html: &str) -> String {
        let mut result = String::new();
        let mut in_tag = false;

        for ch in html.chars() {
            match ch {
                '<' => in_tag = true,
                '>' => in_tag = false,
                _ if !in_tag => result.push(ch),
                _ => {}
            }
        }

        // Clean up whitespace
        result.split_whitespace().collect::<Vec<_>>().join(" ")
    }

    /// Try to extract location from description
    fn extract_location(description: &str) -> Option<String> {
        let desc_lower = description.to_lowercase();

        // Common location patterns in WWR descriptions
        if desc_lower.contains("worldwide") || desc_lower.contains("anywhere") {
            return Some("Worldwide".to_string());
        }
        if desc_lower.contains("usa only") || desc_lower.contains("us only") {
            return Some("USA".to_string());
        }
        if desc_lower.contains("europe") || desc_lower.contains("eu only") {
            return Some("Europe".to_string());
        }
        if desc_lower.contains("north america") {
            return Some("North America".to_string());
        }

        None
    }

    /// Compute SHA-256 hash for deduplication
    fn compute_hash(company: &str, title: &str, location: Option<&str>, url: &str) -> String {
        calculate_job_hash(company, title, location, url)
    }
}

#[async_trait]
impl JobScraper for WeWorkRemotelyScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    #[cfg(test)]
    fn name(&self) -> &'static str {
        "weworkremotely"
    }
}

#[cfg(test)]
#[path = "weworkremotely_tests.rs"]
mod tests;
