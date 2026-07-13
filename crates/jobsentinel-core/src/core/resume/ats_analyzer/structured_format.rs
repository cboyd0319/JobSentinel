use super::super::ats_types::{
    AtsAnalysisResult, AtsSuggestion, FormatIssue, IssueSeverity, SuggestionCategory,
};
use super::super::types::{ContactInfo, Education, Experience, ResumeData, Skill};
use super::{bullet_prompts, plain_text_format};

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
    let completeness_score = calculate_completeness(resume);

    AtsAnalysisResult {
        overall_score: (format_score * 0.5) + (completeness_score * 0.5),
        keyword_score: 0.0,
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

fn has_adversarial_content(resume: &ResumeData) -> bool {
    text_has_adversarial_content(&resume.summary)
        || text_has_adversarial_content(&resume.contact_info.name)
        || resume.experience.iter().any(|experience| {
            text_has_adversarial_content(&experience.title)
                || text_has_adversarial_content(&experience.company)
                || experience
                    .achievements
                    .iter()
                    .any(|item| text_has_adversarial_content(item))
        })
        || resume.skills.iter().any(|skill| {
            text_has_adversarial_content(&skill.name)
                || text_has_adversarial_content(&skill.category)
                || skill
                    .proficiency
                    .as_deref()
                    .is_some_and(text_has_adversarial_content)
        })
        || resume.education.iter().any(|education| {
            text_has_adversarial_content(&education.degree)
                || text_has_adversarial_content(&education.institution)
                || education
                    .honors
                    .iter()
                    .any(|item| text_has_adversarial_content(item))
        })
        || resume
            .certifications
            .iter()
            .any(|item| text_has_adversarial_content(item))
        || resume
            .projects
            .iter()
            .any(|item| text_has_adversarial_content(item))
        || resume.custom_sections.iter().any(|(section, values)| {
            text_has_adversarial_content(section)
                || values.iter().any(|item| text_has_adversarial_content(item))
        })
}

fn collect_resume_text(resume: &ResumeData) -> String {
    let mut chunks = vec![resume.summary.as_str(), resume.contact_info.name.as_str()];

    for experience in &resume.experience {
        chunks.push(experience.title.as_str());
        chunks.push(experience.company.as_str());
        chunks.extend(experience.achievements.iter().map(String::as_str));
    }
    for skill in &resume.skills {
        chunks.push(skill.name.as_str());
        chunks.push(skill.category.as_str());
        if let Some(proficiency) = skill.proficiency.as_deref() {
            chunks.push(proficiency);
        }
    }
    for education in &resume.education {
        chunks.push(education.degree.as_str());
        chunks.push(education.institution.as_str());
        chunks.extend(education.honors.iter().map(String::as_str));
    }
    chunks.extend(resume.certifications.iter().map(String::as_str));
    chunks.extend(resume.projects.iter().map(String::as_str));
    for (section, values) in &resume.custom_sections {
        chunks.push(section.as_str());
        chunks.extend(values.iter().map(String::as_str));
    }

    chunks.join("\n")
}

fn has_keyword_stuffing(resume: &ResumeData) -> bool {
    text_has_keyword_stuffing(&resume.summary)
        || resume.experience.iter().any(|experience| {
            text_has_keyword_stuffing(&experience.title)
                || text_has_keyword_stuffing(&experience.company)
                || experience
                    .achievements
                    .iter()
                    .any(|item| text_has_keyword_stuffing(item))
        })
        || resume.skills.iter().any(|skill| {
            text_has_keyword_stuffing(&skill.name)
                || text_has_keyword_stuffing(&skill.category)
                || skill
                    .proficiency
                    .as_deref()
                    .is_some_and(text_has_keyword_stuffing)
        })
        || resume
            .projects
            .iter()
            .any(|item| text_has_keyword_stuffing(item))
        || resume.custom_sections.iter().any(|(section, values)| {
            text_has_keyword_stuffing(section)
                || values.iter().any(|item| text_has_keyword_stuffing(item))
        })
}

pub(super) fn text_has_adversarial_content(text: &str) -> bool {
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

pub(super) fn text_has_keyword_stuffing(text: &str) -> bool {
    let token_re = regex::Regex::new(r"(?i)[a-z][a-z0-9+#.]{1,}").unwrap();
    let mut previous = String::new();
    let mut run_length = 0;

    for token in token_re.find_iter(text).map(|m| m.as_str()) {
        let token = token.trim_matches('.').to_ascii_lowercase();
        if token.len() < 3 || is_keyword_stuffing_stopword(&token) {
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

pub(super) fn text_has_unclear_capability_level(text: &str) -> bool {
    text.lines().any(line_has_unclear_capability_level)
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
