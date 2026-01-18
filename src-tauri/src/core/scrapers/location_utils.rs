//! Location normalization utilities for deduplication
//!
//! Normalizes location strings to canonical forms to improve job deduplication.
//! Handles common abbreviations, state codes, and remote work variations.

use std::collections::HashMap;

/// Normalize a location string to canonical form
///
/// Performs the following transformations:
/// - City abbreviations (SF → San Francisco, NYC → New York, etc.)
/// - State abbreviations (CA → California, NY → New York, etc.)
/// - Remote variants (Remote US, Fully Remote, etc. → remote)
/// - Strips country suffixes (", USA", ", United States")
/// - Lowercases and trims whitespace
///
/// # Examples
/// ```
/// use job_sentinel::core::scrapers::location_utils::normalize_location;
///
/// assert_eq!(normalize_location("SF, CA"), "san francisco, california");
/// assert_eq!(normalize_location("NYC"), "new york");
/// assert_eq!(normalize_location("Remote - USA"), "remote");
/// assert_eq!(normalize_location("Austin, TX, USA"), "austin, texas");
/// ```
pub fn normalize_location(location: &str) -> String {
    if location.trim().is_empty() {
        return String::new();
    }

    let mut normalized = location.trim().to_string();

    // Handle remote variants first (case-insensitive)
    let lower = normalized.to_lowercase();
    if lower.contains("remote") {
        // Remote US, Remote - USA, Fully Remote, etc. → "remote"
        return "remote".to_string();
    }

    // Strip common country suffixes
    for suffix in &[", USA", ", United States", ", US"] {
        if normalized.ends_with(suffix) {
            normalized = normalized[..normalized.len() - suffix.len()].to_string();
        }
    }

    // Split on comma to handle "City, State" format
    let parts: Vec<&str> = normalized.split(',').map(|s| s.trim()).collect();

    let city_map = get_city_abbreviations();
    let state_map = get_state_abbreviations();

    let normalized_parts: Vec<String> = parts
        .iter()
        .map(|part| {
            let lower_part = part.to_lowercase();

            // Check city abbreviations
            if let Some(canonical) = city_map.get(lower_part.as_str()) {
                return canonical.to_lowercase();
            }

            // Check state abbreviations
            if let Some(canonical) = state_map.get(lower_part.as_str()) {
                return canonical.to_lowercase();
            }

            // Return as-is (lowercased)
            lower_part
        })
        .collect();

    normalized_parts.join(", ")
}

/// Get city abbreviation mappings
fn get_city_abbreviations() -> HashMap<&'static str, &'static str> {
    let mut map = HashMap::new();

    // San Francisco variants
    map.insert("sf", "San Francisco");
    map.insert("san fran", "San Francisco");
    map.insert("san francisco", "San Francisco");

    // New York variants
    map.insert("nyc", "New York");
    map.insert("new york city", "New York");
    map.insert("new york", "New York");

    // Los Angeles variants
    map.insert("la", "Los Angeles");
    map.insert("los angeles", "Los Angeles");

    // Washington DC variants
    map.insert("dc", "Washington");
    map.insert("washington dc", "Washington");
    map.insert("washington d.c.", "Washington");
    map.insert("washington", "Washington");

    // Chicago variants
    map.insert("chi", "Chicago");
    map.insert("chicago", "Chicago");

    // Atlanta variants
    map.insert("atl", "Atlanta");
    map.insert("atlanta", "Atlanta");

    // Boston variants
    map.insert("bos", "Boston");
    map.insert("boston", "Boston");

    // Seattle variants
    map.insert("sea", "Seattle");
    map.insert("seattle", "Seattle");

    // Denver variants
    map.insert("den", "Denver");
    map.insert("denver", "Denver");

    // Austin variants
    map.insert("aus", "Austin");
    map.insert("austin", "Austin");

    map
}

/// Get state abbreviation mappings (US states)
fn get_state_abbreviations() -> HashMap<&'static str, &'static str> {
    let mut map = HashMap::new();

    // Common states
    map.insert("ca", "California");
    map.insert("california", "California");

    map.insert("ny", "New York");
    map.insert("new york", "New York");

    map.insert("tx", "Texas");
    map.insert("texas", "Texas");

    map.insert("fl", "Florida");
    map.insert("florida", "Florida");

    map.insert("wa", "Washington");
    map.insert("washington", "Washington");

    map.insert("il", "Illinois");
    map.insert("illinois", "Illinois");

    map.insert("ma", "Massachusetts");
    map.insert("massachusetts", "Massachusetts");

    map.insert("co", "Colorado");
    map.insert("colorado", "Colorado");

    map.insert("ga", "Georgia");
    map.insert("georgia", "Georgia");

    map.insert("az", "Arizona");
    map.insert("arizona", "Arizona");

    map.insert("or", "Oregon");
    map.insert("oregon", "Oregon");

    map.insert("nc", "North Carolina");
    map.insert("north carolina", "North Carolina");

    map.insert("pa", "Pennsylvania");
    map.insert("pennsylvania", "Pennsylvania");

    map.insert("va", "Virginia");
    map.insert("virginia", "Virginia");

    map
}

