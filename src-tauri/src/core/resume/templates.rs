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
use std::str::FromStr;

/// Template identifier
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum TemplateId {
    Classic,   // Traditional chronological, readable by common systems
    Modern,    // Clean design with readable structure
    Technical, // Skills-first template; stable internal id
    Executive, // Summary-focused for senior roles
    Military,  // Veteran→civilian with clearance support
}

impl TemplateId {
    pub fn as_str(&self) -> &'static str {
        match self {
            TemplateId::Classic => "classic",
            TemplateId::Modern => "modern",
            TemplateId::Technical => "technical",
            TemplateId::Executive => "executive",
            TemplateId::Military => "military",
        }
    }
}

impl FromStr for TemplateId {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "classic" => Ok(TemplateId::Classic),
            "modern" => Ok(TemplateId::Modern),
            "technical" => Ok(TemplateId::Technical),
            "executive" => Ok(TemplateId::Executive),
            "military" => Ok(TemplateId::Military),
            _ => Err("Invalid template ID".to_string()),
        }
    }
}

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

/// Structured resume data for rendering
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeData {
    pub contact: ContactInfo,
    pub summary: Option<String>,
    pub experience: Vec<Experience>,
    pub education: Vec<Education>,
    pub skills: Vec<SkillCategory>,
    pub certifications: Vec<Certification>,
    pub clearance: Option<String>,     // For military template
    pub military_info: Option<String>, // MOS/rating for military template
}

/// Template renderer
pub struct TemplateRenderer;

impl TemplateRenderer {
    /// List all available templates
    pub fn list_templates() -> Vec<Template> {
        vec![
            Template {
                id: TemplateId::Classic,
                name: "Classic Professional",
                description:
                    "Traditional chronological format with clear sections. Works with most upload forms.",
                preview_image: "/templates/classic-preview.png",
            },
            Template {
                id: TemplateId::Modern,
                name: "Modern Minimal",
                description: "Clean, contemporary design with subtle styling and readable structure.",
                preview_image: "/templates/modern-preview.png",
            },
            Template {
                id: TemplateId::Technical,
                name: "Skills-First",
                description: "Highlights relevant skills and projects when skills matter most.",
                preview_image: "/templates/technical-preview.png",
            },
            Template {
                id: TemplateId::Executive,
                name: "Executive Summary",
                description:
                    "Highlights leadership and impact metrics. Ideal for senior positions.",
                preview_image: "/templates/executive-preview.png",
            },
            Template {
                id: TemplateId::Military,
                name: "Military Transition",
                description:
                    "Translates military experience for civilian employers. Includes clearance.",
                preview_image: "/templates/military-preview.png",
            },
        ]
    }

    /// Render resume data to HTML using specified template
    pub fn render_html(resume: &ResumeData, template: TemplateId) -> String {
        match template {
            TemplateId::Classic => Self::render_classic(resume),
            TemplateId::Modern => Self::render_modern(resume),
            TemplateId::Technical => Self::render_technical(resume),
            TemplateId::Executive => Self::render_executive(resume),
            TemplateId::Military => Self::render_military(resume),
        }
    }

    /// Render resume as plain text (ATS fallback)
    pub fn render_plain_text(resume: &ResumeData) -> String {
        let mut text = String::new();

        // Contact
        text.push_str(&format!("{}\n", resume.contact.name));
        text.push_str(&format!("{}\n", resume.contact.email));
        if let Some(phone) = &resume.contact.phone {
            text.push_str(&format!("{}\n", phone));
        }
        if let Some(location) = &resume.contact.location {
            text.push_str(&format!("{}\n", location));
        }
        text.push_str("\n");

        // Summary
        if let Some(summary) = &resume.summary {
            text.push_str("SUMMARY\n");
            text.push_str(&format!("{}\n\n", summary));
        }

        // Experience
        if !resume.experience.is_empty() {
            text.push_str("EXPERIENCE\n\n");
            for exp in &resume.experience {
                let end = exp.end_date.as_deref().unwrap_or("Present");
                text.push_str(&format!(
                    "{} | {} | {} - {}\n",
                    exp.title, exp.company, exp.start_date, end
                ));
                for achievement in &exp.achievements {
                    text.push_str(&format!("• {}\n", achievement));
                }
                text.push_str("\n");
            }
        }

        // Education
        if !resume.education.is_empty() {
            text.push_str("EDUCATION\n\n");
            for edu in &resume.education {
                text.push_str(&format!("{}\n{}\n", edu.degree, edu.institution));
                if let Some(grad) = &edu.graduation_date {
                    text.push_str(&format!("Graduated: {}\n", grad));
                }
                text.push_str("\n");
            }
        }

        // Skills
        if !resume.skills.is_empty() {
            text.push_str("SKILLS\n\n");
            for category in &resume.skills {
                text.push_str(&format!("{}: ", category.name));
                text.push_str(&category.skills.join(", "));
                text.push_str("\n");
            }
        }

        text
    }

