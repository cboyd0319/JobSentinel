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

// ============================================================================
// Skill Management Types
// ============================================================================

/// Update payload for modifying a user skill
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillUpdate {
    pub skill_name: Option<String>,
    pub skill_category: Option<String>,
    pub proficiency_level: Option<String>,
    pub years_experience: Option<f64>,
}

/// Payload for adding a new skill
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewSkill {
    pub skill_name: String,
    pub skill_category: Option<String>,
    pub proficiency_level: Option<String>,
    pub years_experience: Option<f64>,
}

// ============================================================================
// Experience & Education Matching Types
// ============================================================================

/// Experience requirement extracted from job description
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperienceRequirement {
    /// The skill/technology this requirement applies to (None = general experience)
    pub skill: Option<String>,
    /// Minimum years required
    pub min_years: f64,
    /// Maximum years (for ranges like "3-5 years")
    pub max_years: Option<f64>,
    /// Whether this is a strict requirement or preferred
    pub is_required: bool,
}

/// Education/degree level for matching
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DegreeLevel {
    None = 0,
    HighSchool = 1,
    Associate = 2,
    Bachelor = 3,
    Master = 4,
    PhD = 5,
}

impl DegreeLevel {
    /// Parse degree level from text
    pub fn from_text(text: &str) -> Option<Self> {
        let lower = text.to_lowercase();

        // PhD / Doctorate
        if lower.contains("ph.d") || lower.contains("phd") || lower.contains("doctorate") {
            return Some(DegreeLevel::PhD);
        }

        // Master's
        if lower.contains("master")
            || lower.contains("m.s.")
            || lower.contains("m.a.")
            || lower.contains("mba")
            || lower.contains("ms ")
            || lower.contains("ma ")
        {
            return Some(DegreeLevel::Master);
        }

        // Bachelor's
        if lower.contains("bachelor")
            || lower.contains("b.s.")
            || lower.contains("b.a.")
            || lower.contains("bs ")
            || lower.contains("ba ")
            || lower.contains("undergraduate")
        {
            return Some(DegreeLevel::Bachelor);
        }

        // Associate
        if lower.contains("associate") || lower.contains("a.s.") || lower.contains("a.a.") {
            return Some(DegreeLevel::Associate);
        }

        // High School
        if lower.contains("high school") || lower.contains("ged") || lower.contains("diploma") {
            return Some(DegreeLevel::HighSchool);
        }

        None
    }

    /// Get human-readable name
    pub fn as_str(&self) -> &'static str {
        match self {
            DegreeLevel::None => "No degree",
            DegreeLevel::HighSchool => "High School",
            DegreeLevel::Associate => "Associate's",
            DegreeLevel::Bachelor => "Bachelor's",
            DegreeLevel::Master => "Master's",
            DegreeLevel::PhD => "PhD/Doctorate",
        }
    }
}

impl Default for DegreeLevel {
    fn default() -> Self {
        DegreeLevel::None
    }
}

/// Education requirement extracted from job description
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EducationRequirement {
    /// Minimum degree level required
    pub degree_level: DegreeLevel,
    /// Specific fields of study (CS, Engineering, etc.)
    pub fields: Vec<String>,
    /// Whether this is required or preferred
    pub is_required: bool,
}
