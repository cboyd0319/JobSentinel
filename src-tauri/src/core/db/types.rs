//! Database type definitions
//!
//! Contains all struct definitions for database models.

use crate::core::Job;
use serde::{Deserialize, Serialize};

/// Database statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Statistics {
    pub total_jobs: i64,
    pub high_matches: i64,
    pub average_score: f64,
    pub jobs_today: i64,
}

/// Ghost detection statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GhostStatistics {
    /// Total jobs with ghost analysis
    pub total_analyzed: i64,
    /// Jobs with ghost score >= 0.5 (likely ghost)
    pub likely_ghosts: i64,
    /// Jobs with ghost score 0.3-0.5 (warning)
    pub warnings: i64,
    /// Average ghost score across all analyzed jobs
    pub avg_ghost_score: f64,
    /// Total repost count across all tracked reposts
    pub total_reposts: i64,
}

/// A group of duplicate jobs (same title + company from different sources)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateGroup {
    /// The ID of the primary job (highest score)
    pub primary_id: i64,
    /// All jobs in this duplicate group
    pub jobs: Vec<Job>,
    /// Sources where this job appears
    pub sources: Vec<String>,
}
