//! ATS (Applicant Tracking System) analyzer for resume optimization
//!
//! This module analyzes resumes for ATS compatibility, keyword optimization,
//! and provides suggestions for improving ATS pass-through rates.
#![allow(clippy::unwrap_used, clippy::expect_used)] // Regex patterns are compile-time constants

use serde::{Deserialize, Serialize};
use std::collections::HashSet;

use super::types::{ContactInfo, Education, Experience, ResumeData, Skill};

// ============================================================================
// Types
// ============================================================================

/// Complete ATS analysis result for a resume
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AtsAnalysisResult {
    /// Overall ATS compatibility score (0-100)
    pub overall_score: f64,
    /// Keyword matching score (0-100)
    pub keyword_score: f64,
    /// Format safety score (0-100)
    pub format_score: f64,
    /// Resume completeness score (0-100)
    pub completeness_score: f64,
    /// Keywords found in resume
    pub keyword_matches: Vec<KeywordMatch>,
    /// Important keywords missing from resume
    pub missing_keywords: Vec<String>,
    /// Format issues that may cause ATS problems
    pub format_issues: Vec<FormatIssue>,
    /// Improvement suggestions
    pub suggestions: Vec<AtsSuggestion>,
}

/// A keyword found in the resume
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeywordMatch {
    /// The keyword or phrase
    pub keyword: String,
    /// Resume sections where found
    pub found_in: Vec<String>,
    /// Number of times mentioned
    pub frequency: usize,
    /// How important this keyword is
    pub importance: KeywordImportance,
}

/// Importance level of a keyword
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum KeywordImportance {
    /// Must-have requirement from job description
    Required,
    /// Nice-to-have from job description
    Preferred,
    /// Common industry term
    Industry,
}

/// A formatting issue that may affect ATS parsing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormatIssue {
    /// How serious this issue is
    pub severity: IssueSeverity,
    /// Description of the issue
    pub issue: String,
    /// How to fix it
    pub fix: String,
}

/// Severity level of a format issue
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum IssueSeverity {
    /// Will likely cause ATS to fail parsing
    Critical,
    /// May cause parsing issues
    Warning,
    /// Suggestion for improvement
    Info,
}

/// Suggestion for improving ATS score
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AtsSuggestion {
    /// Category of suggestion
    pub category: SuggestionCategory,
    /// The suggestion text
    pub suggestion: String,
    /// Expected impact if implemented
    pub impact: String,
}

/// Category of ATS suggestion
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum SuggestionCategory {
    /// Add missing keyword
    AddKeyword,
    /// Improve bullet point wording
    RewordBullet,
    /// Add missing section
    AddSection,
    /// Reorder content for better impact
    ReorderContent,
    /// Fix formatting issue
    FormatFix,
}

// ============================================================================
// ATS Analyzer
// ============================================================================

pub struct AtsAnalyzer;

impl AtsAnalyzer {
    /// Analyze resume against a specific job description
    pub fn analyze_for_job(resume: &ResumeData, job_description: &str) -> AtsAnalysisResult {
        let job_keywords = Self::extract_job_keywords(job_description);
        let format_result = Self::analyze_format(resume);

        // Find keyword matches
        let (keyword_matches, missing_keywords) = Self::find_keyword_matches(resume, &job_keywords);

        // Calculate keyword score
        let total_keywords = job_keywords.len();
        let matched_keywords = keyword_matches.len();
        let keyword_score = if total_keywords > 0 {
            (matched_keywords as f64 / total_keywords as f64) * 100.0
        } else {
            100.0
        };

        // Generate keyword suggestions
        let mut suggestions = format_result.suggestions.clone();
        for keyword in &missing_keywords {
            let importance = job_keywords
                .iter()
                .find(|(k, _)| k == keyword)
                .map(|(_, i)| *i)
                .unwrap_or(KeywordImportance::Industry);

            let impact = match importance {
                KeywordImportance::Required => "High",
                KeywordImportance::Preferred => "Medium",
                KeywordImportance::Industry => "Low",
            };

            suggestions.push(AtsSuggestion {
                category: SuggestionCategory::AddKeyword,
                suggestion: format!("Add '{}' to relevant sections", keyword),
                impact: impact.to_string(),
            });
        }

        // Calculate overall score (weighted average)
        let overall_score = (keyword_score * 0.4)
            + (format_result.format_score * 0.3)
            + (format_result.completeness_score * 0.3);

        AtsAnalysisResult {
            overall_score,
            keyword_score,
            format_score: format_result.format_score,
            completeness_score: format_result.completeness_score,
            keyword_matches,
            missing_keywords,
            format_issues: format_result.format_issues,
            suggestions,
        }
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
            format_issues,
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

        // Extract from preferred section
        for keyword in Self::extract_keywords_from_text(&preferred_section) {
            if !keywords.iter().any(|(k, _)| k == &keyword) {
                keywords.push((keyword, KeywordImportance::Preferred));
            }
        }

        // Add industry keywords if found
        for keyword in Self::get_industry_keywords() {
            if lower.contains(keyword) && !keywords.iter().any(|(k, _)| k == keyword) {
                keywords.push((keyword.to_string(), KeywordImportance::Industry));
            }
        }

        keywords
    }

