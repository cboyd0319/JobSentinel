//! Job scoring and ghost detection logic

use crate::core::{
    config::Config,
    db::{Database, Job},
    ghost::{GhostConfig, GhostDetector},
    scoring::{JobScore, ScoringEngine},
};
use std::sync::Arc;

/// Score all jobs and run ghost detection analysis
///
/// Returns scored jobs sorted by score descending
pub async fn score_jobs(
    jobs: Vec<Job>,
    config: &Arc<Config>,
    database: &Arc<Database>,
) -> Vec<(Job, JobScore)> {
    tracing::info!("Step 2: Scoring jobs");

    // Use with_db to enable resume-based scoring when configured
    let scoring_engine = ScoringEngine::with_db(Arc::clone(config), database.pool().clone());

    let mut scored_jobs: Vec<(Job, JobScore)> = Vec::with_capacity(jobs.len());

    // Use async scoring when resume matching is enabled
    if config.use_resume_matching {
        tracing::info!("Resume-based scoring enabled, using async scoring");
        for mut job in jobs {
            let score = scoring_engine.score_async(&job).await;
            job.score = Some(score.total);
            job.score_reasons = Some(serde_json::to_string(&score.reasons).unwrap_or_else(|e| {
                tracing::warn!("Failed to serialize score reasons: {}", e);
                String::new()
            }));
            scored_jobs.push((job, score));
        }
    } else {
        // Use synchronous scoring for better performance when resume matching is disabled
        scored_jobs = jobs
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
    }

    // Sort by score descending
    scored_jobs.sort_by(|a, b| {
        b.1.total
            .partial_cmp(&a.1.total)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    tracing::info!("Scored {} jobs", scored_jobs.len());

    // Ghost detection analysis
    tracing::info!("Step 2.5: Analyzing jobs for ghost indicators");
    let ghost_config = config
        .ghost_config
        .clone()
        .unwrap_or_else(GhostConfig::default);
    let ghost_detector = GhostDetector::new(ghost_config);

    for (job, _score) in &mut scored_jobs {
        // Get repost count from database (if job was seen before)
        let repost_count = database
            .get_repost_count(&job.company, &job.title, &job.source)
            .await
            .unwrap_or(0);

        // Get count of open jobs from this company
        let company_open_jobs = database
            .count_company_open_jobs(&job.company)
            .await
            .unwrap_or(0);

        // Analyze for ghost indicators (using ML-enhanced analysis v2.5.5)
        let analysis = ghost_detector.analyze_enhanced(
            &job.title,
            job.description.as_deref(),
            job.salary_min,
            job.salary_max,
            job.location.as_deref(),
            job.remote,
            job.created_at,
            repost_count,
            company_open_jobs,
        );

        // Update job with ghost analysis results
        job.ghost_score = Some(analysis.score);
        job.ghost_reasons = if analysis.reasons.is_empty() {
            None
        } else {
            Some(serde_json::to_string(&analysis.reasons).unwrap_or_default())
        };
        job.repost_count = repost_count;

        if analysis.score >= 0.5 {
            tracing::debug!(
                "Ghost indicator for '{}' at {}: score={:.2}, reasons={:?}",
                job.title,
                job.company,
                analysis.score,
                analysis
                    .reasons
                    .iter()
                    .map(|r| &r.description)
                    .collect::<Vec<_>>()
            );
        }
    }

    let ghost_count = scored_jobs
        .iter()
        .filter(|(j, _)| j.ghost_score.unwrap_or(0.0) >= 0.5)
        .count();
    tracing::info!(
        "Ghost analysis: {} potential ghost jobs detected",
        ghost_count
    );

    scored_jobs
}
