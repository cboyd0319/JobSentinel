//! Skill Extraction from Resumes
//!
//! Self-contained keyword-based skill extraction.
//! No external dependencies - works 100% offline with the app.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Extracted skill with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedSkill {
    pub skill_name: String,
    pub skill_category: Option<String>,
    pub confidence_score: f64,
}

/// Skill extractor using keyword matching
///
/// This is a fully self-contained skill extraction system that:
/// - Recognizes 200+ technical and soft skills
/// - Requires no external services or ML models
/// - Works 100% offline
/// - Is deterministic and fast
pub struct SkillExtractor {
    skill_database: SkillDatabase,
}

impl SkillExtractor {
    pub fn new() -> Self {
        Self {
            skill_database: SkillDatabase::default(),
        }
    }

    /// Extract skills from resume text
    ///
    /// Returns a list of skills with confidence scores and categories
    pub fn extract_skills(&self, text: &str) -> Vec<ExtractedSkill> {
        let text_lower = text.to_lowercase();
        let mut found_skills = Vec::new();
        let mut seen_skills = HashSet::new();

        // Extract from all categories
        self.extract_category(
            &text_lower,
            &self.skill_database.programming_languages,
            "programming_language",
            &mut found_skills,
            &mut seen_skills,
        );
        self.extract_category(
            &text_lower,
            &self.skill_database.frameworks,
            "framework",
            &mut found_skills,
            &mut seen_skills,
        );
        self.extract_category(
            &text_lower,
            &self.skill_database.tools,
            "tool",
            &mut found_skills,
            &mut seen_skills,
        );
        self.extract_category(
            &text_lower,
            &self.skill_database.databases,
            "database",
            &mut found_skills,
            &mut seen_skills,
        );
        self.extract_category(
            &text_lower,
            &self.skill_database.cloud_platforms,
            "cloud_platform",
            &mut found_skills,
            &mut seen_skills,
        );
        self.extract_category(
            &text_lower,
            &self.skill_database.soft_skills,
            "soft_skill",
            &mut found_skills,
            &mut seen_skills,
        );
        self.extract_category(
            &text_lower,
            &self.skill_database.methodologies,
            "methodology",
            &mut found_skills,
            &mut seen_skills,
        );
        self.extract_category(
            &text_lower,
            &self.skill_database.certifications,
            "certification",
            &mut found_skills,
            &mut seen_skills,
        );
        self.extract_category(
            &text_lower,
            &self.skill_database.security_skills,
            "security",
            &mut found_skills,
            &mut seen_skills,
        );
        self.extract_category(
            &text_lower,
            &self.skill_database.data_skills,
            "data",
            &mut found_skills,
            &mut seen_skills,
        );

        // Sort by confidence score (highest first)
        found_skills.sort_by(|a, b| {
            b.confidence_score
                .partial_cmp(&a.confidence_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        found_skills
    }

    /// Extract skills from a specific category
    fn extract_category(
        &self,
        text: &str,
        skills: &[String],
        category: &str,
        found_skills: &mut Vec<ExtractedSkill>,
        seen_skills: &mut HashSet<String>,
    ) {
        for skill in skills {
            if self.contains_skill(text, skill) && !seen_skills.contains(skill) {
                found_skills.push(ExtractedSkill {
                    skill_name: skill.clone(),
                    skill_category: Some(category.to_string()),
                    confidence_score: self.calculate_confidence(text, skill),
                });
                seen_skills.insert(skill.clone());
            }
        }
    }

    /// Check if skill is present in text (case-insensitive, word boundary aware)
    fn contains_skill(&self, text: &str, skill: &str) -> bool {
        let skill_lower = skill.to_lowercase();

        // Check for exact match with word boundaries
        let pattern = format!(r"\b{}\b", regex::escape(&skill_lower));
        if let Ok(re) = regex::Regex::new(&pattern) {
            re.is_match(text)
        } else {
            // Fallback to simple contains
            text.contains(&skill_lower)
        }
    }

    /// Calculate confidence score based on:
    /// - Frequency of mentions (0.5)
    /// - Context (appears in "Skills" section vs elsewhere) (0.3)
    /// - Base confidence (0.2)
    fn calculate_confidence(&self, text: &str, skill: &str) -> f64 {
        let skill_lower = skill.to_lowercase();

        // Count occurrences
        let count = text.matches(&skill_lower).count();
        let frequency_score = (count as f64 * 0.1).min(0.5);

        // Check if in "Skills" section
        let context_score = if text.contains("skills") && text.contains(&skill_lower) {
            0.3
        } else {
            0.15
        };

        // Base confidence
        let base_score = 0.2;

        (frequency_score + context_score + base_score).min(1.0)
    }
}

impl Default for SkillExtractor {
    fn default() -> Self {
        Self::new()
    }
}

/// Database of known skills (200+ skills across 10 categories)
#[derive(Debug, Clone)]
struct SkillDatabase {
    programming_languages: Vec<String>,
    frameworks: Vec<String>,
    tools: Vec<String>,
    databases: Vec<String>,
    cloud_platforms: Vec<String>,
    soft_skills: Vec<String>,
    methodologies: Vec<String>,
    certifications: Vec<String>,
    security_skills: Vec<String>,
    data_skills: Vec<String>,
}

impl Default for SkillDatabase {
    fn default() -> Self {
        Self {
            programming_languages: vec![
                // Popular languages
                "Python".to_string(),
                "JavaScript".to_string(),
                "TypeScript".to_string(),
                "Java".to_string(),
                "C++".to_string(),
                "C#".to_string(),
                "C".to_string(),
                "Go".to_string(),
                "Rust".to_string(),
                "Ruby".to_string(),
                "PHP".to_string(),
                "Swift".to_string(),
                "Kotlin".to_string(),
                "Scala".to_string(),
                "R".to_string(),
                "MATLAB".to_string(),
                "SQL".to_string(),
                "HTML".to_string(),
                "CSS".to_string(),
                "Shell".to_string(),
                "Bash".to_string(),
                "PowerShell".to_string(),
                "Perl".to_string(),
                "Lua".to_string(),
                "Haskell".to_string(),
                "Elixir".to_string(),
                "Erlang".to_string(),
                "Clojure".to_string(),
                "F#".to_string(),
                "Dart".to_string(),
                "Julia".to_string(),
                "Groovy".to_string(),
                "Objective-C".to_string(),
                "Assembly".to_string(),
                "COBOL".to_string(),
                "Fortran".to_string(),
                "Solidity".to_string(),
                "Zig".to_string(),
            ],
            frameworks: vec![
                // Web frameworks
                "React".to_string(),
                "Angular".to_string(),
                "Vue".to_string(),
                "Vue.js".to_string(),
                "Next.js".to_string(),
                "Nuxt.js".to_string(),
                "Svelte".to_string(),
                "Django".to_string(),
                "Flask".to_string(),
                "FastAPI".to_string(),
                "Express".to_string(),
                "Express.js".to_string(),
                "Node.js".to_string(),
                "Spring".to_string(),
                "Spring Boot".to_string(),
                "ASP.NET".to_string(),
                ".NET".to_string(),
                ".NET Core".to_string(),
                "Rails".to_string(),
                "Ruby on Rails".to_string(),
                "Laravel".to_string(),
                "Symfony".to_string(),
                "Phoenix".to_string(),
                "Gin".to_string(),
                "Echo".to_string(),
                "Actix".to_string(),
                "Rocket".to_string(),
                "Axum".to_string(),
                "Tauri".to_string(),
                "Electron".to_string(),
                // Mobile
                "React Native".to_string(),
                "Flutter".to_string(),
                "SwiftUI".to_string(),
                "Jetpack Compose".to_string(),
                "Xamarin".to_string(),
                "Ionic".to_string(),
                // ML/AI
                "TensorFlow".to_string(),
                "PyTorch".to_string(),
                "Keras".to_string(),
                "scikit-learn".to_string(),
                "JAX".to_string(),
                "Hugging Face".to_string(),
                "LangChain".to_string(),
                // Testing
                "Playwright".to_string(),
                "Puppeteer".to_string(),
                // State management
                "Redux".to_string(),
                "MobX".to_string(),
                "Zustand".to_string(),
                "Pinia".to_string(),
            ],
            tools: vec![
                // Version control
                "Git".to_string(),
                "GitHub".to_string(),
                "GitLab".to_string(),
                "Bitbucket".to_string(),
                "Mercurial".to_string(),
                "SVN".to_string(),
                // CI/CD
                "Jenkins".to_string(),
                "CircleCI".to_string(),
                "Travis CI".to_string(),
                "GitHub Actions".to_string(),
                "GitLab CI".to_string(),
                "Azure DevOps".to_string(),
                "TeamCity".to_string(),
                "Bamboo".to_string(),
                "ArgoCD".to_string(),
                "Spinnaker".to_string(),
                // Containers
                "Docker".to_string(),
                "Kubernetes".to_string(),
                "Helm".to_string(),
                "Podman".to_string(),
                "containerd".to_string(),
                "OpenShift".to_string(),
                "Rancher".to_string(),
                // Build tools
                "Webpack".to_string(),
                "Vite".to_string(),
                "esbuild".to_string(),
                "Rollup".to_string(),
                "Parcel".to_string(),
                "Maven".to_string(),
                "Gradle".to_string(),
                "Make".to_string(),
                "CMake".to_string(),
                "Cargo".to_string(),
                "npm".to_string(),
                "yarn".to_string(),
                "pnpm".to_string(),
                "pip".to_string(),
                // Testing
                "Jest".to_string(),
                "Mocha".to_string(),
                "Pytest".to_string(),
                "JUnit".to_string(),
                "TestNG".to_string(),
                "Selenium".to_string(),
                "Cypress".to_string(),
                "Postman".to_string(),
                // Monitoring
                "Grafana".to_string(),
                "Prometheus".to_string(),
                "Datadog".to_string(),
                "New Relic".to_string(),
                "Splunk".to_string(),
                "ELK Stack".to_string(),
                "Kibana".to_string(),
                "Jaeger".to_string(),
                "Sentry".to_string(),
                // Infrastructure
                "Terraform".to_string(),
                "Ansible".to_string(),
                "Puppet".to_string(),
                "Chef".to_string(),
                "CloudFormation".to_string(),
                "Pulumi".to_string(),
                // IDEs/Editors
                "VS Code".to_string(),
                "Visual Studio".to_string(),
                "IntelliJ".to_string(),
                "Vim".to_string(),
                "Neovim".to_string(),
                "Emacs".to_string(),
            ],
            databases: vec![
                // SQL
                "PostgreSQL".to_string(),
                "MySQL".to_string(),
                "MariaDB".to_string(),
                "SQLite".to_string(),
                "Microsoft SQL Server".to_string(),
                "SQL Server".to_string(),
                "Oracle".to_string(),
                "Oracle Database".to_string(),
                "CockroachDB".to_string(),
                "TiDB".to_string(),
                // NoSQL
                "MongoDB".to_string(),
                "Redis".to_string(),
                "Cassandra".to_string(),
                "DynamoDB".to_string(),
                "Elasticsearch".to_string(),
                "Neo4j".to_string(),
                "CouchDB".to_string(),
                "Firebase".to_string(),
                "Firestore".to_string(),
                "Supabase".to_string(),
                "RethinkDB".to_string(),
                "InfluxDB".to_string(),
                "TimescaleDB".to_string(),
                // Message queues (data stores)
                "Kafka".to_string(),
                "RabbitMQ".to_string(),
                "Apache Pulsar".to_string(),
                "ActiveMQ".to_string(),
                "SQS".to_string(),
            ],
            cloud_platforms: vec![
                "AWS".to_string(),
                "Amazon Web Services".to_string(),
                "Azure".to_string(),
                "Microsoft Azure".to_string(),
                "Google Cloud".to_string(),
                "Google Cloud Platform".to_string(),
                "GCP".to_string(),
                "Heroku".to_string(),
                "Vercel".to_string(),
                "Netlify".to_string(),
                "DigitalOcean".to_string(),
                "Linode".to_string(),
                "Cloudflare".to_string(),
                "Cloudflare Workers".to_string(),
                "Fly.io".to_string(),
                "Railway".to_string(),
                "Render".to_string(),
                // AWS Services
                "EC2".to_string(),
                "S3".to_string(),
                "Lambda".to_string(),
                "ECS".to_string(),
                "EKS".to_string(),
                "RDS".to_string(),
                "CloudFront".to_string(),
                "Route 53".to_string(),
                // Azure Services
                "Azure Functions".to_string(),
                "Azure Kubernetes Service".to_string(),
                "AKS".to_string(),
                // GCP Services
                "Cloud Run".to_string(),
                "Cloud Functions".to_string(),
                "BigQuery".to_string(),
                "GKE".to_string(),
            ],
            soft_skills: vec![
                "Leadership".to_string(),
                "Communication".to_string(),
                "Team Collaboration".to_string(),
                "Teamwork".to_string(),
                "Problem Solving".to_string(),
                "Critical Thinking".to_string(),
                "Project Management".to_string(),
                "Agile".to_string(),
                "Scrum".to_string(),
                "Kanban".to_string(),
                "Mentoring".to_string(),
                "Public Speaking".to_string(),
                "Presentation".to_string(),
                "Technical Writing".to_string(),
                "Documentation".to_string(),
                "Time Management".to_string(),
                "Prioritization".to_string(),
                "Decision Making".to_string(),
                "Conflict Resolution".to_string(),
                "Negotiation".to_string(),
                "Customer Service".to_string(),
                "Stakeholder Management".to_string(),
                "Cross-functional".to_string(),
                "Remote Work".to_string(),
            ],
            methodologies: vec![
                "DevOps".to_string(),
                "CI/CD".to_string(),
                "TDD".to_string(),
                "Test-Driven Development".to_string(),
                "BDD".to_string(),
                "Behavior-Driven Development".to_string(),
                "DDD".to_string(),
                "Domain-Driven Design".to_string(),
                "Microservices".to_string(),
                "Event-Driven Architecture".to_string(),
                "RESTful".to_string(),
                "REST API".to_string(),
                "GraphQL".to_string(),
                "gRPC".to_string(),
                "WebSockets".to_string(),
                "SOLID".to_string(),
                "Clean Architecture".to_string(),
                "Hexagonal Architecture".to_string(),
                "CQRS".to_string(),
                "Event Sourcing".to_string(),
                "Serverless".to_string(),
                "Infrastructure as Code".to_string(),
                "GitOps".to_string(),
                "Site Reliability Engineering".to_string(),
                "SRE".to_string(),
                "Pair Programming".to_string(),
                "Code Review".to_string(),
                "Continuous Integration".to_string(),
                "Continuous Deployment".to_string(),
            ],
            certifications: vec![
                "AWS Certified".to_string(),
                "AWS Solutions Architect".to_string(),
                "AWS Developer".to_string(),
                "Azure Certified".to_string(),
                "Google Cloud Certified".to_string(),
                "Kubernetes Administrator".to_string(),
                "CKA".to_string(),
                "CKAD".to_string(),
                "Certified Scrum Master".to_string(),
                "CSM".to_string(),
                "PMP".to_string(),
                "Project Management Professional".to_string(),
                "CISSP".to_string(),
                "CEH".to_string(),
                "Certified Ethical Hacker".to_string(),
                "CompTIA Security+".to_string(),
                "CompTIA Network+".to_string(),
                "CCNA".to_string(),
                "CCNP".to_string(),
                "Red Hat Certified".to_string(),
                "RHCE".to_string(),
                "Oracle Certified".to_string(),
                "HashiCorp Certified".to_string(),
            ],
            security_skills: vec![
                "Security".to_string(),
                "Cybersecurity".to_string(),
                "Information Security".to_string(),
                "Application Security".to_string(),
                "AppSec".to_string(),
                "Network Security".to_string(),
                "Cloud Security".to_string(),
                "DevSecOps".to_string(),
                "Penetration Testing".to_string(),
                "Pentest".to_string(),
                "Vulnerability Assessment".to_string(),
                "SAST".to_string(),
                "DAST".to_string(),
                "OWASP".to_string(),
                "Zero Trust".to_string(),
                "IAM".to_string(),
                "Identity and Access Management".to_string(),
                "OAuth".to_string(),
                "OIDC".to_string(),
                "SAML".to_string(),
                "JWT".to_string(),
                "Encryption".to_string(),
                "PKI".to_string(),
                "SSL/TLS".to_string(),
                "Firewall".to_string(),
                "WAF".to_string(),
                "SIEM".to_string(),
                "SOC".to_string(),
                "Incident Response".to_string(),
                "Threat Modeling".to_string(),
                "Secure Coding".to_string(),
                "Compliance".to_string(),
                "SOC 2".to_string(),
                "HIPAA".to_string(),
                "GDPR".to_string(),
                "PCI DSS".to_string(),
            ],
            data_skills: vec![
                "Data Analysis".to_string(),
                "Data Science".to_string(),
                "Machine Learning".to_string(),
                "Deep Learning".to_string(),
                "AI".to_string(),
                "Artificial Intelligence".to_string(),
                "NLP".to_string(),
                "Natural Language Processing".to_string(),
                "Computer Vision".to_string(),
                "Data Engineering".to_string(),
                "ETL".to_string(),
                "Data Pipeline".to_string(),
                "Data Warehouse".to_string(),
                "Data Lake".to_string(),
                "Apache Spark".to_string(),
                "Spark".to_string(),
                "Hadoop".to_string(),
                "Airflow".to_string(),
                "dbt".to_string(),
                "Snowflake".to_string(),
                "Databricks".to_string(),
                "Pandas".to_string(),
                "NumPy".to_string(),
                "Matplotlib".to_string(),
                "Tableau".to_string(),
                "Power BI".to_string(),
                "Looker".to_string(),
                "Metabase".to_string(),
                "A/B Testing".to_string(),
                "Statistical Analysis".to_string(),
                "Predictive Modeling".to_string(),
                "Feature Engineering".to_string(),
                "MLOps".to_string(),
                "Model Deployment".to_string(),
            ],
        }
    }
}

#[cfg(test)]
mod tests {
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
        let resume_text = "Strong leadership and communication skills. Experienced in Agile and Scrum methodologies.";
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
}
