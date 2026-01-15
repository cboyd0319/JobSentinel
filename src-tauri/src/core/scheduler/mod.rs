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
}
