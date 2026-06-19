//! Job Title Normalization Utilities
//!
//! Provides fuzzy matching for job titles by normalizing variations.
//! Helps improve deduplication accuracy by treating similar titles as identical.
//!
//! # Features
//!
//! - **Abbreviation expansion**: "Sr. SW Eng" → "senior software engineer"
//! - **Level indicator removal**: "Engineer (L5)" → "engineer"
//! - **Whitespace normalization**: "Software  Engineer" → "software engineer"
#![allow(clippy::unwrap_used, clippy::expect_used)] // Embedded taxonomy regexes must fail fast.
//! - **Case normalization**: "SENIOR ENGINEER" → "senior engineer"
//!
//! # Example
//!
//! ```
//! use jobsentinel::core::scrapers::title_utils::normalize_title;
//!
//! let title1 = normalize_title("Sr. Software Engineer (L5)");
//! let title2 = normalize_title("Senior SW Eng - Level 5");
//! assert_eq!(title1, title2); // Both normalize to "senior software engineer"
//! ```

use regex::Regex;
use serde::Deserialize;
use std::borrow::Cow;
use std::sync::LazyLock;

const JOB_TITLE_NORMALIZATION_TAXONOMY_JSON: &str =
    include_str!("../../../../src/shared/jobTitleNormalizationTaxonomy.json");

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JobTitleNormalizationTaxonomy {
    schema_version: u32,
    filler_words: Vec<String>,
    abbreviations: Vec<TitleAbbreviation>,
}

#[derive(Debug, Deserialize)]
struct TitleAbbreviation {
    pattern: String,
    replacement: String,
}

static JOB_TITLE_NORMALIZATION_TAXONOMY: LazyLock<JobTitleNormalizationTaxonomy> =
    LazyLock::new(load_job_title_normalization_taxonomy);

fn load_job_title_normalization_taxonomy() -> JobTitleNormalizationTaxonomy {
    let taxonomy: JobTitleNormalizationTaxonomy =
        serde_json::from_str(JOB_TITLE_NORMALIZATION_TAXONOMY_JSON)
            .expect("job title normalization taxonomy must be valid JSON");

    assert_eq!(
        taxonomy.schema_version, 1,
        "unsupported job title normalization taxonomy schema version"
    );
    assert!(
        !taxonomy.filler_words.is_empty(),
        "job title normalization taxonomy must define filler words"
    );
    assert!(
        !taxonomy.abbreviations.is_empty(),
        "job title normalization taxonomy must define abbreviations"
    );
    assert!(
        taxonomy
            .filler_words
            .iter()
            .all(|word| !word.trim().is_empty() && word == word.trim()),
        "job title normalization filler words must be nonblank and trimmed"
    );
    assert!(
        taxonomy.abbreviations.iter().all(|mapping| {
            !mapping.pattern.trim().is_empty()
                && !mapping.replacement.trim().is_empty()
                && mapping.pattern == mapping.pattern.trim()
        }),
        "job title normalization abbreviation mappings must be nonblank and trimmed"
    );

    taxonomy
}

/// Regex pattern for level indicators to remove
static LEVEL_PATTERN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\s*[-–—]\s*level\s+\d+|\s*\(?\s*[IL]\s*-?\s*[CLIV]?\d+\s*\)?|\s*\[\s*IC\d+\s*\]|\s+[IVX]+\b")
        .expect("Valid level pattern regex")
});

/// Regex pattern for extra whitespace
static WHITESPACE_PATTERN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\s+").expect("Valid whitespace regex"));

/// Regex pattern for trailing punctuation
static TRAILING_PUNCT_PATTERN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[.!?,;:]+$").expect("Valid trailing punctuation regex"));

/// Regex pattern for normalizing commas (replace with space)
static COMMA_PATTERN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r",\s*").expect("Valid comma regex"));

/// Regex pattern for removing filler words
static FILLER_WORDS_PATTERN: LazyLock<Regex> = LazyLock::new(|| {
    let escaped_words = JOB_TITLE_NORMALIZATION_TAXONOMY
        .filler_words
        .iter()
        .map(|word| regex::escape(word))
        .collect::<Vec<_>>()
        .join("|");
    Regex::new(&format!(r"\b(?:{})\b", escaped_words)).expect("Valid filler words regex")
});

/// Pre-compiled abbreviation regexes for performance
static ABBREVIATION_REGEXES: LazyLock<Vec<(Regex, String)>> = LazyLock::new(|| {
    JOB_TITLE_NORMALIZATION_TAXONOMY
        .abbreviations
        .iter()
        .map(|mapping| {
            let regex = Regex::new(&format!("(?i){}", mapping.pattern))
                .expect("Valid abbreviation regex pattern");
            (regex, mapping.replacement.clone())
        })
        .collect()
});

