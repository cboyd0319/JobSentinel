//! ATS Platform Detector
//!
//! Identifies which ATS (Applicant Tracking System) platform a job posting uses
//! based on URL patterns and page structure.

use super::AtsPlatform;
use regex::Regex;
use std::sync::OnceLock;

/// ATS detector
pub struct AtsDetector;

impl AtsDetector {
    /// Detect ATS platform from job URL
    ///
    /// # Examples
    /// ```
    /// use jobsentinel::core::automation::ats_detector::AtsDetector;
    /// use jobsentinel::core::automation::AtsPlatform;
    ///
    /// let platform = AtsDetector::detect_from_url("https://boards.greenhouse.io/company/jobs/123");
    /// assert_eq!(platform, AtsPlatform::Greenhouse);
    ///
    /// let platform = AtsDetector::detect_from_url("https://jobs.lever.co/company/abc-123");
    /// assert_eq!(platform, AtsPlatform::Lever);
    /// ```
    pub fn detect_from_url(url: &str) -> AtsPlatform {
        let patterns = Self::url_patterns();

        for (platform, pattern) in patterns.iter() {
            if pattern.is_match(url) {
                return platform.clone();
            }
        }

        AtsPlatform::Unknown
    }

    /// Get URL patterns for each ATS platform
    fn url_patterns() -> &'static Vec<(AtsPlatform, Regex)> {
        static PATTERNS: OnceLock<Vec<(AtsPlatform, Regex)>> = OnceLock::new();