    // Classic template: traditional chronological
    fn render_classic(resume: &ResumeData) -> String {
        let mut html = Self::html_header("Classic Resume", Self::classic_styles());

        // Name centered
        html.push_str(&format!(
            "<h1 class=\"name\">{}</h1>\n",
            escape_html(&resume.contact.name)
        ));

        // Contact info
        html.push_str("<div class=\"contact\">\n");
        html.push_str(&format!("{}", escape_html(&resume.contact.email)));
        if let Some(phone) = &resume.contact.phone {
            html.push_str(&format!(" • {}", escape_html(phone)));
        }
        if let Some(location) = &resume.contact.location {
            html.push_str(&format!(" • {}", escape_html(location)));
        }
        html.push_str("\n</div>\n\n");

        // Summary
        if let Some(summary) = &resume.summary {
            html.push_str("<h2>SUMMARY</h2>\n");
            html.push_str(&format!("<p>{}</p>\n\n", escape_html(summary)));
        }

        // Experience
        if !resume.experience.is_empty() {
            html.push_str("<h2>EXPERIENCE</h2>\n");
            for exp in &resume.experience {
                html.push_str("<div class=\"experience-item\">\n");
                html.push_str(&format!("<h3>{}</h3>\n", escape_html(&exp.title)));
                html.push_str(&format!(
                    "<div class=\"company\">{}</div>\n",
                    escape_html(&exp.company)
                ));
                let end = exp.end_date.as_deref().unwrap_or("Present");
                html.push_str(&format!(
                    "<div class=\"dates\">{} - {}</div>\n",
                    escape_html(&exp.start_date),
                    escape_html(end)
                ));
                html.push_str("<ul>\n");
                for achievement in &exp.achievements {
                    html.push_str(&format!("<li>{}</li>\n", escape_html(achievement)));
                }
                html.push_str("</ul>\n</div>\n\n");
            }
        }

        // Education
        if !resume.education.is_empty() {
            html.push_str("<h2>EDUCATION</h2>\n");
            for edu in &resume.education {
                html.push_str("<div class=\"education-item\">\n");
                html.push_str(&format!("<h3>{}</h3>\n", escape_html(&edu.degree)));
                html.push_str(&format!(
                    "<div class=\"institution\">{}</div>\n",
                    escape_html(&edu.institution)
                ));
                if let Some(grad) = &edu.graduation_date {
                    html.push_str(&format!(
                        "<div class=\"dates\">{}</div>\n",
                        escape_html(grad)
                    ));
                }
                html.push_str("</div>\n\n");
            }
        }

        // Skills
        if !resume.skills.is_empty() {
            html.push_str("<h2>SKILLS</h2>\n");
            for category in &resume.skills {
                html.push_str(&format!(
                    "<div class=\"skill-category\"><strong>{}:</strong> {}</div>\n",
                    escape_html(&category.name),
                    escape_html(&category.skills.join(", "))
                ));
            }
        }

        html.push_str("</body>\n</html>");
        html
    }

