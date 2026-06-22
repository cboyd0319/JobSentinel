use super::*;

#[test]
fn test_parse_valid_json_resume() {
    let json = r#"{
            "basics": {
                "name": "Jordan Lee",
                "email": "jordan@example.com",
                "phone": "555-1234",
                "summary": "Program coordinator with 5 years of experience"
            },
            "work": [{
                "name": "Harbor Services",
                "position": "Program Coordinator",
                "startDate": "2020-01-01",
                "endDate": "2024-12-31",
                "highlights": ["Led team of 5", "Improved intake scheduling"]
            }],
            "skills": [{
                "name": "Program Operations",
                "level": "Advanced",
                "keywords": ["Scheduling", "Reporting", "Client intake"]
            }]
        }"#;

    let resume = JsonResume::from_json(json).unwrap();
    assert_eq!(resume.basics.name, "Jordan Lee");
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
                "name": "Jordan Lee",
                "email": "jordan@example.com",
                "phone": "+1-555-1234",
                "url": "https://jordanlee.example.com",
                "location": {
                    "city": "Portland",
                    "region": "OR"
                },
                "profiles": [
                    {"network": "LinkedIn", "url": "https://linkedin.com/in/jordan-lee"},
                    {"network": "GitHub", "url": "https://github.com/jordan-lee"}
                ]
            }
        }"#;

    let resume = JsonResume::from_json(json).unwrap();
    let contact = resume.convert_contact_info();

    assert_eq!(contact.name, "Jordan Lee");
    assert_eq!(contact.email, "jordan@example.com");
    assert_eq!(contact.phone, "+1-555-1234");
    assert_eq!(contact.location, "Portland, OR");
    assert_eq!(
        contact.linkedin,
        Some("https://linkedin.com/in/jordan-lee".to_string())
    );
    assert_eq!(
        contact.github,
        Some("https://github.com/jordan-lee".to_string())
    );
    assert_eq!(
        contact.website,
        Some("https://jordanlee.example.com".to_string())
    );
}

#[test]
fn test_convert_experience() {
    let json = r#"{
            "work": [{
                "name": "Harbor Services",
                "position": "Program Coordinator",
                "startDate": "2020-01-01",
                "endDate": "2022-12-31",
                "highlights": ["Improved intake scheduling", "Updated service guides"]
            }, {
                "name": "Neighborhood Clinic",
                "position": "Lead Scheduler",
                "startDate": "2023-01-01",
                "endDate": "",
                "highlights": ["Leading team"]
            }],
            "volunteer": [{
                "organization": "Food Bank",
                "position": "Mentor",
                "startDate": "2021-01-01",
                "endDate": "2021-12-31",
                "highlights": ["Trained volunteers"]
            }]
        }"#;

    let resume = JsonResume::from_json(json).unwrap();
    let experience = resume.convert_experience();

    assert_eq!(experience.len(), 3);
    assert_eq!(experience[0].company, "Harbor Services");
    assert_eq!(experience[1].title, "Lead Scheduler");
    assert_eq!(experience[1].end_date, "Present");
    assert!(experience[1].current);
    assert_eq!(experience[2].title, "Mentor (Volunteer)");
}

#[test]
fn test_convert_education() {
    let json = r#"{
            "education": [{
                "institution": "State University",
                "studyType": "Bachelor",
                "area": "Public Administration",
                "endDate": "2019-05-15",
                "score": "3.8",
                "courses": ["Grant Writing", "Program Evaluation"]
            }]
        }"#;

    let resume = JsonResume::from_json(json).unwrap();
    let education = resume.convert_education();

    assert_eq!(education.len(), 1);
    assert_eq!(education[0].degree, "Bachelor in Public Administration");
    assert_eq!(education[0].institution, "State University");
    assert_eq!(education[0].gpa, Some(3.8));
    assert_eq!(
        education[0].honors,
        vec!["Grant Writing", "Program Evaluation"]
    );
}

