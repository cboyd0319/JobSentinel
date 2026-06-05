use crate::core::automation::profile::ApplicationProfileInput;
use crate::platforms;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

const APPLICATION_RESUME_DIR: &str = "application-resumes";
const ALLOWED_APPLICATION_RESUME_EXTENSIONS: &[&str] = &["pdf", "docx", "doc"];

pub(super) fn resume_file_display_name(path: &str) -> Option<String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return None;
    }

    let name = trimmed
        .rsplit(['/', '\\'])
        .next()
        .map(str::trim)
        .filter(|name| !name.is_empty())?;

    if let Some((token_prefix, display_name)) = name.split_once("--") {
        if Uuid::parse_str(token_prefix).is_ok() && !display_name.trim().is_empty() {
            return Some(display_name.to_string());
        }
    }

    Some(name.to_string())
}

fn resume_reselect_error() -> String {
    "Choose the resume file again before using Application Assist.".to_string()
}

pub(super) fn application_resume_dir() -> PathBuf {
    platforms::get_data_dir().join(APPLICATION_RESUME_DIR)
}

fn allowed_application_resume_extension(path: &Path) -> Result<&'static str, String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .ok_or_else(|| "Choose a PDF, DOCX, or DOC resume file.".to_string())?;

    ALLOWED_APPLICATION_RESUME_EXTENSIONS
        .iter()
        .copied()
        .find(|allowed| *allowed == extension)
        .ok_or_else(|| "Choose a PDF, DOCX, or DOC resume file.".to_string())
}

fn safe_resume_file_name(path: &Path, extension: &str) -> String {
    let raw_stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("resume");
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
    let safe_stem = if safe_stem.is_empty() {
        "resume"
    } else {
        safe_stem
    };

    format!("{safe_stem}.{extension}")
}

fn validate_application_resume_token(token: &str) -> Result<&str, String> {
    let trimmed = token.trim();
    if trimmed.is_empty() || trimmed != token {
        return Err(resume_reselect_error());
    }

    if trimmed.contains(['/', '\\', ':']) || trimmed.contains("..") {
        return Err(resume_reselect_error());
    }

    let Some((uuid_part, display_name)) = trimmed.split_once("--") else {
        return Err(resume_reselect_error());
    };

    Uuid::parse_str(uuid_part).map_err(|_| resume_reselect_error())?;

    if display_name.is_empty()
        || display_name.len() > 120
        || display_name.starts_with('.')
        || display_name.ends_with('.')
    {
        return Err(resume_reselect_error());
    }

    allowed_application_resume_extension(Path::new(display_name))?;

    Ok(trimmed)
}

fn resolve_application_resume_path(managed_dir: &Path, token: &str) -> Result<PathBuf, String> {
    let token = validate_application_resume_token(token)?;
    Ok(managed_dir.join(token))
}

pub(super) fn prepare_application_profile_resume_input(
    mut input: ApplicationProfileInput,
    managed_dir: &Path,
) -> Result<ApplicationProfileInput, String> {
    if input.clear_resume_file.unwrap_or(false) {
        input.resume_file_path = None;
        input.resume_file_token = None;
        return Ok(input);
    }

    if input
        .resume_file_path
        .as_deref()
        .is_some_and(|path| !path.trim().is_empty())
    {
        return Err("Choose the resume file with Browse before saving.".to_string());
    }
    input.resume_file_path = None;

    if let Some(token) = input
        .resume_file_token
        .as_deref()
        .map(str::trim)
        .filter(|token| !token.is_empty())
    {
        let managed_path = resolve_application_resume_path(managed_dir, token)?;
        if !managed_path.is_file() {
            return Err(resume_reselect_error());
        }
        input.resume_file_path = Some(managed_path.to_string_lossy().to_string());
    }
    input.resume_file_token = None;

    Ok(input)
}

pub(super) fn trusted_application_resume_path(
    stored_path: Option<&str>,
    managed_dir: &Path,
) -> Result<Option<PathBuf>, String> {
    let Some(stored_path) = stored_path.map(str::trim).filter(|path| !path.is_empty()) else {
        return Ok(None);
    };

    let stored_path = PathBuf::from(stored_path);
    let file_name = stored_path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(resume_reselect_error)?;
    let expected_path = resolve_application_resume_path(managed_dir, file_name)?;

    let canonical_dir = managed_dir
        .canonicalize()
        .map_err(|_| resume_reselect_error())?;
    let canonical_stored = stored_path
        .canonicalize()
        .map_err(|_| resume_reselect_error())?;
    let canonical_expected = expected_path
        .canonicalize()
        .map_err(|_| resume_reselect_error())?;

    if canonical_stored != canonical_expected || !canonical_stored.starts_with(canonical_dir) {
        return Err(resume_reselect_error());
    }

    Ok(Some(canonical_stored))
}

fn copy_selected_resume_to_managed_storage(
    source_path: &Path,
) -> Result<ApplicationResumeFileSelection, String> {
    let extension = allowed_application_resume_extension(source_path)?;
    let metadata = std::fs::metadata(source_path)
        .map_err(|_| "Could not read the selected resume file.".to_string())?;
    if !metadata.is_file() {
        return Err("Choose a resume file, not a folder.".to_string());
    }

    let display_name = safe_resume_file_name(source_path, extension);
    let token = format!("{}--{}", Uuid::new_v4(), display_name);
    let managed_dir = application_resume_dir();
    std::fs::create_dir_all(&managed_dir)
        .map_err(|_| "Could not prepare local resume storage.".to_string())?;
    let destination = resolve_application_resume_path(&managed_dir, &token)?;
    std::fs::copy(source_path, &destination)
        .map_err(|_| "Could not copy the selected resume file.".to_string())?;

    Ok(ApplicationResumeFileSelection {
        token,
        file_name: display_name,
    })
}

/// Backend-owned resume selection result. Renderer receives only display data
/// and an opaque app-owned token, never the user's source file path.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationResumeFileSelection {
    pub token: String,
    pub file_name: String,
}

pub(super) async fn select_application_resume_file(
    app: tauri::AppHandle,
) -> Result<Option<ApplicationResumeFileSelection>, String> {
    let Some(file_path) = app
        .dialog()
        .file()
        .add_filter("Resume", ALLOWED_APPLICATION_RESUME_EXTENSIONS)
        .blocking_pick_file()
    else {
        return Ok(None);
    };

    let source_path = file_path
        .into_path()
        .map_err(|_| "Could not read the selected resume file.".to_string())?;

    copy_selected_resume_to_managed_storage(&source_path).map(Some)
}
