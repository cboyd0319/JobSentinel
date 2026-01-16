//! Hacker News Who's Hiring Scraper
//!
//! Scrapes jobs from the monthly "Who is hiring?" threads on Hacker News.
//! These threads are posted on the first of each month and contain
//! high-quality tech job postings from the HN community.

use super::http_client::get_client;
use super::{JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use sha2::{Digest, Sha256};

/// Hacker News Who's Hiring scraper
pub struct HnHiringScraper {
    /// Maximum results to return
    pub limit: usize,
    /// Filter for remote jobs only
    pub remote_only: bool,
}

impl HnHiringScraper {
    pub fn new(limit: usize, remote_only: bool) -> Self {
        Self { limit, remote_only }
    }

    /// Fetch the latest "Who is hiring?" thread
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!("Fetching jobs from HN Who's Hiring");

        let client = get_client();

        // First, search for the latest "Who is hiring?" thread
        let search_url =
            "https://hn.algolia.com/api/v1/search?query=who%20is%20hiring&tags=story,ask_hn&hitsPerPage=1";

        let response = client
            .get(search_url)
            .header("User-Agent", "JobSentinel/1.0")
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("HN search failed: {}", response.status()));
        }

        let search_result: serde_json::Value = response.json().await?;

        // Get the thread ID from the search result
        let thread_id = search_result["hits"]
            .get(0)
            .and_then(|h| h["objectID"].as_str())
            .ok_or_else(|| anyhow::anyhow!("Could not find Who is hiring thread"))?;

        // Fetch comments from the thread
        let comments_url = format!(
            "https://hn.algolia.com/api/v1/search?tags=comment,story_{}&hitsPerPage=500",
            thread_id
        );

        let comments_response = client
            .get(&comments_url)
            .header("User-Agent", "JobSentinel/1.0")
            .send()
            .await?;

        if !comments_response.status().is_success() {
            return Err(anyhow::anyhow!(
                "HN comments fetch failed: {}",
                comments_response.status()
            ));
        }

        let comments_result: serde_json::Value = comments_response.json().await?;
        let jobs = self.parse_comments(&comments_result)?;

        tracing::info!("Found {} jobs from HN Who's Hiring", jobs.len());
        Ok(jobs)
    }

    /// Parse comments to extract job postings
    fn parse_comments(&self, data: &serde_json::Value) -> Result<Vec<Job>> {
        let mut jobs = Vec::new();

        let hits = data["hits"]
            .as_array()
            .ok_or_else(|| anyhow::anyhow!("No hits in response"))?;

        for comment in hits.iter().take(self.limit * 2) {
            // Take more than limit since we'll filter
            let comment_text = comment["comment_text"]
                .as_str()
                .unwrap_or("")
                .to_string();

            // Skip if empty or too short
            if comment_text.len() < 50 {
                continue;
            }

            // HN job posts typically start with company name and often include location
            if let Some(job) = self.parse_job_comment(&comment_text, comment) {
                // Apply remote filter if enabled
                if self.remote_only && job.remote != Some(true) {
                    continue;
                }

                jobs.push(job);

                if jobs.len() >= self.limit {
                    break;
                }
            }
        }

        Ok(jobs)
    }

    /// Parse a single job comment
    fn parse_job_comment(&self, text: &str, comment: &serde_json::Value) -> Option<Job> {
        // Clean HTML from comment
        let clean_text = Self::strip_html(text);

        // Extract first line as potential company/title info
        let first_line = clean_text.lines().next().unwrap_or("");

        // Try to extract company name (usually at the start)
        let (company, rest) = Self::extract_company(first_line);

        if company.is_empty() || company.len() < 2 {
            return None;
        }

        // Extract job title (look for common patterns)
        let title = Self::extract_title(&clean_text).unwrap_or_else(|| {
            // Use first part after company as title
            rest.split('|')
                .next()
                .unwrap_or("Software Engineer")
                .trim()
                .to_string()
        });

        // Extract location
        let location = Self::extract_location(&clean_text);

        // Check if remote
        let is_remote = Self::is_remote(&clean_text);

        // Build URL to the HN comment
        let comment_id = comment["objectID"].as_str().unwrap_or("");
        let url = format!("https://news.ycombinator.com/item?id={}", comment_id);

        if url.is_empty() || title.is_empty() {
            return None;
        }

        // Use first ~500 chars as description
        let description = if clean_text.len() > 500 {
            Some(format!("{}...", &clean_text[..500]))
        } else {
            Some(clean_text.clone())
        };

        let hash = Self::compute_hash(&company, &title, location.as_deref(), &url);

        Some(Job {
            id: 0,
            hash,
            title,
            company,
            url,
            location,
            description,
            score: None,
            score_reasons: None,
            source: "hn_hiring".to_string(),
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
        })
    }

    /// Strip HTML tags from text
    fn strip_html(html: &str) -> String {
        let mut result = String::new();
        let mut in_tag = false;

        // Replace common HTML entities and tags
        let processed = html
            .replace("<p>", "\n\n")
            .replace("</p>", "")
            .replace("<br>", "\n")
            .replace("<br/>", "\n")
            .replace("<br />", "\n")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#x27;", "'")
            .replace("&#39;", "'")
            .replace("&nbsp;", " ");

        for ch in processed.chars() {
            match ch {
                '<' => in_tag = true,
                '>' => in_tag = false,
                _ if !in_tag => result.push(ch),
                _ => {}
            }
        }

        // Clean up whitespace
        result
            .lines()
            .map(|l| l.trim())
            .filter(|l| !l.is_empty())
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// Extract company name from first line
    fn extract_company(line: &str) -> (String, String) {
        // Common patterns:
        // "Company Name | Role | Location"
        // "Company Name (YC S20) | Role"
        // "Company Name - Role"

        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 2 {
            let company = parts[0]
                .trim()
                .trim_end_matches(|c: char| c == '(' || c == '-')
                .trim()
                .to_string();
            let rest = parts[1..].join("|");
            return (company, rest);
        }

        let parts: Vec<&str> = line.split(" - ").collect();
        if parts.len() >= 2 {
            return (parts[0].trim().to_string(), parts[1..].join(" - "));
        }

        // Just return the whole line as company
        (line.trim().to_string(), String::new())
    }

    /// Extract job title from text
    fn extract_title(text: &str) -> Option<String> {
        let lower = text.to_lowercase();

        // Look for common title patterns
        let patterns = [
            "software engineer",
            "senior engineer",
            "backend engineer",
            "frontend engineer",
            "full stack",
            "fullstack",
            "data scientist",
            "machine learning",
            "devops",
            "sre",
            "engineering manager",
            "tech lead",
            "cto",
            "vp engineering",
            "product manager",
            "designer",
            "data engineer",
            "platform engineer",
            "infrastructure",
        ];

        for pattern in patterns {
            if let Some(pos) = lower.find(pattern) {
                // Extract the title with surrounding context
                let start = text[..pos].rfind(|c: char| c == '|' || c == '\n').map(|p| p + 1).unwrap_or(0);
                let end = pos + pattern.len();
                let end = text[end..].find(|c: char| c == '|' || c == '\n' || c == ',').map(|p| end + p).unwrap_or(end);

                let title = text[start..end].trim();
                if title.len() > 5 && title.len() < 100 {
                    return Some(title.to_string());
                }
            }
        }

        None
    }

    /// Extract location from text
    fn extract_location(text: &str) -> Option<String> {
        let lower = text.to_lowercase();

        // Check for specific city mentions
        let cities = [
            ("san francisco", "San Francisco, CA"),
            ("sf", "San Francisco, CA"),
            ("new york", "New York, NY"),
            ("nyc", "New York, NY"),
            ("los angeles", "Los Angeles, CA"),
            ("seattle", "Seattle, WA"),
            ("austin", "Austin, TX"),
            ("boston", "Boston, MA"),
            ("denver", "Denver, CO"),
            ("chicago", "Chicago, IL"),
            ("london", "London, UK"),
            ("berlin", "Berlin, Germany"),
            ("toronto", "Toronto, Canada"),
            ("vancouver", "Vancouver, Canada"),
        ];

        for (pattern, location) in cities {
            if lower.contains(pattern) {
                return Some(location.to_string());
            }
        }

        // Check for generic remote
        if lower.contains("remote") {
            if lower.contains("us only") || lower.contains("usa only") {
                return Some("Remote (US)".to_string());
            }
            if lower.contains("europe") || lower.contains("eu only") {
                return Some("Remote (EU)".to_string());
            }
            return Some("Remote".to_string());
        }

        None
    }

    /// Check if job is remote
    fn is_remote(text: &str) -> bool {
        let lower = text.to_lowercase();
        lower.contains("remote")
            || lower.contains("wfh")
            || lower.contains("work from home")
            || lower.contains("distributed")
            || lower.contains("anywhere")
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
impl JobScraper for HnHiringScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    fn name(&self) -> &'static str {
        "hn_hiring"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scraper_name() {
        let scraper = HnHiringScraper::new(10, false);
        assert_eq!(scraper.name(), "hn_hiring");
    }

    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = HnHiringScraper::compute_hash(
            "Startup",
            "Engineer",
            Some("Remote"),
            "https://news.ycombinator.com/item?id=123",
        );
        let hash2 = HnHiringScraper::compute_hash(
            "Startup",
            "Engineer",
            Some("Remote"),
            "https://news.ycombinator.com/item?id=123",
        );

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_extract_company() {
        let (company, rest) = HnHiringScraper::extract_company("Acme Inc | Senior Engineer | Remote");
        assert_eq!(company, "Acme Inc");
        assert!(rest.contains("Senior Engineer"));

        let (company2, _) = HnHiringScraper::extract_company("StartupCo (YC S21) | Backend");
        assert_eq!(company2, "StartupCo (YC S21)");
    }

    #[test]
    fn test_is_remote() {
        assert!(HnHiringScraper::is_remote("Remote position available"));
        assert!(HnHiringScraper::is_remote("WFH friendly"));
        assert!(HnHiringScraper::is_remote("Work from anywhere"));
        assert!(!HnHiringScraper::is_remote("In office only"));
    }

    #[test]
    fn test_extract_location() {
        assert_eq!(
            HnHiringScraper::extract_location("Based in San Francisco"),
            Some("San Francisco, CA".to_string())
        );
        assert_eq!(
            HnHiringScraper::extract_location("Remote US only"),
            Some("Remote (US)".to_string())
        );
        assert_eq!(
            HnHiringScraper::extract_location("Fully remote"),
            Some("Remote".to_string())
        );
    }

    #[test]
    fn test_strip_html() {
        let html = "<p>Hello <b>World</b></p><br>New line";
        let clean = HnHiringScraper::strip_html(html);
        assert!(clean.contains("Hello"));
        assert!(clean.contains("World"));
        assert!(!clean.contains("<"));
    }
}