#[test]
fn test_convert_skills() {
    let json = r#"{
            "skills": [
                {
                    "name": "Client Services",
                    "level": "Advanced",
                    "keywords": ["Scheduling", "Case notes"]
                },
                {
                    "name": "Operations",
                    "level": "Intermediate",
                    "keywords": ["Reporting", "Budget tracking"]
                }
            ]
        }"#;

    let resume = JsonResume::from_json(json).unwrap();
    let skills = resume.convert_skills();

    // Group names become categories, not separate fake skill rows.
    assert_eq!(skills.len(), 4);
    assert_eq!(skills[0].name, "Scheduling");
    assert_eq!(skills[0].category, "Client Services");
    assert_eq!(skills[0].proficiency, Some(Proficiency::Advanced));
    assert_eq!(skills[1].name, "Case notes");
    assert_eq!(skills[1].category, "Client Services");
    assert_eq!(skills[1].proficiency, Some(Proficiency::Advanced));
}

#[test]
fn test_convert_languages_to_skills() {
    let json = r#"{
            "languages": [{
                "language": "Spanish",
                "fluency": "Professional working proficiency"
            }, {
                "language": "Arabic",
                "fluency": "Elementary"
            }]
        }"#;

    let resume = JsonResume::from_json(json).unwrap();
    let skills = resume.convert_skills();

    assert_eq!(skills.len(), 2);
    assert_eq!(skills[0].name, "Spanish - Professional working proficiency");
    assert_eq!(skills[0].category, "Languages");
    assert_eq!(skills[0].proficiency, Some(Proficiency::Advanced));
    assert_eq!(skills[1].name, "Arabic - Elementary");
    assert_eq!(skills[1].category, "Languages");
    assert_eq!(skills[1].proficiency, Some(Proficiency::Beginner));
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
                "awarder": "Harbor Services",
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
fn test_convert_publications_to_certifications() {
    let json = r#"{
            "publications": [{
                "name": "Accessible Hiring Forms",
                "publisher": "Operations Journal",
                "releaseDate": "2024-02-01",
                "summary": "Case study on accessible application forms."
            }]
        }"#;

    let resume = JsonResume::from_json(json).unwrap();
    let certifications = resume.convert_certifications();

    assert_eq!(certifications.len(), 1);
    assert_eq!(
        certifications[0].name,
        "Publication: Accessible Hiring Forms"
    );
    assert_eq!(certifications[0].issuer, "Operations Journal");
    assert_eq!(certifications[0].date, "2024-02-01");
}

#[test]
fn test_convert_projects_preserves_description_keywords_and_url() {
    let json = r#"{
            "projects": [{
                "name": "Clinic Intake Redesign",
                "description": "Improved appointment intake for community clinic.",
                "highlights": ["Reduced missed calls by 18%"],
                "keywords": ["Scheduling", "Patient intake"],
                "url": "https://example.test/project",
                "roles": ["Coordinator"],
                "entity": "Neighborhood Clinic",
                "type": "process"
            }]
        }"#;

    let resume = JsonResume::from_json(json).unwrap();
    let projects = resume.convert_projects();

    assert_eq!(projects.len(), 1);
    assert_eq!(projects[0].name, "Clinic Intake Redesign - Coordinator");
    assert!(projects[0]
        .description
        .contains("Improved appointment intake for community clinic."));
    assert!(projects[0]
        .description
        .contains("Organization: Neighborhood Clinic"));
    assert!(projects[0].description.contains("Type: process"));
    assert!(projects[0]
        .description
        .contains("Reduced missed calls by 18%"));
    assert_eq!(
        projects[0].technologies,
        vec!["Scheduling", "Patient intake"]
    );
    assert_eq!(
        projects[0].url.as_deref(),
        Some("https://example.test/project")
    );
}

#[test]
fn test_full_conversion() {
    let json = r#"{
            "basics": {
                "name": "Applicant Example",
                "email": "applicant@example.test",
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

    assert_eq!(resume_data.contact_info.name, "Applicant Example");
    assert_eq!(resume_data.summary, "Full-stack developer");
    assert_eq!(resume_data.experience.len(), 1);
    assert_eq!(resume_data.education.len(), 1);
    assert_eq!(resume_data.skills.len(), 2); // React + Node under JavaScript
    assert_eq!(resume_data.skills[0].category, "JavaScript");
    assert!(resume_data.projects.is_empty());
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