    // Modern template: clean minimal design
    fn render_modern(resume: &ResumeData) -> String {
        let mut html = Self::html_header("Modern Resume", Self::modern_styles());

        // Name left-aligned, bold
        html.push_str(&format!(
            "<h1 class=\"name\">{}</h1>\n",
            escape_html(&resume.contact.name)
        ));

        // Contact info
        html.push_str("<div class=\"contact\">\n");
        html.push_str(&format!("{}", escape_html(&resume.contact.email)));
        if let Some(phone) = &resume.contact.phone {
            html.push_str(&format!(" • {}", escape_html(phone)));
        }
        if let Some(location) = &resume.contact.location {
            html.push_str(&format!(" • {}", escape_html(location)));
        }
        html.push_str("\n</div>\n\n");

        html.push_str("<hr class=\"section-divider\">\n\n");

        // Summary
        if let Some(summary) = &resume.summary {
            html.push_str("<h2>SUMMARY</h2>\n");
            html.push_str(&format!("<p>{}</p>\n\n", escape_html(summary)));
            html.push_str("<hr class=\"section-divider\">\n\n");
        }

        // Experience
        if !resume.experience.is_empty() {
            html.push_str("<h2>EXPERIENCE</h2>\n");
            for exp in &resume.experience {
                html.push_str("<div class=\"experience-item\">\n");
                html.push_str(&format!("<h3>{}</h3>\n", escape_html(&exp.title)));
                html.push_str(&format!(
                    "<div class=\"company\">{}</div>\n",
                    escape_html(&exp.company)
                ));
                let end = exp.end_date.as_deref().unwrap_or("Present");
                html.push_str(&format!(
                    "<div class=\"dates\">{} - {}</div>\n",
                    escape_html(&exp.start_date),
                    escape_html(end)
                ));
                html.push_str("<ul>\n");
                for achievement in &exp.achievements {
                    html.push_str(&format!("<li>{}</li>\n", escape_html(achievement)));
                }
                html.push_str("</ul>\n</div>\n\n");
            }
            html.push_str("<hr class=\"section-divider\">\n\n");
        }

        // Education
        if !resume.education.is_empty() {
            html.push_str("<h2>EDUCATION</h2>\n");
            for edu in &resume.education {
                html.push_str("<div class=\"education-item\">\n");
                html.push_str(&format!("<h3>{}</h3>\n", escape_html(&edu.degree)));
                html.push_str(&format!(
                    "<div class=\"institution\">{}</div>\n",
                    escape_html(&edu.institution)
                ));
                if let Some(grad) = &edu.graduation_date {
                    html.push_str(&format!(
                        "<div class=\"dates\">{}</div>\n",
                        escape_html(grad)
                    ));
                }
                html.push_str("</div>\n\n");
            }
            html.push_str("<hr class=\"section-divider\">\n\n");
        }

        // Skills
        if !resume.skills.is_empty() {
            html.push_str("<h2>SKILLS</h2>\n");
            for category in &resume.skills {
                html.push_str(&format!(
                    "<div class=\"skill-category\"><strong>{}:</strong> {}</div>\n",
                    escape_html(&category.name),
                    escape_html(&category.skills.join(", "))
                ));
            }
        }

        html.push_str("</body>\n</html>");
        html
    }

    // Skills-first template.
    fn render_technical(resume: &ResumeData) -> String {
        let mut html = Self::html_header("Skills-First Resume", Self::technical_styles());

        // Name
        html.push_str(&format!(
            "<h1 class=\"name\">{}</h1>\n",
            escape_html(&resume.contact.name)
        ));

        // Contact
        html.push_str("<div class=\"contact\">\n");
        html.push_str(&format!("{}", escape_html(&resume.contact.email)));
        if let Some(phone) = &resume.contact.phone {
            html.push_str(&format!(" • {}", escape_html(phone)));
        }
        if let Some(location) = &resume.contact.location {
            html.push_str(&format!(" • {}", escape_html(location)));
        }
        html.push_str("\n</div>\n\n");

        // Summary
        if let Some(summary) = &resume.summary {
            html.push_str("<h2>SUMMARY</h2>\n");
            html.push_str(&format!("<p>{}</p>\n\n", escape_html(summary)));
        }

        // Skills FIRST (technical emphasis)
        if !resume.skills.is_empty() {
            html.push_str("<h2>TECHNICAL SKILLS</h2>\n");
            for category in &resume.skills {
                html.push_str("<div class=\"skill-category\">\n");
                html.push_str(&format!(
                    "<strong>{}:</strong> {}\n",
                    escape_html(&category.name),
                    escape_html(&category.skills.join(", "))
                ));
                html.push_str("</div>\n");
            }
            html.push_str("\n");
        }

        // Experience
        if !resume.experience.is_empty() {
            html.push_str("<h2>EXPERIENCE</h2>\n");
            for exp in &resume.experience {
                html.push_str("<div class=\"experience-item\">\n");
                html.push_str(&format!("<h3>{}</h3>\n", escape_html(&exp.title)));
                html.push_str(&format!(
                    "<div class=\"company\">{}</div>\n",
                    escape_html(&exp.company)
                ));
                let end = exp.end_date.as_deref().unwrap_or("Present");
                html.push_str(&format!(
                    "<div class=\"dates\">{} - {}</div>\n",
                    escape_html(&exp.start_date),
                    escape_html(end)
                ));
                html.push_str("<ul>\n");
                for achievement in &exp.achievements {
                    html.push_str(&format!("<li>{}</li>\n", escape_html(achievement)));
                }
                html.push_str("</ul>\n</div>\n\n");
            }
        }

        // Education
        if !resume.education.is_empty() {
            html.push_str("<h2>EDUCATION</h2>\n");
            for edu in &resume.education {
                html.push_str("<div class=\"education-item\">\n");
                html.push_str(&format!("<h3>{}</h3>\n", escape_html(&edu.degree)));
                html.push_str(&format!(
                    "<div class=\"institution\">{}</div>\n",
                    escape_html(&edu.institution)
                ));
                html.push_str("</div>\n\n");
            }
        }

        html.push_str("</body>\n</html>");
        html
    }

