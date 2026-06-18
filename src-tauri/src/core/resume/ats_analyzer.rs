//! Resume readability analyzer for candidate-side explainability
//!
//! This module analyzes resumes for job-word coverage, readable structure,
//! and suggestions that improve truthful application clarity.
#![allow(clippy::unwrap_used, clippy::expect_used)] // Regex patterns are compile-time constants

use chrono::{Datelike, Utc};

use super::ats_types::*;
#[cfg(test)]
use super::types::{ContactInfo, Education, Skill};
use super::types::{Experience, ResumeData};

mod bullet_prompts;
mod hard_constraints;
mod keyword_catalog;
mod plain_text_format;
mod requirement_reviews;
mod requirement_rules;
mod structured_format;
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
        structured_format::analyze_format(resume)
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
        for keyword in keyword_catalog::extract_keywords_from_text(&required_section) {
            keywords.push((keyword, KeywordImportance::Required));
        }
        for keyword in hard_constraints::extract_hard_constraint_keywords(&required_section) {
            if !keywords.iter().any(|(k, _)| k == &keyword) {
                keywords.push((keyword, KeywordImportance::Required));
            }
        }

        // Extract from preferred section
        for keyword in keyword_catalog::extract_keywords_from_text(&preferred_section) {
            if !keywords.iter().any(|(k, _)| k == &keyword) {
                keywords.push((keyword, KeywordImportance::Preferred));
            }
        }
        for keyword in hard_constraints::extract_hard_constraint_keywords(&preferred_section) {
            if !keywords.iter().any(|(k, _)| k == &keyword) {
                keywords.push((keyword, KeywordImportance::Preferred));
            }
        }

        // Add industry keywords if found
        for keyword in keyword_catalog::industry_keywords() {
            let canonical_keyword = keyword_catalog::canonical_requirement_keyword(&keyword);
            if Self::keyword_appears_in_text(&lower, &keyword)
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

        let requirement_reviews = requirement_reviews::build_requirement_reviews(
            job_keywords,
            &keyword_matches,
            &missing_keyword_details,
        );
        let hard_constraint_risks =
            hard_constraints::build_hard_constraint_risks(&requirement_reviews);
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
            ("languages", "languages"),
            ("language skills", "languages"),
            ("awards", "awards"),
            ("honors and awards", "awards"),
            ("publications", "publications"),
            ("references", "references"),
            ("interests", "interests"),
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
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
#[path = "ats_analyzer_tests.rs"]
mod tests;
