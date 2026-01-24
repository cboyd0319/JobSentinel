//! Live Scraper Tests - Tests against real APIs
//!
//! Run with: cargo test --test live_scraper_test -- --nocapture

use jobsentinel::core::scrapers::{
    greenhouse::{GreenhouseCompany, GreenhouseScraper},
    lever::{LeverCompany, LeverScraper},
    remoteok::RemoteOkScraper,
    hn_hiring::HnHiringScraper,
    weworkremotely::WeWorkRemotelyScraper,
    JobScraper,
};

#[tokio::test]
async fn test_greenhouse_live() {
    let scraper = GreenhouseScraper::new(vec![
        GreenhouseCompany {
            id: "cloudflare".to_string(),
            name: "Cloudflare".to_string(),
            url: "https://boards.greenhouse.io/cloudflare".to_string(),
        },
    ]);

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            println!("Greenhouse: Found {} jobs from Cloudflare", jobs.len());
            if !jobs.is_empty() {
                println!("  Sample: {} - {}", jobs[0].title, jobs[0].company);
            }
            assert!(jobs.len() > 0, "Expected at least 1 job from Cloudflare");
        }
        Err(e) => {
            panic!("Greenhouse scraper failed: {}", e);
        }
    }
}

#[tokio::test]
async fn test_lever_live() {
    let scraper = LeverScraper::new(vec![
        LeverCompany {
            id: "plaid".to_string(),
            name: "Plaid".to_string(),
            url: "https://api.lever.co/v0/postings/plaid".to_string(),
        },
    ]);

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            println!("Lever: Found {} jobs from Plaid", jobs.len());
            if !jobs.is_empty() {
                println!("  Sample: {} - {}", jobs[0].title, jobs[0].company);
            }
            assert!(jobs.len() > 0, "Expected at least 1 job from Plaid");
        }
        Err(e) => {
            panic!("Lever scraper failed: {}", e);
        }
    }
}

#[tokio::test]
async fn test_remoteok_live() {
    let scraper = RemoteOkScraper::new(vec!["rust".to_string()], 100);

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            println!("RemoteOK: Found {} jobs with 'rust' tag", jobs.len());
            if !jobs.is_empty() {
                println!("  Sample: {} - {}", jobs[0].title, jobs[0].company);
            }
            // RemoteOK may have 0 jobs for a specific tag at any time
            println!("  Test passed (0+ jobs is valid)");
        }
        Err(e) => {
            panic!("RemoteOK scraper failed: {}", e);
        }
    }
}

#[tokio::test]
async fn test_hn_hiring_live() {
    let scraper = HnHiringScraper::new(100, false); // Limit 100, not remote-only

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            println!("HN Who's Hiring: Found {} jobs", jobs.len());
            if !jobs.is_empty() {
                println!("  Sample: {} - {}", jobs[0].title, jobs[0].company);
            }
            // HN may have 0 jobs if between hiring threads
            println!("  Test passed (0+ jobs is valid)");
        }
        Err(e) => {
            panic!("HN Who's Hiring scraper failed: {}", e);
        }
    }
}

#[tokio::test]
async fn test_weworkremotely_live() {
    let scraper = WeWorkRemotelyScraper::new(Some("remote-programming-jobs".to_string()), 50);

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            println!("WeWorkRemotely: Found {} jobs", jobs.len());
            if !jobs.is_empty() {
                println!("  Sample: {} - {}", jobs[0].title, jobs[0].company);
            }
            assert!(jobs.len() > 0, "Expected at least 1 job from WeWorkRemotely");
        }
        Err(e) => {
            panic!("WeWorkRemotely scraper failed: {}", e);
        }
    }
}
