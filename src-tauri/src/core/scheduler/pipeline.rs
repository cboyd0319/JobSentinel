//! Main scraping pipeline orchestration

use anyhow::Result;

use super::types::{Scheduler, ScrapingResult};
use super::workers::{persist_and_notify, run_scrapers, score_jobs};

impl Scheduler {
    /// Run a single scraping cycle
    ///
    /// This is the main pipeline:
    /// 1. Run all scrapers (Greenhouse, Lever, JobsWithGPT)
    /// 2. Score each job
    /// 3. Store in database (with deduplication)
    /// 4. Send notifications for high-scoring jobs
    #[tracing::instrument(skip(self))]
    pub async fn run_scraping_cycle(&self) -> Result<ScrapingResult> {
        tracing::info!("Starting full scraping cycle");

        // 1. Run all scrapers
        tracing::info!("Pipeline stage 1/3: Running scrapers");
        let (all_jobs, mut errors) = run_scrapers(&self.config).await;
        tracing::info!("Scrapers completed: {} total jobs fetched", all_jobs.len());

        // 2. Score all jobs and run ghost detection
        tracing::info!("Pipeline stage 2/3: Scoring jobs and detecting ghost postings");
        let scored_jobs = score_jobs(all_jobs, &self.config, &self.database).await;
        tracing::info!("Scoring completed: {} jobs scored", scored_jobs.len());

        // 3. Store in database and send notifications
        tracing::info!("Pipeline stage 3/3: Persisting jobs and sending notifications");
        let stats = persist_and_notify(&scored_jobs, &self.config, &self.database).await;

        // Combine errors from all stages
        errors.extend(stats.errors);

        tracing::info!(
            "Scraping cycle complete: {} new, {} updated, {} high matches, {} alerts sent, {} errors",
            stats.jobs_new,
            stats.jobs_updated,
            stats.high_matches,
            stats.alerts_sent,
            errors.len()
        );

        Ok(ScrapingResult {
            jobs_found: scored_jobs.len(),
            jobs_new: stats.jobs_new,
            jobs_updated: stats.jobs_updated,
            high_matches: stats.high_matches,
            alerts_sent: stats.alerts_sent,
            errors,
        })
    }
}
