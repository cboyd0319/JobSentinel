//! JSON Resume schema parsing and canonical model conversion.

use anyhow::{Context, Result};
use jobsentinel_documents::{
    ResumeCertification, ResumeEducation, ResumeExperience, ResumePersonalInfo, ResumeProject,
    ResumeSkill, ResumeSkillCategory, StructuredResume,
};

mod types;

pub(crate) use types::*;

impl JsonResume {
    pub(super) fn from_json(json_string: &str) -> Result<Self> {
        serde_json::from_str(json_string).context("Failed to parse JSON Resume")
    }

    pub(super) fn to_structured_resume(&self) -> Result<StructuredResume> {
        Ok(StructuredResume {
            personal: self.convert_contact_info(),
            summary: Some(self.basics.summary.clone()),
            experience: self.convert_experience(),
            education: self.convert_education(),
            skills: self.convert_skills(),
            certifications: self.convert_certifications(),
            projects: self.convert_projects(),
            clearance: None,
            military_info: None,
        })
    }

    fn convert_contact_info(&self) -> ResumePersonalInfo {
        let basics = &self.basics;
        let location = if !basics.location.city.is_empty() || !basics.location.region.is_empty() {
            [
                basics.location.city.as_str(),
                basics.location.region.as_str(),
            ]
            .into_iter()
            .filter(|part| !part.is_empty())
            .collect::<Vec<_>>()
            .join(", ")
        } else {
            basics.location.address.clone()
        };
        let profile_url = |network: &str| {
            basics
                .profiles
                .iter()
                .find(|profile| profile.network.to_lowercase().contains(network))
                .map(|profile| profile.url.clone())
        };
        let linkedin = profile_url("linkedin");
        let github = profile_url("github");
        let website = if basics.url.is_empty() {
            basics
                .profiles
                .iter()
                .find(|profile| {
                    let network = profile.network.to_lowercase();
                    !network.contains("linkedin") && !network.contains("github")
                })
                .map(|profile| profile.url.clone())
        } else {
            Some(basics.url.clone())
        };

        ResumePersonalInfo {
            name: basics.name.clone(),
            email: basics.email.clone(),
            phone: Some(basics.phone.clone()),
            location: Some(location),
            linkedin,
            github,
            website,
        }
    }

    fn convert_experience(&self) -> Vec<ResumeExperience> {
        let work = self.work.iter().map(|entry| ResumeExperience {
            title: entry.position.clone(),
            company: entry.name.clone(),
            location: Some(String::new()),
            start_date: entry.start_date.clone(),
            end_date: non_empty_string(&entry.end_date),
            is_current: entry.end_date.is_empty(),
            achievements: entry.highlights.clone(),
        });
        let volunteer = self.volunteer.iter().map(|entry| ResumeExperience {
            title: format!("{} (Volunteer)", entry.position),
            company: entry.organization.clone(),
            location: Some(String::new()),
            start_date: entry.start_date.clone(),
            end_date: non_empty_string(&entry.end_date),
            is_current: entry.end_date.is_empty(),
            achievements: entry.highlights.clone(),
        });
        work.chain(volunteer).collect()
    }

    fn convert_education(&self) -> Vec<ResumeEducation> {
        self.education
            .iter()
            .map(|education| {
                let degree = match (education.study_type.is_empty(), education.area.is_empty()) {
                    (false, false) => {
                        format!("{} in {}", education.study_type, education.area)
                    }
                    (false, true) => education.study_type.clone(),
                    (true, false) => education.area.clone(),
                    (true, true) => String::new(),
                };
                ResumeEducation {
                    institution: education.institution.clone(),
                    degree,
                    field_of_study: non_empty_string(&education.area),
                    location: Some(String::new()),
                    graduation_date: Some(education.end_date.clone()),
                    gpa: education
                        .score
                        .parse::<f64>()
                        .ok()
                        .map(|gpa| gpa.to_string()),
                    honors: education.courses.clone(),
                }
            })
            .collect()
    }

