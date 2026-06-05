//! Non-identifying labels for log fields.

use std::path::Path;

/// Return a path label safe for logs.
///
/// Local paths can include usernames, company names, resume filenames, and
/// other private context. Keep enough metadata to debug file type without
/// writing path components.
#[must_use]
pub fn path_label_for_logging(path: impl AsRef<Path>) -> String {
    let path = path.as_ref();
    let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
        return "<path>".to_string();
    };

    let extension = extension.trim();
    if extension.is_empty()
        || extension.len() > 16
        || !extension
            .chars()
            .all(|character| character.is_ascii_alphanumeric())
    {
        return "<path>".to_string();
    }

    format!("<path:.{}>", extension.to_ascii_lowercase())
}

#[cfg(test)]
mod tests {
    use super::path_label_for_logging;

    #[test]
    fn redacts_path_components() {
        let label = path_label_for_logging("private/Jane Doe Resume.pdf");

        assert_eq!(label, "<path:.pdf>");
        assert!(!label.contains("private"));
        assert!(!label.contains("Jane"));
    }

    #[test]
    fn handles_paths_without_extensions() {
        assert_eq!(path_label_for_logging("private/jobsentinel"), "<path>");
    }

    #[test]
    fn rejects_unusual_extensions() {
        assert_eq!(
            path_label_for_logging("/tmp/file.private-token-value"),
            "<path>"
        );
        assert_eq!(path_label_for_logging("/tmp/file.pd/f"), "<path>");
    }
}
