//! Sanitizer - Anonymize all user-identifiable information
//!
//! CRITICAL: This is a PUBLIC repository. Every log, every debug event, every error message
//! goes through this sanitizer before being shown to users or included in feedback reports.

use once_cell::sync::Lazy;
use regex::Regex;
use serde::Serialize;

// Unix paths: /Users/johnsmith/... → /[USER_PATH]/...
static PATH_REGEX: Lazy<Regex> = Lazy::new(|| Regex::new(r"/(Users|home)/[^/\s]+").unwrap());

// Windows paths: C:\Users\johnsmith\... → C:\[USER_PATH]\...
static WINDOWS_PATH_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"[A-Za-z]:\\Users\\[^\\]+").unwrap());

// Emails: john@example.com → [EMAIL]
static EMAIL_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap());

// Webhooks: https://hooks.slack.com/... → [WEBHOOK_CONFIGURED]
static WEBHOOK_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"https://hooks\.(slack|discord|teams)\.com/[^\s]+").unwrap());

// LinkedIn cookies: li_at=AQEDARa... → li_at=[REDACTED]
static LINKEDIN_COOKIE_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"li_at=[^\s;]+").unwrap());

// API tokens: Bearer eyJ... or token ghp_... → [TOKEN]
static TOKEN_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(Bearer\s+[^\s]+|token\s+[^\s]+|api_key=[^\s&]+)").unwrap());

// IP addresses: 192.168.1.1 → [IP_ADDRESS]
static IP_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b").unwrap());

