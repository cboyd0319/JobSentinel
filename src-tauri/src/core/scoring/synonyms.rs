//! Synonym Matching for Keyword Scoring
//!
//! Provides fuzzy matching for job keywords using synonym groups.
//! Supports bidirectional matching and word boundary detection.

use std::collections::HashMap;

/// Synonym mapping system
#[derive(Debug, Clone)]
pub struct SynonymMap {
    /// Maps normalized keywords to their synonym groups
    /// Key: normalized keyword (lowercase)
    /// Value: index into synonym_groups
    keyword_to_group: HashMap<String, usize>,

    /// Stores all synonym groups
    /// Each group contains all synonyms for a concept
    synonym_groups: Vec<Vec<String>>,
}

impl Default for SynonymMap {
    fn default() -> Self {
        Self::new()
    }
}

impl SynonymMap {
    /// Create a new synonym map with default tech industry synonyms
    pub fn new() -> Self {
        let mut map = Self {
            keyword_to_group: HashMap::new(),
            synonym_groups: Vec::new(),
        };

        // Programming Languages
        map.add_synonym_group(&["Python", "Python3", "py", "python3"]);
        map.add_synonym_group(&["JavaScript", "JS", "js", "javascript"]);
        map.add_synonym_group(&["TypeScript", "TS", "ts", "typescript"]);
        map.add_synonym_group(&["C++", "CPP", "Cpp", "cpp", "c++"]);
        map.add_synonym_group(&["C#", "CSharp", "csharp", "c#"]);
        map.add_synonym_group(&["Golang", "Go", "golang", "go"]);
        map.add_synonym_group(&["Rust", "rust", "rustlang"]);

        // Job Titles
        map.add_synonym_group(&["Senior", "Sr.", "Sr", "sr", "senior"]);
        map.add_synonym_group(&["Junior", "Jr.", "Jr", "jr", "junior"]);
        map.add_synonym_group(&[
            "Engineer",
            "Developer",
            "Dev",
            "SWE",
            "engineer",
            "developer",
            "dev",
            "swe",
        ]);
        map.add_synonym_group(&["Lead", "Principal", "Staff", "lead", "principal", "staff"]);
        map.add_synonym_group(&["Manager", "Mgr", "mgr", "manager"]);

        // Frameworks & Libraries
        map.add_synonym_group(&["React", "ReactJS", "React.js", "react", "reactjs"]);
        map.add_synonym_group(&["Node", "NodeJS", "Node.js", "node", "nodejs"]);
        map.add_synonym_group(&["Vue", "VueJS", "Vue.js", "vue", "vuejs"]);
        map.add_synonym_group(&["Angular", "AngularJS", "angular", "angularjs"]);
        map.add_synonym_group(&["Django", "django"]);
        map.add_synonym_group(&["Flask", "flask"]);
        map.add_synonym_group(&["Spring", "SpringBoot", "spring", "springboot"]);

        // Cloud & DevOps
        map.add_synonym_group(&["AWS", "Amazon Web Services", "aws"]);
        map.add_synonym_group(&["GCP", "Google Cloud", "Google Cloud Platform", "gcp"]);
        map.add_synonym_group(&["Azure", "Microsoft Azure", "azure"]);
        map.add_synonym_group(&["Kubernetes", "K8s", "k8s", "kubernetes"]);
        map.add_synonym_group(&["Docker", "docker"]);
        map.add_synonym_group(&[
            "CI/CD",
            "CICD",
            "cicd",
            "continuous integration",
            "continuous deployment",
        ]);
        map.add_synonym_group(&["Terraform", "terraform", "TF"]);

        // Skills & Concepts
        map.add_synonym_group(&["Machine Learning", "ML", "ml", "machine learning"]);
        map.add_synonym_group(&[
            "Artificial Intelligence",
            "AI",
            "ai",
            "artificial intelligence",
        ]);
        map.add_synonym_group(&["Deep Learning", "DL", "dl", "deep learning"]);
        map.add_synonym_group(&["Natural Language Processing", "NLP", "nlp"]);
        map.add_synonym_group(&["Computer Vision", "CV", "cv", "computer vision"]);
        map.add_synonym_group(&["Backend", "Back-end", "backend", "back-end"]);
        map.add_synonym_group(&["Frontend", "Front-end", "frontend", "front-end"]);
        map.add_synonym_group(&["Full Stack", "Fullstack", "full-stack", "fullstack"]);
        map.add_synonym_group(&["DevOps", "Dev Ops", "devops"]);
        map.add_synonym_group(&[
            "SRE",
            "Site Reliability Engineer",
            "Site Reliability Engineering",
            "sre",
        ]);

        // Databases
        map.add_synonym_group(&["PostgreSQL", "Postgres", "postgres", "postgresql"]);
        map.add_synonym_group(&["MySQL", "mysql"]);
        map.add_synonym_group(&["MongoDB", "Mongo", "mongo", "mongodb"]);
        map.add_synonym_group(&["Redis", "redis"]);
        map.add_synonym_group(&["SQL", "sql"]);
        map.add_synonym_group(&["NoSQL", "nosql", "no-sql"]);

        // Security
        map.add_synonym_group(&[
            "Security",
            "Cybersecurity",
            "InfoSec",
            "security",
            "cybersecurity",
            "infosec",
        ]);
        map.add_synonym_group(&[
            "AppSec",
            "Application Security",
            "appsec",
            "application security",
        ]);
        map.add_synonym_group(&["DevSecOps", "devsecops"]);

        // Testing
        map.add_synonym_group(&[
            "Test",
            "Testing",
            "QA",
            "Quality Assurance",
            "test",
            "testing",
            "qa",
        ]);
        map.add_synonym_group(&["Automation", "automation", "automated testing"]);

        map
    }

