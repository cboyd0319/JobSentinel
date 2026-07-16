use super::*;

#[path = "tests/filter_and_payload_tests.rs"]
mod filter_and_payload_tests;

// ---------------------------------------------------------------------------
// Helpers for building test fixtures
// ---------------------------------------------------------------------------

#[cfg(test)]
mod test_helpers {
    /// Wrap an Inertia JSON payload in minimal HTML that the scraper expects.
    ///
    /// The JSON is embedded as a double-quoted HTML attribute value.
    /// html5ever decodes `&quot;` → `"` during parsing, so we encode
    /// double-quotes before embedding so the HTML stays well-formed.
    pub(super) fn inertia_html(payload_json: &str) -> String {
        let encoded = payload_json.replace('&', "&amp;").replace('"', "&quot;");
        format!(
            r#"<!DOCTYPE html>
<html>
<head><title>YC Jobs</title></head>
<body>
<div id="app" data-page="{encoded}"></div>
</body>
</html>"#
        )
    }

    /// Build a minimal Inertia payload JSON string with the given companies.
    ///
    /// `companies` is a list of `(company_name, Vec<(title, url_path, location)>)`.
    pub(super) fn build_payload(companies: &[(&str, Vec<(&str, &str, Option<&str>)>)]) -> String {
        let companies_json: Vec<String> = companies
            .iter()
            .map(|(name, postings)| {
                let postings_json: Vec<String> = postings
                    .iter()
                    .map(|(title, url, location)| {
                        let loc = match location {
                            Some(l) => format!(r#""{}""#, l),
                            None => "null".to_string(),
                        };
                        format!(
                            r#"{{"title":"{title}","url":"{url}","location":{loc},"type":"Full Time","role":"eng","salaryRange":null}}"#
                        )
                    })
                    .collect();
                format!(
                    r#"{{"company":{{"name":"{name}"}},"jobPostings":[{}]}}"#,
                    postings_json.join(",")
                )
            })
            .collect();

        format!(
            r#"{{"component":"Jobs","props":{{"companiesWithJobs":[{}]}},"url":"/jobs","version":"1"}}"#,
            companies_json.join(",")
        )
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::test_helpers::{build_payload, inertia_html};
    use super::*;

    // -- URL building (unchanged behaviour) -----------------------------------

    #[test]
    fn test_build_url_basic() {
        let scraper = YcStartupScraper::new(None, false, 20);
        assert_eq!(scraper.build_url(), "https://www.ycombinator.com/jobs");
    }

    #[test]
    fn test_build_url_with_query() {
        let scraper = YcStartupScraper::new(Some("rust".to_string()), false, 10);
        assert!(scraper.build_url().contains("query=rust"));
    }

    #[test]
    fn test_build_url_remote_only() {
        let scraper = YcStartupScraper::new(None, true, 10);
        assert!(scraper.build_url().contains("remote=true"));
    }

    #[test]
    fn test_build_url_all_params() {
        let scraper = YcStartupScraper::new(Some("engineer".to_string()), true, 10);
        let url = scraper.build_url();
        assert!(url.contains("query=engineer"));
        assert!(url.contains("remote=true"));
    }

    #[test]
    fn test_build_url_special_characters() {
        let scraper = YcStartupScraper::new(Some("full stack".to_string()), false, 10);
        assert!(scraper.build_url().contains("query=full%20stack"));
    }

    // -- Metadata -------------------------------------------------------------

    #[test]
    fn test_scraper_name() {
        let scraper = YcStartupScraper::new(None, false, 10);
        assert_eq!(scraper.name(), "yc_startup");
    }

    #[test]
    fn test_new_constructor() {
        let scraper = YcStartupScraper::new(Some("rust".to_string()), true, 50);
        assert_eq!(scraper.query, Some("rust".to_string()));
        assert!(scraper.remote_only);
        assert_eq!(scraper.limit, 50);
    }

    // -- Hash -----------------------------------------------------------------

    #[test]
    fn test_compute_hash_deterministic() {
        let h1 = YcStartupScraper::compute_hash(
            "Startup Inc",
            "Founding Engineer",
            Some("San Francisco"),
            "https://ycombinator.com/companies/startup/jobs/123",
        );
        let h2 = YcStartupScraper::compute_hash(
            "Startup Inc",
            "Founding Engineer",
            Some("San Francisco"),
            "https://ycombinator.com/companies/startup/jobs/123",
        );
        assert_eq!(h1, h2);
        assert_eq!(h1.len(), 64);
    }

    #[test]
    fn test_compute_hash_different_inputs() {
        let h1 = YcStartupScraper::compute_hash(
            "Startup A",
            "Engineer",
            Some("Remote"),
            "https://ycombinator.com/jobs/1",
        );
        let h2 = YcStartupScraper::compute_hash(
            "Startup B",
            "Engineer",
            Some("Remote"),
            "https://ycombinator.com/jobs/1",
        );
        assert_ne!(h1, h2);
    }

    #[test]
    fn test_compute_hash_without_location() {
        let hash = YcStartupScraper::compute_hash(
            "Startup Inc",
            "Engineer",
            None,
            "https://ycombinator.com/jobs/123",
        );
        assert_eq!(hash.len(), 64);
    }

    #[test]
    fn test_compute_hash_none_location_consistency() {
        let h1 = YcStartupScraper::compute_hash("Company", "Title", None, "url");
        let h2 = YcStartupScraper::compute_hash("Company", "Title", None, "url");
        assert_eq!(h1, h2);
    }

    // -- is_remote ------------------------------------------------------------

    #[test]
    fn test_is_remote() {
        assert!(YcStartupScraper::is_remote(
            "Remote Software Engineer",
            None
        ));
        assert!(YcStartupScraper::is_remote("Engineer", Some("Remote, US")));
        assert!(YcStartupScraper::is_remote("Developer", Some("Anywhere")));
        assert!(!YcStartupScraper::is_remote(
            "Developer",
            Some("San Francisco, CA")
        ));
    }

    #[test]
    fn test_is_remote_distributed() {
        assert!(YcStartupScraper::is_remote(
            "Engineer",
            Some("Distributed team")
        ));
        assert!(YcStartupScraper::is_remote("Engineer", Some("distributed")));
    }

    #[test]
    fn test_is_remote_case_insensitive() {
        assert!(YcStartupScraper::is_remote("REMOTE Engineer", None));
        assert!(YcStartupScraper::is_remote("Engineer", Some("ANYWHERE")));
    }

    #[test]
    fn test_is_remote_distributed_keyword() {
        assert!(YcStartupScraper::is_remote(
            "Engineer",
            Some("Distributed team")
        ));
        assert!(YcStartupScraper::is_remote(
            "Developer",
            Some("fully distributed")
        ));
    }

    // -- Salary parsing -------------------------------------------------------

    #[test]
    fn test_parse_salary_range_k_format() {
        let (min, max) = YcStartupScraper::parse_salary_range("$120K - $180K");
        assert_eq!(min, Some(120_000));
        assert_eq!(max, Some(180_000));
    }

    #[test]
    fn test_parse_salary_range_full_numbers() {
        let (min, max) = YcStartupScraper::parse_salary_range("$100,000 - $150,000");
        assert_eq!(min, Some(100_000));
        assert_eq!(max, Some(150_000));
    }

    #[test]
    fn test_parse_salary_range_single_value() {
        let (min, max) = YcStartupScraper::parse_salary_range("$90K");
        assert_eq!(min, Some(90_000));
        assert_eq!(max, None);
    }

    #[test]
    fn test_parse_salary_range_empty() {
        let (min, max) = YcStartupScraper::parse_salary_range("");
        assert_eq!(min, None);
        assert_eq!(max, None);
    }

    #[test]
    fn test_parse_salary_range_unparseable() {
        let (min, max) = YcStartupScraper::parse_salary_range("Competitive");
        assert_eq!(min, None);
        assert_eq!(max, None);
    }

    // -- Inertia page parsing -------------------------------------------------

    #[test]
    fn test_parse_inertia_basic_jobs() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = build_payload(&[(
            "AI Startup Inc",
            vec![
                (
                    "Senior Backend Engineer",
                    "/companies/ai-startup/jobs/backend-123",
                    Some("San Francisco, CA"),
                ),
                (
                    "Frontend Developer",
                    "/companies/ai-startup/jobs/frontend-456",
                    Some("Remote"),
                ),
            ],
        )]);
        let html = inertia_html(&payload);
        let jobs = scraper
            .parse_inertia_page(&html)
            .expect("valid YC Inertia payload");

        assert_eq!(jobs.len(), 2);

        assert_eq!(jobs[0].title, "Senior Backend Engineer");
        assert_eq!(jobs[0].company, "AI Startup Inc");
        assert_eq!(
            jobs[0].url,
            "https://www.ycombinator.com/companies/ai-startup/jobs/backend-123"
        );
        assert_eq!(jobs[0].source, "yc_startup");
        assert_eq!(jobs[0].remote, Some(false));

        assert_eq!(jobs[1].title, "Frontend Developer");
        assert_eq!(jobs[1].remote, Some(true));
    }

    #[test]
    fn test_parse_inertia_absolute_url_preserved() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = r#"{"component":"Jobs","props":{"companiesWithJobs":[{"company":{"name":"Startup"},"jobPostings":[{"title":"Platform Engineer","url":"https://www.ycombinator.com/companies/startup/jobs/123","location":null,"type":"Full Time","role":"eng","salaryRange":null}]}]},"url":"/jobs","version":"1"}"#;
        let html = inertia_html(payload);
        let jobs = scraper
            .parse_inertia_page(&html)
            .expect("valid YC Inertia payload");

        assert_eq!(jobs.len(), 1);
        assert!(jobs[0].url.starts_with("https://"));
        // Must not double-prefix
        assert!(!jobs[0].url.contains("ycombinator.comhttps://"));
    }