    // Executive template: summary and impact focused
    fn render_executive(resume: &ResumeData) -> String {
        let mut html = Self::html_header("Executive Resume", Self::executive_styles());

        // Name
        html.push_str(&format!(
            "<h1 class=\"name\">{}</h1>\n",
            escape_html(&resume.contact.name)
        ));

        // Contact
        html.push_str("<div class=\"contact\">\n");
        html.push_str(&format!("{}", escape_html(&resume.contact.email)));
        if let Some(phone) = &resume.contact.phone {
            html.push_str(&format!(" • {}", escape_html(phone)));
        }
        if let Some(location) = &resume.contact.location {
            html.push_str(&format!(" • {}", escape_html(location)));
        }
        html.push_str("\n</div>\n\n");

        // Summary (EMPHASIZED)
        if let Some(summary) = &resume.summary {
            html.push_str("<h2>EXECUTIVE SUMMARY</h2>\n");
            html.push_str("<div class=\"executive-summary\">\n");
            html.push_str(&format!("<p>{}</p>\n", escape_html(summary)));
            html.push_str("</div>\n\n");
        }

        // Experience
        if !resume.experience.is_empty() {
            html.push_str("<h2>LEADERSHIP EXPERIENCE</h2>\n");
            for exp in &resume.experience {
                html.push_str("<div class=\"experience-item\">\n");
                html.push_str(&format!("<h3>{}</h3>\n", escape_html(&exp.title)));
                html.push_str(&format!(
                    "<div class=\"company\">{}</div>\n",
                    escape_html(&exp.company)
                ));
                let end = exp.end_date.as_deref().unwrap_or("Present");
                html.push_str(&format!(
                    "<div class=\"dates\">{} - {}</div>\n",
                    escape_html(&exp.start_date),
                    escape_html(end)
                ));
                html.push_str("<ul class=\"achievements\">\n");
                for achievement in &exp.achievements {
                    html.push_str(&format!("<li>{}</li>\n", escape_html(achievement)));
                }
                html.push_str("</ul>\n</div>\n\n");
            }
        }

        // Education
        if !resume.education.is_empty() {
            html.push_str("<h2>EDUCATION</h2>\n");
            for edu in &resume.education {
                html.push_str("<div class=\"education-item\">\n");
                html.push_str(&format!("<h3>{}</h3>\n", escape_html(&edu.degree)));
                html.push_str(&format!(
                    "<div class=\"institution\">{}</div>\n",
                    escape_html(&edu.institution)
                ));
                html.push_str("</div>\n\n");
            }
        }

        // Skills
        if !resume.skills.is_empty() {
            html.push_str("<h2>CORE COMPETENCIES</h2>\n");
            for category in &resume.skills {
                html.push_str(&format!(
                    "<div class=\"skill-category\"><strong>{}:</strong> {}</div>\n",
                    escape_html(&category.name),
                    escape_html(&category.skills.join(", "))
                ));
            }
        }

        html.push_str("</body>\n</html>");
        html
    }

