//! Resolves relocatable managed resume references without following links or guessing old paths.

use std::{
    io,
    path::{Component, Path, PathBuf},
};

fn invalid_reference() -> io::Error {
    io::Error::new(io::ErrorKind::InvalidInput, "Choose the resume file again")
}

fn reference_metadata(path: &Path) -> io::Result<std::fs::Metadata> {
    let metadata = std::fs::symlink_metadata(path)?;
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x0000_0400 != 0 {
            return Err(invalid_reference());
        }
    }
    Ok(metadata)
}

fn managed_name(managed_dir: &Path, name: &str) -> io::Result<String> {
    let directory = managed_dir
        .file_name()
        .and_then(|part| part.to_str())
        .filter(|part| matches!(*part, "resume-uploads" | "application-resumes"))
        .ok_or_else(invalid_reference)?;
    let (id, display) = name.split_once("--").ok_or_else(invalid_reference)?;
    if id.len() != 36
        || display.is_empty()
        || display.starts_with('.')
        || display.ends_with(['.', ' '])
        || name.chars().any(char::is_control)
        || name.contains(['/', '\\', ':'])
        || name.contains("..")
        || !id.bytes().enumerate().all(|(index, byte)| {
            if matches!(index, 8 | 13 | 18 | 23) {
                byte == b'-'
            } else {
                byte.is_ascii_hexdigit()
            }
        })
    {
        return Err(invalid_reference());
    }
    Ok(format!("{directory}/{name}"))
}

/// Persist a relative reference only for a newly managed portable copy.
pub fn managed_resume_reference(
    path: &Path,
    managed_dir: &Path,
    portable: bool,
) -> io::Result<String> {
    if !portable {
        return Ok(path.to_string_lossy().into_owned());
    }
    if path.parent() != Some(managed_dir) {
        return Err(invalid_reference());
    }
    managed_name(
        managed_dir,
        path.file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(invalid_reference)?,
    )
}

/// Resolve portable references under their exact owner directory; installed absolute paths retain their caller's checks.
pub fn resolve_managed_resume_reference(
    stored: &str,
    managed_dir: &Path,
    portable: bool,
) -> io::Result<PathBuf> {
    let path = Path::new(stored);
    if path.is_absolute() {
        return if portable {
            Err(invalid_reference())
        } else {
            Ok(path.to_path_buf())
        };
    }
    let mut parts = path.components();
    let (Some(Component::Normal(_)), Some(Component::Normal(name)), None) =
        (parts.next(), parts.next(), parts.next())
    else {
        return Err(invalid_reference());
    };
    let name = name.to_str().ok_or_else(invalid_reference)?;
    if managed_name(managed_dir, name)? != stored {
        return Err(invalid_reference());
    }
    let file = managed_dir.join(name);
    for directory in [
        managed_dir,
        managed_dir.parent().ok_or_else(invalid_reference)?,
    ] {
        if !reference_metadata(directory)?.file_type().is_dir() {
            return Err(invalid_reference());
        }
    }
    let metadata = reference_metadata(&file)?;
    if !metadata.is_file() {
        return Err(invalid_reference());
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        if metadata.nlink() != 1 {
            return Err(invalid_reference());
        }
    }
    Ok(file)
}

#[cfg(test)]
mod tests {
    use super::*;
    const NAME: &str = "7d9d16a1-2e5d-4b32-9eb2-bfbffb4ee871--resume.html";

    #[test]
    fn managed_reference_survives_move_and_refuses_ambiguous_owners() {
        let root = tempfile::tempdir().unwrap();
        let original = root.path().join("original");
        let managed = original.join("resume-uploads");
        std::fs::create_dir_all(&managed).unwrap();
        let file = managed.join(NAME);
        std::fs::write(&file, b"resume").unwrap();
        let reference = managed_resume_reference(&file, &managed, true).unwrap();
        let moved = root.path().join("moved");
        std::fs::rename(&original, &moved).unwrap();
        let managed = moved.join("resume-uploads");
        assert_eq!(
            std::fs::read(resolve_managed_resume_reference(&reference, &managed, true).unwrap())
                .unwrap(),
            b"resume"
        );
        for bad in [
            format!("../resume-uploads/{NAME}"),
            format!("resume-uploads/./{NAME}"),
            format!("application-resumes/{NAME}"),
            format!("resume-uploads//{NAME}"),
            format!("resume-uploads/..\\{NAME}"),
            file.to_string_lossy().into_owned(),
        ] {
            assert!(
                resolve_managed_resume_reference(&bad, &managed, true).is_err(),
                "{bad}"
            );
        }
    }

    #[cfg(unix)]
    #[test]
    fn managed_reference_refuses_file_directory_and_hard_links() {
        use std::os::unix::fs::symlink;
        let root = tempfile::tempdir().unwrap();
        let managed = root.path().join("resume-uploads");
        std::fs::create_dir(&managed).unwrap();
        let outside = root.path().join("outside");
        std::fs::write(&outside, b"external").unwrap();
        let file = managed.join(NAME);
        let reference = format!("resume-uploads/{NAME}");
        symlink(&outside, &file).unwrap();
        assert!(resolve_managed_resume_reference(&reference, &managed, true).is_err());
        std::fs::remove_file(&file).unwrap();
        std::fs::hard_link(&outside, &file).unwrap();
        assert!(resolve_managed_resume_reference(&reference, &managed, true).is_err());
        std::fs::remove_file(&file).unwrap();
        std::fs::remove_dir(&managed).unwrap();
        symlink(root.path(), &managed).unwrap();
        assert!(resolve_managed_resume_reference(&reference, &managed, true).is_err());
    }
}
