use super::*;

impl TemplateRenderer {
    // Classic template: traditional chronological
    pub(super) fn render_classic(resume: &ResumeData) -> String {
        let mut html = Self::html_header("Classic Resume", styles::classic());

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

        Self::append_certifications(&mut html, resume);
        Self::append_projects(&mut html, resume);

        html.push_str("</body>\n</html>");
        html
    }

    // Modern template: clean minimal design
    pub(super) fn render_modern(resume: &ResumeData) -> String {
        let mut html = Self::html_header("Modern Resume", styles::modern());

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

        Self::append_certifications(&mut html, resume);
        Self::append_projects(&mut html, resume);

        html.push_str("</body>\n</html>");
        html
    }

    // Skills-first template.
    pub(super) fn render_technical(resume: &ResumeData) -> String {
        let mut html = Self::html_header("Skills-First Resume", styles::technical());

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

        Self::append_projects(&mut html, resume);
        Self::append_certifications(&mut html, resume);

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
    pub(super) fn render_executive(resume: &ResumeData) -> String {
        let mut html = Self::html_header("Executive Resume", styles::executive());

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

        Self::append_certifications(&mut html, resume);
        Self::append_projects(&mut html, resume);

        html.push_str("</body>\n</html>");
        html
    }

    // Military template: veteran transition
    pub(super) fn render_military(resume: &ResumeData) -> String {
        let mut html = Self::html_header("Military Resume", styles::military());

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

        Self::append_certifications(&mut html, resume);
        Self::append_projects(&mut html, resume);

        html.push_str("</body>\n</html>");
        html
    }
}
