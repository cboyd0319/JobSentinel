#![allow(clippy::expect_used)] // Embedded taxonomy data must fail fast.

use once_cell::sync::Lazy;
use serde::Deserialize;

const RESUME_FORMAT_TAXONOMY_JSON: &str =
    include_str!("../../../../src/shared/resumeFormatTaxonomy.json");

static RESUME_FORMAT_TAXONOMY: Lazy<ResumeFormatTaxonomy> = Lazy::new(load_resume_format_taxonomy);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ResumeFormatTaxonomy {
    pub(super) standard_resume_headings: Vec<String>,
    pub(super) section_aliases: Vec<ResumeSectionAlias>,
    pub(super) icon_class_tokens: Vec<String>,
    pub(super) icon_font_families: Vec<String>,
    pub(super) ats_friendly_fonts: Vec<String>,
    pub(super) risky_fonts: Vec<String>,
    pub(super) custom_font_signals: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ResumeSectionAlias {
    pub(super) section: String,
    pub(super) headings: Vec<String>,
}

fn load_resume_format_taxonomy() -> ResumeFormatTaxonomy {
    let taxonomy: ResumeFormatTaxonomy = serde_json::from_str(RESUME_FORMAT_TAXONOMY_JSON)
        .expect("resume format taxonomy JSON must be valid");

    assert_nonblank_list(
        &taxonomy.standard_resume_headings,
        "standard resume headings",
    );
    assert_nonblank_list(&taxonomy.icon_class_tokens, "icon class tokens");
    assert_nonblank_list(&taxonomy.icon_font_families, "icon font families");
    assert_nonblank_list(&taxonomy.ats_friendly_fonts, "ATS-friendly fonts");
    assert_nonblank_list(&taxonomy.risky_fonts, "risky fonts");
    assert_nonblank_list(&taxonomy.custom_font_signals, "custom font signals");
    assert!(
        !taxonomy.section_aliases.is_empty(),
        "resume format taxonomy must define section aliases"
    );
    for alias in &taxonomy.section_aliases {
        assert!(
            !alias.section.trim().is_empty() && alias.section == alias.section.trim(),
            "resume section alias names must be nonblank and trimmed"
        );
        assert_nonblank_list(&alias.headings, "resume section alias headings");
    }

    taxonomy
}

fn assert_nonblank_list(values: &[String], label: &str) {
    assert!(
        !values.is_empty(),
        "resume format taxonomy must define {label}"
    );
    assert!(
        values
            .iter()
            .all(|value| !value.trim().is_empty() && value == value.trim()),
        "resume format taxonomy {label} must be nonblank and trimmed"
    );
}

pub(super) fn resume_format_taxonomy() -> &'static ResumeFormatTaxonomy {
    &RESUME_FORMAT_TAXONOMY
}
