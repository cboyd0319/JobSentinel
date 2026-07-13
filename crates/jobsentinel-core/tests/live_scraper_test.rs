//! Live Scraper Tests - Tests against real APIs
//!
//! Run with: cargo test --test live_scraper_test -- --ignored --nocapture
//!
//! Note: Some scrapers require authentication or may be rate-limited/blocked.
//! Tests are ignored by default because they depend on live external sites.

use jobsentinel_core::scrapers::{
    builtin::BuiltInScraper,
    dice::DiceScraper,
    glassdoor::GlassdoorScraper,
    greenhouse::{GreenhouseCompany, GreenhouseScraper},
    hn_hiring::HnHiringScraper,
    lever::{LeverCompany, LeverScraper},
    remoteok::RemoteOkScraper,
    simplyhired::SimplyHiredScraper,
    weworkremotely::WeWorkRemotelyScraper,
    yc_startup::YcStartupScraper,
    JobScraper,
};

// Note: indeed, ziprecruiter, wellfound were removed (blocked by Cloudflare)
// simplyhired and glassdoor re-added in v2.5.5 - may return empty if blocked

// ============================================================================
// API-BASED SCRAPERS (Most reliable)
// ============================================================================

#[tokio::test]
#[ignore = "Live network scraper check; run manually"]
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
#[ignore = "Live network scraper check; run manually"]
async fn test_lever_live() {
    let scraper = LeverScraper::new(vec![
        LeverCompany {
            id: "gohighlevel".to_string(),
            name: "HighLevel".to_string(),
            url: "https://api.lever.co/v0/postings/gohighlevel".to_string(),
        },
        LeverCompany {
            id: "hermeus".to_string(),
            name: "Hermeus".to_string(),
            url: "https://api.lever.co/v0/postings/hermeus".to_string(),
        },
        LeverCompany {
            id: "activecampaign".to_string(),
            name: "ActiveCampaign".to_string(),
            url: "https://api.lever.co/v0/postings/activecampaign".to_string(),
        },
    ]);

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            println!(
                "Lever: Found {} jobs from the public sample boards",
                jobs.len()
            );
            assert!(
                !jobs.is_empty(),
                "Expected jobs from the public Lever sample boards"
            );
        }
        Err(e) => panic!("❌ Lever scraper failed: {}", e),
    }
}

#[tokio::test]
#[ignore = "Live network scraper check; run manually"]
async fn test_remoteok_live() {
    let scraper = RemoteOkScraper::new(vec!["customer-support".to_string()], 50);

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
#[ignore = "Live network scraper check; run manually"]
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
#[ignore = "Live network scraper check; run manually"]
async fn test_weworkremotely_live() {
    let scraper = WeWorkRemotelyScraper::new(Some("remote-customer-support-jobs".to_string()), 50);

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
#[ignore = "Live network scraper check; run manually"]
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
#[ignore = "Live network scraper check; run manually"]
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
#[ignore = "Live network scraper check; run manually"]
async fn test_dice_live() {
    let scraper = DiceScraper::new(
        "project manager".to_string(),
        Some("Remote".to_string()),
        50,
    );

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
#[ignore = "Live network scraper check; run manually"]
async fn test_yc_startups_live() {
    let scraper = YcStartupScraper::new(Some("operations".to_string()), false, 50);

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
// EXTERNALLY CONFIGURED OR SOURCE-POLICY LIMITED SCRAPERS
// ============================================================================

#[tokio::test]
#[ignore = "Live LinkedIn automation is not part of default CI; use user-gated native import paths"]
async fn test_linkedin_live() {
    println!("LinkedIn: use user-gated native import paths instead of default hidden monitoring");
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

// ============================================================================
// V2.5.5 SCRAPERS (May be blocked by Cloudflare)
// ============================================================================

#[tokio::test]
#[ignore = "Live network scraper check; run manually"]
async fn test_simplyhired_live() {
    let scraper = SimplyHiredScraper::new(
        "care coordinator".to_string(),
        Some("Remote".to_string()),
        50,
    );

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            if jobs.is_empty() {
                println!("⚠️  SimplyHired: 0 jobs (likely Cloudflare blocked)");
            } else {
                println!("✅ SimplyHired: Found {} jobs", jobs.len());
                // Verify job structure
                for job in jobs.iter().take(3) {
                    println!(
                        "   - {} at {} ({})",
                        job.title,
                        job.company,
                        job.location.as_deref().unwrap_or("Unknown")
                    );
                }
            }
        }
        Err(e) => {
            println!("⚠️  SimplyHired: {}", e);
            println!("    (May be blocked by Cloudflare)");
        }
    }
}

#[tokio::test]
#[ignore = "Live network scraper check; run manually"]
async fn test_glassdoor_live() {
    let scraper = GlassdoorScraper::new(
        "operations manager".to_string(),
        Some("Denver".to_string()),
        50,
    );

    let result = scraper.scrape().await;
    match result {
        Ok(jobs) => {
            if jobs.is_empty() {
                println!("⚠️  Glassdoor: 0 jobs (likely Cloudflare blocked)");
            } else {
                println!("✅ Glassdoor: Found {} jobs", jobs.len());
                // Verify job structure
                for job in jobs.iter().take(3) {
                    println!(
                        "   - {} at {} ({})",
                        job.title,
                        job.company,
                        job.location.as_deref().unwrap_or("Unknown")
                    );
                }
            }
        }
        Err(e) => {
            println!("⚠️  Glassdoor: {}", e);
            println!("    (May be blocked by Cloudflare)");
        }
    }
}
