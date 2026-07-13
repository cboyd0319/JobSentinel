//! Resume export functionality - HTML, DOCX, and plain text formats
//!
//! ## Supported Formats
//!
//! - **HTML** - Browser-printable resume output
//! - **DOCX** - Application-readable Word documents using docx-rs
//! - **Plain Text** - Simple text format for copying/pasting
//!
//! ## Usage
//!
//! ```rust,ignore
//! use jobsentinel_core::resume::export::{ResumeExporter, TemplateId};
//!
//! let html = ResumeExporter::export_html(resume_data.clone(), TemplateId::Professional);
//! let docx_bytes = ResumeExporter::export_docx(&resume_data, TemplateId::Modern)?;
//! let text = ResumeExporter::export_text(&resume_data);
//! ```

use anyhow::{Context, Result};
use docx_rs::{AlignmentType, Docx, LineSpacing, PageMargin, Paragraph, Run};
use serde::{Deserialize, Serialize};
use std::io::Cursor;

mod rendering;

use rendering::*;

/// Resume template styles
#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default)]
pub enum TemplateId {
    /// Clean professional template (default)
    #[default]
    Professional,
    /// Modern template with accent colors
    Modern,
    /// Traditional academic-style template
    Traditional,
}

/// Complete resume data for export
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeData {
    /// Personal information
    pub personal: PersonalInfo,
    /// Professional summary
    pub summary: Option<String>,
    /// Work experience entries
    pub experience: Vec<ExperienceEntry>,
    /// Education entries
    pub education: Vec<EducationEntry>,
    /// Skills organized by category
    pub skills: Vec<SkillCategory>,
    /// Certifications (optional)
    pub certifications: Vec<Certification>,
    /// Projects (optional)
    pub projects: Vec<Project>,
}

/// Personal contact information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalInfo {
    pub full_name: String,
    pub email: String,
    pub phone: String,
    pub location: String,
    pub linkedin_url: Option<String>,
    pub website_url: Option<String>,
}

/// Work experience entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperienceEntry {
    pub company: String,
    pub job_title: String,
    pub start_date: String,
    pub end_date: Option<String>, // None means "Present"
    pub location: Option<String>,
    pub responsibilities: Vec<String>, // Bullet points
}

/// Education entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EducationEntry {
    pub institution: String,
    pub degree: String,
    pub field_of_study: String,
    pub graduation_year: String,
    pub gpa: Option<f64>,
    pub honors: Option<String>,
}

/// Skills grouped by category
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillCategory {
    pub category: String, // e.g., "Programming Languages", "Frameworks"
    pub skills: Vec<String>,
}

/// Certification entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Certification {
    pub name: String,
    pub issuer: String,
    pub date: String,
    pub credential_id: Option<String>,
}

/// Project entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub name: String,
    pub description: String,
    pub technologies: Vec<String>,
    pub url: Option<String>,
}

/// Resume exporter service
pub struct ResumeExporter;

impl ResumeExporter {
    /// Export resume to HTML format for browser-based PDF generation
    ///
    /// Returns HTML string that can be opened in a browser and printed to PDF
    /// using the browser's native print functionality. This approach provides:
    /// - Better PDF quality than custom PDF libraries
    /// - No external dependencies
    /// - Professional typography and layout
    ///
    /// **Implementation**: Option A - HTML + browser print (RECOMMENDED)
    pub fn export_html(resume: ResumeData, template: TemplateId) -> String {
        // Convert export types to template types - takes ownership to avoid clones
        let template_resume = convert_to_template_resume(resume);

        // Use existing template renderer for HTML generation
        crate::core::resume::templates::TemplateRenderer::render_html(
            &template_resume,
            convert_template_id(template),
        )
    }

