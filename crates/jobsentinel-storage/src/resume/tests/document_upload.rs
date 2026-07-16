use super::*;
use jobsentinel_documents::{
    ExportResumeData, ExportSkillCategory, ExportTemplateId, PersonalInfo, ResumeExporter,
};

#[tokio::test]
async fn test_upload_resume_docx_parses_text_and_extracts_skills() {
    let pool = setup_test_db().await;
    let matcher = ResumeMatcher::new(pool.clone());
    let temp_dir = tempfile::TempDir::new().unwrap();
    let file_path = temp_dir.path().join("operations-resume.docx");
    let bytes = ResumeExporter::export_docx(
        &ExportResumeData {
            personal: PersonalInfo {
                full_name: "Jordan Lee".to_string(),
                email: "jordan@example.com".to_string(),
                phone: String::new(),
                location: String::new(),
                linkedin_url: None,
                website_url: None,
            },
            summary: None,
            experience: Vec::new(),
            education: Vec::new(),
            skills: vec![ExportSkillCategory {
                category: "Skills".to_string(),
                skills: vec!["Project Management".to_string(), "Agile".to_string()],
            }],
            certifications: Vec::new(),
            projects: Vec::new(),
        },
        ExportTemplateId::Professional,
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
