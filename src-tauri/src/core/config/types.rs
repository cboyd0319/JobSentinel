//! Configuration type definitions

mod notifications;
mod sources;

pub use super::external_ai::{ExternalAiConfig, ExternalAiProvider};
pub use notifications::{
    AlertConfig, DesktopConfig, DiscordConfig, EmailConfig, SlackConfig, TeamsConfig,
    TelegramConfig,
};
use serde::{Deserialize, Serialize};
pub use sources::{
    BuiltInConfig, DiceConfig, GlassdoorConfig, HnHiringConfig, LinkedInConfig, RemoteOkConfig,
    SimplyHiredConfig, UsaJobsConfig, WeWorkRemotelyConfig, YcStartupConfig,
};

/// User configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Job titles to match (e.g., "Security Engineer")
    pub title_allowlist: Vec<String>,

    /// Job titles to exclude (e.g., "Manager", "Intern")
    #[serde(default)]
    pub title_blocklist: Vec<String>,

    /// Keywords to boost score
    #[serde(default)]
    pub keywords_boost: Vec<String>,

    /// Keywords to auto-reject
    #[serde(default)]
    pub keywords_exclude: Vec<String>,

    /// Location preferences
    pub location_preferences: LocationPreferences,

    /// Minimum salary in USD (hard floor - jobs below this get low scores)
    pub salary_floor_usd: i64,

    /// Target salary in USD (ideal salary - used for graduated scoring)
    /// If not set, defaults to salary_floor_usd
    #[serde(default)]
    pub salary_target_usd: Option<i64>,

    /// Penalize jobs with missing salary information
    /// If true, jobs without salary get 0.3 score; if false, get 0.5 (neutral)
    #[serde(default)]
    pub penalize_missing_salary: bool,

    /// Auto-refresh configuration
    #[serde(default)]
    pub auto_refresh: AutoRefreshConfig,

    /// Browser Import local helper port.
    #[serde(default = "super::defaults::default_bookmarklet_port")]
    pub bookmarklet_port: u16,

    /// Immediate alert threshold (0.0 - 1.0)
    #[serde(default = "super::defaults::default_immediate_threshold")]
    pub immediate_alert_threshold: f64,

    /// Scraping interval in hours
    #[serde(default = "super::defaults::default_scraping_interval")]
    pub scraping_interval_hours: u64,

    /// Alert configuration
    pub alerts: AlertConfig,

    /// Greenhouse company URLs to scrape (e.g., "https://boards.greenhouse.io/cloudflare")
    #[serde(default)]
    pub greenhouse_urls: Vec<String>,

    /// Lever company URLs to scrape (e.g., "https://jobs.lever.co/netflix")
    #[serde(default)]
    pub lever_urls: Vec<String>,

    /// LinkedIn source configuration
    #[serde(default)]
    pub linkedin: LinkedInConfig,

    /// User acknowledgements for restricted scheduled job-board checks.
    #[serde(default)]
    pub restricted_source_acknowledgements: RestrictedSourceAcknowledgements,

    /// RemoteOK scraper configuration
    #[serde(default)]
    pub remoteok: RemoteOkConfig,

    /// WeWorkRemotely scraper configuration
    #[serde(default)]
    pub weworkremotely: WeWorkRemotelyConfig,

    /// BuiltIn scraper configuration
    #[serde(default)]
    pub builtin: BuiltInConfig,

    /// Hacker News Who's Hiring scraper configuration
    #[serde(default)]
    pub hn_hiring: HnHiringConfig,

    /// Dice scraper configuration
    #[serde(default)]
    pub dice: DiceConfig,

    /// Y Combinator Work at a Startup scraper configuration
    #[serde(default)]
    pub yc_startup: YcStartupConfig,

    /// USAJobs.gov federal government job scraper configuration
    #[serde(default)]
    pub usajobs: UsaJobsConfig,

    /// SimplyHired job aggregator scraper configuration (v2.5.5)
    #[serde(default)]
    pub simplyhired: SimplyHiredConfig,

    /// Glassdoor job board scraper configuration (v2.5.5)
    #[serde(default)]
    pub glassdoor: GlassdoorConfig,

    /// Optional JobsWithGPT MCP endpoint URL.
    ///
    /// Empty by default. A configured endpoint is not enough to send data:
    /// scheduled source checks also require a matching reviewed payload in
    /// `jobswithgpt_approval`.
    #[serde(default = "super::defaults::default_jobswithgpt_endpoint")]
    pub jobswithgpt_endpoint: String,

    /// Local approval record for the exact JobsWithGPT payload.
    ///
    /// This duplicates the reviewed public-source payload locally so the
    /// scheduler can block silent sends after endpoint, title, or remote-setting
    /// changes.
    #[serde(default)]
    pub jobswithgpt_approval: JobsWithGptApproval,

    /// Optional outside-AI configuration. Provider credentials are stored
    /// through `CredentialService`, not serialized in config.
    #[serde(default)]
    pub external_ai: ExternalAiConfig,

    /// Ghost job detection configuration
    #[serde(default)]
    pub ghost_config: Option<crate::core::ghost::GhostConfig>,

    /// Use resume matching for skills scoring (requires uploaded resume)
    /// When enabled and a resume is available, scores are calculated based on actual resume skills
    /// Falls back to keyword matching when no resume is present
    #[serde(default)]
    pub use_resume_matching: bool,

    /// Company whitelist for scoring bonus (case-insensitive fuzzy matching)
    /// Companies in this list receive scoring bonus
    #[serde(default)]
    pub company_whitelist: Vec<String>,

    /// Company blacklist for scoring penalty (case-insensitive fuzzy matching)
    /// Jobs from companies in this list receive very low scores
    #[serde(default)]
    pub company_blacklist: Vec<String>,
}

