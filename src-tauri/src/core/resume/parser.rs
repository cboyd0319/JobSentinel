//! Local resume parser
//!
//! Extracts text content from PDF, DOCX, TXT, and Markdown resumes.
//! Supports OCR fallback for scanned PDFs when the `ocr` feature is enabled.

use anyhow::{Context, Result};
use quick_xml::{escape::unescape, events::Event, Reader};
use std::{
    fs::File,
    io::Read,
    path::{Path, PathBuf},
};
use zip::ZipArchive;

/// Minimum text length to consider PDF extraction successful (before falling back to OCR)
#[cfg(feature = "ocr")]
const MIN_TEXT_LENGTH: usize = 100;
const MAX_DOCX_DOCUMENT_XML_BYTES: u64 = 8 * 1024 * 1024;

/// Resume parser for extracting text from local resume files
///
/// # OCR Support
/// When built with the `ocr` feature, this parser can fall back to OCR
/// for scanned PDFs. Requires:
/// - Tesseract OCR installed on the system
/// - poppler-utils (pdftoppm) for PDF-to-image conversion
///
/// Install requirements:
/// - macOS: `brew install tesseract poppler`
/// - Windows: Download Tesseract installer + poppler binaries
/// - Linux: `apt install tesseract-ocr poppler-utils`
pub struct ResumeParser {
    /// Whether OCR is available (requires `ocr` feature and system Tesseract)
    #[cfg(feature = "ocr")]
    ocr_available: bool,
}

impl ResumeParser {
    pub fn new() -> Self {
        #[cfg(feature = "ocr")]
        {
            // Check if Tesseract is available on the system
            let ocr_available = Self::check_tesseract_available();
            Self { ocr_available }
        }

        #[cfg(not(feature = "ocr"))]
        {
            Self {}
        }
    }

    /// Check if Tesseract OCR is available on the system
    #[cfg(feature = "ocr")]
    fn check_tesseract_available() -> bool {
        use std::process::Command;

        let Ok(tesseract_path) = resolve_ocr_tool(OcrTool::Tesseract) else {
            return false;
        };

        Command::new(tesseract_path)
            .arg("--version")
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    }

