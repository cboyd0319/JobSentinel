//! Form Auto-Fill Logic
//!
//! Fills job application forms with user profile data.
//! Platform-specific selectors for each ATS type.
//! Also handles screening questions using stored answer patterns.

use super::browser::{AutomationPage, FillResult};
use super::profile::{ApplicationProfile, ScreeningAnswer};
use super::AtsPlatform;
use anyhow::Result;
use regex::Regex;
use std::collections::HashMap;
use std::path::PathBuf;

/// Form filler - fills application forms based on ATS platform
pub struct FormFiller {
    profile: ApplicationProfile,
    resume_path: Option<PathBuf>,
    screening_answers: Vec<ScreeningAnswer>,
}

impl FormFiller {
    /// Create a new form filler with user profile
    pub fn new(profile: ApplicationProfile, resume_path: Option<PathBuf>) -> Self {
        Self {
            profile,
            resume_path,
            screening_answers: Vec::new(),
        }
    }

    /// Create form filler with screening answers for auto-filling questions
    pub fn with_screening_answers(mut self, answers: Vec<ScreeningAnswer>) -> Self {
        self.screening_answers = answers;
        self
    }

    /// Fill the application form on the page
    ///
    /// Returns what was filled and what needs manual attention.
    /// Does NOT submit - user must click submit manually.
    #[tracing::instrument(skip(self, page), fields(platform = ?platform))]
    pub async fn fill_page(
        &self,
        page: &AutomationPage,
        platform: &AtsPlatform,
    ) -> Result<FillResult> {
        tracing::info!("Starting form auto-fill");
        let mut result = FillResult::new();

        // Check for CAPTCHA first
        if page.has_captcha().await {
            tracing::warn!("CAPTCHA detected, aborting auto-fill");
            return Ok(result.with_captcha());
        }

        // Get platform-specific selectors
        let selectors = Self::get_field_selectors(platform);

        // Fill basic contact fields
        tracing::debug!("Filling contact fields");
        self.fill_contact_fields(page, &selectors, &mut result)
            .await;

        // Fill URLs (LinkedIn, GitHub, etc.)
        tracing::debug!("Filling URL fields");
        self.fill_url_fields(page, &selectors, &mut result).await;

        // Fill work authorization
        tracing::debug!("Filling work authorization fields");
        self.fill_work_auth_fields(page, &selectors, &mut result)
            .await;

        // Upload resume if available
        if let Some(ref resume_path) = self.resume_path {
            tracing::debug!("Uploading resume");
            self.fill_resume(page, &selectors, resume_path, &mut result)
                .await;
        }

        // Fill screening questions using stored answers
        if !self.screening_answers.is_empty() {
            tracing::debug!("Filling {} screening questions", self.screening_answers.len());
            self.fill_screening_questions(page, &mut result).await;
        }

        // Check for CAPTCHA again after filling (some appear after form interaction)
        if page.has_captcha().await {
            tracing::warn!("CAPTCHA appeared after form interaction, aborting");
            return Ok(result.with_captcha());
        }

        result.ready_for_review = true;
        tracing::info!("Form auto-fill complete, {} fields filled", result.filled_fields.len());
        Ok(result)
    }

