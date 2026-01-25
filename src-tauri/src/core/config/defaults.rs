//! Default values for configuration fields

/// Default JobsWithGPT MCP endpoint
pub(crate) fn default_jobswithgpt_endpoint() -> String {
    "https://api.jobswithgpt.com/mcp".to_string()
}

/// Default immediate alert threshold (0.9)
#[must_use]
pub(crate) const fn default_immediate_threshold() -> f64 {
    0.9
}

/// Default scraping interval in hours (2 hours)
#[must_use]
pub(crate) const fn default_scraping_interval() -> u64 {
    2
}

/// Default country code (US)
pub(crate) fn default_country() -> String {
    "US".to_string()
}

/// Default auto-refresh interval in minutes (30 minutes)
#[must_use]
pub(crate) const fn default_auto_refresh_interval() -> u32 {
    30
}

/// Default SMTP port (587 for STARTTLS)
#[must_use]
pub(crate) const fn default_smtp_port() -> u16 {
    587
}

/// Default STARTTLS setting (true)
#[must_use]
pub(crate) const fn default_use_starttls() -> bool {
    true
}

/// Default desktop notifications enabled (true)
#[must_use]
pub(crate) const fn default_desktop_enabled() -> bool {
    true
}

/// Default notification sound enabled (true)
#[must_use]
pub(crate) const fn default_play_sound() -> bool {
    true
}

/// Default LinkedIn result limit (50)
#[must_use]
pub(crate) const fn default_linkedin_limit() -> usize {
    50
}

/// Default scraper result limit (50)
#[must_use]
pub(crate) const fn default_scraper_limit() -> usize {
    50
}

/// Default USAJobs date posted filter (30 days)
#[must_use]
pub(crate) const fn default_usajobs_date_posted() -> u8 {
    30
}

/// Default USAJobs result limit (100)
#[must_use]
pub(crate) const fn default_usajobs_limit() -> usize {
    100
}
