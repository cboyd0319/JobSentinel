use super::*;
use crate::structured_resume::{
    ResumeEducation, ResumeExperience, ResumePersonalInfo, ResumeSkill, ResumeSkillCategory,
};

fn create_test_resume() -> StructuredResume {
    StructuredResume {
        personal: ResumePersonalInfo {
            name: "Jordan Lee".to_string(),
            email: "jordan.lee@example.com".to_string(),
            phone: Some("+1-555-0123".to_string()),
            location: Some("Portland, OR".to_string()),
            linkedin: Some("linkedin.com/in/jordan-lee".to_string()),
            github: None,
            website: Some("jordanlee.example.com".to_string()),
        },
        summary: Some(
            "Experienced program coordinator with 5+ years in client services.".to_string(),
        ),
        experience: vec![ResumeExperience {
            company: "Harbor Community Services".to_string(),
            title: "Program Operations Lead".to_string(),
            start_date: "Jan 2020".to_string(),
            end_date: None,
            is_current: true,
            location: Some("Portland, OR".to_string()),
            achievements: vec![
                "Coordinated client intake scheduling".to_string(),
                "Led a 5-person case coordination team".to_string(),
            ],
        }],
        education: vec![ResumeEducation {
            institution: "State University".to_string(),
            degree: "B.S.".to_string(),
            field_of_study: Some("Public Administration".to_string()),
            location: None,
            graduation_date: Some("2019".to_string()),
            gpa: Some("3.8".to_string()),
            honors: vec![],
        }],
        skills: vec![ResumeSkillCategory {
            name: "Client Services".to_string(),
            skills: vec!["Case documentation", "Scheduling"]
                .into_iter()
                .map(|name| ResumeSkill {
                    name: name.to_string(),
                    proficiency: None,
                    years_experience: None,
                })
                .collect(),
        }],
        certifications: vec![],
        projects: vec![],
        clearance: None,
        military_info: None,
    }
}

#[test]
fn test_export_text() {
    let resume = create_test_resume();
    let text = ResumeExporter::export_text(&resume);

    assert!(text.contains("Jordan Lee"));
    assert!(text.contains("jordan.lee@example.com"));
    assert!(text.contains("Harbor Community Services"));
    assert!(text.contains("State University"));
    assert!(text.contains("Scheduling"));
}

#[test]
fn test_export_docx() {
    let resume = create_test_resume();
    let result = ResumeExporter::export_docx(&resume, TemplateId::Professional);

    assert!(result.is_ok());
    let bytes = result.unwrap();
    assert!(!bytes.is_empty());
    // DOCX files start with PK zip header
    assert_eq!(&bytes[0..2], b"PK");
}

#[test]
fn test_export_html() {
    let resume = create_test_resume();
    let html = ResumeExporter::export_html(&resume, TemplateId::Professional);

    assert!(!html.is_empty());
    assert!(html.contains("<html"));
    assert!(html.contains("Jordan Lee"));
    assert!(html.contains("jordan.lee@example.com"));
    assert!(html.contains("Harbor Community Services"));
    assert!(html.contains("State University"));
}

#[test]
fn test_format_contact_line() {
    let personal = ResumePersonalInfo {
        name: "Jane Smith".to_string(),
        email: "jane@example.com".to_string(),
        phone: Some("555-1234".to_string()),
        location: Some("New York, NY".to_string()),
        linkedin: Some("linkedin.com/in/janesmith".to_string()),
        github: None,
        website: None,
    };

    let line = format_contact_line(&personal);
    assert!(line.contains("jane@example.com"));
    assert!(line.contains("555-1234"));
    assert!(line.contains("New York, NY"));
    assert!(line.contains("linkedin.com/in/janesmith"));
    assert!(line.contains(" | "));
}

#[test]
fn test_template_id_default() {
    let template = TemplateId::default();
    assert!(matches!(template, TemplateId::Professional));
}

#[test]
fn test_empty_resume() {
    let resume = StructuredResume {
        personal: ResumePersonalInfo {
            name: "Empty User".to_string(),
            email: "empty@example.com".to_string(),
            phone: Some("000-0000".to_string()),
            location: Some("Nowhere".to_string()),
            linkedin: None,
            github: None,
            website: None,
        },
        summary: None,
        experience: vec![],
        education: vec![],
        skills: vec![],
        certifications: vec![],
        projects: vec![],
        clearance: None,
        military_info: None,
    };

    let text = ResumeExporter::export_text(&resume);
    assert!(text.contains("Empty User"));
    assert!(!text.contains("EXPERIENCE"));
    assert!(!text.contains("EDUCATION"));
}
