use super::*;

#[test]
fn test_parse_resume_html_extracts_visible_text() {
    use tempfile::TempDir;

    let temp_dir = TempDir::new().unwrap();
    let file_path = temp_dir.path().join("resume.html");
    std::fs::write(
        &file_path,
        r#"
<!doctype html>
<html lang="en">
  <head>
    <style>
      body { font-family: Arial; }
    </style>
    <script>alert('ignore');</script>
  </head>
  <body>
    <header>
      <h1>Jordan Lee</h1>
      <a href="mailto:jordan@example.com">jordan@example.com</a>
    </header>
    <section>
      <h2>Experience</h2>
      <p>Program Operations Lead</p>
      <ul><li>Improved intake scheduling.</li></ul>
    </section>
  </body>
</html>
            "#,
    )
    .unwrap();

    let parser = ResumeParser::new();
    let text = parser.parse_resume(&file_path).unwrap();

    assert!(text.contains("Jordan Lee"));
    assert!(text.contains("jordan@example.com"));
    assert!(text.contains("Experience"));
    assert!(text.contains("Program Operations Lead"));
    assert!(text.contains("Improved intake scheduling."));
    assert!(!text.contains("font-family"));
    assert!(!text.contains("alert"));
}
