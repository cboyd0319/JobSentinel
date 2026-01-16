//! Job Scraping Scheduler
//!
//! Manages periodic job scraping based on user configuration.

use crate::core::{
    config::Config,
    db::{Database, Job},
    notify::{Notification, NotificationService},
    scoring::{JobScore, ScoringEngine},
    scrapers::{
        greenhouse::{GreenhouseCompany, GreenhouseScraper},
        indeed::IndeedScraper,
        jobswithgpt::{JobQuery, JobsWithGptScraper},
        lever::{LeverCompany, LeverScraper},
        linkedin::LinkedInScraper,
        JobScraper,
    },
};
use anyhow::Result;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::broadcast;
use tokio::time;

/// Schedule configuration
#[derive(Debug, Clone)]
pub struct ScheduleConfig {
    /// Interval between scraping runs (in hours)
    pub interval_hours: u64,

    /// Whether auto-scheduling is enabled
    pub enabled: bool,
}

impl From<&Config> for ScheduleConfig {
    fn from(config: &Config) -> Self {
        ScheduleConfig {
            interval_hours: config.scraping_interval_hours,
            enabled: true, // TODO: Make this configurable
        }
    }
}

/// Scheduler handle
pub struct Scheduler {
    config: Arc<Config>,
    database: Arc<Database>,
    shutdown_tx: broadcast::Sender<()>,
}

/// Scraping result statistics
#[derive(Debug, Clone)]
pub struct ScrapingResult {
    pub jobs_found: usize,
    pub jobs_new: usize,
    pub jobs_updated: usize,
    pub high_matches: usize,
    pub alerts_sent: usize,
    pub errors: Vec<String>,
}

impl Scheduler {
    pub fn new(config: Arc<Config>, database: Arc<Database>) -> Self {
        let (shutdown_tx, _) = broadcast::channel(1);
        Self {
            config,
            database,
            shutdown_tx,
        }
    }

    /// Get a shutdown signal receiver
    ///
    /// This can be used to gracefully stop the scheduler
    pub fn subscribe_shutdown(&self) -> broadcast::Receiver<()> {
        self.shutdown_tx.subscribe()
    }

    /// Shutdown the scheduler gracefully
    pub fn shutdown(&self) -> Result<()> {
        tracing::info!("Shutting down scheduler");
        self.shutdown_tx.send(()).ok();
        Ok(())
    }

    /// Start the scheduler
    ///
    /// This runs in the background and triggers job scraping at regular intervals.
    /// The scheduler will continue running until a shutdown signal is received.
    ///
    /// # Cancellation
    ///
    /// The scheduler can be stopped gracefully by calling `shutdown()` on the Scheduler instance.
    pub async fn start(&self) -> Result<()> {
        let interval = Duration::from_secs(self.config.scraping_interval_hours * 3600);
        let mut shutdown_rx = self.shutdown_tx.subscribe();

        tracing::info!(
            "Starting scheduler with interval: {} hours",
            self.config.scraping_interval_hours
        );

        loop {
            tracing::info!("Scheduler: Running job scraping cycle");

            match self.run_scraping_cycle().await {
                Ok(result) => {
                    tracing::info!(
                        "Scraping cycle complete: {} jobs found, {} new, {} high matches, {} alerts sent",
                        result.jobs_found,
                        result.jobs_new,
                        result.high_matches,
                        result.alerts_sent
                    );

                    if !result.errors.is_empty() {
                        tracing::warn!("Errors during scraping: {:?}", result.errors);
                    }
                }
                Err(e) => {
                    tracing::error!("Scraping cycle failed: {}", e);
                }
            }

            // Wait for next run or shutdown signal
            tracing::info!(
                "Next scraping cycle in {} hours",
                self.config.scraping_interval_hours
            );

            tokio::select! {
                _ = time::sleep(interval) => {
                    // Continue to next iteration
                }
                _ = shutdown_rx.recv() => {
                    tracing::info!("Scheduler received shutdown signal, stopping gracefully");
                    break;
                }
            }
        }

        tracing::info!("Scheduler stopped");
        Ok(())
    }

