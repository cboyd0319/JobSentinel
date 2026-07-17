use super::*;
use jobsentinel_documents::{
    ResumeExporter, ResumePersonalInfo, ResumeSkill, ResumeSkillCategory, StructuredResume,
    TemplateId,
};

#[tokio::test]
async fn test_upload_resume_docx_parses_text_and_extracts_skills() {
    let pool = crate::test_support::migrated_pool().await;
    let matcher = ResumeMatcher::new(pool.clone());
    let temp_dir = tempfile::TempDir::new().unwrap();
    let file_path = temp_dir.path().join("operations-resume.docx");
    let bytes = ResumeExporter::export_docx(
        &StructuredResume {
            personal: ResumePersonalInfo {
                name: "Jordan Lee".to_string(),
                email: "jordan@example.com".to_string(),
                ..ResumePersonalInfo::default()
            },
            summary: None,
            experience: Vec::new(),
            education: Vec::new(),
            skills: vec![ResumeSkillCategory {
                name: "Skills".to_string(),
                skills: vec!["Project Management", "Agile"]
                    .into_iter()
                    .map(|name| ResumeSkill {
                        name: name.to_string(),
                        ..ResumeSkill::default()
                    })
                    .collect(),
            }],
            certifications: Vec::new(),
            projects: Vec::new(),
            ..StructuredResume::default()
        },
        TemplateId::Professional,
    )
    .unwrap();
    std::fs::write(&file_path, bytes).unwrap();

    let resume_id = matcher
        .upload_resume("Operations Resume", &file_path.to_string_lossy())
        .await
        .unwrap();
    let resume = matcher.get_resume(resume_id).await.unwrap();
    let parsed_text = resume.parsed_text.unwrap();
    let skill_names = uploaded_skill_names(matcher.get_user_skills(resume_id).await.unwrap());

    assert!(parsed_text.contains("Project Management"));
    assert!(parsed_text.contains("Agile"));
    assert!(skill_names.contains(&"Project Management".to_string()));
    assert!(skill_names.contains(&"Agile".to_string()));
}
