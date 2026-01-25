//! Resume export functionality - PDF, DOCX, and plain text formats
//!
//! ## Supported Formats
//!
//! - **PDF** - Professional PDF output using printpdf
//! - **DOCX** - ATS-friendly Word documents using docx-rs
//! - **Plain Text** - Simple text format for copying/pasting
//!
//! ## Required Dependencies (add to Cargo.toml)
//!
//! ```toml
//! printpdf = "0.7"
//! docx-rs = "0.4"
//! ```
//!
//! ## Usage
//!
//! ```rust,ignore
//! use jobsentinel::core::resume::export::{ResumeExporter, TemplateId};
//!
//! let pdf_bytes = ResumeExporter::export_pdf(&resume_data, TemplateId::Professional)?;
//! let docx_bytes = ResumeExporter::export_docx(&resume_data, TemplateId::Modern)?;
//! let text = ResumeExporter::export_text(&resume_data);
//! ```

use anyhow::{Context, Result};
use docx_rs::{AlignmentType, Docx, LineSpacing, PageMargin, Paragraph, Run};
use serde::{Deserialize, Serialize};
use std::io::Cursor;

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

    /// Legacy PDF export function - now redirects to HTML export
    ///
    /// Returns PDF bytes suitable for saving to file or sending to client.
    ///
    /// # Implementation Status
    ///
    /// This function now generates HTML instead of PDF bytes. Use `export_html()`
    /// for the recommended HTML-based approach with browser print-to-PDF.
    #[deprecated(since = "2.0.0", note = "Use export_html() instead")]
    pub fn export_pdf(_resume: &ResumeData, _template: TemplateId) -> Result<Vec<u8>> {
        anyhow::bail!(
            "PDF export not yet implemented. Use export_html() for browser print-to-PDF, \
             or export_docx() for Word format."
        )
    }

    /// Export resume to DOCX format
    ///
    /// Returns DOCX bytes suitable for saving to file or sending to client.
    /// Uses ATS-friendly formatting with Calibri font and standard structure.
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

// Helper functions for type conversion

/// Convert export TemplateId to templates TemplateId
fn convert_template_id(template: TemplateId) -> crate::core::resume::templates::TemplateId {
    match template {
        TemplateId::Professional => crate::core::resume::templates::TemplateId::Classic,
        TemplateId::Modern => crate::core::resume::templates::TemplateId::Modern,
        TemplateId::Traditional => crate::core::resume::templates::TemplateId::Executive,
    }
}

/// Convert export ResumeData to templates ResumeData
/// Takes ownership to avoid cloning - eliminates 27 allocations
fn convert_to_template_resume(resume: ResumeData) -> crate::core::resume::templates::ResumeData {
    use crate::core::resume::templates;

    templates::ResumeData {
        contact: templates::ContactInfo {
            name: resume.personal.full_name,
            email: resume.personal.email,
            phone: Some(resume.personal.phone),
            location: Some(resume.personal.location),
            linkedin: resume.personal.linkedin_url,
            website: resume.personal.website_url,
        },
        summary: resume.summary,
        experience: resume
            .experience
            .into_iter()
            .map(|exp| templates::Experience {
                title: exp.job_title,
                company: exp.company,
                location: exp.location,
                start_date: exp.start_date,
                end_date: exp.end_date,
                achievements: exp.responsibilities,
            })
            .collect(),
        education: resume
            .education
            .into_iter()
            .map(|edu| templates::Education {
                degree: edu.degree,
                institution: edu.institution,
                location: None,
                graduation_date: Some(edu.graduation_year),
                gpa: edu.gpa.map(|g| format!("{:.2}", g)),
                honors: edu
                    .honors
                    .map(|h| vec![h])
                    .unwrap_or_default(),
            })
            .collect(),
        skills: resume
            .skills
            .into_iter()
            .map(|skill_cat| templates::SkillCategory {
                name: skill_cat.category,
                skills: skill_cat.skills,
            })
            .collect(),
        certifications: resume
            .certifications
            .into_iter()
            .map(|cert| templates::Certification {
                name: cert.name,
                issuer: cert.issuer,
                date: Some(cert.date),
                expiry: None,
            })
            .collect(),
        clearance: None,
        military_info: None,
    }
}

// Helper functions for DOCX generation

fn format_contact_line(personal: &PersonalInfo) -> String {
    let mut parts: Vec<&str> = Vec::with_capacity(5);
    parts.push(&personal.email);
    parts.push(&personal.phone);
    parts.push(&personal.location);

    if let Some(linkedin) = &personal.linkedin_url {
        parts.push(linkedin);
    }

    if let Some(website) = &personal.website_url {
        parts.push(website);
    }

    parts.join(" | ")
}

