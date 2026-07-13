//! BuiltIn Job Scraper
//!
//! Scrapes tech jobs from BuiltIn's job board.
//! BuiltIn focuses on tech companies and startups.
//!
//! Note: BuiltIn changed their URL structure in late 2025.
//! Old: /city/jobs (e.g., /nyc/jobs) - no longer works
//! New: /jobs with optional /remote filter

use super::error::ScraperError;
use super::http_client::{read_text_with_limit, send_with_retry};
use super::rate_limiter::RateLimiter;
use super::{JobScraper, ScraperResult};
use crate::core::calculate_job_hash;
use crate::core::Job;

use async_trait::async_trait;
use chrono::Utc;
use regex::Regex;
use scraper::{Html, Selector};

/// BuiltIn job scraper
#[derive(Debug, Clone)]
pub struct BuiltInScraper {
    /// Whether to filter for remote jobs only
    pub remote_only: bool,
    /// Maximum results to return
    pub limit: usize,
    /// Rate limiter for respecting BuiltIn's request limits
    pub rate_limiter: RateLimiter,
}

impl BuiltInScraper {
    /// Create a new BuiltIn scraper
    ///
    /// # Arguments
    /// * `remote_only` - If true, only fetch remote jobs from /jobs/remote
    /// * `limit` - Maximum number of jobs to return
    pub fn new(remote_only: bool, limit: usize) -> Self {
        Self {
            remote_only,
            limit,
            rate_limiter: RateLimiter::shared(),
        }
    }

    /// Build the search URL
    fn build_url(&self) -> String {
        if self.remote_only {
            "https://builtin.com/jobs/remote".to_string()
        } else {
            "https://builtin.com/jobs".to_string()
        }
    }

