use super::super::*;

fn job(title: &str, description: Option<&str>) -> Job {
    Job {
        description: description.map(str::to_string),
        remote: Some(true),
        ..Job::newly_discovered(
            title.to_string(),
            "Test".to_string(),
            "https://example.com".to_string(),
            None,
            "remoteok",
            Utc::now(),
        )
    }
}

fn matches(tags: &[&str], title: &str, description: Option<&str>) -> bool {
    let tags = tags.iter().map(ToString::to_string).collect::<Vec<_>>();
    RemoteOkScraper::new(tags.clone(), 10).job_matches_tags(&job(title, description), &tags)
}

#[test]
fn test_job_matches_tags_in_title() {
    assert!(matches(&["rust"], "Rust Developer", None));
}

#[test]
fn test_job_matches_tags_in_description() {
    assert!(matches(
        &["python"],
        "Backend Developer",
        Some("Build APIs with Python and Django")
    ));
}

#[test]
fn test_job_matches_tags_case_insensitive() {
    assert!(matches(&["rust"], "RUST Engineer", None));
}

#[test]
fn test_job_matches_tags_no_match() {
    assert!(!matches(
        &["java"],
        "Rust Developer",
        Some("Work with Rust and WebAssembly")
    ));
}

#[test]
fn test_job_matches_multiple_tags() {
    assert!(matches(
        &["rust", "golang"],
        "Backend Developer",
        Some("Experience with Rust or Golang required")
    ));
}

#[test]
fn test_job_matches_tags_with_none_description() {
    assert!(!matches(&["rust"], "Java Developer", None));
}

#[test]
fn test_job_matches_tags_empty_description() {
    assert!(!matches(&["backend"], "Frontend Developer", Some("")));
}

#[test]
fn test_job_matches_tags_multiple_tags_match_one() {
    assert!(matches(
        &["rust", "java"],
        "Rust Systems Engineer",
        Some("Build low-level systems")
    ));
}

#[test]
fn test_job_matches_tags_with_multiple_tags_any_match() {
    assert!(matches(
        &["rust", "python", "go"],
        "Backend Engineer",
        Some("We use Go for our microservices")
    ));
}

#[test]
fn test_tags_lowercase_conversion() {
    let scraper = RemoteOkScraper::new(vec!["Rust".to_string(), "PYTHON".to_string()], 10);
    let tags = scraper
        .tags
        .iter()
        .map(|tag| tag.to_lowercase())
        .collect::<Vec<_>>();

    assert!(scraper.job_matches_tags(&job("RUST developer", None), &tags));
}
