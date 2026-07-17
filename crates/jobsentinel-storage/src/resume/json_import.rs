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
            .to_structured_resume()
            .context("Failed to convert JSON Resume to internal format")?;

        let builder = builder::ResumeBuilder::new(self.db.clone());
        let resume_id = builder.create_resume().await?;

        let contact = builder::ContactInfo {
            name: json_data.personal.name,
            email: json_data.personal.email,
            phone: json_data.personal.phone,
            linkedin: json_data.personal.linkedin,
            github: json_data.personal.github,
            location: json_data.personal.location,
            website: json_data.personal.website,
        };

        builder.update_contact(resume_id, contact).await?;
        builder
            .update_summary(resume_id, json_data.summary.unwrap_or_default())
            .await?;

        for exp in json_data.experience {
            let builder_exp = builder::Experience {
                id: 0,
                company: exp.company,
                title: exp.title,
                location: exp.location,
                start_date: exp.start_date,
                end_date: exp.end_date,
                is_current: exp.is_current,
                achievements: exp.achievements,
            };
            builder.add_experience(resume_id, builder_exp).await?;
        }

        for edu in json_data.education {
            let builder_edu = builder::Education {
                id: 0,
                institution: edu.institution,
                degree: edu.degree,
                location: edu.location,
                graduation_date: edu.graduation_date,
                gpa: edu.gpa,
                honors: edu.honors,
            };
            builder.add_education(resume_id, builder_edu).await?;
        }

        let builder_skills: Vec<builder::SkillEntry> = json_data
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
                date_obtained: cert.date_obtained,
                expiration_date: cert.expiration_date,
                credential_id: cert.credential_id,
            };
            builder.add_certification(resume_id, builder_cert).await?;
        }

        tracing::info!("Imported JSON Resume as draft {}", resume_id);
        Ok(resume_id)
    }
}
