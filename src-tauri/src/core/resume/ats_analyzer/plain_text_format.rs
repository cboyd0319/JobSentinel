use super::super::ats_types::{
    AtsAnalysisResult, AtsSuggestion, FormatIssue, IssueSeverity, SuggestionCategory,
};
use super::structured_format;
use super::AtsAnalyzer;
use once_cell::sync::Lazy;
use scraper::{Html, Selector as HtmlSelector};
use serde::Deserialize;

const RESUME_FORMAT_TAXONOMY_JSON: &str =
    include_str!("../../../../../src/shared/resumeFormatTaxonomy.json");

static RESUME_FORMAT_TAXONOMY: Lazy<ResumeFormatTaxonomy> = Lazy::new(|| {
    serde_json::from_str(RESUME_FORMAT_TAXONOMY_JSON)
        .expect("resume format taxonomy JSON must be valid")
});

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResumeFormatTaxonomy {
    standard_resume_headings: Vec<String>,
    icon_class_tokens: Vec<String>,
    icon_font_families: Vec<String>,
    ats_friendly_fonts: Vec<String>,
    risky_fonts: Vec<String>,
    custom_font_signals: Vec<String>,
}

pub(super) fn analyze_plain_text_format(resume_text: &str) -> AtsAnalysisResult {
    analyze_plain_text_format_with_source(resume_text, None)
}

