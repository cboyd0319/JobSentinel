//! Application-readable resume templates for HTML rendering
//!
//! Provides 5 professional resume templates that render structured resume data
//! to clear HTML. All templates follow application readability rules:
//! - Single-column layout only
//! - Standard fonts (Arial, Calibri, Times New Roman)
//! - No tables, graphics, or icons
//! - Clear section headers
//! - Proper heading hierarchy

use serde::{Deserialize, Serialize};

pub(crate) use crate::structured_resume::TemplateId;

mod styles;

mod renderer;
pub use renderer::TemplateRenderer;

/// Template metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Template {
    pub id: TemplateId,
    pub name: &'static str,
    pub description: &'static str,
    pub preview_image: &'static str,
}

/// Contact information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactInfo {
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub location: Option<String>,
    pub linkedin: Option<String>,
    pub website: Option<String>,
}

/// Work experience entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Experience {
    pub title: String,
    pub company: String,
    pub location: Option<String>,
    pub start_date: String,
    pub end_date: Option<String>, // None = current
    pub achievements: Vec<String>,
}

/// Education entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Education {
    pub degree: String,
    pub institution: String,
    pub location: Option<String>,
    pub graduation_date: Option<String>,
    pub gpa: Option<String>,
    pub honors: Vec<String>,
}

/// Skill category with skills
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillCategory {
    pub name: String,
    pub skills: Vec<String>,
}

/// Certification entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Certification {
    pub name: String,
    pub issuer: String,
    pub date: Option<String>,
    pub expiry: Option<String>,
}

/// Project entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub name: String,
    pub description: String,
    pub technologies: Vec<String>,
    pub url: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

/// Structured resume data for rendering
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeData {
    pub contact: ContactInfo,
    pub summary: Option<String>,
    pub experience: Vec<Experience>,
    pub education: Vec<Education>,
    pub skills: Vec<SkillCategory>,
    pub certifications: Vec<Certification>,
    pub projects: Vec<Project>,
    pub clearance: Option<String>,     // For military template
    pub military_info: Option<String>, // MOS/rating for military template
}

#[cfg(test)]
#[path = "templates_tests.rs"]
mod tests;