    fn convert_skills(&self) -> Vec<ResumeSkillCategory> {
        let mut categories = Vec::new();
        for skill in &self.skills {
            let proficiency = skill_proficiency(&skill.level).to_string();
            let category = non_empty_string(&skill.name).unwrap_or_else(|| "Imported".to_string());
            let keywords = skill
                .keywords
                .iter()
                .filter(|keyword| !keyword.trim().is_empty())
                .collect::<Vec<_>>();
            if keywords.is_empty() {
                if !skill.name.trim().is_empty() {
                    push_skill(
                        &mut categories,
                        "Imported".to_string(),
                        skill.name.clone(),
                        proficiency,
                    );
                }
            } else {
                for keyword in keywords {
                    push_skill(
                        &mut categories,
                        category.clone(),
                        keyword.clone(),
                        proficiency.clone(),
                    );
                }
            }
        }
        for language in &self.languages {
            if language.language.is_empty() {
                continue;
            }
            let name = if language.fluency.is_empty() {
                language.language.clone()
            } else {
                format!("{} - {}", language.language, language.fluency)
            };
            push_skill(
                &mut categories,
                "Languages".to_string(),
                name,
                language_proficiency(&language.fluency).to_string(),
            );
        }
        categories
    }

    fn convert_certifications(&self) -> Vec<ResumeCertification> {
        let certificates = self.certificates.iter().map(|entry| ResumeCertification {
            name: entry.name.clone(),
            issuer: entry.issuer.clone(),
            date_obtained: Some(entry.date.clone()),
            ..ResumeCertification::default()
        });
        let awards = self.awards.iter().map(|entry| ResumeCertification {
            name: entry.title.clone(),
            issuer: entry.awarder.clone(),
            date_obtained: Some(entry.date.clone()),
            ..ResumeCertification::default()
        });
        let publications = self
            .publications
            .iter()
            .filter(|entry| !entry.name.is_empty())
            .map(|entry| ResumeCertification {
                name: format!("Publication: {}", entry.name),
                issuer: entry.publisher.clone(),
                date_obtained: Some(entry.release_date.clone()),
                ..ResumeCertification::default()
            });
        certificates.chain(awards).chain(publications).collect()
    }

    fn convert_projects(&self) -> Vec<ResumeProject> {
        self.projects
            .iter()
            .map(|project| {
                let name = if project.roles.is_empty() {
                    project.name.clone()
                } else {
                    format!("{} - {}", project.name, project.roles.join(", "))
                };
                let mut description = Vec::new();
                if !project.description.is_empty() {
                    description.push(project.description.clone());
                }
                if !project.entity.is_empty() {
                    description.push(format!("Organization: {}", project.entity));
                }
                if !project.project_type.is_empty() {
                    description.push(format!("Type: {}", project.project_type));
                }
                description.extend(project.highlights.clone());
                ResumeProject {
                    name,
                    description: description.join("\n"),
                    technologies: project.keywords.clone(),
                    url: non_empty_string(&project.url),
                    start_date: non_empty_string(&project.start_date),
                    end_date: non_empty_string(&project.end_date),
                }
            })
            .collect()
    }
}

fn push_skill(
    categories: &mut Vec<ResumeSkillCategory>,
    category_name: String,
    skill_name: String,
    proficiency: String,
) {
    let skill = ResumeSkill {
        name: skill_name,
        proficiency: Some(proficiency),
        years_experience: None,
    };
    if let Some(category) = categories
        .iter_mut()
        .find(|category| category.name == category_name)
    {
        category.skills.push(skill);
    } else {
        categories.push(ResumeSkillCategory {
            name: category_name,
            skills: vec![skill],
        });
    }
}

fn non_empty_string(value: &str) -> Option<String> {
    let trimmed = value.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_string())
}

fn skill_proficiency(level: &str) -> &'static str {
    match level.to_lowercase().as_str() {
        "beginner" | "novice" => "beginner",
        "advanced" | "expert" => "advanced",
        "master" | "guru" => "expert",
        _ => "intermediate",
    }
}

fn language_proficiency(fluency: &str) -> &'static str {
    let lower = fluency.to_lowercase();
    if lower.contains("native")
        || lower.contains("fluent")
        || lower.contains("bilingual")
        || lower.contains("full professional")
    {
        "expert"
    } else if lower.contains("professional") || lower.contains("advanced") {
        "advanced"
    } else if lower.contains("elementary") || lower.contains("basic") || lower.contains("beginner")
    {
        "beginner"
    } else {
        "intermediate"
    }
}

#[cfg(test)]
mod tests;
