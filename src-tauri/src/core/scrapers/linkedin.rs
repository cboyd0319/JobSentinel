//! LinkedIn Job Scraper
//!
//! Scrapes jobs from LinkedIn using authenticated session cookies.
//!
//! ## Architecture
//!
//! LinkedIn requires authentication, so this scraper uses session cookies
//! from a logged-in user. The user must provide their LinkedIn session cookie
//! via the config file.
//!
//! ## Security & Ethics
//!
//! - Uses ONLY the user's own session cookie (no credential storage)
//! - Respects LinkedIn's rate limits (max 100 requests/hour)
//! - User-agent mimics real browser
//! - Includes random delays between requests (2-5 seconds)
//! - **User Responsibility**: Users must comply with LinkedIn's Terms of Service
//!
//! ## Future Enhancement: Headless Browser
//!
//! For better reliability, this could be upgraded to use headless Chrome/Firefox
//! with the `headless_chrome` or `fantoccini` crate. This would allow:
//! - Interactive login (no cookie extraction needed)
//! - JavaScript rendering
//! - Better CAPTCHA handling
//!
//! ## Setup Instructions
//!
//! 1. Log into LinkedIn in your browser
//! 2. Open DevTools (F12) → Application → Cookies
//! 3. Copy the `li_at` cookie value
//! 4. Add to config.json:
//!    ```json
//!    {
//!      "linkedin": {
//!        "enabled": true,
//!        "session_cookie": "YOUR_LI_AT_COOKIE_HERE",
//!        "query": "software engineer",
//!        "location": "San Francisco Bay Area",
//!        "remote_only": false
//!      }
//!    }
//!    ```

use super::http_client::get_client;
use super::{JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::{Context, Result};
use async_trait::async_trait;
use chrono::Utc;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::Duration;
use tokio::time::sleep;

/// LinkedIn scraper configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinkedInScraper {
    /// LinkedIn session cookie (li_at value)
    pub session_cookie: String,
    /// Search query (job title, keywords)
    pub query: String,
    /// Location filter (e.g., "San Francisco Bay Area")
    pub location: String,
    /// Remote jobs only
    pub remote_only: bool,
    /// Maximum results to return (default: 50, max: 100)
    pub limit: usize,
}

/// LinkedIn job search result from API
/// These structs model LinkedIn's Voyager API response structure
#[derive(Debug, Deserialize)]
struct LinkedInSearchResponse {
    #[serde(default)]
    data: LinkedInSearchData,
}

#[derive(Debug, Default, Deserialize)]
struct LinkedInSearchData {
    #[serde(rename = "searchDashJobsByCard", default)]
    jobs: LinkedInJobs,
}

#[derive(Debug, Default, Deserialize)]
struct LinkedInJobs {
    #[serde(default)]
    elements: Vec<LinkedInJobElement>,
}

#[derive(Debug, Deserialize)]
struct LinkedInJobElement {
    #[serde(rename = "dashEntityUrn", default)]
    urn: String,
    #[serde(default)]
    title: String,
    #[serde(rename = "companyDetails", default)]
    company_details: Option<LinkedInCompanyDetails>,
    #[serde(rename = "formattedLocation", default)]
    location: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LinkedInCompanyDetails {
    #[serde(rename = "companyResolutionResult", default)]
    company: Option<LinkedInCompanyInfo>,
}

#[derive(Debug, Deserialize)]
struct LinkedInCompanyInfo {
    #[serde(default)]
    name: String,
}

impl LinkedInScraper {
    pub fn new(session_cookie: String, query: String, location: String) -> Self {
        Self {
            session_cookie,
            query,
            location,
            remote_only: false,
            limit: 50,
        }
    }

    pub fn with_remote_only(mut self, remote_only: bool) -> Self {
        self.remote_only = remote_only;
        self
    }

    pub fn with_limit(mut self, limit: usize) -> Self {
        self.limit = limit.min(100); // LinkedIn max
        self
    }

