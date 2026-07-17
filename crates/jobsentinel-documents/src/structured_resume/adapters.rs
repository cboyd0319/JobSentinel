use super::*;
use crate::{export, templates, types};

// Milestone 7 compatibility adapters. Remove each old side in Milestone 8 when its consumer
// accepts StructuredResume directly.

impl From<templates::ResumeData> for StructuredResume {
    fn from(resume: templates::ResumeData) -> Self {
        Self {
            personal: ResumePersonalInfo {
                name: resume.contact.name,
                email: resume.contact.email,
                phone: resume.contact.phone,
                location: resume.contact.location,
                linkedin: resume.contact.linkedin,
                github: None,
                website: resume.contact.website,
            },
            summary: resume.summary,
            experience: resume
                .experience
                .into_iter()
                .map(|experience| ResumeExperience {
                    title: experience.title,
                    company: experience.company,
                    location: experience.location,
                    start_date: experience.start_date,
                    is_current: experience.end_date.is_none(),
                    end_date: experience.end_date,
                    achievements: experience.achievements,
                })
                .collect(),
            education: resume
                .education
                .into_iter()
                .map(|education| ResumeEducation {
                    institution: education.institution,
                    degree: education.degree,
                    field_of_study: None,
                    location: education.location,
                    graduation_date: education.graduation_date,
                    gpa: education.gpa,
                    honors: education.honors,
                })
                .collect(),
            skills: resume
                .skills
                .into_iter()
                .map(|category| bare_skill_category(category.name, category.skills))
                .collect(),
            certifications: resume
                .certifications
                .into_iter()
                .map(|certification| ResumeCertification {
                    name: certification.name,
                    issuer: certification.issuer,
                    date_obtained: certification.date,
                    expiration_date: certification.expiry,
                    credential_id: None,
                })
                .collect(),
            projects: resume
                .projects
                .into_iter()
                .map(|project| ResumeProject {
                    name: project.name,
                    description: project.description,
                    technologies: project.technologies,
                    url: project.url,
                    start_date: project.start_date,
                    end_date: project.end_date,
                })
                .collect(),
            clearance: resume.clearance,
            military_info: resume.military_info,
        }
    }
}

impl From<StructuredResume> for templates::ResumeData {
    fn from(resume: StructuredResume) -> Self {
        Self {
            contact: templates::ContactInfo {
                name: resume.personal.name,
                email: resume.personal.email,
                phone: resume.personal.phone,
                location: resume.personal.location,
                linkedin: resume.personal.linkedin,
                website: resume.personal.website,
            },
            summary: resume.summary,
            experience: resume
                .experience
                .into_iter()
                .map(|experience| templates::Experience {
                    title: experience.title,
                    company: experience.company,
                    location: experience.location,
                    start_date: experience.start_date,
                    end_date: experience.end_date,
                    achievements: experience.achievements,
                })
                .collect(),
            education: resume
                .education
                .into_iter()
                .map(|education| templates::Education {
                    degree: education.degree,
                    institution: education.institution,
                    location: education.location,
                    graduation_date: education.graduation_date,
                    gpa: education.gpa,
                    honors: education.honors,
                })
                .collect(),
            skills: resume
                .skills
                .into_iter()
                .map(|category| templates::SkillCategory {
                    name: category.name,
                    skills: category
                        .skills
                        .into_iter()
                        .map(|skill| skill.name)
                        .collect(),
                })
                .collect(),
            certifications: resume
                .certifications
                .into_iter()
                .map(|certification| templates::Certification {
                    name: certification.name,
                    issuer: certification.issuer,
                    date: certification.date_obtained,
                    expiry: certification.expiration_date,
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
                    start_date: project.start_date,
                    end_date: project.end_date,
                })
                .collect(),
            clearance: resume.clearance,
            military_info: resume.military_info,
        }
    }
}