    /// Export resume to DOCX format
    ///
    /// Returns DOCX bytes suitable for saving to file or sending to client.
    /// Uses application-readable formatting with Calibri font and standard structure.
    pub fn export_docx(resume: &ResumeData, template: TemplateId) -> Result<Vec<u8>> {
        // Create new document
        let mut doc = Docx::new();

        // Configure document properties
        doc = doc.page_size(12240, 15840); // Letter size: 8.5" x 11" in twentieths of a point
        doc = doc.page_margin(
            PageMargin::new()
                .top(1440)
                .bottom(1440)
                .left(1440)
                .right(1440),
        ); // 1" margins

        // Add name (centered, 18pt, bold)
        doc = doc.add_paragraph(
            Paragraph::new()
                .add_run(
                    Run::new()
                        .add_text(&resume.personal.full_name)
                        .size(36)
                        .bold(),
                ) // 36 half-points = 18pt
                .align(AlignmentType::Center),
        );

        // Add contact info (centered, 11pt)
        let contact_line = format_contact_line(&resume.personal);
        doc = doc.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text(&contact_line).size(22)) // 22 half-points = 11pt
                .align(AlignmentType::Center)
                .line_spacing(LineSpacing::new().after(240)), // 12pt spacing after
        );

        // Add professional summary if present
        if let Some(summary) = &resume.summary {
            doc = add_section_header(doc, "PROFESSIONAL SUMMARY");
            doc = doc.add_paragraph(
                Paragraph::new()
                    .add_run(Run::new().add_text(summary).size(22))
                    .line_spacing(LineSpacing::new().after(240)),
            );
        }

        // Add experience section
        if !resume.experience.is_empty() {
            doc = add_section_header(doc, "EXPERIENCE");
            for exp in &resume.experience {
                doc = add_experience_entry(doc, exp, template);
            }
        }

        // Add education section
        if !resume.education.is_empty() {
            doc = add_section_header(doc, "EDUCATION");
            for edu in &resume.education {
                doc = add_education_entry(doc, edu);
            }
        }

        // Add skills section
        if !resume.skills.is_empty() {
            doc = add_section_header(doc, "SKILLS");
            for skill_cat in &resume.skills {
                doc = add_skill_category(doc, skill_cat);
            }
        }

        // Add certifications if present
        if !resume.certifications.is_empty() {
            doc = add_section_header(doc, "CERTIFICATIONS");
            for cert in &resume.certifications {
                doc = add_certification_entry(doc, cert);
            }
        }

        // Add projects if present
        if !resume.projects.is_empty() {
            doc = add_section_header(doc, "PROJECTS");
            for project in &resume.projects {
                doc = add_project_entry(doc, project);
            }
        }

        // Build DOCX and return bytes
        let mut buffer = Cursor::new(Vec::new());
        doc.build()
            .pack(&mut buffer)
            .context("Failed to generate DOCX bytes")?;

        Ok(buffer.into_inner())
    }

    /// Export resume to plain text format
    ///
    /// Returns formatted text suitable for copying into online forms
    /// or text-only applications.
    pub fn export_text(resume: &ResumeData) -> String {
        let mut output = String::new();

        // Name and contact
        output.push_str(&resume.personal.full_name);
        output.push('\n');
        output.push_str(&format_contact_line(&resume.personal));
        output.push_str("\n\n");

        // Professional summary
        if let Some(summary) = &resume.summary {
            output.push_str("PROFESSIONAL SUMMARY\n");
            output.push_str("--------------------\n");
            output.push_str(summary);
            output.push_str("\n\n");
        }

        // Experience
        if !resume.experience.is_empty() {
            output.push_str("EXPERIENCE\n");
            output.push_str("----------\n");
            for exp in &resume.experience {
                let end_date = exp.end_date.as_deref().unwrap_or("Present");
                output.push_str(&format!(
                    "{} — {}\n{} - {}\n",
                    exp.company, exp.job_title, exp.start_date, end_date
                ));
                if let Some(loc) = &exp.location {
                    output.push_str(&format!("{}\n", loc));
                }
                for resp in &exp.responsibilities {
                    output.push_str(&format!("• {}\n", resp));
                }
                output.push('\n');
            }
        }

        // Education
        if !resume.education.is_empty() {
            output.push_str("EDUCATION\n");
            output.push_str("---------\n");
            for edu in &resume.education {
                output.push_str(&format!(
                    "{} — {} in {}\n",
                    edu.institution, edu.degree, edu.field_of_study
                ));
                output.push_str(&format!("Graduated: {}\n", edu.graduation_year));
                if let Some(gpa) = edu.gpa {
                    output.push_str(&format!("GPA: {:.2}\n", gpa));
                }
                if let Some(honors) = &edu.honors {
                    output.push_str(&format!("{}\n", honors));
                }
                output.push('\n');
            }
        }

        // Skills
        if !resume.skills.is_empty() {
            output.push_str("SKILLS\n");
            output.push_str("------\n");
            for skill_cat in &resume.skills {
                output.push_str(&format!("{}: ", skill_cat.category));
                output.push_str(&skill_cat.skills.join(", "));
                output.push('\n');
            }
            output.push('\n');
        }

        // Certifications
        if !resume.certifications.is_empty() {
            output.push_str("CERTIFICATIONS\n");
            output.push_str("--------------\n");
            for cert in &resume.certifications {
                output.push_str(&format!("{} — {}\n", cert.name, cert.issuer));
                output.push_str(&format!("Date: {}\n", cert.date));
                if let Some(id) = &cert.credential_id {
                    output.push_str(&format!("Credential ID: {}\n", id));
                }
                output.push('\n');
            }
        }

        // Projects
        if !resume.projects.is_empty() {
            output.push_str("PROJECTS\n");
            output.push_str("--------\n");
            for project in &resume.projects {
                output.push_str(&format!("{}\n", project.name));
                output.push_str(&format!("{}\n", project.description));
                if !project.technologies.is_empty() {
                    output.push_str(&format!(
                        "Technologies: {}\n",
                        project.technologies.join(", ")
                    ));
                }
                if let Some(url) = &project.url {
                    output.push_str(&format!("URL: {}\n", url));
                }
                output.push('\n');
            }
        }

        output
    }
}

#[cfg(test)]
mod tests;
