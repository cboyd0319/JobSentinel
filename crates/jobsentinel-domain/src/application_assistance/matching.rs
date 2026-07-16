use super::*;

/// Match saved screening-answer wording as plain text, not executable regex.
pub fn screening_question_matches(pattern: &str, question: &str) -> bool {
    let normalized_question = normalize_screening_match_text(question);
    if normalized_question.is_empty() {
        return false;
    }

    let question_tokens: HashSet<&str> = normalized_question.split_whitespace().collect();

    screening_match_candidates(pattern)
        .into_iter()
        .any(|candidate| {
            let normalized_candidate = normalize_screening_match_text(&candidate);
            if normalized_candidate.is_empty() {
                return false;
            }

            if normalized_question.contains(&normalized_candidate) {
                return true;
            }

            let candidate_tokens: Vec<&str> = normalized_candidate.split_whitespace().collect();
            !candidate_tokens.is_empty()
                && candidate_tokens
                    .iter()
                    .all(|token| question_tokens.contains(token))
        })
}

fn screening_match_candidates(pattern: &str) -> Vec<String> {
    let trimmed = pattern.trim();
    if trimmed.is_empty() {
        return Vec::new();
    }

    let mut candidates = vec![trimmed.to_string()];
    let normalized_pattern = normalize_screening_match_text(trimmed);
    candidates.extend(plain_screening_pattern_aliases(&normalized_pattern));
    candidates.extend(legacy_screening_pattern_aliases(trimmed));

    if looks_like_legacy_screening_pattern(trimmed) {
        let simplified = simplify_legacy_screening_pattern(trimmed);
        if !simplified.is_empty() {
            candidates.push(simplified.clone());
            candidates.extend(
                simplified
                    .split('|')
                    .map(str::trim)
                    .filter(|candidate| !candidate.is_empty())
                    .map(ToOwned::to_owned),
            );
        }
    }

    candidates.sort();
    candidates.dedup();
    candidates
}

fn plain_screening_pattern_aliases(pattern: &str) -> Vec<String> {
    APPLICATION_SCREENING_ALIAS_TAXONOMY
        .plain_screening_pattern_aliases
        .iter()
        .find(|alias| normalize_screening_match_text(&alias.editable_pattern) == pattern)
        .map(|alias| alias.patterns.clone())
        .unwrap_or_default()
}

fn normalize_screening_match_text(input: &str) -> String {
    let lowered = input
        .to_lowercase()
        .replace("u. s.", "us")
        .replace("u.s.", "us");
    let mut normalized = String::with_capacity(lowered.len());
    let mut previous_was_space = true;

    for ch in lowered.chars() {
        if ch.is_alphanumeric() || matches!(ch, '+' | '#') {
            normalized.push(ch);
            previous_was_space = false;
        } else if !matches!(ch, '\'' | '’') && !previous_was_space {
            normalized.push(' ');
            previous_was_space = true;
        }
    }

    normalized.trim().to_string()
}

fn looks_like_legacy_screening_pattern(pattern: &str) -> bool {
    let lower = pattern.to_ascii_lowercase();
    lower.starts_with("(?i)")
        || lower.contains(".*")
        || lower.contains(".+")
        || lower.contains("\\s")
        || lower.contains('|')
        || lower.contains("\\b")
}

fn simplify_legacy_screening_pattern(pattern: &str) -> String {
    let mut simplified = pattern.trim();
    if simplified
        .get(..4)
        .is_some_and(|prefix| prefix.eq_ignore_ascii_case("(?i)"))
    {
        simplified = &simplified[4..];
    }

    let simplified = simplified
        .replace("\\s+", " ")
        .replace("\\s*", " ")
        .replace("\\b", " ")
        .replace(".*", " ")
        .replace(".+", " ");

    simplified
        .chars()
        .map(|ch| match ch {
            '(' | ')' | '[' | ']' | '{' | '}' | '^' | '$' | '?' | '*' | '\\' => ' ',
            _ => ch,
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn legacy_screening_pattern_aliases(pattern: &str) -> Vec<String> {
    APPLICATION_SCREENING_ALIAS_TAXONOMY
        .legacy_screening_patterns
        .iter()
        .find(|alias| alias.pattern == pattern)
        .map(|alias| alias.aliases.clone())
        .unwrap_or_default()
}