        PATTERNS.get_or_init(|| {
            vec![
                // Greenhouse: boards.greenhouse.io, greenhouse.io, *.greenhouse.io
                (
                    AtsPlatform::Greenhouse,
                    Regex::new(r"(?i)(boards\.)?greenhouse\.io").unwrap(),
                ),
                // Lever: jobs.lever.co, *.lever.co
                (
                    AtsPlatform::Lever,
                    Regex::new(r"(?i)(jobs\.)?lever\.co").unwrap(),
                ),
                // Workday: *.myworkdayjobs.com, workday.com/*/job
                (
                    AtsPlatform::Workday,
                    Regex::new(r"(?i)(myworkdayjobs\.com|workday\.com/[^/]+/job)").unwrap(),
                ),
                // Taleo: *.taleo.net, tbe.taleo.net
                (
                    AtsPlatform::Taleo,
                    Regex::new(r"(?i)taleo\.net").unwrap(),
                ),
                // iCIMS: *.icims.com, careers.*.com (using iCIMS)
                (
                    AtsPlatform::Icims,
                    Regex::new(r"(?i)icims\.com").unwrap(),
                ),
                // BambooHR: *.bamboohr.com/careers
                (
                    AtsPlatform::BambooHr,
                    Regex::new(r"(?i)bamboohr\.com/careers").unwrap(),
                ),
                // Ashby: jobs.ashbyhq.com, *.ashbyhq.com
                (
                    AtsPlatform::AshbyHq,
                    Regex::new(r"(?i)ashbyhq\.com").unwrap(),
                ),
            ]
        })
    }

    /// Get company career page pattern for detecting ATS
    ///
    /// Some companies host ATS on their own domain. This detects embedded ATS.
    pub fn detect_from_html(html: &str) -> AtsPlatform {
        let html_lower = html.to_lowercase();

        // Greenhouse indicators
        if html_lower.contains("greenhouse.io")
            || html_lower.contains("id=\"grnhse")
            || html_lower.contains("data-gh-")
        {
            return AtsPlatform::Greenhouse;
        }

        // Lever indicators
        if html_lower.contains("lever.co") || html_lower.contains("data-qa=\"btn-apply\"") {
            return AtsPlatform::Lever;
        }

        // Workday indicators
        if html_lower.contains("workday.com") || html_lower.contains("workday-") {
            return AtsPlatform::Workday;
        }

        // Taleo indicators
        if html_lower.contains("taleo.net") || html_lower.contains("taleocentral") {
            return AtsPlatform::Taleo;
        }

        // iCIMS indicators
        if html_lower.contains("icims.com") || html_lower.contains("iCIMS") {
            return AtsPlatform::Icims;
        }

        // BambooHR indicators
        if html_lower.contains("bamboohr.com") {
            return AtsPlatform::BambooHr;
        }

        // Ashby indicators
        if html_lower.contains("ashbyhq.com") || html_lower.contains("ashby-") {
            return AtsPlatform::AshbyHq;
        }

        AtsPlatform::Unknown
    }

    /// Get known form fields for an ATS platform
    ///
    /// Returns common field names/IDs used by the platform
    pub fn get_common_fields(platform: &AtsPlatform) -> Vec<&'static str> {
        match platform {
            AtsPlatform::Greenhouse => vec![
                "first_name",
                "last_name",
                "email",
                "phone",
                "resume",
                "cover_letter",
                "linkedin",
            ],
            AtsPlatform::Lever => vec![
                "name",
                "email",
                "phone",
                "resume",
                "org",
                "cards[Apply].fields[Full name]",
            ],
            AtsPlatform::Workday => vec![
                "input-1", // First Name
                "input-2", // Last Name
                "input-3", // Email
                "input-4", // Phone
                "input-file-upload-0", // Resume
            ],
            AtsPlatform::Taleo => vec![
                "text1", // First Name
                "text2", // Last Name
                "text3", // Email
                "text4", // Phone
                "file_resume",
            ],
            AtsPlatform::Icims => vec![
                "applicant.firstName",
                "applicant.lastName",
                "applicant.email",
                "applicant.phone",
                "resumeUpload",
            ],
            AtsPlatform::BambooHr => vec![
                "first_name",
                "last_name",
                "email",
                "phone",
                "resume",
            ],
            AtsPlatform::AshbyHq => vec![
                "name",
                "email",
                "phone",
                "resume",
                "linkedin_url",
            ],
            AtsPlatform::Unknown => vec![],
        }
    }

    /// Get platform-specific automation notes/tips
    pub fn get_automation_notes(platform: &AtsPlatform) -> &'static str {
        match platform {
            AtsPlatform::Greenhouse => {
                "Greenhouse: Usually has iframe embed. Look for #grnhse_app. \
                 May require clicking 'Submit Application' button."
            }
            AtsPlatform::Lever => {
                "Lever: Form fields use 'cards[Apply].fields[...]' naming. \
                 Resume upload is usually drag-and-drop or file input."
            }
            AtsPlatform::Workday => {
                "Workday: Complex multi-step form. Uses generic field IDs (input-1, input-2). \
                 Requires navigation through multiple pages. High automation difficulty."
            }
            AtsPlatform::Taleo => {
                "Taleo: Legacy ATS with clunky UI. Uses generic field names (text1, text2). \
                 May have long load times."
            }
            AtsPlatform::Icims => {
                "iCIMS: Field names use applicant.* prefix. \
                 Often has screening questions on separate pages."
            }
            AtsPlatform::BambooHr => {
                "BambooHR: Simple, clean forms. Standard field names. \
                 Good candidate for automation."
            }
            AtsPlatform::AshbyHq => {
                "Ashby: Modern ATS with clean UI. Usually single-page application. \
                 Good automation candidate."
            }
            AtsPlatform::Unknown => "Unknown ATS platform. Manual detection required.",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_greenhouse() {
        assert_eq!(
            AtsDetector::detect_from_url("https://boards.greenhouse.io/company/jobs/123"),
            AtsPlatform::Greenhouse
        );
        assert_eq!(
            AtsDetector::detect_from_url("https://greenhouse.io/company"),
            AtsPlatform::Greenhouse
        );
    }

    #[test]
    fn test_detect_lever() {
        assert_eq!(
            AtsDetector::detect_from_url("https://jobs.lever.co/company/abc-123-def"),
            AtsPlatform::Lever
        );
        assert_eq!(
            AtsDetector::detect_from_url("https://www.lever.co/careers"),
            AtsPlatform::Lever
        );
    }

    #[test]
    fn test_detect_workday() {
        assert_eq!(
            AtsDetector::detect_from_url("https://company.wd1.myworkdayjobs.com/en-US/Careers/job/123"),
            AtsPlatform::Workday
        );
        assert_eq!(
            AtsDetector::detect_from_url("https://workday.com/company/job/12345"),
            AtsPlatform::Workday
        );
    }

    #[test]
    fn test_detect_taleo() {
        assert_eq!(
            AtsDetector::detect_from_url("https://company.taleo.net/careersection/jobdetail.ftl?job=123"),
            AtsPlatform::Taleo
        );
    }

    #[test]
    fn test_detect_icims() {
        assert_eq!(
            AtsDetector::detect_from_url("https://careers.company.icims.com/jobs/12345"),
            AtsPlatform::Icims
        );
    }

    #[test]
    fn test_detect_bamboohr() {
        assert_eq!(
            AtsDetector::detect_from_url("https://company.bamboohr.com/careers/123"),
            AtsPlatform::BambooHr
        );
    }

    #[test]
    fn test_detect_ashby() {
        assert_eq!(
            AtsDetector::detect_from_url("https://jobs.ashbyhq.com/company/abc-123"),
            AtsPlatform::AshbyHq
        );
    }

    #[test]
    fn test_detect_unknown() {
        assert_eq!(
            AtsDetector::detect_from_url("https://company.com/careers/job/123"),
            AtsPlatform::Unknown
        );
    }

    #[test]
    fn test_detect_from_html() {
        let greenhouse_html = r#"
            <html>
            <body>
                <div id="grnhse_app"></div>
                <script src="https://boards.greenhouse.io/embed.js"></script>
            </body>
            </html>
        "#;

        assert_eq!(
            AtsDetector::detect_from_html(greenhouse_html),
            AtsPlatform::Greenhouse
        );

        let lever_html = r#"
            <html>
            <body>
                <button data-qa="btn-apply">Apply</button>
            </body>
            </html>
        "#;

        assert_eq!(
            AtsDetector::detect_from_html(lever_html),
            AtsPlatform::Lever
        );
    }

    #[test]
    fn test_get_common_fields() {
        let fields = AtsDetector::get_common_fields(&AtsPlatform::Greenhouse);
        assert!(fields.contains(&"first_name"));
        assert!(fields.contains(&"email"));

        let workday_fields = AtsDetector::get_common_fields(&AtsPlatform::Workday);
        assert!(workday_fields.contains(&"input-1"));
    }

    #[test]
    fn test_get_automation_notes() {
        let notes = AtsDetector::get_automation_notes(&AtsPlatform::Greenhouse);
        assert!(notes.contains("iframe"));
        assert!(notes.contains("grnhse_app"));
    }
}
