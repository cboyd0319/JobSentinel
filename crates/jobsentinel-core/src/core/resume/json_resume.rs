//! JSON Resume Parser
//!
//! Import resumes from JSON Resume format (https://jsonresume.org/)
//! into JobSentinel's internal resume structure.

use anyhow::{Context, Result};
// Import builder types for conversion target
use super::builder::Proficiency;

mod types;

pub use types::*;

// ============================================================================
// Conversion Implementation
// ============================================================================

impl JsonResume {
    /// Parse JSON Resume from JSON string
    pub fn from_json(json_string: &str) -> Result<Self> {
        serde_json::from_str(json_string).context("Failed to parse JSON Resume")
    }

    /// Convert JSON Resume to intermediate format (avoid type conflicts)
    pub fn to_resume_data(&self) -> Result<ConvertedResumeData> {
        let contact_info = self.convert_contact_info();
        let summary = self.basics.summary.clone();
        let experience = self.convert_experience();
        let education = self.convert_education();
        let skills = self.convert_skills();
        let certifications = self.convert_certifications();
        let projects = self.convert_projects();

        Ok(ConvertedResumeData {
            contact_info,
            summary,
            experience,
            education,
            skills,
            certifications,
            projects,
        })
    }

    /// Convert basics section to ConvertedContactInfo
    fn convert_contact_info(&self) -> ConvertedContactInfo {
        let basics = &self.basics;

        // Build location string from structured location
        let location = if !basics.location.city.is_empty() || !basics.location.region.is_empty() {
            let mut parts = Vec::new();
            if !basics.location.city.is_empty() {
                parts.push(basics.location.city.clone());
            }
            if !basics.location.region.is_empty() {
                parts.push(basics.location.region.clone());
            }
            parts.join(", ")
        } else {
            basics.location.address.clone()
        };

        // Find LinkedIn and GitHub from profiles
        let linkedin = basics
            .profiles
            .iter()
            .find(|p| p.network.to_lowercase().contains("linkedin"))
            .map(|p| p.url.clone());

        let github = basics
            .profiles
            .iter()
            .find(|p| p.network.to_lowercase().contains("github"))
            .map(|p| p.url.clone());

        // Use basics.url as website if no LinkedIn/GitHub, otherwise first non-LinkedIn/GitHub profile
        let website = if !basics.url.is_empty() {
            Some(basics.url.clone())
        } else {
            basics
                .profiles
                .iter()
                .find(|p| {
                    let network_lower = p.network.to_lowercase();
                    !network_lower.contains("linkedin") && !network_lower.contains("github")
                })
                .map(|p| p.url.clone())
        };

        ConvertedContactInfo {
            name: basics.name.clone(),
            email: basics.email.clone(),
            phone: basics.phone.clone(),
            location,
            linkedin,
            github,
            website,
        }
    }

    /// Convert work and volunteer sections to ConvertedExperience entries
    fn convert_experience(&self) -> Vec<ConvertedExperience> {
        let mut experiences = Vec::new();

        // Convert work entries
        for work in &self.work {
            experiences.push(ConvertedExperience {
                title: work.position.clone(),
                company: work.name.clone(),
                location: String::new(), // JSON Resume doesn't have work location
                start_date: work.start_date.clone(),
                end_date: if work.end_date.is_empty() {
                    "Present".to_string()
                } else {
                    work.end_date.clone()
                },
                achievements: work.highlights.clone(),
                current: work.end_date.is_empty(),
            });
        }

        // Convert volunteer entries (marked as volunteer in title or company)
        for volunteer in &self.volunteer {
            experiences.push(ConvertedExperience {
                title: format!("{} (Volunteer)", volunteer.position),
                company: volunteer.organization.clone(),
                location: String::new(),
                start_date: volunteer.start_date.clone(),
                end_date: if volunteer.end_date.is_empty() {
                    "Present".to_string()
                } else {
                    volunteer.end_date.clone()
                },
                achievements: volunteer.highlights.clone(),
                current: volunteer.end_date.is_empty(),
            });
        }

        experiences
    }

    /// Convert projects to project entries instead of folding them into experience.
    fn convert_projects(&self) -> Vec<ConvertedProject> {
        self.projects
            .iter()
            .map(|project| {
                let name = if !project.roles.is_empty() {
                    format!("{} - {}", project.name, project.roles.join(", "))
                } else {
                    project.name.clone()
                };

                let mut description_parts = Vec::new();
                if !project.description.is_empty() {
                    description_parts.push(project.description.clone());
                }
                if !project.entity.is_empty() {
                    description_parts.push(format!("Organization: {}", project.entity));
                }
                if !project.project_type.is_empty() {
                    description_parts.push(format!("Type: {}", project.project_type));
                }
                description_parts.extend(project.highlights.clone());

                ConvertedProject {
                    name,
                    description: description_parts.join("\n"),
                    technologies: project.keywords.clone(),
                    url: non_empty_string(&project.url),
                    start_date: non_empty_string(&project.start_date),
                    end_date: non_empty_string(&project.end_date),
                }
            })
            .collect()
    }