    #[test]
    fn test_parse_inertia_empty_document() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let error = scraper
            .parse_inertia_page("<html><body></body></html>")
            .expect_err("missing data-page should be a source-health error");

        assert!(matches!(error, ScraperError::SelectorNotFound { .. }));
    }

    #[test]
    fn test_parse_inertia_no_companies_with_jobs_key() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = r#"{"component":"Jobs","props":{"other":[]},"url":"/jobs","version":"1"}"#;
        let html = inertia_html(payload);
        let error = scraper
            .parse_inertia_page(&html)
            .expect_err("missing companiesWithJobs should be a source-health error");

        assert!(matches!(error, ScraperError::MissingField { .. }));
    }

    #[test]
    fn test_parse_inertia_missing_job_postings_array_returns_error() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = r#"{"component":"Jobs","props":{"companiesWithJobs":[{"company":{"name":"Startup"}}]},"url":"/jobs","version":"1"}"#;
        let html = inertia_html(payload);
        let error = scraper
            .parse_inertia_page(&html)
            .expect_err("missing jobPostings should be a source-health error");

        assert!(matches!(error, ScraperError::MissingField { .. }));
    }

    #[test]
    fn test_parse_inertia_malformed_json_returns_error() {
        let scraper = YcStartupScraper::new(None, false, 10);
        // data-page is present but contains garbage JSON
        let html =
            r#"<html><body><div id="app" data-page="not valid json at all"></div></body></html>"#;
        let error = scraper
            .parse_inertia_page(html)
            .expect_err("malformed JSON should be a source-health error");

        assert!(matches!(error, ScraperError::ParseError { .. }));
    }

    #[test]
    fn test_parse_inertia_skips_empty_title() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = build_payload(&[(
            "TechCorp",
            vec![
                ("", "/companies/techcorp/jobs/1", None),
                ("Real Engineer", "/companies/techcorp/jobs/2", None),
            ],
        )]);
        let html = inertia_html(&payload);
        let jobs = scraper
            .parse_inertia_page(&html)
            .expect("valid YC Inertia payload");
        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].title, "Real Engineer");
    }

    #[test]
    fn test_parse_inertia_skips_short_title() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload =
            build_payload(&[("TechCorp", vec![("AB", "/companies/techcorp/jobs/1", None)])]);
        let html = inertia_html(&payload);
        let jobs = scraper
            .parse_inertia_page(&html)
            .expect("valid YC Inertia payload");
        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_inertia_company_name_fallback() {
        let scraper = YcStartupScraper::new(None, false, 10);
        // company.name is missing
        let payload = r#"{"component":"Jobs","props":{"companiesWithJobs":[{"company":{},"jobPostings":[{"title":"Software Engineer","url":"/companies/x/jobs/1","location":null,"type":"Full Time","role":"eng","salaryRange":null}]}]},"url":"/jobs","version":"1"}"#;
        let html = inertia_html(payload);
        let jobs = scraper
            .parse_inertia_page(&html)
            .expect("valid YC Inertia payload");
        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].company, "YC Startup");
    }

    #[test]
    fn test_parse_inertia_deduplicates_urls() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = build_payload(&[(
            "Startup",
            vec![
                ("Engineer", "/companies/startup/jobs/123", None),
                ("Senior Engineer", "/companies/startup/jobs/123", None),
            ],
        )]);
        let html = inertia_html(&payload);
        let jobs = scraper
            .parse_inertia_page(&html)
            .expect("valid YC Inertia payload");
        assert_eq!(jobs.len(), 1);
    }
}
