//! Dice Job Scraper
//!
//! Scrapes tech jobs from Dice.com, a tech-focused job board.
//! Dice specializes in technology and IT positions.

use super::error::ScraperError;
use super::http_client::{read_text_with_limit, send_with_retry};
use super::rate_limiter::RateLimiter;
use super::{JobScraper, ScraperResult};
use crate::core::calculate_job_hash;
use crate::core::db::Job;
use async_trait::async_trait;
use chrono::Utc;
use scraper::{Html, Selector};

/// Dice job scraper
#[derive(Debug, Clone)]
pub struct DiceScraper {
    /// Search query (e.g., "rust developer", "software engineer")
    pub query: String,
    /// Location (e.g., "Remote", "New York, NY")
    pub location: Option<String>,
    /// Maximum results to return
    pub limit: usize,
    /// Rate limiter for respecting Dice's request limits
    pub rate_limiter: RateLimiter,
}

impl DiceScraper {
    pub fn new(query: impl Into<String>, location: Option<String>, limit: usize) -> Self {
        Self {
            query: query.into(),
            location,
            limit,
            rate_limiter: RateLimiter::shared(),
        }
    }

    /// Build the search URL
    fn build_url(&self) -> String {
        let mut url = format!(
            "https://www.dice.com/jobs?q={}&countryCode=US&radius=30&radiusUnit=mi&page=1&pageSize={}",
            urlencoding::encode(&self.query),
            self.limit.min(100)
        );

        if let Some(loc) = &self.location {
            url.push_str(&format!("&location={}", urlencoding::encode(loc)));
        }

        url
    }

    /// Fetch jobs from Dice
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!(
            query_chars = self.query.chars().count(),
            has_location = self.location.is_some(),
            limit = self.limit,
            "Fetching jobs from Dice"
        );

        // Use rate limiter (500 req/hr - similar to Indeed)
        self.rate_limiter.wait("dice", 500).await;

        let url = self.build_url();

        let response = send_with_retry(&url, |client| {
            client
                .get(&url)
                .header(
                    "Accept",
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                )
                .header("Accept-Language", "en-US,en;q=0.5")
        })
        .await
        .map_err(|e| ScraperError::from_anyhow("dice", e))?;

        if !response.status().is_success() {
            return Err(ScraperError::http_status(
                response.status().as_u16(),
                &url,
                format!("Dice request failed: {}", response.status()),
            ));
        }

        let html = read_text_with_limit(response, &url).await?;
        let jobs = self.parse_html(&html)?;

        tracing::info!("Found {} jobs from Dice", jobs.len());
        Ok(jobs)
    }

    /// Parse HTML to extract job listings
    #[allow(clippy::expect_used)] // Static CSS selectors are known valid at compile time
    fn parse_html(&self, html: &str) -> Result<Vec<Job>, ScraperError> {
        let document = Html::parse_document(html);
        let mut jobs = Vec::with_capacity(self.limit.min(100));

        // Dice uses various selectors for job cards
        // Try multiple patterns for resilience
        let job_selectors = [
            "[data-cy='search-card']",
            ".card-title-link",
            ".search-card",
            "article[data-testid='job-card']",
        ];

        let mut job_selector = None;
        for selector_str in job_selectors {
            if let Ok(sel) = Selector::parse(selector_str) {
                if document.select(&sel).next().is_some() {
                    job_selector = Some(sel);
                    break;
                }
            }
        }

        let job_selector = match job_selector {
            Some(sel) => sel,
            None => {
                // Fallback: try to find any job-like elements
                Selector::parse("a[href*='/job-detail/']")
                    .or_else(|_| Selector::parse("a"))
                    .expect("fallback selector 'a' is valid CSS")
            }
        };

        // Selectors for job details
        let title_selector =
            Selector::parse("[data-cy='card-title'], .card-title-link, h5 a, .job-title")
                .or_else(|_| Selector::parse("a"))
                .expect("fallback selector 'a' is valid CSS");

        let company_selector = Selector::parse(
            "[data-cy='search-result-company-name'], .company-name, .employer-name",
        )
        .or_else(|_| Selector::parse("span"))
        .expect("fallback selector 'span' is valid CSS");

        let location_selector = Selector::parse(
            "[data-cy='search-result-location'], .job-location, .search-result-location",
        )
        .or_else(|_| Selector::parse("span"))
        .expect("fallback selector 'span' is valid CSS");

        for job_element in document.select(&job_selector).take(self.limit) {
            // Extract title - ElementRef implements Copy, no need for clone
            let title = job_element
                .select(&title_selector)
                .next()
                .or(Some(job_element))
                .map(|el| el.text().collect::<String>().trim().to_string())
                .unwrap_or_default();

            // Extract company
            let company = job_element
                .select(&company_selector)
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string())
                .unwrap_or_else(|| "Unknown Company".to_string());

            // Extract URL
            // Simple 'a' selector is always valid
            let a_selector = Selector::parse("a").expect("'a' is valid CSS");
            let url = job_element
                .value()
                .attr("href")
                .or_else(|| {
                    job_element
                        .select(&a_selector)
                        .next()
                        .and_then(|a| a.value().attr("href"))
                })
                .map(|href| {
                    if href.starts_with("http") {
                        href.to_string()
                    } else {
                        format!("https://www.dice.com{}", href)
                    }
                })
                .unwrap_or_default();

            // Extract location
            let location = job_element
                .select(&location_selector)
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string());

            // Skip invalid entries
            if title.is_empty() || url.is_empty() {
                continue;
            }

            // Determine if remote
            let is_remote = Self::is_remote(&title, location.as_deref());

            let hash = Self::compute_hash(&company, &title, location.as_deref(), &url);

            jobs.push(Job {
                id: 0,
                hash,
                title,
                company,
                url,
                location,
                description: None,
                score: None,
                score_reasons: None,
                source: "dice".to_string(),
                remote: Some(is_remote),
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

    /// Check if job is remote based on title and location
    fn is_remote(title: &str, location: Option<&str>) -> bool {
        let title_lower = title.to_lowercase();
        let loc_lower = location.map(|l| l.to_lowercase()).unwrap_or_default();

        title_lower.contains("remote")
            || loc_lower.contains("remote")
            || loc_lower.contains("work from home")
            || loc_lower.contains("anywhere")
    }

    /// Compute SHA-256 hash for deduplication
    fn compute_hash(company: &str, title: &str, location: Option<&str>, url: &str) -> String {
        calculate_job_hash(company, title, location, url)
    }
}

#[async_trait]
impl JobScraper for DiceScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    fn name(&self) -> &'static str {
        "dice"
    }
}

#[cfg(test)]
mod tests;
