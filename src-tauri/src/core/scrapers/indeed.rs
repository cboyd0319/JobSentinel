//! Indeed Job Scraper
//!
//! Scrapes jobs from Indeed.com using their public search API and RSS feeds.
//! Indeed is one of the largest job boards with millions of listings.

use super::{JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::{Context, Result};
use async_trait::async_trait;
use chrono::Utc;
use scraper::{Html, Selector};
use sha2::{Digest, Sha256};
use std::collections::HashMap;

/// Indeed scraper configuration
pub struct IndeedScraper {
    /// Search query (job title, keywords)
    pub query: String,
    /// Location filter (city, state, zip, or "remote")
    pub location: String,
    /// Radius in miles (default: 25)
    pub radius: u32,
    /// Maximum results to return (default: 50)
    pub limit: usize,
}

impl IndeedScraper {
    pub fn new(query: String, location: String) -> Self {
        Self {
            query,
            location,
            radius: 25,
            limit: 50,
        }
    }

    pub fn with_radius(mut self, radius: u32) -> Self {
        self.radius = radius;
        self
    }

    pub fn with_limit(mut self, limit: usize) -> Self {
        self.limit = limit;
        self
    }

    /// Scrape jobs from Indeed search results
    async fn scrape_search(&self) -> ScraperResult {
        tracing::info!(
            "Scraping Indeed for '{}' in {}",
            self.query,
            self.location
        );

        // Build Indeed search URL
        // Format: https://www.indeed.com/jobs?q=software+engineer&l=San+Francisco,+CA&radius=25
        let mut params = HashMap::new();
        params.insert("q", self.query.replace(' ', "+"));
        params.insert("l", self.location.replace(' ', "+"));
        params.insert("radius", self.radius.to_string());
        params.insert("limit", self.limit.to_string());

        let query_string: String = params
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect::<Vec<_>>()
            .join("&");

        let url = format!("https://www.indeed.com/jobs?{}", query_string);

        tracing::debug!("Indeed search URL: {}", url);

        // Fetch search results with realistic user agent
        let client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .timeout(std::time::Duration::from_secs(30))
            .build()?;

        let response = client
            .get(&url)
            .send()
            .await
            .context("Failed to fetch Indeed search results")?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Indeed HTTP {}: {}",
                response.status(),
                url
            ));
        }

        let html = response.text().await?;

        // Parse job cards from HTML
        let jobs = self.parse_job_cards(&html)?;

        tracing::info!("Found {} jobs from Indeed", jobs.len());
        Ok(jobs)
    }

    /// Parse job cards from Indeed HTML
    fn parse_job_cards(&self, html: &str) -> Result<Vec<Job>> {
        let document = Html::parse_document(html);
        let mut jobs = Vec::new();

        // Indeed job cards use various selectors depending on layout
        // Try multiple patterns for robustness

        // Pattern 1: Modern React-based layout (data-jk attribute)
        if let Ok(card_selector) = Selector::parse("[data-jk]") {
            for card in document.select(&card_selector) {
                if let Some(job) = self.parse_job_card_modern(&card)? {
                    jobs.push(job);
                }
            }
        }

        // Pattern 2: Classic layout (class-based)
        if jobs.is_empty() {
            if let Ok(card_selector) = Selector::parse(".jobsearch-SerpJobCard") {
                for card in document.select(&card_selector) {
                    if let Some(job) = self.parse_job_card_classic(&card)? {
                        jobs.push(job);
                    }
                }
            }
        }

        // Pattern 3: Mobile layout
        if jobs.is_empty() {
            if let Ok(card_selector) = Selector::parse(".job_seen_beacon") {
                for card in document.select(&card_selector) {
                    if let Some(job) = self.parse_job_card_mobile(&card)? {
                        jobs.push(job);
                    }
                }
            }
        }

        Ok(jobs)
    }

    /// Parse modern Indeed job card (React-based layout)
    fn parse_job_card_modern(&self, card: &scraper::ElementRef) -> Result<Option<Job>> {
        // Extract job key
        let job_key = card
            .value()
            .attr("data-jk")
            .ok_or_else(|| anyhow::anyhow!("Missing job key"))?;

        // Extract title
        let title_selector = Selector::parse("h2.jobTitle span").ok();
        let title = title_selector
            .and_then(|sel| card.select(&sel).next())
            .map(|el| el.text().collect::<String>())
            .unwrap_or_default();

        // Extract company
        let company_selector = Selector::parse("[data-testid='company-name']").ok();
        let company = company_selector
            .and_then(|sel| card.select(&sel).next())
            .map(|el| el.text().collect::<String>())
            .unwrap_or_else(|| "Unknown Company".to_string());

        // Extract location
        let location_selector = Selector::parse("[data-testid='text-location']").ok();
        let location = location_selector
            .and_then(|sel| card.select(&sel).next())
            .map(|el| el.text().collect::<String>())
            .unwrap_or_default();

        // Extract snippet
        let snippet_selector = Selector::parse(".job-snippet").ok();
        let description = snippet_selector
            .and_then(|sel| card.select(&sel).next())
            .map(|el| el.text().collect::<String>())
            .unwrap_or_default();

        // Build full URL
        let url = format!("https://www.indeed.com/viewjob?jk={}", job_key);
        let hash = self.generate_hash(&title, &company, &url);

        Ok(Some(Job {
            id: 0, // Placeholder, will be set by DB
            hash,
            title: title.trim().to_string(),
            company: company.trim().to_string(),
            location: Some(location.trim().to_string()),
            description: Some(description),
            url,
            score: Some(0.0),
            score_reasons: None,
            source: "indeed".to_string(),
            remote: None,
            salary_min: None,
            salary_max: None,
            currency: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_seen: Utc::now(),
            times_seen: 1,
            immediate_alert_sent: false,
            included_in_digest: false,
        }))
    }

    /// Parse classic Indeed job card (class-based layout)
    fn parse_job_card_classic(&self, card: &scraper::ElementRef) -> Result<Option<Job>> {
        // Extract job key from data-jk or id
        let job_key = card
            .value()
            .attr("data-jk")
            .or_else(|| card.value().attr("id"))
            .ok_or_else(|| anyhow::anyhow!("Missing job key"))?;

        // Extract title
        let title_selector = Selector::parse(".jobtitle, .jobTitle").ok();
        let title = title_selector
            .and_then(|sel| card.select(&sel).next())
            .map(|el| el.text().collect::<String>())
            .unwrap_or_default();

        // Extract company
        let company_selector = Selector::parse(".company").ok();
        let company = company_selector
            .and_then(|sel| card.select(&sel).next())
            .map(|el| el.text().collect::<String>())
            .unwrap_or_else(|| "Unknown Company".to_string());

        // Extract location
        let location_selector = Selector::parse(".location, .companyLocation").ok();
        let location = location_selector
            .and_then(|sel| card.select(&sel).next())
            .map(|el| el.text().collect::<String>())
            .unwrap_or_default();

        // Extract description
        let description_selector = Selector::parse(".summary").ok();
        let description = description_selector
            .and_then(|sel| card.select(&sel).next())
            .map(|el| el.text().collect::<String>())
            .unwrap_or_default();

        let url = format!("https://www.indeed.com/viewjob?jk={}", job_key);
        let hash = self.generate_hash(&title, &company, &url);

        if title.is_empty() {
            return Ok(None);
        }

        Ok(Some(Job {
            id: 0,
            hash,
            title: title.trim().to_string(),
            company: company.trim().to_string(),
            location: Some(location.trim().to_string()),
            description: Some(description),
            url,
            score: Some(0.0),
            score_reasons: None,
            source: "indeed".to_string(),
            remote: None,
            salary_min: None,
            salary_max: None,
            currency: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_seen: Utc::now(),
            times_seen: 1,
            immediate_alert_sent: false,
            included_in_digest: false,
        }))
    }

    /// Parse mobile Indeed job card
    fn parse_job_card_mobile(&self, card: &scraper::ElementRef) -> Result<Option<Job>> {
        // Mobile layout is similar to modern, extract same way
        self.parse_job_card_modern(card)
    }

    /// Generate SHA-256 hash for job deduplication
    fn generate_hash(&self, title: &str, company: &str, url: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(title.as_bytes());
        hasher.update(company.as_bytes());
        hasher.update(url.as_bytes());
        format!("{:x}", hasher.finalize())
    }
}

