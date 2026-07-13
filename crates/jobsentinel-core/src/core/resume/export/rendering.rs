use super::*;

// Helper functions for type conversion

/// Convert export TemplateId to templates TemplateId
pub(super) fn convert_template_id(
    template: TemplateId,
) -> crate::core::resume::templates::TemplateId {
    match template {
        TemplateId::Professional => crate::core::resume::templates::TemplateId::Classic,
        TemplateId::Modern => crate::core::resume::templates::TemplateId::Modern,
        TemplateId::Traditional => crate::core::resume::templates::TemplateId::Executive,
    }
}

/// Convert export ResumeData to templates ResumeData
/// Takes ownership to avoid cloning - eliminates 27 allocations
pub(super) fn convert_to_template_resume(
    resume: ResumeData,
) -> crate::core::resume::templates::ResumeData {
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
                honors: edu.honors.map(|h| vec![h]).unwrap_or_default(),
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
        projects: resume
            .projects
            .into_iter()
            .map(|project| templates::Project {
                name: project.name,
                description: project.description,
                technologies: project.technologies,
                url: project.url,
                start_date: None,
                end_date: None,
            })
            .collect(),
        clearance: None,
        military_info: None,
    }
}

// Helper functions for DOCX generation

pub(super) fn format_contact_line(personal: &PersonalInfo) -> String {
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

pub(super) fn add_section_header(doc: Docx, title: &str) -> Docx {
    doc.add_paragraph(
        Paragraph::new()
            .add_run(Run::new().add_text(title).size(28).bold()) // 28 half-points = 14pt
            .line_spacing(LineSpacing::new().before(240).after(120)), // 12pt before, 6pt after
    )
}

pub(super) fn add_experience_entry(
    mut doc: Docx,
    exp: &ExperienceEntry,
    _template: TemplateId,
) -> Docx {
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

pub(super) fn add_education_entry(mut doc: Docx, edu: &EducationEntry) -> Docx {
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

pub(super) fn add_skill_category(mut doc: Docx, skill_cat: &SkillCategory) -> Docx {
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

pub(super) fn add_certification_entry(mut doc: Docx, cert: &Certification) -> Docx {
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

pub(super) fn add_project_entry(mut doc: Docx, project: &Project) -> Docx {
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