    // Military template: veteran transition
    fn render_military(resume: &ResumeData) -> String {
        let mut html = Self::html_header("Military Resume", Self::military_styles());

        // Name
        html.push_str(&format!(
            "<h1 class=\"name\">{}</h1>\n",
            escape_html(&resume.contact.name)
        ));

        // Contact
        html.push_str("<div class=\"contact\">\n");
        html.push_str(&format!("{}", escape_html(&resume.contact.email)));
        if let Some(phone) = &resume.contact.phone {
            html.push_str(&format!(" • {}", escape_html(phone)));
        }
        if let Some(location) = &resume.contact.location {
            html.push_str(&format!(" • {}", escape_html(location)));
        }
        html.push_str("\n</div>\n\n");

        // Clearance (PROMINENT)
        if let Some(clearance) = &resume.clearance {
            html.push_str("<div class=\"clearance\">\n");
            html.push_str(&format!(
                "<strong>Security Clearance:</strong> {}\n",
                escape_html(clearance)
            ));
            html.push_str("</div>\n\n");
        }

        // Summary
        if let Some(summary) = &resume.summary {
            html.push_str("<h2>SUMMARY</h2>\n");
            html.push_str(&format!("<p>{}</p>\n\n", escape_html(summary)));
        }

        // Experience (with military context)
        if !resume.experience.is_empty() {
            html.push_str("<h2>EXPERIENCE</h2>\n");
            for exp in &resume.experience {
                html.push_str("<div class=\"experience-item\">\n");
                html.push_str(&format!("<h3>{}</h3>\n", escape_html(&exp.title)));
                html.push_str(&format!(
                    "<div class=\"company\">{}</div>\n",
                    escape_html(&exp.company)
                ));
                let end = exp.end_date.as_deref().unwrap_or("Present");
                html.push_str(&format!(
                    "<div class=\"dates\">{} - {}</div>\n",
                    escape_html(&exp.start_date),
                    escape_html(end)
                ));
                html.push_str("<ul>\n");
                for achievement in &exp.achievements {
                    html.push_str(&format!("<li>{}</li>\n", escape_html(achievement)));
                }
                html.push_str("</ul>\n</div>\n\n");
            }
        }

        // Education
        if !resume.education.is_empty() {
            html.push_str("<h2>EDUCATION</h2>\n");
            for edu in &resume.education {
                html.push_str("<div class=\"education-item\">\n");
                html.push_str(&format!("<h3>{}</h3>\n", escape_html(&edu.degree)));
                html.push_str(&format!(
                    "<div class=\"institution\">{}</div>\n",
                    escape_html(&edu.institution)
                ));
                html.push_str("</div>\n\n");
            }
        }

        // Skills
        if !resume.skills.is_empty() {
            html.push_str("<h2>SKILLS & QUALIFICATIONS</h2>\n");
            for category in &resume.skills {
                html.push_str(&format!(
                    "<div class=\"skill-category\"><strong>{}:</strong> {}</div>\n",
                    escape_html(&category.name),
                    escape_html(&category.skills.join(", "))
                ));
            }
        }

        html.push_str("</body>\n</html>");
        html
    }

    // HTML document structure
    fn html_header(title: &str, styles: &str) -> String {
        format!(
            r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{}</title>
<style>
{}
</style>
</head>
<body>
"#,
            escape_html(title),
            styles
        )
    }

    // Classic styles
    fn classic_styles() -> &'static str {
        r#"
body {
    font-family: Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.5in;
}
.name {
    font-size: 24pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 8pt 0;
}
.contact {
    text-align: center;
    font-size: 10pt;
    margin-bottom: 16pt;
}
h2 {
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 16pt 0 8pt 0;
    border-bottom: 1pt solid #000;
    padding-bottom: 4pt;
}
h3 {
    font-size: 12pt;
    font-weight: bold;
    margin: 8pt 0 4pt 0;
}
.company, .institution {
    font-size: 11pt;
    font-style: italic;
    margin-bottom: 2pt;
}
.dates {
    font-size: 10pt;
    color: #333;
    margin-bottom: 4pt;
}
ul {
    margin: 4pt 0 12pt 20pt;
    padding: 0;
}
li {
    margin-bottom: 4pt;
}
.skill-category {
    margin-bottom: 6pt;
}
"#
    }

    // Modern styles
    fn modern_styles() -> &'static str {
        r#"
