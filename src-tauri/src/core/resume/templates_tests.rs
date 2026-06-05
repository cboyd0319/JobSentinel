use super::*;

fn create_test_resume() -> ResumeData {
    ResumeData {
        contact: ContactInfo {
            name: "Jordan Lee".to_string(),
            email: "jordan@example.com".to_string(),
            phone: Some("555-1234".to_string()),
            location: Some("Portland, OR".to_string()),
            linkedin: Some("linkedin.com/in/jordan-lee".to_string()),
            website: Some("jordanlee.example.com".to_string()),
        },
        summary: Some(
            "Community programs manager with 10 years in client services and operations."
                .to_string(),
        ),
        experience: vec![Experience {
            title: "Community Programs Manager".to_string(),
            company: "Harbor Community Services".to_string(),
            location: Some("Portland, OR".to_string()),
            start_date: "Jan 2020".to_string(),
            end_date: None,
            achievements: vec![
                "Coordinated intake program serving 1,000+ clients per year".to_string(),
                "Led a 5-person case coordination team".to_string(),
            ],
        }],
        education: vec![Education {
            degree: "BA Public Administration".to_string(),
            institution: "State University".to_string(),
            location: Some("Portland, OR".to_string()),
            graduation_date: Some("2014".to_string()),
            gpa: Some("3.8".to_string()),
            honors: vec![],
        }],
        skills: vec![
            SkillCategory {
                name: "Languages".to_string(),
                skills: vec!["English".to_string(), "Spanish".to_string()],
            },
            SkillCategory {
                name: "Operations".to_string(),
                skills: vec![
                    "Case documentation".to_string(),
                    "Grant reporting".to_string(),
                ],
            },
        ],
        certifications: vec![],
        clearance: None,
        military_info: None,
    }
}

#[test]
fn test_list_templates() {
    let templates = TemplateRenderer::list_templates();
    assert_eq!(templates.len(), 5);
    assert_eq!(templates[0].id, TemplateId::Classic);
    assert_eq!(templates[1].id, TemplateId::Modern);
    assert_eq!(templates[2].id, TemplateId::Technical);
    assert_eq!(templates[2].name, "Skills-First");
    assert!(templates[2].description.contains("skills matter most"));
    assert!(!templates[2].description.contains("engineering"));
    assert_eq!(templates[3].id, TemplateId::Executive);
    assert_eq!(templates[4].id, TemplateId::Military);
}

#[test]
fn test_template_id_conversion() {
    assert_eq!(TemplateId::Classic.as_str(), "classic");
    assert_eq!(
        "classic".parse::<TemplateId>().unwrap(),
        TemplateId::Classic
    );
    assert!("invalid".parse::<TemplateId>().is_err());
}

#[test]
fn test_render_classic_html() {
    let resume = create_test_resume();
    let html = TemplateRenderer::render_html(&resume, TemplateId::Classic);

    assert!(html.contains("<!DOCTYPE html>"));
    assert!(html.contains("Jordan Lee"));
    assert!(html.contains("jordan@example.com"));
    assert!(html.contains("Community Programs Manager"));
    assert!(html.contains("Harbor Community Services"));
    assert!(html.contains("State University"));
    assert!(html.contains("Grant reporting"));
}

#[test]
fn test_render_modern_html() {
    let resume = create_test_resume();
    let html = TemplateRenderer::render_html(&resume, TemplateId::Modern);

    assert!(html.contains("<!DOCTYPE html>"));
    assert!(html.contains("Jordan Lee"));
    assert!(html.contains("section-divider"));
}

#[test]
fn test_render_technical_html() {
    let resume = create_test_resume();
    let html = TemplateRenderer::render_html(&resume, TemplateId::Technical);

    assert!(html.contains("<!DOCTYPE html>"));
    assert!(html.contains("TECHNICAL SKILLS"));
    assert!(html.contains("Languages"));
    assert!(html.contains("Spanish"));
}

#[test]
fn test_render_executive_html() {
    let resume = create_test_resume();
    let html = TemplateRenderer::render_html(&resume, TemplateId::Executive);

    assert!(html.contains("<!DOCTYPE html>"));
    assert!(html.contains("EXECUTIVE SUMMARY"));
    assert!(html.contains("LEADERSHIP EXPERIENCE"));
}

#[test]
fn test_render_military_html() {
    let mut resume = create_test_resume();
    resume.clearance = Some("Top Secret".to_string());

    let html = TemplateRenderer::render_html(&resume, TemplateId::Military);

    assert!(html.contains("<!DOCTYPE html>"));
    assert!(html.contains("Security Clearance"));
    assert!(html.contains("Top Secret"));
}

#[test]
fn test_render_plain_text() {
    let resume = create_test_resume();
    let text = TemplateRenderer::render_plain_text(&resume);

    assert!(text.contains("Jordan Lee"));
    assert!(text.contains("jordan@example.com"));
    assert!(text.contains("SUMMARY"));
    assert!(text.contains("EXPERIENCE"));
    assert!(text.contains("EDUCATION"));
    assert!(text.contains("SKILLS"));
}

#[test]
fn test_html_escaping() {
    let resume = ResumeData {
        contact: ContactInfo {
            name: "<script>alert('xss')</script>".to_string(),
            email: "test@example.com".to_string(),
            phone: None,
            location: None,
            linkedin: None,
            website: None,
        },
        summary: Some("Test & < > \" '".to_string()),
        experience: vec![],
        education: vec![],
        skills: vec![],
        certifications: vec![],
        clearance: None,
        military_info: None,
    };

    let html = TemplateRenderer::render_html(&resume, TemplateId::Classic);

    assert!(!html.contains("<script>"));
    assert!(html.contains("&lt;script&gt;"));
    assert!(html.contains("&amp;"));
    assert!(html.contains("&lt;"));
    assert!(html.contains("&gt;"));
    assert!(html.contains("&quot;"));
}

#[test]
fn test_empty_sections() {
    let resume = ResumeData {
        contact: ContactInfo {
            name: "Jane Smith".to_string(),
            email: "jane@example.com".to_string(),
            phone: None,
            location: None,
            linkedin: None,
            website: None,
        },
        summary: None,
        experience: vec![],
        education: vec![],
        skills: vec![],
        certifications: vec![],
        clearance: None,
        military_info: None,
    };

    let html = TemplateRenderer::render_html(&resume, TemplateId::Classic);

    assert!(html.contains("Jane Smith"));
    assert!(!html.contains("SUMMARY"));
    assert!(!html.contains("EXPERIENCE"));
}
