// ! Smart Screening Answer Learning
//!
//! Learns from user behavior to improve screening question answers over time.
//! Tracks usage, modifications, and suggests answers with confidence scores.

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use regex::Regex;
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::collections::HashMap;

/// Suggested answer with confidence score
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnswerSuggestion {
    pub answer: String,
    pub confidence: f64,
    pub source: AnswerSource,
    pub times_used: i32,
    pub times_modified: i32,
    pub last_used_days_ago: Option<i32>,
    pub modification_rate: f64, // 0.0 = never modified, 1.0 = always modified
}

/// Where this answer suggestion came from
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AnswerSource {
    /// Manual pattern from screening_answers table
    Manual { pattern: String, answer_id: i64 },
    /// Learned from user behavior
    Learned { pattern: String, learned_id: i64 },
    /// Historical answer (from previous uses)
    Historical { original_question: String },
}

/// Statistics for a specific answer pattern
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnswerStatistics {
    pub pattern: String,
    pub answer: String,
    pub times_used: i32,
    pub times_modified: i32,
    pub modification_rate: f64,
    pub confidence_score: f64,
    pub last_used_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub recent_modifications: Vec<ModificationExample>,
}

/// Example of how users modified an answer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModificationExample {
    pub original_answer: String,
    pub modified_to: String,
    pub question_text: String,
    pub modified_at: DateTime<Utc>,
}

/// Manages screening answer learning
pub struct AnswerLearningManager {
    db: SqlitePool,
}

impl AnswerLearningManager {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Normalize question text for fuzzy matching
    ///
    /// - Lowercase
    /// - Trim whitespace
    /// - Collapse multiple spaces to one
    /// - Remove punctuation except spaces
    pub fn normalize_question(text: &str) -> String {
        let lower = text.to_lowercase();
        let no_punct = lower
            .chars()
            .map(|c| {
                if c.is_alphanumeric() || c.is_whitespace() {
                    c
                } else {
                    ' '
                }
            })
            .collect::<String>();

        no_punct.split_whitespace().collect::<Vec<_>>().join(" ")
    }

    /// Calculate similarity between two normalized question texts
    ///
    /// Uses Jaro-Winkler distance (0.0 = completely different, 1.0 = identical)
    fn calculate_similarity(q1: &str, q2: &str) -> f64 {
        if q1 == q2 {
            return 1.0;
        }
        if q1.is_empty() || q2.is_empty() {
            return 0.0;
        }

        // Simple word overlap similarity (good enough for MVP)
        let words1: std::collections::HashSet<&str> = q1.split_whitespace().collect();
        let words2: std::collections::HashSet<&str> = q2.split_whitespace().collect();

        let intersection = words1.intersection(&words2).count();
        let union = words1.union(&words2).count();

        if union == 0 {
            0.0
        } else {
            intersection as f64 / union as f64
        }
    }

