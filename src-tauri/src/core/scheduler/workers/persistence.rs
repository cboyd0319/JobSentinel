//! Database persistence and notification logic

use crate::core::{
    config::Config,
    db::Database,
    notify::{Notification, NotificationService},
    scoring::{JobScore, ScoringEngine},
};
use std::sync::Arc;

/// Statistics from persistence and notification operations
#[derive(Debug)]
pub struct PersistenceStats {
    pub jobs_new: usize,
    pub jobs_updated: usize,
    pub high_matches: usize,
    pub alerts_sent: usize,
    pub errors: Vec<String>,
}

/// Persist jobs to database and send notifications for high-scoring jobs
pub async fn persist_and_notify(
    scored_jobs: &[(crate::core::db::Job, JobScore)],
    config: &Arc<Config>,
    database: &Arc<Database>,
) -> PersistenceStats {
    let mut jobs_new = 0;
    let mut jobs_updated = 0;
    let mut high_matches = 0;
    let mut alerts_sent = 0;
    let mut errors = Vec::new();

    // Store in database
    tracing::info!("Step 3: Storing jobs in database");

    for (job, _score) in scored_jobs {
        // Check if job exists before upserting
        let was_existing = database
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

        if let Err(e) = database.upsert_job(job).await {
            tracing::error!("Failed to upsert job {}: {}", job.title, e);
            errors.push(format!("Database error for {}: {}", job.title, e));
        }

        // Track reposts for ghost detection
        if let Err(e) = database
            .track_repost(&job.hash, &job.company, &job.title, &job.source)
            .await
        {
            tracing::warn!("Failed to track repost for {}: {}", job.title, e);
        }
    }

    tracing::info!("Database: {} new jobs, {} updated", jobs_new, jobs_updated);

    // Send notifications for high-scoring jobs
    tracing::info!("Step 4: Sending notifications");
    let notification_service = NotificationService::new(Arc::clone(config));
    let scoring_engine = ScoringEngine::new(Arc::clone(config));

    for (job, score) in scored_jobs {
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
                        if let Some(existing_job) =
                            database.get_job_by_hash(&job.hash).await.ok().flatten()
                        {
                            if let Err(e) = database.mark_alert_sent(existing_job.id).await {
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

    PersistenceStats {
        jobs_new,
        jobs_updated,
        high_matches,
        alerts_sent,
        errors,
    }
}
