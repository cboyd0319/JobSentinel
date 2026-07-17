use super::*;
use crate::structured_resume::{
    ResumeEducation, ResumeExperience, ResumePersonalInfo, ResumeSkillCategory, StructuredResume,
};

enum SkillsLayout {
    Inline,
    Block,
}

impl TemplateRenderer {
    fn append_name(html: &mut String, name: &str) {
        html.push_str(&format!("<h1 class=\"name\">{}</h1>\n", escape_html(name)));
    }

    fn append_section_divider(html: &mut String) {
        html.push_str("<hr class=\"section-divider\">\n\n");
    }

    fn append_contact(html: &mut String, contact: &ResumePersonalInfo) {
        html.push_str("<div class=\"contact\">\n");
        html.push_str(&format!("{}", escape_html(&contact.email)));
        if let Some(phone) = &contact.phone {
            html.push_str(&format!(" • {}", escape_html(phone)));
        }
        if let Some(location) = &contact.location {
            html.push_str(&format!(" • {}", escape_html(location)));
        }
        html.push_str("\n</div>\n\n");
    }

    fn append_experience(
        html: &mut String,
        experience: &[ResumeExperience],
        heading: &str,
        list_class: Option<&str>,
    ) {
        if experience.is_empty() {
            return;
        }

        html.push_str(&format!("<h2>{heading}</h2>\n"));
        for exp in experience {
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
            match list_class {
                Some(class) => html.push_str(&format!("<ul class=\"{class}\">\n")),
                None => html.push_str("<ul>\n"),
            }
            for achievement in &exp.achievements {
                html.push_str(&format!("<li>{}</li>\n", escape_html(achievement)));
            }
            html.push_str("</ul>\n</div>\n\n");
        }
    }

    fn append_education(
        html: &mut String,
        education: &[ResumeEducation],
        show_graduation_date: bool,
    ) {
        if education.is_empty() {
            return;
        }

        html.push_str("<h2>EDUCATION</h2>\n");
        for edu in education {
            html.push_str("<div class=\"education-item\">\n");
            html.push_str(&format!("<h3>{}</h3>\n", escape_html(&edu.degree)));
            html.push_str(&format!(
                "<div class=\"institution\">{}</div>\n",
                escape_html(&edu.institution)
            ));
            if show_graduation_date {
                if let Some(grad) = &edu.graduation_date {
                    html.push_str(&format!(
                        "<div class=\"dates\">{}</div>\n",
                        escape_html(grad)
                    ));
                }
            }
            html.push_str("</div>\n\n");
        }
    }

    fn append_skills(
        html: &mut String,
        skills: &[ResumeSkillCategory],
        heading: &str,
        layout: SkillsLayout,
    ) {
        if skills.is_empty() {
            return;
        }

        html.push_str(&format!("<h2>{heading}</h2>\n"));
        for category in skills {
            let skill_names = category
                .skills
                .iter()
                .map(|skill| skill.name.as_str())
                .collect::<Vec<_>>()
                .join(", ");
            match layout {
                SkillsLayout::Inline => html.push_str(&format!(
                    "<div class=\"skill-category\"><strong>{}:</strong> {}</div>\n",
                    escape_html(&category.name),
                    escape_html(&skill_names)
                )),
                SkillsLayout::Block => {
                    html.push_str("<div class=\"skill-category\">\n");
                    html.push_str(&format!(
                        "<strong>{}:</strong> {}\n",
                        escape_html(&category.name),
                        escape_html(&skill_names)
                    ));
                    html.push_str("</div>\n");
                }
            }
        }
        if matches!(layout, SkillsLayout::Block) {
            html.push_str("\n");
        }
    }

    // Classic template: traditional chronological
    pub(super) fn render_classic(resume: &StructuredResume) -> String {
        let mut html = Self::html_header("Classic Resume", styles::classic());

        // Name centered
        Self::append_name(&mut html, &resume.personal.name);

        Self::append_contact(&mut html, &resume.personal);

        // Summary
        if let Some(summary) = &resume.summary {
            html.push_str("<h2>SUMMARY</h2>\n");
            html.push_str(&format!("<p>{}</p>\n\n", escape_html(summary)));
        }

        Self::append_experience(&mut html, &resume.experience, "EXPERIENCE", None);

        Self::append_education(&mut html, &resume.education, true);

        Self::append_skills(&mut html, &resume.skills, "SKILLS", SkillsLayout::Inline);

        Self::append_certifications(&mut html, resume);
        Self::append_projects(&mut html, resume);

        html.push_str("</body>\n</html>");
        html
    }

