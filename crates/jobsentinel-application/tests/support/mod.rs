use chrono::Utc;
use jobsentinel_application::config::{Config, LocationPreferences};
use jobsentinel_domain::Job;

pub(crate) fn test_config() -> Config {
    Config {
        title_allowlist: vec![
            "Care Coordinator".to_string(),
            "Customer Support Lead".to_string(),
        ],
        title_blocklist: vec!["Manager".to_string()],
        keywords_boost: vec!["CRM".to_string(), "case management".to_string()],
        keywords_exclude: vec!["commission-only".to_string()],
        location_preferences: LocationPreferences {
            allow_remote: true,
            allow_hybrid: false,
            allow_onsite: false,
            cities: vec!["Chicago".to_string()],
            states: vec!["IL".to_string()],
            country: "US".to_string(),
        },
        salary_floor_usd: 50000,
        salary_target_usd: None,
        penalize_missing_salary: false,
        auto_refresh: Default::default(),
        immediate_alert_threshold: 0.85,
        scraping_interval_hours: 2,
        bookmarklet_port: 4321,
        alerts: Default::default(),
        external_ai: Default::default(),
        greenhouse_urls: vec![],
        lever_urls: vec![],
        linkedin: Default::default(),
        restricted_source_acknowledgements: Default::default(),
        jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
        jobswithgpt_approval: Default::default(),
        remoteok: Default::default(),
        weworkremotely: Default::default(),
        builtin: Default::default(),
        hn_hiring: Default::default(),
        dice: Default::default(),
        yc_startup: Default::default(),
        usajobs: Default::default(),
        simplyhired: Default::default(),
        glassdoor: Default::default(),
        ghost_config: None,
        use_resume_matching: false,
        preferred_companies: vec![],
        blocked_companies: vec![],
    }
}

pub(crate) fn test_job(hash: &str, title: &str, company: &str) -> Job {
    let now = Utc::now();
    Job {
        id: 0,
        hash: hash.to_string(),
        title: title.to_string(),
        company: company.to_string(),
        url: format!("https://example.com/job/{hash}"),
        location: Some("Remote".to_string()),
        description: Some("Test description".to_string()),
        score: None,
        score_reasons: None,
        source: "test".to_string(),
        remote: Some(true),
        salary_min: None,
        salary_max: None,
        currency: Some("USD".to_string()),
        created_at: now,
        updated_at: now,
        last_seen: now,
        times_seen: 1,
        immediate_alert_sent: false,
        hidden: false,
        included_in_digest: false,
        bookmarked: false,
        notes: None,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
    }
}
