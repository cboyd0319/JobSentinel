//! Job scoring and ghost detection logic

use crate::core::{
    config::Config,
    db::{Database, Job},
    ghost::{GhostConfig, GhostDetector},
    scoring::{get_cached_score, set_cached_score, JobScore, ScoreCacheKey, ScoringEngine},
};
use std::sync::Arc;

/// Score all jobs and run ghost detection analysis
///
/// Returns scored jobs sorted by score descending
#[tracing::instrument(
    skip_all,
    fields(
        job_count = jobs.len(),
        resume_matching = config.use_resume_matching
    ),
    level = "info"
)]
pub async fn score_jobs(
    jobs: Vec<Job>,
    config: &Arc<Config>,
    database: &Arc<Database>,
) -> Vec<(Job, JobScore)> {
    use std::time::Instant;

    let start = Instant::now();
    let job_count = jobs.len();
    tracing::info!(
        job_count,
        resume_matching = config.use_resume_matching,
        "Starting job scoring"
    );

    // Use with_db to enable resume-based scoring when configured
    let scoring_engine = ScoringEngine::with_db(Arc::clone(config), database.pool().clone());

    let mut scored_jobs: Vec<(Job, JobScore)> = Vec::with_capacity(jobs.len());

    // Use async scoring when resume matching is enabled
    let mut cache_hits = 0;
    let mut cache_misses = 0;

    if config.use_resume_matching {
        tracing::debug!("Resume-based scoring enabled, using async scoring with cache");
        for mut job in jobs {
            // Try cache first (resume-aware)
            let cache_key = ScoreCacheKey::base(&job.hash);
            let score = if let Some(cached) = get_cached_score(&cache_key).await {
                cache_hits += 1;
                (*cached).clone()
            } else {
                cache_misses += 1;
                let fresh_score = scoring_engine.score_async(&job).await;
                set_cached_score(cache_key, fresh_score.clone()).await;
                fresh_score
            };

            job.score = Some(score.total);
            job.score_reasons = Some(serde_json::to_string(&score.reasons).unwrap_or_else(|e| {
                tracing::warn!(error = %e, job_hash = %job.hash, "Failed to serialize score reasons");
                String::new()
            }));
            scored_jobs.push((job, score));
        }
    } else {
        // Use synchronous scoring for better performance when resume matching is disabled
        // Still use cache to avoid re-computing base scores
        for mut job in jobs {
            let cache_key = ScoreCacheKey::base(&job.hash);
            let score = if let Some(cached) = get_cached_score(&cache_key).await {
                cache_hits += 1;
                (*cached).clone()
            } else {
                cache_misses += 1;
                let fresh_score = scoring_engine.score(&job);
                set_cached_score(cache_key, fresh_score.clone()).await;
                fresh_score
            };

            job.score = Some(score.total);
            job.score_reasons = Some(serde_json::to_string(&score.reasons).unwrap_or_else(|e| {
                tracing::warn!(error = %e, job_hash = %job.hash, "Failed to serialize score reasons");
                String::new()
            }));
            scored_jobs.push((job, score));
        }
    }

    // Sort by score descending
    scored_jobs.sort_by(|a, b| {
        b.1.total
            .partial_cmp(&a.1.total)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let scoring_duration = start.elapsed();
    let cache_hit_rate = if job_count > 0 {
        cache_hits as f64 / job_count as f64 * 100.0
    } else {
        0.0
    };

    tracing::info!(
        scored_count = scored_jobs.len(),
        cache_hits,
        cache_misses,
        cache_hit_rate,
        elapsed_ms = scoring_duration.as_millis(),
        "Job scoring complete"
    );

    // Ghost detection analysis
    let ghost_start = Instant::now();
    tracing::debug!("Running ghost detection analysis");
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
    let ghost_duration = ghost_start.elapsed();
    tracing::info!(
        ghost_count,
        elapsed_ms = ghost_duration.as_millis(),
        "Ghost detection complete"
    );

    scored_jobs
}