    /// Get suggested answers for a question
    ///
    /// Returns suggestions ranked by confidence score.
    /// Includes manual patterns, learned patterns, and historical answers.
    pub async fn get_suggested_answers(
        &self,
        question: &str,
        limit: usize,
    ) -> Result<Vec<AnswerSuggestion>> {
        let normalized = Self::normalize_question(question);
        let mut suggestions = Vec::new();

        // 1. Check manual patterns (screening_answers table)
        let manual = self.get_manual_pattern_matches(question).await?;
        suggestions.extend(manual);

        // 2. Check learned patterns (screening_learned_answers table)
        let learned = self.get_learned_pattern_matches(question).await?;
        suggestions.extend(learned);

        // 3. Check historical answers with similar questions
        let historical = self.get_historical_matches(&normalized, 0.6).await?;
        suggestions.extend(historical);

        // Sort by confidence descending
        suggestions.sort_by(|a, b| {
            b.confidence
                .partial_cmp(&a.confidence)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // Deduplicate by answer text (keep highest confidence)
        let mut seen = HashMap::new();
        suggestions.retain(|s| {
            if seen.contains_key(&s.answer) {
                false
            } else {
                seen.insert(s.answer.clone(), true);
                true
            }
        });

        // Take top N
        Ok(suggestions.into_iter().take(limit).collect())
    }

    /// Get matches from manual screening_answers patterns
    async fn get_manual_pattern_matches(&self, question: &str) -> Result<Vec<AnswerSuggestion>> {
        let rows = sqlx::query(
            r#"
            SELECT id, question_pattern, answer, times_used, times_modified,
                   confidence_score, last_used_at
            FROM screening_answers
            ORDER BY confidence_score DESC, times_used DESC
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        let mut suggestions = Vec::new();

        for row in rows {
            let pattern: String = row.get("question_pattern");
            let answer: String = row.get("answer");
            let id: i64 = row.get("id");
            let times_used: i32 = row.get("times_used");
            let times_modified: i32 = row.get("times_modified");
            let base_confidence: f64 = row.get("confidence_score");
            let last_used: Option<String> = row.get("last_used_at");

            // Try to match pattern
            if let Ok(regex) = Regex::new(&format!("(?i){}", pattern)) {
                if regex.is_match(question) {
                    let modification_rate = if times_used > 0 {
                        times_modified as f64 / times_used as f64
                    } else {
                        0.0
                    };

                    let confidence = self.calculate_confidence(
                        base_confidence,
                        times_used,
                        times_modified,
                        &last_used,
                    );

                    let last_used_days = last_used.and_then(|d| {
                        DateTime::parse_from_rfc3339(&d)
                            .ok()
                            .map(|dt| (Utc::now() - dt.with_timezone(&Utc)).num_days() as i32)
                    });

                    suggestions.push(AnswerSuggestion {
                        answer,
                        confidence,
                        source: AnswerSource::Manual {
                            pattern,
                            answer_id: id,
                        },
                        times_used,
                        times_modified,
                        last_used_days_ago: last_used_days,
                        modification_rate,
                    });
                }
            }
        }

        Ok(suggestions)
    }

    /// Get matches from learned patterns
    async fn get_learned_pattern_matches(&self, question: &str) -> Result<Vec<AnswerSuggestion>> {
        let rows = sqlx::query(
            r#"
            SELECT id, question_pattern, learned_answer, times_used, times_modified,
                   confidence_score, last_used_at
            FROM screening_learned_answers
            WHERE confidence_score > 0.3
            ORDER BY confidence_score DESC
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        let mut suggestions = Vec::new();

        for row in rows {
            let pattern: String = row.get("question_pattern");
            let answer: String = row.get("learned_answer");
            let id: i64 = row.get("id");
            let times_used: i32 = row.get("times_used");
            let times_modified: i32 = row.get("times_modified");
            let base_confidence: f64 = row.get("confidence_score");
            let last_used: Option<String> = row.get("last_used_at");

            // Try to match pattern
            if let Ok(regex) = Regex::new(&format!("(?i){}", pattern)) {
                if regex.is_match(question) {
                    let modification_rate = if times_used > 0 {
                        times_modified as f64 / times_used as f64
                    } else {
                        0.0
                    };

                    let confidence = self.calculate_confidence(
                        base_confidence,
                        times_used,
                        times_modified,
                        &last_used,
                    );

                    let last_used_days = last_used.and_then(|d| {
                        DateTime::parse_from_rfc3339(&d)
                            .ok()
                            .map(|dt| (Utc::now() - dt.with_timezone(&Utc)).num_days() as i32)
                    });

                    suggestions.push(AnswerSuggestion {
                        answer,
                        confidence,
                        source: AnswerSource::Learned {
                            pattern,
                            learned_id: id,
                        },
                        times_used,
                        times_modified,
                        last_used_days_ago: last_used_days,
                        modification_rate,
                    });
                }
            }
        }

        Ok(suggestions)
    }

    /// Get historical answers with similar questions
    async fn get_historical_matches(
        &self,
        normalized_question: &str,
        min_similarity: f64,
    ) -> Result<Vec<AnswerSuggestion>> {
        // Fetch recent history (last 6 months, not modified)
        let rows = sqlx::query(
            r#"
            SELECT question_text, question_normalized, answer_filled, was_modified
            FROM screening_answer_history
            WHERE was_modified = 0
              AND created_at > datetime('now', '-6 months')
            ORDER BY created_at DESC
            LIMIT 100
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        let mut matches: HashMap<String, (String, usize)> = HashMap::new();

        for row in rows {
            let q_normalized: String = row.get("question_normalized");
            let q_original: String = row.get("question_text");
            let answer: String = row.get("answer_filled");

            let similarity = Self::calculate_similarity(normalized_question, &q_normalized);

            if similarity >= min_similarity {
                matches
                    .entry(answer.clone())
                    .and_modify(|(_, count)| *count += 1)
                    .or_insert((q_original, 1));
            }
        }

        let suggestions: Vec<AnswerSuggestion> = matches
            .into_iter()
            .map(|(answer, (original_q, count))| {
                let confidence = min_similarity * 0.8; // Historical matches have lower confidence
                AnswerSuggestion {
                    answer,
                    confidence,
                    source: AnswerSource::Historical {
                        original_question: original_q,
                    },
                    times_used: count as i32,
                    times_modified: 0,
                    last_used_days_ago: None,
                    modification_rate: 0.0,
                }
            })
            .collect();

        Ok(suggestions)
    }

    /// Calculate confidence score based on usage metrics
    ///
    /// Formula:
    /// confidence = base * usage_weight * recency_weight * modification_penalty
    fn calculate_confidence(
        &self,
        base_confidence: f64,
        times_used: i32,
        times_modified: i32,
        last_used_at: &Option<String>,
    ) -> f64 {
        // Usage weight: increases with usage up to 10 times (then capped at 1.0)
        let usage_weight = (times_used as f64 / 10.0).min(1.0);

        // Recency weight: decays linearly over 1 year
        let recency_weight = if let Some(last_used) = last_used_at {
            if let Ok(dt) = DateTime::parse_from_rfc3339(last_used) {
                let days_ago = (Utc::now() - dt.with_timezone(&Utc)).num_days();
                (1.0 - (days_ago as f64 / 365.0)).max(0.3) // Min 30% confidence
            } else {
                0.8 // Default if parse fails
            }
        } else {
            0.8 // Never used yet
        };

        // Modification penalty: reduces confidence based on modification rate
        let modification_penalty = if times_used > 0 {
            1.0 - (times_modified as f64 / times_used as f64)
        } else {
            1.0 // No usage yet, no penalty
        };

        let final_confidence =
            base_confidence * usage_weight * recency_weight * modification_penalty;
        final_confidence.clamp(0.0, 1.0)
    }

    /// Record that an answer was used
    ///
    /// Tracks usage and user modifications for learning.
    pub async fn record_answer_usage(
        &self,
        screening_answer_id: Option<i64>,
        question_text: &str,
        answer_filled: &str,
        was_modified: bool,
        modified_to: Option<&str>,
        job_hash: Option<&str>,
        application_attempt_id: Option<i64>,
    ) -> Result<()> {
        let normalized = Self::normalize_question(question_text);

        // Insert history record
        sqlx::query(
            r#"
            INSERT INTO screening_answer_history (
                screening_answer_id,
                question_text,
                question_normalized,
                answer_filled,
                was_modified,
                modified_to,
                job_hash,
                application_attempt_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(screening_answer_id)
        .bind(question_text)
        .bind(&normalized)
        .bind(answer_filled)
        .bind(was_modified as i32)
        .bind(modified_to)
        .bind(job_hash)
        .bind(application_attempt_id)
        .execute(&self.db)
        .await
        .context("Failed to insert screening answer history")?;

        // Update screening_answers stats if matched
        if let Some(answer_id) = screening_answer_id {
            sqlx::query(
                r#"
                UPDATE screening_answers
                SET times_used = times_used + 1,
                    times_modified = times_modified + ?,
                    last_used_at = datetime('now')
                WHERE id = ?
                "#,
            )
            .bind(was_modified as i32)
            .bind(answer_id)
            .execute(&self.db)
            .await?;

            // Recalculate confidence score
            self.update_answer_confidence(answer_id).await?;
        }

        Ok(())
    }

    /// Update confidence score for a screening answer
    async fn update_answer_confidence(&self, answer_id: i64) -> Result<()> {
        let row = sqlx::query(
            "SELECT times_used, times_modified, last_used_at FROM screening_answers WHERE id = ?",
        )
        .bind(answer_id)
        .fetch_one(&self.db)
        .await?;

        let times_used: i32 = row.get("times_used");
        let times_modified: i32 = row.get("times_modified");
        let last_used: Option<String> = row.get("last_used_at");

        let new_confidence = self.calculate_confidence(1.0, times_used, times_modified, &last_used);

        sqlx::query("UPDATE screening_answers SET confidence_score = ? WHERE id = ?")
            .bind(new_confidence)
            .bind(answer_id)
            .execute(&self.db)
            .await?;

        Ok(())
    }

    /// Get statistics for an answer pattern
    pub async fn get_answer_statistics(&self, pattern: &str) -> Result<Option<AnswerStatistics>> {
        let row = sqlx::query(
            r#"
            SELECT id, question_pattern, answer, times_used, times_modified,
                   confidence_score, last_used_at, created_at
            FROM screening_answers
            WHERE question_pattern = ?
            "#,
        )
        .bind(pattern)
        .fetch_optional(&self.db)
        .await?;

        let Some(row) = row else {
            return Ok(None);
        };

        let answer_id: i64 = row.get("id");
        let created_at: String = row.get("created_at");
        let last_used: Option<String> = row.get("last_used_at");

        let modification_examples = self.get_recent_modifications(answer_id, 5).await?;

        let times_used: i32 = row.get("times_used");
        let times_modified: i32 = row.get("times_modified");
        let modification_rate = if times_used > 0 {
            times_modified as f64 / times_used as f64
        } else {
            0.0
        };

        Ok(Some(AnswerStatistics {
            pattern: row.get("question_pattern"),
            answer: row.get("answer"),
            times_used,
            times_modified,
            modification_rate,
            confidence_score: row.get("confidence_score"),
            last_used_at: last_used.and_then(|d| {
                DateTime::parse_from_rfc3339(&d)
                    .ok()
                    .map(|dt| dt.with_timezone(&Utc))
            }),
            created_at: DateTime::parse_from_rfc3339(&created_at)?.with_timezone(&Utc),
            recent_modifications: modification_examples,
        }))
    }

    /// Get recent modification examples
    async fn get_recent_modifications(
        &self,
        answer_id: i64,
        limit: usize,
    ) -> Result<Vec<ModificationExample>> {
        let rows = sqlx::query(
            r#"
            SELECT question_text, answer_filled, modified_to, created_at
            FROM screening_answer_history
            WHERE screening_answer_id = ?
              AND was_modified = 1
            ORDER BY created_at DESC
            LIMIT ?
            "#,
        )
        .bind(answer_id)
        .bind(limit as i32)
        .fetch_all(&self.db)
        .await?;

        let examples = rows
            .into_iter()
            .filter_map(|row| {
                let modified_to: Option<String> = row.get("modified_to");
                let created_at: String = row.get("created_at");

                Some(ModificationExample {
                    original_answer: row.get("answer_filled"),
                    modified_to: modified_to?,
                    question_text: row.get("question_text"),
                    modified_at: DateTime::parse_from_rfc3339(&created_at)
                        .ok()?
                        .with_timezone(&Utc),
                })
            })
            .collect();

        Ok(examples)
    }

    /// Clear answer history (optionally for a specific pattern)
    pub async fn clear_answer_history(&self, pattern: Option<&str>) -> Result<usize> {
        let count = if let Some(p) = pattern {
            // Clear history for specific pattern
            let answer_id: Option<i64> =
                sqlx::query_scalar("SELECT id FROM screening_answers WHERE question_pattern = ?")
                    .bind(p)
                    .fetch_optional(&self.db)
                    .await?;

            if let Some(id) = answer_id {
                let result = sqlx::query(
                    "DELETE FROM screening_answer_history WHERE screening_answer_id = ?",
                )
                .bind(id)
                .execute(&self.db)
                .await?;

                // Reset stats
                sqlx::query(
                    r#"
                    UPDATE screening_answers
                    SET times_used = 0, times_modified = 0, last_used_at = NULL, confidence_score = 1.0
                    WHERE id = ?
                    "#,
                )
                .bind(id)
                .execute(&self.db)
                .await?;

                result.rows_affected() as usize
            } else {
                0
            }
        } else {
            // Clear all history
            let result = sqlx::query("DELETE FROM screening_answer_history")
                .execute(&self.db)
                .await?;

            // Reset all stats
            sqlx::query(
                r#"
                UPDATE screening_answers
                SET times_used = 0, times_modified = 0, last_used_at = NULL, confidence_score = 1.0
                "#,
            )
            .execute(&self.db)
            .await?;

            result.rows_affected() as usize
        };

        Ok(count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_question() {
        assert_eq!(
            AnswerLearningManager::normalize_question("How many years of experience do you have?"),
            "how many years of experience do you have"
        );

        assert_eq!(
            AnswerLearningManager::normalize_question("  Multiple   spaces   "),
            "multiple spaces"
        );

        assert_eq!(
            AnswerLearningManager::normalize_question("What's your salary? (USD)"),
            "what s your salary usd"
        );
    }

    #[test]
    fn test_calculate_similarity() {
        // Identical
        assert_eq!(
            AnswerLearningManager::calculate_similarity("hello world", "hello world"),
            1.0
        );

        // Completely different
        assert!(AnswerLearningManager::calculate_similarity("hello", "goodbye") < 0.5);

        // Partial overlap
        let sim = AnswerLearningManager::calculate_similarity(
            "how many years experience",
            "how many years of programming experience",
        );
        assert!(sim > 0.6);
        assert!(sim < 1.0);

        // Empty strings
        assert_eq!(AnswerLearningManager::calculate_similarity("", "test"), 0.0);
    }
}