impl From<export::ResumeData> for StructuredResume {
    fn from(resume: export::ResumeData) -> Self {
        Self {
            personal: ResumePersonalInfo {
                name: resume.personal.full_name,
                email: resume.personal.email,
                phone: Some(resume.personal.phone),
                location: Some(resume.personal.location),
                linkedin: resume.personal.linkedin_url,
                github: None,
                website: resume.personal.website_url,
            },
            summary: resume.summary,
            experience: resume
                .experience
                .into_iter()
                .map(|experience| ResumeExperience {
                    title: experience.job_title,
                    company: experience.company,
                    location: experience.location,
                    start_date: experience.start_date,
                    is_current: experience.end_date.is_none(),
                    end_date: experience.end_date,
                    achievements: experience.responsibilities,
                })
                .collect(),
            education: resume
                .education
                .into_iter()
                .map(|education| ResumeEducation {
                    institution: education.institution,
                    degree: education.degree,
                    field_of_study: Some(education.field_of_study),
                    location: None,
                    graduation_date: Some(education.graduation_year),
                    gpa: education.gpa.map(|gpa| gpa.to_string()),
                    honors: education.honors.into_iter().collect(),
                })
                .collect(),
            skills: resume
                .skills
                .into_iter()
                .map(|category| bare_skill_category(category.category, category.skills))
                .collect(),
            certifications: resume
                .certifications
                .into_iter()
                .map(|certification| ResumeCertification {
                    name: certification.name,
                    issuer: certification.issuer,
                    date_obtained: Some(certification.date),
                    expiration_date: None,
                    credential_id: certification.credential_id,
                })
                .collect(),
            projects: resume
                .projects
                .into_iter()
                .map(|project| ResumeProject {
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
}

impl From<StructuredResume> for export::ResumeData {
    fn from(resume: StructuredResume) -> Self {
        Self {
            personal: export::PersonalInfo {
                full_name: resume.personal.name,
                email: resume.personal.email,
                phone: resume.personal.phone.unwrap_or_default(),
                location: resume.personal.location.unwrap_or_default(),
                linkedin_url: resume.personal.linkedin,
                website_url: resume.personal.website,
            },
            summary: resume.summary,
            experience: resume
                .experience
                .into_iter()
                .map(|experience| export::ExperienceEntry {
                    company: experience.company,
                    job_title: experience.title,
                    start_date: experience.start_date,
                    end_date: experience.end_date,
                    location: experience.location,
                    responsibilities: experience.achievements,
                })
                .collect(),
            education: resume
                .education
                .into_iter()
                .map(|education| export::EducationEntry {
                    institution: education.institution,
                    degree: education.degree,
                    field_of_study: education.field_of_study.unwrap_or_default(),
                    graduation_year: education.graduation_date.unwrap_or_default(),
                    gpa: education.gpa.and_then(|gpa| gpa.parse().ok()),
                    honors: honors_text(education.honors),
                })
                .collect(),
            skills: resume
                .skills
                .into_iter()
                .map(|category| export::SkillCategory {
                    category: category.name,
                    skills: category
                        .skills
                        .into_iter()
                        .map(|skill| skill.name)
                        .collect(),
                })
                .collect(),
            certifications: resume
                .certifications
                .into_iter()
                .map(|certification| export::Certification {
                    name: certification.name,
                    issuer: certification.issuer,
                    date: certification.date_obtained.unwrap_or_default(),
                    credential_id: certification.credential_id,
                })
                .collect(),
            projects: resume
                .projects
                .into_iter()
                .map(|project| export::Project {
                    name: project.name,
                    description: project.description,
                    technologies: project.technologies,
                    url: project.url,
                })
                .collect(),
        }
    }
}

impl From<types::ResumeData> for ResumeAnalysisInput {
    fn from(resume: types::ResumeData) -> Self {
        let structured = StructuredResume {
            personal: ResumePersonalInfo {
                name: resume.contact_info.name,
                email: resume.contact_info.email,
                phone: Some(resume.contact_info.phone),
                location: Some(resume.contact_info.location),
                linkedin: resume.contact_info.linkedin,
                github: resume.contact_info.github,
                website: resume.contact_info.website,
            },
            summary: Some(resume.summary),
            experience: resume
                .experience
                .into_iter()
                .map(|experience| ResumeExperience {
                    title: experience.title,
                    company: experience.company,
                    location: Some(experience.location),
                    start_date: experience.start_date,
                    end_date: Some(experience.end_date),
                    is_current: experience.current,
                    achievements: experience.achievements,
                })
                .collect(),
            education: resume
                .education
                .into_iter()
                .map(|education| ResumeEducation {
                    institution: education.institution,
                    degree: education.degree,
                    field_of_study: None,
                    location: Some(education.location),
                    graduation_date: Some(education.graduation_date),
                    gpa: education.gpa.map(|gpa| gpa.to_string()),
                    honors: education.honors,
                })
                .collect(),
            skills: resume
                .skills
                .into_iter()
                .map(|skill| ResumeSkillCategory {
                    name: skill.category,
                    skills: vec![ResumeSkill {
                        name: skill.name,
                        proficiency: skill.proficiency,
                        years_experience: None,
                    }],
                })
                .collect(),
            certifications: resume
                .certifications
                .into_iter()
                .map(|name| ResumeCertification {
                    name,
                    ..ResumeCertification::default()
                })
                .collect(),
            projects: resume
                .projects
                .into_iter()
                .map(|name| ResumeProject {
                    name,
                    ..ResumeProject::default()
                })
                .collect(),
            clearance: None,
            military_info: None,
        };

        Self {
            resume: structured,
            custom_sections: resume.custom_sections,
        }
    }
}

impl From<ResumeAnalysisInput> for types::ResumeData {
    fn from(input: ResumeAnalysisInput) -> Self {
        let resume = input.resume;
        Self {
            contact_info: types::ContactInfo {
                name: resume.personal.name,
                email: resume.personal.email,
                phone: resume.personal.phone.unwrap_or_default(),
                location: resume.personal.location.unwrap_or_default(),
                linkedin: resume.personal.linkedin,
                github: resume.personal.github,
                website: resume.personal.website,
            },
            summary: resume.summary.unwrap_or_default(),
            experience: resume
                .experience
                .into_iter()
                .map(|experience| types::Experience {
                    title: experience.title,
                    company: experience.company,
                    location: experience.location.unwrap_or_default(),
                    start_date: experience.start_date,
                    end_date: experience.end_date.unwrap_or_else(|| "Present".to_string()),
                    achievements: experience.achievements,
                    current: experience.is_current,
                })
                .collect(),
            skills: resume
                .skills
                .into_iter()
                .flat_map(|category| {
                    category.skills.into_iter().map(move |skill| types::Skill {
                        name: skill.name,
                        category: category.name.clone(),
                        proficiency: skill.proficiency,
                    })
                })
                .collect(),
            education: resume
                .education
                .into_iter()
                .map(|education| types::Education {
                    degree: education.degree,
                    institution: education.institution,
                    location: education.location.unwrap_or_default(),
                    graduation_date: education.graduation_date.unwrap_or_default(),
                    gpa: education.gpa.and_then(|gpa| gpa.parse().ok()),
                    honors: education.honors,
                })
                .collect(),
            certifications: resume
                .certifications
                .into_iter()
                .map(format_certification_evidence)
                .collect(),
            projects: resume
                .projects
                .into_iter()
                .map(format_project_evidence)
                .collect(),
            custom_sections: input.custom_sections,
        }
    }
}

fn honors_text(honors: Vec<String>) -> Option<String> {
    if honors.is_empty() {
        None
    } else {
        Some(honors.join("; "))
    }
}

fn bare_skill_category(name: String, skills: Vec<String>) -> ResumeSkillCategory {
    ResumeSkillCategory {
        name,
        skills: skills
            .into_iter()
            .map(|name| ResumeSkill {
                name,
                proficiency: None,
                years_experience: None,
            })
            .collect(),
    }
}

fn format_certification_evidence(certification: ResumeCertification) -> String {
    let mut parts = vec![certification.name];
    parts.extend(
        [
            certification.issuer,
            certification.date_obtained.unwrap_or_default(),
        ]
        .into_iter()
        .filter(|part| !part.is_empty()),
    );
    if let Some(credential_id) = certification.credential_id {
        parts.push(format!("Credential ID: {credential_id}"));
    }
    parts.join(" - ")
}

fn format_project_evidence(project: ResumeProject) -> String {
    let mut parts = [project.name, project.description]
        .into_iter()
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    if !project.technologies.is_empty() {
        parts.push(format!("Technologies: {}", project.technologies.join(", ")));
    }
    if let Some(url) = project.url.filter(|url| !url.is_empty()) {
        parts.push(url);
    }
    parts.join(" - ")
}