    /// Fetch and parse jobs from BuiltIn
    async fn fetch_jobs(&self) -> ScraperResult {
        let mode = if self.remote_only { "remote" } else { "all" };
        tracing::info!("Fetching jobs from BuiltIn (mode: {})", mode);

        // Use rate limiter (job board, reasonable limit)
        self.rate_limiter.wait("builtin", 300).await;

        let url = self.build_url();

        let response = send_with_retry(&url, |client| {
            client
                .get(&url)
                .header(
                    "User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                )
                .header("Accept", "text/html,application/xhtml+xml")
        })
        .await
        .map_err(|e| ScraperError::from_anyhow("builtin", e))?;

        if !response.status().is_success() {
            return Err(ScraperError::http_status(
                response.status().as_u16(),
                &url,
                format!("BuiltIn request failed: {}", response.status()),
            ));
        }

        let html = read_text_with_limit(response, &url).await?;
        let jobs = self.parse_html(&html)?;

        tracing::info!("Found {} jobs from BuiltIn", jobs.len());
        Ok(jobs)
    }

    /// Parse HTML to extract job listings
    ///
    /// BuiltIn 2025+ structure:
    /// - Job links: a[href*="/job/"]
    /// - Company links: a[href*="/company/"]
    /// - Salary: regex \d+K-\d+K
    #[allow(clippy::expect_used)] // Static CSS selectors are known valid at compile time
    fn parse_html(&self, html: &str) -> Result<Vec<Job>, ScraperError> {
        let document = Html::parse_document(html);
        let mut jobs = Vec::new();
        let mut seen_urls = std::collections::HashSet::new();

        // BuiltIn 2025+ uses semantic HTML with href patterns
        // Job links contain /job/ in the path
        let job_link_selector =
            Selector::parse("a[href*='/job/']").expect("job link selector is valid CSS");

        // Company links contain /company/ in the path
        let company_link_selector =
            Selector::parse("a[href*='/company/']").expect("company link selector is valid CSS");

        // Salary pattern: "179K-246K Annually" or "100K+ Annually"
        let salary_regex = Regex::new(r"(\d+)K[-–](\d+)K").ok();
        let salary_single_regex = Regex::new(r"(\d+)K\+").ok();

        // Job URL pattern: /job/slug/numeric-id (e.g., /job/senior-engineer/8296997)
        // Skip navigation links like /job/search, /job/, etc.
        let job_url_regex = Regex::new(r"/job/[^/]+/\d+").ok();

        // Find all job links
        for job_link in document.select(&job_link_selector) {
            let href = match job_link.value().attr("href") {
                Some(h) => h,
                None => continue,
            };

            // Skip non-job links (e.g., /job/search, /job/)
            // Real job URLs have pattern: /job/slug/numeric-id
            if !href.contains("/job/") || href.ends_with("/job/") {
                continue;
            }

            // Verify URL matches the expected job URL pattern
            if let Some(ref regex) = job_url_regex {
                if !regex.is_match(href) {
                    continue;
                }
            }

            let url = if href.starts_with("http") {
                href.to_string()
            } else {
                format!("https://builtin.com{}", href)
            };

            // Skip duplicates (same job can appear multiple times)
            if seen_urls.contains(&url) {
                continue;
            }
            seen_urls.insert(url.clone());

            // Get title from the link text
            let title = job_link.text().collect::<String>().trim().to_string();
            if title.is_empty() || title.len() < 3 {
                continue;
            }

            // Find the parent container to look for company and other details
            // Try to find nearby company link by getting surrounding HTML
            let mut company = "Unknown Company".to_string();
            let mut location: Option<String> = None;
            let mut salary_min: Option<i64> = None;
            let mut salary_max: Option<i64> = None;

            // Look for company in the same parent context
            // This is a simplified approach - we look for company links near job links
            if let Some(parent) = job_link.parent() {
                if let Some(grandparent) = parent.parent() {
                    // Convert grandparent to element reference for selector
                    if let Some(gp_element) = grandparent.value().as_element() {
                        // Create a mini-document from the parent HTML
                        let parent_html = grandparent
                            .children()
                            .filter_map(|c| scraper::ElementRef::wrap(c).map(|e| e.html()))
                            .collect::<String>();
                        let parent_doc = Html::parse_fragment(&parent_html);

                        // Find company link in parent context
                        for company_link in parent_doc.select(&company_link_selector) {
                            let company_text =
                                company_link.text().collect::<String>().trim().to_string();
                            if !company_text.is_empty() {
                                company = company_text;
                                break;
                            }
                        }

                        // Look for salary in parent text
                        let parent_text = parent_doc.root_element().text().collect::<String>();

                        if let Some(ref regex) = salary_regex {
                            if let Some(caps) = regex.captures(&parent_text) {
                                if let (Some(min), Some(max)) = (caps.get(1), caps.get(2)) {
                                    salary_min = min.as_str().parse::<i64>().ok().map(|v| v * 1000);
                                    salary_max = max.as_str().parse::<i64>().ok().map(|v| v * 1000);
                                }
                            }
                        } else if let Some(ref regex) = salary_single_regex {
                            if let Some(caps) = regex.captures(&parent_text) {
                                if let Some(min) = caps.get(1) {
                                    salary_min = min.as_str().parse::<i64>().ok().map(|v| v * 1000);
                                }
                            }
                        }

                        // Check for remote indicators
                        let lower_text = parent_text.to_lowercase();
                        if lower_text.contains("remote") {
                            location = Some("Remote".to_string());
                        } else if lower_text.contains("hybrid") {
                            location = Some("Hybrid".to_string());
                        }

                        // Suppress unused variable warning
                        let _ = gp_element;
                    }
                }
            }

            // Determine if remote based on URL path or location
            let remote = self.remote_only
                || location
                    .as_ref()
                    .map(|l| l.to_lowercase().contains("remote"))
                    .unwrap_or(false);

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
                source: "builtin".to_string(),
                remote: Some(remote),
                salary_min,
                salary_max,
                currency: if salary_min.is_some() {
                    Some("USD".to_string())
                } else {
                    None
                },
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

            if jobs.len() >= self.limit {
                break;
            }
        }

        Ok(jobs)
    }

    /// Compute SHA-256 hash for deduplication
    fn compute_hash(company: &str, title: &str, location: Option<&str>, url: &str) -> String {
        calculate_job_hash(company, title, location, url)
    }
}

#[async_trait]
impl JobScraper for BuiltInScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    #[cfg(test)]
    fn name(&self) -> &'static str {
        "builtin"
    }
}

#[cfg(test)]
mod tests;