    /// Add a new synonym group
    pub fn add_synonym_group(&mut self, synonyms: &[&str]) {
        if synonyms.is_empty() {
            return;
        }

        let group_index = self.synonym_groups.len();
        let normalized_synonyms: Vec<String> = synonyms.iter().map(|s| s.to_lowercase()).collect();

        self.synonym_groups.push(normalized_synonyms.clone());

        for synonym in normalized_synonyms {
            self.keyword_to_group.insert(synonym, group_index);
        }
    }

    /// Get all synonyms for a given keyword (including the keyword itself)
    pub fn get_synonym_group(&self, keyword: &str) -> Vec<String> {
        let normalized = keyword.to_lowercase();

        if let Some(&group_index) = self.keyword_to_group.get(&normalized) {
            self.synonym_groups[group_index].clone()
        } else {
            // Not in synonym map - return just the keyword itself
            vec![normalized]
        }
    }

    /// Check if a keyword (or any of its synonyms) matches text
    /// Uses word boundary detection to avoid false positives
    pub fn matches_with_synonyms(&self, keyword: &str, text: &str) -> bool {
        let synonyms = self.get_synonym_group(keyword);
        let text_lower = text.to_lowercase();

        synonyms
            .iter()
            .any(|synonym| self.matches_word_boundary(synonym, &text_lower))
    }

