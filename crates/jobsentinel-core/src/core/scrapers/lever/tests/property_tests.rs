use super::*;
use proptest::prelude::*;

// ========================================
// Property-Based Tests
// ========================================

proptest! {
    /// Property: Hash function is deterministic
    #[test]
    fn prop_hash_deterministic(
        company in "\\PC{1,100}",
        title in "\\PC{1,200}",
        location in proptest::option::of("\\PC{1,100}"),
        url in "https?://[a-z0-9./]+",
    ) {
        let hash1 = LeverScraper::compute_hash(&company, &title, location.as_deref(), &url);
        let hash2 = LeverScraper::compute_hash(&company, &title, location.as_deref(), &url);

        prop_assert_eq!(hash1.clone(), hash2);
        prop_assert_eq!(hash1.len(), 64);
    }

    /// Property: Hash collision resistance
    #[test]
    fn prop_hash_collision_resistance(
        company1 in "\\PC{1,100}",
        company2 in "\\PC{1,100}",
        title in "\\PC{1,200}",
        url in "https?://[a-z0-9./]+",
    ) {
        prop_assume!(company1 != company2);

        let hash1 = LeverScraper::compute_hash(&company1, &title, None, &url);
        let hash2 = LeverScraper::compute_hash(&company2, &title, None, &url);

        prop_assert_ne!(hash1, hash2);
    }

    /// Property: Remote inference from title is case-insensitive
    #[test]
    fn prop_remote_inference_case_insensitive(
        prefix in "(remote|REMOTE|Remote|ReMoTe)",
        title in "[a-zA-Z ]{5,50}",
    ) {
        let full_title = format!("{} {}", prefix, title);
        prop_assert!(LeverScraper::infer_remote(&full_title, None));
    }

    /// Property: Remote inference from location handles various "remote" spellings
    #[test]
    fn prop_remote_inference_from_location(
        location in "(Remote|remote|REMOTE|Anywhere|anywhere|Worldwide|worldwide)",
    ) {
        prop_assert!(LeverScraper::infer_remote("Care Coordinator", Some(&location)));
    }

    /// Property: Non-remote titles don't trigger false positives
    #[test]
    fn prop_remote_inference_no_false_positives(
        title in "[a-zA-Z ]{5,50}",
        location in "(New York|San Francisco|London|Tokyo|Austin)",
    ) {
        prop_assume!(!title.to_lowercase().contains("remote"));
        prop_assume!(!title.to_lowercase().contains("work from home"));
        prop_assume!(!title.to_lowercase().contains("wfh"));

        prop_assert!(!LeverScraper::infer_remote(&title, Some(&location)));
    }

    /// Property: Hash handles Unicode characters
    #[test]
    fn prop_hash_unicode_support(
        company in "[\\PC🦀]{1,50}",
        title in "[\\PC💼]{1,100}",
        url in "\\PC{10,200}",
    ) {
        let hash = LeverScraper::compute_hash(&company, &title, None, &url);

        prop_assert_eq!(hash.len(), 64);
        prop_assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