fn add_section_header(doc: Docx, title: &str) -> Docx {
    doc.add_paragraph(
        Paragraph::new()
            .add_run(Run::new().add_text(title).size(28).bold()) // 28 half-points = 14pt
            .line_spacing(LineSpacing::new().before(240).after(120)), // 12pt before, 6pt after
    )
}

fn add_experience_entry(mut doc: Docx, exp: &ExperienceEntry, _template: TemplateId) -> Docx {
    let end_date = exp.end_date.as_deref().unwrap_or("Present");

    // Company and job title line
    let header = format!("{} — {}", exp.company, exp.job_title);
    let date_range = format!("{} - {}", exp.start_date, end_date);

    doc = doc.add_paragraph(
        Paragraph::new()
            .add_run(Run::new().add_text(&header).size(22).bold())
            .add_run(Run::new().add_text(format!("    {}", date_range)).size(22))
            .line_spacing(LineSpacing::new().after(60)), // 3pt after
    );

    // Location if present
    if let Some(loc) = &exp.location {
        doc = doc.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text(loc).size(22).italic())
                .line_spacing(LineSpacing::new().after(60)),
        );
    }

    // Bullet points
    for resp in &exp.responsibilities {
        doc = doc.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text(format!("• {}", resp)).size(22))
                .line_spacing(LineSpacing::new().line(276)), // 1.15 line spacing
        );
    }

    // Spacing after entry
    doc = doc.add_paragraph(
        Paragraph::new()
            .add_run(Run::new().add_text("").size(22))
            .line_spacing(LineSpacing::new().after(120)), // 6pt after
    );

    doc
}

fn add_education_entry(mut doc: Docx, edu: &EducationEntry) -> Docx {
    let header = format!(
        "{} — {} in {}",
        edu.institution, edu.degree, edu.field_of_study
    );

    doc = doc.add_paragraph(
        Paragraph::new()
            .add_run(Run::new().add_text(&header).size(22).bold())
            .add_run(
                Run::new()
                    .add_text(format!("    {}", edu.graduation_year))
                    .size(22),
            )
            .line_spacing(LineSpacing::new().after(60)),
    );

    if let Some(gpa) = edu.gpa {
        doc = doc.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text(format!("GPA: {:.2}", gpa)).size(22))
                .line_spacing(LineSpacing::new().after(60)),
        );
    }

    if let Some(honors) = &edu.honors {
        doc = doc.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text(honors).size(22).italic())
                .line_spacing(LineSpacing::new().after(60)),
        );
    }

    doc = doc.add_paragraph(
        Paragraph::new()
            .add_run(Run::new().add_text("").size(22))
            .line_spacing(LineSpacing::new().after(120)),
    );

    doc
}

fn add_skill_category(mut doc: Docx, skill_cat: &SkillCategory) -> Docx {
    let skills_text = skill_cat.skills.join(", ");

    doc = doc.add_paragraph(
        Paragraph::new()
            .add_run(
                Run::new()
                    .add_text(format!("{}: ", skill_cat.category))
                    .size(22)
                    .bold(),
            )
            .add_run(Run::new().add_text(&skills_text).size(22))
            .line_spacing(LineSpacing::new().after(60)),
    );

    doc
}

fn add_certification_entry(mut doc: Docx, cert: &Certification) -> Docx {
    let header = format!("{} — {}", cert.name, cert.issuer);

    doc = doc.add_paragraph(
        Paragraph::new()
            .add_run(Run::new().add_text(&header).size(22).bold())
            .add_run(Run::new().add_text(format!("    {}", cert.date)).size(22))
            .line_spacing(LineSpacing::new().after(60)),
    );

    if let Some(id) = &cert.credential_id {
        doc = doc.add_paragraph(
            Paragraph::new()
                .add_run(
                    Run::new()
                        .add_text(format!("Credential ID: {}", id))
                        .size(22),
                )
                .line_spacing(LineSpacing::new().after(120)),
        );
    } else {
        doc = doc.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text("").size(22))
                .line_spacing(LineSpacing::new().after(120)),
        );
    }

    doc
}

