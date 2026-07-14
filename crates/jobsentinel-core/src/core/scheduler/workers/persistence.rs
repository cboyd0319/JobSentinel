//! Database persistence and notification logic

use crate::core::{
    config::Config,
    credentials::CredentialService,
    db::Database,
    notify::{Notification, NotificationService},
    scoring::{JobScore, ScoringEngine},
};
use std::sync::Arc;

fn database_error_kind(error: &sqlx::Error) -> &'static str {
    match error {
        sqlx::Error::Database(_) => "database",
        sqlx::Error::Decode(_) => "decode",
        sqlx::Error::Encode(_) => "encode",
        sqlx::Error::Io(_) => "io",
        sqlx::Error::PoolClosed => "pool_closed",
        sqlx::Error::PoolTimedOut => "pool_timed_out",
        sqlx::Error::Protocol(_) => "protocol",
        sqlx::Error::RowNotFound => "row_not_found",
        sqlx::Error::Tls(_) => "tls",
        sqlx::Error::TypeNotFound { .. } => "type_not_found",
        sqlx::Error::ColumnIndexOutOfBounds { .. }
        | sqlx::Error::ColumnNotFound(_)
        | sqlx::Error::ColumnDecode { .. } => "column",
        _ => "unknown",
    }
}

/// Statistics from persistence and notification operations
#[derive(Debug)]
pub(crate) struct PersistenceStats {
    pub jobs_new: usize,
    pub jobs_updated: usize,
    pub high_matches: usize,
    pub alerts_sent: usize,
    pub errors: Vec<String>,
}

/// Persist jobs to database and send notifications for high-scoring jobs
#[tracing::instrument(skip_all, fields(job_count = scored_jobs.len()), level = "info")]
pub(crate) async fn persist_and_notify(
    scored_jobs: &[(crate::core::Job, JobScore)],
    config: &Arc<Config>,
    database: &Arc<Database>,
    credentials: &Arc<CredentialService>,
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
                job_hash = %job.hash,
                error_kind = database_error_kind(&e),
                "Failed to upsert job"
            );
            errors.push(format!(
                "Database error while saving one job ({})",
                database_error_kind(&e)
            ));
        }

        // Track reposts for ghost detection
        if let Err(e) = database
            .track_repost(&job.hash, &job.company, &job.title, &job.source)
            .await
        {
            tracing::debug!(
                job_hash = %job.hash,
                error_kind = database_error_kind(&e),
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
    let notification_service =
        NotificationService::with_credentials(Arc::clone(config), Arc::clone(credentials));
    let scoring_engine = ScoringEngine::new(Arc::clone(config));

    for (job, score) in scored_jobs {
        if scoring_engine.should_alert_immediately(score) {
            high_matches += 1;

            match database.claim_immediate_alert(&job.hash).await {
                Ok(true) => {}
                Ok(false) => continue,
                Err(e) => {
                    tracing::error!(
                        job_hash = %job.hash,
                        error_kind = database_error_kind(&e),
                        "Failed to claim alert delivery"
                    );
                    errors.push(format!(
                        "Database error while claiming one alert ({})",
                        database_error_kind(&e)
                    ));
                    continue;
                }
            }

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
                        job_hash = %job.hash,
                        job_score = score.total,
                        "Notification alert sent"
                    );
                    alerts_sent += 1;
                }
                Err(_e) => {
                    tracing::error!(
                        job_hash = %job.hash,
                        error_kind = "notification_delivery",
                        "Failed to send notification alert"
                    );
                    errors.push("Notification delivery error for one job".to_string());
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
