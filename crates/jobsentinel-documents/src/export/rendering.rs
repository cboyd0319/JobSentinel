use super::*;
use crate::structured_resume::{
    ResumeCertification, ResumeEducation, ResumeExperience, ResumePersonalInfo, ResumeProject,
    ResumeSkillCategory,
};

pub(super) fn format_contact_line(personal: &ResumePersonalInfo) -> String {
    let mut parts: Vec<&str> = Vec::with_capacity(5);
    parts.push(&personal.email);
    if let Some(phone) = &personal.phone {
        parts.push(phone);
    }
    if let Some(location) = &personal.location {
        parts.push(location);
    }

    if let Some(linkedin) = &personal.linkedin {
        parts.push(linkedin);
    }

    if let Some(website) = &personal.website {
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
    exp: &ResumeExperience,
    _template: TemplateId,
) -> Docx {
    let end_date = exp.end_date.as_deref().unwrap_or("Present");

    // Company and job title line
    let header = format!("{} — {}", exp.company, exp.title);
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
    for resp in &exp.achievements {
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

pub(super) fn add_education_entry(mut doc: Docx, edu: &ResumeEducation) -> Docx {
    let mut header = format!("{} — {}", edu.institution, edu.degree);
    if let Some(field) = &edu.field_of_study {
        header.push_str(&format!(" in {field}"));
    }

    doc = doc.add_paragraph(
        Paragraph::new()
            .add_run(Run::new().add_text(&header).size(22).bold())
            .add_run(
                Run::new()
                    .add_text(format!(
                        "    {}",
                        edu.graduation_date.as_deref().unwrap_or_default()
                    ))
                    .size(22),
            )
            .line_spacing(LineSpacing::new().after(60)),
    );

    if let Some(gpa) = &edu.gpa {
        doc = doc.add_paragraph(
            Paragraph::new()
                .add_run(
                    Run::new()
                        .add_text(format!("GPA: {}", format_gpa(gpa)))
                        .size(22),
                )
                .line_spacing(LineSpacing::new().after(60)),
        );
    }

    for honor in &edu.honors {
        doc = doc.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text(honor).size(22).italic())
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

pub(super) fn add_skill_category(mut doc: Docx, skill_cat: &ResumeSkillCategory) -> Docx {
    let skills_text = skill_cat
        .skills
        .iter()
        .map(|skill| skill.name.as_str())
        .collect::<Vec<_>>()
        .join(", ");

    doc = doc.add_paragraph(
        Paragraph::new()
            .add_run(
                Run::new()
                    .add_text(format!("{}: ", skill_cat.name))
                    .size(22)
                    .bold(),
            )
            .add_run(Run::new().add_text(&skills_text).size(22))
            .line_spacing(LineSpacing::new().after(60)),
    );

    doc
}

pub(super) fn add_certification_entry(mut doc: Docx, cert: &ResumeCertification) -> Docx {
    let header = format!("{} — {}", cert.name, cert.issuer);

    let mut paragraph = Paragraph::new().add_run(Run::new().add_text(&header).size(22).bold());
    if let Some(date) = &cert.date_obtained {
        paragraph = paragraph.add_run(Run::new().add_text(format!("    {date}")).size(22));
    }
    doc = doc.add_paragraph(paragraph.line_spacing(LineSpacing::new().after(60)));

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

pub(super) fn add_project_entry(mut doc: Docx, project: &ResumeProject) -> Docx {
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

pub(super) fn format_gpa(gpa: &str) -> String {
    gpa.parse::<f64>()
        .map_or_else(|_| gpa.to_string(), |value| format!("{value:.2}"))
}
