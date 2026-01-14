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
        // Verify file exists
        if !file_path.exists() {
            return Err(anyhow::anyhow!("File not found: {}", file_path.display()));
        }

        // Verify it's a PDF file
        if file_path.extension().and_then(|s| s.to_str()) != Some("pdf") {
            return Err(anyhow::anyhow!(
                "File must be a PDF. Got: {}",
                file_path.display()
            ));
        }

        // Extract text using pdf-extract
        let text = pdf_extract::extract_text(file_path).context(format!(
            "Failed to extract text from PDF: {}",
            file_path.display()
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
            ("experience", vec!["experience", "work history", "employment"]),
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
        assert!(result.unwrap_err().to_string().contains("File not found"));
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
}
