// ============================================================================
// Screening Answer Learning Commands
// ============================================================================

use crate::commands::errors::user_friendly_error;
use crate::commands::limits::validate_optional_command_limit_usize;
use crate::commands::AppState;
use crate::core::automation::{
    AnswerLearningManager, AnswerSource, AnswerStatistics, AnswerSuggestion,
};
use serde::{Deserialize, Serialize};
use tauri::State;

/// Get suggested answers for a screening question
///
/// Returns ranked suggestions based on:
/// - Manual patterns (from screening_answers table)
/// - Learned patterns (from user modifications)
/// - Historical answers (from similar questions)
pub(super) async fn get_suggested_answers(
    question: String,
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<AnswerSuggestionResponse>, String> {
    tracing::info!(
        question_chars = question.chars().count(),
        limit = ?limit,
        "Command: get_suggested_answers"
    );

    let limit = validate_optional_command_limit_usize(limit, 5)?;
    let manager = AnswerLearningManager::new(state.database.pool().clone());
    let suggestions = manager
        .get_suggested_answers(&question, limit)
        .await
        .map_err(|e| user_friendly_error("Failed to get suggestions", e))?;

    Ok(suggestions
        .into_iter()
        .map(AnswerSuggestionResponse::from)
        .collect())
}

/// Record that a screening answer was used
///
/// Tracks usage and user modifications for learning.
/// If `was_modified` is true, the system learns from the correction.
pub(super) async fn record_answer_usage(
    screening_answer_id: Option<i64>,
    question_text: String,
    answer_filled: String,
    was_modified: bool,
    modified_to: Option<String>,
    job_hash: Option<String>,
    application_attempt_id: Option<i64>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!(
        "Command: record_answer_usage (pattern_id: {:?}, modified: {})",
        screening_answer_id,
        was_modified
    );

    let manager = AnswerLearningManager::new(state.database.pool().clone());
    manager
        .record_answer_usage(
            screening_answer_id,
            &question_text,
            &answer_filled,
            was_modified,
            modified_to.as_deref(),
            job_hash.as_deref(),
            application_attempt_id,
        )
        .await
        .map_err(|e| user_friendly_error("Failed to record usage", e))
}

/// Get statistics for a specific answer pattern
///
/// Shows usage metrics, modification rate, confidence score, and recent modifications.
pub(super) async fn get_answer_statistics(
    pattern: String,
    state: State<'_, AppState>,
) -> Result<Option<AnswerStatisticsResponse>, String> {
    tracing::info!(
        pattern_chars = pattern.chars().count(),
        "Command: get_answer_statistics"
    );

    let manager = AnswerLearningManager::new(state.database.pool().clone());
    match manager.get_answer_statistics(&pattern).await {
        Ok(Some(statistics)) => Ok(Some(AnswerStatisticsResponse::from(statistics))),
        Ok(None) => Ok(None),
        Err(e) => Err(user_friendly_error("Failed to get statistics", e)),
    }
}

/// Clear answer history (optionally for a specific pattern)
///
/// Removes usage history and resets statistics.
/// If `pattern` is None, clears all history.
pub(super) async fn clear_answer_history(
    pattern: Option<String>,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    tracing::info!(
        has_pattern = pattern.is_some(),
        pattern_chars = pattern
            .as_ref()
            .map_or(0, |pattern| pattern.chars().count()),
        "Command: clear_answer_history"
    );

    let manager = AnswerLearningManager::new(state.database.pool().clone());
    manager
        .clear_answer_history(pattern.as_deref())
        .await
        .map_err(|e| user_friendly_error("Failed to clear history", e))
}

// Response types for learning commands

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AnswerSuggestionResponse {
    pub answer: String,
    pub confidence: f64,
    pub source: AnswerSourceResponse,
    pub times_used: i32,
    pub times_modified: i32,
    pub last_used_days_ago: Option<i32>,
    pub modification_rate: f64,
}

impl From<AnswerSuggestion> for AnswerSuggestionResponse {
    fn from(s: AnswerSuggestion) -> Self {
        Self {
            answer: s.answer,
            confidence: s.confidence,
            source: AnswerSourceResponse::from(s.source),
            times_used: s.times_used,
            times_modified: s.times_modified,
            last_used_days_ago: s.last_used_days_ago,
            modification_rate: s.modification_rate,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub(crate) enum AnswerSourceResponse {
    Manual {
        #[serde(rename = "answerId")]
        answer_id: i64,
    },
    Learned {
        #[serde(rename = "learnedId")]
        learned_id: i64,
    },
    Historical,
}

impl From<AnswerSource> for AnswerSourceResponse {
    fn from(source: AnswerSource) -> Self {
        match source {
            AnswerSource::Manual { answer_id, .. } => Self::Manual { answer_id },
            AnswerSource::Learned { learned_id, .. } => Self::Learned { learned_id },
            AnswerSource::Historical { .. } => Self::Historical,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AnswerStatisticsResponse {
    pub times_used: i32,
    pub times_modified: i32,
    pub modification_rate: f64,
    pub confidence_score: f64,
    pub last_used_at: Option<String>,
    pub created_at: String,
    pub recent_modifications: Vec<ModificationExampleResponse>,
}

impl From<AnswerStatistics> for AnswerStatisticsResponse {
    fn from(stats: AnswerStatistics) -> Self {
        Self {
            times_used: stats.times_used,
            times_modified: stats.times_modified,
            modification_rate: stats.modification_rate,
            confidence_score: stats.confidence_score,
            last_used_at: stats.last_used_at.map(|d| d.to_rfc3339()),
            created_at: stats.created_at.to_rfc3339(),
            recent_modifications: stats
                .recent_modifications
                .into_iter()
                .map(ModificationExampleResponse::from)
                .collect(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ModificationExampleResponse {
    pub before_chars: usize,
    pub after_chars: usize,
    pub question_chars: usize,
    pub modified_at: String,
}

impl From<crate::core::automation::ModificationExample> for ModificationExampleResponse {
    fn from(ex: crate::core::automation::ModificationExample) -> Self {
        Self {
            before_chars: ex.original_answer.chars().count(),
            after_chars: ex.modified_to.chars().count(),
            question_chars: ex.question_text.chars().count(),
            modified_at: ex.modified_at.to_rfc3339(),
        }
    }
}
