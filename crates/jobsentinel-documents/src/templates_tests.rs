use super::*;

const ALL_TEMPLATE_IDS: [TemplateId; 5] = [
    TemplateId::Classic,
    TemplateId::Modern,
    TemplateId::Technical,
    TemplateId::Executive,
    TemplateId::Military,
];

fn snapshot_checksum(value: &str) -> u64 {
    value
        .as_bytes()
        .iter()
        .fold(0xcbf29ce484222325, |hash, byte| {
            (hash ^ u64::from(*byte)).wrapping_mul(0x100000001b3)
        })
}

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
        projects: vec![],
        clearance: None,
        military_info: None,
    }
}

#[test]
fn test_html_template_snapshots() {
    let resume = create_test_resume();
    let checksums = ALL_TEMPLATE_IDS
        .map(|template| snapshot_checksum(&TemplateRenderer::render_html(&resume, template)));

    assert_eq!(
        checksums,
        [
            14_030_013_017_775_582_095,
            7_057_356_738_133_148_167,
            16_659_293_794_597_932_322,
            1_008_463_178_470_160_577,
            12_906_799_031_652_123_725,
        ]
    );
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
fn test_render_html_includes_browser_print_rules() {
    let resume = create_test_resume();
    let html = TemplateRenderer::render_html(&resume, TemplateId::Classic);

    assert!(html.contains("@page"));
    assert!(html.contains("@media print"));
    assert!(html.contains("break-inside: avoid"));
    assert!(html.contains(".experience-item"));
    assert!(html.contains(".education-item"));
    assert!(html.contains(".certification-item"));
    assert!(html.contains(".project-item"));
    assert!(html.contains(".skill-category"));
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
fn test_render_html_and_text_include_certifications_and_projects() {
    let mut resume = create_test_resume();
    resume.certifications = vec![Certification {
        name: "Certified Community Health Worker".to_string(),
        issuer: "State Health Board".to_string(),
        date: Some("2024".to_string()),
        expiry: None,
    }];
    resume.projects = vec![Project {
        name: "Clinic Intake Redesign".to_string(),
        description: "Improved appointment intake for community clinic.".to_string(),
        technologies: vec!["Scheduling".to_string(), "Patient intake".to_string()],
        url: Some("https://example.test/project".to_string()),
        start_date: None,
        end_date: None,
    }];

    let html = TemplateRenderer::render_html(&resume, TemplateId::Classic);
    let text = TemplateRenderer::render_plain_text(&resume);

    assert!(html.contains("CERTIFICATIONS"));
    assert!(html.contains("Certified Community Health Worker"));
    assert!(html.contains("State Health Board"));
    assert!(html.contains("PROJECTS"));
    assert!(html.contains("Clinic Intake Redesign"));
    assert!(html.contains("Scheduling, Patient intake"));
    assert!(text.contains("CERTIFICATIONS"));
    assert!(text.contains("Certified Community Health Worker"));
    assert!(text.contains("PROJECTS"));
    assert!(text.contains("Clinic Intake Redesign"));
}

#[test]
fn test_technical_html_does_not_duplicate_certifications_or_projects() {
    let mut resume = create_test_resume();
    resume.certifications = vec![Certification {
        name: "Certified Community Health Worker".to_string(),
        issuer: "State Health Board".to_string(),
        date: Some("2024".to_string()),
        expiry: None,
    }];
    resume.projects = vec![Project {
        name: "Clinic Intake Redesign".to_string(),
        description: "Improved appointment intake for community clinic.".to_string(),
        technologies: vec!["Scheduling".to_string(), "Patient intake".to_string()],
        url: Some("https://example.test/project".to_string()),
        start_date: None,
        end_date: None,
    }];

    let html = TemplateRenderer::render_html(&resume, TemplateId::Technical);

    assert_eq!(html.matches("Certified Community Health Worker").count(), 1);
    assert_eq!(html.matches("Clinic Intake Redesign").count(), 1);
}

#[test]
fn test_all_html_templates_include_certifications_and_projects_once() {
    let mut resume = create_test_resume();
    resume.certifications = vec![Certification {
        name: "Certified Community Health Worker".to_string(),
        issuer: "State Health Board".to_string(),
        date: Some("2024".to_string()),
        expiry: None,
    }];
    resume.projects = vec![Project {
        name: "Clinic Intake Redesign".to_string(),
        description: "Improved appointment intake for community clinic.".to_string(),
        technologies: vec!["Scheduling".to_string(), "Patient intake".to_string()],
        url: Some("https://example.test/project".to_string()),
        start_date: None,
        end_date: None,
    }];

    for template in ALL_TEMPLATE_IDS {
        let html = TemplateRenderer::render_html(&resume, template);
        assert_eq!(
            html.matches("Certified Community Health Worker").count(),
            1,
            "{template:?} should render certification once"
        );
        assert_eq!(
            html.matches("Clinic Intake Redesign").count(),
            1,
            "{template:?} should render project once"
        );
    }
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
        projects: vec![],
        clearance: None,
        military_info: None,
    };

    for template in ALL_TEMPLATE_IDS {
        let html = TemplateRenderer::render_html(&resume, template);

        assert!(!html.contains("<script>"), "{template:?}");
        assert!(html.contains("&lt;script&gt;"), "{template:?}");
        assert!(html.contains("&amp;"), "{template:?}");
        assert!(html.contains("&lt;"), "{template:?}");
        assert!(html.contains("&gt;"), "{template:?}");
        assert!(html.contains("&quot;"), "{template:?}");
    }
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
        projects: vec![],
        clearance: None,
        military_info: None,
    };

    for template in ALL_TEMPLATE_IDS {
        let html = TemplateRenderer::render_html(&resume, template);

        assert!(html.contains("Jane Smith"), "{template:?}");
        assert!(!html.contains("<h2>"), "{template:?}");
    }
}
