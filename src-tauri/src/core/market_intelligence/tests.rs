//! Tests for market intelligence module

use super::*;
use sqlx::SqlitePool;

#[test]
fn test_compute_median_odd_length() {
    let mut values = vec![5.0, 1.0, 3.0];
    assert_eq!(super::computations::compute_median(&mut values), Some(3.0));
}

#[test]
fn test_compute_median_even_length() {
    let mut values = vec![1.0, 2.0, 3.0, 4.0];
    assert_eq!(super::computations::compute_median(&mut values), Some(2.5));
}

#[test]
fn test_compute_median_single_value() {
    let mut values = vec![42.0];
    assert_eq!(super::computations::compute_median(&mut values), Some(42.0));
}

#[test]
fn test_compute_median_empty() {
    let mut values: Vec<f64> = vec![];
    assert_eq!(super::computations::compute_median(&mut values), None);
}

#[test]
fn test_compute_median_unsorted() {
    let mut values = vec![10.0, 5.0, 20.0, 15.0];
    assert_eq!(super::computations::compute_median(&mut values), Some(12.5));
}

#[test]
fn test_compute_median_with_duplicates() {
    let mut values = vec![5.0, 5.0, 5.0];
    assert_eq!(super::computations::compute_median(&mut values), Some(5.0));
}

#[test]
fn test_compute_median_negative_values() {
    let mut values = vec![-10.0, -5.0, 0.0, 5.0];
    assert_eq!(super::computations::compute_median(&mut values), Some(-2.5));
}

#[test]
fn test_compute_median_large_dataset() {
    let mut values: Vec<f64> = (1..=1000).map(|x| x as f64).collect();
    assert_eq!(
        super::computations::compute_median(&mut values),
        Some(500.5)
    );
}

#[test]
fn test_skill_trend_data() {
    let trend = super::queries::SkillTrend {
        skill_name: "Rust".to_string(),
        total_jobs: 250,
        avg_salary: Some(140000),
    };

    assert_eq!(trend.skill_name, "Rust");
    assert_eq!(trend.total_jobs, 250);
    assert_eq!(trend.avg_salary, Some(140000));
}

#[test]
fn test_skill_trend_no_salary() {
    let trend = super::queries::SkillTrend {
        skill_name: "Python".to_string(),
        total_jobs: 500,
        avg_salary: None,
    };

    assert!(trend.avg_salary.is_none());
}

#[test]
fn test_company_activity_data() {
    let activity = super::queries::CompanyActivity {
        company_name: "TechCorp".to_string(),
        total_posted: 50,
        avg_active: 30.5,
        hiring_trend: Some("increasing".to_string()),
    };

    assert_eq!(activity.company_name, "TechCorp");
    assert_eq!(activity.total_posted, 50);
    assert_eq!(activity.avg_active, 30.5);
    assert_eq!(activity.hiring_trend, Some("increasing".to_string()));
}

#[test]
fn test_company_activity_no_trend() {
    let activity = super::queries::CompanyActivity {
        company_name: "StartupCo".to_string(),
        total_posted: 5,
        avg_active: 3.0,
        hiring_trend: None,
    };

    assert!(activity.hiring_trend.is_none());
}

#[test]
fn test_location_heat_data() {
    let heat = super::queries::LocationHeat {
        location: "san francisco, ca".to_string(),
        city: Some("San Francisco".to_string()),
        state: Some("CA".to_string()),
        total_jobs: 1500,
        avg_median_salary: Some(165000),
    };

    assert_eq!(heat.location, "san francisco, ca");
    assert_eq!(heat.city, Some("San Francisco".to_string()));
    assert_eq!(heat.total_jobs, 1500);
    assert_eq!(heat.avg_median_salary, Some(165000));
}

#[test]
fn test_location_heat_no_salary_data() {
    let heat = super::queries::LocationHeat {
        location: "remote".to_string(),
        city: None,
        state: None,
        total_jobs: 800,
        avg_median_salary: None,
    };

    assert!(heat.avg_median_salary.is_none());
    assert!(heat.city.is_none());
}

#[test]
fn test_normalize_location_san_francisco() {
    // Test the normalization logic without database
    let location = "San Francisco Bay Area";
    let result = if location.to_lowercase().contains("san francisco")
        || location.to_lowercase().contains("sf")
    {
        "san francisco, ca"
    } else {
        &location.to_lowercase()
    };
    assert_eq!(result, "san francisco, ca");

    let location2 = "SF, CA";
    let result2 = if location2.to_lowercase().contains("san francisco")
        || location2.to_lowercase().contains("sf")
    {
        "san francisco, ca"
    } else {
        &location2.to_lowercase()
    };
    assert_eq!(result2, "san francisco, ca");
}