    /// Fill contact information fields
    async fn fill_contact_fields(
        &self,
        page: &AutomationPage,
        selectors: &HashMap<FieldType, Vec<&str>>,
        result: &mut FillResult,
    ) {
        // First name
        if let Some(sel_list) = selectors.get(&FieldType::FirstName) {
            let first_name = self
                .profile
                .full_name
                .split_whitespace()
                .next()
                .unwrap_or("");
            for selector in sel_list {
                if let Ok(true) = page.fill(selector, first_name).await {
                    result.filled_fields.push("first_name".to_string());
                    break;
                }
            }
        }

        // Last name
        if let Some(sel_list) = selectors.get(&FieldType::LastName) {
            let last_name = self
                .profile
                .full_name
                .split_whitespace()
                .last()
                .unwrap_or("");
            for selector in sel_list {
                if let Ok(true) = page.fill(selector, last_name).await {
                    result.filled_fields.push("last_name".to_string());
                    break;
                }
            }
        }

        // Full name (some forms use this instead of first/last)
        if let Some(sel_list) = selectors.get(&FieldType::FullName) {
            for selector in sel_list {
                if let Ok(true) = page.fill(selector, &self.profile.full_name).await {
                    result.filled_fields.push("full_name".to_string());
                    break;
                }
            }
        }

        // Email
        if let Some(sel_list) = selectors.get(&FieldType::Email) {
            for selector in sel_list {
                if let Ok(true) = page.fill(selector, &self.profile.email).await {
                    result.filled_fields.push("email".to_string());
                    break;
                }
            }
        }

        // Phone
        if let Some(phone) = &self.profile.phone {
            if let Some(sel_list) = selectors.get(&FieldType::Phone) {
                for selector in sel_list {
                    if let Ok(true) = page.fill(selector, phone).await {
                        result.filled_fields.push("phone".to_string());
                        break;
                    }
                }
            }
        }
    }

    /// Fill URL fields (LinkedIn, GitHub, portfolio, etc.)
    async fn fill_url_fields(
        &self,
        page: &AutomationPage,
        selectors: &HashMap<FieldType, Vec<&str>>,
        result: &mut FillResult,
    ) {
        // LinkedIn
        if let Some(url) = &self.profile.linkedin_url {
            if let Some(sel_list) = selectors.get(&FieldType::LinkedIn) {
                for selector in sel_list {
                    if let Ok(true) = page.fill(selector, url).await {
                        result.filled_fields.push("linkedin".to_string());
                        break;
                    }
                }
            }
        }

        // GitHub
        if let Some(url) = &self.profile.github_url {
            if let Some(sel_list) = selectors.get(&FieldType::GitHub) {
                for selector in sel_list {
                    if let Ok(true) = page.fill(selector, url).await {
                        result.filled_fields.push("github".to_string());
                        break;
                    }
                }
            }
        }

        // Portfolio
        if let Some(url) = &self.profile.portfolio_url {
            if let Some(sel_list) = selectors.get(&FieldType::Portfolio) {
                for selector in sel_list {
                    if let Ok(true) = page.fill(selector, url).await {
                        result.filled_fields.push("portfolio".to_string());
                        break;
                    }
                }
            }
        }

        // Website
        if let Some(url) = &self.profile.website_url {
            if let Some(sel_list) = selectors.get(&FieldType::Website) {
                for selector in sel_list {
                    if let Ok(true) = page.fill(selector, url).await {
                        result.filled_fields.push("website".to_string());
                        break;
                    }
                }
            }
        }
    }

    /// Fill work authorization fields
    async fn fill_work_auth_fields(
        &self,
        page: &AutomationPage,
        selectors: &HashMap<FieldType, Vec<&str>>,
        result: &mut FillResult,
    ) {
        // Work authorized
        if let Some(sel_list) = selectors.get(&FieldType::WorkAuthorized) {
            let value = if self.profile.us_work_authorized {
                "Yes"
            } else {
                "No"
            };
            for selector in sel_list {
                // Try both fill (for text input) and select (for dropdown)
                if let Ok(true) = page.fill(selector, value).await {
                    result.filled_fields.push("work_authorized".to_string());
                    break;
                }
                if let Ok(true) = page.select(selector, value).await {
                    result.filled_fields.push("work_authorized".to_string());
                    break;
                }
            }
        }

        // Requires sponsorship
        if let Some(sel_list) = selectors.get(&FieldType::RequiresSponsorship) {
            let value = if self.profile.requires_sponsorship {
                "Yes"
            } else {
                "No"
            };
            for selector in sel_list {
                if let Ok(true) = page.fill(selector, value).await {
                    result
                        .filled_fields
                        .push("requires_sponsorship".to_string());
                    break;
                }
                if let Ok(true) = page.select(selector, value).await {
                    result
                        .filled_fields
                        .push("requires_sponsorship".to_string());
                    break;
                }
            }
        }
    }