body {
    font-family: Calibri, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #222;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.5in;
}
.name {
    font-size: 28pt;
    font-weight: bold;
    margin: 0 0 8pt 0;
}
.contact {
    font-size: 10pt;
    margin-bottom: 16pt;
    color: #555;
}
.section-divider {
    border: none;
    border-top: 1pt solid #ccc;
    margin: 16pt 0;
}
h2 {
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1pt;
    margin: 16pt 0 8pt 0;
    color: #000;
}
h3 {
    font-size: 12pt;
    font-weight: bold;
    margin: 8pt 0 4pt 0;
}
.company, .institution {
    font-size: 11pt;
    color: #555;
    margin-bottom: 2pt;
}
.dates {
    font-size: 10pt;
    color: #777;
    margin-bottom: 4pt;
}
ul {
    margin: 4pt 0 12pt 20pt;
    padding: 0;
}
li {
    margin-bottom: 4pt;
}
.skill-category {
    margin-bottom: 8pt;
}
"#
    }

    // Technical styles
    fn technical_styles() -> &'static str {
        r#"
body {
    font-family: Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.5in;
}
.name {
    font-size: 22pt;
    font-weight: bold;
    margin: 0 0 8pt 0;
}
.contact {
    font-size: 10pt;
    margin-bottom: 16pt;
}
h2 {
    font-size: 13pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 16pt 0 8pt 0;
    border-bottom: 2pt solid #000;
    padding-bottom: 4pt;
}
h3 {
    font-size: 11pt;
    font-weight: bold;
    margin: 8pt 0 4pt 0;
}
.company, .institution {
    font-size: 10pt;
    margin-bottom: 2pt;
}
.dates {
    font-size: 10pt;
    color: #333;
    margin-bottom: 4pt;
}
ul {
    margin: 4pt 0 12pt 20pt;
    padding: 0;
}
li {
    margin-bottom: 3pt;
}
.skill-category {
    margin-bottom: 6pt;
    line-height: 1.6;
}
"#
    }

    // Executive styles
    fn executive_styles() -> &'static str {
        r#"
body {
    font-family: Times New Roman, serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #000;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.5in;
}
.name {
    font-size: 26pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 8pt 0;
}
.contact {
    text-align: center;
    font-size: 10pt;
    margin-bottom: 20pt;
}
h2 {
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 20pt 0 10pt 0;
    border-bottom: 2pt solid #000;
    padding-bottom: 4pt;
}
.executive-summary {
    background-color: #f5f5f5;
    padding: 12pt;
    margin-bottom: 16pt;
    border-left: 4pt solid #000;
}
h3 {
    font-size: 12pt;
    font-weight: bold;
    margin: 10pt 0 4pt 0;
}
.company, .institution {
    font-size: 11pt;
    font-style: italic;
    margin-bottom: 2pt;
}
.dates {
    font-size: 10pt;
    color: #444;
    margin-bottom: 4pt;
}
ul.achievements {
    margin: 6pt 0 16pt 20pt;
    padding: 0;
}
li {
    margin-bottom: 6pt;
}
.skill-category {
    margin-bottom: 8pt;
}
"#
    }

    // Military styles
    fn military_styles() -> &'static str {
        r#"
body {
    font-family: Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.5in;
}
.name {
    font-size: 24pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 8pt 0;
}
.contact {
    text-align: center;
    font-size: 10pt;
    margin-bottom: 12pt;
}
.clearance {
    text-align: center;
    font-size: 12pt;
    background-color: #f0f0f0;
    padding: 8pt;
    margin-bottom: 16pt;
    border: 1pt solid #000;
}
h2 {
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 16pt 0 8pt 0;
    border-bottom: 2pt solid #000;
    padding-bottom: 4pt;
}
h3 {
    font-size: 12pt;
    font-weight: bold;
    margin: 8pt 0 4pt 0;
}
.company, .institution {
    font-size: 11pt;
    margin-bottom: 2pt;
}
.dates {
    font-size: 10pt;
    color: #333;
    margin-bottom: 4pt;
}
ul {
    margin: 4pt 0 12pt 20pt;
    padding: 0;
}
li {
    margin-bottom: 4pt;
}
.skill-category {
    margin-bottom: 6pt;
}
"#
    }
}

// HTML escape utility
fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

#[cfg(test)]
#[path = "templates_tests.rs"]
mod tests;