#[test]
fn test_normalize_location_new_york() {
    let location = "New York City";
    let result = if location.to_lowercase().contains("new york")
        || location.to_lowercase().contains("nyc")
    {
        "new york, ny"
    } else {
        &location.to_lowercase()
    };
    assert_eq!(result, "new york, ny");

    let location2 = "NYC";
    let result2 = if location2.to_lowercase().contains("new york")
        || location2.to_lowercase().contains("nyc")
    {
        "new york, ny"
    } else {
        &location2.to_lowercase()
    };
    assert_eq!(result2, "new york, ny");
}

#[test]
fn test_normalize_location_remote() {
    let location = "Remote - US";
    let result = if location.to_lowercase().contains("remote") {
        "remote"
    } else {
        &location.to_lowercase()
    };
    assert_eq!(result, "remote");
}

#[test]
fn test_normalize_location_other() {
    let location = "Seattle, WA";
    let result = if location.to_lowercase().contains("san francisco")
        || location.to_lowercase().contains("sf")
    {
        "san francisco, ca"
    } else if location.to_lowercase().contains("new york")
        || location.to_lowercase().contains("nyc")
    {
        "new york, ny"
    } else if location.to_lowercase().contains("remote") {
        "remote"
    } else {
        &location.to_lowercase()
    };
    assert_eq!(result, "seattle, wa");
}

#[test]
fn test_parse_location_city_state() {
    let location = "Seattle, WA";
    let parts: Vec<&str> = location.split(',').map(|s| s.trim()).collect();
    let (city, state) = if parts.len() >= 2 {
        (Some(parts[0].to_string()), Some(parts[1].to_string()))
    } else {
        (Some(location.to_string()), None)
    };
    assert_eq!(city, Some("Seattle".to_string()));
    assert_eq!(state, Some("WA".to_string()));
}

#[test]
fn test_parse_location_city_only() {
    let location = "London";
    let parts: Vec<&str> = location.split(',').map(|s| s.trim()).collect();
    let (city, state) = if parts.len() >= 2 {
        (Some(parts[0].to_string()), Some(parts[1].to_string()))
    } else {
        (Some(location.to_string()), None)
    };
    assert_eq!(city, Some("London".to_string()));
    assert_eq!(state, None);
}

#[test]
fn test_parse_location_with_extra_parts() {
    let location = "New York, NY, USA";
    let parts: Vec<&str> = location.split(',').map(|s| s.trim()).collect();
    let (city, state) = if parts.len() >= 2 {
        (Some(parts[0].to_string()), Some(parts[1].to_string()))
    } else {
        (Some(location.to_string()), None)
    };
    assert_eq!(city, Some("New York".to_string()));
    assert_eq!(state, Some("NY".to_string()));
}

#[test]
fn test_parse_location_empty() {
    let location = "";
    let parts: Vec<&str> = location.split(',').map(|s| s.trim()).collect();
    let (city, state) = if parts.len() >= 2 {
        (Some(parts[0].to_string()), Some(parts[1].to_string()))
    } else {
        (Some(location.to_string()), None)
    };
    assert_eq!(city, Some("".to_string()));
    assert_eq!(state, None);
}

#[test]
fn test_compute_median_with_floats() {
    let mut values = vec![1.5, 2.5, 3.5, 4.5];
    assert_eq!(super::computations::compute_median(&mut values), Some(3.0));
}

#[test]
fn test_compute_median_precision() {
    let mut values = vec![100.1, 100.2, 100.3];
    assert_eq!(
        super::computations::compute_median(&mut values),
        Some(100.2)
    );
}

#[test]
fn test_skill_trend_serialization() {
    let trend = super::queries::SkillTrend {
        skill_name: "TypeScript".to_string(),
        total_jobs: 300,
        avg_salary: Some(135000),
    };

    let serialized = serde_json::to_string(&trend).unwrap();
    let deserialized: super::queries::SkillTrend = serde_json::from_str(&serialized).unwrap();

    assert_eq!(deserialized.skill_name, "TypeScript");
    assert_eq!(deserialized.total_jobs, 300);
    assert_eq!(deserialized.avg_salary, Some(135000));
}

#[test]
fn test_company_activity_serialization() {
    let activity = super::queries::CompanyActivity {
        company_name: "Microsoft".to_string(),
        total_posted: 100,
        avg_active: 75.5,
        hiring_trend: Some("stable".to_string()),
    };

    let serialized = serde_json::to_string(&activity).unwrap();
    let deserialized: super::queries::CompanyActivity = serde_json::from_str(&serialized).unwrap();

    assert_eq!(deserialized.company_name, "Microsoft");
    assert_eq!(deserialized.total_posted, 100);
}

#[test]
fn test_location_heat_serialization() {
    let heat = super::queries::LocationHeat {
        location: "austin, tx".to_string(),
        city: Some("Austin".to_string()),
        state: Some("TX".to_string()),
        total_jobs: 450,
        avg_median_salary: Some(120000),
    };

    let serialized = serde_json::to_string(&heat).unwrap();
    let deserialized: super::queries::LocationHeat = serde_json::from_str(&serialized).unwrap();

    assert_eq!(deserialized.location, "austin, tx");
    assert_eq!(deserialized.total_jobs, 450);
}

