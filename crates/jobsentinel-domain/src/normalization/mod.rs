//! Owner-neutral normalization used by job identity and source adapters.

use jobsentinel_security::contains_review_required_invisible_control;

mod location;
mod title;
mod url;
mod work_arrangement;

pub use location::normalize_location;
pub use title::{normalize_title, titles_match};
pub use url::{canonicalize_job_url, normalize_url};
pub use work_arrangement::{infer_remote_status, resolve_remote_status, RemoteStatus};

/// Returns whether source text contains a control that requires rejection before persistence.
pub(crate) fn contains_unsafe_source_control(value: &str) -> bool {
    value.chars().any(is_hidden_dangerous_control)
        || contains_review_required_invisible_control(value)
}

const fn is_hidden_dangerous_control(character: char) -> bool {
    character.is_control()
        || matches!(
            character,
            '\u{200C}'..='\u{200F}'
                | '\u{202A}'..='\u{202E}'
                | '\u{2066}'..='\u{206F}'
                | '\u{FFF9}'..='\u{FFFB}'
        )
}

#[cfg(test)]
mod policy_contract_tests {
    use super::{
        infer_remote_status, normalize_location, normalize_title, resolve_remote_status,
        RemoteStatus,
    };

    #[test]
    fn canonical_title_and_location_cases_are_table_driven() {
        for (input, expected) in [
            ("Sr. SWE (L5)", "senior software engineer"),
            ("Care  Coordinator", "care coordinator"),
            ("Already normalized", "already normalized"),
        ] {
            assert_eq!(normalize_title(input), expected, "title: {input}");
        }

        for (input, expected) in [
            ("SF, CA", "san francisco, california"),
            ("Remote - USA", "remote"),
            ("Anywhere", "remote"),
            ("Work from home", "remote"),
            ("Satisfactory Location", "satisfactory location"),
        ] {
            assert_eq!(normalize_location(input), expected, "location: {input}");
        }
    }

    #[test]
    fn text_fallback_distinguishes_work_arrangements() {
        for (texts, expected) in [
            (&["hybrid remote role"][..], RemoteStatus::Hybrid),
            (&["distributed team"][..], RemoteStatus::Remote),
            (&["work from anywhere"][..], RemoteStatus::Remote),
            (&["in-office only"][..], RemoteStatus::Onsite),
            (&["great benefits"][..], RemoteStatus::Unspecified),
        ] {
            assert_eq!(infer_remote_status(texts), expected, "texts: {texts:?}");
        }
    }

    #[test]
    fn structured_work_arrangement_is_authoritative() {
        assert_eq!(
            resolve_remote_status(Some(RemoteStatus::Onsite), &["fully remote"]),
            RemoteStatus::Onsite
        );
        assert_eq!(
            resolve_remote_status(Some(RemoteStatus::Remote), &["hybrid schedule"]),
            RemoteStatus::Remote
        );
        assert_eq!(
            resolve_remote_status(None, &["hybrid schedule"]),
            RemoteStatus::Hybrid
        );
    }
}
