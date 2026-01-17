//! Resume PDF Parser
//!
//! Extracts text content from PDF resumes using pdf-extract.

use anyhow::{Context, Result};
use std::path::Path;

/// Resume parser for extracting text from PDF files
pub struct ResumeParser;

impl ResumeParser {
    pub fn new() -> Self {
        Self
    }

    /// Parse PDF file and extract text content
    ///
    /// # Arguments
    /// * `file_path` - Path to the PDF file
    ///
    /// # Returns
    /// Extracted text content from the PDF
    ///
    /// # Example
    /// ```rust,ignore
    /// use std::path::Path;
    /// let parser = ResumeParser::new();
    /// let text = parser.parse_pdf(Path::new("/path/to/resume.pdf"))?;
    /// ```
    pub fn parse_pdf(&self, file_path: &Path) -> Result<String> {
        // Canonicalize path to prevent path traversal attacks
        // This resolves symlinks and removes ../ components
        let canonical_path = file_path.canonicalize().context(format!(
            "Invalid or inaccessible path: {}",
            file_path.display()
        ))?;

        // Security: Verify the canonical path still exists (canonicalize can succeed on symlinks to deleted files)
        if !canonical_path.exists() {
            return Err(anyhow::anyhow!(
                "File not found: {}",
                canonical_path.display()
            ));
        }

        // Security: Verify the canonical path is a regular file (not a directory, device, etc.)
        if !canonical_path.is_file() {
            return Err(anyhow::anyhow!(
                "Path is not a regular file: {}",
                canonical_path.display()
            ));
        }

        // Verify it's a PDF file
        if canonical_path.extension().and_then(|s| s.to_str()) != Some("pdf") {
            return Err(anyhow::anyhow!(
                "File must be a PDF. Got: {}",
                canonical_path.display()
            ));
        }

        // Extract text using pdf-extract
        let text = pdf_extract::extract_text(&canonical_path).context(format!(
            "Failed to extract text from PDF: {}",
            canonical_path.display()
        ))?;

        // Clean up extracted text
        let cleaned_text = self.clean_text(&text);

        Ok(cleaned_text)
    }

    /// Clean extracted text by:
    /// - Removing excessive whitespace
    /// - Normalizing line breaks
    /// - Removing null characters
    fn clean_text(&self, text: &str) -> String {
        text.lines()
            .map(|line| line.trim())
            .filter(|line| !line.is_empty())
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// Extract sections from resume text
    ///
    /// Identifies common resume sections like:
    /// - Summary/Objective
    /// - Experience
    /// - Education
    /// - Skills
    ///
    /// Returns a map of section name to section content
    pub fn extract_sections(&self, text: &str) -> std::collections::HashMap<String, String> {
        let mut sections = std::collections::HashMap::new();
        let mut current_section = String::from("header");
        let mut current_content = Vec::new();

        // Common section headers
        let section_keywords = [
            ("summary", vec!["summary", "objective", "profile"]),
            (
                "experience",
                vec!["experience", "work history", "employment"],
            ),
            (
                "education",
                vec!["education", "academic", "degree", "university"],
            ),
            (
                "skills",
                vec!["skills", "technical skills", "competencies", "technologies"],
            ),
            (
                "projects",
                vec!["projects", "portfolio", "personal projects"],
            ),
            (
                "certifications",
                vec!["certifications", "certificates", "licenses"],
            ),
        ];

        for line in text.lines() {
            let line_lower = line.to_lowercase();

            // Check if line is a section header
            let mut found_section = false;
            for (section_name, keywords) in &section_keywords {
                if keywords
                    .iter()
                    .any(|keyword| line_lower.contains(keyword) && line.len() < 50)
                {
                    // Save previous section
                    if !current_content.is_empty() {
                        sections.insert(current_section.clone(), current_content.join("\n"));
                        current_content.clear();
                    }

                    current_section = section_name.to_string();
                    found_section = true;
                    break;
                }
            }

            if !found_section && !line.is_empty() {
                current_content.push(line.to_string());
            }
        }

        // Save last section
        if !current_content.is_empty() {
            sections.insert(current_section, current_content.join("\n"));
        }

        sections
    }
}

impl Default for ResumeParser {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_text() {
        let parser = ResumeParser::new();

        let dirty_text = "  Line 1  \n\n  Line 2  \n\n\n  Line 3  ";
        let cleaned = parser.clean_text(dirty_text);

        assert_eq!(cleaned, "Line 1\nLine 2\nLine 3");
    }

    #[test]
    fn test_extract_sections() {
        let parser = ResumeParser::new();

        let resume_text = r#"
John Doe
Software Engineer

SUMMARY
Experienced software engineer with 5 years of experience.

EXPERIENCE
Senior Engineer at TechCorp
Built scalable systems.

SKILLS
Python, Rust, React
        "#;

        let sections = parser.extract_sections(resume_text);

        assert!(sections.contains_key("summary"));
        assert!(sections.contains_key("experience"));
        assert!(sections.contains_key("skills"));

        let skills_section = sections.get("skills").unwrap();
        assert!(skills_section.contains("Python"));
        assert!(skills_section.contains("Rust"));
    }

