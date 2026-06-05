use super::*;

#[tokio::test]
async fn test_scraping_result_partial_errors() {
    let result = ScrapingResult {
        jobs_found: 50,
        jobs_new: 30,
        jobs_updated: 20,
        high_matches: 5,
        alerts_sent: 3,
        errors: vec![
            "Greenhouse scraper timeout".to_string(),
            "Lever scraper rate limit".to_string(),
        ],
    };

    assert_eq!(result.jobs_found, 50);
    assert_eq!(result.errors.len(), 2);
    assert!(!result.errors.is_empty());
}

#[test]
fn test_scraping_result_multiple_errors() {
    let errors = vec![
        "Error 1".to_string(),
        "Error 2".to_string(),
        "Error 3".to_string(),
    ];

    let result = ScrapingResult {
        jobs_found: 0,
        jobs_new: 0,
        jobs_updated: 0,
        high_matches: 0,
        alerts_sent: 0,
        errors: errors.clone(),
    };

    assert_eq!(result.errors, errors);
    assert_eq!(result.errors.len(), 3);
}

#[test]
fn test_scraping_result_all_zeros() {
    let result = ScrapingResult {
        jobs_found: 0,
        jobs_new: 0,
        jobs_updated: 0,
        high_matches: 0,
        alerts_sent: 0,
        errors: vec![],
    };

    assert_eq!(result.jobs_found, 0);
    assert_eq!(result.jobs_new, 0);
    assert_eq!(result.jobs_updated, 0);
    assert_eq!(result.high_matches, 0);
    assert_eq!(result.alerts_sent, 0);
    assert!(result.errors.is_empty());
}

#[test]
fn test_scraping_result_max_values() {
    let result = ScrapingResult {
        jobs_found: usize::MAX,
        jobs_new: usize::MAX,
        jobs_updated: usize::MAX,
        high_matches: usize::MAX,
        alerts_sent: usize::MAX,
        errors: vec!["error".to_string(); 100],
    };

    assert_eq!(result.jobs_found, usize::MAX);
    assert_eq!(result.errors.len(), 100);
}

#[test]
fn test_scraping_result_equality_after_clone() {
    let original = ScrapingResult {
        jobs_found: 42,
        jobs_new: 20,
        jobs_updated: 22,
        high_matches: 8,
        alerts_sent: 4,
        errors: vec!["test".to_string()],
    };

    let cloned = original.clone();

    assert_eq!(original.jobs_found, cloned.jobs_found);
    assert_eq!(original.jobs_new, cloned.jobs_new);
    assert_eq!(original.jobs_updated, cloned.jobs_updated);
    assert_eq!(original.high_matches, cloned.high_matches);
    assert_eq!(original.alerts_sent, cloned.alerts_sent);
    assert_eq!(original.errors, cloned.errors);
}
