use super::{builder, json_resume};
use chrono::{DateTime, Utc};
use jobsentinel_documents::{
    ResumeCertification, ResumeEducation, ResumeExperience, ResumePersonalInfo, ResumeProject,
    ResumeSkill, ResumeSkillCategory, StructuredResume,
};

pub(super) struct StoredResume {
    resume: StructuredResume,
    id: i64,
    experience_ids: Vec<i64>,
    education_ids: Vec<i64>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl From<builder::ResumeData> for StoredResume {
    fn from(legacy: builder::ResumeData) -> Self {
        let experience_ids = legacy
            .experience
            .iter()
            .map(|experience| experience.id)
            .collect();
        let education_ids = legacy
            .education
            .iter()
            .map(|education| education.id)
            .collect();
        let resume = StructuredResume {
            personal: ResumePersonalInfo {
                name: legacy.contact.name,
                email: legacy.contact.email,
                phone: legacy.contact.phone,
                location: legacy.contact.location,
                linkedin: legacy.contact.linkedin,
                github: legacy.contact.github,
                website: legacy.contact.website,
            },
            summary: Some(legacy.summary),
            experience: legacy
                .experience
                .into_iter()
                .map(|experience| ResumeExperience {
                    title: experience.title,
                    company: experience.company,
                    location: experience.location,
                    start_date: experience.start_date,
                    end_date: experience.end_date,
                    is_current: experience.is_current,
                    achievements: experience.achievements,
                })
                .collect(),
            education: legacy
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
            skills: legacy
                .skills
                .into_iter()
                .map(|skill| ResumeSkillCategory {
                    name: skill.category,
                    skills: vec![ResumeSkill {
                        name: skill.name,
                        proficiency: skill.proficiency,
                        years_experience: skill.years_experience,
                    }],
                })
                .collect(),
            certifications: legacy
                .certifications
                .into_iter()
                .map(|certification| ResumeCertification {
                    name: certification.name,
                    issuer: certification.issuer,
                    date_obtained: certification.date_obtained,
                    expiration_date: certification.expiration_date,
                    credential_id: certification.credential_id,
                })
                .collect(),
            projects: legacy
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
            clearance: None,
            military_info: None,
        };

        Self {
            resume,
            id: legacy.id,
            experience_ids,
            education_ids,
            created_at: legacy.created_at,
            updated_at: legacy.updated_at,
        }
    }
}

impl From<StoredResume> for builder::ResumeData {
    fn from(stored: StoredResume) -> Self {
        let resume = stored.resume;
        Self {
            id: stored.id,
            contact: builder::ContactInfo {
                name: resume.personal.name,
                email: resume.personal.email,
                phone: resume.personal.phone,
                linkedin: resume.personal.linkedin,
                github: resume.personal.github,
                location: resume.personal.location,
                website: resume.personal.website,
            },
            summary: resume.summary.unwrap_or_default(),
            experience: resume
                .experience
                .into_iter()
                .enumerate()
                .map(|(index, experience)| builder::Experience {
                    id: stored
                        .experience_ids
                        .get(index)
                        .copied()
                        .unwrap_or_default(),
                    company: experience.company,
                    title: experience.title,
                    location: experience.location,
                    start_date: experience.start_date,
                    end_date: experience.end_date,
                    is_current: experience.is_current,
                    achievements: experience.achievements,
                })
                .collect(),
            education: resume
                .education
                .into_iter()
                .enumerate()
                .map(|(index, education)| builder::Education {
                    id: stored.education_ids.get(index).copied().unwrap_or_default(),
                    institution: education.institution,
                    degree: education.degree,
                    location: education.location,
                    graduation_date: education.graduation_date,
                    gpa: education.gpa,
                    honors: education.honors,
                })
                .collect(),
            skills: resume
                .skills
                .into_iter()
                .flat_map(|category| {
                    category
                        .skills
                        .into_iter()
                        .map(move |skill| builder::SkillEntry {
                            name: skill.name,
                            category: category.name.clone(),
                            proficiency: skill.proficiency,
                            years_experience: skill.years_experience,
                        })
                })
                .collect(),
            certifications: resume
                .certifications
                .into_iter()
                .map(|certification| builder::Certification {
                    name: certification.name,
                    issuer: certification.issuer,
                    date_obtained: certification.date_obtained,
                    expiration_date: certification.expiration_date,
                    credential_id: certification.credential_id,
                })
                .collect(),
            projects: resume
                .projects
                .into_iter()
                .map(|project| builder::Project {
                    name: project.name,
                    description: project.description,
                    technologies: project.technologies,
                    url: project.url,
                    start_date: project.start_date,
                    end_date: project.end_date,
                })
                .collect(),
            created_at: stored.created_at,
            updated_at: stored.updated_at,
        }
    }
}

impl From<json_resume::ConvertedResumeData> for StructuredResume {
    fn from(imported: json_resume::ConvertedResumeData) -> Self {
        let skills = imported_skill_categories(imported.skills);
        Self {
            personal: ResumePersonalInfo {
                name: imported.contact_info.name,
                email: imported.contact_info.email,
                phone: Some(imported.contact_info.phone),
                location: Some(imported.contact_info.location),
                linkedin: imported.contact_info.linkedin,
                github: imported.contact_info.github,
                website: imported.contact_info.website,
            },
            summary: Some(imported.summary),
            experience: imported
                .experience
                .into_iter()
                .map(|experience| ResumeExperience {
                    title: experience.title,
                    company: experience.company,
                    location: Some(experience.location),
                    start_date: experience.start_date,
                    end_date: if experience.current {
                        None
                    } else {
                        Some(experience.end_date)
                    },
                    is_current: experience.current,
                    achievements: experience.achievements,
                })
                .collect(),
            education: imported
                .education
                .into_iter()
                .map(|education| ResumeEducation {
                    institution: education.institution,
                    degree: education.degree,
                    field_of_study: non_empty(education.field_of_study),
                    location: Some(education.location),
                    graduation_date: Some(education.graduation_date),
                    gpa: education.gpa.map(|gpa| gpa.to_string()),
                    honors: education.honors,
                })
                .collect(),
            skills,
            certifications: imported
                .certifications
                .into_iter()
                .map(|certification| ResumeCertification {
                    name: certification.name,
                    issuer: certification.issuer,
                    date_obtained: Some(certification.date),
                    expiration_date: None,
                    credential_id: None,
                })
                .collect(),
            projects: imported
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
            clearance: None,
            military_info: None,
        }
    }
}

fn imported_skill_categories(skills: Vec<json_resume::ConvertedSkill>) -> Vec<ResumeSkillCategory> {
    let mut categories: Vec<ResumeSkillCategory> = Vec::new();
    for skill in skills {
        let resume_skill = ResumeSkill {
            name: skill.name,
            proficiency: skill
                .proficiency
                .map(|proficiency| proficiency.as_str().to_string()),
            years_experience: None,
        };
        if let Some(category) = categories
            .iter_mut()
            .find(|category| category.name == skill.category)
        {
            category.skills.push(resume_skill);
        } else {
            categories.push(ResumeSkillCategory {
                name: skill.category,
                skills: vec![resume_skill],
            });
        }
    }
    categories
}

fn non_empty(value: String) -> Option<String> {
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

#[cfg(test)]
mod tests {
    use super::super::builder;

    const BUILDER_RESUME_FIXTURE: &str = include_str!("fixtures/builder_resume.json");

    #[test]
    fn storage_wrapper_round_trips_builder_fixture_without_field_drift() {
        let legacy: builder::ResumeData = serde_json::from_str(BUILDER_RESUME_FIXTURE).unwrap();
        let original = serde_json::to_value(&legacy).unwrap();

        let restored = builder::ResumeData::from(super::StoredResume::from(legacy));

        assert_eq!(serde_json::to_value(restored).unwrap(), original);
    }
}
