use super::super::ats_types::{
    AtsAnalysisResult, AtsSuggestion, FormatIssue, IssueSeverity, SuggestionCategory,
};
use super::super::types::{ContactInfo, Education, Experience, ResumeData, Skill};
use super::{bullet_prompts, format_result, plain_text_format};

mod text_rules;

pub(super) use text_rules::*;

pub(super) fn analyze_format(resume: &ResumeData) -> AtsAnalysisResult {
    let mut format_issues = Vec::new();
    let mut suggestions = Vec::new();

    check_contact_info(&resume.contact_info, &mut format_issues, &mut suggestions);
    check_experience(&resume.experience, &mut format_issues, &mut suggestions);
    check_skills(&resume.skills, &mut format_issues, &mut suggestions);
    check_education(&resume.education, &mut format_issues, &mut suggestions);
    check_adversarial_content(resume, &mut format_issues, &mut suggestions);
    check_special_character_risks(resume, &mut format_issues, &mut suggestions);
    check_keyword_stuffing(resume, &mut format_issues, &mut suggestions);
    check_keyword_list_bullets(resume, &mut format_issues, &mut suggestions);
    check_capability_level_claims(resume, &mut format_issues, &mut suggestions);
    check_generic_filler_bullets(resume, &mut format_issues, &mut suggestions);

    let completeness_score = calculate_completeness(resume);

    format_result::build_format_result(format_issues, suggestions, completeness_score)
}

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

        for bullet in &exp.achievements {
            let line_length = bullet.len();
            if line_length > 150 {
                issues.push(FormatIssue {
                    severity: IssueSeverity::Warning,
                    issue: format!("Long bullet point in experience #{}", idx + 1),
                    fix: "Keep bullets to 1-2 lines (under 150 characters)".to_string(),
                });
            }

            let has_power_word = bullet_prompts::get_power_words()
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
            fix:
                "Add a skills section with relevant technical, workplace, and role-specific skills"
                    .to_string(),
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
    if !has_adversarial_content(resume) {
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

fn check_special_character_risks(
    resume: &ResumeData,
    issues: &mut Vec<FormatIssue>,
    suggestions: &mut Vec<AtsSuggestion>,
) {
    let text = collect_resume_text(resume);
    plain_text_format::push_special_character_issues(&text, issues, suggestions);
}

fn check_keyword_stuffing(
    resume: &ResumeData,
    issues: &mut Vec<FormatIssue>,
    suggestions: &mut Vec<AtsSuggestion>,
) {
    if !has_keyword_stuffing(resume) {
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
        push_keyword_list_issue(issues, suggestions);
    }
}

pub(super) fn push_keyword_list_issue(
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
            .any(|item| line_has_unclear_capability_level(item))
    }) || resume
        .projects
        .iter()
        .any(|project| line_has_unclear_capability_level(project));

    if has_unclear_claim {
        push_capability_level_issue(issues, suggestions);
    }
}

pub(super) fn push_capability_level_issue(
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
        suggestion: "Match the bullet to the true level of responsibility before strengthening it."
            .to_string(),
        impact: "Prevents overstating experience while still making real hands-on work visible."
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
        push_generic_filler_issue(issues, suggestions);
    }
}

pub(super) fn push_generic_filler_issue(
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

fn calculate_completeness(resume: &ResumeData) -> f64 {
    let mut filled = 0;
    let total = 5;

    if !resume.contact_info.email.is_empty() && !resume.contact_info.phone.is_empty() {
        filled += 1;
    }

    if !resume.experience.is_empty() {
        filled += 1;
    }

    if !resume.skills.is_empty() {
        filled += 1;
    }

    if !resume.education.is_empty() {
        filled += 1;
    }

    if !resume.summary.is_empty() {
        filled += 1;
    }

    (filled as f64 / total as f64) * 100.0
}