    /// Upload resume file
    async fn fill_resume(
        &self,
        page: &AutomationPage,
        selectors: &HashMap<FieldType, Vec<&str>>,
        resume_path: &PathBuf,
        result: &mut FillResult,
    ) {
        if let Some(sel_list) = selectors.get(&FieldType::Resume) {
            for selector in sel_list {
                if let Ok(true) = page.upload_file(selector, resume_path).await {
                    result.filled_fields.push("resume".to_string());
                    break;
                }
            }
        }
    }

    /// Fill screening questions using stored answer patterns
    ///
    /// Finds question labels on the page, matches them against stored patterns,
    /// and fills the corresponding inputs with configured answers.
    async fn fill_screening_questions(&self, page: &AutomationPage, result: &mut FillResult) {
        // Common screening question selectors across ATS platforms
        let question_selectors = [
            // Greenhouse
            "div.field label",
            "div.application-question label",
            // Lever
            "div.question-field label",
            "[data-qa='question-label']",
            // Workday
            "[data-automation-id='questionLabel']",
            "label.WGAE",
            // Generic
            "fieldset legend",
            "div.form-group label",
            ".question label",
            "label[for]",
        ];

        // Try to find and fill questions
        for selector in question_selectors {
            if let Ok(questions) = self.find_questions_with_selector(page, selector).await {
                for (question_text, input_selector) in questions {
                    if let Some(answer) = self.find_answer_for_question(&question_text) {
                        // Try to fill the associated input
                        if let Ok(true) = page.fill(&input_selector, &answer).await {
                            let field_name = Self::truncate_question(&question_text, 30);
                            result
                                .filled_fields
                                .push(format!("screening:{}", field_name));
                            tracing::debug!(
                                "Filled screening question '{}' with answer",
                                question_text
                            );
                        } else if let Ok(true) = page.select(&input_selector, &answer).await {
                            let field_name = Self::truncate_question(&question_text, 30);
                            result
                                .filled_fields
                                .push(format!("screening:{}", field_name));
                            tracing::debug!("Selected screening answer for '{}'", question_text);
                        }
                    }
                }
            }
        }
    }

    /// Find question elements and their associated input selectors
    async fn find_questions_with_selector(
        &self,
        page: &AutomationPage,
        _selector: &str,
    ) -> Result<Vec<(String, String)>> {
        // Use JavaScript to find all question labels and their associated inputs
        let script = r#"
            (function() {
                const results = [];
                const labels = document.querySelectorAll('label[for], fieldset legend, .question label, [data-automation-id*="question"]');

                for (const label of labels) {
                    const text = label.textContent?.trim();
                    if (!text || text.length < 5) continue;

                    // Find associated input
                    let input = null;

                    // Try 'for' attribute
                    if (label.htmlFor) {
                        input = document.getElementById(label.htmlFor);
                    }

                    // Try next sibling
                    if (!input) {
                        input = label.nextElementSibling;
                        if (input && !['INPUT', 'SELECT', 'TEXTAREA'].includes(input.tagName)) {
                            input = input.querySelector('input, select, textarea');
                        }
                    }

                    // Try parent container
                    if (!input) {
                        const container = label.closest('.field, .form-group, .question, fieldset');
                        if (container) {
                            input = container.querySelector('input:not([type="hidden"]), select, textarea');
                        }
                    }

                    if (input && (input.tagName === 'INPUT' || input.tagName === 'SELECT' || input.tagName === 'TEXTAREA')) {
                        // Generate a unique selector for the input
                        let selector = '';
                        if (input.id) {
                            selector = '#' + input.id;
                        } else if (input.name) {
                            selector = `[name="${input.name}"]`;
                        } else {
                            // Use data attributes or class
                            const attrs = Array.from(input.attributes)
                                .filter(a => a.name.startsWith('data-'))
                                .map(a => `[${a.name}="${a.value}"]`)
                                .join('');
                            if (attrs) selector = input.tagName.toLowerCase() + attrs;
                        }

                        if (selector) {
                            results.push([text, selector]);
                        }
                    }
                }

                return results;
            })()
        "#;

        let value = page
            .inner()
            .evaluate(script)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to execute question finder script: {}", e))?;

        // Parse the result - expecting array of [question, selector] pairs
        let result_value: serde_json::Value = value
            .into_value()
            .map_err(|e| anyhow::anyhow!("Failed to parse question finder result: {}", e))?;

        let pairs: Vec<(String, String)> = match result_value {
            serde_json::Value::Array(arr) => arr
                .into_iter()
                .filter_map(|item| {
                    if let serde_json::Value::Array(pair) = item {
                        if pair.len() == 2 {
                            let q = pair[0].as_str()?.to_string();
                            let s = pair[1].as_str()?.to_string();
                            return Some((q, s));
                        }
                    }
                    None
                })
                .collect(),
            _ => Vec::new(),
        };

        Ok(pairs)
    }

