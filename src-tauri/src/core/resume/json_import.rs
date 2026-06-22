use anyhow::{Context, Result};

use super::{builder, json_resume, ResumeMatcher};

impl ResumeMatcher {
    /// Import a resume from JSON Resume format
    ///
    /// Parses a JSON Resume string, converts it to JobSentinel's internal format,
    /// and creates a new resume draft in the database.
    ///
    /// # Arguments
    /// * `name` - Name for the imported resume
    /// * `json_string` - JSON Resume formatted string
    ///
    /// # Returns
    /// The ID of the newly created resume draft
    ///
    /// # Errors
    /// Returns an error if JSON parsing fails or database insertion fails
    pub async fn import_json_resume(&self, _name: String, json_string: &str) -> Result<i64> {
        let json_resume = json_resume::JsonResume::from_json(json_string)
            .context("Failed to parse JSON Resume")?;

        let json_data = json_resume
            .to_resume_data()
            .context("Failed to convert JSON Resume to internal format")?;

        let builder = builder::ResumeBuilder::new(self.db.clone());
        let resume_id = builder.create_resume().await?;

        let contact = builder::ContactInfo {
            name: json_data.contact_info.name,
            email: json_data.contact_info.email,
            phone: Some(json_data.contact_info.phone),
            linkedin: json_data.contact_info.linkedin,
            github: json_data.contact_info.github,
            location: Some(json_data.contact_info.location),
            website: json_data.contact_info.website,
        };

        builder.update_contact(resume_id, contact).await?;
        builder.update_summary(resume_id, json_data.summary).await?;

        for exp in json_data.experience {
            let builder_exp = builder::Experience {
                id: 0,
                company: exp.company,
                title: exp.title,
                location: Some(exp.location),
                start_date: exp.start_date,
                end_date: if exp.current {
                    None
                } else {
                    Some(exp.end_date)
                },
                is_current: exp.current,
                achievements: exp.achievements,
            };
            builder.add_experience(resume_id, builder_exp).await?;
        }

        for edu in json_data.education {
            let builder_edu = builder::Education {
                id: 0,
                institution: edu.institution,
                degree: edu.degree,
                location: Some(edu.location),
                graduation_date: Some(edu.graduation_date),
                gpa: edu.gpa.map(|gpa| gpa.to_string()),
                honors: edu.honors,
            };
            builder.add_education(resume_id, builder_edu).await?;
        }

        let builder_skills: Vec<builder::SkillEntry> = json_data
            .skills
            .into_iter()
            .map(|s| builder::SkillEntry {
                name: s.name,
                category: s.category,
                proficiency: s.proficiency.map(builder_proficiency_label),
                years_experience: None,
            })
            .collect();

        builder.set_skills(resume_id, builder_skills).await?;

        for project in json_data.projects {
            let builder_project = builder::Project {
                name: project.name,
                description: project.description,
                technologies: project.technologies,
                url: project.url,
                start_date: project.start_date,
                end_date: project.end_date,
            };
            builder.add_project(resume_id, builder_project).await?;
        }

        for cert in json_data.certifications {
            let builder_cert = builder::Certification {
                name: cert.name,
                issuer: cert.issuer,
                date_obtained: Some(cert.date),
                expiration_date: None,
                credential_id: None,
            };
            builder.add_certification(resume_id, builder_cert).await?;
        }

        tracing::info!("Imported JSON Resume as draft {}", resume_id);
        Ok(resume_id)
    }
}

fn builder_proficiency_label(proficiency: builder::Proficiency) -> String {
    match proficiency {
        builder::Proficiency::Beginner => "beginner",
        builder::Proficiency::Intermediate => "intermediate",
        builder::Proficiency::Advanced => "advanced",
        builder::Proficiency::Expert => "expert",
    }
    .to_string()
}
