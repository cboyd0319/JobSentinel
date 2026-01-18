//! Default values for configuration fields

/// Default JobsWithGPT MCP endpoint
pub(crate) fn default_jobswithgpt_endpoint() -> String {
    "https://api.jobswithgpt.com/mcp".to_string()
}

/// Default immediate alert threshold (0.9)
pub(crate) fn default_immediate_threshold() -> f64 {
    0.9
}

/// Default scraping interval in hours (2 hours)
pub(crate) fn default_scraping_interval() -> u64 {
    2
}

/// Default country code (US)
pub(crate) fn default_country() -> String {
    "US".to_string()
}

/// Default auto-refresh interval in minutes (30 minutes)
pub(crate) fn default_auto_refresh_interval() -> u32 {
    30
}

/// Default SMTP port (587 for STARTTLS)
pub(crate) fn default_smtp_port() -> u16 {
    587
}

/// Default STARTTLS setting (true)
pub(crate) fn default_use_starttls() -> bool {
    true
}

/// Default desktop notifications enabled (true)
pub(crate) fn default_desktop_enabled() -> bool {
    true
}

/// Default notification sound enabled (true)
pub(crate) fn default_play_sound() -> bool {
    true
}

/// Default LinkedIn result limit (50)
pub(crate) fn default_linkedin_limit() -> usize {
    50
}

/// Default Indeed search radius in miles (25)
pub(crate) fn default_indeed_radius() -> u32 {
    25
}

/// Default Indeed result limit (50)
pub(crate) fn default_indeed_limit() -> usize {
    50
}

/// Default scraper result limit (50)
pub(crate) fn default_scraper_limit() -> usize {
    50
}

/// Default ZipRecruiter search radius in miles (25)
pub(crate) fn default_ziprecruiter_radius() -> Option<u32> {
    Some(25)
}