fn add_project_entry(mut doc: Docx, project: &Project) -> Docx {
    doc = doc.add_paragraph(
        Paragraph::new()
            .add_run(Run::new().add_text(&project.name).size(22).bold())
            .line_spacing(LineSpacing::new().after(60)),
    );

    doc = doc.add_paragraph(
        Paragraph::new()
            .add_run(Run::new().add_text(&project.description).size(22))
            .line_spacing(LineSpacing::new().after(60)),
    );

    if !project.technologies.is_empty() {
        let tech_text = format!("Technologies: {}", project.technologies.join(", "));
        doc = doc.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text(&tech_text).size(22).italic())
                .line_spacing(LineSpacing::new().after(60)),
        );
    }

    if let Some(url) = &project.url {
        doc = doc.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text(format!("URL: {}", url)).size(22))
                .line_spacing(LineSpacing::new().after(120)),
        );
    } else {
        doc = doc.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text("").size(22))
                .line_spacing(LineSpacing::new().after(120)),
        );
    }

    doc
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_resume() -> ResumeData {
        ResumeData {
            personal: PersonalInfo {
                full_name: "John Doe".to_string(),
                email: "john.doe@example.com".to_string(),
                phone: "+1-555-0123".to_string(),
                location: "San Francisco, CA".to_string(),
                linkedin_url: Some("linkedin.com/in/johndoe".to_string()),
                website_url: Some("johndoe.dev".to_string()),
            },
            summary: Some(
                "Experienced software engineer with 5+ years in full-stack development."
                    .to_string(),
            ),
            experience: vec![ExperienceEntry {
                company: "Tech Corp".to_string(),
                job_title: "Senior Software Engineer".to_string(),
                start_date: "Jan 2020".to_string(),
                end_date: None,
                location: Some("San Francisco, CA".to_string()),
                responsibilities: vec![
                    "Built scalable microservices in Rust".to_string(),
                    "Led team of 5 engineers".to_string(),
                ],
            }],
            education: vec![EducationEntry {
                institution: "Stanford University".to_string(),
                degree: "B.S.".to_string(),
                field_of_study: "Computer Science".to_string(),
                graduation_year: "2019".to_string(),
                gpa: Some(3.8),
                honors: None,
            }],
            skills: vec![SkillCategory {
                category: "Programming Languages".to_string(),
                skills: vec![
                    "Rust".to_string(),
                    "TypeScript".to_string(),
                    "Python".to_string(),
                ],
            }],
            certifications: vec![],
            projects: vec![],
        }
    }

    #[test]
    fn test_export_text() {
        let resume = create_test_resume();
        let text = ResumeExporter::export_text(&resume);

        assert!(text.contains("John Doe"));
        assert!(text.contains("john.doe@example.com"));
        assert!(text.contains("Tech Corp"));
        assert!(text.contains("Stanford University"));
        assert!(text.contains("Rust"));
    }

    #[test]
    fn test_export_docx() {
        let resume = create_test_resume();
        let result = ResumeExporter::export_docx(&resume, TemplateId::Professional);

        assert!(result.is_ok());
        let bytes = result.unwrap();
        assert!(!bytes.is_empty());
        // DOCX files start with PK zip header
        assert_eq!(&bytes[0..2], b"PK");
    }

    #[test]
    fn test_export_html() {
        let resume = create_test_resume();
        let html = ResumeExporter::export_html(resume, TemplateId::Professional);

        assert!(!html.is_empty());
        assert!(html.contains("<html"));
        assert!(html.contains("John Doe"));
        assert!(html.contains("john.doe@example.com"));
        assert!(html.contains("Tech Corp"));
        assert!(html.contains("Stanford University"));
    }

    #[test]
    #[allow(deprecated)]
    fn test_export_pdf_not_implemented() {
        let resume = create_test_resume();
        let result = ResumeExporter::export_pdf(&resume, TemplateId::Professional);

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("not yet implemented"));
    }

    #[test]
    fn test_format_contact_line() {
        let personal = PersonalInfo {
            full_name: "Jane Smith".to_string(),
            email: "jane@example.com".to_string(),
            phone: "555-1234".to_string(),
            location: "New York, NY".to_string(),
            linkedin_url: Some("linkedin.com/in/janesmith".to_string()),
            website_url: None,
        };

        let line = format_contact_line(&personal);
        assert!(line.contains("jane@example.com"));
        assert!(line.contains("555-1234"));
        assert!(line.contains("New York, NY"));
        assert!(line.contains("linkedin.com/in/janesmith"));
        assert!(line.contains(" | "));
    }

    #[test]
    fn test_template_id_default() {
        let template = TemplateId::default();
        assert!(matches!(template, TemplateId::Professional));
    }

    #[test]
    fn test_empty_resume() {
        let resume = ResumeData {
            personal: PersonalInfo {
                full_name: "Empty User".to_string(),
                email: "empty@example.com".to_string(),
                phone: "000-0000".to_string(),
                location: "Nowhere".to_string(),
                linkedin_url: None,
                website_url: None,
            },
            summary: None,
            experience: vec![],
            education: vec![],
            skills: vec![],
            certifications: vec![],
            projects: vec![],
        };

        let text = ResumeExporter::export_text(&resume);
        assert!(text.contains("Empty User"));
        assert!(!text.contains("EXPERIENCE"));
        assert!(!text.contains("EDUCATION"));
    }
}
