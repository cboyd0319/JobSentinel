//! Live Scraper Tests - Tests against real APIs
//!
//! Run with: cargo test --test live_scraper_test -- --nocapture
//!
//! Note: Some scrapers require authentication or may be rate-limited/blocked.
//! Tests are designed to verify basic connectivity and parsing.

use jobsentinel::core::scrapers::{
    builtin::BuiltInScraper,
    dice::DiceScraper,
    greenhouse::{GreenhouseCompany, GreenhouseScraper},
    hn_hiring::HnHiringScraper,
    lever::{LeverCompany, LeverScraper},
    remoteok::RemoteOkScraper,
    weworkremotely::WeWorkRemotelyScraper,
    yc_startup::YcStartupScraper,
    JobScraper,
};

// REMOVED: indeed, ziprecruiter, wellfound, simplyhired
// These scrapers were blocked by Cloudflare and have been removed from the codebase

// ============================================================================
// API-BASED SCRAPERS (Most reliable)
// ============================================================================

#[tokio::test]
async fn test_greenhouse_live() {
    let scraper = GreenhouseScraper::new(vec![GreenhouseCompany {
        id: "cloudflare".to_string(),
        name: "Cloudflare".to_string(),
        url: "https://boards.greenhouse.io/cloudflare".to_string(),
    }]);

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            println!("✅ Greenhouse: Found {} jobs from Cloudflare", jobs.len());
            assert!(!jobs.is_empty(), "Expected jobs from Cloudflare");
        }
        Err(e) => panic!("❌ Greenhouse scraper failed: {}", e),
    }
}

#[tokio::test]
async fn test_lever_live() {
    let scraper = LeverScraper::new(vec![LeverCompany {
        id: "plaid".to_string(),
        name: "Plaid".to_string(),
        url: "https://api.lever.co/v0/postings/plaid".to_string(),
    }]);

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            println!("✅ Lever: Found {} jobs from Plaid", jobs.len());
            assert!(!jobs.is_empty(), "Expected jobs from Plaid");
        }
        Err(e) => panic!("❌ Lever scraper failed: {}", e),
    }
}

#[tokio::test]
async fn test_remoteok_live() {
    let scraper = RemoteOkScraper::new(vec!["developer".to_string()], 50);

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            println!("✅ RemoteOK: Found {} jobs", jobs.len());
            // RemoteOK may have 0 jobs for a specific tag
        }
        Err(e) => panic!("❌ RemoteOK scraper failed: {}", e),
    }
}

#[tokio::test]
async fn test_hn_hiring_live() {
    let scraper = HnHiringScraper::new(50, false);

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            println!("✅ HN Who's Hiring: Found {} jobs", jobs.len());
            // May be 0 between hiring threads
        }
        Err(e) => panic!("❌ HN Who's Hiring scraper failed: {}", e),
    }
}

// ============================================================================
// RSS-BASED SCRAPERS
// ============================================================================

#[tokio::test]
async fn test_weworkremotely_live() {
    let scraper = WeWorkRemotelyScraper::new(Some("remote-programming-jobs".to_string()), 50);

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            println!("✅ WeWorkRemotely: Found {} jobs", jobs.len());
            assert!(!jobs.is_empty(), "Expected jobs from WeWorkRemotely");
        }
        Err(e) => panic!("❌ WeWorkRemotely scraper failed: {}", e),
    }
}

// ============================================================================
// HTML SCRAPERS (May be blocked or rate-limited)
// ============================================================================

#[tokio::test]
async fn test_builtin_live() {
    // BuiltIn changed their URL structure - now uses /jobs and /jobs/remote
    let scraper = BuiltInScraper::new(false, 50);

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            println!("✅ BuiltIn: Found {} jobs", jobs.len());
        }
        Err(e) => {
            println!("⚠️  BuiltIn: {}", e);
            println!("    (May be rate-limited or blocked)");
        }
    }
}

#[tokio::test]
async fn test_builtin_remote_live() {
    // Test the remote-only endpoint
    let scraper = BuiltInScraper::new(true, 50);

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            println!("✅ BuiltIn (Remote): Found {} jobs", jobs.len());
        }
        Err(e) => {
            println!("⚠️  BuiltIn (Remote): {}", e);
            println!("    (May be rate-limited or blocked)");
        }
    }
}

#[tokio::test]
async fn test_dice_live() {
    let scraper = DiceScraper::new("rust developer".to_string(), Some("Remote".to_string()), 50);

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            println!("✅ Dice: Found {} jobs", jobs.len());
        }
        Err(e) => {
            println!("⚠️  Dice: {}", e);
            println!("    (May require JavaScript rendering)");
        }
    }
}


#[tokio::test]
async fn test_yc_startups_live() {
    let scraper = YcStartupScraper::new(Some("engineer".to_string()), false, 50);

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            println!("✅ YC Startups: Found {} jobs", jobs.len());
        }
        Err(e) => {
            println!("⚠️  YC Startups: {}", e);
        }
    }
}


// ============================================================================
// AUTH-REQUIRED SCRAPERS (Skipped - require credentials)
// ============================================================================

#[tokio::test]
#[ignore = "Requires LinkedIn session cookie (li_at)"]
async fn test_linkedin_live() {
    // LinkedIn requires authentication via li_at cookie
    // This test is skipped by default
    println!("⏭️  LinkedIn: Skipped (requires authentication)");
}

#[tokio::test]
#[ignore = "Requires USAJobs API key"]
async fn test_usajobs_live() {
    // USAJobs requires API key registration
    // This test is skipped by default
    println!("⏭️  USAJobs: Skipped (requires API key)");
}

#[tokio::test]
#[ignore = "Requires MCP endpoint configuration"]
async fn test_jobswithgpt_live() {
    // JobsWithGPT uses MCP protocol
    // This test is skipped by default
    println!("⏭️  JobsWithGPT: Skipped (requires MCP endpoint)");
}
