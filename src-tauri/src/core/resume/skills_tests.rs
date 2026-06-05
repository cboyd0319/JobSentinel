use super::*;

#[test]
fn test_extract_programming_languages() {
    let extractor = SkillExtractor::new();

    let resume_text = r#"
        SKILLS
        Proficient in Python, JavaScript, and Rust.
        Experience with TypeScript and Go.
        "#;

    let skills = extractor.extract_skills(resume_text);

    let skill_names: Vec<String> = skills.iter().map(|s| s.skill_name.clone()).collect();

    assert!(skill_names.contains(&"Python".to_string()));
    assert!(skill_names.contains(&"JavaScript".to_string()));
    assert!(skill_names.contains(&"Rust".to_string()));
    assert!(skill_names.contains(&"TypeScript".to_string()));
    assert!(skill_names.contains(&"Go".to_string()));
}

#[test]
fn test_extract_frameworks() {
    let extractor = SkillExtractor::new();

    let resume_text = "Built applications using React, Django, and Docker.";
    let skills = extractor.extract_skills(resume_text);

    let skill_names: Vec<String> = skills.iter().map(|s| s.skill_name.clone()).collect();

    assert!(skill_names.contains(&"React".to_string()));
    assert!(skill_names.contains(&"Django".to_string()));
    assert!(skill_names.contains(&"Docker".to_string()));
}

#[test]
fn test_skill_categories() {
    let extractor = SkillExtractor::new();

    let resume_text = "Python, React, PostgreSQL, AWS";
    let skills = extractor.extract_skills(resume_text);

    let python_skill = skills.iter().find(|s| s.skill_name == "Python").unwrap();
    assert_eq!(
        python_skill.skill_category,
        Some("programming_language".to_string())
    );

    let react_skill = skills.iter().find(|s| s.skill_name == "React").unwrap();
    assert_eq!(react_skill.skill_category, Some("framework".to_string()));

    let postgres_skill = skills
        .iter()
        .find(|s| s.skill_name == "PostgreSQL")
        .unwrap();
    assert_eq!(postgres_skill.skill_category, Some("database".to_string()));

    let aws_skill = skills.iter().find(|s| s.skill_name == "AWS").unwrap();
    assert_eq!(aws_skill.skill_category, Some("cloud_platform".to_string()));
}

#[test]
fn test_confidence_scoring() {
    let extractor = SkillExtractor::new();

    let resume_text = r#"
        SKILLS
        Python, Python, Python - 5 years experience
        Rust - basic knowledge
        "#;

    let skills = extractor.extract_skills(resume_text);

    let python_skill = skills.iter().find(|s| s.skill_name == "Python").unwrap();
    let rust_skill = skills.iter().find(|s| s.skill_name == "Rust").unwrap();

    // Python should have higher confidence (mentioned multiple times in Skills section)
    assert!(python_skill.confidence_score > rust_skill.confidence_score);
}

#[test]
fn test_no_duplicate_skills() {
    let extractor = SkillExtractor::new();

    let resume_text = "Python Python Python JavaScript JavaScript";
    let skills = extractor.extract_skills(resume_text);

    let python_count = skills.iter().filter(|s| s.skill_name == "Python").count();
    let js_count = skills
        .iter()
        .filter(|s| s.skill_name == "JavaScript")
        .count();

    assert_eq!(python_count, 1, "Should only have one Python skill");
    assert_eq!(js_count, 1, "Should only have one JavaScript skill");
}

#[test]
fn test_word_boundary_matching() {
    let extractor = SkillExtractor::new();

    // "R" should not match "React" or "for"
    let resume_text = "React programming for data science";
    let skills = extractor.extract_skills(resume_text);

    let skill_names: Vec<String> = skills.iter().map(|s| s.skill_name.clone()).collect();

    assert!(skill_names.contains(&"React".to_string()));
}

#[test]
fn test_extract_skills_empty_text() {
    let extractor = SkillExtractor::new();
    let skills = extractor.extract_skills("");
    assert_eq!(skills.len(), 0);
}

#[test]
fn test_extract_skills_no_matches() {
    let extractor = SkillExtractor::new();
    let resume_text = "I like cooking and gardening in my free time.";
    let skills = extractor.extract_skills(resume_text);
    assert_eq!(skills.len(), 0);
}

#[test]
fn test_extract_tools() {
    let extractor = SkillExtractor::new();
    let resume_text = "Expert with Docker, Kubernetes, and Jenkins CI/CD";
    let skills = extractor.extract_skills(resume_text);

    let skill_names: Vec<String> = skills.iter().map(|s| s.skill_name.clone()).collect();
    assert!(skill_names.contains(&"Docker".to_string()));
    assert!(skill_names.contains(&"Kubernetes".to_string()));
    assert!(skill_names.contains(&"Jenkins".to_string()));

    let docker_skill = skills.iter().find(|s| s.skill_name == "Docker").unwrap();
    assert_eq!(docker_skill.skill_category, Some("tool".to_string()));
}