    /// Find matching answer for a question text
    fn find_answer_for_question(&self, question: &str) -> Option<String> {
        let question_lower = question.to_lowercase();

        for answer in &self.screening_answers {
            if let Ok(regex) = Regex::new(&format!("(?i){}", answer.question_pattern)) {
                if regex.is_match(&question_lower) {
                    tracing::debug!(
                        "Matched pattern '{}' for question '{}'",
                        answer.question_pattern,
                        question
                    );
                    return Some(answer.answer.clone());
                }
            }
        }

        None
    }

    /// Truncate question text for logging/display
    fn truncate_question(text: &str, max_len: usize) -> String {
        if text.len() <= max_len {
            text.to_string()
        } else {
            format!("{}...", &text[..max_len - 3])
        }
    }

    /// Get field selectors for each ATS platform
    fn get_field_selectors(platform: &AtsPlatform) -> HashMap<FieldType, Vec<&'static str>> {
        let mut selectors = HashMap::new();

        match platform {
            AtsPlatform::Greenhouse => {
                selectors.insert(
                    FieldType::FirstName,
                    vec![
                        "#first_name",
                        "input[name='first_name']",
                        "[data-field='first_name']",
                    ],
                );
                selectors.insert(
                    FieldType::LastName,
                    vec![
                        "#last_name",
                        "input[name='last_name']",
                        "[data-field='last_name']",
                    ],
                );
                selectors.insert(
                    FieldType::Email,
                    vec!["#email", "input[name='email']", "input[type='email']"],
                );
                selectors.insert(
                    FieldType::Phone,
                    vec!["#phone", "input[name='phone']", "input[type='tel']"],
                );
                selectors.insert(
                    FieldType::LinkedIn,
                    vec!["input[name*='linkedin']", "[data-field*='linkedin']"],
                );
                selectors.insert(
                    FieldType::Resume,
                    vec!["input[type='file'][name*='resume']", "input[type='file']"],
                );
                selectors.insert(
                    FieldType::CoverLetter,
                    vec![
                        "textarea[name*='cover_letter']",
                        "textarea[name*='cover-letter']",
                        "input[type='file'][name*='cover']",
                    ],
                );
                selectors.insert(
                    FieldType::WorkAuthorized,
                    vec!["select[name*='authorized']", "input[name*='authorized']"],
                );
            }
            AtsPlatform::Lever => {
                selectors.insert(
                    FieldType::FullName,
                    vec!["input[name='name']", "[data-qa='name-input']"],
                );
                selectors.insert(
                    FieldType::Email,
                    vec![
                        "input[name='email']",
                        "[data-qa='email-input']",
                        "input[type='email']",
                    ],
                );
                selectors.insert(
                    FieldType::Phone,
                    vec!["input[name='phone']", "[data-qa='phone-input']"],
                );
                selectors.insert(
                    FieldType::LinkedIn,
                    vec!["input[name*='linkedin']", "[data-qa='urls-input-linkedin']"],
                );
                selectors.insert(
                    FieldType::GitHub,
                    vec!["input[name*='github']", "[data-qa='urls-input-github']"],
                );
                selectors.insert(
                    FieldType::Resume,
                    vec!["input[type='file']", "[data-qa='resume-input']"],
                );
            }
            AtsPlatform::Workday => {
                // Workday uses dynamic IDs, so we use more generic selectors
                selectors.insert(
                    FieldType::FirstName,
                    vec![
                        "input[data-automation-id='legalNameSection_firstName']",
                        "input[id*='firstName']",
                    ],
                );
                selectors.insert(
                    FieldType::LastName,
                    vec![
                        "input[data-automation-id='legalNameSection_lastName']",
                        "input[id*='lastName']",
                    ],
                );
                selectors.insert(
                    FieldType::Email,
                    vec!["input[data-automation-id='email']", "input[type='email']"],
                );
                selectors.insert(
                    FieldType::Phone,
                    vec![
                        "input[data-automation-id='phone-number']",
                        "input[type='tel']",
                    ],
                );
                selectors.insert(FieldType::Resume, vec!["input[type='file']"]);
            }
            AtsPlatform::Taleo => {
                selectors.insert(
                    FieldType::FirstName,
                    vec!["input[id*='FirstName']", "input[name*='firstName']"],
                );
                selectors.insert(
                    FieldType::LastName,
                    vec!["input[id*='LastName']", "input[name*='lastName']"],
                );
                selectors.insert(
                    FieldType::Email,
                    vec!["input[id*='Email']", "input[type='email']"],
                );
                selectors.insert(
                    FieldType::Phone,
                    vec!["input[id*='Phone']", "input[type='tel']"],
                );
                selectors.insert(FieldType::Resume, vec!["input[type='file']"]);
            }
            AtsPlatform::AshbyHq => {
                selectors.insert(
                    FieldType::FullName,
                    vec!["input[name='name']", "[data-testid='name-input']"],
                );
                selectors.insert(
                    FieldType::Email,
                    vec!["input[name='email']", "input[type='email']"],
                );
                selectors.insert(
                    FieldType::Phone,
                    vec!["input[name='phone']", "input[type='tel']"],
                );
                selectors.insert(FieldType::LinkedIn, vec!["input[name*='linkedin']"]);
                selectors.insert(FieldType::Resume, vec!["input[type='file']"]);
            }
            _ => {
                // Generic selectors for unknown platforms
                selectors.insert(
                    FieldType::FirstName,
                    vec!["input[name*='first']", "input[id*='first']", "#firstName"],
                );
                selectors.insert(
                    FieldType::LastName,
                    vec!["input[name*='last']", "input[id*='last']", "#lastName"],
                );
                selectors.insert(
                    FieldType::FullName,
                    vec!["input[name='name']", "input[id='name']", "#name"],
                );
                selectors.insert(
                    FieldType::Email,
                    vec!["input[type='email']", "input[name*='email']", "#email"],
                );
                selectors.insert(
                    FieldType::Phone,
                    vec!["input[type='tel']", "input[name*='phone']", "#phone"],
                );
                selectors.insert(
                    FieldType::LinkedIn,
                    vec!["input[name*='linkedin']", "input[id*='linkedin']"],
                );
                selectors.insert(
                    FieldType::GitHub,
                    vec!["input[name*='github']", "input[id*='github']"],
                );
                selectors.insert(FieldType::Resume, vec!["input[type='file']"]);
            }
        }

