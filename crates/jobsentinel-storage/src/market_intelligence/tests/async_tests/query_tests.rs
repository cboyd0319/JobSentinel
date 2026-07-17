use super::*;
use crate::analytics_buckets::market_location_bucket;

#[tokio::test]
async fn test_market_intelligence_new() {
    let pool = setup_test_db().await;
    let mi = MarketIntelligence::new(pool.clone());

    // Verify struct creation
    assert_eq!(
        std::mem::size_of_val(&mi),
        std::mem::size_of::<MarketIntelligence>()
    );
}

#[test]
fn test_market_location_bucket() {
    assert_eq!(
        market_location_bucket("San Francisco Bay Area"),
        "san francisco, ca"
    );
    assert_eq!(
        market_location_bucket("SF, California"),
        "san francisco, ca"
    );
    assert_eq!(market_location_bucket("New York City"), "new york, ny");
    assert_eq!(market_location_bucket("NYC"), "new york, ny");
    assert_eq!(market_location_bucket("Remote - US"), "remote");
    assert_eq!(market_location_bucket("Seattle, WA"), "seattle, wa");
}

#[tokio::test]
async fn test_parse_location_via_method() {
    let pool = setup_test_db().await;
    let mi = MarketIntelligence::new(pool);

    let (city, state) = mi.parse_location("Seattle, WA");
    assert_eq!(city, Some("Seattle".to_string()));
    assert_eq!(state, Some("WA".to_string()));

    let (city2, state2) = mi.parse_location("London");
    assert_eq!(city2, Some("London".to_string()));
    assert_eq!(state2, None);

    let (city3, state3) = mi.parse_location("Austin, TX, USA");
    assert_eq!(city3, Some("Austin".to_string()));
    assert_eq!(state3, Some("TX".to_string()));
}

#[tokio::test]
async fn test_get_trending_skills_empty() {
    let pool = setup_test_db().await;
    let mi = MarketIntelligence::new(pool);

    let trends = mi.get_trending_skills(10).await.unwrap();
    assert_eq!(trends.len(), 0);
}

#[tokio::test]
async fn test_get_trending_skills_with_data() {
    let pool = setup_test_db().await;

    // Insert test data
    sqlx::query(
        r#"
        INSERT INTO skill_demand_trends (skill_name, date, mention_count, job_count, avg_salary)
        VALUES
            ('Case Management', date('now'), 100, 50, 65000),
            ('Customer Support', date('now'), 200, 100, 62000),
            ('Inventory Planning', date('now'), 150, 75, 58000)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool);
    let trends = mi.get_trending_skills(3).await.unwrap();

    assert_eq!(trends.len(), 3);
    assert_eq!(trends[0].skill_name, "Customer Support");
    assert_eq!(trends[0].total_jobs, 100);
    assert_eq!(trends[1].skill_name, "Inventory Planning");
    assert_eq!(trends[2].skill_name, "Case Management");
}

#[tokio::test]
async fn test_get_trending_skills_limit() {
    let pool = setup_test_db().await;

    sqlx::query(
        r#"
        INSERT INTO skill_demand_trends (skill_name, date, mention_count, job_count)
        VALUES
            ('Case Management', date('now'), 100, 50),
            ('Customer Support', date('now'), 200, 100),
            ('Inventory Planning', date('now'), 150, 75),
            ('Bilingual Support', date('now'), 80, 40)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool);
    let trends = mi.get_trending_skills(2).await.unwrap();

    assert_eq!(trends.len(), 2);
    assert_eq!(trends[0].skill_name, "Customer Support");
    assert_eq!(trends[1].skill_name, "Inventory Planning");
}

#[tokio::test]
async fn test_get_most_active_companies_empty() {
    let pool = setup_test_db().await;
    let mi = MarketIntelligence::new(pool);

    let companies = mi.get_most_active_companies(10).await.unwrap();
    assert_eq!(companies.len(), 0);
}

#[tokio::test]
async fn test_get_most_active_companies_with_data() {
    let pool = setup_test_db().await;

    sqlx::query(
        r#"
        INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count, hiring_trend)
        VALUES
            ('Community Care Network', date('now'), 50, 30, 'increasing'),
            ('Regional Food Bank', date('now'), 25, 15, 'stable'),
            ('City Health Department', date('now'), 100, 75, 'increasing')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool);
    let companies = mi.get_most_active_companies(3).await.unwrap();

    assert_eq!(companies.len(), 3);
    assert_eq!(companies[0].company_name, "City Health Department");
    assert_eq!(companies[0].total_posted, 100);
    assert_eq!(companies[0].hiring_trend, Some("increasing".to_string()));
    assert_eq!(companies[1].company_name, "Community Care Network");
    assert_eq!(companies[2].company_name, "Regional Food Bank");
}

#[tokio::test]
async fn test_get_most_active_companies_limit() {
    let pool = setup_test_db().await;

    sqlx::query(
        r#"
        INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count)
        VALUES
            ('Company1', date('now'), 50, 30),
            ('Company2', date('now'), 75, 45),
            ('Company3', date('now'), 25, 15),
            ('Company4', date('now'), 100, 60)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool);
    let companies = mi.get_most_active_companies(2).await.unwrap();

    assert_eq!(companies.len(), 2);
    assert_eq!(companies[0].company_name, "Company4");
    assert_eq!(companies[1].company_name, "Company2");
}

#[tokio::test]
async fn test_get_hottest_locations_empty() {
    let pool = setup_test_db().await;
    let mi = MarketIntelligence::new(pool);

    let locations = mi.get_hottest_locations(10).await.unwrap();
    assert_eq!(locations.len(), 0);
}

#[tokio::test]
async fn test_get_hottest_locations_with_data() {
    let pool = setup_test_db().await;

    sqlx::query(
        r#"
        INSERT INTO location_job_density (location_normalized, city, state, date, job_count, median_salary)
        VALUES
            ('san francisco, ca', 'San Francisco', 'CA', date('now'), 500, 165000),
            ('new york, ny', 'New York', 'NY', date('now'), 450, 155000),
            ('remote', NULL, NULL, date('now'), 300, 140000)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool);
    let locations = mi.get_hottest_locations(3).await.unwrap();

    assert_eq!(locations.len(), 3);
    assert_eq!(locations[0].location, "san francisco, ca");
    assert_eq!(locations[0].total_jobs, 500);
    assert_eq!(locations[0].city, Some("San Francisco".to_string()));
    assert_eq!(locations[0].state, Some("CA".to_string()));
    assert_eq!(locations[1].location, "new york, ny");
    assert_eq!(locations[2].location, "remote");
}

#[tokio::test]
async fn test_get_hottest_locations_limit() {
    let pool = setup_test_db().await;

    sqlx::query(
        r#"
        INSERT INTO location_job_density (location_normalized, date, job_count)
        VALUES
            ('seattle, wa', date('now'), 400),
            ('austin, tx', date('now'), 350),
            ('boston, ma', date('now'), 300),
            ('denver, co', date('now'), 250)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let mi = MarketIntelligence::new(pool);
    let locations = mi.get_hottest_locations(2).await.unwrap();

    assert_eq!(locations.len(), 2);
    assert_eq!(locations[0].location, "seattle, wa");
    assert_eq!(locations[1].location, "austin, tx");
}