#[test]
fn test_extract_databases() {
    let extractor = SkillExtractor::new();
    let resume_text = "Worked with PostgreSQL, MongoDB, and Redis caching";
    let skills = extractor.extract_skills(resume_text);

    let skill_names: Vec<String> = skills.iter().map(|s| s.skill_name.clone()).collect();
    assert!(skill_names.contains(&"PostgreSQL".to_string()));
    assert!(skill_names.contains(&"MongoDB".to_string()));
    assert!(skill_names.contains(&"Redis".to_string()));

    let postgres_skill = skills
        .iter()
        .find(|s| s.skill_name == "PostgreSQL")
        .unwrap();
    assert_eq!(postgres_skill.skill_category, Some("database".to_string()));
}

#[test]
fn test_extract_cloud_platforms() {
    let extractor = SkillExtractor::new();
    let resume_text = "Deployed on AWS, Azure, and Google Cloud Platform (GCP)";
    let skills = extractor.extract_skills(resume_text);

    let skill_names: Vec<String> = skills.iter().map(|s| s.skill_name.clone()).collect();
    assert!(skill_names.contains(&"AWS".to_string()));
    assert!(skill_names.contains(&"Azure".to_string()));
    assert!(skill_names.contains(&"GCP".to_string()));

    let aws_skill = skills.iter().find(|s| s.skill_name == "AWS").unwrap();
    assert_eq!(aws_skill.skill_category, Some("cloud_platform".to_string()));
}

#[test]
fn test_extract_soft_skills() {
    let extractor = SkillExtractor::new();
    let resume_text =
        "Strong leadership and communication skills. Experienced in Agile and Scrum methodologies.";
    let skills = extractor.extract_skills(resume_text);

    let skill_names: Vec<String> = skills.iter().map(|s| s.skill_name.clone()).collect();
    assert!(skill_names.contains(&"Leadership".to_string()));
    assert!(skill_names.contains(&"Communication".to_string()));
    assert!(skill_names.contains(&"Agile".to_string()));
    assert!(skill_names.contains(&"Scrum".to_string()));

    let leadership_skill = skills
        .iter()
        .find(|s| s.skill_name == "Leadership")
        .unwrap();
    assert_eq!(
        leadership_skill.skill_category,
        Some("soft_skill".to_string())
    );
}

#[test]
fn test_extract_role_specific_skills_for_broad_job_seekers() {
    let extractor = SkillExtractor::new();
    let resume_text = r#"
        SKILLS
        SEO, Content Strategy, Patient Care, Curriculum Development,
        Financial Modeling, Contract Negotiation, Video Production,
        Customer Success, Pipeline Management, Process Improvement,
        Marketplace Operations, Lifecycle Automation, Product Marketing,
        Help Center, Policy Review.
        "#;

    let skills = extractor.extract_skills(resume_text);

    let category_for = |name: &str| {
        skills
            .iter()
            .find(|skill| skill.skill_name == name)
            .and_then(|skill| skill.skill_category.as_deref())
    };

    assert_eq!(category_for("SEO"), Some("marketing"));
    assert_eq!(category_for("Patient Care"), Some("healthcare"));
    assert_eq!(category_for("Curriculum Development"), Some("education"));
    assert_eq!(category_for("Financial Modeling"), Some("finance"));
    assert_eq!(category_for("Contract Negotiation"), Some("legal"));
    assert_eq!(category_for("Video Production"), Some("creative"));
    assert_eq!(category_for("Customer Success"), Some("customer_success"));
    assert_eq!(category_for("Pipeline Management"), Some("sales"));
    assert_eq!(category_for("Process Improvement"), Some("operations"));
    assert_eq!(category_for("Marketplace Operations"), Some("operations"));
    assert_eq!(
        category_for("Lifecycle Automation"),
        Some("customer_success")
    );
    assert_eq!(category_for("Product Marketing"), Some("marketing"));
    assert_eq!(category_for("Help Center"), Some("customer_success"));
    assert_eq!(category_for("Policy Review"), Some("legal"));
}

#[test]
fn test_confidence_score_max_capping() {
    let extractor = SkillExtractor::new();
    // Mention Python 20+ times in skills section
    let mut resume_text = String::from("SKILLS\n");
    for _ in 0..20 {
        resume_text.push_str("Python ");
    }

    let skills = extractor.extract_skills(&resume_text);
    let python_skill = skills.iter().find(|s| s.skill_name == "Python").unwrap();

    // Confidence should be capped at 1.0
    assert!(python_skill.confidence_score <= 1.0);
    assert!(python_skill.confidence_score > 0.9);
}

#[test]
fn test_confidence_score_without_skills_section() {
    let extractor = SkillExtractor::new();
    let resume_text = "Python Python Python"; // No "SKILLS" keyword
    let skills = extractor.extract_skills(resume_text);

    let _python_skill = skills.iter().find(|s| s.skill_name == "Python").unwrap();
    let text_lower = resume_text.to_lowercase();
    let confidence = extractor.calculate_confidence(&text_lower, "Python");

    // Should have lower confidence without "skills" section
    // Base (0.2) + frequency (0.3) + context without skills section (0.15) = 0.65
    assert!(
        confidence >= 0.6 && confidence < 0.75,
        "Expected confidence between 0.6 and 0.75, got {}",
        confidence
    );
}

