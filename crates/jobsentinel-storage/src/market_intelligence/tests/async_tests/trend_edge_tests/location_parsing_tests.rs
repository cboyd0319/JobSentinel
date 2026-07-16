use super::*;

#[tokio::test]
async fn test_normalize_location_edge_cases() {
    let pool = setup_test_db().await;
    let mi = MarketIntelligence::new(pool);

    assert_eq!(mi.normalize_location("SF Bay Area"), "san francisco, ca");
    assert_eq!(mi.normalize_location("SAN FRANCISCO"), "san francisco, ca");
    assert_eq!(mi.normalize_location("sf"), "san francisco, ca");

    assert_eq!(mi.normalize_location("NYC, New York"), "new york, ny");
    assert_eq!(mi.normalize_location("new york city"), "new york, ny");

    assert_eq!(mi.normalize_location("REMOTE - Anywhere"), "remote");
    assert_eq!(mi.normalize_location("Remote US"), "remote");

    assert_eq!(mi.normalize_location("Chicago, IL"), "chicago, il");
}

#[tokio::test]
async fn test_parse_location_edge_cases() {
    let pool = setup_test_db().await;
    let mi = MarketIntelligence::new(pool);

    let (city, state) = mi.parse_location("New York, NY, USA");
    assert_eq!(city, Some("New York".to_string()));
    assert_eq!(state, Some("NY".to_string()));

    let (city2, state2) = mi.parse_location("Berlin");
    assert_eq!(city2, Some("Berlin".to_string()));
    assert_eq!(state2, None);

    let (city3, state3) = mi.parse_location("");
    assert_eq!(city3, Some("".to_string()));
    assert_eq!(state3, None);

    let (city4, state4) = mi.parse_location("  Seattle  ,  WA  ");
    assert_eq!(city4, Some("Seattle".to_string()));
    assert_eq!(state4, Some("WA".to_string()));
}