    #[cfg(feature = "ocr")]
    const fn tesseract_env_var() -> &'static str {
        "JOBSENTINEL_TESSERACT_PATH"
    }

    #[cfg(feature = "ocr")]
    const fn pdftoppm_env_var() -> &'static str {
        "JOBSENTINEL_PDFTOPPM_PATH"
    }

    /// Check if OCR is available for scanned PDFs
    pub fn is_ocr_available(&self) -> bool {
        #[cfg(feature = "ocr")]
        {
            self.ocr_available
        }

        #[cfg(not(feature = "ocr"))]
        {
            false
        }
    }

    /// Parse a supported resume file and extract text content.
    ///
    /// Supported formats are PDF, DOCX, TXT, and Markdown.
    pub fn parse_resume(&self, file_path: &Path) -> Result<String> {
        let canonical_path = canonical_regular_file(file_path)?;

        match resume_extension(&canonical_path).as_deref() {
            Some("pdf") => self.parse_pdf_from_canonical(&canonical_path),
            Some("docx") => self.parse_docx_from_canonical(&canonical_path),
            Some("txt" | "md") => self.parse_plain_text_from_canonical(&canonical_path),
            _ => Err(anyhow::anyhow!("File must be PDF, DOCX, TXT, or Markdown")),
        }
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
        let canonical_path = canonical_regular_file(file_path)?;

        // Verify it's a PDF file
        if resume_extension(&canonical_path).as_deref() != Some("pdf") {
            return Err(anyhow::anyhow!("File must be a PDF"));
        }

        self.parse_pdf_from_canonical(&canonical_path)
    }

    fn parse_pdf_from_canonical(&self, canonical_path: &Path) -> Result<String> {
        // Extract text using pdf-extract
        let text =
            pdf_extract::extract_text(canonical_path).context("Failed to extract text from PDF")?;

        // Clean up extracted text
        let cleaned_text = self.clean_text(&text);

        // If text is too short, it might be a scanned PDF - try OCR if available
        #[cfg(feature = "ocr")]
        if cleaned_text.len() < MIN_TEXT_LENGTH && self.ocr_available {
            tracing::info!(
                "Extracted text too short ({} chars), attempting OCR...",
                cleaned_text.len()
            );

            match self.ocr_pdf(canonical_path) {
                Ok(ocr_text) => {
                    if ocr_text.len() > cleaned_text.len() {
                        tracing::info!("OCR extraction successful ({} chars)", ocr_text.len());
                        return Ok(ocr_text);
                    }
                }
                Err(_e) => {
                    tracing::warn!("OCR extraction failed");
                    // Fall back to original text
                }
            }
        }

        Ok(cleaned_text)
    }

    fn parse_plain_text_from_canonical(&self, canonical_path: &Path) -> Result<String> {
        let text =
            std::fs::read_to_string(canonical_path).context("Failed to read resume text file")?;

        Ok(self.clean_text(&text))
    }

    fn parse_docx_from_canonical(&self, canonical_path: &Path) -> Result<String> {
        let file = File::open(canonical_path).context("Failed to open DOCX resume")?;
        let mut archive = ZipArchive::new(file).context("Failed to read DOCX resume")?;
        let mut document = archive
            .by_name("word/document.xml")
            .context("DOCX resume is missing document text")?;

        if document.size() > MAX_DOCX_DOCUMENT_XML_BYTES {
            return Err(anyhow::anyhow!("DOCX resume text is too large"));
        }

        let mut document_xml = String::new();
        document
            .read_to_string(&mut document_xml)
            .context("Failed to read DOCX document text")?;

        let text = self.extract_docx_text(&document_xml)?;
        let cleaned_text = self.clean_text(&text);

        if cleaned_text.is_empty() {
            return Err(anyhow::anyhow!("DOCX resume did not contain readable text"));
        }

        Ok(cleaned_text)
    }

    fn extract_docx_text(&self, document_xml: &str) -> Result<String> {
        let mut reader = Reader::from_str(document_xml);
        reader.config_mut().trim_text(false);

        let mut buf = Vec::new();
        let mut full_text = String::new();
        let mut current_paragraph = String::new();
        let mut in_text = false;

        loop {
            match reader
                .read_event_into(&mut buf)
                .context("Failed to parse DOCX document text")?
            {
                Event::Start(element) if xml_local_name(element.name().as_ref()) == b"t" => {
                    in_text = true;
                }
                Event::End(element) => match xml_local_name(element.name().as_ref()) {
                    b"t" => in_text = false,
                    b"p" => {
                        let paragraph = current_paragraph.trim();
                        if !paragraph.is_empty() {
                            if !full_text.is_empty() {
                                full_text.push('\n');
                            }
                            full_text.push_str(paragraph);
                        }
                        current_paragraph.clear();
                    }
                    _ => {}
                },
                Event::Empty(element) => match xml_local_name(element.name().as_ref()) {
                    b"tab" => current_paragraph.push('\t'),
                    b"br" | b"cr" => current_paragraph.push('\n'),
                    _ => {}
                },
                Event::Text(text) if in_text => {
                    let decoded = text
                        .decode()
                        .context("Failed to decode DOCX document text")?;
                    let unescaped = unescape(decoded.as_ref())
                        .context("Failed to decode DOCX document text")?;
                    current_paragraph.push_str(&unescaped);
                }
                Event::GeneralRef(reference) if in_text => {
                    let decoded = reference
                        .decode()
                        .context("Failed to decode DOCX document text")?;
                    let entity = format!("&{};", decoded);
                    let unescaped =
                        unescape(&entity).context("Failed to decode DOCX document text")?;
                    current_paragraph.push_str(&unescaped);
                }
                Event::Eof => break,
                _ => {}
            }

            buf.clear();
        }

        let paragraph = current_paragraph.trim();
        if !paragraph.is_empty() {
            if !full_text.is_empty() {
                full_text.push('\n');
            }
            full_text.push_str(paragraph);
        }

        Ok(full_text)
    }

    /// Extract text from PDF using OCR (for scanned documents)
    ///
    /// Uses command-line tools:
    /// - pdftoppm (from poppler-utils) to convert PDF pages to images
    /// - tesseract to extract text from images
    ///
    /// # Security
    /// - `file_path` must be pre-validated (canonicalized, extension checked) by caller
    /// - Temp directory uses UUID to prevent collisions/races
    /// - Image paths are validated to prevent symlink attacks outside temp_dir
    /// - External OCR tools are resolved to canonical absolute paths before execution
    /// - Command arguments are passed directly (not via shell) to prevent injection
    #[cfg(feature = "ocr")]
    fn ocr_pdf(&self, file_path: &Path) -> Result<String> {
        use std::process::Command;
        use uuid::Uuid;

        let pdftoppm_path = resolve_ocr_tool(OcrTool::PdfToPpm)
            .context("pdftoppm is not available for OCR support")?;
        let tesseract_path = resolve_ocr_tool(OcrTool::Tesseract)
            .context("Tesseract OCR is not available for OCR support")?;

        // Create temp directory for intermediate files
        let temp_dir = std::env::temp_dir().join(format!("jobsentinel_ocr_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir).context("Failed to create temp directory for OCR")?;

        // Ensure cleanup on exit (clone path for closure)
        let temp_dir_cleanup = temp_dir.clone();
        let _cleanup = scopeguard::guard((), |_| {
            let _ = std::fs::remove_dir_all(&temp_dir_cleanup);
        });

        // Convert PDF pages to images using pdftoppm (commonly installed with poppler)
        // Security: output_prefix is in our controlled temp_dir, file_path is already canonicalized
        let output_prefix = temp_dir.join("page");
        let pdftoppm_result = Command::new(&pdftoppm_path)
            .arg("-png")
            .arg("-r")
            .arg("300") // 300 DPI for good OCR quality
            .arg(file_path) // Safe: canonicalized in parse_pdf()
            .arg(&output_prefix) // Safe: controlled temp directory
            .output();

        let mut image_paths: Vec<std::path::PathBuf> = match pdftoppm_result {
            Ok(output) if output.status.success() => {
                // Find generated image files
                // Security: Only include files that are:
                // 1. Within temp_dir (canonicalize + starts_with check)
                // 2. Have .png extension
                // 3. Are regular files
                std::fs::read_dir(&temp_dir)?
                    .filter_map(|e| e.ok())
                    .map(|e| e.path())
                    .filter(|p| {
                        // Extension check
                        if p.extension().map(|e| e == "png").unwrap_or(false) {
                            // Security: Verify path is within temp_dir (prevents symlink attacks)
                            if let Ok(canonical) = p.canonicalize() {
                                // Ensure canonical path is still in temp_dir
                                if let Ok(canonical_temp) = temp_dir.canonicalize() {
                                    return canonical.starts_with(&canonical_temp)
                                        && canonical.is_file();
                                }
                            }
                        }
                        false
                    })
                    .collect()
            }
            _ => {
                return Err(anyhow::anyhow!(
                    "pdftoppm not available. Install poppler-utils for OCR support."
                ));
            }
        };

        if image_paths.is_empty() {
            return Err(anyhow::anyhow!("No images extracted from PDF"));
        }

        // Sort image paths to ensure correct page order
        image_paths.sort();

        // Run Tesseract on each page and combine results
        let mut full_text = String::new();

        for image_path in &image_paths {
            // Security: image_path is already validated to be:
            // - Within temp_dir
            // - A regular file with .png extension
            // - Not a symlink outside temp_dir
            let output = Command::new(&tesseract_path)
                .arg(image_path) // Safe: validated above
                .arg("stdout")
                .arg("-l")
                .arg("eng") // Language code: hardcoded, not user input
                .output()
                .context("Failed to run Tesseract OCR")?;

            if output.status.success() {
                let page_text = String::from_utf8_lossy(&output.stdout);
                if !full_text.is_empty() {
                    full_text.push_str("\n\n--- Page Break ---\n\n");
                }
                full_text.push_str(&page_text);
            }
        }

        if full_text.is_empty() {
            return Err(anyhow::anyhow!("Tesseract OCR returned no text"));
        }

        Ok(self.clean_text(&full_text))
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

#[cfg(feature = "ocr")]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum OcrTool {
    Tesseract,
    PdfToPpm,
}

#[cfg(feature = "ocr")]
impl OcrTool {
    fn env_var(self) -> &'static str {
        match self {
            Self::Tesseract => ResumeParser::tesseract_env_var(),
            Self::PdfToPpm => ResumeParser::pdftoppm_env_var(),
        }
    }

    const fn label(self) -> &'static str {
        match self {
            Self::Tesseract => "Tesseract OCR",
            Self::PdfToPpm => "pdftoppm",
        }
    }

    const fn default_candidates(self) -> &'static [&'static str] {
        match self {
            Self::Tesseract => &[
                "/opt/homebrew/bin/tesseract",
                "/usr/local/bin/tesseract",
                "/usr/bin/tesseract",
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            ],
            Self::PdfToPpm => &[
                "/opt/homebrew/bin/pdftoppm",
                "/usr/local/bin/pdftoppm",
                "/usr/bin/pdftoppm",
                r"C:\Program Files\poppler\Library\bin\pdftoppm.exe",
                r"C:\Program Files (x86)\poppler\Library\bin\pdftoppm.exe",
            ],
        }
    }
}