        selectors
    }
}

/// Field types for form filling
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
enum FieldType {
    FirstName,
    LastName,
    FullName,
    Email,
    Phone,
    LinkedIn,
    GitHub,
    Portfolio,
    Website,
    Resume,
    CoverLetter,
    WorkAuthorized,
    RequiresSponsorship,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn make_test_profile() -> ApplicationProfile {
        ApplicationProfile {
            id: 1,
            full_name: "John Doe".to_string(),
            email: "john@example.com".to_string(),
            phone: Some("+1234567890".to_string()),
            linkedin_url: Some("https://linkedin.com/in/johndoe".to_string()),
            github_url: Some("https://github.com/johndoe".to_string()),
            portfolio_url: None,
            website_url: None,
            default_resume_id: None,
            resume_file_path: None,
            default_cover_letter_template: None,
            us_work_authorized: true,
            requires_sponsorship: false,
            max_applications_per_day: 10,
            require_manual_approval: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn make_screening_answer(pattern: &str, answer: &str) -> ScreeningAnswer {
        ScreeningAnswer {
            id: 1,
            question_pattern: pattern.to_string(),
            answer: answer.to_string(),
            answer_type: Some("text".to_string()),
            notes: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn test_get_greenhouse_selectors() {
        let selectors = FormFiller::get_field_selectors(&AtsPlatform::Greenhouse);
        assert!(selectors.contains_key(&FieldType::FirstName));
        assert!(selectors.contains_key(&FieldType::Email));
        assert!(selectors.contains_key(&FieldType::Resume));
    }

    #[test]
    fn test_get_lever_selectors() {
        let selectors = FormFiller::get_field_selectors(&AtsPlatform::Lever);
        assert!(selectors.contains_key(&FieldType::FullName));
        assert!(selectors.contains_key(&FieldType::Email));
    }

    #[test]
    fn test_get_unknown_selectors() {
        let selectors = FormFiller::get_field_selectors(&AtsPlatform::Unknown);
        // Unknown platform should still have generic selectors
        assert!(selectors.contains_key(&FieldType::Email));
        assert!(selectors.contains_key(&FieldType::Resume));
    }

    #[test]
    fn test_screening_answer_matching() {
        let profile = make_test_profile();
        let answers = vec![
            make_screening_answer("years.*experience", "5"),
            make_screening_answer("(?i)authorized.*work.*us", "Yes"),
            make_screening_answer("salary|compensation", "120000"),
            make_screening_answer("remote|work.*from.*home", "Yes, I prefer remote work"),
        ];

        let filler = FormFiller::new(profile, None).with_screening_answers(answers);

        // Test exact matches
        assert_eq!(
            filler.find_answer_for_question("How many years of experience do you have?"),
            Some("5".to_string())
        );
        assert_eq!(
            filler.find_answer_for_question("Are you authorized to work in the US?"),
            Some("Yes".to_string())
        );
        assert_eq!(
            filler.find_answer_for_question("What is your expected salary?"),
            Some("120000".to_string())
        );
        assert_eq!(
            filler.find_answer_for_question("Are you open to remote work from home?"),
            Some("Yes, I prefer remote work".to_string())
        );

        // Test non-matching question
        assert_eq!(
            filler.find_answer_for_question("What is your favorite color?"),
            None
        );
    }

    #[test]
    fn test_screening_answer_case_insensitive() {
        let profile = make_test_profile();
        let answers = vec![make_screening_answer("(?i)security.*clearance", "No")];

        let filler = FormFiller::new(profile, None).with_screening_answers(answers);

        // Should match regardless of case
        assert_eq!(
            filler.find_answer_for_question("Do you have a Security Clearance?"),
            Some("No".to_string())
        );
        assert_eq!(
            filler.find_answer_for_question("SECURITY CLEARANCE STATUS"),
            Some("No".to_string())
        );
    }

    #[test]
    fn test_truncate_question() {
        assert_eq!(
            FormFiller::truncate_question("Short", 30),
            "Short".to_string()
        );
        assert_eq!(
            FormFiller::truncate_question(
                "This is a very long question that should be truncated",
                30
            ),
            "This is a very long questio...".to_string()
        );
    }
}
