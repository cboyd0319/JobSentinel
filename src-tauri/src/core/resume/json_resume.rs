//! JSON Resume Parser
//!
//! Import resumes from JSON Resume format (https://jsonresume.org/)
//! into JobSentinel's internal resume structure.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

// Import builder types for conversion target
use super::builder::Proficiency;

// ============================================================================
// Intermediate types for conversion (avoid name conflicts with builder types)
// ============================================================================

#[derive(Debug, Clone)]
pub struct ConvertedResumeData {
    pub contact_info: ConvertedContactInfo,
    pub summary: String,
    pub experience: Vec<ConvertedExperience>,
    pub education: Vec<ConvertedEducation>,
    pub skills: Vec<ConvertedSkill>,
    pub certifications: Vec<ConvertedCertification>,
}

#[derive(Debug, Clone)]
pub struct ConvertedContactInfo {
    pub name: String,
    pub email: String,
    pub phone: String,
    pub location: String,
    pub linkedin: Option<String>,
    pub github: Option<String>,
    pub website: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ConvertedExperience {
    pub title: String,
    pub company: String,
    pub location: String,
    pub start_date: String,
    pub end_date: String,
    pub achievements: Vec<String>,
    pub current: bool,
}

#[derive(Debug, Clone)]
pub struct ConvertedEducation {
    pub degree: String,
    pub institution: String,
    pub location: String,
    pub graduation_date: String,
    pub gpa: Option<f64>,
    pub honors: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ConvertedSkill {
    pub name: String,
    pub proficiency: Option<Proficiency>,
}

#[derive(Debug, Clone)]
pub struct ConvertedCertification {
    pub name: String,
    pub issuer: String,
    pub date: String,
}

// ============================================================================
// JSON Resume Schema Types (v1.0.0)
// https://jsonresume.org/schema/
// ============================================================================

/// Root JSON Resume structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonResume {
    #[serde(default)]
    pub basics: Basics,
    #[serde(default)]
    pub work: Vec<Work>,
    #[serde(default)]
    pub volunteer: Vec<Volunteer>,
    #[serde(default)]
    pub education: Vec<EducationItem>,
    #[serde(default)]
    pub awards: Vec<Award>,
    #[serde(default)]
    pub certificates: Vec<Certificate>,
    #[serde(default)]
    pub publications: Vec<Publication>,
    #[serde(default)]
    pub skills: Vec<SkillItem>,
    #[serde(default)]
    pub languages: Vec<Language>,
    #[serde(default)]
    pub interests: Vec<Interest>,
    #[serde(default)]
    pub references: Vec<Reference>,
    #[serde(default)]
    pub projects: Vec<Project>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Basics {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub image: String,
    #[serde(default)]
    pub email: String,
    #[serde(default)]
    pub phone: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub location: Location,
    #[serde(default)]
    pub profiles: Vec<Profile>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Location {
    #[serde(default)]
    pub address: String,
    #[serde(default)]
    pub postal_code: String,
    #[serde(default)]
    pub city: String,
    #[serde(default)]
    pub country_code: String,
    #[serde(default)]
    pub region: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Profile {
    #[serde(default)]
    pub network: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub url: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Work {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub position: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub start_date: String,
    #[serde(default)]
    pub end_date: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub highlights: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Volunteer {
    #[serde(default)]
    pub organization: String,
    #[serde(default)]
    pub position: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub start_date: String,
    #[serde(default)]
    pub end_date: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub highlights: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EducationItem {
    #[serde(default)]
    pub institution: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub area: String,
    #[serde(default)]
    pub study_type: String,
    #[serde(default)]
    pub start_date: String,
    #[serde(default)]
    pub end_date: String,
    #[serde(default)]
    pub score: String,
    #[serde(default)]
    pub courses: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Award {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub awarder: String,
    #[serde(default)]
    pub summary: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Certificate {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub issuer: String,
    #[serde(default)]
    pub url: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Publication {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub publisher: String,
    #[serde(default)]
    pub release_date: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub summary: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SkillItem {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub level: String,
    #[serde(default)]
    pub keywords: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Language {
    #[serde(default)]
    pub language: String,
    #[serde(default)]
    pub fluency: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Interest {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub keywords: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Reference {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub reference: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub highlights: Vec<String>,
    #[serde(default)]
    pub start_date: String,
    #[serde(default)]
    pub end_date: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub roles: Vec<String>,
    #[serde(default)]
    pub entity: String,
    #[serde(default, rename = "type")]
    pub project_type: String,
    #[serde(default)]
    pub keywords: Vec<String>,
}

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

        // Projects are represented as experience entries with project-specific flags
        let mut all_experience = experience;
        all_experience.extend(self.convert_projects());

        Ok(ConvertedResumeData {
            contact_info,
            summary,
            experience: all_experience,
            education,
            skills,
            certifications,
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

    /// Convert projects to ConvertedExperience entries
    fn convert_projects(&self) -> Vec<ConvertedExperience> {
        self.projects
            .iter()
            .map(|project| {
                let title = if !project.roles.is_empty() {
                    format!("{} - {}", project.name, project.roles.join(", "))
                } else {
                    project.name.clone()
                };

                let company = if !project.entity.is_empty() {
                    format!("Project at {}", project.entity)
                } else {
                    "Personal Project".to_string()
                };

                ConvertedExperience {
                    title,
                    company,
                    location: String::new(),
                    start_date: project.start_date.clone(),
                    end_date: if project.end_date.is_empty() {
                        "Present".to_string()
                    } else {
                        project.end_date.clone()
                    },
                    achievements: project.highlights.clone(),
                    current: project.end_date.is_empty(),
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

            // Add the skill name as a skill entry
            if !skill.name.is_empty() {
                skills.push(ConvertedSkill {
                    name: skill.name.clone(),
                    proficiency: Some(proficiency.clone()),
                });
            }

            // Add all keywords as separate skills with the same proficiency
            for keyword in &skill.keywords {
                if !keyword.is_empty() {
                    skills.push(ConvertedSkill {
                        name: keyword.clone(),
                        proficiency: Some(proficiency.clone()),
                    });
                }
            }
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

        certifications
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_valid_json_resume() {
        let json = r#"{
            "basics": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "555-1234",
                "summary": "Software engineer with 5 years of experience"
            },
            "work": [{
                "name": "Acme Corp",
                "position": "Senior Engineer",
                "startDate": "2020-01-01",
                "endDate": "2024-12-31",
                "highlights": ["Led team of 5", "Built microservices"]
            }],
            "skills": [{
                "name": "Programming",
                "level": "Advanced",
                "keywords": ["Rust", "Python", "JavaScript"]
            }]
        }"#;

        let resume = JsonResume::from_json(json).unwrap();
        assert_eq!(resume.basics.name, "John Doe");
        assert_eq!(resume.work.len(), 1);
        assert_eq!(resume.skills.len(), 1);
    }

    #[test]
    fn test_parse_partial_json_resume() {
        // Missing most fields - should parse with defaults
        let json = r#"{"basics": {"name": "Jane Smith"}}"#;

        let resume = JsonResume::from_json(json).unwrap();
        assert_eq!(resume.basics.name, "Jane Smith");
        assert!(resume.work.is_empty());
        assert!(resume.skills.is_empty());
    }

    #[test]
    fn test_convert_contact_info() {
        let json = r#"{
            "basics": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+1-555-1234",
                "url": "https://johndoe.com",
                "location": {
                    "city": "San Francisco",
                    "region": "CA"
                },
                "profiles": [
                    {"network": "LinkedIn", "url": "https://linkedin.com/in/johndoe"},
                    {"network": "GitHub", "url": "https://github.com/johndoe"}
                ]
            }
        }"#;

        let resume = JsonResume::from_json(json).unwrap();
        let contact = resume.convert_contact_info();

        assert_eq!(contact.name, "John Doe");
        assert_eq!(contact.email, "john@example.com");
        assert_eq!(contact.phone, "+1-555-1234");
        assert_eq!(contact.location, "San Francisco, CA");
        assert_eq!(
            contact.linkedin,
            Some("https://linkedin.com/in/johndoe".to_string())
        );
        assert_eq!(
            contact.github,
            Some("https://github.com/johndoe".to_string())
        );
        assert_eq!(contact.website, Some("https://johndoe.com".to_string()));
    }

    #[test]
    fn test_convert_experience() {
        let json = r#"{
            "work": [{
                "name": "Tech Corp",
                "position": "Software Engineer",
                "startDate": "2020-01-01",
                "endDate": "2022-12-31",
                "highlights": ["Built features", "Fixed bugs"]
            }, {
                "name": "Startup Inc",
                "position": "Lead Developer",
                "startDate": "2023-01-01",
                "endDate": "",
                "highlights": ["Leading team"]
            }],
            "volunteer": [{
                "organization": "Code.org",
                "position": "Mentor",
                "startDate": "2021-01-01",
                "endDate": "2021-12-31",
                "highlights": ["Taught coding"]
            }]
        }"#;

        let resume = JsonResume::from_json(json).unwrap();
        let experience = resume.convert_experience();

        assert_eq!(experience.len(), 3);
        assert_eq!(experience[0].company, "Tech Corp");
        assert_eq!(experience[1].title, "Lead Developer");
        assert_eq!(experience[1].end_date, "Present");
        assert!(experience[1].current);
        assert_eq!(experience[2].title, "Mentor (Volunteer)");
    }

    #[test]
    fn test_convert_education() {
        let json = r#"{
            "education": [{
                "institution": "MIT",
                "studyType": "Bachelor",
                "area": "Computer Science",
                "endDate": "2019-05-15",
                "score": "3.8",
                "courses": ["Algorithms", "Databases"]
            }]
        }"#;

        let resume = JsonResume::from_json(json).unwrap();
        let education = resume.convert_education();

        assert_eq!(education.len(), 1);
        assert_eq!(education[0].degree, "Bachelor in Computer Science");
        assert_eq!(education[0].institution, "MIT");
        assert_eq!(education[0].gpa, Some(3.8));
        assert_eq!(education[0].honors, vec!["Algorithms", "Databases"]);
    }

    #[test]
    fn test_convert_skills() {
        let json = r#"{
            "skills": [
                {
                    "name": "Programming",
                    "level": "Advanced",
                    "keywords": ["Rust", "Python"]
                },
                {
                    "name": "Cloud",
                    "level": "Intermediate",
                    "keywords": ["AWS", "Docker"]
                }
            ]
        }"#;

        let resume = JsonResume::from_json(json).unwrap();
        let skills = resume.convert_skills();

        // Should have: Programming + Rust + Python + Cloud + AWS + Docker = 6 skills
        assert_eq!(skills.len(), 6);
        assert_eq!(skills[0].name, "Programming");
        assert_eq!(skills[0].proficiency, Some(Proficiency::Advanced));
        assert_eq!(skills[1].name, "Rust");
        assert_eq!(skills[1].proficiency, Some(Proficiency::Advanced));
    }

    #[test]
    fn test_convert_certifications() {
        let json = r#"{
            "certificates": [{
                "name": "AWS Certified",
                "issuer": "Amazon",
                "date": "2023-01-01"
            }],
            "awards": [{
                "title": "Employee of the Year",
                "awarder": "Tech Corp",
                "date": "2022-12-01"
            }]
        }"#;

        let resume = JsonResume::from_json(json).unwrap();
        let certifications = resume.convert_certifications();

        assert_eq!(certifications.len(), 2);
        assert_eq!(certifications[0].name, "AWS Certified");
        assert_eq!(certifications[1].name, "Employee of the Year");
    }

    #[test]
    fn test_full_conversion() {
        let json = r#"{
            "basics": {
                "name": "Alice Johnson",
                "email": "alice@example.com",
                "summary": "Full-stack developer"
            },
            "work": [{
                "name": "Company A",
                "position": "Developer",
                "startDate": "2020-01-01",
                "endDate": "2023-12-31",
                "highlights": ["Feature work"]
            }],
            "education": [{
                "institution": "University",
                "studyType": "Bachelor",
                "area": "CS",
                "endDate": "2019"
            }],
            "skills": [{
                "name": "JavaScript",
                "level": "Expert",
                "keywords": ["React", "Node"]
            }]
        }"#;

        let json_resume = JsonResume::from_json(json).unwrap();
        let resume_data = json_resume.to_resume_data().unwrap();

        assert_eq!(resume_data.contact_info.name, "Alice Johnson");
        assert_eq!(resume_data.summary, "Full-stack developer");
        assert_eq!(resume_data.experience.len(), 1);
        assert_eq!(resume_data.education.len(), 1);
        assert_eq!(resume_data.skills.len(), 3); // JavaScript + React + Node
    }

    #[test]
    fn test_empty_json_resume() {
        let json = "{}";
        let resume = JsonResume::from_json(json).unwrap();
        let data = resume.to_resume_data().unwrap();

        // Should not panic, should have empty/default values
        assert!(data.contact_info.name.is_empty());
        assert!(data.experience.is_empty());
        assert!(data.skills.is_empty());
    }
}
