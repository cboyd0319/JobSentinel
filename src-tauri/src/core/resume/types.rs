//! Type definitions for the resume module

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Resume metadata (for uploaded PDF resumes)
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

// ============================================================================
// ATS Analyzer Types
// ============================================================================

/// Contact information for ATS analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactInfo {
    pub name: String,
    pub email: String,
    pub phone: String,
    pub location: String,
    pub linkedin: Option<String>,
    pub github: Option<String>,
    pub website: Option<String>,
}

/// Work experience entry for ATS analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Experience {
    pub title: String,
    pub company: String,
    pub location: String,
    pub start_date: String,
    pub end_date: String, // "Present" for current
    pub achievements: Vec<String>,
    pub current: bool,
}

/// Education entry for ATS analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Education {
    pub degree: String,
    pub institution: String,
    pub location: String,
    pub graduation_date: String,
    pub gpa: Option<f64>,
    pub honors: Vec<String>,
}

/// Skill for ATS analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub name: String,
    pub category: String,
    pub proficiency: Option<String>,
}

/// Complete resume data for ATS analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeData {
    pub contact_info: ContactInfo,
    pub summary: String,
    pub experience: Vec<Experience>,
    pub skills: Vec<Skill>,
    pub education: Vec<Education>,
    pub certifications: Vec<String>,
    pub projects: Vec<String>,
    pub custom_sections: HashMap<String, Vec<String>>,
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
