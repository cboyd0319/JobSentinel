//! Verifies persisted search-country preferences are canonical explicit alpha-2 values.

use super::*;

#[test]
fn search_country_accepts_only_canonical_recognized_alpha2() {
    let mut config = create_valid_config();
    config.location_preferences.search_country = Some("GB".to_string());
    assert!(validate_config(&config).is_ok());

    for invalid in ["", "gb", "United Kingdom", "EU", "ZZ"] {
        config.location_preferences.search_country = Some(invalid.to_string());
        assert!(validate_config(&config).is_err(), "{invalid}");
    }
}

#[test]
fn legacy_country_is_preserved_without_enabling_search_country() {
    let config = create_valid_config();
    let stored = serde_json::to_string(&config).unwrap();
    let mut legacy = serde_json::from_str::<serde_json::Value>(&stored).unwrap();
    legacy["location_preferences"]
        .as_object_mut()
        .unwrap()
        .remove("search_country");

    let loaded = Config::from_json(&serde_json::to_string(&legacy).unwrap()).unwrap();
    assert_eq!(loaded.location_preferences.country, "US");
    assert_eq!(loaded.location_preferences.search_country, None);
}
