//! Synonym Matching for Keyword Scoring
//!
//! Provides fuzzy matching for job keywords using synonym groups.
//! Supports bidirectional matching and word boundary detection.

use serde::Deserialize;
use std::collections::HashMap;
use std::sync::LazyLock;

const JOB_SCORING_SYNONYM_TAXONOMY_JSON: &str =
    include_str!("../../../../src/shared/jobScoringSynonymTaxonomy.json");

static JOB_SCORING_SYNONYM_TAXONOMY: LazyLock<JobScoringSynonymTaxonomy> =
    LazyLock::new(load_job_scoring_synonym_taxonomy);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JobScoringSynonymTaxonomy {
    schema_version: u32,
    synonym_groups: Vec<Vec<String>>,
}

fn load_job_scoring_synonym_taxonomy() -> JobScoringSynonymTaxonomy {
    let taxonomy: JobScoringSynonymTaxonomy =
        match serde_json::from_str(JOB_SCORING_SYNONYM_TAXONOMY_JSON) {
            Ok(taxonomy) => taxonomy,
            Err(error) => panic!("job scoring synonym taxonomy must be valid JSON: {error}"),
        };

    assert_eq!(
        taxonomy.schema_version, 1,
        "unsupported job scoring synonym taxonomy schema version"
    );

    for (group_index, group) in taxonomy.synonym_groups.iter().enumerate() {
        assert!(
            !group.is_empty(),
            "job scoring synonym taxonomy group {group_index} must not be empty"
        );

        for term in group {
            assert!(
                !term.trim().is_empty(),
                "job scoring synonym taxonomy group {group_index} contains a blank term"
            );
        }
    }

    taxonomy
}

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
    /// Create a new synonym map with default job-search synonyms
    pub fn new() -> Self {
        let mut map = Self {
            keyword_to_group: HashMap::new(),
            synonym_groups: Vec::new(),
        };

        for synonym_group in &JOB_SCORING_SYNONYM_TAXONOMY.synonym_groups {
            map.add_synonym_group(synonym_group);
        }

        map
    }

    /// Add a new synonym group
    pub fn add_synonym_group<S: AsRef<str>>(&mut self, synonyms: &[S]) {
        if synonyms.is_empty() {
            return;
        }

        let group_index = self.synonym_groups.len();
        // Pre-allocate with exact capacity
        let mut normalized_synonyms = Vec::with_capacity(synonyms.len());
        for s in synonyms {
            let normalized = s.as_ref().to_lowercase();
            self.keyword_to_group
                .insert(normalized.clone(), group_index);
            normalized_synonyms.push(normalized);
        }

        self.synonym_groups.push(normalized_synonyms);
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

        // Use bytes for boundary checks (faster than chars for ASCII)
        let text_bytes = text.as_bytes();
        let word_len = word.len();

        let mut start = 0;
        while let Some(pos) = text[start..].find(word) {
            let abs_pos = start + pos;

            // Check word boundaries using byte indexing (ASCII-safe)
            let before_ok = abs_pos == 0 || {
                let b = text_bytes[abs_pos - 1];
                !b.is_ascii_alphanumeric() && b != b'_'
            };

            let after_pos = abs_pos + word_len;
            let after_ok = after_pos >= text.len() || {
                let b = text_bytes[after_pos];
                !b.is_ascii_alphanumeric() && b != b'_'
            };

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
    fn test_broad_job_search_synonyms() {
        let map = SynonymMap::new();

        assert!(map.matches_with_synonyms("Customer Support", "Client Service Specialist opening"));
        assert!(map.matches_with_synonyms("Customer Support", "Contact Center Representative"));
        assert!(map.matches_with_synonyms("Admin Assistant", "Office Coordinator role"));
        assert!(map.matches_with_synonyms("Administrative Assistant", "Front Desk Receptionist"));
        assert!(map.matches_with_synonyms("Project Coordinator", "Program Coordinator needed"));
        assert!(map.matches_with_synonyms("Human Resources", "People Ops partner"));
        assert!(map.matches_with_synonyms("Registered Nurse", "RN evening shift"));
        assert!(map.matches_with_synonyms("Certified Nursing Assistant", "CNA position"));
        assert!(map.matches_with_synonyms("Teacher", "Educator role"));
        assert!(map.matches_with_synonyms("Graphic Designer", "Visual Designer opening"));
        assert!(!map.matches_with_synonyms("RN", "internship coordinator"));
    }

    #[test]
    fn test_broad_business_tool_synonyms() {
        let map = SynonymMap::new();

        assert!(map.matches_with_synonyms("EMR", "Electronic Health Record charting required"));
        assert!(map.matches_with_synonyms("EHR", "Medical Records System experience"));
        assert!(map.matches_with_synonyms("LMS", "Learning Management System administrator"));
        assert!(map.matches_with_synonyms("CRM", "Salesforce and client database updates"));
        assert!(map.matches_with_synonyms("POS", "Point of Sale register system support"));
        assert!(map.matches_with_synonyms("Inventory", "Stock control and materials management"));
        assert!(map.matches_with_synonyms("QuickBooks", "QBO bookkeeping role"));
        assert!(map.matches_with_synonyms("NetSuite", "Accounting software migration"));
        assert!(map.matches_with_synonyms(
            "Scheduling",
            "Appointment scheduling and calendar management"
        ));
        assert!(!map.matches_with_synonyms("EMR", "summer camp counselor"));
    }

    #[test]
    fn test_broad_care_public_sector_and_operations_synonyms() {
        let map = SynonymMap::new();

        assert!(map.matches_with_synonyms("Care Coordination", "Patient Navigator opening"));
        assert!(map.matches_with_synonyms("Case Management", "Care Coordinator needed"));
        assert!(map.matches_with_synonyms("Healthcare Administration", "Patient Access Specialist"));
        assert!(map.matches_with_synonyms("Compliance", "Regulatory compliance coordinator"));
        assert!(
            map.matches_with_synonyms("Public Sector", "County human services program assistant")
        );
        assert!(map.matches_with_synonyms("Operations", "Business operations assistant"));
        assert!(map.matches_with_synonyms("Training", "Learning and Development coordinator"));
        assert!(map.matches_with_synonyms("Bookkeeping", "Accounts receivable and payroll clerk"));
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