// Quoted strings (might be job titles or company names)
static QUOTED_STRING_REGEX: Lazy<Regex> = Lazy::new(|| Regex::new(r#""[^"]+""#).unwrap());
static SINGLE_QUOTED_REGEX: Lazy<Regex> = Lazy::new(|| Regex::new(r"'[^']+'").unwrap());

/// Sanitizer removes all user-identifiable information from text
pub struct Sanitizer;

impl Sanitizer {
    /// Sanitize all user-identifiable information from text
    ///
    /// This function MUST be called on ALL output before showing to users or
    /// including in feedback reports.
    ///
    /// # Examples
    ///
    /// ```
    /// use crate::commands::feedback::sanitizer::Sanitizer;
    ///
    /// let dirty = "Error reading /Users/johnsmith/Documents/jobs.db";
    /// let clean = Sanitizer::sanitize(dirty);
    /// assert_eq!(clean, "Error reading /[USER_PATH]/Documents/jobs.db");
    /// ```
    pub fn sanitize(text: &str) -> String {
        let mut result = text.to_string();

        // Unix paths: /Users/johnsmith → /[USER_PATH]
        result = PATH_REGEX.replace_all(&result, "/[USER_PATH]").to_string();

        // Windows paths: C:\Users\johnsmith → C:\[USER_PATH]
        result = WINDOWS_PATH_REGEX
            .replace_all(&result, "C:\\[USER_PATH]")
            .to_string();

        // Emails: john@example.com → [EMAIL]
        result = EMAIL_REGEX.replace_all(&result, "[EMAIL]").to_string();

        // Webhooks: full URL → [WEBHOOK_CONFIGURED]
        result = WEBHOOK_REGEX
            .replace_all(&result, "[WEBHOOK_CONFIGURED]")
            .to_string();

        // LinkedIn cookies
        result = LINKEDIN_COOKIE_REGEX
            .replace_all(&result, "li_at=[REDACTED]")
            .to_string();

        // API tokens
        result = TOKEN_REGEX.replace_all(&result, "[TOKEN]").to_string();

        // IP addresses (optional - some may want to keep local IPs)
        result = IP_REGEX.replace_all(&result, "[IP_ADDRESS]").to_string();

        result
    }

    /// Sanitize error messages specifically
    ///
    /// More aggressive than `sanitize()` - also removes quoted strings that might
    /// contain job titles or company names.
    pub fn sanitize_error(error: &str) -> String {
        let mut result = Self::sanitize(error);

        // Remove double-quoted strings (might be job titles/companies)
        result = QUOTED_STRING_REGEX
            .replace_all(&result, "\"[REDACTED]\"")
            .to_string();

        // Remove single-quoted strings too
        result = SINGLE_QUOTED_REGEX
            .replace_all(&result, "'[REDACTED]'")
            .to_string();

        result
    }

    /// Sanitize file paths specifically
    ///
    /// More aggressive - replaces entire path after /Users, /home, or C:\Users
    pub fn sanitize_path(path: &str) -> String {
        let mut result = PATH_REGEX.replace_all(path, "/[USER_PATH]").to_string();
        result = WINDOWS_PATH_REGEX
            .replace_all(&result, "C:\\[USER_PATH]")
            .to_string();
        result
    }
}

/// Anonymized configuration summary (counts only, no values)
#[derive(Debug, Clone, Serialize)]
pub struct ConfigSummary {
    pub scrapers_enabled: usize,
    pub keywords_count: usize,
    pub has_location_prefs: bool,
    pub has_salary_prefs: bool,
    pub has_company_blocklist: bool,
    pub has_company_allowlist: bool,
    pub notifications_configured: usize,
    pub has_resume: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_file_paths() {
        let input = "Error reading /Users/johnsmith/Documents/jobs.db";
        let output = Sanitizer::sanitize(input);
        assert_eq!(output, "Error reading /[USER_PATH]/Documents/jobs.db");
    }

    #[test]
    fn test_sanitize_linux_paths() {
        let input = "Error reading /home/johnsmith/.config/jobsentinel/jobs.db";
        let output = Sanitizer::sanitize(input);
        assert_eq!(
            output,
            "Error reading /[USER_PATH]/.config/jobsentinel/jobs.db"
        );
    }

    #[test]
    fn test_sanitize_windows_paths() {
        let input = r"Error reading C:\Users\JohnSmith\Documents\jobs.db";
        let output = Sanitizer::sanitize(input);
        assert!(!output.contains("JohnSmith"));
        assert!(output.contains("[USER_PATH]"));
        assert_eq!(output, r"Error reading C:\[USER_PATH]\Documents\jobs.db");
    }

    #[test]
    fn test_sanitize_windows_paths_different_drives() {
        let tests = vec![
            (
                r"D:\Users\Alice\AppData\Local\JobSentinel\config.json",
                r"C:\[USER_PATH]\AppData\Local\JobSentinel\config.json",
            ),
            (
                r"E:\Users\bob.johnson\Desktop\resume.pdf",
                r"C:\[USER_PATH]\Desktop\resume.pdf",
            ),
            (
                r"C:\Users\admin\Downloads\jobs.csv",
                r"C:\[USER_PATH]\Downloads\jobs.csv",
            ),
        ];

        for (input, expected) in tests {
            let output = Sanitizer::sanitize(input);
            assert!(!output.contains("Alice"));
            assert!(!output.contains("bob.johnson"));
            assert!(!output.contains("admin"));
            assert_eq!(output, expected);
        }
    }

    #[test]
    fn test_sanitize_mixed_platform_paths() {
        let input = r"Syncing from /Users/johnsmith/Desktop to C:\Users\JohnSmith\Documents";
        let output = Sanitizer::sanitize(input);
        assert!(!output.contains("johnsmith"));
        assert!(!output.contains("JohnSmith"));
        assert_eq!(
            output,
            r"Syncing from /[USER_PATH]/Desktop to C:\[USER_PATH]\Documents"
        );
    }

    #[test]
    fn test_sanitize_emails() {
        let input = "User email: john.doe@example.com configured";
        let output = Sanitizer::sanitize(input);
        assert_eq!(output, "User email: [EMAIL] configured");
    }

    #[test]
    fn test_sanitize_webhooks() {
        let tests = vec![
            (
                "Slack webhook: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX",
                "Slack webhook: [WEBHOOK_CONFIGURED]",
            ),
            (
                "Discord webhook: https://hooks.discord.com/api/webhooks/123456789/abcdefg",
                "Discord webhook: [WEBHOOK_CONFIGURED]",
            ),
            (
                "Teams webhook: https://hooks.teams.com/workflows/abc123",
                "Teams webhook: [WEBHOOK_CONFIGURED]",
            ),
        ];

        for (input, expected) in tests {
            let output = Sanitizer::sanitize(input);
            assert_eq!(output, expected);
        }
    }

    #[test]
    fn test_sanitize_linkedin_cookies() {
        let input = "Cookie: li_at=AQEDARa1234567890abcdefg; Path=/";
        let output = Sanitizer::sanitize(input);
        assert_eq!(output, "Cookie: li_at=[REDACTED]; Path=/");
    }

    #[test]
    fn test_sanitize_api_tokens() {
        let tests = vec![
            ("Bearer eyJ0eXAiOiJKV1QiLCJhbGc...", "[TOKEN]"),
            ("Authorization: token ghp_1234567890abcdefg", "Authorization: [TOKEN]"),
            ("URL: /api?api_key=secret123&foo=bar", "URL: /api?[TOKEN]&foo=bar"),
        ];

        for (input, expected) in tests {
            let output = Sanitizer::sanitize(input);
            assert_eq!(output, expected);
        }
    }

    #[test]
    fn test_sanitize_ip_addresses() {
        let input = "Connected to 192.168.1.100:8080";
        let output = Sanitizer::sanitize(input);
        assert_eq!(output, "Connected to [IP_ADDRESS]:8080");
    }

    #[test]
    fn test_sanitize_multiple_patterns() {
        let input = "User john@example.com uploaded resume from /Users/johnsmith/Desktop/resume.pdf, webhook https://hooks.slack.com/services/ABC";
        let output = Sanitizer::sanitize(input);
        assert_eq!(
            output,
            "User [EMAIL] uploaded resume from /[USER_PATH]/Desktop/resume.pdf, webhook [WEBHOOK_CONFIGURED]"
        );
    }

    #[test]
    fn test_sanitize_preserves_safe_content() {
        let input = "Scraper run: Indeed found 42 jobs, command succeeded";
        let output = Sanitizer::sanitize(input);
        assert_eq!(output, input); // Should be unchanged
    }

    #[test]
    fn test_sanitize_error_removes_quoted_strings() {
        let input = "Failed to find job titled \"Senior Software Engineer\"";
        let output = Sanitizer::sanitize_error(input);
        assert_eq!(output, "Failed to find job titled \"[REDACTED]\"");

        let input = "Company 'Google' not found in blocklist";
        let output = Sanitizer::sanitize_error(input);
        assert_eq!(output, "Company '[REDACTED]' not found in blocklist");
    }

    #[test]
    fn test_sanitize_path_windows() {
        let input = r"C:\Users\JohnSmith\AppData\Local\JobSentinel";
        let output = Sanitizer::sanitize_path(input);
        assert_eq!(output, r"C:\[USER_PATH]\AppData\Local\JobSentinel");
    }

    #[test]
    fn test_sanitize_error_complex() {
        let input = concat!(
            "Error loading config from /Users/john/Library/JobSentinel/config.json: ",
            "Failed to parse webhook https://hooks.slack.com/T123/B456/xyz for user john@example.com. ",
            "LinkedIn cookie li_at=AQEDA123 is invalid. Search for \"rust developer\" failed."
        );

        let output = Sanitizer::sanitize_error(input);

        // Should redact file paths, webhooks, emails, cookies, quoted strings
        assert!(output.contains("/[USER_PATH]/Library"));
        assert!(output.contains("[WEBHOOK_CONFIGURED]"));
        assert!(output.contains("[EMAIL]"));
        assert!(output.contains("li_at=[REDACTED]"));
        assert!(output.contains("\"[REDACTED]\""));
    }

    #[test]
    fn test_sanitize_error_complex_windows() {
        let input = format!(
            r"Error loading config from C:\Users\Administrator\AppData\Roaming\JobSentinel\config.json: \
            Failed to parse webhook https://hooks.discord.com/api/webhooks/123/abc for user admin@company.com. \
            Database at D:\Users\dbuser\Documents\jobs.db is locked. Search for {} failed.",
            "\"senior engineer\""
        );

        let output = Sanitizer::sanitize_error(&input);

        // Should redact Windows paths, webhooks, emails, quoted strings
        assert!(output.contains(r"C:\[USER_PATH]\AppData\Roaming"));
        assert!(output.contains(r"C:\[USER_PATH]\Documents\jobs.db")); // D: drive normalized to C:
        assert!(output.contains("[WEBHOOK_CONFIGURED]"));
        assert!(output.contains("[EMAIL]"));
        assert!(output.contains("\"[REDACTED]\""));
        assert!(!output.contains("Administrator"));
        assert!(!output.contains("dbuser"));
        assert!(!output.contains("admin@company.com"));
    }
}
