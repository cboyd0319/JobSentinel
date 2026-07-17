use std::path::Path;

pub(super) fn safe_resume_file_stem(path: &Path, fallback: &str) -> String {
    let raw_stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(fallback);
    let mut safe_stem = String::new();
    let mut previous_dash = false;

    for ch in raw_stem.chars() {
        let next = if ch.is_ascii_alphanumeric() || ch == '_' || ch == '-' {
            previous_dash = false;
            Some(ch)
        } else if ch.is_ascii_whitespace() || ch == '.' {
            if previous_dash {
                None
            } else {
                previous_dash = true;
                Some('-')
            }
        } else if previous_dash {
            None
        } else {
            previous_dash = true;
            Some('-')
        };

        if let Some(ch) = next {
            safe_stem.push(ch);
        }

        if safe_stem.len() >= 80 {
            break;
        }
    }

    let safe_stem = safe_stem.trim_matches('-');
    if safe_stem.is_empty() {
        fallback.to_string()
    } else {
        safe_stem.to_string()
    }
}
