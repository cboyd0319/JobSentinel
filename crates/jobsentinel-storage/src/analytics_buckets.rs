use jobsentinel_domain::normalization::{normalize_location, normalize_title};

pub(crate) fn salary_title_bucket(title: &str) -> String {
    let canonical = normalize_title(title);

    for bucket in ["software engineer", "data scientist", "product manager"] {
        if canonical.contains(bucket) {
            return bucket.to_string();
        }
    }

    canonical.into_owned()
}

pub(crate) fn salary_location_bucket(location: &str) -> String {
    let canonical = normalize_location(location);
    let fallback = location.trim().to_lowercase();

    if canonical == "remote" {
        "remote".to_string()
    } else if canonical.contains("san francisco") || contains_token(&canonical, "sf") {
        "san francisco, ca".to_string()
    } else if canonical.contains("new york") || contains_token(&canonical, "nyc") {
        "new york, ny".to_string()
    } else if canonical.contains("seattle") {
        "seattle, wa".to_string()
    } else if canonical.contains("austin") {
        "austin, tx".to_string()
    } else {
        fallback
    }
}

pub(crate) fn market_location_bucket(location: &str) -> String {
    let canonical = normalize_location(location);
    let fallback = location.trim().to_lowercase();

    if canonical == "remote" {
        "remote".to_string()
    } else if canonical.contains("san francisco") || contains_token(&canonical, "sf") {
        "san francisco, ca".to_string()
    } else if canonical.contains("new york") || contains_token(&canonical, "nyc") {
        "new york, ny".to_string()
    } else {
        fallback
    }
}

fn contains_token(value: &str, expected: &str) -> bool {
    value
        .split(|character: char| !character.is_alphanumeric())
        .any(|token| token == expected)
}
