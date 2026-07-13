use super::*;

#[cfg(feature = "ocr")]
use super::parser_ocr::{validate_ocr_tool_path, validate_ocr_tool_path_against_roots, OcrTool};

#[test]
fn test_clean_text() {
    let parser = ResumeParser::new();

    let dirty_text = "  Line 1  \n\n  Line 2  \n\n\n  Line 3  ";
    let cleaned = parser.clean_text(dirty_text);

    assert_eq!(cleaned, "Line 1\nLine 2\nLine 3");
}

#[test]
fn test_parse_resume_pdf_file_not_found() {
    let parser = ResumeParser::new();
    let result = parser.parse_resume(Path::new("/nonexistent/file.pdf"));

    assert!(result.is_err());
    // Path canonicalization fails for nonexistent files
    let error = result.unwrap_err().to_string();
    assert!(error.contains("Invalid or inaccessible path"));
    assert!(!error.contains("/nonexistent"), "path leaked: {error}");
}

#[test]
fn test_parse_resume_wrong_extension() {
    use std::fs::File;
    use tempfile::TempDir;

    let temp_dir = TempDir::new().unwrap();
    let file_path = temp_dir.path().join("test.rtf");
    File::create(&file_path).unwrap();

    let parser = ResumeParser::new();
    let result = parser.parse_resume(&file_path);

    assert!(result.is_err());
    let error = result.unwrap_err().to_string();
    assert!(error.contains("File must be PDF, DOCX, TXT, Markdown, or HTML"));
    assert!(!error.contains("test.rtf"), "path leaked: {error}");
}

#[test]
fn test_parse_resume_rejects_oversized_file_without_path_leak() {
    use std::fs::File;
    use tempfile::TempDir;

    let temp_dir = TempDir::new().unwrap();
    let file_path = temp_dir.path().join("large-resume.txt");
    let file = File::create(&file_path).unwrap();
    file.set_len(MAX_RESUME_FILE_BYTES + 1).unwrap();

    let parser = ResumeParser::new();
    let result = parser.parse_resume(&file_path);

    assert!(result.is_err());
    let error = result.unwrap_err().to_string();
    assert!(error.contains("too large"));
    assert!(!error.contains("large-resume.txt"), "path leaked: {error}");
    assert!(
        !error.contains(temp_dir.path().to_string_lossy().as_ref()),
        "path leaked: {error}"
    );
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
fn test_ocr_tool_path_rejects_untrusted_absolute_regular_file() {
    use tempfile::TempDir;

    let temp_dir = TempDir::new().unwrap();
    let tool_path = temp_dir.path().join(if cfg!(windows) {
        "pdftoppm.exe"
    } else {
        "pdftoppm"
    });
    std::fs::write(&tool_path, b"test").unwrap();

    let error = validate_ocr_tool_path(OcrTool::PdfToPpm, tool_path.clone())
        .unwrap_err()
        .to_string();

    assert!(error.contains("trusted install location"));
    assert!(
        !error.contains(tool_path.to_string_lossy().as_ref()),
        "path leaked: {error}"
    );
}

#[cfg(feature = "ocr")]
#[test]
fn test_ocr_tool_path_accepts_regular_file_in_trusted_root() {
    use tempfile::TempDir;

    let temp_dir = TempDir::new().unwrap();
    let trusted_root = temp_dir.path().join("trusted-bin");
    std::fs::create_dir(&trusted_root).unwrap();
    let tool_path = trusted_root.join(if cfg!(windows) {
        "pdftoppm.exe"
    } else {
        "pdftoppm"
    });
    std::fs::write(&tool_path, b"test").unwrap();

    let resolved =
        validate_ocr_tool_path_against_roots(OcrTool::PdfToPpm, tool_path.clone(), [&trusted_root])
            .unwrap();

    assert_eq!(resolved, tool_path.canonicalize().unwrap());
}

#[test]
fn test_parse_resume_no_extension() {
    use std::fs::File;
    use tempfile::TempDir;

    let temp_dir = TempDir::new().unwrap();
    let file_path = temp_dir.path().join("noextension");
    File::create(&file_path).unwrap();

    let parser = ResumeParser::new();
    let result = parser.parse_resume(&file_path);

    assert!(result.is_err());
    let error = result.unwrap_err().to_string();
    assert!(error.contains("File must be PDF, DOCX, TXT, Markdown, or HTML"));
    assert!(!error.contains("noextension"), "path leaked: {error}");
}

#[test]
fn test_parse_resume_rejects_directory() {
    use tempfile::TempDir;

    let temp_dir = TempDir::new().unwrap();

    let parser = ResumeParser::new();
    let result = parser.parse_resume(temp_dir.path());

    assert!(result.is_err());
    let error = result.unwrap_err().to_string();
    assert!(error.contains("not a regular file"));
    assert!(
        !error.contains(temp_dir.path().to_string_lossy().as_ref()),
        "path leaked: {error}"
    );
}

#[test]
fn test_parse_resume_path_traversal_nonexistent() {
    let parser = ResumeParser::new();

    // Attempt path traversal to nonexistent file
    let result = parser.parse_resume(Path::new("/tmp/../../../etc/passwd"));

    // Should fail because canonicalization resolves to a non-PDF or non-existent path
    assert!(result.is_err());
}

#[test]
fn test_parse_resume_relative_path_traversal() {
    let parser = ResumeParser::new();

    // Relative path with traversal
    let result = parser.parse_resume(Path::new("../../../etc/passwd"));

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
        eprintln!("Set {LOCAL_RESUME_SMOKE_PATHS_ENV} to run local resume parser smoke checks.");
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

#[test]
fn test_docx_text_rejects_external_entity_reference() {
    let parser = ResumeParser::new();
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE w:document [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>&xxe;</w:t></w:r></w:p></w:body>
</w:document>"#;

    let error = parser.extract_docx_text(xml).unwrap_err();

    assert!(
        error
            .to_string()
            .contains("Failed to decode DOCX document text"),
        "unexpected error: {error:#}"
    );
}