    /// Convert education section to ConvertedEducation entries
    fn convert_education(&self) -> Vec<ConvertedEducation> {
        self.education
            .iter()
            .map(|edu| {
                // Combine study_type and area for degree (e.g., "Bachelor in Computer Science")
                let degree = if !edu.study_type.is_empty() && !edu.area.is_empty() {
                    format!("{} in {}", edu.study_type, edu.area)
                } else if !edu.study_type.is_empty() {
                    edu.study_type.clone()
                } else if !edu.area.is_empty() {
                    edu.area.clone()
                } else {
                    String::new()
                };

                // Parse GPA from score field (flexible parsing)
                let gpa = edu.score.parse::<f64>().ok();

                ConvertedEducation {
                    degree,
                    institution: edu.institution.clone(),
                    location: String::new(), // JSON Resume doesn't have education location
                    graduation_date: edu.end_date.clone(),
                    gpa,
                    honors: edu.courses.clone(), // Use courses as honors/highlights
                }
            })
            .collect()
    }

    /// Convert skills section to ConvertedSkill entries
    fn convert_skills(&self) -> Vec<ConvertedSkill> {
        let mut skills = Vec::new();

        for skill in &self.skills {
            // Map JSON Resume skill level to JobSentinel proficiency
            let proficiency = match skill.level.to_lowercase().as_str() {
                "beginner" | "novice" => Proficiency::Beginner,
                "intermediate" | "proficient" => Proficiency::Intermediate,
                "advanced" | "expert" => Proficiency::Advanced,
                "master" | "guru" => Proficiency::Expert,
                _ => Proficiency::Intermediate, // Default to intermediate
            };

            let category = non_empty_string(&skill.name).unwrap_or_else(|| "Imported".to_string());
            let keywords: Vec<&String> = skill
                .keywords
                .iter()
                .filter(|keyword| !keyword.trim().is_empty())
                .collect();

            if keywords.is_empty() {
                if !skill.name.trim().is_empty() {
                    skills.push(ConvertedSkill {
                        name: skill.name.clone(),
                        category: "Imported".to_string(),
                        proficiency: Some(proficiency.clone()),
                    });
                }
                continue;
            }

            for keyword in keywords {
                skills.push(ConvertedSkill {
                    name: keyword.clone(),
                    category: category.clone(),
                    proficiency: Some(proficiency.clone()),
                });
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
            skills.push(ConvertedSkill {
                name,
                category: "Languages".to_string(),
                proficiency: Some(language_proficiency(&language.fluency)),
            });
        }

        skills
    }

    /// Convert certificates and awards to ConvertedCertification entries
    fn convert_certifications(&self) -> Vec<ConvertedCertification> {
        let mut certifications = Vec::new();

        // Add certificates
        for cert in &self.certificates {
            certifications.push(ConvertedCertification {
                name: cert.name.clone(),
                issuer: cert.issuer.clone(),
                date: cert.date.clone(),
            });
        }

        // Add awards as certifications
        for award in &self.awards {
            certifications.push(ConvertedCertification {
                name: award.title.clone(),
                issuer: award.awarder.clone(),
                date: award.date.clone(),
            });
        }

        for publication in &self.publications {
            if publication.name.is_empty() {
                continue;
            }

            certifications.push(ConvertedCertification {
                name: format!("Publication: {}", publication.name),
                issuer: publication.publisher.clone(),
                date: publication.release_date.clone(),
            });
        }

        certifications
    }
}

fn non_empty_string(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn language_proficiency(fluency: &str) -> Proficiency {
    let lower = fluency.to_lowercase();
    if lower.contains("native")
        || lower.contains("fluent")
        || lower.contains("bilingual")
        || lower.contains("full professional")
    {
        Proficiency::Expert
    } else if lower.contains("professional") || lower.contains("advanced") {
        Proficiency::Advanced
    } else if lower.contains("limited")
        || lower.contains("working")
        || lower.contains("intermediate")
        || lower.contains("conversational")
    {
        Proficiency::Intermediate
    } else if lower.contains("elementary") || lower.contains("basic") || lower.contains("beginner")
    {
        Proficiency::Beginner
    } else {
        Proficiency::Intermediate
    }
}

#[cfg(test)]
mod tests;
