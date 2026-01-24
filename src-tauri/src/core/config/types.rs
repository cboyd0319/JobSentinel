//! Configuration type definitions

use serde::{Deserialize, Serialize};

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

    /// LinkedIn scraper configuration
    #[serde(default)]
    pub linkedin: LinkedInConfig,

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

    /// JobsWithGPT MCP endpoint URL
    #[serde(default = "super::defaults::default_jobswithgpt_endpoint")]
    pub jobswithgpt_endpoint: String,

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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AlertConfig {
    #[serde(default)]
    pub slack: SlackConfig,

    #[serde(default)]
    pub email: EmailConfig,

    #[serde(default)]
    pub discord: DiscordConfig,

    #[serde(default)]
    pub telegram: TelegramConfig,

    #[serde(default)]
    pub teams: TeamsConfig,

    #[serde(default)]
    pub desktop: DesktopConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SlackConfig {
    pub enabled: bool,

    /// Webhook URL - stored in OS keyring, not serialized
    #[serde(skip)]
    pub webhook_url: String,
}

/// Email notification configuration
///
/// # Security
///
/// The `smtp_password` field is stored securely in the OS keyring:
/// - macOS: Keychain
/// - Windows: Credential Manager
/// - Linux: Secret Service API (libsecret)
///
/// For Gmail, use app-specific passwords rather than your main password.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EmailConfig {
    #[serde(default)]
    pub enabled: bool,

    /// SMTP server hostname (e.g., "smtp.gmail.com")
    #[serde(default)]
    pub smtp_server: String,

    /// SMTP port (typically 587 for STARTTLS, 465 for SSL)
    #[serde(default = "super::defaults::default_smtp_port")]
    pub smtp_port: u16,

    /// SMTP username/email
    #[serde(default)]
    pub smtp_username: String,

    /// SMTP password or app-specific password
    /// Stored securely in OS keyring (macOS Keychain, Windows Credential Manager)
    #[serde(skip)]
    pub smtp_password: String,

    /// Email address to send from
    #[serde(default)]
    pub from_email: String,

    /// Email address(es) to send to
    #[serde(default)]
    pub to_emails: Vec<String>,

    /// Use STARTTLS (true for port 587, false for port 465)
    #[serde(default = "super::defaults::default_use_starttls")]
    pub use_starttls: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DiscordConfig {
    #[serde(default)]
    pub enabled: bool,

    /// Discord webhook URL - stored in OS keyring, not serialized
    #[serde(skip)]
    pub webhook_url: String,

    /// Optional: Discord user ID to mention in notifications
    #[serde(default)]
    pub user_id_to_mention: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TelegramConfig {
    #[serde(default)]
    pub enabled: bool,

    /// Telegram Bot API token - stored in OS keyring, not serialized
    #[serde(skip)]
    pub bot_token: String,

    /// Telegram chat ID to send messages to
    #[serde(default)]
    pub chat_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TeamsConfig {
    #[serde(default)]
    pub enabled: bool,

    /// Microsoft Teams webhook URL - stored in OS keyring, not serialized
    #[serde(skip)]
    pub webhook_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DesktopConfig {
    #[serde(default = "super::defaults::default_desktop_enabled")]
    pub enabled: bool,

    /// Show desktop notifications even if app is focused
    #[serde(default)]
    pub show_when_focused: bool,

    /// Play sound with notifications
    #[serde(default = "super::defaults::default_play_sound")]
    pub play_sound: bool,
}

/// LinkedIn scraper configuration
///
/// LinkedIn requires authentication via session cookie. Users must manually
/// extract this from their browser after logging in.
///
/// # Security
/// The session cookie is stored securely in the OS keyring (macOS Keychain,
/// Windows Credential Manager, Linux Secret Service).
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LinkedInConfig {
    /// Enable LinkedIn job scraping
    #[serde(default)]
    pub enabled: bool,

    /// LinkedIn session cookie (li_at value)
    /// Stored securely in OS keyring (macOS Keychain, Windows Credential Manager)
    #[serde(skip)]
    pub session_cookie: String,

    /// Search query (job title, keywords)
    /// Example: "software engineer", "rust developer"
    #[serde(default)]
    pub query: String,

    /// Location filter
    /// Example: "San Francisco Bay Area", "Remote", "United States"
    #[serde(default)]
    pub location: String,

    /// Search only for remote jobs
    #[serde(default)]
    pub remote_only: bool,

    /// Maximum results to return (default: 50, max: 100)
    #[serde(default = "super::defaults::default_linkedin_limit")]
    pub limit: usize,
}

/// RemoteOK scraper configuration
///
/// RemoteOK provides a public JSON API for remote job listings.
/// No authentication required.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RemoteOkConfig {
    /// Enable RemoteOK job scraping
    #[serde(default)]
    pub enabled: bool,

    /// Search tags to filter jobs (e.g., ["rust", "python", "engineer"])
    #[serde(default)]
    pub tags: Vec<String>,

    /// Maximum results to return (default: 50)
    #[serde(default = "super::defaults::default_scraper_limit")]
    pub limit: usize,
}

/// WeWorkRemotely scraper configuration
///
/// WeWorkRemotely provides an RSS feed for remote-only jobs.
/// No authentication required.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WeWorkRemotelyConfig {
    /// Enable WeWorkRemotely job scraping
    #[serde(default)]
    pub enabled: bool,

    /// Category to search (e.g., "remote-programming-jobs", "remote-design-jobs")
    #[serde(default)]
    pub category: Option<String>,

    /// Maximum results to return (default: 50)
    #[serde(default = "super::defaults::default_scraper_limit")]
    pub limit: usize,
}

/// BuiltIn scraper configuration
///
/// BuiltIn covers tech jobs from startups and tech companies.
/// No authentication required.
///
/// Note: BuiltIn changed their URL structure in late 2025.
/// City-specific URLs no longer work. Use remote_only filter instead.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BuiltInConfig {
    /// Enable BuiltIn job scraping
    #[serde(default)]
    pub enabled: bool,

    /// Only fetch remote jobs (uses /jobs/remote endpoint)
    #[serde(default)]
    pub remote_only: bool,

    /// Maximum results to return (default: 50)
    #[serde(default = "super::defaults::default_scraper_limit")]
    pub limit: usize,
}

/// Hacker News Who's Hiring scraper configuration
///
/// Scrapes jobs from the monthly "Who is hiring?" threads.
/// No authentication required.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct HnHiringConfig {
    /// Enable HN Who's Hiring job scraping
    #[serde(default)]
    pub enabled: bool,

    /// Filter for remote jobs only
    #[serde(default)]
    pub remote_only: bool,

    /// Maximum results to return (default: 50)
    #[serde(default = "super::defaults::default_scraper_limit")]
    pub limit: usize,
}