/// Normalize a job title for fuzzy matching
///
/// This function performs the following transformations:
/// 1. Lowercase the title
/// 2. Expand common abbreviations (Sr. → senior, Eng → engineer, etc.)
/// 3. Remove level indicators (L5, IC4, Level 3, etc.)
/// 4. Normalize whitespace (collapse multiple spaces)
/// 5. Remove trailing punctuation
///
/// # Arguments
///
/// * `title` - The job title to normalize
///
/// # Returns
///
/// The normalized title suitable for comparison (borrows input if already normalized)
///
/// # Examples
///
/// ```
/// use jobsentinel::core::scrapers::title_utils::normalize_title;
///
/// assert_eq!(
///     normalize_title("Sr. Software Engineer (L5)"),
///     "senior software engineer"
/// );
///
/// assert_eq!(
///     normalize_title("Jr. Frontend Dev - Level 2"),
///     "junior frontend developer"
/// );
///
/// assert_eq!(
///     normalize_title("VP of Engineering"),
///     "vice president engineering"
/// );
/// ```
#[must_use]
#[inline]
pub fn normalize_title(title: &str) -> Cow<'_, str> {
    let trimmed = title.trim();

    // Fast path: check if already normalized (lowercase, no special chars)
    let is_already_normalized = trimmed.chars().all(|c| c.is_ascii_lowercase() || c == ' ')
        && !trimmed.contains("  ") // No double spaces
        && !LEVEL_PATTERN.is_match(trimmed)
        && !COMMA_PATTERN.is_match(trimmed)
        && !TRAILING_PUNCT_PATTERN.is_match(trimmed)
        && !ABBREVIATION_REGEXES.iter().any(|(regex, _)| regex.is_match(trimmed));

    if is_already_normalized {
        return Cow::Borrowed(trimmed);
    }

    // Step 1: Lowercase
    let mut normalized = title.to_lowercase();

    // Step 2: Normalize commas to spaces (e.g., "VP, Engineering" → "VP Engineering")
    if COMMA_PATTERN.is_match(&normalized) {
        normalized = COMMA_PATTERN.replace_all(&normalized, " ").into_owned();
    }

    // Step 3: Remove filler words (of, the, and, or)
    if FILLER_WORDS_PATTERN.is_match(&normalized) {
        normalized = FILLER_WORDS_PATTERN
            .replace_all(&normalized, "")
            .into_owned();
    }

    // Step 4: Expand abbreviations (with case-insensitive matching)
    for (regex, replacement) in ABBREVIATION_REGEXES.iter() {
        if regex.is_match(&normalized) {
            normalized = regex
                .replace_all(&normalized, replacement.as_str())
                .into_owned();
        }
    }

    // Step 5: Remove level indicators
    if LEVEL_PATTERN.is_match(&normalized) {
        normalized = LEVEL_PATTERN.replace_all(&normalized, "").into_owned();
    }

    // Step 6: Normalize whitespace
    if WHITESPACE_PATTERN.is_match(&normalized) {
        normalized = WHITESPACE_PATTERN
            .replace_all(&normalized, " ")
            .into_owned();
    }

    // Step 7: Remove trailing punctuation
    if TRAILING_PUNCT_PATTERN.is_match(&normalized) {
        normalized = TRAILING_PUNCT_PATTERN
            .replace_all(&normalized, "")
            .into_owned();
    }

    // Final trim and return owned
    Cow::Owned(normalized.trim().to_string())
}

