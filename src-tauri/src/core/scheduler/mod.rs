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
        jobswithgpt::{JobQuery, JobsWithGptScraper},
        lever::{LeverCompany, LeverScraper},
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

        // Greenhouse scraper
        let greenhouse_companies = vec![
            // Example companies - in production, these would come from config
            GreenhouseCompany {
                id: "cloudflare".to_string(),
                name: "Cloudflare".to_string(),
                url: "https://boards.greenhouse.io/cloudflare".to_string(),
            },
        ];

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

        // Lever scraper
        let lever_companies = vec![
            // Example companies - in production, these would come from config
            LeverCompany {
                id: "netflix".to_string(),
                name: "Netflix".to_string(),
                url: "https://jobs.lever.co/netflix".to_string(),
            },
        ];

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
    use crate::core::config::{AlertConfig, LocationPreferences, SlackConfig};

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
            alerts: AlertConfig {
                slack: SlackConfig {
                    enabled: false,
                    webhook_url: "".to_string(),
                },
            },
        }
    }

    #[test]
    fn test_schedule_config_from_config() {
        let config = create_test_config();
        let schedule_config = ScheduleConfig::from(&config);

        assert_eq!(schedule_config.interval_hours, 2);
        assert!(schedule_config.enabled);
    }
}
