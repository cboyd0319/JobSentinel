//! Form Auto-Fill Logic
//!
//! Fills job application forms with user profile data.
//! Platform-specific selectors for each ATS type.

use super::browser::{AutomationPage, FillResult};
use super::profile::ApplicationProfile;
use super::AtsPlatform;
use anyhow::Result;
use std::collections::HashMap;
use std::path::PathBuf;

/// Form filler - fills application forms based on ATS platform
pub struct FormFiller {
    profile: ApplicationProfile,
    resume_path: Option<PathBuf>,
}

impl FormFiller {
    /// Create a new form filler with user profile
    pub fn new(profile: ApplicationProfile, resume_path: Option<PathBuf>) -> Self {
        Self {
            profile,
            resume_path,
        }
    }

    /// Fill the application form on the page
    ///
    /// Returns what was filled and what needs manual attention.
    /// Does NOT submit - user must click submit manually.
    pub async fn fill_page(
        &self,
        page: &AutomationPage,
        platform: &AtsPlatform,
    ) -> Result<FillResult> {
        let mut result = FillResult::new();

        // Check for CAPTCHA first
        if page.has_captcha().await {
            return Ok(result.with_captcha());
        }

        // Get platform-specific selectors
        let selectors = Self::get_field_selectors(platform);

        // Fill basic contact fields
        self.fill_contact_fields(page, &selectors, &mut result)
            .await;

        // Fill URLs (LinkedIn, GitHub, etc.)
        self.fill_url_fields(page, &selectors, &mut result).await;

        // Fill work authorization
        self.fill_work_auth_fields(page, &selectors, &mut result)
            .await;

        // Upload resume if available
        if let Some(ref resume_path) = self.resume_path {
            self.fill_resume(page, &selectors, resume_path, &mut result)
                .await;
        }

        // Check for CAPTCHA again after filling (some appear after form interaction)
        if page.has_captcha().await {
            return Ok(result.with_captcha());
        }

        result.ready_for_review = true;
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
}