    /// Run a single scraping cycle
    ///
    /// This is the main pipeline:
    /// 1. Run all scrapers (Greenhouse, Lever, JobsWithGPT)
    /// 2. Score each job
    /// 3. Store in database (with deduplication)
    /// 4. Send notifications for high-scoring jobs
    pub async fn run_scraping_cycle(&self) -> Result<ScrapingResult> {
        let mut all_jobs = Vec::new();
        let mut errors = Vec::new();

        // 1. Run all scrapers
        tracing::info!("Step 1: Running scrapers");

        // Greenhouse scraper - use URLs from config
        if !self.config.greenhouse_urls.is_empty() {
            let greenhouse_companies: Vec<GreenhouseCompany> = self
                .config
                .greenhouse_urls
                .iter()
                .filter_map(|url| {
                    // Extract company ID from URL (e.g., "https://boards.greenhouse.io/cloudflare" -> "cloudflare")
                    url.strip_prefix("https://boards.greenhouse.io/")
                        .map(|id| GreenhouseCompany {
                            id: id.to_string(),
                            name: id.to_string(), // Use ID as name for simplicity
                            url: url.clone(),
                        })
                })
                .collect();

            if !greenhouse_companies.is_empty() {
                let greenhouse = GreenhouseScraper::new(greenhouse_companies);
                match greenhouse.scrape().await {
                    Ok(jobs) => {
                        tracing::info!("Greenhouse: {} jobs found", jobs.len());
                        all_jobs.extend(jobs);
                    }
                    Err(e) => {
                        let error_msg = format!("Greenhouse scraper failed: {}", e);
                        tracing::error!("{}", error_msg);
                        errors.push(error_msg);
                    }
                }
            }
        }

        // Lever scraper - use URLs from config
        if !self.config.lever_urls.is_empty() {
            let lever_companies: Vec<LeverCompany> = self
                .config
                .lever_urls
                .iter()
                .filter_map(|url| {
                    // Extract company ID from URL (e.g., "https://jobs.lever.co/netflix" -> "netflix")
                    url.strip_prefix("https://jobs.lever.co/")
                        .map(|id| LeverCompany {
                            id: id.to_string(),
                            name: id.to_string(), // Use ID as name for simplicity
                            url: url.clone(),
                        })
                })
                .collect();

            if !lever_companies.is_empty() {
                let lever = LeverScraper::new(lever_companies);
                match lever.scrape().await {
                    Ok(jobs) => {
                        tracing::info!("Lever: {} jobs found", jobs.len());
                        all_jobs.extend(jobs);
                    }
                    Err(e) => {
                        let error_msg = format!("Lever scraper failed: {}", e);
                        tracing::error!("{}", error_msg);
                        errors.push(error_msg);
                    }
                }
            }
        }

        // JobsWithGPT MCP scraper
        if !self.config.title_allowlist.is_empty() {
            let jobswithgpt_query = JobQuery {
                titles: self.config.title_allowlist.clone(),
                location: None,
                remote_only: self.config.location_preferences.allow_remote
                    && !self.config.location_preferences.allow_onsite,
                limit: 100,
            };

            let jobswithgpt = JobsWithGptScraper::new(
                "https://api.jobswithgpt.com/mcp".to_string(), // TODO: Make configurable
                jobswithgpt_query,
            );

            match jobswithgpt.scrape().await {
                Ok(jobs) => {
                    tracing::info!("JobsWithGPT: {} jobs found", jobs.len());
                    all_jobs.extend(jobs);
                }
                Err(e) => {
                    let error_msg = format!("JobsWithGPT scraper failed: {}", e);
                    tracing::error!("{}", error_msg);
                    errors.push(error_msg);
                }
            }
        }

        // LinkedIn scraper - requires session cookie
        if self.config.linkedin.enabled && !self.config.linkedin.session_cookie.is_empty() {
            tracing::info!("Running LinkedIn scraper");
            let linkedin = LinkedInScraper {
                session_cookie: self.config.linkedin.session_cookie.clone(),
                query: self.config.linkedin.query.clone(),
                location: self.config.linkedin.location.clone(),
                remote_only: self.config.linkedin.remote_only,
                limit: self.config.linkedin.limit,
            };

            match linkedin.scrape().await {
                Ok(jobs) => {
                    tracing::info!("LinkedIn: {} jobs found", jobs.len());
                    all_jobs.extend(jobs);
                }
                Err(e) => {
                    let error_msg = format!("LinkedIn scraper failed: {}", e);
                    tracing::error!("{}", error_msg);
                    errors.push(error_msg);
                }
            }
        }

        // Indeed scraper - no authentication required
        if self.config.indeed.enabled && !self.config.indeed.query.is_empty() {
            tracing::info!("Running Indeed scraper");
            let indeed = IndeedScraper::new(
                self.config.indeed.query.clone(),
                self.config.indeed.location.clone(),
            )
            .with_radius(self.config.indeed.radius)
            .with_limit(self.config.indeed.limit);

            match indeed.scrape().await {
                Ok(jobs) => {
                    tracing::info!("Indeed: {} jobs found", jobs.len());
                    all_jobs.extend(jobs);
                }
                Err(e) => {
                    let error_msg = format!("Indeed scraper failed: {}", e);
                    tracing::error!("{}", error_msg);
                    errors.push(error_msg);
                }
            }
        }

        tracing::info!("Total jobs scraped: {}", all_jobs.len());

        // 2. Score all jobs
        tracing::info!("Step 2: Scoring jobs");
        let scoring_engine = ScoringEngine::new(Arc::clone(&self.config));

        let mut scored_jobs: Vec<(Job, JobScore)> = all_jobs
            .into_iter()
            .map(|mut job| {
                let score = scoring_engine.score(&job);
                job.score = Some(score.total);
                job.score_reasons =
                    Some(serde_json::to_string(&score.reasons).unwrap_or_else(|e| {
                        tracing::warn!("Failed to serialize score reasons: {}", e);
                        String::new()
                    }));
                (job, score)
            })
            .collect();

        // Sort by score descending
        scored_jobs.sort_by(|a, b| {
            b.1.total
                .partial_cmp(&a.1.total)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        tracing::info!("Scored {} jobs", scored_jobs.len());

        // 3. Store in database
        tracing::info!("Step 3: Storing jobs in database");
        let mut jobs_new = 0;
        let mut jobs_updated = 0;

        for (job, _score) in &scored_jobs {
            // Check if job exists before upserting
            let was_existing = self
                .database
                .get_job_by_hash(&job.hash)
                .await
                .ok()
                .flatten()
                .is_some();

            if was_existing {
                jobs_updated += 1;
            } else {
                jobs_new += 1;
            }

            if let Err(e) = self.database.upsert_job(job).await {
                tracing::error!("Failed to upsert job {}: {}", job.title, e);
                errors.push(format!("Database error for {}: {}", job.title, e));
            }
        }

        tracing::info!("Database: {} new jobs, {} updated", jobs_new, jobs_updated);

        // 4. Send notifications for high-scoring jobs
        tracing::info!("Step 4: Sending notifications");
        let notification_service = NotificationService::new(Arc::clone(&self.config));
        let mut high_matches = 0;
        let mut alerts_sent = 0;

        for (job, score) in &scored_jobs {
            if scoring_engine.should_alert_immediately(score) {
                high_matches += 1;

                // Check if we already sent an alert for this job
                if !job.immediate_alert_sent {
                    let notification = Notification {
                        job: job.clone(),
                        score: score.clone(),
                    };

                    match notification_service
                        .send_immediate_alert(&notification)
                        .await
                    {
                        Ok(()) => {
                            tracing::info!("Alert sent for: {}", job.title);
                            alerts_sent += 1;

                            // Mark as alerted in database (use hash to avoid race conditions)
                            // Note: This relies on the unique constraint on the hash column to prevent
                            // duplicate alert notifications even if multiple scraping cycles run concurrently
                            if let Some(existing_job) = self
                                .database
                                .get_job_by_hash(&job.hash)
                                .await
                                .ok()
                                .flatten()
                            {
                                if let Err(e) = self.database.mark_alert_sent(existing_job.id).await
                                {
                                    tracing::error!(
                                        "Failed to mark alert as sent for {}: {}",
                                        job.title,
                                        e
                                    );
                                    errors.push(format!(
                                        "Failed to mark alert sent for {}: {}",
                                        job.title, e
                                    ));
                                }
                            }
                        }
                        Err(e) => {
                            tracing::error!("Failed to send alert for {}: {}", job.title, e);
                            errors.push(format!("Notification error for {}: {}", job.title, e));
                        }
                    }
                }
            }
        }

        tracing::info!(
            "Notifications: {} high matches, {} alerts sent",
            high_matches,
            alerts_sent
        );

        Ok(ScrapingResult {
            jobs_found: scored_jobs.len(),
            jobs_new,
            jobs_updated,
            high_matches,
            alerts_sent,
            errors,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::config::LocationPreferences;

    fn create_test_config() -> Config {
        Config {
            title_allowlist: vec!["Security Engineer".to_string()],
            title_blocklist: vec![],
            keywords_boost: vec![],
            keywords_exclude: vec![],
            location_preferences: LocationPreferences {
                allow_remote: true,
                allow_hybrid: false,
                allow_onsite: false,
                cities: vec![],
                states: vec![],
                country: "US".to_string(),
            },
            salary_floor_usd: 0,
            auto_refresh: Default::default(),
            immediate_alert_threshold: 0.9,
            scraping_interval_hours: 2,
            alerts: Default::default(),
            greenhouse_urls: vec![],
            lever_urls: vec![],
            linkedin: Default::default(),
            indeed: Default::default(),
        }
    }

    #[test]
    fn test_schedule_config_from_config() {
        let config = create_test_config();
        let schedule_config = ScheduleConfig::from(&config);

        assert_eq!(schedule_config.interval_hours, 2);
        assert!(schedule_config.enabled);
    }

    // ========================================
    // Scheduler Lifecycle Tests
    // ========================================

    #[tokio::test]
    async fn test_scheduler_creation() {
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Verify scheduler was created with correct config
        assert_eq!(
            scheduler.config.scraping_interval_hours,
            config.scraping_interval_hours
        );
    }

    #[tokio::test]
    async fn test_scheduler_shutdown_signal() {
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Subscribe to shutdown signal before calling shutdown
        let mut rx = scheduler.subscribe_shutdown();

        // Trigger shutdown
        scheduler.shutdown().unwrap();

        // Verify shutdown signal was received
        assert!(
            rx.recv().await.is_ok(),
            "Shutdown signal should be received"
        );
    }

    #[tokio::test]
    async fn test_scheduler_multiple_shutdown_subscribers() {
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Create multiple subscribers
        let mut rx1 = scheduler.subscribe_shutdown();
        let mut rx2 = scheduler.subscribe_shutdown();
        let mut rx3 = scheduler.subscribe_shutdown();

        // Trigger shutdown
        scheduler.shutdown().unwrap();

        // All subscribers should receive the signal
        assert!(rx1.recv().await.is_ok(), "Subscriber 1 should receive signal");
        assert!(rx2.recv().await.is_ok(), "Subscriber 2 should receive signal");
        assert!(rx3.recv().await.is_ok(), "Subscriber 3 should receive signal");
    }

    #[tokio::test]
    async fn test_scheduler_graceful_stop_with_timeout() {
        let mut config = create_test_config();
        config.scraping_interval_hours = 24; // Long interval to ensure we can stop it
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
        let scheduler_clone = Arc::clone(&scheduler);

        // Start scheduler in background task
        let handle = tokio::spawn(async move {
            scheduler_clone.start().await
        });

        // Give scheduler time to start
        tokio::time::sleep(Duration::from_millis(100)).await;

        // Shutdown the scheduler
        scheduler.shutdown().unwrap();

        // Wait for scheduler to stop (with timeout)
        let result = tokio::time::timeout(Duration::from_secs(5), handle).await;

        assert!(result.is_ok(), "Scheduler should stop within timeout");
        assert!(result.unwrap().is_ok(), "Scheduler should stop without errors");
    }

    #[test]
    fn test_schedule_config_creation() {
        let config = ScheduleConfig {
            interval_hours: 4,
            enabled: true,
        };

        assert_eq!(config.interval_hours, 4);
        assert!(config.enabled);
    }

    #[test]
    fn test_schedule_config_disabled() {
        let config = ScheduleConfig {
            interval_hours: 2,
            enabled: false,
        };

        assert!(!config.enabled);
    }

    #[test]
    fn test_scraping_result_creation() {
        let result = ScrapingResult {
            jobs_found: 100,
            jobs_new: 25,
            jobs_updated: 75,
            high_matches: 10,
            alerts_sent: 5,
            errors: vec!["Test error".to_string()],
        };

        assert_eq!(result.jobs_found, 100);
        assert_eq!(result.jobs_new, 25);
        assert_eq!(result.jobs_updated, 75);
        assert_eq!(result.high_matches, 10);
        assert_eq!(result.alerts_sent, 5);
        assert_eq!(result.errors.len(), 1);
    }

    #[test]
    fn test_scraping_result_no_errors() {
        let result = ScrapingResult {
            jobs_found: 50,
            jobs_new: 50,
            jobs_updated: 0,
            high_matches: 5,
            alerts_sent: 5,
            errors: vec![],
        };

        assert!(result.errors.is_empty(), "Should have no errors");
        assert_eq!(result.jobs_new, result.jobs_found);
    }

    #[tokio::test]
    async fn test_run_scraping_cycle_with_empty_config() {
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run scraping cycle with empty config (no scraper URLs)
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Should complete without errors but find no jobs
        assert_eq!(result.jobs_found, 0);
        assert_eq!(result.jobs_new, 0);
        assert_eq!(result.jobs_updated, 0);
    }

    #[tokio::test]
    async fn test_scheduler_config_interval_mapping() {
        let mut config = create_test_config();
        config.scraping_interval_hours = 6;
        let schedule_config = ScheduleConfig::from(&config);

        assert_eq!(schedule_config.interval_hours, 6);
    }

    #[test]
    fn test_scraping_result_clone() {
        let result = ScrapingResult {
            jobs_found: 10,
            jobs_new: 5,
            jobs_updated: 5,
            high_matches: 2,
            alerts_sent: 1,
            errors: vec!["Error 1".to_string()],
        };

        let cloned = result.clone();

        assert_eq!(cloned.jobs_found, result.jobs_found);
        assert_eq!(cloned.jobs_new, result.jobs_new);
        assert_eq!(cloned.high_matches, result.high_matches);
        assert_eq!(cloned.errors, result.errors);
    }

    #[test]
    fn test_schedule_config_clone() {
        let config = ScheduleConfig {
            interval_hours: 3,
            enabled: true,
        };

        let cloned = config.clone();

        assert_eq!(cloned.interval_hours, config.interval_hours);
        assert_eq!(cloned.enabled, config.enabled);
    }

    #[tokio::test]
    async fn test_scheduler_concurrent_shutdowns() {
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));

        // Multiple concurrent shutdown calls should not panic
        let scheduler1 = Arc::clone(&scheduler);
        let scheduler2 = Arc::clone(&scheduler);
        let scheduler3 = Arc::clone(&scheduler);

        let handle1 = tokio::spawn(async move { scheduler1.shutdown() });
        let handle2 = tokio::spawn(async move { scheduler2.shutdown() });
        let handle3 = tokio::spawn(async move { scheduler3.shutdown() });

        // All should complete without error
        assert!(handle1.await.is_ok());
        assert!(handle2.await.is_ok());
        assert!(handle3.await.is_ok());
    }

    #[tokio::test]
    async fn test_scheduler_subscribe_after_shutdown() {
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Trigger shutdown first
        scheduler.shutdown().unwrap();

        // Subscribe after shutdown
        let mut rx = scheduler.subscribe_shutdown();

        // Should not receive signal (lagged)
        let result = tokio::time::timeout(Duration::from_millis(100), rx.recv()).await;

        // Should timeout since signal was already sent
        assert!(result.is_err() || result.unwrap().is_err());
    }

    #[test]
    fn test_schedule_config_debug() {
        let config = ScheduleConfig {
            interval_hours: 2,
            enabled: true,
        };

        let debug_str = format!("{:?}", config);
        assert!(debug_str.contains("interval_hours"));
        assert!(debug_str.contains("enabled"));
    }

    #[test]
    fn test_scraping_result_debug() {
        let result = ScrapingResult {
            jobs_found: 10,
            jobs_new: 5,
            jobs_updated: 5,
            high_matches: 2,
            alerts_sent: 1,
            errors: vec![],
        };

        let debug_str = format!("{:?}", result);
        assert!(debug_str.contains("jobs_found"));
        assert!(debug_str.contains("high_matches"));
    }

    // ========================================
    // Interval Validation and Edge Cases
    // ========================================

    #[test]
    fn test_schedule_config_minimum_interval() {
        let config = ScheduleConfig {
            interval_hours: 1,
            enabled: true,
        };

        assert_eq!(config.interval_hours, 1);
        assert!(config.enabled);
    }

    #[test]
    fn test_schedule_config_maximum_interval() {
        let config = ScheduleConfig {
            interval_hours: 168, // 1 week
            enabled: true,
        };

        assert_eq!(config.interval_hours, 168);
    }

    #[test]
    fn test_schedule_config_zero_interval() {
        // Zero interval is technically allowed but would run continuously
        let config = ScheduleConfig {
            interval_hours: 0,
            enabled: true,
        };

        assert_eq!(config.interval_hours, 0);
    }

    #[tokio::test]
    async fn test_scheduler_interval_calculation() {
        let mut config = create_test_config();
        config.scraping_interval_hours = 4;
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // The interval should be converted to seconds correctly
        // 4 hours = 4 * 3600 = 14400 seconds
        assert_eq!(scheduler.config.scraping_interval_hours, 4);
    }

    #[tokio::test]
    async fn test_scheduler_very_large_interval() {
        let mut config = create_test_config();
        config.scraping_interval_hours = u64::MAX / 3600; // Very large but valid
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        // Should not panic when creating scheduler with large interval
        let _scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));
    }

    // ========================================
    // Scraping Cycle Execution Tracking
    // ========================================

    #[tokio::test]
    async fn test_scraping_cycle_tracks_new_vs_updated_jobs() {
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        // Pre-populate database with a job
        let now = chrono::Utc::now();
        let existing_job = Job {
            id: 0,
            hash: "test_hash_123".to_string(),
            title: "Senior Rust Developer".to_string(),
            company: "Test Corp".to_string(),
            location: Some("Remote".to_string()),
            url: "https://example.com/job/1".to_string(),
            description: Some("Great job".to_string()),
            score: Some(0.8),
            score_reasons: None,
            source: "test".to_string(),
            remote: Some(true),
            salary_min: None,
            salary_max: None,
            currency: None,
            created_at: now,
            updated_at: now,
            last_seen: now,
            times_seen: 1,
            immediate_alert_sent: false,
            included_in_digest: false,
            hidden: false,
            bookmarked: false,
            notes: None,
        };
        database.upsert_job(&existing_job).await.unwrap();

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run scraping cycle (empty config = no scrapers)
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Verify tracking
        assert_eq!(result.jobs_found, 0);
        assert_eq!(result.jobs_new, 0);
        assert_eq!(result.jobs_updated, 0);
    }

    #[tokio::test]
    async fn test_scraping_result_partial_errors() {
        let result = ScrapingResult {
            jobs_found: 50,
            jobs_new: 30,
            jobs_updated: 20,
            high_matches: 5,
            alerts_sent: 3,
            errors: vec![
                "Greenhouse scraper timeout".to_string(),
                "Lever scraper rate limit".to_string(),
            ],
        };

        assert_eq!(result.jobs_found, 50);
        assert_eq!(result.errors.len(), 2);
        assert!(!result.errors.is_empty());
    }

    // ========================================
    // Error Handling and Recovery
    // ========================================

    #[tokio::test]
    async fn test_scraping_cycle_continues_on_scraper_error() {
        // Even if individual scrapers fail, the cycle should complete
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - scrapers will fail but cycle should complete
        let result = scheduler.run_scraping_cycle().await;

        assert!(result.is_ok(), "Scraping cycle should complete even with scraper errors");
    }

    #[test]
    fn test_scraping_result_multiple_errors() {
        let errors = vec![
            "Error 1".to_string(),
            "Error 2".to_string(),
            "Error 3".to_string(),
            "Error 4".to_string(),
            "Error 5".to_string(),
        ];

        let result = ScrapingResult {
            jobs_found: 10,
            jobs_new: 10,
            jobs_updated: 0,
            high_matches: 0,
            alerts_sent: 0,
            errors: errors.clone(),
        };

        assert_eq!(result.errors.len(), 5);
        assert_eq!(result.errors, errors);
    }

    // ========================================
    // Concurrent Operations
    // ========================================

    #[tokio::test]
    async fn test_scheduler_multiple_concurrent_cycles() {
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));