#[cfg(test)]
mod tests {
    use super::normalize_location;

    #[test]
    fn test_city_abbreviations() {
        assert_eq!(normalize_location("SF"), "san francisco");
        assert_eq!(normalize_location("NYC"), "new york");
        assert_eq!(normalize_location("LA"), "los angeles");
        assert_eq!(normalize_location("DC"), "washington");
        assert_eq!(normalize_location("Chi"), "chicago");
        assert_eq!(normalize_location("ATL"), "atlanta");
        assert_eq!(normalize_location("BOS"), "boston");
        assert_eq!(normalize_location("SEA"), "seattle");
        assert_eq!(normalize_location("DEN"), "denver");
        assert_eq!(normalize_location("AUS"), "austin");
    }

    #[test]
    fn test_city_state_combinations() {
        assert_eq!(normalize_location("SF, CA"), "san francisco, california");
        assert_eq!(normalize_location("NYC, NY"), "new york, new york");
        assert_eq!(normalize_location("LA, CA"), "los angeles, california");
        assert_eq!(normalize_location("Austin, TX"), "austin, texas");
        assert_eq!(normalize_location("Seattle, WA"), "seattle, washington");
        assert_eq!(normalize_location("Boston, MA"), "boston, massachusetts");
    }

    #[test]
    fn test_state_abbreviations() {
        assert_eq!(normalize_location("California"), "california");
        assert_eq!(normalize_location("CA"), "california");
        assert_eq!(normalize_location("New York"), "new york");
        assert_eq!(normalize_location("NY"), "new york");
        assert_eq!(normalize_location("TX"), "texas");
        assert_eq!(normalize_location("FL"), "florida");
    }

    #[test]
    fn test_remote_variants() {
        assert_eq!(normalize_location("Remote"), "remote");
        assert_eq!(normalize_location("Remote US"), "remote");
        assert_eq!(normalize_location("Remote - USA"), "remote");
        assert_eq!(normalize_location("Fully Remote"), "remote");
        assert_eq!(normalize_location("remote"), "remote");
        assert_eq!(normalize_location("REMOTE"), "remote");
        assert_eq!(normalize_location("Remote (USA)"), "remote");
    }

    #[test]
    fn test_country_suffix_removal() {
        assert_eq!(normalize_location("San Francisco, USA"), "san francisco");
        assert_eq!(normalize_location("NYC, United States"), "new york");
        assert_eq!(normalize_location("Austin, TX, US"), "austin, texas");
        assert_eq!(
            normalize_location("Seattle, WA, USA"),
            "seattle, washington"
        );
    }

    #[test]
    fn test_case_normalization() {
        assert_eq!(normalize_location("SAN FRANCISCO"), "san francisco");
        assert_eq!(normalize_location("New York"), "new york");
        assert_eq!(normalize_location("austin"), "austin");
    }

    #[test]
    fn test_whitespace_handling() {
        assert_eq!(normalize_location("  SF  "), "san francisco");
        assert_eq!(normalize_location("NYC , NY"), "new york, new york");
        assert_eq!(normalize_location("Austin,TX"), "austin, texas");
    }

    #[test]
    fn test_empty_and_edge_cases() {
        assert_eq!(normalize_location(""), "");
        assert_eq!(normalize_location("   "), "");
        assert_eq!(normalize_location("UnknownCity"), "unknowncity");
        assert_eq!(normalize_location("City Name"), "city name");
    }

    #[test]
    fn test_full_names_preserved() {
        assert_eq!(normalize_location("San Francisco"), "san francisco");
        assert_eq!(normalize_location("New York City"), "new york");
        assert_eq!(normalize_location("Los Angeles"), "los angeles");
        assert_eq!(normalize_location("Washington DC"), "washington");
    }

    #[test]
    fn test_complex_formats() {
        assert_eq!(
            normalize_location("San Francisco, CA, USA"),
            "san francisco, california"
        );
        assert_eq!(
            normalize_location("NYC, NY, United States"),
            "new york, new york"
        );
        assert_eq!(normalize_location("Remote - United States"), "remote");
    }

    #[test]
    fn test_deduplication_scenarios() {
        // These should all normalize to the same value
        let sf_variants = vec![
            "SF",
            "sf",
            "San Francisco",
            "san francisco",
            "San Fran",
            "SF, CA",
            "San Francisco, California",
        ];

        for variant in sf_variants {
            assert!(
                normalize_location(variant).starts_with("san francisco"),
                "Failed for variant: {}",
                variant
            );
        }

        // Remote variants should all be "remote"
        let remote_variants = vec![
            "Remote",
            "remote",
            "REMOTE",
            "Remote US",
            "Remote - USA",
            "Fully Remote",
        ];

        for variant in remote_variants {
            assert_eq!(
                normalize_location(variant),
                "remote",
                "Failed for variant: {}",
                variant
            );
        }
    }
}