#[async_trait]
impl JobScraper for IndeedScraper {
    async fn scrape(&self) -> ScraperResult {
        self.scrape_search().await
    }

    fn name(&self) -> &'static str {
        "Indeed"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_query_building() {
        let scraper = IndeedScraper::new(
            "software engineer".to_string(),
            "San Francisco, CA".to_string(),
        )
        .with_radius(50)
        .with_limit(100);

        assert_eq!(scraper.query, "software engineer");
        assert_eq!(scraper.location, "San Francisco, CA");
        assert_eq!(scraper.radius, 50);
        assert_eq!(scraper.limit, 100);
    }

    #[test]
    fn test_hash_generation() {
        let scraper = IndeedScraper::new("test".to_string(), "test".to_string());

        let hash1 = scraper.generate_hash("Software Engineer", "Google", "https://example.com/1");
        let hash2 = scraper.generate_hash("Software Engineer", "Google", "https://example.com/1");
        let hash3 = scraper.generate_hash("Software Engineer", "Meta", "https://example.com/1");

        // Same input should produce same hash
        assert_eq!(hash1, hash2);

        // Different company should produce different hash
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_parse_modern_job_card() {
        let html = r#"
        <div data-jk="abc123">
            <h2 class="jobTitle"><span>Senior Software Engineer</span></h2>
            <span data-testid="company-name">TechCorp Inc</span>
            <div data-testid="text-location">San Francisco, CA</div>
            <div class="job-snippet">Build scalable systems...</div>
        </div>
        "#;

        let document = Html::parse_document(html);
        let scraper = IndeedScraper::new("test".to_string(), "test".to_string());

        let selector = Selector::parse("[data-jk]").unwrap();
        let card = document.select(&selector).next().unwrap();

        let job = scraper.parse_job_card_modern(&card).unwrap();

        assert!(job.is_some());
        let job = job.unwrap();
        assert_eq!(job.title, "Senior Software Engineer");
        assert_eq!(job.company, "TechCorp Inc");
        assert_eq!(job.location, Some("San Francisco, CA".to_string()));
        assert_eq!(job.source, "indeed");
        assert!(job.url.contains("abc123"));
    }

    #[tokio::test]
    async fn test_scraper_name() {
        let scraper = IndeedScraper::new("test".to_string(), "test".to_string());
        assert_eq!(scraper.name(), "Indeed");
    }
}
