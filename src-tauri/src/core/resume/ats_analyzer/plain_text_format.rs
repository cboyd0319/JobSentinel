use super::super::ats_types::{
    AtsAnalysisResult, AtsSuggestion, FormatIssue, IssueSeverity, SuggestionCategory,
};
use super::structured_format;
use super::AtsAnalyzer;

pub(super) fn analyze_plain_text_format(resume_text: &str) -> AtsAnalysisResult {
    let readable_text = resume_text.trim();
    let mut format_issues = Vec::new();
    let mut suggestions = Vec::new();

    if readable_text.is_empty() {
        format_issues.push(FormatIssue {
            severity: IssueSeverity::Critical,
            issue: "No readable resume text found".to_string(),
            fix: "Add a resume with readable text before reviewing job fit.".to_string(),
        });
    }

    if structured_format::text_has_adversarial_content(readable_text) {
        format_issues.push(FormatIssue {
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

    if structured_format::text_has_keyword_stuffing(readable_text) {
        format_issues.push(FormatIssue {
            severity: IssueSeverity::Warning,
            issue: "Possible keyword stuffing detected".to_string(),
            fix: "Remove repeated keyword piles and show each important skill through truthful experience, tools, scope, or outcomes.".to_string(),
        });
        suggestions.push(AtsSuggestion {
            category: SuggestionCategory::FormatFix,
            suggestion: "Replace repeated keywords with readable evidence a recruiter can understand and you can defend in an interview.".to_string(),
            impact:
                "Keeps the resume credible while still making real qualifications visible."
                .to_string(),
        });
    }

    push_special_character_issues(readable_text, &mut format_issues, &mut suggestions);

    if text_has_keyword_list_bullet(readable_text) {
        structured_format::push_keyword_list_issue(&mut format_issues, &mut suggestions);
    }

    if structured_format::text_has_unclear_capability_level(readable_text) {
        structured_format::push_capability_level_issue(&mut format_issues, &mut suggestions);
    }

    if text_has_generic_filler_bullet(readable_text) {
        structured_format::push_generic_filler_issue(&mut format_issues, &mut suggestions);
    }

    if !readable_text.is_empty() {
        check_plain_text_contact(readable_text, &mut format_issues, &mut suggestions);
        check_plain_text_headings(readable_text, &mut format_issues, &mut suggestions);
        check_plain_text_layout_risks(readable_text, &mut format_issues, &mut suggestions);
    }

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
    let completeness_score = if readable_text.is_empty() { 0.0 } else { 100.0 };

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

fn check_plain_text_contact(
    resume_text: &str,
    issues: &mut Vec<FormatIssue>,
    suggestions: &mut Vec<AtsSuggestion>,
) {
    let top_text = resume_text
        .lines()
        .filter(|line| !line.trim().is_empty())
        .take(12)
        .collect::<Vec<_>>()
        .join("\n");

    if contains_email(&top_text) {
        return;
    }

    issues.push(FormatIssue {
        severity: IssueSeverity::Warning,
        issue: "Contact information is not visible near the top".to_string(),
        fix:
            "Put email and basic contact details in the resume body near the top, not only in a header, footer, image, or text box."
                .to_string(),
    });
    suggestions.push(AtsSuggestion {
        category: SuggestionCategory::FormatFix,
        suggestion:
            "Review the readable text preview and make sure contact details appear near the top."
                .to_string(),
        impact: "Helps application systems and recruiters find the right contact information."
            .to_string(),
    });
}

fn check_plain_text_headings(
    resume_text: &str,
    issues: &mut Vec<FormatIssue>,
    suggestions: &mut Vec<AtsSuggestion>,
) {
    if resume_text.lines().any(is_standard_resume_heading) {
        return;
    }

    issues.push(FormatIssue {
        severity: IssueSeverity::Warning,
        issue: "No standard resume section headings found".to_string(),
        fix:
            "Use clear headings such as Summary, Skills, Professional Experience, Education, Certifications, or Projects."
                .to_string(),
    });
    suggestions.push(AtsSuggestion {
        category: SuggestionCategory::FormatFix,
        suggestion: "Replace creative section names with standard resume headings.".to_string(),
        impact: "Makes the resume easier for people and application systems to scan in order."
            .to_string(),
    });
}

fn check_plain_text_layout_risks(
    resume_text: &str,
    issues: &mut Vec<FormatIssue>,
    suggestions: &mut Vec<AtsSuggestion>,
) {
    let table_like_lines = resume_text
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            trimmed.matches('|').count() >= 2 || trimmed.matches('\t').count() >= 2
        })
        .count();

    if table_like_lines < 2 {
        return;
    }

    issues.push(FormatIssue {
        severity: IssueSeverity::Warning,
        issue: "Readable resume text contains table-like formatting".to_string(),
        fix:
            "Use a simple single-column layout for important resume content instead of tables, columns, or skill bars."
                .to_string(),
    });
    suggestions.push(AtsSuggestion {
        category: SuggestionCategory::FormatFix,
        suggestion: "Check whether tables or columns scrambled the plain-text reading order."
            .to_string(),
        impact:
            "Keeps qualifications readable when the resume is copied, parsed, or reviewed quickly."
                .to_string(),
    });
}

fn contains_email(text: &str) -> bool {
    regex::Regex::new(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b")
        .unwrap()
        .is_match(text)
}

fn text_has_keyword_list_bullet(text: &str) -> bool {
    let mut current_section = "resume text";

    for line in text.lines() {
        if let Some(section) = AtsAnalyzer::plain_text_section_label(line) {
            current_section = section;
            continue;
        }

        if matches!(
            current_section,
            "skills"
                | "education"
                | "certifications"
                | "licenses"
                | "languages"
                | "awards"
                | "publications"
                | "references"
                | "interests"
        ) {
            continue;
        }

        if line_looks_like_keyword_list(line) {
            return true;
        }
    }

    false
}

pub(super) fn line_looks_like_keyword_list(line: &str) -> bool {
    let trimmed = line
        .trim()
        .trim_start_matches(|c: char| c == '-' || c == '*' || c == '•')
        .trim();
    if trimmed.is_empty() {
        return false;
    }

    let separator_count = trimmed.matches(',').count() + trimmed.matches(';').count();
    if separator_count < 4 {
        return false;
    }

    let word_count = trimmed.split_whitespace().count();
    if !(5..=24).contains(&word_count) {
        return false;
    }

    let lower = trimmed.to_lowercase();
    let action_words = [
        " led ",
        " managed ",
        " built ",
        " improved ",
        " coordinated ",
        " trained ",
        " supported ",
        " delivered ",
        " reduced ",
        " increased ",
        " created ",
        " maintained ",
    ];
    let padded = format!(" {lower} ");
    !action_words.iter().any(|word| padded.contains(word))
}

fn text_has_generic_filler_bullet(text: &str) -> bool {
    let mut current_section = "resume text";

    for line in text.lines() {
        if let Some(section) = AtsAnalyzer::plain_text_section_label(line) {
            current_section = section;
            continue;
        }

        if matches!(
            current_section,
            "skills"
                | "education"
                | "certifications"
                | "licenses"
                | "languages"
                | "awards"
                | "publications"
                | "references"
                | "interests"
        ) {
            continue;
        }

        if line_looks_like_generic_resume_filler(line) {
            return true;
        }
    }

    false
}

pub(super) fn line_looks_like_generic_resume_filler(line: &str) -> bool {
    let trimmed = line
        .trim()
        .trim_start_matches(|c: char| c == '-' || c == '*' || c == '•')
        .trim();
    if trimmed.is_empty() {
        return false;
    }

    let word_count = trimmed.split_whitespace().count();
    if !(7..=32).contains(&word_count) {
        return false;
    }

    let lower = trimmed.to_lowercase();
    let filler_phrases = [
        "results-oriented",
        "results oriented",
        "dynamic",
        "team player",
        "proven track record",
        "strategic",
        "excellence",
        "self-motivated",
        "self motivated",
        "detail-oriented",
        "detail oriented",
        "fast-paced",
        "fast paced",
        "go-getter",
        "go getter",
        "synergy",
        "best-in-class",
        "best in class",
        "world-class",
        "world class",
        "passionate",
    ];
    let phrase_count = filler_phrases
        .iter()
        .filter(|phrase| lower.contains(*phrase))
        .count();

    phrase_count >= 4
}

pub(super) fn push_special_character_issues(
    text: &str,
    issues: &mut Vec<FormatIssue>,
    suggestions: &mut Vec<AtsSuggestion>,
) {
    if text_has_icon_or_private_unicode(text) {
        issues.push(FormatIssue {
            severity: IssueSeverity::Warning,
            issue: "Icon or private-use Unicode detected".to_string(),
            fix:
                "Replace icon-font glyphs with plain text labels so contact details and section markers stay readable."
                    .to_string(),
        });
        suggestions.push(AtsSuggestion {
            category: SuggestionCategory::FormatFix,
            suggestion:
                "Review icons, decorative glyphs, and icon-font exports before submitting this resume."
                    .to_string(),
            impact:
                "Keeps important text readable when application systems extract plain text."
                    .to_string(),
        });
    }

    let decorative_symbol_count = count_decorative_symbols(text);
    if decorative_symbol_count > 3 {
        issues.push(FormatIssue {
            severity: IssueSeverity::Warning,
            issue: "Too many emoji or decorative symbols in resume text".to_string(),
            fix: "Use plain resume text for bullets, section markers, and contact labels."
                .to_string(),
        });
        suggestions.push(AtsSuggestion {
            category: SuggestionCategory::FormatFix,
            suggestion: "Replace decorative symbols with ordinary words or standard punctuation."
                .to_string(),
            impact: "Reduces the chance that parsing tools drop or mangle resume text.".to_string(),
        });
    } else if decorative_symbol_count > 0 {
        issues.push(FormatIssue {
            severity: IssueSeverity::Info,
            issue: "Decorative symbol found in resume text".to_string(),
            fix: "Keep important qualifications in plain words, not decorative symbols."
                .to_string(),
        });
    }
}

fn text_has_icon_or_private_unicode(text: &str) -> bool {
    text.chars().any(is_private_use_unicode)
        || text_has_icon_class_token(text)
        || text_has_icon_font_family(text)
}

fn is_private_use_unicode(ch: char) -> bool {
    ('\u{E000}'..='\u{F8FF}').contains(&ch) || ('\u{F0000}'..='\u{FFFFD}').contains(&ch)
}

fn count_decorative_symbols(text: &str) -> usize {
    text.chars().filter(|ch| is_decorative_symbol(*ch)).count()
}

fn is_decorative_symbol(ch: char) -> bool {
    ('\u{1F000}'..='\u{1FAFF}').contains(&ch)
        || ('\u{2600}'..='\u{27BF}').contains(&ch)
        || ('\u{2B00}'..='\u{2BFF}').contains(&ch)
        || ('\u{FE00}'..='\u{FE0F}').contains(&ch)
        || ('\u{1F1E6}'..='\u{1F1FF}').contains(&ch)
}

fn text_has_icon_class_token(text: &str) -> bool {
    let class_re = regex::Regex::new(r#"(?is)\bclass\s*=\s*["']([^"']*)["']"#).unwrap();
    let has_icon_class = class_re.captures_iter(text).any(|captures| {
        captures
            .get(1)
            .map(|classes| classes.as_str().split_whitespace().any(is_icon_class_token))
            .unwrap_or(false)
    });
    has_icon_class
}

fn is_icon_class_token(token: &str) -> bool {
    let token = token.to_ascii_lowercase();
    let icon_tokens = [
        "fa",
        "fas",
        "far",
        "fab",
        "fal",
        "glyphicon",
        "material-icons",
        "material-symbols",
        "bi",
        "mdi",
        "icon",
    ];
    icon_tokens
        .iter()
        .any(|icon| token == *icon || token.starts_with(&format!("{icon}-")))
}

fn text_has_icon_font_family(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    [
        "font awesome",
        "fontawesome",
        "material icons",
        "material symbols",
        "glyphicons",
        "bootstrap-icons",
        "icomoon",
    ]
    .iter()
    .any(|family| lower.contains(family))
}

fn is_standard_resume_heading(line: &str) -> bool {
    let normalized = line
        .trim()
        .trim_end_matches(':')
        .to_lowercase()
        .replace('/', " ")
        .replace('&', " and ");
    let normalized = normalized.split_whitespace().collect::<Vec<_>>().join(" ");
    matches!(
        normalized.as_str(),
        "summary"
            | "profile"
            | "skills"
            | "skills technical skills"
            | "technical skills"
            | "core skills"
            | "professional experience"
            | "work experience"
            | "relevant experience"
            | "selected experience"
            | "additional experience"
            | "employment history"
            | "work history"
            | "professional history"
            | "experience"
            | "projects"
            | "selected projects"
            | "education"
            | "academic background"
            | "academic history"
            | "education background"
            | "certifications"
            | "licenses"
            | "licenses and certifications"
            | "certifications and licenses"
            | "professional credentials"
            | "credentials"
            | "professional training"
            | "training"
            | "certificates"
            | "languages"
            | "language skills"
            | "awards"
            | "honors and awards"
            | "career break"
            | "career breaks"
            | "career pause"
            | "family caregiving"
            | "caregiving"
            | "volunteer experience"
            | "volunteering"
            | "community involvement"
            | "community service"
            | "military service"
            | "military experience"
            | "service"
            | "publications"
            | "references"
            | "interests"
    )
}
