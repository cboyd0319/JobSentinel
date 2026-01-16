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
                .trim_end_matches(['(', '-'])
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
                let start = text[..pos].rfind(['|', '\n']).map(|p| p + 1).unwrap_or(0);
                let end = pos + pattern.len();
                let end = text[end..].find(['|', '\n', ',']).map(|p| end + p).unwrap_or(end);

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
    fn test_compute_hash_different_inputs() {
        let hash1 = HnHiringScraper::compute_hash(
            "Company A",
            "Engineer",
            Some("Remote"),
            "https://news.ycombinator.com/item?id=123",
        );
        let hash2 = HnHiringScraper::compute_hash(
            "Company B",
            "Engineer",
            Some("Remote"),
            "https://news.ycombinator.com/item?id=123",
        );

        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_compute_hash_without_location() {
        let hash = HnHiringScraper::compute_hash(
            "Startup",
            "Engineer",
            None,
            "https://news.ycombinator.com/item?id=456",
        );

        assert_eq!(hash.len(), 64);
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
    fn test_extract_company_with_dash_separator() {
        let (company, rest) = HnHiringScraper::extract_company("TechCorp - Senior Backend Developer");
        assert_eq!(company, "TechCorp");
        assert_eq!(rest, "Senior Backend Developer");
    }

    #[test]
    fn test_extract_company_no_separator() {
        let (company, rest) = HnHiringScraper::extract_company("SoloCorp Hiring Engineers");
        assert_eq!(company, "SoloCorp Hiring Engineers");
        assert_eq!(rest, "");
    }

    #[test]
    fn test_is_remote() {
        assert!(HnHiringScraper::is_remote("Remote position available"));
        assert!(HnHiringScraper::is_remote("WFH friendly"));
        assert!(HnHiringScraper::is_remote("Work from anywhere"));
        assert!(!HnHiringScraper::is_remote("In office only"));
    }

    #[test]
    fn test_is_remote_distributed() {
        assert!(HnHiringScraper::is_remote("Distributed team, work anywhere"));
    }

    #[test]
    fn test_is_remote_case_insensitive() {
        assert!(HnHiringScraper::is_remote("REMOTE position"));
        assert!(HnHiringScraper::is_remote("Anywhere in the world"));
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
    fn test_extract_location_multiple_cities() {
        assert_eq!(
            HnHiringScraper::extract_location("Looking for engineers in NYC"),
            Some("New York, NY".to_string())
        );
        assert_eq!(
            HnHiringScraper::extract_location("Based in Seattle, WA"),
            Some("Seattle, WA".to_string())
        );
        assert_eq!(
            HnHiringScraper::extract_location("London office"),
            Some("London, UK".to_string())
        );
    }

    #[test]
    fn test_extract_location_remote_eu() {
        assert_eq!(
            HnHiringScraper::extract_location("Remote, EU only"),
            Some("Remote (EU)".to_string())
        );
        assert_eq!(
            HnHiringScraper::extract_location("Remote (Europe)"),
            Some("Remote (EU)".to_string())
        );
    }

    #[test]
    fn test_extract_location_no_match() {
        assert_eq!(HnHiringScraper::extract_location("Onsite position"), None);
    }

    #[test]
    fn test_strip_html() {
        let html = "<p>Hello <b>World</b></p><br>New line";
        let clean = HnHiringScraper::strip_html(html);
        assert!(clean.contains("Hello"));
        assert!(clean.contains("World"));
        assert!(!clean.contains("<"));
    }

    #[test]
    fn test_strip_html_entities() {
        let html = "We&amp;#x27;re hiring &lt;engineers&gt; &quot;now&quot;";
        let clean = HnHiringScraper::strip_html(html);
        assert!(clean.contains("We're hiring") || clean.contains("We&#x27;re hiring"));
        // Note: &lt; and &gt; are replaced with < and >, then stripped as tags
        assert!(clean.contains("\"now\""));
    }

    #[test]
    fn test_strip_html_paragraph_breaks() {
        let html = "<p>First paragraph</p><p>Second paragraph</p>";
        let clean = HnHiringScraper::strip_html(html);
        assert!(clean.contains("First paragraph"));
        assert!(clean.contains("Second paragraph"));
        assert!(!clean.contains("<p>"));
    }

    #[test]
    fn test_strip_html_empty_string() {
        let clean = HnHiringScraper::strip_html("");
        assert_eq!(clean, "");
    }

    #[test]
    fn test_extract_title_common_patterns() {
        // The function extracts from the beginning of the line to the end of the pattern
        let title1 = HnHiringScraper::extract_title("Looking for a Senior Software Engineer to join our team");
        assert!(title1.is_some());
        assert!(title1.as_ref().unwrap().contains("Software Engineer"));

        let title2 = HnHiringScraper::extract_title("We need a Backend Engineer with Rust experience");
        assert!(title2.is_some());
        assert!(title2.as_ref().unwrap().contains("Backend Engineer"));
    }

    #[test]
    fn test_extract_title_fullstack() {
        let text = "Hiring Full Stack developers";
        let title = HnHiringScraper::extract_title(text);
        assert!(title.is_some());
        assert!(title.as_ref().unwrap().contains("Full Stack"));
    }

    #[test]
    fn test_extract_title_machine_learning() {
        let text = "Machine Learning engineer wanted";
        assert_eq!(
            HnHiringScraper::extract_title(text),
            Some("Machine Learning".to_string())
        );
    }

    #[test]
    fn test_extract_title_no_match() {
        assert_eq!(HnHiringScraper::extract_title("Join our team!"), None);
    }

    #[test]
    fn test_parse_comments_with_realistic_json() {
        let scraper = HnHiringScraper::new(10, false);
        let json_data = serde_json::json!({
            "hits": [
                {
                    "objectID": "12345",
                    "comment_text": "Acme Corp (YC S21) | Senior Backend Engineer | Remote | Full-time\n\nWe're building the future of AI. Looking for experienced engineers to join our team. Must have 5+ years experience with Rust or Go. Remote work available anywhere in the US.\n\nApply at: https://acmecorp.com/jobs"
                },
                {
                    "objectID": "67890",
                    "comment_text": "TechStartup | Full Stack Engineer | San Francisco | $150k-$200k\n\nJoin our small team working on cutting-edge web tech. We use React, Node.js, and PostgreSQL."
                }
            ]
        });

        let jobs = scraper.parse_comments(&json_data).expect("parse_comments should succeed");

        assert_eq!(jobs.len(), 2);
        assert_eq!(jobs[0].company, "Acme Corp (YC S21)");
        assert_eq!(jobs[0].remote, Some(true));
        assert_eq!(jobs[0].source, "hn_hiring");
        assert!(jobs[0].url.contains("12345"));
    }

    #[test]
    fn test_parse_comments_respects_limit() {
        let scraper = HnHiringScraper::new(2, false);
        let json_data = serde_json::json!({
            "hits": [
                {
                    "objectID": "1",
                    "comment_text": "Company A | Senior Engineer | Remote\n\nWe're hiring experienced engineers with deep knowledge of distributed systems."
                },
                {
                    "objectID": "2",
                    "comment_text": "Company B | Backend Developer | San Francisco\n\nLooking for backend developers with Python experience."
                },
                {
                    "objectID": "3",
                    "comment_text": "Company C | Frontend Developer | New York\n\nSeeking frontend developers who know React."
                }
            ]
        });

        let jobs = scraper.parse_comments(&json_data).expect("parse_comments should succeed");

        assert_eq!(jobs.len(), 2);
    }

    #[test]
    fn test_parse_comments_filters_remote_only() {
        let scraper = HnHiringScraper::new(10, true);
        let json_data = serde_json::json!({
            "hits": [
                {
                    "objectID": "1",
                    "comment_text": "RemoteCo | Senior Engineer | Remote\n\nFully remote position available for experienced engineers."
                },
                {
                    "objectID": "2",
                    "comment_text": "OnSiteCo | Backend Developer | San Francisco\n\nOnsite only position in downtown SF."
                },
                {
                    "objectID": "3",
                    "comment_text": "HybridCo | Frontend Developer | WFH\n\nWork from home position available."
                }
            ]
        });

        let jobs = scraper.parse_comments(&json_data).expect("parse_comments should succeed");

        assert_eq!(jobs.len(), 2); // Only remote jobs
        assert!(jobs.iter().all(|j| j.remote == Some(true)));
    }

    #[test]
    fn test_parse_comments_skips_short_comments() {
        let scraper = HnHiringScraper::new(10, false);
        let json_data = serde_json::json!({
            "hits": [
                {
                    "objectID": "1",
                    "comment_text": "Too short"
                },
                {
                    "objectID": "2",
                    "comment_text": "ValidCorp | Senior Engineer | Remote\n\nThis is a longer comment with sufficient detail about the job posting."
                }
            ]
        });

        let jobs = scraper.parse_comments(&json_data).expect("parse_comments should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].company, "ValidCorp");
    }

    #[test]
    fn test_parse_comments_empty_hits() {
        let scraper = HnHiringScraper::new(10, false);
        let json_data = serde_json::json!({
            "hits": []
        });

        let jobs = scraper.parse_comments(&json_data).expect("parse_comments should succeed");

        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_comments_truncates_long_description() {
        let scraper = HnHiringScraper::new(10, false);
        let long_text = format!(
            "BigCorp | Engineer | Remote\n\n{}",
            "A".repeat(600)
        );
        let json_data = serde_json::json!({
            "hits": [
                {
                    "objectID": "1",
                    "comment_text": long_text
                }
            ]
        });

        let jobs = scraper.parse_comments(&json_data).expect("parse_comments should succeed");

        assert_eq!(jobs.len(), 1);
        let description = jobs[0].description.as_ref().unwrap();
        assert!(description.len() <= 503); // 500 + "..."
        assert!(description.ends_with("..."));
    }
}