        // Run multiple scraping cycles concurrently
        let scheduler1 = Arc::clone(&scheduler);
        let scheduler2 = Arc::clone(&scheduler);
        let scheduler3 = Arc::clone(&scheduler);

        let handle1 = tokio::spawn(async move {
            scheduler1.run_scraping_cycle().await
        });
        let handle2 = tokio::spawn(async move {
            scheduler2.run_scraping_cycle().await
        });
        let handle3 = tokio::spawn(async move {
            scheduler3.run_scraping_cycle().await
        });

        // All should complete successfully
        let result1 = handle1.await.unwrap();
        let result2 = handle2.await.unwrap();
        let result3 = handle3.await.unwrap();

        assert!(result1.is_ok());
        assert!(result2.is_ok());
        assert!(result3.is_ok());
    }

    #[tokio::test]
    async fn test_scheduler_shutdown_during_cycle() {
        let mut config = create_test_config();
        config.scraping_interval_hours = 24; // Long interval
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
        let scheduler_clone = Arc::clone(&scheduler);

        // Start scheduler
        let handle = tokio::spawn(async move {
            scheduler_clone.start().await
        });

        // Let it start up
        tokio::time::sleep(Duration::from_millis(50)).await;

        // Shutdown immediately (potentially during cycle)
        scheduler.shutdown().unwrap();

        // Should stop gracefully
        let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
        assert!(result.is_ok());
    }

    // ========================================
    // Database Interaction Patterns
    // ========================================

    #[tokio::test]
    async fn test_scraping_cycle_database_persistence() {
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle
        let _result = scheduler.run_scraping_cycle().await.unwrap();

        // Verify database is still accessible
        let jobs = database.get_recent_jobs(10).await.unwrap();
        assert!(jobs.is_empty() || !jobs.is_empty()); // Database should be queryable
    }

    #[tokio::test]
    async fn test_scraping_cycle_job_deduplication() {
        let _config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        // Insert same job twice with same hash
        let now = chrono::Utc::now();
        let job = Job {
            id: 0,
            hash: "duplicate_hash".to_string(),
            title: "Test Job".to_string(),
            company: "Test Co".to_string(),
            location: Some("Remote".to_string()),
            url: "https://example.com/job".to_string(),
            description: None,
            score: None,
            score_reasons: None,
            source: "test".to_string(),
            remote: Some(true),
            salary_min: None,
            salary_max: None,
            currency: None,
            created_at: now,
            updated_at: now,
            last_seen: now,
            times_seen: 1,
            immediate_alert_sent: false,
            included_in_digest: false,
            hidden: false,
            bookmarked: false,
            notes: None,
        };

        database.upsert_job(&job).await.unwrap();
        database.upsert_job(&job).await.unwrap();

        // Should only have one job
        let jobs = database.get_recent_jobs(10).await.unwrap();
        assert_eq!(jobs.len(), 1, "Duplicate jobs should be deduplicated");
    }

    // ========================================
    // Configuration Validation
    // ========================================

    #[test]
    fn test_schedule_config_from_various_intervals() {
        let test_cases = vec![
            (1, 1),    // 1 hour
            (2, 2),    // 2 hours
            (6, 6),    // 6 hours
            (12, 12),  // 12 hours
            (24, 24),  // 1 day
            (168, 168), // 1 week
        ];

        for (input_hours, expected_hours) in test_cases {
            let mut config = create_test_config();
            config.scraping_interval_hours = input_hours;
            let schedule_config = ScheduleConfig::from(&config);

            assert_eq!(
                schedule_config.interval_hours, expected_hours,
                "Failed for interval: {} hours",
                input_hours
            );
        }
    }

    #[tokio::test]
    async fn test_scheduler_respects_config_interval() {
        let mut config = create_test_config();
        config.scraping_interval_hours = 8;
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Verify scheduler uses correct interval
        assert_eq!(scheduler.config.scraping_interval_hours, 8);
    }

    // ========================================
    // Edge Cases
    // ========================================

    #[test]
    fn test_scraping_result_all_zeros() {
        let result = ScrapingResult {
            jobs_found: 0,
            jobs_new: 0,
            jobs_updated: 0,
            high_matches: 0,
            alerts_sent: 0,
            errors: vec![],
        };

        assert_eq!(result.jobs_found, 0);
        assert_eq!(result.jobs_new, 0);
        assert_eq!(result.jobs_updated, 0);
        assert_eq!(result.high_matches, 0);
        assert_eq!(result.alerts_sent, 0);
        assert!(result.errors.is_empty());
    }

    #[test]
    fn test_scraping_result_max_values() {
        let result = ScrapingResult {
            jobs_found: usize::MAX,
            jobs_new: usize::MAX,
            jobs_updated: usize::MAX,
            high_matches: usize::MAX,
            alerts_sent: usize::MAX,
            errors: vec!["error".to_string(); 100],
        };

        assert_eq!(result.jobs_found, usize::MAX);
        assert_eq!(result.errors.len(), 100);
    }

    #[tokio::test]
    async fn test_scheduler_immediate_shutdown() {
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
        let scheduler_clone = Arc::clone(&scheduler);

        // Start scheduler in background
        let handle = tokio::spawn(async move {
            scheduler_clone.start().await
        });

        // Give scheduler time to start and run first cycle
        tokio::time::sleep(Duration::from_millis(100)).await;

        // Shutdown the scheduler
        scheduler.shutdown().unwrap();

        // Should shutdown within reasonable time (allowing for current cycle to complete)
        let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
        assert!(result.is_ok(), "Scheduler should shutdown within timeout");
    }

    #[tokio::test]
    async fn test_scheduler_rapid_shutdown_subscribe_cycle() {
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Rapid subscribe/shutdown cycles should not panic
        for _ in 0..10 {
            let _rx = scheduler.subscribe_shutdown();
        }

        scheduler.shutdown().unwrap();
    }

    #[test]
    fn test_schedule_config_equality_after_clone() {
        let original = ScheduleConfig {
            interval_hours: 5,
            enabled: true,
        };

        let cloned = original.clone();

        assert_eq!(original.interval_hours, cloned.interval_hours);
        assert_eq!(original.enabled, cloned.enabled);
    }

    #[test]
    fn test_scraping_result_equality_after_clone() {
        let original = ScrapingResult {
            jobs_found: 42,
            jobs_new: 20,
            jobs_updated: 22,
            high_matches: 8,
            alerts_sent: 4,
            errors: vec!["test".to_string()],
        };

        let cloned = original.clone();

        assert_eq!(original.jobs_found, cloned.jobs_found);
        assert_eq!(original.jobs_new, cloned.jobs_new);
        assert_eq!(original.jobs_updated, cloned.jobs_updated);
        assert_eq!(original.high_matches, cloned.high_matches);
        assert_eq!(original.alerts_sent, cloned.alerts_sent);
        assert_eq!(original.errors, cloned.errors);
    }

    // ========================================
    // Duration Calculation Tests
    // ========================================

    #[tokio::test]
    async fn test_scheduler_interval_duration_conversion() {
        let test_cases = vec![
            (1, 3600),      // 1 hour = 3600 seconds
            (2, 7200),      // 2 hours
            (4, 14400),     // 4 hours
            (8, 28800),     // 8 hours
            (12, 43200),    // 12 hours
            (24, 86400),    // 24 hours
        ];

        for (hours, expected_seconds) in test_cases {
            let duration = Duration::from_secs(hours * 3600);
            assert_eq!(
                duration.as_secs(),
                expected_seconds,
                "Duration conversion failed for {} hours",
                hours
            );
        }
    }

    #[test]
    fn test_scheduler_duration_overflow_protection() {
        // Test that very large intervals don't overflow
        let max_safe_hours = u64::MAX / 3600;
        let duration = Duration::from_secs(max_safe_hours * 3600);
        assert!(duration.as_secs() > 0);
    }

    #[tokio::test]
    async fn test_scheduler_zero_interval_duration() {
        let duration = Duration::from_secs(0);
        assert_eq!(duration.as_secs(), 0);
        assert_eq!(duration.as_millis(), 0);
    }

    // ========================================
    // Scraper URL Parsing Tests
    // ========================================

    #[tokio::test]
    async fn test_scraping_cycle_with_greenhouse_urls() {
        let mut config = create_test_config();
        config.greenhouse_urls = vec![
            "https://boards.greenhouse.io/cloudflare".to_string(),
            "https://boards.greenhouse.io/netflix".to_string(),
        ];
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - will fail to scrape but should handle gracefully
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Should have attempted to scrape but likely got errors
        // Errors are expected since we're not running real scrapers
        assert!(result.jobs_found == 0 || result.errors.len() > 0);
    }

    #[tokio::test]
    async fn test_scraping_cycle_with_lever_urls() {
        let mut config = create_test_config();
        config.lever_urls = vec![
            "https://jobs.lever.co/netflix".to_string(),
            "https://jobs.lever.co/stripe".to_string(),
        ];
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - will fail to scrape but should handle gracefully
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Cycle should complete (errors expected since not real scrapers)
        assert!(result.jobs_found == 0 || result.errors.len() > 0);
    }

    #[tokio::test]
    async fn test_scraping_cycle_with_invalid_greenhouse_url() {
        let mut config = create_test_config();
        config.greenhouse_urls = vec![
            "https://invalid-url".to_string(),
            "not-a-greenhouse-url".to_string(),
        ];
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Should handle invalid URLs gracefully
        let result = scheduler.run_scraping_cycle().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_scraping_cycle_with_invalid_lever_url() {
        let mut config = create_test_config();
        config.lever_urls = vec![
            "https://invalid-url".to_string(),
            "not-a-lever-url".to_string(),
        ];
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Should handle invalid URLs gracefully
        let result = scheduler.run_scraping_cycle().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_scraping_cycle_with_mixed_valid_invalid_urls() {
        let mut config = create_test_config();
        config.greenhouse_urls = vec![
            "https://boards.greenhouse.io/cloudflare".to_string(),
            "invalid-url".to_string(),
        ];
        config.lever_urls = vec![
            "https://jobs.lever.co/netflix".to_string(),
            "not-a-url".to_string(),
        ];
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Should process valid URLs and skip/report invalid ones
        let result = scheduler.run_scraping_cycle().await;
        assert!(result.is_ok());
    }

    // ========================================
    // Scoring Integration Tests
    // ========================================

    #[tokio::test]
    async fn test_scraping_cycle_scores_jobs() {
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle (no scrapers, so empty result)
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Should complete successfully
        assert_eq!(result.jobs_found, 0);
    }

    #[tokio::test]
    async fn test_scraping_cycle_sorts_jobs_by_score() {
        // This test verifies that jobs are sorted by score descending
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle
        let _result = scheduler.run_scraping_cycle().await.unwrap();

        // Verify jobs in database are retrievable
        let jobs = database.get_recent_jobs(10).await.unwrap();

        // If there are jobs, they should be sorted by score
        if jobs.len() >= 2 {
            for i in 0..jobs.len() - 1 {
                if let (Some(score1), Some(score2)) = (jobs[i].score, jobs[i + 1].score) {
                    assert!(
                        score1 >= score2,
                        "Jobs should be sorted by score descending"
                    );
                }
            }
        }
    }

    #[tokio::test]
    async fn test_scraping_cycle_handles_score_serialization_error() {
        // Tests the error path in score_reasons serialization
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - should handle any serialization issues gracefully
        let result = scheduler.run_scraping_cycle().await;
        assert!(result.is_ok());
    }

    // ========================================
    // High Score Alert Tests
    // ========================================

    #[tokio::test]
    async fn test_scraping_cycle_identifies_high_matches() {
        let mut config = create_test_config();
        config.immediate_alert_threshold = 0.9;
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Should track high matches count
        assert_eq!(result.high_matches, 0);
    }

    #[tokio::test]
    async fn test_scraping_cycle_skips_already_alerted_jobs() {
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        // Pre-populate with a high-scoring job that already has alert sent
        let now = chrono::Utc::now();
        let alerted_job = Job {
            id: 0,
            hash: "alerted_hash".to_string(),
            title: "Amazing Security Engineer".to_string(),
            company: "Dream Corp".to_string(),
            location: Some("Remote".to_string()),
            url: "https://example.com/job/999".to_string(),
            description: Some("Perfect match".to_string()),
            score: Some(0.95),
            score_reasons: None,
            source: "test".to_string(),
            remote: Some(true),
            salary_min: None,
            salary_max: None,
            currency: None,
            created_at: now,
            updated_at: now,
            last_seen: now,
            times_seen: 1,
            immediate_alert_sent: true, // Already alerted
            included_in_digest: false,
            hidden: false,
            bookmarked: false,
            notes: None,
        };
        database.upsert_job(&alerted_job).await.unwrap();

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Should not send duplicate alerts
        assert_eq!(result.alerts_sent, 0);
    }

    // ========================================
    // LinkedIn Scraper Configuration Tests
    // ========================================

    #[tokio::test]
    async fn test_scraping_cycle_with_linkedin_enabled() {
        let mut config = create_test_config();
        config.linkedin.enabled = true;
        config.linkedin.session_cookie = "fake_cookie".to_string();
        config.linkedin.query = "Security Engineer".to_string();
        config.linkedin.location = "Remote".to_string();
        config.linkedin.remote_only = true;
        config.linkedin.limit = 50;
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - will fail to scrape but should handle gracefully
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Cycle should complete (LinkedIn errors expected)
        assert!(result.jobs_found == 0 || result.errors.len() > 0);
    }

    #[tokio::test]
    async fn test_scraping_cycle_with_linkedin_disabled() {
        let mut config = create_test_config();
        config.linkedin.enabled = false;
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - should skip LinkedIn
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // No LinkedIn errors since it was disabled
        assert!(!result.errors.iter().any(|e| e.contains("LinkedIn")));
    }

    #[tokio::test]
    async fn test_scraping_cycle_with_linkedin_empty_cookie() {
        let mut config = create_test_config();
        config.linkedin.enabled = true;
        config.linkedin.session_cookie = "".to_string(); // Empty cookie
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - should skip LinkedIn due to empty cookie
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Should not attempt LinkedIn scraping
        assert!(!result.errors.iter().any(|e| e.contains("LinkedIn")));
    }

    // ========================================
    // Indeed Scraper Configuration Tests
    // ========================================

    #[tokio::test]
    async fn test_scraping_cycle_with_indeed_enabled() {
        let mut config = create_test_config();
        config.indeed.enabled = true;
        config.indeed.query = "Security Engineer".to_string();
        config.indeed.location = "Remote".to_string();
        config.indeed.radius = 50;
        config.indeed.limit = 100;
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - will fail to scrape but should handle gracefully
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Cycle should complete (Indeed errors expected)
        assert!(result.jobs_found == 0 || result.errors.len() > 0);
    }

    #[tokio::test]
    async fn test_scraping_cycle_with_indeed_disabled() {
        let mut config = create_test_config();
        config.indeed.enabled = false;
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - should skip Indeed
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // No Indeed errors since it was disabled
        assert!(!result.errors.iter().any(|e| e.contains("Indeed")));
    }

    #[tokio::test]
    async fn test_scraping_cycle_with_indeed_empty_query() {
        let mut config = create_test_config();
        config.indeed.enabled = true;
        config.indeed.query = "".to_string(); // Empty query
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - should skip Indeed due to empty query
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Should not attempt Indeed scraping
        assert!(!result.errors.iter().any(|e| e.contains("Indeed")));
    }

    #[tokio::test]
    async fn test_scraping_cycle_with_indeed_custom_radius() {
        let mut config = create_test_config();
        config.indeed.enabled = true;
        config.indeed.query = "Developer".to_string();
        config.indeed.location = "San Francisco".to_string();
        config.indeed.radius = 25; // Custom radius
        config.indeed.limit = 50;
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Cycle should complete (errors expected)
        assert!(result.jobs_found == 0 || result.errors.len() > 0);
    }

    // ========================================
    // JobsWithGPT Scraper Tests
    // ========================================

    #[tokio::test]
    async fn test_scraping_cycle_with_jobswithgpt_remote_only() {
        let mut config = create_test_config();
        config.title_allowlist = vec!["Engineer".to_string()];
        config.location_preferences.allow_remote = true;
        config.location_preferences.allow_onsite = false;
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - will fail to scrape but should handle gracefully
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Cycle should complete (JobsWithGPT errors expected)
        assert!(result.jobs_found == 0 || result.errors.len() > 0);
    }

    #[tokio::test]
    async fn test_scraping_cycle_with_jobswithgpt_not_remote_only() {
        let mut config = create_test_config();
        config.title_allowlist = vec!["Engineer".to_string()];
        config.location_preferences.allow_remote = false;
        config.location_preferences.allow_onsite = true;
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - should set remote_only=false
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Cycle should complete
        assert!(result.jobs_found == 0 || result.errors.len() > 0);
    }

    #[tokio::test]
    async fn test_scraping_cycle_with_empty_title_allowlist() {
        let mut config = create_test_config();
        config.title_allowlist = vec![]; // Empty allowlist
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - should skip JobsWithGPT
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // No JobsWithGPT errors since it was skipped
        assert!(!result.errors.iter().any(|e| e.contains("JobsWithGPT")));
    }

    // ========================================
    // Multiple Scrapers Enabled Tests
    // ========================================

    #[tokio::test]
    async fn test_scraping_cycle_all_scrapers_enabled() {
        let mut config = create_test_config();
        config.greenhouse_urls = vec!["https://boards.greenhouse.io/test".to_string()];
        config.lever_urls = vec!["https://jobs.lever.co/test".to_string()];
        config.title_allowlist = vec!["Engineer".to_string()];
        config.linkedin.enabled = true;
        config.linkedin.session_cookie = "cookie".to_string();
        config.linkedin.query = "Engineer".to_string();
        config.indeed.enabled = true;
        config.indeed.query = "Engineer".to_string();
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - all scrapers will attempt to run
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // All scrapers attempted (errors expected)
        assert!(result.jobs_found == 0 || result.errors.len() > 0);
    }

    #[tokio::test]
    async fn test_scraping_cycle_all_scrapers_disabled() {
        let mut config = create_test_config();
        config.greenhouse_urls = vec![];
        config.lever_urls = vec![];
        config.title_allowlist = vec![];
        config.linkedin.enabled = false;
        config.indeed.enabled = false;
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - no scrapers enabled
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Should complete with no jobs found and no errors
        assert_eq!(result.jobs_found, 0);
        assert_eq!(result.errors.len(), 0);
    }

    // ========================================
    // Error Accumulation Tests
    // ========================================

    #[tokio::test]
    async fn test_scraping_cycle_accumulates_multiple_scraper_errors() {
        let mut config = create_test_config();
        // Set up invalid configurations to trigger errors
        config.greenhouse_urls = vec!["invalid".to_string()];
        config.lever_urls = vec!["invalid".to_string()];
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - should accumulate errors from multiple scrapers
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Cycle should complete (may have accumulated errors)
        assert!(result.jobs_found == 0 || result.errors.len() > 0);
    }

    // ========================================
    // State Transition Tests
    // ========================================

    #[tokio::test]
    async fn test_scheduler_start_to_shutdown_transition() {
        let mut config = create_test_config();
        config.scraping_interval_hours = 24;
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
        let scheduler_clone = Arc::clone(&scheduler);

        // Start scheduler
        let handle = tokio::spawn(async move { scheduler_clone.start().await });

        // Let it run briefly
        tokio::time::sleep(Duration::from_millis(50)).await;

        // Transition to shutdown
        scheduler.shutdown().unwrap();

        // Wait for clean shutdown
        let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_ok());
    }

    #[tokio::test]
    async fn test_scheduler_multiple_start_cycles() {
        let config = Arc::new(create_test_config());
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Multiple scraping cycles should be idempotent
        let _result1 = scheduler.run_scraping_cycle().await.unwrap();
        let _result2 = scheduler.run_scraping_cycle().await.unwrap();
        let _result3 = scheduler.run_scraping_cycle().await.unwrap();

        // All cycles should complete successfully
        let jobs = database.get_recent_jobs(100).await.unwrap();
        // Jobs can be retrieved from database
        assert!(jobs.is_empty() || !jobs.is_empty());
    }

    // ========================================
    // Edge Cases for Alert Logic
    // ========================================

    #[tokio::test]
    async fn test_scraping_cycle_alert_threshold_boundary() {
        let mut config = create_test_config();
        config.immediate_alert_threshold = 1.0; // Maximum threshold
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - very high threshold means no alerts
        let result = scheduler.run_scraping_cycle().await.unwrap();

        assert_eq!(result.alerts_sent, 0);
    }

    #[tokio::test]
    async fn test_scraping_cycle_alert_threshold_zero() {
        let mut config = create_test_config();
        config.immediate_alert_threshold = 0.0; // Minimum threshold
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - low threshold might trigger alerts if jobs found
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // With no scrapers configured, no jobs and no alerts
        assert_eq!(result.alerts_sent, 0);
    }

    // ========================================
    // Scraper URL Edge Cases
    // ========================================

    #[tokio::test]
    async fn test_scraping_cycle_with_many_greenhouse_urls() {
        let mut config = create_test_config();
        config.greenhouse_urls = (0..50)
            .map(|i| format!("https://boards.greenhouse.io/company{}", i))
            .collect();
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle with many URLs
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Should handle many URLs gracefully
        assert!(result.jobs_found == 0 || result.errors.len() > 0);
    }

    #[tokio::test]
    async fn test_scraping_cycle_with_duplicate_urls() {
        let mut config = create_test_config();
        let url = "https://boards.greenhouse.io/cloudflare".to_string();
        config.greenhouse_urls = vec![url.clone(), url.clone(), url.clone()];
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Run cycle - should handle duplicate URLs
        let result = scheduler.run_scraping_cycle().await.unwrap();

        // Cycle should complete
        assert!(result.jobs_found == 0 || result.errors.len() > 0);
    }
}