    // Modern template: clean minimal design
    pub(super) fn render_modern(resume: &StructuredResume) -> String {
        let mut html = Self::html_header("Modern Resume", styles::modern());

        // Name left-aligned, bold
        Self::append_name(&mut html, &resume.personal.name);

        Self::append_contact(&mut html, &resume.personal);

        Self::append_section_divider(&mut html);

        // Summary
        if let Some(summary) = &resume.summary {
            html.push_str("<h2>SUMMARY</h2>\n");
            html.push_str(&format!("<p>{}</p>\n\n", escape_html(summary)));
            Self::append_section_divider(&mut html);
        }

        // Experience
        if !resume.experience.is_empty() {
            Self::append_experience(&mut html, &resume.experience, "EXPERIENCE", None);
            Self::append_section_divider(&mut html);
        }

        // Education
        if !resume.education.is_empty() {
            Self::append_education(&mut html, &resume.education, true);
            Self::append_section_divider(&mut html);
        }

        Self::append_skills(&mut html, &resume.skills, "SKILLS", SkillsLayout::Inline);

        Self::append_certifications(&mut html, resume);
        Self::append_projects(&mut html, resume);

        html.push_str("</body>\n</html>");
        html
    }

    // Skills-first template.
    pub(super) fn render_technical(resume: &StructuredResume) -> String {
        let mut html = Self::html_header("Skills-First Resume", styles::technical());

        // Name
        Self::append_name(&mut html, &resume.personal.name);

        Self::append_contact(&mut html, &resume.personal);

        // Summary
        if let Some(summary) = &resume.summary {
            html.push_str("<h2>SUMMARY</h2>\n");
            html.push_str(&format!("<p>{}</p>\n\n", escape_html(summary)));
        }

        Self::append_skills(
            &mut html,
            &resume.skills,
            "TECHNICAL SKILLS",
            SkillsLayout::Block,
        );

        Self::append_projects(&mut html, resume);
        Self::append_certifications(&mut html, resume);

        Self::append_experience(&mut html, &resume.experience, "EXPERIENCE", None);

        Self::append_education(&mut html, &resume.education, false);

        html.push_str("</body>\n</html>");
        html
    }

    // Executive template: summary and impact focused
    pub(super) fn render_executive(resume: &StructuredResume) -> String {
        let mut html = Self::html_header("Executive Resume", styles::executive());

        // Name
        Self::append_name(&mut html, &resume.personal.name);

        Self::append_contact(&mut html, &resume.personal);

        // Summary (EMPHASIZED)
        if let Some(summary) = &resume.summary {
            html.push_str("<h2>EXECUTIVE SUMMARY</h2>\n");
            html.push_str("<div class=\"executive-summary\">\n");
            html.push_str(&format!("<p>{}</p>\n", escape_html(summary)));
            html.push_str("</div>\n\n");
        }

        Self::append_experience(
            &mut html,
            &resume.experience,
            "LEADERSHIP EXPERIENCE",
            Some("achievements"),
        );

        Self::append_education(&mut html, &resume.education, false);

        Self::append_skills(
            &mut html,
            &resume.skills,
            "CORE COMPETENCIES",
            SkillsLayout::Inline,
        );

        Self::append_certifications(&mut html, resume);
        Self::append_projects(&mut html, resume);

        html.push_str("</body>\n</html>");
        html
    }

    // Military template: veteran transition
    pub(super) fn render_military(resume: &StructuredResume) -> String {
        let mut html = Self::html_header("Military Resume", styles::military());

        // Name
        Self::append_name(&mut html, &resume.personal.name);

        Self::append_contact(&mut html, &resume.personal);

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

        Self::append_experience(&mut html, &resume.experience, "EXPERIENCE", None);

        Self::append_education(&mut html, &resume.education, false);

        Self::append_skills(
            &mut html,
            &resume.skills,
            "SKILLS & QUALIFICATIONS",
            SkillsLayout::Inline,
        );

        Self::append_certifications(&mut html, resume);
        Self::append_projects(&mut html, resume);

        html.push_str("</body>\n</html>");
        html
    }
}
