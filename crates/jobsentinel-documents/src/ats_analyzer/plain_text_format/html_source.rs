use super::super::super::ats_types::{
    AtsSuggestion, FormatIssue, IssueSeverity, SuggestionCategory,
};
use super::super::super::format_taxonomy::resume_format_taxonomy;

pub(super) fn check_html_source_risks(
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
    let mut chunks = Vec::new();

    let style_element_re = regex::Regex::new(r"(?is)<style\b[^>]*>(.*?)</style\s*>").unwrap();
    chunks.extend(style_element_re.captures_iter(html).filter_map(|captures| {
        captures
            .get(1)
            .map(|style| style.as_str().trim().to_string())
            .filter(|style| !style.is_empty())
    }));

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
