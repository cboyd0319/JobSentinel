//! Type definitions for the resume module

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Resume metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resume {
    pub id: i64,
    pub name: String,
    pub file_path: String,
    pub parsed_text: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Extracted skill from resume
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSkill {
    pub id: i64,
    pub resume_id: i64,
    pub skill_name: String,
    pub skill_category: Option<String>,
    pub confidence_score: f64,
    pub years_experience: Option<f64>,
    pub proficiency_level: Option<String>,
    pub source: String,
}

/// Job skill requirement
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobSkill {
    pub id: i64,
    pub job_hash: String,
    pub skill_name: String,
    pub is_required: bool,
    pub skill_category: Option<String>,
}

/// Resume-job match result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchResult {
    pub id: i64,
    pub resume_id: i64,
    pub job_hash: String,
    pub overall_match_score: f64,
    pub skills_match_score: Option<f64>,
    pub experience_match_score: Option<f64>,
    pub education_match_score: Option<f64>,
    pub missing_skills: Vec<String>,
    pub matching_skills: Vec<String>,
    pub gap_analysis: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Resume-job match result with job details (for frontend display)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchResultWithJob {
    pub id: i64,
    pub resume_id: i64,
    pub job_hash: String,
    pub job_title: String,
    pub company: String,
    pub overall_match_score: f64,
    pub skills_match_score: Option<f64>,
    pub missing_skills: Vec<String>,
    pub matching_skills: Vec<String>,
    pub gap_analysis: Option<String>,
    pub created_at: DateTime<Utc>,
}