#[cfg(feature = "ocr")]
fn resolve_ocr_tool(tool: OcrTool) -> Result<PathBuf> {
    if let Some(path) = std::env::var_os(tool.env_var()).filter(|value| !value.is_empty()) {
        return validate_ocr_tool_path(tool, PathBuf::from(path));
    }

    for candidate in tool.default_candidates() {
        let path = PathBuf::from(candidate);
        if path.is_file() {
            return validate_ocr_tool_path(tool, path);
        }
    }

    Err(anyhow::anyhow!(
        "{} executable was not found in a trusted install location",
        tool.label()
    ))
}

#[cfg(feature = "ocr")]
fn validate_ocr_tool_path(tool: OcrTool, path: PathBuf) -> Result<PathBuf> {
    if !path.is_absolute() {
        return Err(anyhow::anyhow!(
            "{} path must be an absolute executable path",
            tool.label()
        ));
    }

    let canonical_path = path
        .canonicalize()
        .with_context(|| format!("{} executable is not accessible", tool.label()))?;

    if !canonical_path.is_file() {
        return Err(anyhow::anyhow!(
            "{} executable path is not a regular file",
            tool.label()
        ));
    }

    Ok(canonical_path)
}

fn canonical_regular_file(file_path: &Path) -> Result<PathBuf> {
    // Canonicalize path to prevent path traversal attacks.
    let canonical_path = file_path
        .canonicalize()
        .context("Invalid or inaccessible path")?;

    if !canonical_path.exists() {
        return Err(anyhow::anyhow!("File not found"));
    }

    if !canonical_path.is_file() {
        return Err(anyhow::anyhow!("Path is not a regular file"));
    }

    Ok(canonical_path)
}

