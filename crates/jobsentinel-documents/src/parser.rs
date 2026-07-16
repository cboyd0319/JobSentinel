//! Local resume parser
//!
//! Extracts text content from PDF, DOCX, TXT, Markdown, and HTML resumes.
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
const MAX_RESUME_FILE_BYTES: u64 = 10 * 1024 * 1024;
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
            let ocr_available = parser_ocr::check_tesseract_available();
            Self { ocr_available }
        }

        #[cfg(not(feature = "ocr"))]
        {
            Self {}
        }
    }

    /// Parse a supported resume file and extract text content.
    ///
    /// Supported formats are PDF, DOCX, TXT, Markdown, and HTML.
    pub fn parse_resume(&self, file_path: &Path) -> Result<String> {
        let canonical_path = canonical_regular_file(file_path)?;

        match resume_extension(&canonical_path).as_deref() {
            Some("pdf") => self.parse_pdf_from_canonical(&canonical_path),
            Some("docx") => self.parse_docx_from_canonical(&canonical_path),
            Some("txt" | "md") => self.parse_plain_text_from_canonical(&canonical_path),
            Some("html" | "htm") => self.parse_html_from_canonical(&canonical_path),
            _ => Err(anyhow::anyhow!(
                "File must be PDF, DOCX, TXT, Markdown, or HTML"
            )),
        }
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

            match parser_ocr::ocr_pdf(self, canonical_path) {
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

    fn parse_html_from_canonical(&self, canonical_path: &Path) -> Result<String> {
        let html =
            std::fs::read_to_string(canonical_path).context("Failed to read resume HTML file")?;
        let text = self.extract_html_visible_text(&html);

        if text.is_empty() {
            return Err(anyhow::anyhow!("HTML resume did not contain readable text"));
        }

        Ok(text)
    }

    fn extract_html_visible_text(&self, html: &str) -> String {
        self.clean_text(&collect_visible_html_text(html))
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

    let metadata = canonical_path
        .metadata()
        .context("Failed to inspect resume file")?;
    if metadata.len() > MAX_RESUME_FILE_BYTES {
        return Err(anyhow::anyhow!("Resume file is too large for local review"));
    }

    Ok(canonical_path)
}

fn resume_extension(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
}

fn collect_visible_html_text(html: &str) -> String {
    let mut chunks = Vec::new();
    let mut hidden_elements = Vec::new();
    let mut cursor = 0;

    while let Some(relative_start) = html[cursor..].find('<') {
        let tag_start = cursor + relative_start;
        if hidden_elements.is_empty() {
            push_unescaped_html_text(&html[cursor..tag_start], &mut chunks);
        }

        let Some(relative_end) = html[tag_start..].find('>') else {
            break;
        };
        let tag_end = tag_start + relative_end;
        update_hidden_html_elements(&html[tag_start + 1..tag_end], &mut hidden_elements);
        cursor = tag_end + 1;
    }

    if hidden_elements.is_empty() && cursor < html.len() {
        push_unescaped_html_text(&html[cursor..], &mut chunks);
    }

    chunks.join("\n")
}

fn push_unescaped_html_text(text: &str, chunks: &mut Vec<String>) {
    let text = text.trim();
    if text.is_empty() {
        return;
    }

    let decoded = unescape(text)
        .map(|value| value.into_owned())
        .unwrap_or_else(|_| text.to_string());
    if !decoded.trim().is_empty() {
        chunks.push(decoded);
    }
}

fn update_hidden_html_elements(tag: &str, hidden_elements: &mut Vec<String>) {
    let tag = tag.trim();
    if tag.starts_with('!') || tag.starts_with('?') {
        return;
    }

    let closing = tag.starts_with('/');
    let name = tag
        .trim_start_matches('/')
        .split(|character: char| character.is_ascii_whitespace() || character == '/')
        .next()
        .unwrap_or_default()
        .to_ascii_lowercase();

    if !is_hidden_html_text_element(&name) {
        return;
    }
    if closing {
        if hidden_elements
            .last()
            .is_some_and(|element| element == &name)
        {
            hidden_elements.pop();
        }
    } else if !tag.ends_with('/') {
        hidden_elements.push(name);
    }
}

fn is_hidden_html_text_element(name: &str) -> bool {
    matches!(
        name,
        "script" | "style" | "noscript" | "template" | "svg" | "canvas"
    )
}

fn xml_local_name(name: &[u8]) -> &[u8] {
    name.rsplit(|byte| *byte == b':').next().unwrap_or(name)
}

impl Default for ResumeParser {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(feature = "ocr")]
#[path = "parser_ocr.rs"]
mod parser_ocr;

#[cfg(test)]
#[path = "parser_html_tests.rs"]
mod html_tests;

#[cfg(test)]
mod tests;
