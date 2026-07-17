use super::{styles, ResumeData, Template, TemplateId};
use jobsentinel_security::encode_html_text as escape_html;

mod variants;

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
            TemplateId::Classic | TemplateId::Professional => Self::render_classic(resume),
            TemplateId::Modern => Self::render_modern(resume),
            TemplateId::Technical => Self::render_technical(resume),
            TemplateId::Executive | TemplateId::Traditional => Self::render_executive(resume),
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

        if !resume.certifications.is_empty() {
            text.push_str("\nCERTIFICATIONS\n\n");
            for cert in &resume.certifications {
                text.push_str(&cert.name);
                if !cert.issuer.is_empty() {
                    text.push_str(&format!(" - {}", cert.issuer));
                }
                if let Some(date) = &cert.date {
                    text.push_str(&format!(" - {}", date));
                }
                if let Some(expiry) = &cert.expiry {
                    text.push_str(&format!(" - Expires {}", expiry));
                }
                text.push_str("\n");
            }
        }

        if !resume.projects.is_empty() {
            text.push_str("\nPROJECTS\n\n");
            for project in &resume.projects {
                text.push_str(&project.name);
                text.push_str("\n");
                if !project.description.is_empty() {
                    text.push_str(&project.description);
                    text.push_str("\n");
                }
                if !project.technologies.is_empty() {
                    text.push_str(&format!(
                        "Technologies: {}\n",
                        project.technologies.join(", ")
                    ));
                }
                if let Some(url) = &project.url {
                    text.push_str(url);
                    text.push_str("\n");
                }
                text.push_str("\n");
            }
        }

        text
    }

    fn append_certifications(html: &mut String, resume: &ResumeData) {
        if resume.certifications.is_empty() {
            return;
        }

        html.push_str("<h2>CERTIFICATIONS</h2>\n");
        for cert in &resume.certifications {
            html.push_str("<div class=\"certification-item\">\n");
            html.push_str(&format!("<h3>{}</h3>\n", escape_html(&cert.name)));

            let mut details = Vec::new();
            if !cert.issuer.is_empty() {
                details.push(cert.issuer.clone());
            }
            if let Some(date) = &cert.date {
                details.push(date.clone());
            }
            if let Some(expiry) = &cert.expiry {
                details.push(format!("Expires {}", expiry));
            }
            if !details.is_empty() {
                html.push_str(&format!(
                    "<div class=\"details\">{}</div>\n",
                    escape_html(&details.join(" | "))
                ));
            }

            html.push_str("</div>\n\n");
        }
    }

    fn append_projects(html: &mut String, resume: &ResumeData) {
        if resume.projects.is_empty() {
            return;
        }

        html.push_str("<h2>PROJECTS</h2>\n");
        for project in &resume.projects {
            html.push_str("<div class=\"project-item\">\n");
            html.push_str(&format!("<h3>{}</h3>\n", escape_html(&project.name)));
            if !project.description.is_empty() {
                html.push_str(&format!("<p>{}</p>\n", escape_html(&project.description)));
            }
            if !project.technologies.is_empty() {
                html.push_str(&format!(
                    "<div class=\"project-meta\"><strong>Technologies:</strong> {}</div>\n",
                    escape_html(&project.technologies.join(", "))
                ));
            }
            if let Some(url) = &project.url {
                html.push_str(&format!(
                    "<div class=\"project-url\">{}</div>\n",
                    escape_html(url)
                ));
            }
            html.push_str("</div>\n\n");
        }
    }

    // HTML document structure
    fn html_header(title: &str, styles: impl AsRef<str>) -> String {
        format!(
            r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{}</title>
<style>
{}
{}
</style>
</head>
<body>
"#,
            escape_html(title),
            styles.as_ref(),
            styles::print()
        )
    }
}