/// Dice scraper configuration
///
/// Dice is a tech-focused job board with IT and technology positions.
/// No authentication required.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DiceConfig {
    /// Enable Dice job scraping
    #[serde(default)]
    pub enabled: bool,

    /// Search query (e.g., "rust developer", "software engineer")
    #[serde(default)]
    pub query: String,

    /// Location filter (e.g., "Remote", "New York, NY")
    #[serde(default)]
    pub location: Option<String>,

    /// Maximum results to return (default: 50)
    #[serde(default = "super::defaults::default_scraper_limit")]
    pub limit: usize,
}

/// Y Combinator Work at a Startup scraper configuration
///
/// Scrapes curated positions from YC-backed startups.
/// No authentication required.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct YcStartupConfig {
    /// Enable YC Startup job scraping
    #[serde(default)]
    pub enabled: bool,

    /// Optional keyword filter
    #[serde(default)]
    pub query: Option<String>,

    /// Filter for remote jobs only
    #[serde(default)]
    pub remote_only: bool,

    /// Maximum results to return (default: 50)
    #[serde(default = "super::defaults::default_scraper_limit")]
    pub limit: usize,
}

/// SimplyHired scraper configuration (v2.5.5)
///
/// SimplyHired job aggregator. Uses RSS feeds.
/// Note: May be blocked by Cloudflare, returns empty if so.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SimplyHiredConfig {
    /// Enable SimplyHired job scraping
    #[serde(default)]
    pub enabled: bool,

    /// Search query (e.g., "rust developer", "software engineer")
    #[serde(default)]
    pub query: String,

    /// Location filter (e.g., "Remote", "San Francisco, CA")
    #[serde(default)]
    pub location: Option<String>,

    /// Maximum results to return (default: 50)
    #[serde(default = "super::defaults::default_scraper_limit")]
    pub limit: usize,
}

/// Glassdoor scraper configuration (v2.5.5)
///
/// Glassdoor job board with company reviews.
/// Note: Has strong Cloudflare protection, may return empty if blocked.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GlassdoorConfig {
    /// Enable Glassdoor job scraping
    #[serde(default)]
    pub enabled: bool,

    /// Search query (e.g., "software engineer", "data scientist")
    #[serde(default)]
    pub query: String,

    /// Location filter (e.g., "San Francisco, CA", "Remote")
    #[serde(default)]
    pub location: Option<String>,

    /// Maximum results to return (default: 50)
    #[serde(default = "super::defaults::default_scraper_limit")]
    pub limit: usize,
}

/// USAJobs.gov scraper configuration
///
/// Official federal government job API. Requires a free API key from:
/// https://developer.usajobs.gov/
///
/// # Security
/// The API key is stored securely in the OS keyring.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UsaJobsConfig {
    /// Enable USAJobs scraping
    #[serde(default)]
    pub enabled: bool,

    /// API key from developer.usajobs.gov - stored in OS keyring
    #[serde(skip)]
    pub api_key: String,

    /// Email used for User-Agent header (required by API)
    #[serde(default)]
    pub email: String,

    /// Search keywords (e.g., "software engineer", "data scientist")
    #[serde(default)]
    pub keywords: Option<String>,

    /// Location filter (city, state, or zip)
    #[serde(default)]
    pub location: Option<String>,

    /// Search radius in miles from location
    #[serde(default)]
    pub radius: Option<u32>,

    /// Only show remote positions
    #[serde(default)]
    pub remote_only: bool,

    /// Minimum GS pay grade (1-15)
    #[serde(default)]
    pub pay_grade_min: Option<u8>,

    /// Maximum GS pay grade (1-15)
    #[serde(default)]
    pub pay_grade_max: Option<u8>,

    /// Only show jobs posted within N days (1-60, default: 30)
    #[serde(default = "super::defaults::default_usajobs_date_posted")]
    pub date_posted_days: u8,

    /// Maximum results to return (default: 100)
    #[serde(default = "super::defaults::default_usajobs_limit")]
    pub limit: usize,
}