pub const JOBSWITHGPT_DEFAULT_LIMIT: usize = 100;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct JobsWithGptPayload {
    pub endpoint: String,
    pub titles: Vec<String>,
    #[serde(default)]
    pub location: Option<String>,
    pub remote_only: bool,
    pub limit: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct JobsWithGptApproval {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub payload: Option<JobsWithGptPayload>,
    #[serde(default)]
    pub approved_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RestrictedSourceAcknowledgements {
    #[serde(default)]
    pub builtin: bool,
    #[serde(default)]
    pub dice: bool,
    #[serde(default)]
    pub simplyhired: bool,
    #[serde(default)]
    pub glassdoor: bool,
}

impl Config {
    pub fn jobswithgpt_payload_preview(&self) -> Option<JobsWithGptPayload> {
        let endpoint = self.jobswithgpt_endpoint.trim().to_string();
        if endpoint.is_empty() {
            return None;
        }

        let titles: Vec<String> = self
            .title_allowlist
            .iter()
            .map(|title| title.trim())
            .filter(|title| !title.is_empty())
            .map(ToOwned::to_owned)
            .collect();
        if titles.is_empty() {
            return None;
        }

        Some(JobsWithGptPayload {
            endpoint,
            titles,
            location: None,
            remote_only: self.location_preferences.allow_remote
                && !self.location_preferences.allow_onsite,
            limit: JOBSWITHGPT_DEFAULT_LIMIT,
        })
    }

    pub fn jobswithgpt_payload_approved(&self) -> bool {
        if !self.jobswithgpt_approval.enabled {
            return false;
        }

        self.jobswithgpt_payload_preview()
            .is_some_and(|payload| self.jobswithgpt_approval.payload.as_ref() == Some(&payload))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocationPreferences {
    pub allow_remote: bool,

    #[serde(default)]
    pub allow_hybrid: bool,

    #[serde(default)]
    pub allow_onsite: bool,

    #[serde(default)]
    pub cities: Vec<String>,

    #[serde(default)]
    pub states: Vec<String>,

    #[serde(default = "super::defaults::default_country")]
    pub country: String,
}

/// Auto-refresh configuration for the frontend
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AutoRefreshConfig {
    /// Enable automatic job refresh
    #[serde(default)]
    pub enabled: bool,

    /// Refresh interval in minutes (default: 30)
    #[serde(default = "super::defaults::default_auto_refresh_interval")]
    pub interval_minutes: u32,
}

#[cfg(test)]
mod tests;
