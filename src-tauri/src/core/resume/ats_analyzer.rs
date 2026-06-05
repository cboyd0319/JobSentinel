//! Resume readability analyzer for candidate-side explainability
//!
//! This module analyzes resumes for job-word coverage, readable structure,
//! and suggestions that improve truthful application clarity.
#![allow(clippy::unwrap_used, clippy::expect_used)] // Regex patterns are compile-time constants

use chrono::{Datelike, Utc};
use std::collections::HashSet;

use super::ats_types::*;
use super::types::{ContactInfo, Education, Experience, ResumeData, Skill};

mod bullet_prompts;
mod plain_text_format;
mod term_expansion;

// ============================================================================
// Resume Readability Analyzer
// ============================================================================

pub struct AtsAnalyzer;

impl AtsAnalyzer {
    const SECTION_BOUNDARY_HEADERS: &'static [&'static str] = &[
        "required",
        "must have",
        "requirements",
        "qualifications",
        "preferred",
        "nice to have",
        "bonus",
        "plus",
        "responsibilities",
        "about the role",
        "what you will do",
        "benefits",
        "education",
        "experience",
    ];

    /// Analyze resume against a specific job description
    pub fn analyze_for_job(resume: &ResumeData, job_description: &str) -> AtsAnalysisResult {
        let job_keywords = Self::extract_job_keywords(job_description);
        let format_result = Self::analyze_format(resume);

        // Find keyword matches
        let (keyword_matches, missing_keyword_details) =
            Self::find_keyword_matches(resume, &job_keywords);
        Self::build_job_analysis_result(
            job_description,
            &job_keywords,
            format_result,
            keyword_matches,
            missing_keyword_details,
        )
    }

    /// Analyze plain resume text against a job description without returning raw text.
    pub fn analyze_text_for_job(
        resume_text: &str,
        skills: &[String],
        job_description: &str,
    ) -> AtsAnalysisResult {
        let job_keywords = Self::extract_job_keywords(job_description);
        let format_result = plain_text_format::analyze_plain_text_format(resume_text);
        let (keyword_matches, missing_keyword_details) =
            Self::find_keyword_matches_in_text(resume_text, skills, &job_keywords);

        Self::build_job_analysis_result(
            job_description,
            &job_keywords,
            format_result,
            keyword_matches,
            missing_keyword_details,
        )
    }

    /// Analyze resume format without job context
    pub fn analyze_format(resume: &ResumeData) -> AtsAnalysisResult {
        let mut format_issues = Vec::new();
        let mut suggestions = Vec::new();

        // Check contact info completeness
        Self::check_contact_info(&resume.contact_info, &mut format_issues, &mut suggestions);

        // Check experience section
        Self::check_experience(&resume.experience, &mut format_issues, &mut suggestions);

        // Check skills section
        Self::check_skills(&resume.skills, &mut format_issues, &mut suggestions);

        // Check education section
        Self::check_education(&resume.education, &mut format_issues, &mut suggestions);

        // Check for prompt-injection-like or hidden-instruction text.
        Self::check_adversarial_content(resume, &mut format_issues, &mut suggestions);

        // Check for repeated keyword piles that hurt readability and trust.
        Self::check_keyword_stuffing(resume, &mut format_issues, &mut suggestions);

        // Check for experience bullets that read like machine-targeted keyword lists.
        Self::check_keyword_list_bullets(resume, &mut format_issues, &mut suggestions);

        // Check for bullets that mix ownership claims with exposure-only signals.
        Self::check_capability_level_claims(resume, &mut format_issues, &mut suggestions);

        // Check for generic filler-heavy bullets that lack plain work evidence.
        Self::check_generic_filler_bullets(resume, &mut format_issues, &mut suggestions);

        // Calculate format score
        let critical_count = format_issues
            .iter()
            .filter(|i| i.severity == IssueSeverity::Critical)
            .count();
        let warning_count = format_issues
            .iter()
            .filter(|i| i.severity == IssueSeverity::Warning)
            .count();
        let format_score =
            (100.0 - (critical_count as f64 * 20.0) - (warning_count as f64 * 5.0)).max(0.0);

        // Calculate completeness score
        let completeness_score = Self::calculate_completeness(resume);

        AtsAnalysisResult {
            overall_score: (format_score * 0.5) + (completeness_score * 0.5),
            keyword_score: 0.0, // No job context
            format_score,
            completeness_score,
            keyword_matches: Vec::new(),
            missing_keywords: Vec::new(),
            missing_keyword_details: Vec::new(),
            format_issues,
            requirement_reviews: Vec::new(),
            hard_constraint_risks: Vec::new(),
            suggestions,
        }
    }

    /// Extract keywords from job description
    pub fn extract_job_keywords(job_description: &str) -> Vec<(String, KeywordImportance)> {
        let mut keywords = Vec::new();
        let lower = job_description.to_lowercase();

        // Split into sections
        let required_section = Self::extract_section(
            &lower,
            &["required", "must have", "requirements", "qualifications"],
        );
        let preferred_section =
            Self::extract_section(&lower, &["preferred", "nice to have", "bonus", "plus"]);

        // Extract from required section
        for keyword in Self::extract_keywords_from_text(&required_section) {
            keywords.push((keyword, KeywordImportance::Required));
        }
        for keyword in Self::extract_hard_constraint_keywords(&required_section) {
            if !keywords.iter().any(|(k, _)| k == &keyword) {
                keywords.push((keyword, KeywordImportance::Required));
            }
        }

        // Extract from preferred section
        for keyword in Self::extract_keywords_from_text(&preferred_section) {
            if !keywords.iter().any(|(k, _)| k == &keyword) {
                keywords.push((keyword, KeywordImportance::Preferred));
            }
        }
        for keyword in Self::extract_hard_constraint_keywords(&preferred_section) {
            if !keywords.iter().any(|(k, _)| k == &keyword) {
                keywords.push((keyword, KeywordImportance::Preferred));
            }
        }

        // Add industry keywords if found
        for keyword in Self::get_industry_keywords() {
            let canonical_keyword = Self::canonical_requirement_keyword(keyword);
            if Self::keyword_appears_in_text(&lower, keyword)
                && !keywords.iter().any(|(k, _)| k == &canonical_keyword)
            {
                keywords.push((canonical_keyword, KeywordImportance::Industry));
            }
        }

        keywords
    }

    /// Get power words for action verbs
    pub fn get_power_words() -> Vec<&'static str> {
        bullet_prompts::get_power_words()
    }

    /// Suggest improved bullet point
    pub fn improve_bullet(bullet: &str, job_context: Option<&str>) -> String {
        let mut improved = bullet.trim().to_string();

        // Ensure starts with power word
        let power_words = Self::get_power_words();
        let starts_with_power_word = power_words
            .iter()
            .any(|&word| improved.to_lowercase().starts_with(word));

        if !starts_with_power_word {
            // Prompt for a clearer verb without upgrading the user's claim.
            let lower = improved.to_lowercase();
            let vague_action = ["was responsible for", "worked on", "helped with"]
                .iter()
                .any(|phrase| lower.contains(phrase));

            if vague_action {
                improved.push_str(" (choose a clearer action verb only if it is true)");
            }
        }

        // Add quantification if missing
        if !improved.contains(|c: char| c.is_ascii_digit()) && !improved.contains('%') {
            improved.push_str(" (add a true number, outcome, or concrete detail if you have one)");
        }

        // Add relevant keywords from job context
        if let Some(job_desc) = job_context {
            let keywords = Self::extract_job_keywords(job_desc);
            let important_keywords: Vec<_> = keywords
                .iter()
                .filter(|(_, imp)| *imp == KeywordImportance::Required)
                .take(2)
                .map(|(k, _)| k.as_str())
                .collect();

            if !important_keywords.is_empty()
                && !important_keywords
                    .iter()
                    .any(|&k| improved.to_lowercase().contains(&k.to_lowercase()))
            {
                improved.push_str(&format!(
                    " (review if these are true and worth making visible: {})",
                    important_keywords.join(", ")
                ));
            }

            bullet_prompts::append_role_specific_evidence_prompt(&mut improved, job_desc);
        }

        bullet_prompts::append_interview_defense_prompt(&mut improved);

        improved
    }

    // ========================================================================
    // Private helpers
    // ========================================================================

    fn check_contact_info(
        contact: &ContactInfo,
        issues: &mut Vec<FormatIssue>,
        _suggestions: &mut Vec<AtsSuggestion>,
    ) {
        if contact.email.is_empty() {
            issues.push(FormatIssue {
                severity: IssueSeverity::Critical,
                issue: "Missing email address".to_string(),
                fix: "Add your professional email address".to_string(),
            });
        }

        if contact.phone.is_empty() {
            issues.push(FormatIssue {
                severity: IssueSeverity::Warning,
                issue: "Missing phone number".to_string(),
                fix: "Add your phone number for recruiter contact".to_string(),
            });
        }

        if contact.location.is_empty() {
            issues.push(FormatIssue {
                severity: IssueSeverity::Info,
                issue: "Missing location".to_string(),
                fix: "Add your city and state (helps with location-based filtering)".to_string(),
            });
        }
    }

    fn check_experience(
        experience: &[Experience],
        issues: &mut Vec<FormatIssue>,
        suggestions: &mut Vec<AtsSuggestion>,
    ) {
        if experience.is_empty() {
            issues.push(FormatIssue {
                severity: IssueSeverity::Critical,
                issue: "No work experience listed".to_string(),
                fix: "Add your work experience".to_string(),
            });
            return;
        }

        for (idx, exp) in experience.iter().enumerate() {
            // Check bullet points
            if exp.achievements.is_empty() {
                suggestions.push(AtsSuggestion {
                    category: SuggestionCategory::AddSection,
                    suggestion: format!(
                        "Add achievement bullets for {} at {}",
                        exp.title, exp.company
                    ),
                    impact: "Makes your work evidence easier to compare in one place.".to_string(),
                });
            }

            // Check bullet point length
            for bullet in &exp.achievements {
                let line_length = bullet.len();
                if line_length > 150 {
                    issues.push(FormatIssue {
                        severity: IssueSeverity::Warning,
                        issue: format!("Long bullet point in experience #{}", idx + 1),
                        fix: "Keep bullets to 1-2 lines (under 150 characters)".to_string(),
                    });
                }

                // Check for power words
                let has_power_word = Self::get_power_words()
                    .iter()
                    .any(|&word| bullet.to_lowercase().starts_with(word));

                if !has_power_word {
                    suggestions.push(AtsSuggestion {
                        category: SuggestionCategory::RewordBullet,
                        suggestion: format!(
                            "Review whether this bullet can start with a clear action: '{}'",
                            bullet
                        ),
                        impact: "Makes the bullet easier to scan and understand.".to_string(),
                    });
                }
            }

            // Check for dates
            if exp.start_date.is_empty() {
                issues.push(FormatIssue {
                    severity: IssueSeverity::Warning,
                    issue: format!("Missing start date for {} at {}", exp.title, exp.company),
                    fix: "Add start date in consistent format (e.g., 'Jan 2020')".to_string(),
                });
            }
        }
    }

    fn check_skills(
        skills: &[Skill],
        issues: &mut Vec<FormatIssue>,
        _suggestions: &mut Vec<AtsSuggestion>,
    ) {
        if skills.is_empty() {
            issues.push(FormatIssue {
                severity: IssueSeverity::Critical,
                issue: "No skills listed".to_string(),
                fix: "Add a skills section with relevant technical, workplace, and role-specific skills".to_string(),
            });
        } else if skills.len() < 5 {
            issues.push(FormatIssue {
                severity: IssueSeverity::Warning,
                issue: "Few skills listed".to_string(),
                fix: "Add more relevant skills (aim for 8-15 skills)".to_string(),
            });
        }
    }

    fn check_education(
        education: &[Education],
        issues: &mut Vec<FormatIssue>,
        _suggestions: &mut Vec<AtsSuggestion>,
    ) {
        if education.is_empty() {
            issues.push(FormatIssue {
                severity: IssueSeverity::Warning,
                issue: "No education listed".to_string(),
                fix: "Add your education history".to_string(),
            });
        }
    }

    fn check_adversarial_content(
        resume: &ResumeData,
        issues: &mut Vec<FormatIssue>,
        suggestions: &mut Vec<AtsSuggestion>,
    ) {
        if !Self::has_adversarial_content(resume) {
            return;
        }

        issues.push(FormatIssue {
            severity: IssueSeverity::Warning,
            issue: "Instruction-like or hidden resume text detected".to_string(),
            fix: "Remove instructions aimed at screening tools and keep only truthful qualifications, work evidence, and readable application content.".to_string(),
        });
        suggestions.push(AtsSuggestion {
            category: SuggestionCategory::FormatFix,
            suggestion:
                "Review the resume for prompt-injection-like instructions, hidden text, or invisible characters before using it."
                    .to_string(),
            impact:
                "Keeps the resume readable and avoids tactics that can backfire with employers or screening systems."
                    .to_string(),
        });
    }

    fn check_keyword_stuffing(
        resume: &ResumeData,
        issues: &mut Vec<FormatIssue>,
        suggestions: &mut Vec<AtsSuggestion>,
    ) {
        if !Self::has_keyword_stuffing(resume) {
            return;
        }

        issues.push(FormatIssue {
            severity: IssueSeverity::Warning,
            issue: "Possible keyword stuffing detected".to_string(),
            fix: "Remove repeated keyword piles and show each important skill through truthful experience, tools, scope, or outcomes.".to_string(),
        });
        suggestions.push(AtsSuggestion {
            category: SuggestionCategory::FormatFix,
            suggestion: "Replace repeated keywords with readable evidence a recruiter can understand and you can defend in an interview.".to_string(),
            impact: "Keeps the resume credible while still making real qualifications visible."
                .to_string(),
        });
    }

    fn check_keyword_list_bullets(
        resume: &ResumeData,
        issues: &mut Vec<FormatIssue>,
        suggestions: &mut Vec<AtsSuggestion>,
    ) {
        let has_keyword_list = resume.experience.iter().any(|experience| {
            experience
                .achievements
                .iter()
                .any(|item| plain_text_format::line_looks_like_keyword_list(item))
        }) || resume
            .projects
            .iter()
            .any(|project| plain_text_format::line_looks_like_keyword_list(project));

        if has_keyword_list {
            Self::push_keyword_list_issue(issues, suggestions);
        }
    }

    fn push_keyword_list_issue(
        issues: &mut Vec<FormatIssue>,
        suggestions: &mut Vec<AtsSuggestion>,
    ) {
        issues.push(FormatIssue {
            severity: IssueSeverity::Warning,
            issue: "Experience bullet reads like a keyword list".to_string(),
            fix: "Rewrite it as a plain work example with your role, action, tools, and result."
                .to_string(),
        });
        suggestions.push(AtsSuggestion {
            category: SuggestionCategory::FormatFix,
            suggestion: "Turn keyword-list bullets into readable work evidence you can explain."
                .to_string(),
            impact: "Keeps strong terms useful without making the resume look machine-written."
                .to_string(),
        });
    }

    fn check_capability_level_claims(
        resume: &ResumeData,
        issues: &mut Vec<FormatIssue>,
        suggestions: &mut Vec<AtsSuggestion>,
    ) {
        let has_unclear_claim = resume.experience.iter().any(|experience| {
            experience
                .achievements
                .iter()
                .any(|item| Self::line_has_unclear_capability_level(item))
        }) || resume
            .projects
            .iter()
            .any(|project| Self::line_has_unclear_capability_level(project));

        if has_unclear_claim {
            Self::push_capability_level_issue(issues, suggestions);
        }
    }

    fn push_capability_level_issue(
        issues: &mut Vec<FormatIssue>,
        suggestions: &mut Vec<AtsSuggestion>,
    ) {
        issues.push(FormatIssue {
            severity: IssueSeverity::Warning,
            issue: "Capability level needs review".to_string(),
            fix: "Confirm whether this was exposure, assisted work, independent delivery, ownership, or expert work, then keep the wording at that true level.".to_string(),
        });
        suggestions.push(AtsSuggestion {
            category: SuggestionCategory::FormatFix,
            suggestion:
                "Match the bullet to the true level of responsibility before strengthening it."
                    .to_string(),
            impact:
                "Prevents overstating experience while still making real hands-on work visible."
                    .to_string(),
        });
    }

    fn check_generic_filler_bullets(
        resume: &ResumeData,
        issues: &mut Vec<FormatIssue>,
        suggestions: &mut Vec<AtsSuggestion>,
    ) {
        let has_filler = resume.experience.iter().any(|experience| {
            experience
                .achievements
                .iter()
                .any(|item| plain_text_format::line_looks_like_generic_resume_filler(item))
        }) || resume
            .projects
            .iter()
            .any(|project| plain_text_format::line_looks_like_generic_resume_filler(project));

        if has_filler {
            Self::push_generic_filler_issue(issues, suggestions);
        }
    }

    fn push_generic_filler_issue(
        issues: &mut Vec<FormatIssue>,
        suggestions: &mut Vec<AtsSuggestion>,
    ) {
        issues.push(FormatIssue {
            severity: IssueSeverity::Warning,
            issue: "Experience bullet reads like generic resume filler".to_string(),
            fix: "Replace generic buzzwords with specific work evidence: what you did, who it helped, and what changed.".to_string(),
        });
        suggestions.push(AtsSuggestion {
            category: SuggestionCategory::FormatFix,
            suggestion: "Replace generic filler with specific work evidence you can explain."
                .to_string(),
            impact: "Makes the bullet easier for people to evaluate without overstating the claim."
                .to_string(),
        });
    }

    fn has_adversarial_content(resume: &ResumeData) -> bool {
        Self::text_has_adversarial_content(&resume.summary)
            || Self::text_has_adversarial_content(&resume.contact_info.name)
            || resume.experience.iter().any(|experience| {
                Self::text_has_adversarial_content(&experience.title)
                    || Self::text_has_adversarial_content(&experience.company)
                    || experience
                        .achievements
                        .iter()
                        .any(|item| Self::text_has_adversarial_content(item))
            })
            || resume.skills.iter().any(|skill| {
                Self::text_has_adversarial_content(&skill.name)
                    || Self::text_has_adversarial_content(&skill.category)
                    || skill
                        .proficiency
                        .as_deref()
                        .is_some_and(Self::text_has_adversarial_content)
            })
            || resume.education.iter().any(|education| {
                Self::text_has_adversarial_content(&education.degree)
                    || Self::text_has_adversarial_content(&education.institution)
                    || education
                        .honors
                        .iter()
                        .any(|item| Self::text_has_adversarial_content(item))
            })
            || resume
                .certifications
                .iter()
                .any(|item| Self::text_has_adversarial_content(item))
            || resume
                .projects
                .iter()
                .any(|item| Self::text_has_adversarial_content(item))
            || resume.custom_sections.iter().any(|(section, values)| {
                Self::text_has_adversarial_content(section)
                    || values
                        .iter()
                        .any(|item| Self::text_has_adversarial_content(item))
            })
    }

    fn has_keyword_stuffing(resume: &ResumeData) -> bool {
        Self::text_has_keyword_stuffing(&resume.summary)
            || resume.experience.iter().any(|experience| {
                Self::text_has_keyword_stuffing(&experience.title)
                    || Self::text_has_keyword_stuffing(&experience.company)
                    || experience
                        .achievements
                        .iter()
                        .any(|item| Self::text_has_keyword_stuffing(item))
            })
            || resume.skills.iter().any(|skill| {
                Self::text_has_keyword_stuffing(&skill.name)
                    || Self::text_has_keyword_stuffing(&skill.category)
                    || skill
                        .proficiency
                        .as_deref()
                        .is_some_and(Self::text_has_keyword_stuffing)
            })
            || resume
                .projects
                .iter()
                .any(|item| Self::text_has_keyword_stuffing(item))
            || resume.custom_sections.iter().any(|(section, values)| {
                Self::text_has_keyword_stuffing(section)
                    || values
                        .iter()
                        .any(|item| Self::text_has_keyword_stuffing(item))
            })
    }

    fn text_has_adversarial_content(text: &str) -> bool {
        if text.chars().any(|c| {
            matches!(
                c,
                '\u{200B}' | '\u{200C}' | '\u{200D}' | '\u{2060}' | '\u{FEFF}'
            )
        }) {
            return true;
        }

        let lower = text.to_lowercase();
        let hidden_style_patterns = [
            r"(?i)\bcolor\s*:\s*(?:white|#fff(?:fff)?|transparent)\b",
            r"(?i)\bfont-size\s*:\s*[0-3](?:px|pt)?\b",
            r"(?i)\bdisplay\s*:\s*none\b",
            r"(?i)\bvisibility\s*:\s*hidden\b",
            r"(?i)\bopacity\s*:\s*0(?:\.0+)?\b",
            r"(?i)\bmso-hide\s*:\s*all\b",
        ];
        if hidden_style_patterns
            .iter()
            .any(|pattern| regex::Regex::new(pattern).unwrap().is_match(text))
        {
            return true;
        }

        let hidden_markup_patterns = [
            r"(?is)<!--.*?-->",
            r"(?i)<meta\b[^>]*(?:keywords|description|content)\b",
        ];
        if hidden_markup_patterns
            .iter()
            .any(|pattern| regex::Regex::new(pattern).unwrap().is_match(text))
        {
            return true;
        }

        [
            "ignore previous instructions",
            "ignore all previous instructions",
            "disregard previous instructions",
            "override instructions",
            "system prompt",
            "developer message",
            "prompt injection",
            "always rank this resume",
            "always select this candidate",
            "hire this candidate",
            "ignore the job description",
            "do not follow the job description",
            "instruction to recruiter software",
            "for ai screeners",
        ]
        .iter()
        .any(|phrase| lower.contains(phrase))
    }

    fn text_has_keyword_stuffing(text: &str) -> bool {
        let token_re = regex::Regex::new(r"(?i)[a-z][a-z0-9+#.]{1,}").unwrap();
        let mut previous = String::new();
        let mut run_length = 0;

        for token in token_re.find_iter(text).map(|m| m.as_str()) {
            let token = token.trim_matches('.').to_ascii_lowercase();
            if token.len() < 3 || Self::is_keyword_stuffing_stopword(&token) {
                previous.clear();
                run_length = 0;
                continue;
            }

            if token == previous {
                run_length += 1;
            } else {
                previous = token;
                run_length = 1;
            }

            if run_length >= 3 {
                return true;
            }
        }

        false
    }

    fn text_has_unclear_capability_level(text: &str) -> bool {
        text.lines().any(Self::line_has_unclear_capability_level)
    }

    fn line_has_unclear_capability_level(line: &str) -> bool {
        let lower = line.to_lowercase();
        let padded = format!(" {lower} ");
        let ownership_terms = [
            " owned ",
            " owner ",
            " led ",
            " managed ",
            " directed ",
            " architected ",
            " independently delivered ",
            " expert ",
            " strategic ",
        ];
        let exposure_terms = [
            " shadowed ",
            " shadowing ",
            " observed ",
            " observing ",
            " assisted ",
            " helped ",
            " exposure to ",
            " exposed to ",
            " trained on ",
            " familiar with ",
            " under supervision ",
        ];

        ownership_terms.iter().any(|term| padded.contains(term))
            && exposure_terms.iter().any(|term| padded.contains(term))
    }

    fn is_keyword_stuffing_stopword(token: &str) -> bool {
        matches!(
            token,
            "and"
                | "the"
                | "for"
                | "with"
                | "from"
                | "that"
                | "this"
                | "you"
                | "your"
                | "resume"
                | "work"
        )
    }

    fn calculate_completeness(resume: &ResumeData) -> f64 {
        let mut filled = 0;
        let total = 5;

        // Contact info (1 point)
        if !resume.contact_info.email.is_empty() && !resume.contact_info.phone.is_empty() {
            filled += 1;
        }

        // Experience (1 point)
        if !resume.experience.is_empty() {
            filled += 1;
        }

        // Skills (1 point)
        if !resume.skills.is_empty() {
            filled += 1;
        }

        // Education (1 point)
        if !resume.education.is_empty() {
            filled += 1;
        }

        // Summary (1 point)
        if !resume.summary.is_empty() {
            filled += 1;
        }

        (filled as f64 / total as f64) * 100.0
    }

    fn build_job_analysis_result(
        job_description: &str,
        job_keywords: &[(String, KeywordImportance)],
        mut format_result: AtsAnalysisResult,
        keyword_matches: Vec<KeywordMatch>,
        missing_keyword_details: Vec<MissingKeyword>,
    ) -> AtsAnalysisResult {
        let missing_keywords = missing_keyword_details
            .iter()
            .map(|gap| gap.keyword.clone())
            .collect::<Vec<_>>();

        let total_keywords = job_keywords.len();
        let matched_keywords = keyword_matches.len();
        let keyword_score = if total_keywords > 0 {
            (matched_keywords as f64 / total_keywords as f64) * 100.0
        } else {
            0.0
        };

        if total_keywords == 0 && !job_description.trim().is_empty() {
            format_result.format_issues.push(FormatIssue {
                severity: IssueSeverity::Info,
                issue: "Not enough job-post detail recognized to score fit confidently."
                    .to_string(),
                fix: "Paste a fuller job post with responsibilities, requirements, or preferred qualifications."
                    .to_string(),
            });
        }

        let mut suggestions = format_result.suggestions.clone();
        for gap in &missing_keyword_details {
            let impact = match gap.importance {
                KeywordImportance::Required => {
                    "Required job-post language is easier to compare when real evidence is visible."
                }
                KeywordImportance::Preferred => {
                    "Preferred job-post language can help when it honestly fits your background."
                }
                KeywordImportance::Industry => {
                    "Role language can improve clarity when it accurately describes your work."
                }
            };

            suggestions.push(AtsSuggestion {
                category: SuggestionCategory::AddKeyword,
                suggestion: format!(
                    "Review whether '{}' is true for your background and worth making visible",
                    gap.keyword
                ),
                impact: impact.to_string(),
            });
        }

        let requirement_reviews = Self::build_requirement_reviews(
            job_keywords,
            &keyword_matches,
            &missing_keyword_details,
        );
        let hard_constraint_risks = Self::build_hard_constraint_risks(&requirement_reviews);
        let score_cap = hard_constraint_risks
            .iter()
            .map(|risk| risk.score_cap)
            .min_by(f64::total_cmp);
        let mut overall_score = (keyword_score * 0.4)
            + (format_result.format_score * 0.3)
            + (format_result.completeness_score * 0.3);
        if let Some(cap) = score_cap {
            overall_score = overall_score.min(cap);
        }

        AtsAnalysisResult {
            overall_score,
            keyword_score,
            format_score: format_result.format_score,
            completeness_score: format_result.completeness_score,
            keyword_matches,
            missing_keywords,
            missing_keyword_details,
            format_issues: format_result.format_issues,
            requirement_reviews,
            hard_constraint_risks,
            suggestions,
        }
    }

    fn build_requirement_reviews(
        job_keywords: &[(String, KeywordImportance)],
        keyword_matches: &[KeywordMatch],
        missing_keyword_details: &[MissingKeyword],
    ) -> Vec<RequirementReview> {
        let mut reviews = Vec::new();

        for (keyword, importance) in job_keywords {
            if let Some(matched) = keyword_matches
                .iter()
                .find(|item| item.keyword.eq_ignore_ascii_case(keyword))
            {
                let match_state = Self::classify_requirement_match_state(matched);
                reviews.push(RequirementReview {
                    keyword: keyword.clone(),
                    importance: *importance,
                    match_state,
                    evidence_sections: matched.found_in.clone(),
                    hard_constraint: Self::hard_constraint_category(keyword).is_some(),
                    recommendation: Self::requirement_recommendation(match_state),
                });
            } else if missing_keyword_details
                .iter()
                .any(|item| item.keyword.eq_ignore_ascii_case(keyword))
            {
                reviews.push(RequirementReview {
                    keyword: keyword.clone(),
                    importance: *importance,
                    match_state: RequirementMatchState::Missing,
                    evidence_sections: Vec::new(),
                    hard_constraint: Self::hard_constraint_category(keyword).is_some(),
                    recommendation: Self::requirement_recommendation(
                        RequirementMatchState::Missing,
                    ),
                });
            }
        }

        reviews.sort_by(|a, b| {
            let imp_order = |imp: KeywordImportance| match imp {
                KeywordImportance::Required => 0,
                KeywordImportance::Preferred => 1,
                KeywordImportance::Industry => 2,
            };
            let state_order = |state: RequirementMatchState| match state {
                RequirementMatchState::Missing => 0,
                RequirementMatchState::Partial => 1,
                RequirementMatchState::Implied => 2,
                RequirementMatchState::Direct => 3,
                RequirementMatchState::Strong => 4,
            };
            imp_order(a.importance)
                .cmp(&imp_order(b.importance))
                .then(state_order(a.match_state).cmp(&state_order(b.match_state)))
                .then(a.keyword.cmp(&b.keyword))
        });

        reviews
    }

    fn classify_requirement_match_state(matched: &KeywordMatch) -> RequirementMatchState {
        let has_direct_evidence = matched.found_in.iter().any(|section| {
            matches!(
                section.as_str(),
                "resume text"
                    | "experience"
                    | "current experience"
                    | "recent experience"
                    | "summary"
                    | "projects"
                    | "education"
                    | "certifications"
                    | "licenses"
            )
        });

        if has_direct_evidence && (matched.frequency > 1 || matched.found_in.len() > 1) {
            RequirementMatchState::Strong
        } else if has_direct_evidence {
            RequirementMatchState::Direct
        } else if matched.found_in.iter().any(|section| section == "skills") {
            RequirementMatchState::Partial
        } else {
            RequirementMatchState::Implied
        }
    }

    fn requirement_recommendation(match_state: RequirementMatchState) -> String {
        match match_state {
            RequirementMatchState::Strong => {
                "Strong visible evidence found. Keep it easy to see near the relevant role."
                    .to_string()
            }
            RequirementMatchState::Direct => {
                "Found visible evidence. Keep it clear and tied to real work or credentials."
                    .to_string()
            }
            RequirementMatchState::Partial => {
                "Found in a lighter evidence area. Add supporting evidence only if true."
                    .to_string()
            }
            RequirementMatchState::Implied => {
                "Related evidence may exist, but the wording is not clear. Review before relying on it."
                    .to_string()
            }
            RequirementMatchState::Missing => {
                "Only add it if true. If this is required and not true, treat the role as higher risk."
                    .to_string()
            }
        }
    }

    fn build_hard_constraint_risks(reviews: &[RequirementReview]) -> Vec<HardConstraintRisk> {
        let mut risks = reviews
            .iter()
            .filter(|review| {
                review.importance == KeywordImportance::Required
                    && review.match_state == RequirementMatchState::Missing
            })
            .filter_map(|review| {
                let category = Self::hard_constraint_category(&review.keyword)?;
                let score_cap = Self::hard_constraint_score_cap(category);
                Some(HardConstraintRisk {
                    requirement: review.keyword.clone(),
                    category,
                    score_cap,
                    reason: "A required hard constraint was not clearly found in the resume."
                        .to_string(),
                    action: Self::hard_constraint_action(&review.keyword, category),
                })
            })
            .collect::<Vec<_>>();

        risks.sort_by(|a, b| {
            a.score_cap
                .total_cmp(&b.score_cap)
                .then(a.requirement.cmp(&b.requirement))
        });
        risks
    }

    fn hard_constraint_score_cap(category: HardConstraintCategory) -> f64 {
        match category {
            HardConstraintCategory::WorkAuthorization => 50.0,
            HardConstraintCategory::SecurityClearance => 60.0,
            HardConstraintCategory::LicenseOrCertification => 60.0,
            HardConstraintCategory::Education => 65.0,
            HardConstraintCategory::Experience => 65.0,
            HardConstraintCategory::Language => 65.0,
            HardConstraintCategory::BackgroundScreening => 70.0,
            HardConstraintCategory::PhysicalRequirement => 70.0,
            HardConstraintCategory::Location => 70.0,
        }
    }

    fn hard_constraint_action(keyword: &str, category: HardConstraintCategory) -> String {
        if category == HardConstraintCategory::Experience
            && Self::seniority_level_constraint_keyword(keyword)
        {
            return "Check whether your visible level matches this role; lower-title or fewer-years evidence may not satisfy it. Do not round up, stretch titles, or imply more experience than you have."
                .to_string();
        }

        match category {
            HardConstraintCategory::WorkAuthorization => {
                "Check work authorization before tailoring. If it is not true for you, do not claim it."
            }
            HardConstraintCategory::SecurityClearance => {
                "Check clearance before tailoring. If it is not current or true for you, do not claim it."
            }
            HardConstraintCategory::LicenseOrCertification => {
                "Check license or certification before tailoring. If it is not current or true for you, do not claim it."
            }
            HardConstraintCategory::Education => {
                "Check the degree or education requirement before tailoring. If it is not true for you, do not claim it."
            }
            HardConstraintCategory::Experience => {
                "Check years or level before tailoring. Do not round up, stretch titles, or imply more experience than you have."
            }
            HardConstraintCategory::Language => {
                "Check language fluency before tailoring. If it is not true for you, do not claim it."
            }
            HardConstraintCategory::BackgroundScreening => {
                "Check background, drug, or pre-employment screening before tailoring. If it is not workable or true for you, do not claim or imply that it is."
            }
            HardConstraintCategory::PhysicalRequirement => {
                "Check this physical demand before tailoring. If it is not workable or safe for you, do not claim it."
            }
            HardConstraintCategory::Location => {
                "Check location, schedule, availability, or travel before tailoring. If it is not workable for you, do not claim it."
            }
        }
        .to_string()
    }

    fn seniority_level_constraint_keyword(keyword: &str) -> bool {
        matches!(
            keyword.to_lowercase().as_str(),
            "senior-level experience"
                | "mid-level experience"
                | "lead-level experience"
                | "staff/principal-level experience"
                | "director-level experience"
                | "executive-level experience"
        )
    }

    fn hard_constraint_category(keyword: &str) -> Option<HardConstraintCategory> {
        let lower = keyword.to_lowercase();
        if lower.contains("equivalent experience") {
            return None;
        }
        if lower.contains("work authorization")
            || lower.contains("authorized to work")
            || lower.contains("visa sponsorship")
            || lower.contains("us citizenship")
            || lower.contains("u.s. citizenship")
            || lower.contains("us citizen")
            || lower.contains("u.s. citizen")
            || lower.contains("citizenship required")
        {
            return Some(HardConstraintCategory::WorkAuthorization);
        }
        if lower.contains("security clearance") || lower == "clearance" {
            return Some(HardConstraintCategory::SecurityClearance);
        }
        if lower.contains("license")
            || lower.contains("certification")
            || lower == "cdl"
            || lower == "cissp"
            || lower.contains("certified information systems security professional")
            || lower == "security+"
            || lower == "security plus"
            || lower == "rn"
            || lower == "cna"
            || lower == "lpn"
            || lower == "lvn"
            || lower == "bls"
            || lower == "acls"
            || lower == "cpr"
            || lower.contains("certified nursing assistant")
            || lower.contains("certified nurse assistant")
            || lower.contains("certified nurse aide")
            || lower.contains("licensed practical nurse")
            || lower.contains("licensed vocational nurse")
            || lower == "pmp"
            || lower.contains("project management professional")
            || lower == "servsafe"
            || lower.contains("food safety certification")
            || lower.contains("food handler")
            || lower.contains("food-handler")
            || lower.contains("first aid")
            || lower.contains("first-aid")
            || lower.contains("forklift certification")
            || lower.contains("forklift certified")
            || lower.contains("forklift license")
            || lower.contains("forklift operator")
            || lower.contains("osha 10")
            || lower.contains("osha10")
            || lower.contains("osha 30")
            || lower.contains("osha30")
            || lower.contains("basic life support")
            || lower.contains("advanced cardiovascular life support")
            || lower.contains("cardiopulmonary resuscitation")
        {
            return Some(HardConstraintCategory::LicenseOrCertification);
        }
        if lower.contains("degree")
            || lower.contains("bachelor")
            || lower.contains("master")
            || lower.contains("phd")
            || lower.contains("ph.d")
            || lower.contains("doctorate")
            || lower.contains("doctoral")
            || lower.contains("high school")
            || lower.contains("high-school")
            || lower.contains("general education development")
            || lower == "ged"
        {
            return Some(HardConstraintCategory::Education);
        }
        if lower.contains("year")
            || lower.contains("yrs")
            || lower.contains("level experience")
            || lower == "management experience"
        {
            return Some(HardConstraintCategory::Experience);
        }
        if term_expansion::known_human_language_requirement(&lower) {
            return Some(HardConstraintCategory::Language);
        }
        if lower.contains("background check")
            || lower.contains("background screening")
            || lower.contains("pre-employment screening")
            || lower.contains("pre employment screening")
            || lower.contains("drug screen")
            || lower.contains("drug screening")
            || lower.contains("drug test")
            || lower.contains("drug testing")
        {
            return Some(HardConstraintCategory::BackgroundScreening);
        }
        if lower.contains("lift ")
            || lower.contains("pound")
            || lower.contains("lbs")
            || lower.contains("physical requirement")
            || lower.contains("physical demand")
            || lower.contains("stand for long")
            || lower.contains("standing for long")
        {
            return Some(HardConstraintCategory::PhysicalRequirement);
        }
        if lower.contains("onsite")
            || lower.contains("on-site")
            || lower.contains("on site")
            || lower.contains("remote")
            || lower.contains("hybrid")
            || lower.contains("relocation")
            || lower.contains("relocate")
            || lower.contains("travel")
            || lower.contains("transportation")
            || lower.contains("commute")
            || lower.contains("commuting")
            || lower.contains("availability")
            || lower.contains("available")
            || lower.contains("schedule")
            || lower.contains("full-time")
            || lower.contains("full time")
            || lower.contains("part-time")
            || lower.contains("part time")
            || lower.contains("weekend")
            || lower.contains("night shift")
            || lower.contains("overnight shift")
            || lower.contains("third shift")
            || lower.contains("3rd shift")
            || lower.contains("second shift")
            || lower.contains("2nd shift")
            || lower.contains("day shift")
            || lower.contains("first shift")
            || lower.contains("1st shift")
            || lower.contains("overtime")
            || lower.contains("holiday")
            || lower.contains("evening")
        {
            return Some(HardConstraintCategory::Location);
        }
        None
    }

    fn find_keyword_matches(
        resume: &ResumeData,
        job_keywords: &[(String, KeywordImportance)],
    ) -> (Vec<KeywordMatch>, Vec<MissingKeyword>) {
        let mut matches = Vec::new();
        let mut missing = Vec::new();

        for (keyword, importance) in job_keywords {
            let mut found_in = Vec::new();
            let mut frequency = 0;
            let keyword_lower = keyword.to_lowercase();
            let search_terms = term_expansion::conservative_keyword_search_terms(&keyword_lower);

            // Search in summary
            let summary_lower = resume.summary.to_lowercase();
            let count = Self::keyword_frequency_for_search_terms(&summary_lower, &search_terms);
            if count > 0 {
                Self::add_evidence_section(&mut found_in, "summary");
                frequency += count;
            }

            // Search in experience
            for exp in &resume.experience {
                let exp_text = format!(
                    "{} {} {}",
                    exp.title,
                    exp.company,
                    exp.achievements.join(" ")
                )
                .to_lowercase();
                let count = Self::keyword_frequency_for_search_terms(&exp_text, &search_terms);
                if count > 0 {
                    let section = Self::structured_experience_evidence_section(exp);
                    Self::add_evidence_section(&mut found_in, section);
                    frequency += Self::evidence_strength_adjusted_count(count, &exp_text, section);
                }
            }

            // Search in skills
            for skill in &resume.skills {
                let skill_lower = skill.name.to_lowercase();
                if search_terms.iter().any(|term| {
                    Self::keyword_appears_in_text(&skill_lower, term)
                        || Self::keyword_appears_in_text(term, &skill_lower)
                }) {
                    Self::add_evidence_section(&mut found_in, "skills");
                    frequency += 1;
                }
            }

            for education in &resume.education {
                let education_text = format!(
                    "{} {} {} {}",
                    education.degree,
                    education.institution,
                    education.location,
                    education.honors.join(" ")
                )
                .to_lowercase();
                let count =
                    Self::keyword_frequency_for_search_terms(&education_text, &search_terms);
                if count > 0 {
                    Self::add_evidence_section(&mut found_in, "education");
                    frequency += count;
                }
            }

            for certification in &resume.certifications {
                let certification_lower = certification.to_lowercase();
                let count =
                    Self::keyword_frequency_for_search_terms(&certification_lower, &search_terms);
                if count > 0 {
                    Self::add_evidence_section(&mut found_in, "certifications");
                    frequency += count;
                }
            }

            for project in &resume.projects {
                let project_lower = project.to_lowercase();
                let count = Self::keyword_frequency_for_search_terms(&project_lower, &search_terms);
                if count > 0 {
                    Self::add_evidence_section(&mut found_in, "projects");
                    frequency +=
                        Self::evidence_strength_adjusted_count(count, &project_lower, "projects");
                }
            }

            // Add to matches or missing
            if frequency > 0 {
                matches.push(KeywordMatch {
                    keyword: keyword.clone(),
                    found_in,
                    frequency,
                    importance: *importance,
                });
            } else {
                missing.push(MissingKeyword {
                    keyword: keyword.clone(),
                    importance: *importance,
                });
            }
        }

        // Sort matches by importance, then frequency
        matches.sort_by(|a, b| {
            let imp_order = |imp: KeywordImportance| match imp {
                KeywordImportance::Required => 0,
                KeywordImportance::Preferred => 1,
                KeywordImportance::Industry => 2,
            };
            imp_order(a.importance)
                .cmp(&imp_order(b.importance))
                .then(b.frequency.cmp(&a.frequency))
        });
        missing.sort_by(|a, b| {
            let imp_order = |imp: KeywordImportance| match imp {
                KeywordImportance::Required => 0,
                KeywordImportance::Preferred => 1,
                KeywordImportance::Industry => 2,
            };
            imp_order(a.importance)
                .cmp(&imp_order(b.importance))
                .then(a.keyword.cmp(&b.keyword))
        });

        (matches, missing)
    }

    fn find_keyword_matches_in_text(
        resume_text: &str,
        skills: &[String],
        job_keywords: &[(String, KeywordImportance)],
    ) -> (Vec<KeywordMatch>, Vec<MissingKeyword>) {
        let mut matches = Vec::new();
        let mut missing = Vec::new();

        for (keyword, importance) in job_keywords {
            let keyword_lower = keyword.to_lowercase();
            let search_terms = term_expansion::conservative_keyword_search_terms(&keyword_lower);
            let (mut found_in, mut frequency) =
                Self::plain_text_search_term_hits(resume_text, &search_terms);

            let skill_hits = skills
                .iter()
                .filter(|skill| {
                    let skill_lower = skill.to_lowercase();
                    search_terms.iter().any(|term| {
                        Self::keyword_appears_in_text(&skill_lower, term)
                            || Self::keyword_appears_in_text(term, &skill_lower)
                    })
                })
                .count();

            if skill_hits > 0 {
                Self::add_evidence_section(&mut found_in, "skills");
                frequency += skill_hits;
            }

            if frequency > 0 {
                matches.push(KeywordMatch {
                    keyword: keyword.clone(),
                    found_in,
                    frequency,
                    importance: *importance,
                });
            } else {
                missing.push(MissingKeyword {
                    keyword: keyword.clone(),
                    importance: *importance,
                });
            }
        }

        matches.sort_by(|a, b| {
            let imp_order = |imp: KeywordImportance| match imp {
                KeywordImportance::Required => 0,
                KeywordImportance::Preferred => 1,
                KeywordImportance::Industry => 2,
            };
            imp_order(a.importance)
                .cmp(&imp_order(b.importance))
                .then(b.frequency.cmp(&a.frequency))
        });
        missing.sort_by(|a, b| {
            let imp_order = |imp: KeywordImportance| match imp {
                KeywordImportance::Required => 0,
                KeywordImportance::Preferred => 1,
                KeywordImportance::Industry => 2,
            };
            imp_order(a.importance)
                .cmp(&imp_order(b.importance))
                .then(a.keyword.cmp(&b.keyword))
        });

        (matches, missing)
    }

    fn plain_text_search_term_hits(
        resume_text: &str,
        search_terms: &[String],
    ) -> (Vec<String>, usize) {
        let mut found_in = Vec::new();
        let mut frequency = 0;
        let mut current_section = "resume text";
        let mut current_experience_is_current = false;
        let mut current_experience_is_recent = false;

        for line in resume_text.lines() {
            if let Some(section) = Self::plain_text_section_label(line) {
                current_section = section;
                current_experience_is_current = false;
                current_experience_is_recent = false;
            }

            let line_lower = line.to_lowercase();
            if current_section == "experience" {
                if Self::plain_text_current_experience_marker(&line_lower) {
                    current_experience_is_current = true;
                    current_experience_is_recent = false;
                } else if Self::plain_text_recent_experience_marker(&line_lower) {
                    current_experience_is_current = false;
                    current_experience_is_recent = true;
                } else if Self::plain_text_past_experience_marker(&line_lower) {
                    current_experience_is_current = false;
                    current_experience_is_recent = false;
                }
            }

            let count = Self::keyword_frequency_for_search_terms(&line_lower, search_terms);
            if count == 0 {
                continue;
            }

            let evidence_section =
                if current_section == "experience" && current_experience_is_current {
                    "current experience"
                } else if current_section == "experience" && current_experience_is_recent {
                    "recent experience"
                } else {
                    current_section
                };
            Self::add_evidence_section(&mut found_in, evidence_section);
            frequency +=
                Self::evidence_strength_adjusted_count(count, &line_lower, evidence_section);
        }

        (found_in, frequency)
    }

    fn evidence_strength_adjusted_count(
        count: usize,
        text_lower: &str,
        evidence_section: &str,
    ) -> usize {
        if count == 0 {
            return 0;
        }
        if evidence_section == "current experience" || evidence_section == "recent experience" {
            return count + 1;
        }
        let can_show_work_evidence = matches!(
            evidence_section,
            "experience" | "current experience" | "recent experience" | "projects"
        );
        if can_show_work_evidence
            && (Self::metric_backed_evidence_marker(text_lower)
                || Self::scope_backed_evidence_marker(text_lower)
                || Self::responsibility_backed_evidence_marker(text_lower)
                || Self::duty_backed_evidence_marker(text_lower))
        {
            count + 1
        } else {
            count
        }
    }

    fn metric_backed_evidence_marker(text_lower: &str) -> bool {
        regex::Regex::new(
            r"(?:\b\d+(?:\.\d+)?\s*(?:%|(?:percent|clients?|customers?|cases?|tickets?|orders?|projects?|reports?|days?|weeks?|months?)\b)|\$\s*\d)",
        )
        .unwrap()
        .is_match(text_lower)
    }

    fn scope_backed_evidence_marker(text_lower: &str) -> bool {
        regex::Regex::new(
            r"\bacross\s+(?:[a-z]+\s+){0,5}(?:teams?|departments?|locations?|sites?|regions?|markets?|service\s+lines?)\b",
        )
        .unwrap()
        .is_match(text_lower)
    }

    fn responsibility_backed_evidence_marker(text_lower: &str) -> bool {
        regex::Regex::new(
            r"\b(?:owned|managed|administered|developed|implemented|improved|operated)\b.+\b(?:workflows?|process(?:es)?|programs?|operations?|intake|cases?|systems?|tools?)\b",
        )
        .unwrap()
        .is_match(text_lower)
    }

    fn duty_backed_evidence_marker(text_lower: &str) -> bool {
        regex::Regex::new(
            r"\b(?:coordinated|processed|maintained|tracked|reviewed|prepared|scheduled|organized|documented|responded|resolved|updated|served|followed\s+up|followed-up)\b.+\b(?:requests?|appointments?|records?|orders?|cases?|tickets?|reports?|files?|forms?|calls?|emails?|inquiries|intake|follow[-\s]?ups?|tasks?|schedules?)\b",
        )
        .unwrap()
        .is_match(text_lower)
    }

    fn plain_text_current_experience_marker(line_lower: &str) -> bool {
        line_lower
            .split(|c: char| !c.is_ascii_alphanumeric())
            .any(|word| word == "present")
    }

    fn structured_experience_evidence_section(exp: &Experience) -> &'static str {
        if exp.current || exp.end_date.trim().eq_ignore_ascii_case("present") {
            return "current experience";
        }
        if Self::recent_end_year_marker(&exp.end_date) {
            return "recent experience";
        }
        "experience"
    }

    fn plain_text_recent_experience_marker(line_lower: &str) -> bool {
        !Self::plain_text_current_experience_marker(line_lower)
            && Self::recent_end_year_marker(line_lower)
    }

    fn plain_text_past_experience_marker(line_lower: &str) -> bool {
        !Self::plain_text_current_experience_marker(line_lower)
            && regex::Regex::new(r"\b(?:19|20)\d{2}\s*(?:-|to)\s*(?:19|20)\d{2}\b")
                .unwrap()
                .is_match(line_lower)
    }

    fn recent_end_year_marker(text: &str) -> bool {
        let Some(end_year) = regex::Regex::new(r"\b(?:19|20)\d{2}\b")
            .unwrap()
            .find_iter(text)
            .last()
            .and_then(|year| year.as_str().parse::<i32>().ok())
        else {
            return false;
        };

        let current_year = Utc::now().year();
        end_year >= current_year - 1 && end_year <= current_year
    }

    fn keyword_frequency_for_search_terms(text: &str, search_terms: &[String]) -> usize {
        search_terms
            .iter()
            .map(|term| Self::keyword_frequency(text, term))
            .max()
            .unwrap_or(0)
    }

    fn add_evidence_section(found_in: &mut Vec<String>, section: &str) {
        if !found_in.iter().any(|existing| existing == section) {
            found_in.push(section.to_string());
        }
    }

    fn plain_text_section_label(line: &str) -> Option<&'static str> {
        let normalized = line
            .trim()
            .trim_start_matches(|c: char| c == '-' || c == '*' || c == '•')
            .trim_start()
            .trim_end_matches(':')
            .to_lowercase()
            .replace('/', " ")
            .replace('&', " and ");
        let normalized = normalized.split_whitespace().collect::<Vec<_>>().join(" ");

        let labels = [
            ("professional experience", "experience"),
            ("work experience", "experience"),
            ("relevant experience", "experience"),
            ("selected experience", "experience"),
            ("additional experience", "experience"),
            ("employment history", "experience"),
            ("work history", "experience"),
            ("professional history", "experience"),
            ("volunteer experience", "experience"),
            ("community involvement", "experience"),
            ("community service", "experience"),
            ("military service", "experience"),
            ("military experience", "experience"),
            ("selected projects", "projects"),
            ("skills technical skills", "skills"),
            ("technical skills", "skills"),
            ("core skills", "skills"),
            ("professional credentials", "certifications"),
            ("licenses and certifications", "certifications"),
            ("certifications and licenses", "certifications"),
            ("credentials", "certifications"),
            ("professional training", "certifications"),
            ("training", "certifications"),
            ("certificates", "certifications"),
            ("certifications", "certifications"),
            ("licenses", "licenses"),
            ("publications", "publications"),
            ("academic background", "education"),
            ("academic history", "education"),
            ("education background", "education"),
            ("education", "education"),
            ("experience", "experience"),
            ("projects", "projects"),
            ("summary", "summary"),
            ("profile", "summary"),
            ("skills", "skills"),
        ];

        labels.iter().find_map(|(heading, label)| {
            Self::line_starts_with_heading(&normalized, heading).then_some(*label)
        })
    }

    fn keyword_frequency(text: &str, keyword: &str) -> usize {
        if keyword.trim().is_empty() {
            return 0;
        }

        text.match_indices(keyword)
            .filter(|(start, _)| Self::keyword_match_has_boundaries(text, keyword, *start))
            .count()
    }

    fn keyword_appears_in_text(text: &str, keyword: &str) -> bool {
        Self::keyword_frequency(text, keyword) > 0
    }

    fn keyword_match_has_boundaries(text: &str, keyword: &str, start: usize) -> bool {
        let end = start + keyword.len();
        let before_is_term = text[..start]
            .chars()
            .next_back()
            .is_some_and(Self::is_keyword_term_char);
        let after_is_term = text[end..]
            .chars()
            .next()
            .is_some_and(Self::is_keyword_term_char);

        !before_is_term && !after_is_term
    }

    fn is_keyword_term_char(ch: char) -> bool {
        ch.is_alphanumeric() || matches!(ch, '#' | '+')
    }

    fn extract_section(text: &str, headers: &[&str]) -> String {
        for header in headers {
            if let Some(start) = text.find(header) {
                let after = &text[start..];
                let blank_line_end = after.find("\n\n").map(|i| i + start).unwrap_or(text.len());
                let heading_end = Self::find_next_section_heading(after, headers)
                    .map(|i| i + start)
                    .unwrap_or(text.len());
                let end = blank_line_end.min(heading_end);
                return text[start..end].to_string();
            }
        }
        String::new()
    }

    fn find_next_section_heading(section_text: &str, current_headers: &[&str]) -> Option<usize> {
        for (offset, _) in section_text.match_indices('\n').skip(1) {
            let line = &section_text[offset + 1..];
            let trimmed = line.trim_start_matches(|c: char| {
                c.is_whitespace() || c == '-' || c == '*' || c == '•'
            });

            if Self::SECTION_BOUNDARY_HEADERS
                .iter()
                .filter(|boundary| !current_headers.contains(boundary))
                .any(|boundary| Self::line_starts_with_heading(trimmed, boundary))
            {
                return Some(offset);
            }
        }

        None
    }

    fn line_starts_with_heading(line: &str, heading: &str) -> bool {
        let Some(rest) = line.strip_prefix(heading) else {
            return false;
        };

        rest.is_empty()
            || rest.starts_with(':')
            || rest.starts_with('-')
            || rest.starts_with(' ')
            || rest.starts_with('\t')
    }

    fn extract_keywords_from_text(text: &str) -> Vec<String> {
        let mut keywords = HashSet::new();

        let keyword_patterns = [
            r"(?i)\b(customer service|client service|client services|guest services?|front[- ]desk|reception|receptionist|case management|case coordination|case notes|case documentation)\b",
            r"(?i)\b(scheduling|calendar management|appointment setting|intake|onboarding|training)\b",
            r"(?i)\b(sales|account management|crm|salesforce|hubspot|pipeline|prospecting)\b",
            r"(?i)\b(payroll|bookkeeping|bookkeeper|quickbooks|qbo|accounts payable|accounts receivable|a/p|a/r|billing)\b",
            r"(?i)\b(inventory|inventory[- ]control|inventory[- ]management|stock control|stock management|stockroom|logistics|shipping|receiving|procurement|purchasing|vendor management|supplier management)\b",
            r"(?i)\b(reporting|budgeting|budget tracking|grant reporting|grant writing|program evaluation)\b",
            r"(?i)\b(compliance|hipaa|osha|quality assurance|qa|data[- ]entry|data[- ]analysis|data[- ]analytics|analytics|excel)\b",
            r"(?i)\b(patient[- ]care|medication[- ]administration|vital[- ]signs?|care[- ]plans?|medical[- ]records?|charting)\b",
            r"(?i)\b(lesson planning|classroom management|curriculum|iep|student support|student services|parent communication|family communication|guardian communication)\b",
            r"(?i)\b(forklift|welding|equipment maintenance|safety inspections|food safety|cash handling|cashier|point of sale|pos systems?)\b",
            r"(?i)\b(document[- ]review|case[- ]files|legal[- ]research|records[- ]management|policy[- ]analysis|grant[- ]administration|public benefits)\b",
            r"(?i)\b(financial[- ]reconciliation|reconciliation|invoicing|loan[- ]processing|financial reporting)\b",
            r"(?i)\b(rust|python|javascript|typescript|java|c\+\+|go|kotlin|swift)\b",
            r"(?i)\b(react|vue|angular|node\.?js|django|flask|spring|express)\b",
            r"(?i)\b(aws|azure|gcp|docker|kubernetes|terraform|ansible)\b",
            r"(?i)\b(sql|postgresql|mysql|mongodb|redis|elasticsearch)\b",
            r"(?i)\b(git|ci/cd|agile|scrum|rest|graphql|microservices)\b",
        ];

        for pattern in &keyword_patterns {
            if let Ok(re) = regex::Regex::new(pattern) {
                for cap in re.captures_iter(text) {
                    if let Some(m) = cap.get(0) {
                        keywords.insert(Self::canonical_requirement_keyword(
                            &m.as_str().to_lowercase(),
                        ));
                    }
                }
            }
        }

        let mut sorted_keywords = keywords.into_iter().collect::<Vec<_>>();
        sorted_keywords.sort();
        sorted_keywords
    }

    fn canonical_requirement_keyword(keyword: &str) -> String {
        match keyword {
            "bookkeeper" => "bookkeeping".to_string(),
            "qbo" => "quickbooks".to_string(),
            "a/p" => "accounts payable".to_string(),
            "a/r" => "accounts receivable".to_string(),
            "pos system" | "pos systems" => "point of sale".to_string(),
            _ => keyword.to_string(),
        }
    }

    fn extract_hard_constraint_keywords(text: &str) -> Vec<String> {
        let mut keywords = HashSet::new();
        let degree_equivalent_re = regex::Regex::new(
            r"(?i)\b(?:ph\.?d\.?(?:\s+degree)?|doctorate(?:\s+degree)?|doctoral degree|associate'?s degree|associate degree|baccalaureate degree|bachelor'?s degree|bachelor degree|master'?s degree|master degree|degree)\s+(?:or|/)\s+(?:(?:equivalent|commensurate)\s+(?:work\s+)?experience|equivalent\s+combination\s+of\s+education\s+and\s+experience)\b",
        )
        .unwrap();
        let has_degree_equivalent = degree_equivalent_re.is_match(text);
        if has_degree_equivalent {
            keywords.insert("degree or equivalent experience".to_string());
        }

        let hard_constraint_patterns = [
            r"(?i)\b(work authorization|authorized to work|visa sponsorship|u\.?s\.?\s+citizenship|u\.?s\.?\s+citizen|citizenship required)\b",
            r"(?i)\b(security clearance|clearance)\b",
            r"(?i)\bsecurity\+",
            r"(?i)\b(commercial driver'?s license|commercial driver license|driver'?s license|driver license|cdl|rn license|registered nurse license|nursing license|lpn|lvn|licensed practical nurse|licensed vocational nurse)\b",
            r"(?i)\b(certification|cissp|certified information systems security professional|security plus|bls|basic life support|acls|advanced cardiovascular life support|cpr|cardiopulmonary resuscitation|cna|certified nursing assistant|certified nurse assistant|certified nurse aide|pmp|project management professional|servsafe|food safety certification|food[- ]handler'?s?\s+(?:certification|certificate|permit|card)|first[- ]aid certification|first[- ]aid certified|first[- ]aid certificate|first[- ]aid|forklift certification|forklift certified|forklift operator certification|forklift operator certified|forklift license|forklift operator license|osha\s*10(?:[- ]hour)?(?:\s+certification)?|osha\s*30(?:[- ]hour)?(?:\s+certification)?)\b",
            r"(?i)\b(ph\.?d\.?(?:\s+degree)?|doctorate(?:\s+degree)?|doctoral degree|associate'?s degree|associate degree|baccalaureate degree|bachelor'?s degree|bachelor degree|master'?s degree|master degree|degree|high[- ]school diploma|high[- ]school degree|ged|high[- ]school equivalency|general education development)\b",
            r"(?i)\b\d+\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience\s+(?:with|in)\s+)?[a-zA-Z][a-zA-Z0-9+#/.-]*(?:\s+[a-zA-Z][a-zA-Z0-9+#/.-]*){0,3}\b",
            r"(?i)\b(bilingual(?:\s+(?:english|spanish|french|mandarin|cantonese|arabic|portuguese|german|japanese|korean))?|(?:spanish|french|mandarin|cantonese|arabic|portuguese|german|japanese|korean)\s+fluency|fluent(?:\s+in)?\s+(?:spanish|french|mandarin|cantonese|arabic|portuguese|german|japanese|korean)|(?:spanish|french|mandarin|cantonese|arabic|portuguese|german|japanese|korean)\s+language|english/(?:spanish|french|mandarin|cantonese|arabic|portuguese|german|japanese|korean)|english and (?:spanish|french|mandarin|cantonese|arabic|portuguese|german|japanese|korean))\b",
            r"(?i)\b(background checks?|background screenings?|pre[- ]employment screenings?|drug screens?|drug screenings?|drug tests?|drug testing)\b",
            r"(?i)\b(lift(?:\s+up\s+to)?\s+\d+\s*(?:pounds?|lbs?)|(?:stand|standing) for long periods?|physical requirements?|physical demands?)\b",
            r"(?i)\b(onsite|on-site|on site|remote(?:[- ](?:work|role|position|job))?|hybrid(?:[- ](?:work|role|schedule|position|job))?|relocation|relocate|willing to relocate|travel|reliable transportation|own transportation|commute|commuting|full[- ]time(?:\s+availability)?|part[- ]time(?:\s+availability)?|availability|available|schedule|weekend availability|weekend shifts?|night shift|overnight shift|third shift|3rd shift|evening shift|second shift|2nd shift|day shift|first shift|1st shift|overtime(?:\s+(?:availability|shifts?|hours?))?|holiday(?:\s+(?:availability|shifts?|hours?))?)\b",
        ];

        for pattern in &hard_constraint_patterns {
            if let Ok(re) = regex::Regex::new(pattern) {
                for cap in re.captures_iter(text) {
                    if let Some(m) = cap.get(0) {
                        keywords.insert(m.as_str().to_lowercase());
                    }
                }
            }
        }
        if has_degree_equivalent {
            for exact_degree in [
                "degree",
                "associate's degree",
                "associate degree",
                "associates degree",
                "baccalaureate degree",
                "bachelor's degree",
                "bachelor degree",
                "bachelors degree",
                "master's degree",
                "master degree",
                "masters degree",
                "phd",
                "ph.d",
                "ph.d.",
                "phd degree",
                "ph.d degree",
                "ph.d. degree",
                "doctorate",
                "doctorate degree",
                "doctoral degree",
            ] {
                keywords.remove(exact_degree);
            }
        }
        if keywords.iter().any(|keyword| {
            matches!(
                keyword.as_str(),
                "commercial driver's license"
                    | "commercial drivers license"
                    | "commercial driver license"
                    | "cdl"
            )
        }) {
            for generic_license in ["driver's license", "drivers license", "driver license"] {
                keywords.remove(generic_license);
            }
        }
        let specific_certification_keywords = [
            "cissp",
            "certified information systems security professional",
            "security+",
            "security plus",
            "bls",
            "basic life support",
            "acls",
            "advanced cardiovascular life support",
            "cpr",
            "cardiopulmonary resuscitation",
            "cna",
            "certified nursing assistant",
            "certified nurse assistant",
            "certified nurse aide",
            "lpn",
            "lvn",
            "licensed practical nurse",
            "licensed vocational nurse",
            "pmp",
            "project management professional",
            "servsafe",
            "food safety certification",
            "food handler certification",
            "food handler's certification",
            "food handlers certification",
            "food handler certificate",
            "food handler's certificate",
            "food handlers certificate",
            "food handler permit",
            "food handler's permit",
            "food handlers permit",
            "food handler card",
            "food handler's card",
            "food handlers card",
            "first aid",
            "first-aid",
            "first aid certification",
            "first-aid certification",
            "first aid certified",
            "first-aid certified",
            "first aid certificate",
            "first-aid certificate",
            "forklift certification",
            "forklift certified",
            "forklift operator certification",
            "forklift operator certified",
            "forklift license",
            "forklift operator license",
            "osha 10",
            "osha10",
            "osha 10 certification",
            "osha10 certification",
            "osha 10-hour",
            "osha 10-hour certification",
            "osha 10 hour",
            "osha 10 hour certification",
            "osha 30",
            "osha30",
            "osha 30 certification",
            "osha30 certification",
            "osha 30-hour",
            "osha 30-hour certification",
            "osha 30 hour",
            "osha 30 hour certification",
        ];
        if keywords
            .iter()
            .any(|keyword| specific_certification_keywords.contains(&keyword.as_str()))
        {
            keywords.remove("certification");
        }
        for keyword in Self::extract_seniority_constraint_keywords(text) {
            keywords.insert(keyword);
        }

        let mut sorted_keywords = keywords.into_iter().collect::<Vec<_>>();
        sorted_keywords.sort();
        sorted_keywords
    }

    fn extract_seniority_constraint_keywords(text: &str) -> Vec<String> {
        let mut keywords = HashSet::new();
        let seniority_patterns = [
            (
                r"(?i)\b(senior[- ]level|senior|sr\.)\b",
                "senior-level experience",
            ),
            (
                r"(?i)\b(lead[- ]level|team lead|shift lead|crew lead|lead worker|lead experience|leadership experience)\b",
                "lead-level experience",
            ),
            (
                r"(?i)\b(staff[- ]level|principal[- ]level|staff engineer|principal engineer|principal consultant)\b",
                "staff/principal-level experience",
            ),
            (
                r"(?i)\b(people management|management experience|manager[- ]level|supervisor[- ]level|supervisor experience|supervisory experience|supervision experience|team management|team supervision|supervising staff|supervised staff|managed\s+(?:a\s+)?team|managed staff|managed people|managed employees)\b",
                "management experience",
            ),
            (
                r"(?i)\b(director[- ]level|director experience|department director)\b",
                "director-level experience",
            ),
            (
                r"(?i)\b(executive[- ]level|executive leadership|c-suite|vice president|vp)\b",
                "executive-level experience",
            ),
            (
                r"(?i)\b(mid[- ]level|intermediate)\b",
                "mid-level experience",
            ),
        ];

        for (pattern, keyword) in seniority_patterns {
            if regex::Regex::new(pattern).unwrap().is_match(text) {
                keywords.insert(keyword.to_string());
            }
        }

        let mut sorted_keywords = keywords.into_iter().collect::<Vec<_>>();
        sorted_keywords.sort();
        sorted_keywords
    }

    fn get_industry_keywords() -> Vec<&'static str> {
        vec![
            // Development
            "agile",
            "scrum",
            "ci/cd",
            "devops",
            "microservices",
            "rest",
            "graphql",
            "api",
            // Cloud
            "aws",
            "azure",
            "gcp",
            "cloud",
            "docker",
            "kubernetes",
            "serverless",
            // Data
            "sql",
            "nosql",
            "database",
            "data pipeline",
            "etl",
            "data analysis",
            "data analytics",
            "analytics",
            // General
            "customer service",
            "client services",
            "guest service",
            "guest services",
            "front desk",
            "front-desk",
            "reception",
            "receptionist",
            "case management",
            "scheduling",
            "intake",
            "training",
            "onboarding",
            "new hire orientation",
            "employee orientation",
            "sales",
            "account management",
            "crm",
            "pmp",
            "project management professional",
            "payroll",
            "bookkeeping",
            "bookkeeper",
            "quickbooks",
            "qbo",
            "accounts payable",
            "accounts receivable",
            "a/p",
            "a/r",
            "inventory",
            "inventory control",
            "inventory management",
            "stock control",
            "stock management",
            "stockroom",
            "logistics",
            "procurement",
            "purchasing",
            "vendor management",
            "supplier management",
            "reporting",
            "budgeting",
            "budget tracking",
            "compliance",
            "quality assurance",
            "data entry",
            "excel",
            "patient care",
            "cna",
            "certified nursing assistant",
            "lpn",
            "licensed practical nurse",
            "medication administration",
            "vital signs",
            "care plans",
            "medical records",
            "charting",
            "lesson planning",
            "classroom management",
            "curriculum",
            "iep",
            "student support",
            "student services",
            "parent communication",
            "family communication",
            "guardian communication",
            "forklift",
            "welding",
            "equipment maintenance",
            "safety inspections",
            "food safety",
            "food safety certification",
            "point of sale",
            "pos system",
            "pos systems",
            "servsafe",
            "food handler certification",
            "first aid",
            "first aid certification",
            "cash handling",
            "cashier",
            "forklift certification",
            "osha 10",
            "osha 10 certification",
            "osha 30",
            "osha 30 certification",
            "document review",
            "case files",
            "legal research",
            "records management",
            "policy analysis",
            "grant administration",
            "public benefits",
            "financial reconciliation",
            "reconciliation",
            "billing",
            "invoicing",
            "loan processing",
            "financial reporting",
            "tdd",
            "testing",
            "automation",
            "performance",
            "scalability",
            "security",
        ]
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
#[path = "ats_analyzer_tests.rs"]
mod tests;