    /// Check if a word matches with word boundary detection
    /// Prevents matching "spy" when looking for "py"
    fn matches_word_boundary(&self, word: &str, text: &str) -> bool {
        if text.is_empty() || word.is_empty() {
            return false;
        }

        // Find all occurrences of the word
        let text_bytes = text.as_bytes();

        let mut start = 0;
        while let Some(pos) = text[start..].find(word) {
            let abs_pos = start + pos;

            // Check if this is a word boundary match
            let before_ok = abs_pos == 0
                || !text_bytes[abs_pos - 1].is_ascii_alphanumeric()
                    && text_bytes[abs_pos - 1] != b'_';

            let after_pos = abs_pos + word.len();
            let after_ok = after_pos >= text.len()
                || !text_bytes[after_pos].is_ascii_alphanumeric() && text_bytes[after_pos] != b'_';

            if before_ok && after_ok {
                return true;
            }

            start = abs_pos + 1;
        }

        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_synonym_match() {
        let map = SynonymMap::new();

        // Python variants
        assert!(map.matches_with_synonyms("Python", "Looking for Python experience"));
        assert!(map.matches_with_synonyms("Python", "Looking for python3 experience"));
        assert!(map.matches_with_synonyms("Python", "Looking for py experience"));
        assert!(map.matches_with_synonyms("py", "Looking for Python experience"));
    }

    #[test]
    fn test_case_insensitivity() {
        let map = SynonymMap::new();

        assert!(map.matches_with_synonyms("python", "PYTHON experience"));
        assert!(map.matches_with_synonyms("PYTHON", "python experience"));
        assert!(map.matches_with_synonyms("Python", "PyThOn experience"));
    }

    #[test]
    fn test_word_boundary_detection() {
        let map = SynonymMap::new();

        // Should NOT match "spy" when looking for "py"
        assert!(!map.matches_with_synonyms("py", "We need a spy"));
        assert!(!map.matches_with_synonyms("py", "espionage experience"));

        // Should match "py" as standalone word
        assert!(map.matches_with_synonyms("py", "py script"));
        assert!(map.matches_with_synonyms("py", "Experience with py"));
        assert!(map.matches_with_synonyms("py", "py, js, and rust"));
    }

    #[test]
    fn test_title_synonyms() {
        let map = SynonymMap::new();

        assert!(map.matches_with_synonyms("Senior", "Sr. Engineer position"));
        assert!(map.matches_with_synonyms("Sr", "Senior Developer needed"));
        assert!(map.matches_with_synonyms("Senior", "Sr Engineer"));

        assert!(map.matches_with_synonyms("Junior", "Jr. Developer"));
        assert!(map.matches_with_synonyms("Jr", "Junior position"));
    }

    #[test]
    fn test_framework_synonyms() {
        let map = SynonymMap::new();

        assert!(map.matches_with_synonyms("React", "ReactJS developer"));
        assert!(map.matches_with_synonyms("ReactJS", "React.js experience"));
        assert!(map.matches_with_synonyms("React.js", "React developer"));

        assert!(map.matches_with_synonyms("Node", "NodeJS backend"));
        assert!(map.matches_with_synonyms("NodeJS", "Node.js experience"));
    }

    #[test]
    fn test_skills_synonyms() {
        let map = SynonymMap::new();

        assert!(map.matches_with_synonyms("Machine Learning", "ML engineer"));
        assert!(map.matches_with_synonyms("ML", "Machine Learning experience"));
        assert!(map.matches_with_synonyms("AI", "Artificial Intelligence role"));
        assert!(map.matches_with_synonyms("Artificial Intelligence", "AI position"));
    }

    #[test]
    fn test_cloud_synonyms() {
        let map = SynonymMap::new();

        assert!(map.matches_with_synonyms("Kubernetes", "K8s experience"));
        assert!(map.matches_with_synonyms("K8s", "Kubernetes deployment"));
        assert!(map.matches_with_synonyms("CI/CD", "CICD pipeline"));
        assert!(map.matches_with_synonyms("CICD", "CI/CD experience"));
    }

    #[test]
    fn test_get_synonym_group() {
        let map = SynonymMap::new();

        let python_synonyms = map.get_synonym_group("Python");
        assert!(python_synonyms.contains(&"python".to_string()));
        assert!(python_synonyms.contains(&"python3".to_string()));
        assert!(python_synonyms.contains(&"py".to_string()));

        let react_synonyms = map.get_synonym_group("React");
        assert!(react_synonyms.contains(&"react".to_string()));
        assert!(react_synonyms.contains(&"reactjs".to_string()));
        assert!(react_synonyms.contains(&"react.js".to_string()));
    }

    #[test]
    fn test_unknown_keyword() {
        let map = SynonymMap::new();

        // Unknown keyword should only match itself
        let synonyms = map.get_synonym_group("UnknownKeyword");
        assert_eq!(synonyms.len(), 1);
        assert_eq!(synonyms[0], "unknownkeyword");

        // Should still do basic matching
        assert!(map.matches_with_synonyms("UnknownKeyword", "unknownkeyword test"));
        assert!(!map.matches_with_synonyms("UnknownKeyword", "other keyword"));
    }

    #[test]
    fn test_multiple_synonyms_in_text() {
        let map = SynonymMap::new();

        let text = "Looking for Python3 and JS developer with Kubernetes experience";

        assert!(map.matches_with_synonyms("Python", text));
        assert!(map.matches_with_synonyms("JavaScript", text));
        assert!(map.matches_with_synonyms("K8s", text));
    }

    #[test]
    fn test_punctuation_boundaries() {
        let map = SynonymMap::new();

        assert!(map.matches_with_synonyms("Python", "Python, JavaScript"));
        assert!(map.matches_with_synonyms("Python", "Python."));
        assert!(map.matches_with_synonyms("Python", "Python!"));
        assert!(map.matches_with_synonyms("Python", "(Python)"));
        assert!(map.matches_with_synonyms("Python", "Python/JavaScript"));
    }

    #[test]
    fn test_special_characters() {
        let map = SynonymMap::new();

        // C++ should match properly
        assert!(map.matches_with_synonyms("C++", "C++ developer"));
        assert!(map.matches_with_synonyms("CPP", "C++ experience"));
        assert!(map.matches_with_synonyms("C++", "cpp programmer"));

        // C# should match properly
        assert!(map.matches_with_synonyms("C#", "C# developer"));
        assert!(map.matches_with_synonyms("CSharp", "C# experience"));
    }

    #[test]
    fn test_bidirectional_matching() {
        let map = SynonymMap::new();

        // Both directions should work
        assert!(map.matches_with_synonyms("Python", "py developer"));
        assert!(map.matches_with_synonyms("py", "Python developer"));

        assert!(map.matches_with_synonyms("Senior", "Sr. position"));
        assert!(map.matches_with_synonyms("Sr", "Senior role"));

        assert!(map.matches_with_synonyms("Machine Learning", "ML engineer"));
        assert!(map.matches_with_synonyms("ML", "Machine Learning position"));
    }

    #[test]
    fn test_empty_inputs() {
        let map = SynonymMap::new();

        assert!(!map.matches_with_synonyms("Python", ""));
        assert!(!map.matches_with_synonyms("", "Python developer"));
        assert!(!map.matches_with_synonyms("", ""));
    }

    #[test]
    fn test_custom_synonym_group() {
        let mut map = SynonymMap::new();

        map.add_synonym_group(&["Rust", "rustlang", "rust-lang"]);

        assert!(map.matches_with_synonyms("Rust", "rustlang developer"));
        assert!(map.matches_with_synonyms("rustlang", "Rust position"));
        assert!(map.matches_with_synonyms("rust-lang", "Rust engineer"));
    }

    #[test]
    fn test_engineer_developer_synonyms() {
        let map = SynonymMap::new();

        assert!(map.matches_with_synonyms("Engineer", "Developer position"));
        assert!(map.matches_with_synonyms("Developer", "Engineer role"));
        assert!(map.matches_with_synonyms("Dev", "SWE position"));
        assert!(map.matches_with_synonyms("SWE", "Developer job"));
    }

    #[test]
    fn test_database_synonyms() {
        let map = SynonymMap::new();

        assert!(map.matches_with_synonyms("PostgreSQL", "Postgres database"));
        assert!(map.matches_with_synonyms("Postgres", "PostgreSQL experience"));
        assert!(map.matches_with_synonyms("MongoDB", "Mongo developer"));
    }

    #[test]
    fn test_security_synonyms() {
        let map = SynonymMap::new();

        assert!(map.matches_with_synonyms("Security", "Cybersecurity engineer"));
        assert!(map.matches_with_synonyms("Cybersecurity", "InfoSec position"));
        assert!(map.matches_with_synonyms("InfoSec", "Security role"));
    }

    #[test]
    fn test_backend_frontend_synonyms() {
        let map = SynonymMap::new();

        assert!(map.matches_with_synonyms("Backend", "Back-end developer"));
        assert!(map.matches_with_synonyms("Back-end", "Backend engineer"));
        assert!(map.matches_with_synonyms("Frontend", "Front-end developer"));
        assert!(map.matches_with_synonyms("Fullstack", "Full Stack engineer"));
    }

    #[test]
    fn test_word_boundary_edge_cases() {
        let map = SynonymMap::new();

        // Go and Golang ARE synonyms, so this SHOULD match
        assert!(map.matches_with_synonyms("go", "golang developer")); // "go" and "golang" are synonyms
                                                                      // "dev" is NOT a synonym for "development" and shouldn't match partial words
        assert!(!map.matches_with_synonyms("dev", "development")); // "dev" should not match "development"

        // Should match at start/end of string
        assert!(map.matches_with_synonyms("Python", "Python"));
        assert!(map.matches_with_synonyms("Python", "Experience with Python"));

        // Should match with various separators
        assert!(map.matches_with_synonyms("Python", "Python-based"));
        assert!(map.matches_with_synonyms("Python", "Python/Django"));
    }

    #[test]
    fn test_consecutive_matches() {
        let map = SynonymMap::new();

        let text = "Python Python3 py";
        assert!(map.matches_with_synonyms("Python", text));
        assert!(map.matches_with_synonyms("Python3", text));
        assert!(map.matches_with_synonyms("py", text));
    }
}
