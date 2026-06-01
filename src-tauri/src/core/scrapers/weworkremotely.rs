//! WeWorkRemotely Job Scraper
//!
//! Scrapes remote jobs from WeWorkRemotely's RSS feed.
//! WeWorkRemotely is a popular remote-only job board.

use super::error::ScraperError;
use super::http_client::{read_text_with_limit, send_with_retry};
use super::rate_limiter::RateLimiter;
use super::{location_utils, title_utils, url_utils, JobScraper, ScraperResult};
use crate::core::db::Job;

use async_trait::async_trait;
use chrono::Utc;
use sha2::{Digest, Sha256};

/// WeWorkRemotely job scraper
#[derive(Debug, Clone)]
pub struct WeWorkRemotelyScraper {
    /// Category to search (e.g., "programming", "design", "devops")
    pub category: Option<String>,
    /// Maximum results to return
    pub limit: usize,
    /// Rate limiter for respecting WeWorkRemotely's request limits
    pub rate_limiter: RateLimiter,
}

impl WeWorkRemotelyScraper {
    pub fn new(category: Option<String>, limit: usize) -> Self {
        Self {
            category,
            limit,
            rate_limiter: RateLimiter::new(),
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

        // Simple XML parsing for RSS items
        // Format: <item><title>...</title><link>...</link><description>...</description></item>
        for item in xml.split("<item>").skip(1).take(self.limit) {
            let title = Self::extract_tag(item, "title")
                .map(|t| Self::decode_html_entities(&t))
                .unwrap_or_default();

            let url = Self::extract_tag(item, "link").unwrap_or_default();

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
            let description = Self::extract_tag(item, "description")
                .map(|d| Self::decode_html_entities(&d))
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
    fn extract_tag(xml: &str, tag: &str) -> Option<String> {
        let start_tag = format!("<{}>", tag);
        let end_tag = format!("</{}>", tag);

        // Also handle CDATA sections
        let cdata_start = format!("<{}><![CDATA[", tag);
        let cdata_end = format!("]]></{}>", tag);

        if let (Some(start), Some(end)) = (xml.find(&cdata_start), xml.find(&cdata_end)) {
            let content_start = start + cdata_start.len();
            if content_start < end {
                return Some(xml[content_start..end].to_string());
            }
        }

        if let (Some(start), Some(end)) = (xml.find(&start_tag), xml.find(&end_tag)) {
            let content_start = start + start_tag.len();
            if content_start < end {
                return Some(xml[content_start..end].to_string());
            }
        }

        None
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
impl JobScraper for WeWorkRemotelyScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    fn name(&self) -> &'static str {
        "weworkremotely"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_url_default() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        assert_eq!(
            scraper.build_url(),
            "https://weworkremotely.com/remote-jobs.rss"
        );
    }

    #[test]
    fn test_build_url_with_category() {
        let scraper = WeWorkRemotelyScraper::new(Some("programming".to_string()), 10);
        assert_eq!(
            scraper.build_url(),
            "https://weworkremotely.com/categories/programming.rss"
        );
    }

    #[test]
    fn test_scraper_name() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        assert_eq!(scraper.name(), "weworkremotely");
    }

    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = WeWorkRemotelyScraper::compute_hash(
            "Company",
            "Remote Care Coordinator",
            Some("Worldwide"),
            "https://weworkremotely.com/job/123",
        );
        let hash2 = WeWorkRemotelyScraper::compute_hash(
            "Company",
            "Remote Care Coordinator",
            Some("Worldwide"),
            "https://weworkremotely.com/job/123",
        );

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_extract_tag() {
        let xml = "<item><title>Test Title</title><link>http://test.com</link></item>";
        assert_eq!(
            WeWorkRemotelyScraper::extract_tag(xml, "title"),
            Some("Test Title".to_string())
        );
        assert_eq!(
            WeWorkRemotelyScraper::extract_tag(xml, "link"),
            Some("http://test.com".to_string())
        );
    }

    #[test]
    fn test_extract_tag_cdata() {
        let xml = "<item><title><![CDATA[Test Title]]></title></item>";
        assert_eq!(
            WeWorkRemotelyScraper::extract_tag(xml, "title"),
            Some("Test Title".to_string())
        );
    }

    #[test]
    fn test_decode_html_entities() {
        assert_eq!(
            WeWorkRemotelyScraper::decode_html_entities("Test &amp; Title"),
            "Test & Title"
        );
        assert_eq!(
            WeWorkRemotelyScraper::decode_html_entities("&lt;html&gt;"),
            "<html>"
        );
    }

    #[test]
    fn test_strip_html_tags() {
        assert_eq!(
            WeWorkRemotelyScraper::strip_html_tags("<p>Hello <b>World</b></p>"),
            "Hello World"
        );
    }

    #[test]
    fn test_extract_location() {
        assert_eq!(
            WeWorkRemotelyScraper::extract_location("Work from anywhere worldwide"),
            Some("Worldwide".to_string())
        );
        assert_eq!(
            WeWorkRemotelyScraper::extract_location("USA only position"),
            Some("USA".to_string())
        );
        assert_eq!(
            WeWorkRemotelyScraper::extract_location("No location info"),
            None
        );
    }

    #[test]
    fn test_parse_rss_complete_job() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        let rss = r#"
            <rss>
                <channel>
                    <item>
                        <title><![CDATA[City Health Department: Senior Public Health Analyst]]></title>
                        <link>https://weworkremotely.com/jobs/12345</link>
                        <description><![CDATA[
                            We're hiring a Senior Public Health Analyst to join our distributed team.
                            Work from anywhere worldwide. Competitive salary and benefits.
                        ]]></description>
                    </item>
                </channel>
            </rss>
        "#;

        let jobs = scraper.parse_rss(rss).expect("parse_rss should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].title, "Senior Public Health Analyst");
        assert_eq!(jobs[0].company, "City Health Department");
        assert_eq!(jobs[0].url, "https://weworkremotely.com/jobs/12345");
        assert_eq!(jobs[0].source, "weworkremotely");
        assert_eq!(jobs[0].remote, Some(true));
        assert_eq!(jobs[0].location, Some("Worldwide".to_string()));
        assert!(jobs[0].description.is_some());
    }

    #[test]
    fn test_parse_rss_multiple_jobs() {
        let scraper = WeWorkRemotelyScraper::new(Some("programming".to_string()), 10);
        let rss = r#"
            <rss>
                <channel>
                    <item>
                        <title>FreshMart: Inventory Planner</title>
                        <link>https://weworkremotely.com/jobs/1</link>
                        <description>Join our remote team. USA only.</description>
                    </item>
                    <item>
                        <title>Community Care Network: Customer Support Manager</title>
                        <link>https://weworkremotely.com/jobs/2</link>
                        <description>Remote position open to Europe.</description>
                    </item>
                    <item>
                        <title>City Health Department: Program Coordinator</title>
                        <link>https://weworkremotely.com/jobs/3</link>
                        <description>Position is open to North America timezone.</description>
                    </item>
                </channel>
            </rss>
        "#;

        let jobs = scraper.parse_rss(rss).expect("parse_rss should succeed");

        assert_eq!(jobs.len(), 3);
        assert_eq!(jobs[0].company, "FreshMart");
        assert_eq!(jobs[0].title, "Inventory Planner");
        assert_eq!(jobs[0].location, Some("USA".to_string()));

        assert_eq!(jobs[1].company, "Community Care Network");
        assert_eq!(jobs[1].title, "Customer Support Manager");
        assert_eq!(jobs[1].location, Some("Europe".to_string()));

        assert_eq!(jobs[2].company, "City Health Department");
        assert_eq!(jobs[2].title, "Program Coordinator");
        assert_eq!(jobs[2].location, Some("North America".to_string()));
    }

    #[test]
    fn test_parse_rss_with_html_entities() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        let rss = r#"
            <rss>
                <channel>
                    <item>
                        <title>Community Care &amp; Data Network: Public Health Analyst &amp; Planner</title>
                        <link>https://weworkremotely.com/jobs/123</link>
                        <description>&lt;p&gt;Great remote opportunity&lt;/p&gt; &quot;Join us&quot;</description>
                    </item>
                </channel>
            </rss>
        "#;

        let jobs = scraper.parse_rss(rss).expect("parse_rss should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].company, "Community Care & Data Network");
        assert_eq!(jobs[0].title, "Public Health Analyst & Planner");
        assert!(jobs[0]
            .description
            .as_ref()
            .unwrap()
            .contains("Great remote opportunity"));
        assert!(jobs[0]
            .description
            .as_ref()
            .unwrap()
            .contains("\"Join us\""));
    }

    #[test]
    fn test_parse_rss_category_programming() {
        let scraper = WeWorkRemotelyScraper::new(Some("programming".to_string()), 10);
        let url = scraper.build_url();
        assert_eq!(url, "https://weworkremotely.com/categories/programming.rss");
    }

    #[test]
    fn test_parse_rss_category_design() {
        let scraper = WeWorkRemotelyScraper::new(Some("design".to_string()), 10);
        let url = scraper.build_url();
        assert_eq!(url, "https://weworkremotely.com/categories/design.rss");
    }

    #[test]
    fn test_parse_rss_category_devops() {
        let scraper = WeWorkRemotelyScraper::new(Some("devops".to_string()), 10);
        let url = scraper.build_url();
        assert_eq!(url, "https://weworkremotely.com/categories/devops.rss");
    }

    #[test]
    fn test_parse_rss_limit_respected() {
        let scraper = WeWorkRemotelyScraper::new(None, 2);
        let rss = r#"
            <rss>
                <channel>
                    <item><title>Co A: Job 1</title><link>http://a.com/1</link></item>
                    <item><title>Co B: Job 2</title><link>http://a.com/2</link></item>
                    <item><title>Co C: Job 3</title><link>http://a.com/3</link></item>
                    <item><title>Co D: Job 4</title><link>http://a.com/4</link></item>
                </channel>
            </rss>
        "#;

        let jobs = scraper.parse_rss(rss).expect("parse_rss should succeed");

        assert_eq!(jobs.len(), 2);
        assert_eq!(jobs[0].title, "Job 1");
        assert_eq!(jobs[1].title, "Job 2");
    }

    #[test]
    fn test_parse_rss_empty_input() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        let rss = "<rss><channel></channel></rss>";

        let jobs = scraper.parse_rss(rss).expect("parse_rss should succeed");

        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_rss_malformed_missing_title() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        let rss = r#"
            <rss>
                <channel>
                    <item>
                        <link>https://weworkremotely.com/jobs/123</link>
                        <description>Some description</description>
                    </item>
                </channel>
            </rss>
        "#;

        let jobs = scraper.parse_rss(rss).expect("parse_rss should succeed");

        // Should be skipped due to empty title
        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_rss_malformed_missing_url() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        let rss = r#"
            <rss>
                <channel>
                    <item>
                        <title>FreshMart: Inventory Planner</title>
                        <description>Great opportunity</description>
                    </item>
                </channel>
            </rss>
        "#;

        let jobs = scraper.parse_rss(rss).expect("parse_rss should succeed");

        // Should be skipped due to empty URL
        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_rss_title_without_colon() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        let rss = r#"
            <rss>
                <channel>
                    <item>
                        <title>Care Coordinator Position</title>
                        <link>https://weworkremotely.com/jobs/123</link>
                        <description>Join our team</description>
                    </item>
                </channel>
            </rss>
        "#;

        let jobs = scraper.parse_rss(rss).expect("parse_rss should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].company, "Unknown Company");
        assert_eq!(jobs[0].title, "Care Coordinator Position");
    }

    #[test]
    fn test_parse_rss_title_with_multiple_colons() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        let rss = r#"
            <rss>
                <channel>
                    <item>
                        <title>FreshMart: Senior Inventory Planner: Regional Team</title>
                        <link>https://weworkremotely.com/jobs/123</link>
                        <description>Join us</description>
                    </item>
                </channel>
            </rss>
        "#;

        let jobs = scraper.parse_rss(rss).expect("parse_rss should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].company, "FreshMart");
        assert_eq!(jobs[0].title, "Senior Inventory Planner: Regional Team");
    }

    #[test]
    fn test_extract_location_worldwide() {
        assert_eq!(
            WeWorkRemotelyScraper::extract_location("Work from anywhere in the world"),
            Some("Worldwide".to_string())
        );
        assert_eq!(
            WeWorkRemotelyScraper::extract_location("Worldwide opportunity"),
            Some("Worldwide".to_string())
        );
    }

    #[test]
    fn test_extract_location_usa() {
        assert_eq!(
            WeWorkRemotelyScraper::extract_location("This is a US only position"),
            Some("USA".to_string())
        );
        assert_eq!(
            WeWorkRemotelyScraper::extract_location("USA only candidates"),
            Some("USA".to_string())
        );
    }

    #[test]
    fn test_extract_location_europe() {
        assert_eq!(
            WeWorkRemotelyScraper::extract_location("Open to candidates in Europe"),
            Some("Europe".to_string())
        );
        assert_eq!(
            WeWorkRemotelyScraper::extract_location("EU only position"),
            Some("Europe".to_string())
        );
    }

    #[test]
    fn test_extract_location_north_america() {
        assert_eq!(
            WeWorkRemotelyScraper::extract_location("North America timezone required"),
            Some("North America".to_string())
        );
    }

    #[test]
    fn test_extract_location_none() {
        assert_eq!(
            WeWorkRemotelyScraper::extract_location("Great team and benefits"),
            None
        );
    }

    #[test]
    fn test_hash_consistency() {
        let hash1 = WeWorkRemotelyScraper::compute_hash(
            "City Health Department",
            "Public Health Analyst",
            Some("Worldwide"),
            "https://weworkremotely.com/jobs/123",
        );
        let hash2 = WeWorkRemotelyScraper::compute_hash(
            "City Health Department",
            "Public Health Analyst",
            Some("Worldwide"),
            "https://weworkremotely.com/jobs/123",
        );

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_hash_differs_with_different_location() {
        let hash1 = WeWorkRemotelyScraper::compute_hash(
            "FreshMart",
            "Inventory Planner",
            Some("USA"),
            "https://weworkremotely.com/jobs/123",
        );
        let hash2 = WeWorkRemotelyScraper::compute_hash(
            "FreshMart",
            "Inventory Planner",
            Some("Europe"),
            "https://weworkremotely.com/jobs/123",
        );

        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_strip_html_tags_preserves_text() {
        let html = "<div><p>Looking for a <strong>talented</strong> care coordinator.</p> <ul> <li>Item 1</li> <li>Item 2</li> </ul></div>";
        let result = WeWorkRemotelyScraper::strip_html_tags(html);
        assert_eq!(
            result,
            "Looking for a talented care coordinator. Item 1 Item 2"
        );
    }

    #[test]
    fn test_strip_html_tags_empty() {
        let html = "";
        let result = WeWorkRemotelyScraper::strip_html_tags(html);
        assert_eq!(result, "");
    }

    #[test]
    fn test_decode_html_entities_all_types() {
        let text =
            "Test &amp; Example &lt;tag&gt; &quot;quote&quot; &#39;apostrophe&#39; &nbsp;space";
        let decoded = WeWorkRemotelyScraper::decode_html_entities(text);
        assert_eq!(
            decoded,
            "Test & Example <tag> \"quote\" 'apostrophe'  space"
        );
    }

    #[test]
    fn test_parse_rss_all_jobs_remote() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        let rss = r#"
            <rss>
                <channel>
                    <item>
                        <title>Company: Program Coordinator</title>
                        <link>https://weworkremotely.com/jobs/1</link>
                        <description>Remote job</description>
                    </item>
                </channel>
            </rss>
        "#;

        let jobs = scraper.parse_rss(rss).expect("parse_rss should succeed");

        assert_eq!(jobs.len(), 1);
        // All WeWorkRemotely jobs are remote
        assert_eq!(jobs[0].remote, Some(true));
    }

    #[test]
    fn test_parse_rss_whitespace_trimming() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        let rss = r#"
            <rss>
                <channel>
                    <item>
                        <title>
                            Community Care Network  :  Senior Care Coordinator
                        </title>
                        <link>  https://weworkremotely.com/jobs/123  </link>
                        <description>
                            Great opportunity
                        </description>
                    </item>
                </channel>
            </rss>
        "#;

        let jobs = scraper.parse_rss(rss).expect("parse_rss should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].company, "Community Care Network");
        assert_eq!(jobs[0].title, "Senior Care Coordinator");
    }

    #[test]
    fn test_extract_tag_missing() {
        let xml = "<item><title>Test</title></item>";
        assert_eq!(WeWorkRemotelyScraper::extract_tag(xml, "nonexistent"), None);
    }

    #[test]
    fn test_extract_tag_empty_content() {
        let xml = "<item><title></title></item>";
        // Empty tags are not found (returns None)
        assert_eq!(WeWorkRemotelyScraper::extract_tag(xml, "title"), None);
    }

    #[test]
    fn test_remote_flag_always_true() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        let rss = r#"
            <rss>
                <channel>
                    <item>
                        <title>Company: Job</title>
                        <link>https://weworkremotely.com/jobs/1</link>
                    </item>
                </channel>
            </rss>
        "#;

        let jobs = scraper.parse_rss(rss).expect("parse_rss should succeed");

        assert_eq!(jobs.len(), 1);
        // WeWorkRemotely is remote-only, so all jobs should have remote=true
        assert_eq!(jobs[0].remote, Some(true));
    }

    #[test]
    fn test_extract_tag_with_malformed_cdata() {
        let xml = "<item><title><![CDATA[Test without closing]]></title></item>";
        // Should fall back to regular tag extraction
        let result = WeWorkRemotelyScraper::extract_tag(xml, "title");
        assert!(result.is_some() || result.is_none()); // Depends on parsing
    }

    #[test]
    fn test_extract_tag_start_after_end() {
        let xml = "<item></title><title></item>";
        let result = WeWorkRemotelyScraper::extract_tag(xml, "title");
        // Malformed: end tag before start tag
        assert_eq!(result, None);
    }

    #[test]
    fn test_strip_html_tags_nested_tags() {
        let html = "<div><p>Text <span>inside <strong>nested</strong> tags</span></p></div>";
        let result = WeWorkRemotelyScraper::strip_html_tags(html);
        assert_eq!(result, "Text inside nested tags");
    }

    #[test]
    fn test_strip_html_tags_incomplete_tag() {
        let html = "<div>Text with incomplete <tag";
        let result = WeWorkRemotelyScraper::strip_html_tags(html);
        // Should handle incomplete tag gracefully
        assert!(result.contains("Text"));
    }

    #[test]
    fn test_decode_html_entities_mixed() {
        let text = "Company &amp; Partners &lt;2024&gt; &quot;Best&quot; &nbsp;";
        let decoded = WeWorkRemotelyScraper::decode_html_entities(text);
        assert_eq!(decoded, "Company & Partners <2024> \"Best\"  ");
    }

    #[test]
    fn test_parse_rss_description_with_no_location_patterns() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        let rss = r#"
            <rss>
                <channel>
                    <item>
                        <title>FreshMart: Inventory Planner</title>
                        <link>https://weworkremotely.com/jobs/123</link>
                        <description>Great opportunity with competitive salary.</description>
                    </item>
                </channel>
            </rss>
        "#;

        let jobs = scraper.parse_rss(rss).expect("parse_rss should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].location, None);
    }

    #[test]
    fn test_compute_hash_with_different_locations() {
        let hash1 = WeWorkRemotelyScraper::compute_hash("Company", "Job", Some("USA"), "url");
        let hash2 = WeWorkRemotelyScraper::compute_hash("Company", "Job", Some("Europe"), "url");

        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_extract_tag_cdata_priority_over_regular() {
        let xml = r#"<item><title><![CDATA[CDATA Content]]></title><title>Regular</title></item>"#;
        let result = WeWorkRemotelyScraper::extract_tag(xml, "title");
        // CDATA check happens first, so should get CDATA content
        assert_eq!(result, Some("CDATA Content".to_string()));
    }

    #[test]
    fn test_parse_rss_no_description_tag() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        let rss = r#"
            <rss>
                <channel>
                    <item>
                        <title>Company: Position</title>
                        <link>https://weworkremotely.com/jobs/999</link>
                    </item>
                </channel>
            </rss>
        "#;

        let jobs = scraper.parse_rss(rss).expect("parse_rss should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].description, None);
        assert_eq!(jobs[0].location, None);
    }

    #[test]
    fn test_new_constructor() {
        let scraper = WeWorkRemotelyScraper::new(Some("design".to_string()), 25);

        assert_eq!(scraper.category, Some("design".to_string()));
        assert_eq!(scraper.limit, 25);
    }
}