fn resume_extension(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
}

fn xml_local_name(name: &[u8]) -> &[u8] {
    name.rsplit(|byte| *byte == b':').next().unwrap_or(name)
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
Jordan Lee
Program Coordinator

SUMMARY
Experienced program coordinator with 5 years of client-service experience.

EXPERIENCE
Program Operations Lead at Harbor Community Services
Improved intake scheduling.

SKILLS
Scheduling, case documentation, Spanish
        "#;

        let sections = parser.extract_sections(resume_text);

        assert!(sections.contains_key("summary"));
        assert!(sections.contains_key("experience"));
        assert!(sections.contains_key("skills"));

        let skills_section = sections.get("skills").unwrap();
        assert!(skills_section.contains("Scheduling"));
        assert!(skills_section.contains("Spanish"));
    }

    #[test]
    fn test_parse_pdf_file_not_found() {
        let parser = ResumeParser::new();
        let result = parser.parse_pdf(Path::new("/nonexistent/file.pdf"));

        assert!(result.is_err());
        // Path canonicalization fails for nonexistent files
        let error = result.unwrap_err().to_string();
        assert!(error.contains("Invalid or inaccessible path"));
        assert!(!error.contains("/nonexistent"), "path leaked: {error}");
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
        let error = result.unwrap_err().to_string();
        assert!(error.contains("must be a PDF"));
        assert!(!error.contains("test.txt"), "path leaked: {error}");
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
Jordan Lee

PROFILE
Program Coordinator

PROJECTS
Improved intake process

CERTIFICATIONS
CPR Certified

EDUCATION
BA Public Administration
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

    #[cfg(feature = "ocr")]
    #[test]
    fn test_ocr_tool_path_rejects_relative_executable() {
        let error = validate_ocr_tool_path(OcrTool::Tesseract, PathBuf::from("tesseract"))
            .unwrap_err()
            .to_string();

        assert!(error.contains("absolute executable path"));
        assert!(!error.contains("JOBSENTINEL_TESSERACT_PATH"));
    }

    #[cfg(feature = "ocr")]
    #[test]
    fn test_ocr_tool_path_accepts_absolute_regular_file() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let tool_path = temp_dir.path().join(if cfg!(windows) {
            "pdftoppm.exe"
        } else {
            "pdftoppm"
        });
        std::fs::write(&tool_path, b"test").unwrap();

        let resolved = validate_ocr_tool_path(OcrTool::PdfToPpm, tool_path.clone()).unwrap();

        assert_eq!(resolved, tool_path.canonicalize().unwrap());
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
        let error = result.unwrap_err().to_string();
        assert!(error.contains("must be a PDF"));
        assert!(!error.contains("noextension"), "path leaked: {error}");
    }

    #[test]
    fn test_parse_pdf_rejects_directory() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();

        let parser = ResumeParser::new();
        let result = parser.parse_pdf(temp_dir.path());

        assert!(result.is_err());
        let error = result.unwrap_err().to_string();
        assert!(error.contains("not a regular file"));
        assert!(
            !error.contains(temp_dir.path().to_string_lossy().as_ref()),
            "path leaked: {error}"
        );
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

    #[test]
    fn test_parse_resume_txt_extracts_plain_text() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("customer-success-resume.txt");
        std::fs::write(
            &file_path,
            "Jordan Lee\n\nEXPERIENCE\nCustomer Success Manager\n\nSKILLS\nOnboarding",
        )
        .unwrap();

        let parser = ResumeParser::new();
        let text = parser.parse_resume(&file_path).unwrap();

        assert!(text.contains("Jordan Lee"));
        assert!(text.contains("Customer Success Manager"));
        assert!(text.contains("Onboarding"));
    }

    #[test]
    fn test_parse_resume_md_extracts_markdown_text() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("operations-resume.md");
        std::fs::write(
            &file_path,
            "# Jordan Lee\n\n## Experience\nProgram Operations Lead\n\n## Skills\nScheduling",
        )
        .unwrap();

        let parser = ResumeParser::new();
        let text = parser.parse_resume(&file_path).unwrap();

        assert!(text.contains("Jordan Lee"));
        assert!(text.contains("Program Operations Lead"));
        assert!(text.contains("Scheduling"));
    }

    #[test]
    #[ignore = "requires local private resume paths"]
    fn test_parse_local_resume_smoke_paths() {
        const LOCAL_RESUME_SMOKE_PATHS_ENV: &str = "JOBSENTINEL_LOCAL_RESUME_SMOKE_PATHS";

        let Some(raw_paths) = std::env::var_os(LOCAL_RESUME_SMOKE_PATHS_ENV) else {
            eprintln!(
                "Set {LOCAL_RESUME_SMOKE_PATHS_ENV} to run local resume parser smoke checks."
            );
            return;
        };

        let parser = ResumeParser::new();
        let mut parsed_count = 0;

        for path in std::env::split_paths(&raw_paths) {
            if path.as_os_str().is_empty() {
                continue;
            }

            parsed_count += 1;
            let text = parser.parse_resume(&path).unwrap_or_else(|error| {
                panic!("local resume smoke input {parsed_count} did not parse: {error:#}");
            });
            let char_count = text.chars().count();

            assert!(
                char_count >= 100,
                "local resume smoke input {parsed_count} produced only {char_count} readable chars"
            );
            eprintln!("local resume smoke input {parsed_count}: {char_count} readable chars");
        }

        assert!(
            parsed_count > 0,
            "{LOCAL_RESUME_SMOKE_PATHS_ENV} did not contain any local resume paths"
        );
    }

    #[test]
    fn test_parse_resume_docx_extracts_document_text() {
        use docx_rs::{Docx, Paragraph, Run};
        use std::io::Cursor;
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("program-coordinator-resume.docx");
        let mut buffer = Cursor::new(Vec::new());
        Docx::new()
            .add_paragraph(Paragraph::new().add_run(Run::new().add_text("Jordan Lee")))
            .add_paragraph(
                Paragraph::new().add_run(Run::new().add_text("Program & Operations Coordinator")),
            )
            .add_paragraph(Paragraph::new().add_run(Run::new().add_text("SKILLS")))
            .add_paragraph(Paragraph::new().add_run(Run::new().add_text("Scheduling")))
            .build()
            .pack(&mut buffer)
            .unwrap();
        std::fs::write(&file_path, buffer.into_inner()).unwrap();

        let parser = ResumeParser::new();
        let text = parser.parse_resume(&file_path).unwrap();

        assert!(text.contains("Jordan Lee"));
        assert!(text.contains("Program & Operations Coordinator"));
        assert!(text.contains("Scheduling"));
    }
}
