use super::*;

#[test]
fn test_normalize_question() {
    assert_eq!(
        AnswerLearningManager::normalize_question("How many years of experience do you have?"),
        "how many years of experience do you have"
    );

    assert_eq!(
        AnswerLearningManager::normalize_question("  Multiple   spaces   "),
        "multiple spaces"
    );

    assert_eq!(
        AnswerLearningManager::normalize_question("What's your salary? (USD)"),
        "what s your salary usd"
    );
}

#[test]
fn test_calculate_similarity() {
    // Identical
    assert_eq!(
        AnswerLearningManager::calculate_similarity("hello world", "hello world"),
        1.0
    );

    // Completely different
    assert!(AnswerLearningManager::calculate_similarity("hello", "goodbye") < 0.5);

    // Partial overlap
    let sim = AnswerLearningManager::calculate_similarity(
        "how many years experience",
        "how many years of programming experience",
    );
    assert!(sim > 0.6);
    assert!(sim < 1.0);

    // Empty strings
    assert_eq!(AnswerLearningManager::calculate_similarity("", "test"), 0.0);
}

#[test]
fn test_parse_optional_answer_datetime_accepts_sqlite_format() {
    let parsed = parse_optional_answer_datetime(Some("2026-05-20 12:34:56"))
        .expect("SQLite datetime should parse");

    assert_eq!(parsed.to_rfc3339(), "2026-05-20T12:34:56+00:00");
}

#[test]
fn test_parse_optional_answer_datetime_accepts_rfc3339() {
    let parsed = parse_optional_answer_datetime(Some("2026-05-20T12:34:56Z"))
        .expect("RFC3339 datetime should parse");

    assert_eq!(parsed.to_rfc3339(), "2026-05-20T12:34:56+00:00");
}

#[test]
fn test_parse_optional_answer_datetime_rejects_invalid() {
    assert!(parse_optional_answer_datetime(Some("not a date")).is_none());
    assert!(parse_optional_answer_datetime(None).is_none());
}
