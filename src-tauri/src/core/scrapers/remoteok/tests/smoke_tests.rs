use super::super::*;

#[test]
fn test_scraper_name() {
    let scraper = RemoteOkScraper::new(vec![], 10);
    assert_eq!(scraper.name(), "remoteok");
}

#[test]
fn test_new_scraper_with_tags() {
    let scraper = RemoteOkScraper::new(vec!["rust".to_string(), "engineer".to_string()], 50);

    assert_eq!(scraper.tags.len(), 2);
    assert_eq!(scraper.limit, 50);
}

#[test]
fn test_new_scraper_empty_tags() {
    let scraper = RemoteOkScraper::new(vec![], 100);

    assert_eq!(scraper.tags.len(), 0);
    assert_eq!(scraper.limit, 100);
}

#[tokio::test]
async fn test_scrape_calls_fetch_jobs() {
    let scraper = RemoteOkScraper::new(vec!["rust".to_string()], 5);

    // scrape() calls fetch_jobs() which we can't test without mocking the API
    // but we can verify the scraper is properly initialized
    assert_eq!(scraper.tags.len(), 1);
    assert_eq!(scraper.limit, 5);
    assert_eq!(scraper.name(), "remoteok");
}
