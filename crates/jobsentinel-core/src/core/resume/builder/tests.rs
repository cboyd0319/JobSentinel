use super::*;

async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();

    // Create resume_drafts table
    sqlx::query(
        r#"
            CREATE TABLE resume_drafts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    pool
}

#[tokio::test]
async fn test_create_resume() {
    let pool = setup_test_db().await;
    let builder = ResumeBuilder::new(pool);

    let resume_id = builder.create_resume().await.unwrap();
    assert!(resume_id > 0);

    let resume = builder.get_resume(resume_id).await.unwrap().unwrap();
    assert_eq!(resume.id, resume_id);
    assert!(resume.contact.name.is_empty());
    assert!(resume.summary.is_empty());
}

#[tokio::test]
async fn test_update_contact() {
    let pool = setup_test_db().await;
    let builder = ResumeBuilder::new(pool);

    let resume_id = builder.create_resume().await.unwrap();

    let contact = ContactInfo {
        name: "Jordan Lee".to_string(),
        email: "jordan@example.com".to_string(),
        phone: Some("+1-555-0100".to_string()),
        linkedin: Some("linkedin.com/in/jordan-lee".to_string()),
        github: None,
        location: Some("Portland, OR".to_string()),
        website: Some("jordanlee.example.com".to_string()),
    };

    builder
        .update_contact(resume_id, contact.clone())
        .await
        .unwrap();

    let resume = builder.get_resume(resume_id).await.unwrap().unwrap();
    assert_eq!(resume.contact.name, "Jordan Lee");
    assert_eq!(resume.contact.email, "jordan@example.com");
    assert_eq!(resume.contact.phone.unwrap(), "+1-555-0100");
}

#[tokio::test]
async fn test_add_experience() {
    let pool = setup_test_db().await;
    let builder = ResumeBuilder::new(pool);

    let resume_id = builder.create_resume().await.unwrap();

    let exp = Experience {
        id: 0, // Will be assigned
        company: "Harbor Community Services".to_string(),
        title: "Program Operations Lead".to_string(),
        location: Some("Remote".to_string()),
        start_date: "2020-01".to_string(),
        end_date: None,
        is_current: true,
        achievements: vec![
            "Coordinated a 5-person intake team".to_string(),
            "Reduced client intake turnaround by 30%".to_string(),
        ],
    };

    let exp_id = builder.add_experience(resume_id, exp).await.unwrap();
    assert_eq!(exp_id, 1);

    let resume = builder.get_resume(resume_id).await.unwrap().unwrap();
    assert_eq!(resume.experience.len(), 1);
    assert_eq!(resume.experience[0].company, "Harbor Community Services");
    assert_eq!(resume.experience[0].achievements.len(), 2);
}

#[tokio::test]
async fn test_delete_experience() {
    let pool = setup_test_db().await;
    let builder = ResumeBuilder::new(pool);

    let resume_id = builder.create_resume().await.unwrap();

    let exp = Experience {
        id: 0,
        company: "Harbor Community Services".to_string(),
        title: "Program Operations Lead".to_string(),
        location: None,
        start_date: "2020-01".to_string(),
        end_date: None,
        is_current: true,
        achievements: vec![],
    };

    let exp_id = builder.add_experience(resume_id, exp).await.unwrap();
    builder.delete_experience(resume_id, exp_id).await.unwrap();

    let resume = builder.get_resume(resume_id).await.unwrap().unwrap();
    assert_eq!(resume.experience.len(), 0);
}

#[tokio::test]
async fn test_delete_missing_experience_returns_error() {
    let pool = setup_test_db().await;
    let builder = ResumeBuilder::new(pool);

    let resume_id = builder.create_resume().await.unwrap();
    let result = builder.delete_experience(resume_id, 999).await;

    assert!(result.is_err());
}

#[tokio::test]
async fn test_set_skills() {
    let pool = setup_test_db().await;
    let builder = ResumeBuilder::new(pool);

    let resume_id = builder.create_resume().await.unwrap();

    let skills = vec![
        SkillEntry {
            name: "Rust".to_string(),
            category: "Programming Language".to_string(),
            proficiency: Some("expert".to_string()),
            years_experience: Some(5.0),
        },
        SkillEntry {
            name: "Tokio".to_string(),
            category: "Framework".to_string(),
            proficiency: Some("advanced".to_string()),
            years_experience: Some(3.0),
        },
    ];

    builder.set_skills(resume_id, skills).await.unwrap();

    let resume = builder.get_resume(resume_id).await.unwrap().unwrap();
    assert_eq!(resume.skills.len(), 2);
    assert_eq!(resume.skills[0].name, "Rust");
}

#[test]
fn test_builder_deserializes_frontend_resume_payload_shapes() {
    let experience: Experience = serde_json::from_value(serde_json::json!({
        "id": 0,
        "title": "Program Coordinator",
        "company": "Community Clinic",
        "location": "Portland, OR",
        "start_date": "2022-01",
        "end_date": null,
        "achievements": ["Improved intake scheduling"]
    }))
    .expect("frontend experience payload should deserialize");

    assert_eq!(experience.achievements, vec!["Improved intake scheduling"]);

    let education: Education = serde_json::from_value(serde_json::json!({
        "id": 0,
        "degree": "BA",
        "institution": "Metro College",
        "location": "Portland, OR",
        "graduation_date": "2020",
        "gpa": "3.8",
        "honors": ["Dean's List"]
    }))
    .expect("frontend education payload should deserialize");

    assert_eq!(education.graduation_date.as_deref(), Some("2020"));
    assert_eq!(education.honors, vec!["Dean's List"]);

    let skill: SkillEntry = serde_json::from_value(serde_json::json!({
        "name": "Patient Intake",
        "category": "Operations",
        "proficiency": "advanced"
    }))
    .expect("frontend skill payload should deserialize");

    assert_eq!(skill.category, "Operations");
    assert_eq!(skill.proficiency.as_deref(), Some("advanced"));
}

#[tokio::test]
async fn test_delete_resume() {
    let pool = setup_test_db().await;
    let builder = ResumeBuilder::new(pool);

    let resume_id = builder.create_resume().await.unwrap();
    builder.delete_resume(resume_id).await.unwrap();

    let result = builder.get_resume(resume_id).await.unwrap();
    assert!(result.is_none());
}

#[tokio::test]
async fn test_delete_missing_education_returns_error() {
    let pool = setup_test_db().await;
    let builder = ResumeBuilder::new(pool);

    let resume_id = builder.create_resume().await.unwrap();
    let result = builder.delete_education(resume_id, 999).await;

    assert!(result.is_err());
}

#[tokio::test]
async fn test_delete_missing_resume_returns_error() {
    let pool = setup_test_db().await;
    let builder = ResumeBuilder::new(pool);

    let result = builder.delete_resume(999).await;

    assert!(result.is_err());
}