    /// Get power words for action verbs
    pub fn get_power_words() -> Vec<&'static str> {
        vec![
            // Leadership
            "led",
            "managed",
            "directed",
            "coordinated",
            "supervised",
            "mentored",
            "trained",
            // Achievement
            "achieved",
            "accomplished",
            "delivered",
            "exceeded",
            "surpassed",
            "completed",
            // Creation
            "developed",
            "created",
            "designed",
            "built",
            "implemented",
            "launched",
            "established",
            // Improvement
            "improved",
            "optimized",
            "enhanced",
            "streamlined",
            "modernized",
            "automated",
            "refactored",
            // Impact
            "increased",
            "reduced",
            "decreased",
            "saved",
            "generated",
            "accelerated",
            // Analysis
            "analyzed",
            "researched",
            "evaluated",
            "assessed",
            "investigated",
            "identified",
            // Collaboration
            "collaborated",
            "partnered",
            "contributed",
            "participated",
            "supported",
            "facilitated",
        ]
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
            // Try to detect action and suggest power word (case-insensitive)
            let lower = improved.to_lowercase();
            if lower.contains("was responsible for") {
                // Find and replace case-insensitively
                let pattern = regex::Regex::new(r"(?i)was responsible for").unwrap();
                improved = pattern.replace(&improved, "Managed").to_string();
            } else if lower.contains("worked on") {
                let pattern = regex::Regex::new(r"(?i)worked on").unwrap();
                improved = pattern.replace(&improved, "Developed").to_string();
            } else if lower.contains("helped with") {
                let pattern = regex::Regex::new(r"(?i)helped with").unwrap();
                improved = pattern.replace(&improved, "Contributed to").to_string();
            }
        }

        // Add quantification if missing
        if !improved.contains(|c: char| c.is_ascii_digit()) && !improved.contains('%') {
            improved.push_str(" (add specific metrics)");
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
                    " (consider adding: {})",
                    important_keywords.join(", ")
                ));
            }
        }

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
                    impact: "High".to_string(),
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
                        suggestion: format!("Start bullet with action verb: '{}'", bullet),
                        impact: "Medium".to_string(),
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
                fix: "Add a skills section with relevant technical and soft skills".to_string(),
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

    fn find_keyword_matches(
        resume: &ResumeData,
        job_keywords: &[(String, KeywordImportance)],
    ) -> (Vec<KeywordMatch>, Vec<String>) {
        let mut matches = Vec::new();
        let mut missing = Vec::new();

        for (keyword, importance) in job_keywords {
            let mut found_in = Vec::new();
            let mut frequency = 0;

            // Search in summary
            let summary_lower = resume.summary.to_lowercase();
            let keyword_lower = keyword.to_lowercase();
            let count = summary_lower.matches(&keyword_lower).count();
            if count > 0 {
                found_in.push("summary".to_string());
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
                let count = exp_text.matches(&keyword_lower).count();
                if count > 0 {
                    if !found_in.contains(&"experience".to_string()) {
                        found_in.push("experience".to_string());
                    }
                    frequency += count;
                }
            }

            // Search in skills
            for skill in &resume.skills {
                let skill_lower = skill.name.to_lowercase();
                if skill_lower.contains(&keyword_lower) || keyword_lower.contains(&skill_lower) {
                    if !found_in.contains(&"skills".to_string()) {
                        found_in.push("skills".to_string());
                    }
                    frequency += 1;
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
                missing.push(keyword.clone());
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

        (matches, missing)
    }

    fn extract_section(text: &str, headers: &[&str]) -> String {
        for header in headers {
            if let Some(start) = text.find(header) {
                let after = &text[start..];
                // Find next section header or end
                let end = after.find("\n\n").map(|i| i + start).unwrap_or(text.len());
                return text[start..end].to_string();
            }
        }
        String::new()
    }

    fn extract_keywords_from_text(text: &str) -> Vec<String> {
        let mut keywords = HashSet::new();

        // Common tech keywords pattern
        let tech_patterns = [
            r"(?i)\b(rust|python|javascript|typescript|java|c\+\+|go|kotlin|swift)\b",
            r"(?i)\b(react|vue|angular|node\.?js|django|flask|spring|express)\b",
            r"(?i)\b(aws|azure|gcp|docker|kubernetes|terraform|ansible)\b",
            r"(?i)\b(sql|postgresql|mysql|mongodb|redis|elasticsearch)\b",
            r"(?i)\b(git|ci/cd|agile|scrum|rest|graphql|microservices)\b",
        ];

        for pattern in &tech_patterns {
            if let Ok(re) = regex::Regex::new(pattern) {
                for cap in re.captures_iter(text) {
                    if let Some(m) = cap.get(0) {
                        keywords.insert(m.as_str().to_lowercase());
                    }
                }
            }
        }

        keywords.into_iter().collect()
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
            "analytics",
            // General
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
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn sample_resume() -> ResumeData {
        ResumeData {
            contact_info: ContactInfo {
                name: "John Doe".to_string(),
                email: "john@example.com".to_string(),
                phone: "555-1234".to_string(),
                location: "San Francisco, CA".to_string(),
                linkedin: Some("linkedin.com/in/johndoe".to_string()),
                github: Some("github.com/johndoe".to_string()),
                website: None,
            },
            summary: "Senior software engineer with 5 years of experience in Rust and Python"
                .to_string(),
            experience: vec![Experience {
                title: "Senior Software Engineer".to_string(),
                company: "Tech Corp".to_string(),
                location: "San Francisco, CA".to_string(),
                start_date: "Jan 2020".to_string(),
                end_date: "Present".to_string(),
                achievements: vec![
                    "Led development of microservices using Rust".to_string(),
                    "Improved system performance by 40%".to_string(),
                ],
                current: true,
            }],
            skills: vec![
                Skill {
                    name: "Rust".to_string(),
                    category: "Programming Languages".to_string(),
                    proficiency: None,
                },
                Skill {
                    name: "Python".to_string(),
                    category: "Programming Languages".to_string(),
                    proficiency: None,
                },
                Skill {
                    name: "Docker".to_string(),
                    category: "DevOps".to_string(),
                    proficiency: None,
                },
                Skill {
                    name: "Kubernetes".to_string(),
                    category: "DevOps".to_string(),
                    proficiency: None,
                },
                Skill {
                    name: "PostgreSQL".to_string(),
                    category: "Databases".to_string(),
                    proficiency: None,
                },
                Skill {
                    name: "AWS".to_string(),
                    category: "Cloud".to_string(),
                    proficiency: None,
                },
            ],
            education: vec![Education {
                degree: "BS Computer Science".to_string(),
                institution: "Stanford University".to_string(),
                location: "Stanford, CA".to_string(),
                graduation_date: "2018".to_string(),
                gpa: Some(3.8),
                honors: vec![],
            }],
            certifications: vec![],
            projects: vec![],
            custom_sections: HashMap::new(),
        }
    }

    #[test]
    fn test_analyze_format_complete_resume() {
        let resume = sample_resume();
        let result = AtsAnalyzer::analyze_format(&resume);

        assert!(result.format_score > 80.0);
        assert!(result.completeness_score > 80.0);
        assert!(result.format_issues.is_empty());
    }

    #[test]
    fn test_analyze_format_missing_contact() {
        let mut resume = sample_resume();
        resume.contact_info.email = String::new();
        resume.contact_info.phone = String::new();

        let result = AtsAnalyzer::analyze_format(&resume);

        assert!(result.format_score < 100.0);
        assert!(result
            .format_issues
            .iter()
            .any(|i| i.severity == IssueSeverity::Critical));
    }

    #[test]
    fn test_analyze_format_missing_experience() {
        let mut resume = sample_resume();
        resume.experience.clear();

        let result = AtsAnalyzer::analyze_format(&resume);

        assert!(result
            .format_issues
            .iter()
            .any(|i| i.issue.contains("No work experience")));
    }

    #[test]
    fn test_extract_job_keywords() {
        // Use double newlines to separate sections properly
        let job_desc = r#"
Required: Rust, Python, Docker, Kubernetes

Nice to have: AWS, GraphQL
        "#;

        let keywords = AtsAnalyzer::extract_job_keywords(job_desc);

        // Rust should be extracted as Required
        assert!(keywords
            .iter()
            .any(|(k, i)| k == "rust" && *i == KeywordImportance::Required));
        // AWS should be extracted as Preferred (from "nice to have" section)
        assert!(keywords
            .iter()
            .any(|(k, i)| k == "aws" && *i == KeywordImportance::Preferred));
    }

    #[test]
    fn test_analyze_for_job_high_match() {
        let resume = sample_resume();
        let job_desc = "Required: Rust, Python, Docker";

        let result = AtsAnalyzer::analyze_for_job(&resume, job_desc);

        assert!(result.keyword_score > 80.0);
        assert!(!result.keyword_matches.is_empty());
    }

    #[test]
    fn test_analyze_for_job_low_match() {
        let resume = sample_resume();
        let job_desc = "Required: Java, Spring Boot, AWS Lambda";

        let result = AtsAnalyzer::analyze_for_job(&resume, job_desc);

        assert!(result.keyword_score < 50.0);
        assert!(!result.missing_keywords.is_empty());
        assert!(result
            .suggestions
            .iter()
            .any(|s| s.category == SuggestionCategory::AddKeyword));
    }

    #[test]
    fn test_keyword_importance_ordering() {
        let resume = sample_resume();
        let job_desc = r#"
            Required: Rust
            Preferred: Docker
            AWS is also good
        "#;

        let result = AtsAnalyzer::analyze_for_job(&resume, job_desc);

        // Required keywords should come first
        if result.keyword_matches.len() > 1 {
            assert_eq!(
                result.keyword_matches[0].importance,
                KeywordImportance::Required
            );
        }
    }

    #[test]
    fn test_get_power_words() {
        let words = AtsAnalyzer::get_power_words();

        assert!(words.contains(&"led"));
        assert!(words.contains(&"developed"));
        assert!(words.contains(&"improved"));
        assert!(words.len() > 30);
    }

    #[test]
    fn test_improve_bullet_with_power_word() {
        let bullet = "Led development of microservices using Rust";
        let improved = AtsAnalyzer::improve_bullet(bullet, None);

        // Already starts with power word
        assert!(improved.starts_with("Led"));
    }

    #[test]
    fn test_improve_bullet_without_power_word() {
        let bullet = "Was responsible for developing microservices";
        let improved = AtsAnalyzer::improve_bullet(bullet, None);

        // Should replace with power word
        assert!(improved.contains("Managed") || improved.contains("Developed"));
    }

    #[test]
    fn test_improve_bullet_missing_metrics() {
        let bullet = "Led development of microservices";
        let improved = AtsAnalyzer::improve_bullet(bullet, None);

        // Should suggest adding metrics
        assert!(improved.contains("metrics"));
    }

    #[test]
    fn test_improve_bullet_with_job_context() {
        let bullet = "Led development of backend services";
        let job_desc = "Required: Rust, Kubernetes, Docker";
        let improved = AtsAnalyzer::improve_bullet(bullet, Some(job_desc));

        // Should suggest adding required keywords
        assert!(improved.contains("Rust") || improved.contains("consider adding"));
    }

    #[test]
    fn test_format_issue_severity() {
        let mut resume = sample_resume();
        resume.contact_info.email = String::new(); // Critical
        resume.contact_info.phone = String::new(); // Warning

        let result = AtsAnalyzer::analyze_format(&resume);

        let critical = result
            .format_issues
            .iter()
            .filter(|i| i.severity == IssueSeverity::Critical)
            .count();
        let warning = result
            .format_issues
            .iter()
            .filter(|i| i.severity == IssueSeverity::Warning)
            .count();

        assert!(critical > 0);
        assert!(warning > 0);
    }

    #[test]
    fn test_completeness_score() {
        let resume = sample_resume();
        let result = AtsAnalyzer::analyze_format(&resume);

        // All sections filled
        assert_eq!(result.completeness_score, 100.0);

        // Remove some sections
        let mut incomplete = resume.clone();
        incomplete.summary = String::new();
        incomplete.education.clear();

        let result2 = AtsAnalyzer::analyze_format(&incomplete);
        assert!(result2.completeness_score < 100.0);
    }

    #[test]
    fn test_keyword_frequency_tracking() {
        let mut resume = sample_resume();
        resume.summary =
            "Rust developer with Rust experience building Rust applications".to_string();

        let job_desc = "Required: Rust";
        let result = AtsAnalyzer::analyze_for_job(&resume, job_desc);

        let rust_match = result.keyword_matches.iter().find(|m| m.keyword == "rust");
        assert!(rust_match.is_some());
        assert!(rust_match.unwrap().frequency >= 3);
    }

    #[test]
    fn test_long_bullet_points_detected() {
        let mut resume = sample_resume();
        resume.experience[0].achievements = vec![
            "This is a very long bullet point that exceeds the recommended length for ATS systems and should be flagged as a formatting issue that needs to be addressed before submission".to_string(),
        ];

        let result = AtsAnalyzer::analyze_format(&resume);

        assert!(result
            .format_issues
            .iter()
            .any(|i| i.issue.contains("Long bullet point")));
    }

    #[test]
    fn test_missing_start_date_detected() {
        let mut resume = sample_resume();
        resume.experience[0].start_date = String::new();

        let result = AtsAnalyzer::analyze_format(&resume);

        assert!(result
            .format_issues
            .iter()
            .any(|i| i.issue.contains("Missing start date")));
    }

    #[test]
    fn test_few_skills_warning() {
        let mut resume = sample_resume();
        resume.skills = vec![
            Skill {
                name: "Rust".to_string(),
                category: "Programming".to_string(),
                proficiency: None,
            },
            Skill {
                name: "Python".to_string(),
                category: "Programming".to_string(),
                proficiency: None,
            },
        ];

        let result = AtsAnalyzer::analyze_format(&resume);

        assert!(result
            .format_issues
            .iter()
            .any(|i| i.issue.contains("Few skills")));
    }

    #[test]
    fn test_suggestion_categories() {
        let resume = sample_resume();
        let job_desc = "Required: Java, Spring Boot, AWS";

        let result = AtsAnalyzer::analyze_for_job(&resume, job_desc);

        // Should have AddKeyword suggestions for missing required skills
        assert!(result
            .suggestions
            .iter()
            .any(|s| s.category == SuggestionCategory::AddKeyword));
    }

    #[test]
    fn test_overall_score_calculation() {
        let resume = sample_resume();
        let job_desc = "Required: Rust, Python, Docker";

        let result = AtsAnalyzer::analyze_for_job(&resume, job_desc);

        // Overall score should be weighted average
        let expected = (result.keyword_score * 0.4)
            + (result.format_score * 0.3)
            + (result.completeness_score * 0.3);

        assert!((result.overall_score - expected).abs() < 0.01);
    }
}