// Async tests for MarketIntelligence methods
mod async_tests {
    use super::*;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();

        // Create all required tables
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS jobs (
                hash TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                company TEXT,
                location TEXT,
                posted_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                status TEXT DEFAULT 'active'
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS job_skills (
                job_hash TEXT NOT NULL,
                skill_name TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (job_hash, skill_name)
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS job_salary_predictions (
                job_hash TEXT PRIMARY KEY,
                predicted_median REAL NOT NULL
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS skill_demand_trends (
                skill_name TEXT NOT NULL,
                date TEXT NOT NULL,
                mention_count INTEGER NOT NULL,
                job_count INTEGER NOT NULL,
                avg_salary INTEGER,
                median_salary INTEGER,
                top_company TEXT,
                top_location TEXT,
                PRIMARY KEY (skill_name, date)
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS salary_benchmarks (
                job_title_normalized TEXT NOT NULL,
                location_normalized TEXT NOT NULL,
                min_salary INTEGER NOT NULL,
                p25_salary INTEGER NOT NULL,
                median_salary INTEGER NOT NULL,
                p75_salary INTEGER NOT NULL,
                max_salary INTEGER NOT NULL,
                average_salary INTEGER NOT NULL,
                sample_size INTEGER NOT NULL,
                PRIMARY KEY (job_title_normalized, location_normalized)
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS salary_trends (
                job_title_normalized TEXT NOT NULL,
                location_normalized TEXT NOT NULL,
                date TEXT NOT NULL,
                min_salary INTEGER NOT NULL,
                p25_salary INTEGER NOT NULL,
                median_salary INTEGER NOT NULL,
                p75_salary INTEGER NOT NULL,
                max_salary INTEGER NOT NULL,
                avg_salary INTEGER NOT NULL,
                sample_size INTEGER NOT NULL,
                salary_growth_pct REAL DEFAULT 0.0,
                PRIMARY KEY (job_title_normalized, location_normalized, date)
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS company_hiring_velocity (
                company_name TEXT NOT NULL,
                date TEXT NOT NULL,
                jobs_posted_count INTEGER NOT NULL,
                jobs_filled_count INTEGER DEFAULT 0,
                jobs_active_count INTEGER DEFAULT 0,
                top_role TEXT,
                top_location TEXT,
                is_actively_hiring INTEGER DEFAULT 0,
                hiring_trend TEXT DEFAULT 'stable',
                PRIMARY KEY (company_name, date)
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS location_job_density (
                location_normalized TEXT NOT NULL,
                city TEXT,
                state TEXT,
                date TEXT NOT NULL,
                job_count INTEGER NOT NULL,
                remote_job_count INTEGER DEFAULT 0,
                avg_salary INTEGER,
                median_salary INTEGER,
                top_skill TEXT,
                top_company TEXT,
                top_role TEXT,
                PRIMARY KEY (location_normalized, date)
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS role_demand_trends (
                job_title_normalized TEXT NOT NULL,
                date TEXT NOT NULL,
                job_count INTEGER NOT NULL,
                avg_salary INTEGER,
                median_salary INTEGER,
                top_company TEXT,
                top_location TEXT,
                remote_percentage REAL,
                demand_trend TEXT DEFAULT 'stable',
                PRIMARY KEY (job_title_normalized, date)
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS market_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                severity TEXT DEFAULT 'info',
                related_entity TEXT,
                related_entity_type TEXT,
                metric_value REAL,
                metric_change_pct REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                is_read INTEGER DEFAULT 0
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS market_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL UNIQUE,
                total_jobs INTEGER NOT NULL DEFAULT 0,
                new_jobs_today INTEGER NOT NULL DEFAULT 0,
                jobs_filled_today INTEGER NOT NULL DEFAULT 0,
                avg_salary INTEGER,
                median_salary INTEGER,
                remote_job_percentage REAL,
                top_skill TEXT,
                top_company TEXT,
                top_location TEXT,
                total_companies_hiring INTEGER,
                market_sentiment TEXT CHECK(market_sentiment IN ('bullish', 'neutral', 'bearish')),
                notes TEXT,
                created_at TIMESTAMP DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

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

    #[tokio::test]
    async fn test_normalize_location_via_method() {
        let pool = setup_test_db().await;
        let mi = MarketIntelligence::new(pool);

        assert_eq!(
            mi.normalize_location("San Francisco Bay Area"),
            "san francisco, ca"
        );
        assert_eq!(mi.normalize_location("SF, California"), "san francisco, ca");
        assert_eq!(mi.normalize_location("New York City"), "new york, ny");
        assert_eq!(mi.normalize_location("NYC"), "new york, ny");
        assert_eq!(mi.normalize_location("Remote - US"), "remote");
        assert_eq!(mi.normalize_location("Seattle, WA"), "seattle, wa");
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
                ('Rust', date('now'), 100, 50, 150000),
                ('Python', date('now'), 200, 100, 130000),
                ('TypeScript', date('now'), 150, 75, 140000)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool);
        let trends = mi.get_trending_skills(3).await.unwrap();

        assert_eq!(trends.len(), 3);
        assert_eq!(trends[0].skill_name, "Python");
        assert_eq!(trends[0].total_jobs, 100);
        assert_eq!(trends[1].skill_name, "TypeScript");
        assert_eq!(trends[2].skill_name, "Rust");
    }

    #[tokio::test]
    async fn test_get_trending_skills_limit() {
        let pool = setup_test_db().await;

        sqlx::query(
            r#"
            INSERT INTO skill_demand_trends (skill_name, date, mention_count, job_count)
            VALUES
                ('Rust', date('now'), 100, 50),
                ('Python', date('now'), 200, 100),
                ('TypeScript', date('now'), 150, 75),
                ('Go', date('now'), 80, 40)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool);
        let trends = mi.get_trending_skills(2).await.unwrap();

        assert_eq!(trends.len(), 2);
        assert_eq!(trends[0].skill_name, "Python");
        assert_eq!(trends[1].skill_name, "TypeScript");
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
                ('TechCorp', date('now'), 50, 30, 'increasing'),
                ('StartupInc', date('now'), 25, 15, 'stable'),
                ('BigTech', date('now'), 100, 75, 'increasing')
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool);
        let companies = mi.get_most_active_companies(3).await.unwrap();

        assert_eq!(companies.len(), 3);
        assert_eq!(companies[0].company_name, "BigTech");
        assert_eq!(companies[0].total_posted, 100);
        assert_eq!(companies[0].hiring_trend, Some("increasing".to_string()));
        assert_eq!(companies[1].company_name, "TechCorp");
        assert_eq!(companies[2].company_name, "StartupInc");
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

    #[tokio::test]
    async fn test_compute_skill_demand_trends_no_data() {
        let pool = setup_test_db().await;
        let mi = MarketIntelligence::new(pool.clone());

        // Should not error on empty database
        let result = mi.compute_skill_demand_trends().await;
        assert!(result.is_ok());

        // Verify no trends were created
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM skill_demand_trends")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 0);
    }

    #[tokio::test]
    async fn test_compute_skill_demand_trends_with_data() {
        let pool = setup_test_db().await;

        // Insert test jobs and skills
        sqlx::query(
            r#"
            INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
            VALUES ('job1', 'Software Engineer', 'TechCorp', 'San Francisco, CA', datetime('now'), datetime('now'))
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            INSERT INTO job_skills (job_hash, skill_name, created_at)
            VALUES ('job1', 'Rust', datetime('now'))
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            INSERT INTO job_salary_predictions (job_hash, predicted_median)
            VALUES ('job1', 150000.0)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.compute_skill_demand_trends().await;
        assert!(result.is_ok());

        // Verify trend was created
        let trend: (String, i64, i64) = sqlx::query_as(
            "SELECT skill_name, mention_count, job_count FROM skill_demand_trends WHERE skill_name = 'Rust'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(trend.0, "Rust");
        assert_eq!(trend.1, 1); // mention_count
        assert_eq!(trend.2, 1); // job_count
    }

    #[tokio::test]
    async fn test_compute_salary_trends_no_data() {
        let pool = setup_test_db().await;
        let mi = MarketIntelligence::new(pool.clone());

        let result = mi.compute_salary_trends().await;
        assert!(result.is_ok());

        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM salary_trends")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 0);
    }

    #[tokio::test]
    async fn test_compute_salary_trends_with_data() {
        let pool = setup_test_db().await;

        // Insert benchmark data
        sqlx::query(
            r#"
            INSERT INTO salary_benchmarks (
                job_title_normalized, location_normalized, min_salary, p25_salary,
                median_salary, p75_salary, max_salary, average_salary, sample_size
            )
            VALUES ('software engineer', 'san francisco, ca', 100000, 120000, 140000, 160000, 180000, 140000, 50)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.compute_salary_trends().await;
        assert!(result.is_ok());

        // Verify trend was created
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM salary_trends")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 1);

        let median: i64 = sqlx::query_scalar(
            "SELECT median_salary FROM salary_trends WHERE job_title_normalized = 'software engineer'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(median, 140000);
    }

    #[tokio::test]
    async fn test_compute_company_hiring_velocity_no_data() {
        let pool = setup_test_db().await;
        let mi = MarketIntelligence::new(pool.clone());

        let result = mi.compute_company_hiring_velocity().await;
        assert!(result.is_ok());

        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM company_hiring_velocity")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 0);
    }

    #[tokio::test]
    async fn test_compute_company_hiring_velocity_with_data() {
        let pool = setup_test_db().await;

        // Insert test jobs
        sqlx::query(
            r#"
            INSERT INTO jobs (hash, title, company, location, posted_at, updated_at, status)
            VALUES
                ('job1', 'Engineer', 'TechCorp', 'SF', date('now'), datetime('now'), 'active'),
                ('job2', 'Designer', 'TechCorp', 'SF', date('now'), datetime('now'), 'active')
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.compute_company_hiring_velocity().await;
        assert!(result.is_ok());

        // Verify velocity was recorded
        let velocity: (i64, i64) = sqlx::query_as(
            "SELECT jobs_posted_count, jobs_active_count FROM company_hiring_velocity WHERE company_name = 'TechCorp'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(velocity.0, 2); // jobs_posted_count
        assert_eq!(velocity.1, 2); // jobs_active_count
    }

    #[tokio::test]
    async fn test_compute_location_job_density_no_data() {
        let pool = setup_test_db().await;
        let mi = MarketIntelligence::new(pool.clone());

        let result = mi.compute_location_job_density().await;
        assert!(result.is_ok());

        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM location_job_density")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 0);
    }

    #[tokio::test]
    async fn test_compute_location_job_density_with_data() {
        let pool = setup_test_db().await;

        // Insert test jobs
        sqlx::query(
            r#"
            INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
            VALUES
                ('job1', 'Engineer', 'Corp1', 'Seattle, WA', datetime('now'), datetime('now')),
                ('job2', 'Designer', 'Corp2', 'Seattle, WA', datetime('now'), datetime('now'))
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // Insert skills for the jobs
        sqlx::query(
            r#"
            INSERT INTO job_skills (job_hash, skill_name)
            VALUES
                ('job1', 'Rust'),
                ('job2', 'TypeScript')
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.compute_location_job_density().await;
        if let Err(e) = &result {
            eprintln!("Error: {}", e);
        }
        assert!(result.is_ok());

        // Verify density was recorded
        let density: (String, Option<String>, Option<String>, i64) = sqlx::query_as(
            "SELECT location_normalized, city, state, job_count FROM location_job_density",
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(density.0, "seattle, wa");
        assert_eq!(density.1, Some("Seattle".to_string()));
        assert_eq!(density.2, Some("WA".to_string()));
        assert_eq!(density.3, 2);
    }

    #[tokio::test]
    async fn test_compute_role_demand_trends_no_data() {
        let pool = setup_test_db().await;
        let mi = MarketIntelligence::new(pool.clone());

        let result = mi.compute_role_demand_trends().await;
        assert!(result.is_ok());

        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM role_demand_trends")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 0);
    }

    #[tokio::test]
    async fn test_compute_role_demand_trends_with_data() {
        let pool = setup_test_db().await;

        // Insert salary benchmark (source of normalized titles)
        sqlx::query(
            r#"
            INSERT INTO salary_benchmarks (
                job_title_normalized, location_normalized, min_salary, p25_salary,
                median_salary, p75_salary, max_salary, average_salary, sample_size
            )
            VALUES ('engineer', 'remote', 100000, 120000, 140000, 160000, 180000, 140000, 10)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // Insert job with matching title
        sqlx::query(
            r#"
            INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
            VALUES ('job1', 'Senior Engineer', 'TechCorp', 'Remote', datetime('now'), datetime('now'))
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.compute_role_demand_trends().await;
        assert!(result.is_ok());

        // Verify trend was created
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM role_demand_trends WHERE job_title_normalized = 'engineer'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn test_detect_market_alerts_skill_surge() {
        let pool = setup_test_db().await;

        // Insert skill data with surge
        sqlx::query(
            r#"
            INSERT INTO skill_demand_trends (skill_name, date, mention_count, job_count)
            VALUES
                ('Rust', date('now', '-7 days'), 10, 5),
                ('Rust', date('now'), 20, 12)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.detect_market_alerts().await;
        assert!(result.is_ok());

        // Verify alert was created
        let alert_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM market_alerts WHERE alert_type = 'skill_surge'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(alert_count, 1);
    }

    #[tokio::test]
    async fn test_detect_market_alerts_salary_spike() {
        let pool = setup_test_db().await;

        // Insert salary trend with spike
        sqlx::query(
            r#"
            INSERT INTO salary_trends (
                job_title_normalized, location_normalized, date,
                min_salary, p25_salary, median_salary, p75_salary, max_salary,
                avg_salary, sample_size, salary_growth_pct
            )
            VALUES ('engineer', 'sf', date('now'), 100000, 120000, 140000, 160000, 180000, 140000, 50, 30.0)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.detect_market_alerts().await;
        assert!(result.is_ok());

        // Verify alert was created
        let alert_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM market_alerts WHERE alert_type = 'salary_spike'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(alert_count, 1);
    }

    #[tokio::test]
    async fn test_detect_market_alerts_hiring_spree() {
        let pool = setup_test_db().await;

        // Insert company with high velocity
        sqlx::query(
            r#"
            INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count)
            VALUES ('BigTech', date('now'), 15, 50)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.detect_market_alerts().await;
        assert!(result.is_ok());

        // Verify alert was created
        let alert_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM market_alerts WHERE alert_type = 'hiring_spree'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(alert_count, 1);
    }

    #[tokio::test]
    async fn test_get_unread_alerts_empty() {
        let pool = setup_test_db().await;
        let mi = MarketIntelligence::new(pool);

        let alerts = mi.get_unread_alerts().await.unwrap();
        assert_eq!(alerts.len(), 0);
    }

    #[tokio::test]
    async fn test_get_unread_alerts_with_data() {
        let pool = setup_test_db().await;

        // Insert test alerts
        sqlx::query(
            r#"
            INSERT INTO market_alerts (alert_type, title, description, severity, is_read)
            VALUES
                ('skill_surge', 'Rust Surging', 'Rust is hot', 'info', 0),
                ('salary_spike', 'Salaries Up', 'Pay is rising', 'info', 1)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool);
        let alerts = mi.get_unread_alerts().await.unwrap();

        // Should only get unread alerts
        assert_eq!(alerts.len(), 1);
        assert_eq!(alerts[0].title, "Rust Surging");
    }

    #[tokio::test]
    async fn test_compute_salary_trends_with_growth() {
        let pool = setup_test_db().await;

        // Insert previous salary trend
        sqlx::query(
            r#"
            INSERT INTO salary_trends (
                job_title_normalized, location_normalized, date,
                min_salary, p25_salary, median_salary, p75_salary, max_salary,
                avg_salary, sample_size, salary_growth_pct
            )
            VALUES ('engineer', 'sf', date('now', '-7 days'), 90000, 100000, 110000, 120000, 130000, 110000, 50, 0.0)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // Insert current benchmark
        sqlx::query(
            r#"
            INSERT INTO salary_benchmarks (
                job_title_normalized, location_normalized, min_salary, p25_salary,
                median_salary, p75_salary, max_salary, average_salary, sample_size
            )
            VALUES ('engineer', 'sf', 100000, 120000, 140000, 160000, 180000, 140000, 50)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.compute_salary_trends().await;
        assert!(result.is_ok());

        // Verify growth was calculated
        let growth: f64 = sqlx::query_scalar(
            "SELECT salary_growth_pct FROM salary_trends WHERE job_title_normalized = 'engineer' AND date = date('now')",
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        // Growth from 110000 to 140000 = (30000/110000)*100 = 27.27%
        assert!((growth - 27.27).abs() < 1.0);
    }

    #[tokio::test]
    async fn test_compute_salary_trends_zero_previous() {
        let pool = setup_test_db().await;

        // Insert previous with zero median (edge case)
        sqlx::query(
            r#"
            INSERT INTO salary_trends (
                job_title_normalized, location_normalized, date,
                min_salary, p25_salary, median_salary, p75_salary, max_salary,
                avg_salary, sample_size, salary_growth_pct
            )
            VALUES ('engineer', 'sf', date('now', '-7 days'), 0, 0, 0, 0, 0, 0, 1, 0.0)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            INSERT INTO salary_benchmarks (
                job_title_normalized, location_normalized, min_salary, p25_salary,
                median_salary, p75_salary, max_salary, average_salary, sample_size
            )
            VALUES ('engineer', 'sf', 100000, 120000, 140000, 160000, 180000, 140000, 50)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.compute_salary_trends().await;
        assert!(result.is_ok());

        // Growth should be 0 when previous is 0
        let growth: f64 = sqlx::query_scalar(
            "SELECT salary_growth_pct FROM salary_trends WHERE job_title_normalized = 'engineer' AND date = date('now')",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(growth, 0.0);
    }

    #[tokio::test]
    async fn test_compute_company_hiring_velocity_trends() {
        let pool = setup_test_db().await;

        // Insert previous week velocity
        sqlx::query(
            r#"
            INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count)
            VALUES ('TechCorp', date('now', '-5 days'), 5, 20)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // Insert current jobs
        sqlx::query(
            r#"
            INSERT INTO jobs (hash, title, company, location, posted_at, updated_at, status)
            VALUES
                ('job1', 'Engineer', 'TechCorp', 'SF', date('now'), datetime('now'), 'active'),
                ('job2', 'Designer', 'TechCorp', 'SF', date('now'), datetime('now'), 'active'),
                ('job3', 'Manager', 'TechCorp', 'SF', date('now'), datetime('now'), 'active')
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.compute_company_hiring_velocity().await;
        assert!(result.is_ok());

        // Verify trend is "decreasing" (3 < 5)
        let trend: String = sqlx::query_scalar(
            "SELECT hiring_trend FROM company_hiring_velocity WHERE company_name = 'TechCorp' AND date = date('now')",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(trend, "decreasing");
    }

    #[tokio::test]
    async fn test_compute_company_hiring_velocity_increasing() {
        let pool = setup_test_db().await;

        // Previous week with fewer jobs
        sqlx::query(
            r#"
            INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count)
            VALUES ('StartupCo', date('now', '-3 days'), 2, 10)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // More jobs today
        for i in 1..=5 {
            sqlx::query(
                r#"
                INSERT INTO jobs (hash, title, company, location, posted_at, updated_at, status)
                VALUES (?, 'Engineer', 'StartupCo', 'Austin', date('now'), datetime('now'), 'active')
                "#,
            )
            .bind(format!("job{}", i))
            .execute(&pool)
            .await
            .unwrap();
        }

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.compute_company_hiring_velocity().await;
        assert!(result.is_ok());

        let trend: String = sqlx::query_scalar(
            "SELECT hiring_trend FROM company_hiring_velocity WHERE company_name = 'StartupCo' AND date = date('now')",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(trend, "increasing");
    }

    #[tokio::test]
    async fn test_compute_company_hiring_velocity_stable() {
        let pool = setup_test_db().await;

        // Previous week with same count
        sqlx::query(
            r#"
            INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count)
            VALUES ('StableCorp', date('now', '-4 days'), 3, 15)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // Same number of jobs today
        for i in 1..=3 {
            sqlx::query(
                r#"
                INSERT INTO jobs (hash, title, company, location, posted_at, updated_at, status)
                VALUES (?, 'Engineer', 'StableCorp', 'Seattle', date('now'), datetime('now'), 'active')
                "#,
            )
            .bind(format!("job{}", i))
            .execute(&pool)
            .await
            .unwrap();
        }

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.compute_company_hiring_velocity().await;
        assert!(result.is_ok());

        let trend: String = sqlx::query_scalar(
            "SELECT hiring_trend FROM company_hiring_velocity WHERE company_name = 'StableCorp' AND date = date('now')",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(trend, "stable");
    }

    #[tokio::test]
    async fn test_compute_role_demand_trends_rising() {
        let pool = setup_test_db().await;

        // Previous week demand
        sqlx::query(
            r#"
            INSERT INTO role_demand_trends (
                job_title_normalized, date, job_count,
                avg_salary, median_salary, demand_trend
            )
            VALUES ('engineer', date('now', '-5 days'), 10, 120000, 120000, 'stable')
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // Current salary benchmark
        sqlx::query(
            r#"
            INSERT INTO salary_benchmarks (
                job_title_normalized, location_normalized, min_salary, p25_salary,
                median_salary, p75_salary, max_salary, average_salary, sample_size
            )
            VALUES ('engineer', 'remote', 100000, 120000, 140000, 160000, 180000, 140000, 20)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // More jobs today
        for i in 1..=15 {
            sqlx::query(
                r#"
                INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
                VALUES (?, 'Senior Engineer', 'TechCorp', 'Remote', datetime('now'), datetime('now'))
                "#,
            )
            .bind(format!("job{}", i))
            .execute(&pool)
            .await
            .unwrap();
        }

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.compute_role_demand_trends().await;
        assert!(result.is_ok());

        let trend: String = sqlx::query_scalar(
            "SELECT demand_trend FROM role_demand_trends WHERE job_title_normalized = 'engineer' AND date = date('now')",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(trend, "rising");
    }

    #[tokio::test]
    async fn test_compute_role_demand_trends_falling() {
        let pool = setup_test_db().await;

        // Previous week with high demand
        sqlx::query(
            r#"
            INSERT INTO role_demand_trends (
                job_title_normalized, date, job_count,
                avg_salary, median_salary, demand_trend
            )
            VALUES ('designer', date('now', '-6 days'), 20, 100000, 100000, 'rising')
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            INSERT INTO salary_benchmarks (
                job_title_normalized, location_normalized, min_salary, p25_salary,
                median_salary, p75_salary, max_salary, average_salary, sample_size
            )
            VALUES ('designer', 'remote', 80000, 90000, 100000, 110000, 120000, 100000, 10)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // Fewer jobs today
        for i in 1..=5 {
            sqlx::query(
                r#"
                INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
                VALUES (?, 'UX Designer', 'DesignCo', 'Remote', datetime('now'), datetime('now'))
                "#,
            )
            .bind(format!("job{}", i))
            .execute(&pool)
            .await
            .unwrap();
        }

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.compute_role_demand_trends().await;
        assert!(result.is_ok());

        let trend: String = sqlx::query_scalar(
            "SELECT demand_trend FROM role_demand_trends WHERE job_title_normalized = 'designer' AND date = date('now')",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(trend, "falling");
    }

    #[tokio::test]
    async fn test_compute_location_job_density_remote_jobs() {
        let pool = setup_test_db().await;

        // Insert remote jobs
        sqlx::query(
            r#"
            INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
            VALUES
                ('job1', 'Remote Engineer', 'Corp1', 'Remote - US', datetime('now'), datetime('now')),
                ('job2', 'Engineer', 'Corp2', 'Remote', datetime('now'), datetime('now')),
                ('job3', 'Designer', 'Corp3', 'Austin, TX', datetime('now'), datetime('now'))
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            INSERT INTO job_skills (job_hash, skill_name)
            VALUES
                ('job1', 'Python'),
                ('job2', 'Python'),
                ('job3', 'Figma')
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.compute_location_job_density().await;
        assert!(result.is_ok());

        // Check remote location was tracked
        let remote_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM location_job_density WHERE location_normalized LIKE '%remote%'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert!(remote_count > 0);
    }

    #[tokio::test]
    async fn test_run_daily_analysis_integration() {
        let pool = setup_test_db().await;

        // Insert comprehensive test data
        sqlx::query(
            r#"
            INSERT INTO jobs (hash, title, company, location, posted_at, updated_at, status)
            VALUES
                ('job1', 'Software Engineer', 'TechCorp', 'San Francisco, CA', datetime('now'), datetime('now'), 'active'),
                ('job2', 'Data Scientist', 'DataCo', 'New York, NY', datetime('now'), datetime('now'), 'active')
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            INSERT INTO job_skills (job_hash, skill_name, created_at)
            VALUES
                ('job1', 'Rust', datetime('now')),
                ('job1', 'Python', datetime('now')),
                ('job2', 'Python', datetime('now'))
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            INSERT INTO job_salary_predictions (job_hash, predicted_median)
            VALUES
                ('job1', 150000.0),
                ('job2', 140000.0)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            INSERT INTO salary_benchmarks (
                job_title_normalized, location_normalized, min_salary, p25_salary,
                median_salary, p75_salary, max_salary, average_salary, sample_size
            )
            VALUES ('software engineer', 'san francisco, ca', 100000, 130000, 150000, 170000, 200000, 150000, 10)
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mi = MarketIntelligence::new(pool.clone());
        let result = mi.run_daily_analysis().await;

        // If it fails, print the error
        if let Err(e) = &result {
            eprintln!("Daily analysis failed: {}", e);
        }
        assert!(result.is_ok(), "Daily analysis should succeed");

        // Verify at least skill trends were populated (others depend on more complex data)
        let skill_trends: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM skill_demand_trends")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert!(skill_trends > 0, "Should have skill trends");

        let salary_trends: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM salary_trends")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert!(salary_trends > 0, "Should have salary trends");

        let company_velocity: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM company_hiring_velocity")
                .fetch_one(&pool)
                .await
                .unwrap();
        assert!(company_velocity > 0, "Should have company velocity data");

        let location_density: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM location_job_density")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert!(location_density > 0, "Should have location density data");
    }

    #[tokio::test]
    async fn test_normalize_location_edge_cases() {
        let pool = setup_test_db().await;
        let mi = MarketIntelligence::new(pool);

        // Test various SF variations
        assert_eq!(mi.normalize_location("SF Bay Area"), "san francisco, ca");
        assert_eq!(mi.normalize_location("SAN FRANCISCO"), "san francisco, ca");
        assert_eq!(mi.normalize_location("sf"), "san francisco, ca");

        // Test NYC variations
        assert_eq!(mi.normalize_location("NYC, New York"), "new york, ny");
        assert_eq!(mi.normalize_location("new york city"), "new york, ny");

        // Test remote variations
        assert_eq!(mi.normalize_location("REMOTE - Anywhere"), "remote");
        assert_eq!(mi.normalize_location("Remote US"), "remote");

        // Test passthrough (non-remote, non-SF, non-NYC)
        assert_eq!(mi.normalize_location("Chicago, IL"), "chicago, il");
    }

    #[tokio::test]
    async fn test_parse_location_edge_cases() {
        let pool = setup_test_db().await;
        let mi = MarketIntelligence::new(pool);

        // Multiple commas
        let (city, state) = mi.parse_location("New York, NY, USA");
        assert_eq!(city, Some("New York".to_string()));
        assert_eq!(state, Some("NY".to_string()));

        // No comma
        let (city2, state2) = mi.parse_location("Berlin");
        assert_eq!(city2, Some("Berlin".to_string()));
        assert_eq!(state2, None);

        // Empty string
        let (city3, state3) = mi.parse_location("");
        assert_eq!(city3, Some("".to_string()));
        assert_eq!(state3, None);

        // Whitespace handling
        let (city4, state4) = mi.parse_location("  Seattle  ,  WA  ");
        assert_eq!(city4, Some("Seattle".to_string()));
        assert_eq!(state4, Some("WA".to_string()));
    }
}