/// Check if two job titles match after normalization
///
/// # Arguments
///
/// * `title1` - First job title
/// * `title2` - Second job title
///
/// # Returns
///
/// `true` if the titles normalize to the same string
///
/// # Examples
///
/// ```
/// use jobsentinel::core::scrapers::title_utils::titles_match;
///
/// assert!(titles_match(
///     "Sr. Software Engineer (L5)",
///     "Senior SW Eng - Level 5"
/// ));
///
/// assert!(titles_match(
///     "Frontend Developer",
///     "FE Dev"
/// ));
///
/// assert!(!titles_match(
///     "Software Engineer",
///     "Product Manager"
/// ));
/// ```
#[must_use]
#[inline]
pub fn titles_match(title1: &str, title2: &str) -> bool {
    normalize_title(title1) == normalize_title(title2)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_normalization() {
        assert_eq!(normalize_title("Software Engineer"), "software engineer");
    }

    #[test]
    fn test_seniority_abbreviations() {
        assert_eq!(
            normalize_title("Sr. Software Engineer"),
            "senior software engineer"
        );
        assert_eq!(
            normalize_title("Sr Software Engineer"),
            "senior software engineer"
        );
        assert_eq!(normalize_title("Jr. Developer"), "junior developer");
        assert_eq!(normalize_title("Jr Developer"), "junior developer");
    }

    #[test]
    fn test_job_function_abbreviations() {
        assert_eq!(normalize_title("SW Engineer"), "software engineer");
        assert_eq!(normalize_title("SW Eng"), "software engineer");
        assert_eq!(normalize_title("Software Engr"), "software engineer");
        assert_eq!(normalize_title("Frontend Dev"), "frontend developer");
        assert_eq!(normalize_title("FE Developer"), "frontend developer");
        assert_eq!(normalize_title("BE Engineer"), "backend engineer");
        assert_eq!(normalize_title("FS Developer"), "fullstack developer");
    }

    #[test]
    fn test_role_abbreviations() {
        assert_eq!(normalize_title("SWE"), "software engineer");
        assert_eq!(normalize_title("SDE"), "software development engineer");
        assert_eq!(normalize_title("Eng Mgr"), "engineer manager");
        assert_eq!(
            normalize_title("VP of Engineering"),
            "vice president engineering"
        );
        assert_eq!(normalize_title("Dir. of Technology"), "director technology");
    }

    #[test]
    fn test_level_indicators_removed() {
        assert_eq!(
            normalize_title("Software Engineer (L5)"),
            "software engineer"
        );
        assert_eq!(normalize_title("Engineer [IC4]"), "engineer");
        assert_eq!(normalize_title("Developer - Level 3"), "developer");
        assert_eq!(normalize_title("SWE II"), "software engineer");
        assert_eq!(normalize_title("Engineer (I-5)"), "engineer");
        assert_eq!(normalize_title("Developer L-4"), "developer");
    }

    #[test]
    fn test_whitespace_normalization() {
        assert_eq!(normalize_title("Software  Engineer"), "software engineer");
        assert_eq!(
            normalize_title("  Software   Engineer  "),
            "software engineer"
        );
    }

    #[test]
    fn test_trailing_punctuation_removed() {
        assert_eq!(normalize_title("Software Engineer."), "software engineer");
        assert_eq!(normalize_title("Software Engineer!"), "software engineer");
        assert_eq!(normalize_title("Software Engineer..."), "software engineer");
    }

    #[test]
    fn test_combined_transformations() {
        // Multiple abbreviations + level indicators
        assert_eq!(
            normalize_title("Sr. SW Eng (L5)"),
            "senior software engineer"
        );
        assert_eq!(
            normalize_title("Jr. FE Dev - Level 2"),
            "junior frontend developer"
        );
        assert_eq!(
            normalize_title("VP, Eng Mgr [IC6]"),
            "vice president engineer manager"
        );
    }

    #[test]
    fn test_real_world_examples() {
        // Common variations that should match
        let variations = vec![
            "Senior Software Engineer",
            "Sr. Software Engineer",
            "Sr. SW Engineer",
            "Senior SW Eng",
            "Sr Software Engr",
        ];

        let normalized: Vec<String> = variations
            .iter()
            .map(|v| normalize_title(v).into_owned())
            .collect();

        // All should normalize to the same string
        for n in &normalized[1..] {
            assert_eq!(
                &normalized[0], n,
                "All variations should normalize to the same string"
            );
        }
    }

    #[test]
    fn test_titles_match_function() {
        // Should match
        assert!(titles_match(
            "Sr. Software Engineer (L5)",
            "Senior SW Eng - Level 5"
        ));
        assert!(titles_match("Frontend Developer", "FE Dev"));
        assert!(titles_match("VP of Engineering", "VP, Engineering"));

        // Should not match
        assert!(!titles_match("Software Engineer", "Product Manager"));
        assert!(!titles_match("Senior Engineer", "Junior Engineer"));
        assert!(!titles_match("Frontend Developer", "Backend Developer"));
    }

    #[test]
    fn test_case_insensitive() {
        assert_eq!(
            normalize_title("SENIOR SOFTWARE ENGINEER"),
            normalize_title("senior software engineer")
        );
        assert_eq!(
            normalize_title("Senior Software Engineer"),
            normalize_title("SENIOR SOFTWARE ENGINEER")
        );
    }

    #[test]
    fn test_edge_cases() {
        // Empty string
        assert_eq!(normalize_title(""), "");

        // Just whitespace
        assert_eq!(normalize_title("   "), "");

        // Just punctuation
        assert_eq!(normalize_title("..."), "");

        // Single word
        assert_eq!(normalize_title("Engineer"), "engineer");

        // Already normalized
        assert_eq!(normalize_title("software engineer"), "software engineer");
    }

    #[test]
    fn test_tech_abbreviations() {
        assert_eq!(normalize_title("ML Engineer"), "machine learning engineer");
        assert_eq!(
            normalize_title("AI Researcher"),
            "artificial intelligence researcher"
        );
        assert_eq!(normalize_title("DB Admin"), "database administrator");
        assert_eq!(normalize_title("QA Engineer"), "quality assurance engineer");
        assert_eq!(
            normalize_title("UI/UX Designer"),
            "user interface/user experience designer"
        );
    }
}