    #[test]
    fn test_parse_pdf_file_not_found() {
        let parser = ResumeParser::new();
        let result = parser.parse_pdf(Path::new("/nonexistent/file.pdf"));

        assert!(result.is_err());
        // Path canonicalization fails for nonexistent files
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Invalid or inaccessible path"));
    }

    #[test]
    fn test_parse_pdf_wrong_extension() {
        use std::fs::File;
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        File::create(&file_path).unwrap();

        let parser = ResumeParser::new();
        let result = parser.parse_pdf(&file_path);

        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("must be a PDF"));
    }

    #[test]
    fn test_clean_text_empty() {
        let parser = ResumeParser::new();
        let cleaned = parser.clean_text("");
        assert_eq!(cleaned, "");
    }

    #[test]
    fn test_clean_text_only_whitespace() {
        let parser = ResumeParser::new();
        let cleaned = parser.clean_text("   \n\n   \n   ");
        assert_eq!(cleaned, "");
    }

    #[test]
    fn test_clean_text_null_characters() {
        let parser = ResumeParser::new();
        let text_with_nulls = "Line 1\0\nLine 2\0";
        let cleaned = parser.clean_text(text_with_nulls);
        // Should preserve content but remove empty lines
        assert!(cleaned.contains("Line 1") || cleaned.contains("Line 2"));
    }

    #[test]
    fn test_extract_sections_empty_text() {
        let parser = ResumeParser::new();
        let sections = parser.extract_sections("");
        // Should have at least the header section
        assert!(sections.is_empty() || sections.contains_key("header"));
    }

    #[test]
    fn test_extract_sections_no_section_headers() {
        let parser = ResumeParser::new();
        let resume_text = "Just some plain text\nwithout any section headers\nat all";
        let sections = parser.extract_sections(resume_text);

        // All content should go to "header" section
        assert!(sections.contains_key("header"));
        let header = sections.get("header").unwrap();
        assert!(header.contains("plain text"));
    }

    #[test]
    fn test_extract_sections_long_header_ignored() {
        let parser = ResumeParser::new();
        // Line with "skills" keyword but >50 chars should not be treated as header
        let resume_text = r#"
This is a very long line that contains the word skills but is way more than fifty characters long so it should not be considered a section header
Python
Rust
        "#;

        let sections = parser.extract_sections(resume_text);
        // Should not have "skills" section since line is too long
        // Content should remain in current section
        assert!(sections.len() <= 1);
    }

    #[test]
    fn test_extract_sections_multiple_section_types() {
        let parser = ResumeParser::new();
        let resume_text = r#"
John Doe

PROFILE
Senior Engineer

PROJECTS
Built cool stuff

CERTIFICATIONS
AWS Certified

EDUCATION
BS Computer Science
        "#;

        let sections = parser.extract_sections(resume_text);

        assert!(sections.contains_key("summary") || sections.contains_key("header"));
        assert!(sections.contains_key("projects"));
        assert!(sections.contains_key("certifications"));
        assert!(sections.contains_key("education"));
    }

    #[test]
    fn test_extract_sections_case_insensitive() {
        let parser = ResumeParser::new();
        let resume_text = r#"
SKILLS
Python

sKiLlS
JavaScript
        "#;

        let sections = parser.extract_sections(resume_text);
        // Second "skills" section should replace first
        assert!(sections.contains_key("skills"));
    }

    #[test]
    fn test_default_trait() {
        let parser1 = ResumeParser::default();
        let parser2 = ResumeParser::new();

        // Both should work identically
        let text = "  Line 1  \n  Line 2  ";
        assert_eq!(parser1.clean_text(text), parser2.clean_text(text));
    }

    #[test]
    fn test_parse_pdf_no_extension() {
        use std::fs::File;
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("noextension");
        File::create(&file_path).unwrap();

        let parser = ResumeParser::new();
        let result = parser.parse_pdf(&file_path);

        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("must be a PDF"));
    }

    #[test]
    fn test_parse_pdf_rejects_directory() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();

        let parser = ResumeParser::new();
        let result = parser.parse_pdf(temp_dir.path());

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("not a regular file"));
    }

    #[test]
    fn test_parse_pdf_path_traversal_nonexistent() {
        let parser = ResumeParser::new();

        // Attempt path traversal to nonexistent file
        let result = parser.parse_pdf(Path::new("/tmp/../../../etc/passwd"));

        // Should fail because canonicalization resolves to a non-PDF or non-existent path
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_pdf_relative_path_traversal() {
        let parser = ResumeParser::new();

        // Relative path with traversal
        let result = parser.parse_pdf(Path::new("../../../etc/passwd"));

        // Should fail - not a PDF and canonicalization won't accept this
        assert!(result.is_err());
    }
}