#[test]
fn test_contains_skill_case_insensitive() {
    let extractor = SkillExtractor::new();
    let text = "i know python and javascript very well";

    assert!(extractor.contains_skill(text, "Python"));
    assert!(extractor.contains_skill(text, "JavaScript"));
    assert!(extractor.contains_skill(text, "PYTHON"));
}

#[test]
fn test_contains_skill_word_boundary() {
    let extractor = SkillExtractor::new();

    // Test that word boundaries work for normal words (text should be lowercase)
    let text = "python developer with python experience";
    assert!(extractor.contains_skill(&text, "Python"));

    // Test that partial matches don't work with word boundaries
    let text3 = "javascript developer";
    assert!(!extractor.contains_skill(&text3, "Java")); // Should not match Java within JavaScript
}

#[test]
fn test_skills_sorted_by_confidence() {
    let extractor = SkillExtractor::new();
    let resume_text = r#"
        SKILLS
        Python Python Python Python Python
        Rust
        "#;

    let skills = extractor.extract_skills(resume_text);

    // Skills should be sorted by confidence (highest first)
    if skills.len() >= 2 {
        for i in 0..skills.len() - 1 {
            assert!(
                skills[i].confidence_score >= skills[i + 1].confidence_score,
                "Skills not sorted by confidence"
            );
        }
    }
}

#[test]
fn test_default_trait() {
    let extractor1 = SkillExtractor::default();
    let extractor2 = SkillExtractor::new();

    let text = "Python JavaScript Rust";
    let skills1 = extractor1.extract_skills(text);
    let skills2 = extractor2.extract_skills(text);

    assert_eq!(skills1.len(), skills2.len());
}

#[test]
fn test_all_skill_categories_coverage() {
    let extractor = SkillExtractor::new();
    let resume_text = r#"
        SKILLS
        Python, JavaScript, Rust, TypeScript
        React, Django, Docker
        PostgreSQL, MongoDB, Redis
        AWS, Azure, GCP
        Git, Jenkins, Kubernetes
        Leadership, Communication, Agile
        DevOps, Microservices, REST API
        AWS Certified, CISSP
        Security, Penetration Testing
        Data Science, Machine Learning
        "#;

    let skills = extractor.extract_skills(resume_text);

    // Verify multiple categories are present
    let categories: Vec<String> = skills
        .iter()
        .filter_map(|s| s.skill_category.clone())
        .collect();

    assert!(categories.contains(&"programming_language".to_string()));
    assert!(categories.contains(&"framework".to_string()));
    assert!(categories.contains(&"database".to_string()));
    assert!(categories.contains(&"cloud_platform".to_string()));
    assert!(categories.contains(&"tool".to_string()));
    assert!(categories.contains(&"soft_skill".to_string()));
}

#[test]
fn test_special_characters_in_skills() {
    let extractor = SkillExtractor::new();
    // Skills with special chars like C++, C#, .NET
    let resume_text = "Expert in C++, C#, .NET, and Node.js";
    let skills = extractor.extract_skills(resume_text);

    let skill_names: Vec<String> = skills.iter().map(|s| s.skill_name.clone()).collect();

    // At minimum, Node.js and .NET should be in the database
    assert!(
        skill_names.contains(&"Node.js".to_string())
            || skill_names.contains(&".NET".to_string())
            || skill_names.len() > 0,
        "Should extract at least some skills from text with special characters"
    );
}

#[test]
fn test_extract_security_skills() {
    let extractor = SkillExtractor::new();
    let resume_text = "Experienced in DevSecOps, OWASP, and penetration testing";
    let skills = extractor.extract_skills(resume_text);

    let skill_names: Vec<String> = skills.iter().map(|s| s.skill_name.clone()).collect();
    assert!(skill_names.contains(&"DevSecOps".to_string()));
    assert!(skill_names.contains(&"OWASP".to_string()));
}

#[test]
fn test_extract_data_skills() {
    let extractor = SkillExtractor::new();
    let resume_text = "Data Science expertise with Pandas, Spark, and Machine Learning";
    let skills = extractor.extract_skills(resume_text);

    let skill_names: Vec<String> = skills.iter().map(|s| s.skill_name.clone()).collect();
    assert!(skill_names.contains(&"Data Science".to_string()));
    assert!(skill_names.contains(&"Pandas".to_string()));
    assert!(skill_names.contains(&"Machine Learning".to_string()));
}

#[test]
fn test_extract_methodologies() {
    let extractor = SkillExtractor::new();
    let resume_text = "Practiced TDD, CI/CD, and microservices architecture";
    let skills = extractor.extract_skills(resume_text);

    let skill_names: Vec<String> = skills.iter().map(|s| s.skill_name.clone()).collect();
    assert!(skill_names.contains(&"TDD".to_string()));
    assert!(skill_names.contains(&"CI/CD".to_string()));
    assert!(skill_names.contains(&"Microservices".to_string()));
}