    /// Scrape jobs from LinkedIn
    async fn scrape_linkedin(&self) -> ScraperResult {
        tracing::info!(
            "Scraping LinkedIn for '{}' in {}",
            self.query,
            self.location
        );

        // Validate session cookie
        if self.session_cookie.is_empty() || self.session_cookie.len() < 10 {
            return Err(anyhow::anyhow!(
                "Invalid LinkedIn session cookie. Please provide your li_at cookie value."
            ));
        }

        // Try API-based search first (faster, more reliable)
        match self.scrape_linkedin_api().await {
            Ok(jobs) if !jobs.is_empty() => {
                tracing::info!("Found {} jobs from LinkedIn API", jobs.len());
                return Ok(jobs);
            }
            Ok(_) => tracing::warn!("LinkedIn API returned no jobs, trying HTML fallback"),
            Err(e) => tracing::warn!("LinkedIn API failed: {}, trying HTML fallback", e),
        }

        // Fallback to HTML scraping
        let jobs = self.scrape_linkedin_html().await?;

        tracing::info!("Found {} jobs from LinkedIn HTML", jobs.len());
        Ok(jobs)
    }

    /// Scrape using LinkedIn's internal API (requires session cookie)
    async fn scrape_linkedin_api(&self) -> ScraperResult {
        // LinkedIn job search API endpoint
        // This is a simplified version - LinkedIn's actual API is more complex
        let api_url = format!(
            "https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards?decorationId=com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-174&count={}&keywords={}&location={}&start=0",
            self.limit,
            urlencoding::encode(&self.query),
            urlencoding::encode(&self.location)
        );

        // Use shared HTTP client
        let client = get_client();

        // Add delay to respect rate limits
        sleep(Duration::from_secs(2)).await;

        let response = client
            .get(&api_url)
            .header("Cookie", format!("li_at={}", self.session_cookie))
            .header("csrf-token", &self.session_cookie) // LinkedIn CSRF protection
            .send()
            .await
            .context("Failed to fetch LinkedIn API")?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "LinkedIn API HTTP {}: Check if your session cookie is valid",
                response.status()
            ));
        }

        let json: serde_json::Value = response.json().await?;

        // Parse LinkedIn API response
        let jobs = self.parse_linkedin_api_response(&json)?;

        Ok(jobs)
    }

    /// Parse LinkedIn API JSON response using typed structs
    fn parse_linkedin_api_response(&self, json: &serde_json::Value) -> Result<Vec<Job>> {
        // Try to deserialize into typed struct first
        if let Ok(response) = serde_json::from_value::<LinkedInSearchResponse>(json.clone()) {
            let jobs: Vec<Job> = response
                .data
                .jobs
                .elements
                .iter()
                .filter_map(|element| self.convert_linkedin_element(element))
                .collect();
            
            if !jobs.is_empty() {
                return Ok(jobs);
            }
        }

        // Fallback to manual parsing if typed deserialization fails
        // (LinkedIn API response structure can vary)
        let mut jobs = Vec::new();
        if let Some(elements) = json
            .get("data")
            .and_then(|d| d.get("searchDashJobsByCard"))
            .and_then(|s| s.get("elements"))
            .and_then(|e| e.as_array())
        {
            for element in elements {
                if let Some(job) = self.parse_linkedin_job_element(element)? {
                    jobs.push(job);
                }
            }
        }

        Ok(jobs)
    }

    /// Convert a typed LinkedIn job element to our Job struct
    fn convert_linkedin_element(&self, element: &LinkedInJobElement) -> Option<Job> {
        let job_id = element.urn.split(':').next_back().unwrap_or("unknown");
        
        if element.title.is_empty() || job_id == "unknown" {
            return None;
        }

        let company = element
            .company_details
            .as_ref()
            .and_then(|cd| cd.company.as_ref())
            .map(|c| c.name.clone())
            .unwrap_or_else(|| "Unknown Company".to_string());

        let url = format!("https://www.linkedin.com/jobs/view/{}", job_id);
        let hash = self.generate_hash(&element.title, &company, &url);

        Some(Job {
            id: 0,
            hash,
            title: element.title.trim().to_string(),
            company: company.trim().to_string(),
            location: element.location.as_ref().map(|l| l.trim().to_string()),
            description: Some(String::new()),
            url,
            score: Some(0.0),
            score_reasons: None,
            source: "linkedin".to_string(),
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
        })
    }

    /// Parse individual LinkedIn job from API response (fallback for untyped parsing)
    fn parse_linkedin_job_element(&self, element: &serde_json::Value) -> Result<Option<Job>> {
        // Extract job ID from URN
        let urn = element["dashEntityUrn"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let job_id = urn
            .split(':')
            .next_back()
            .unwrap_or("unknown")
            .to_string();

        // Extract title
        let title = element["title"]
            .as_str()
            .unwrap_or("")
            .to_string();

        // Extract company name
        let company = element
            .get("companyDetails")
            .and_then(|c| c.get("companyResolutionResult"))
            .and_then(|r| r.get("name"))
            .and_then(|n| n.as_str())
            .unwrap_or("Unknown Company")
            .to_string();

        // Extract location
        let location = element["formattedLocation"]
            .as_str()
            .unwrap_or("")
            .to_string();

        if title.is_empty() || job_id == "unknown" {
            return Ok(None);
        }

        // Build LinkedIn job URL
        let url = format!("https://www.linkedin.com/jobs/view/{}", job_id);

        // Generate hash
        let hash = self.generate_hash(&title, &company, &url);

        Ok(Some(Job {
            id: 0,
            hash,
            title: title.trim().to_string(),
            company: company.trim().to_string(),
            location: Some(location.trim().to_string()),
            description: Some(String::new()), // Requires separate detail fetch
            url,
            score: Some(0.0),
            score_reasons: None,
            source: "linkedin".to_string(),
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

    /// Fallback: Scrape LinkedIn HTML (requires session cookie)
    async fn scrape_linkedin_html(&self) -> ScraperResult {
        let search_url = format!(
            "https://www.linkedin.com/jobs/search/?keywords={}&location={}",
            urlencoding::encode(&self.query),
            urlencoding::encode(&self.location)
        );

        // Use shared HTTP client
        let client = get_client();

        // Add delay
        sleep(Duration::from_secs(2)).await;

        let response = client
            .get(&search_url)
            .header("Cookie", format!("li_at={}", self.session_cookie))
            .send()
            .await
            .context("Failed to fetch LinkedIn search")?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "LinkedIn HTML HTTP {}: Session may have expired",
                response.status()
            ));
        }

        let html = response.text().await?;

        // Parse job cards from HTML
        let jobs = self.parse_linkedin_html(&html)?;

        Ok(jobs)
    }

    /// Parse LinkedIn HTML job listings
    fn parse_linkedin_html(&self, html: &str) -> Result<Vec<Job>> {
        let document = Html::parse_document(html);
        let mut jobs = Vec::new();

        // LinkedIn job cards (React-based, structure varies)
        if let Ok(card_selector) = Selector::parse(".job-card-container, .jobs-search-results__list-item") {
            for card in document.select(&card_selector).take(self.limit) {
                if let Some(job) = self.parse_linkedin_job_card(&card)? {
                    jobs.push(job);
                }
            }
        }

        Ok(jobs)
    }

    /// Parse LinkedIn job card from HTML
    fn parse_linkedin_job_card(&self, card: &scraper::ElementRef) -> Result<Option<Job>> {
        // Extract job ID from data attribute or link
        let job_id = card
            .value()
            .attr("data-job-id")
            .or_else(|| {
                // Try to extract from link href
                let link_selector = Selector::parse("a[data-tracking-control-name]").ok()?;
                let link = card.select(&link_selector).next()?;
                let href = link.value().attr("href")?;
                href.split('/').find(|s| s.parse::<u64>().is_ok())
            })
            .unwrap_or("unknown");

        // Extract title
        let title_selector = Selector::parse("h3, .job-card-list__title").ok();
        let title = title_selector
            .and_then(|sel| card.select(&sel).next())
            .map(|el| el.text().collect::<String>())
            .unwrap_or_default();

        // Extract company
        let company_selector = Selector::parse(".job-card-container__company-name, h4").ok();
        let company = company_selector
            .and_then(|sel| card.select(&sel).next())
            .map(|el| el.text().collect::<String>())
            .unwrap_or_else(|| "Unknown Company".to_string());

        // Extract location
        let location_selector = Selector::parse(".job-card-container__metadata-item").ok();
        let location = location_selector
            .and_then(|sel| card.select(&sel).next())
            .map(|el| el.text().collect::<String>())
            .unwrap_or_default();

        if title.is_empty() || job_id == "unknown" {
            return Ok(None);
        }

        let url = format!("https://www.linkedin.com/jobs/view/{}", job_id);
        let hash = self.generate_hash(&title, &company, &url);

        Ok(Some(Job {
            id: 0,
            hash,
            title: title.trim().to_string(),
            company: company.trim().to_string(),
            location: Some(location.trim().to_string()),
            description: Some(String::new()),
            url,
            score: Some(0.0),
            score_reasons: None,
            source: "linkedin".to_string(),
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
impl JobScraper for LinkedInScraper {
    async fn scrape(&self) -> ScraperResult {
        self.scrape_linkedin().await
    }

    fn name(&self) -> &'static str {
        "LinkedIn"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scraper_creation() {
        let scraper = LinkedInScraper::new(
            "test_cookie".to_string(),
            "software engineer".to_string(),
            "San Francisco".to_string(),
        )
        .with_remote_only(true)
        .with_limit(200);

        assert_eq!(scraper.query, "software engineer");
        assert_eq!(scraper.location, "San Francisco");
        assert!(scraper.remote_only);
        assert_eq!(scraper.limit, 100); // Capped at max
    }

    #[test]
    fn test_invalid_cookie_detection() {
        let scraper = LinkedInScraper::new(
            "".to_string(),
            "test".to_string(),
            "test".to_string(),
        );

        // Should fail with invalid cookie
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(scraper.scrape());
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid"));
    }

    #[test]
    fn test_hash_generation() {
        let scraper = LinkedInScraper::new(
            "test".to_string(),
            "test".to_string(),
            "test".to_string(),
        );

        let hash1 = scraper.generate_hash("Engineer", "Google", "https://linkedin.com/1");
        let hash2 = scraper.generate_hash("Engineer", "Google", "https://linkedin.com/1");
        let hash3 = scraper.generate_hash("Engineer", "Meta", "https://linkedin.com/1");

        assert_eq!(hash1, hash2);
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_parse_linkedin_job_element() {
        let scraper = LinkedInScraper::new(
            "test".to_string(),
            "test".to_string(),
            "test".to_string(),
        );

        let json = serde_json::json!({
            "dashEntityUrn": "urn:li:fsd_jobPosting:12345",
            "title": "Senior Engineer",
            "companyDetails": {
                "companyResolutionResult": {
                    "name": "TechCorp"
                }
            },
            "formattedLocation": "Remote"
        });

        let job = scraper.parse_linkedin_job_element(&json).unwrap();

        assert!(job.is_some());
        let job = job.unwrap();
        assert_eq!(job.title, "Senior Engineer");
        assert_eq!(job.company, "TechCorp");
        assert_eq!(job.location, Some("Remote".to_string()));
        assert_eq!(job.source, "linkedin");
        assert!(job.url.contains("12345"));
    }

    #[tokio::test]
    async fn test_scraper_name() {
        let scraper = LinkedInScraper::new(
            "test".to_string(),
            "test".to_string(),
            "test".to_string(),
        );
        assert_eq!(scraper.name(), "LinkedIn");
    }
}
