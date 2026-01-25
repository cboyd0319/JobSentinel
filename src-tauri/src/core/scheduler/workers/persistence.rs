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
#[tracing::instrument(skip_all, fields(job_count = scored_jobs.len()), level = "info")]
pub async fn persist_and_notify(
    scored_jobs: &[(crate::core::db::Job, JobScore)],
    config: &Arc<Config>,
    database: &Arc<Database>,
) -> PersistenceStats {
    use std::time::Instant;

    let start = Instant::now();
    let mut jobs_new = 0;
    let mut jobs_updated = 0;
    let mut high_matches = 0;
    let mut alerts_sent = 0;
    let mut errors = Vec::new();

    // Store in database
    let job_count = scored_jobs.len();
    tracing::debug!(job_count, "Starting database persistence");

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
            tracing::error!(
                job_title = %job.title,
                job_company = %job.company,
                job_hash = %job.hash,
                error = %e,
                "Failed to upsert job"
            );
            errors.push(format!("Database error for {}: {}", job.title, e));
        }

        // Track reposts for ghost detection
        if let Err(e) = database
            .track_repost(&job.hash, &job.company, &job.title, &job.source)
            .await
        {
            tracing::debug!(
                job_title = %job.title,
                error = %e,
                "Failed to track repost"
            );
        }
    }

    let persist_duration = start.elapsed();
    tracing::info!(
        jobs_new,
        jobs_updated,
        elapsed_ms = persist_duration.as_millis(),
        "Database persistence complete"
    );

    // Send notifications for high-scoring jobs
    let notify_start = Instant::now();
    tracing::debug!("Processing notifications");
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
                        tracing::info!(
                            job_title = %job.title,
                            job_company = %job.company,
                            job_score = score.total,
                            "Notification alert sent"
                        );
                        alerts_sent += 1;

                        // Mark as alerted in database (use hash to avoid race conditions)
                        // Note: This relies on the unique constraint on the hash column to prevent
                        // duplicate alert notifications even if multiple scraping cycles run concurrently
                        if let Some(existing_job) =
                            database.get_job_by_hash(&job.hash).await.ok().flatten()
                        {
                            if let Err(e) = database.mark_alert_sent(existing_job.id).await {
                                tracing::error!(
                                    job_id = existing_job.id,
                                    job_title = %job.title,
                                    error = %e,
                                    "Failed to mark alert as sent"
                                );
                                errors.push(format!(
                                    "Failed to mark alert sent for {}: {}",
                                    job.title, e
                                ));
                            }
                        }
                    }
                    Err(e) => {
                        tracing::error!(
                            job_title = %job.title,
                            job_company = %job.company,
                            error = %e,
                            "Failed to send notification alert"
                        );
                        errors.push(format!("Notification error for {}: {}", job.title, e));
                    }
                }
            }
        }
    }

    let notify_duration = notify_start.elapsed();
    tracing::info!(
        high_matches,
        alerts_sent,
        elapsed_ms = notify_duration.as_millis(),
        "Notifications complete"
    );

    PersistenceStats {
        jobs_new,
        jobs_updated,
        high_matches,
        alerts_sent,
        errors,
    }
}