pub(super) fn analyze_plain_text_format_with_source(
    resume_text: &str,
    source_text: Option<&str>,
) -> AtsAnalysisResult {
    let readable_text = resume_text.trim();
    let source_text = source_text.map(str::trim).filter(|text| !text.is_empty());
    let mut format_issues = Vec::new();
    let mut suggestions = Vec::new();

    if readable_text.is_empty() {
        format_issues.push(FormatIssue {
            severity: IssueSeverity::Critical,
            issue: "No readable resume text found".to_string(),
            fix: "Add a resume with readable text before reviewing job fit.".to_string(),
        });
    }

    if structured_format::text_has_adversarial_content(readable_text)
        || source_text.is_some_and(structured_format::text_has_adversarial_content)
    {
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
    check_html_source_risks(
        source_text.unwrap_or(readable_text),
        &mut format_issues,
        &mut suggestions,
    );

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

fn check_html_source_risks(
    resume_text: &str,
    issues: &mut Vec<FormatIssue>,
    suggestions: &mut Vec<AtsSuggestion>,
) {
    if !looks_like_html_resume_source(resume_text) {
        return;
    }

    let style_text = collect_html_style_text(resume_text);
    if has_html_table_or_multicolumn_layout(resume_text, &style_text) {
        issues.push(FormatIssue {
            severity: IssueSeverity::Warning,
            issue: "HTML table or multi-column layout detected".to_string(),
            fix:
                "Use a simple single-column resume layout for important content before submitting."
                    .to_string(),
        });
        suggestions.push(AtsSuggestion {
            category: SuggestionCategory::FormatFix,
            suggestion: "Check the HTML resume in a plain-text preview before sending it."
                .to_string(),
            impact:
                "Tables, CSS grid columns, floats, and wrapped flex layouts can scramble reading order for parsers."
                    .to_string(),
        });
    }

    let taxonomy = resume_format_taxonomy();
    let lower_style_text = style_text.to_ascii_lowercase();
    if let Some(font) = taxonomy
        .risky_fonts
        .iter()
        .find(|font| lower_style_text.contains(font.as_str()))
    {
        issues.push(FormatIssue {
            severity: IssueSeverity::Warning,
            issue: format!("Non-standard resume font detected: {font}"),
            fix: "Use a standard ATS-friendly font such as Arial, Calibri, Helvetica, Georgia, Times New Roman, Verdana, Tahoma, or Segoe UI.".to_string(),
        });
        suggestions.push(AtsSuggestion {
            category: SuggestionCategory::FormatFix,
            suggestion: "Replace decorative resume fonts with a common system font stack."
                .to_string(),
            impact: "Reduces the chance that automated systems render or extract text poorly."
                .to_string(),
        });
    }

    if taxonomy
        .custom_font_signals
        .iter()
        .any(|signal| lower_style_text.contains(signal.as_str()))
    {
        issues.push(FormatIssue {
            severity: IssueSeverity::Warning,
            issue: "Custom web font dependency detected".to_string(),
            fix: "Use standard fonts or provide a plain fallback font stack for the resume."
                .to_string(),
        });
    }

    if lower_style_text.contains("font-family")
        && !taxonomy
            .ats_friendly_fonts
            .iter()
            .any(|font| lower_style_text.contains(font.as_str()))
    {
        issues.push(FormatIssue {
            severity: IssueSeverity::Info,
            issue: "No standard ATS-friendly font found in HTML styles".to_string(),
            fix: "Use a common system font such as Arial, Calibri, Helvetica, Georgia, Times New Roman, Verdana, Tahoma, or Segoe UI.".to_string(),
        });
    }

    if has_tiny_html_font_size(&style_text) {
        issues.push(FormatIssue {
            severity: IssueSeverity::Warning,
            issue: "Very small HTML font size detected".to_string(),
            fix:
                "Keep resume body text at 10px or larger and do not hide text with tiny font sizes."
                    .to_string(),
        });
    }
}

fn looks_like_html_resume_source(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    lower.contains("<html")
        || lower.contains("<body")
        || lower.contains("<style")
        || lower.contains("<table")
        || lower.contains("<section")
}

fn collect_html_style_text(html: &str) -> String {
    let document = Html::parse_document(html);
    let mut chunks = Vec::new();

    if let Ok(style_selector) = HtmlSelector::parse("style") {
        for style in document.select(&style_selector) {
            let text = style.text().collect::<Vec<_>>().join(" ");
            if !text.trim().is_empty() {
                chunks.push(text);
            }
        }
    }

    let inline_style_re = regex::Regex::new(r#"(?is)\bstyle\s*=\s*["']([^"']+)["']"#).unwrap();
    chunks.extend(
        inline_style_re
            .captures_iter(html)
            .filter_map(|captures| captures.get(1).map(|style| style.as_str().to_string())),
    );

    chunks.join("\n")
}

fn has_html_table_or_multicolumn_layout(html: &str, style_text: &str) -> bool {
    let lower_html = html.to_ascii_lowercase();
    let lower_style = style_text.to_ascii_lowercase();

    lower_html.contains("<table")
        || lower_style.contains("column-count")
        || lower_style.contains("columns:")
        || regex::Regex::new(r"(?i)float\s*:\s*(?:left|right)")
            .unwrap()
            .find_iter(style_text)
            .count()
            > 1
        || regex::Regex::new(r"(?is)grid-template-columns\s*:[^;]*\S+\s+\S+")
            .unwrap()
            .is_match(style_text)
        || (lower_style.contains("flex-wrap")
            && lower_style.contains("justify-content: space-between"))
}

fn has_tiny_html_font_size(style_text: &str) -> bool {
    let font_size_re =
        regex::Regex::new(r"(?i)font-size\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*(px|pt)\b").unwrap();

    let has_tiny_size = font_size_re.captures_iter(style_text).any(|captures| {
        let Some(value) = captures
            .get(1)
            .and_then(|value| value.as_str().parse::<f64>().ok())
        else {
            return false;
        };
        let unit = captures
            .get(2)
            .map(|unit| unit.as_str().to_ascii_lowercase())
            .unwrap_or_default();

        match unit.as_str() {
            "px" => value < 10.0,
            "pt" => value < 8.0,
            _ => false,
        }
    });

    has_tiny_size
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
    resume_format_taxonomy()
        .icon_class_tokens
        .iter()
        .any(|icon| token == icon.as_str() || token.starts_with(&format!("{icon}-")))
}

fn text_has_icon_font_family(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    resume_format_taxonomy()
        .icon_font_families
        .iter()
        .any(|family| lower.contains(family.as_str()))
}

fn is_standard_resume_heading(line: &str) -> bool {
    let normalized = line
        .trim()
        .trim_end_matches(':')
        .to_lowercase()
        .replace('/', " ")
        .replace('&', " and ");
    let normalized = normalized.split_whitespace().collect::<Vec<_>>().join(" ");

    resume_format_taxonomy()
        .standard_resume_headings
        .iter()
        .any(|heading| heading == &normalized)
}

fn resume_format_taxonomy() -> &'static ResumeFormatTaxonomy {
    &RESUME_FORMAT_TAXONOMY
}
