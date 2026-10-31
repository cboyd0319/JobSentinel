//! Privately stages a bounded native-selected package and its adjacent signed release metadata.

use crate::ipc::local_file::{copy_bounded, open_regular_source, read_bounded_text, LocalFileCopy};
use std::{
    io::Read,
    path::{Path, PathBuf},
};

const MAX_PACKAGE_BYTES: u64 = 512 * 1024 * 1024;

pub(super) struct StagedPackage {
    pub(super) package: LocalFileCopy,
    pub(super) metadata: Vec<u8>,
    pub(super) signature: String,
    pub(super) name: String,
    pub(super) operation_id: String,
    pub(super) extension: String,
    directory: PathBuf,
    keep: bool,
}
impl Drop for StagedPackage {
    fn drop(&mut self) {
        if self.keep {
            self.package.path = PathBuf::new();
        } else {
            let _ = std::fs::remove_file(&self.package.path);
            let _ = std::fs::remove_dir(&self.directory);
        }
    }
}
impl StagedPackage {
    pub(super) fn retain_for_installer(&mut self) {
        self.keep = true;
    }
    pub(super) fn bytes(&self) -> Result<Vec<u8>, String> {
        let file = open_regular_source(&self.package.path).map_err(|_| error())?;
        if file.metadata().map_err(|_| error())?.len() > MAX_PACKAGE_BYTES {
            return Err(error());
        }
        let mut bytes = Vec::new();
        file.take(MAX_PACKAGE_BYTES + 1)
            .read_to_end(&mut bytes)
            .map_err(|_| error())?;
        if bytes.len() as u64 > MAX_PACKAGE_BYTES {
            return Err(error());
        }
        Ok(bytes)
    }
}
fn error() -> String {
    "The local update package or signed metadata is unavailable or exceeds its limit.".into()
}

fn adjacent(path: &Path, suffix: &str) -> PathBuf {
    let mut value = path.as_os_str().to_owned();
    value.push(suffix);
    PathBuf::from(value)
}

pub(super) fn stage(path: &Path, data_dir: &Path) -> Result<StagedPackage, String> {
    let extension = path.extension().and_then(|v| v.to_str()).unwrap_or("");
    #[cfg(target_os = "macos")]
    let supported = ["dmg", "pkg"].contains(&extension);
    #[cfg(target_os = "windows")]
    let supported = ["msi", "exe"].contains(&extension);
    #[cfg(target_os = "linux")]
    let supported = ["deb", "rpm"].contains(&extension);
    if !supported {
        return Err("Choose an installer package for this operating system.".into());
    }
    let metadata = read_bounded_text(&adjacent(path, ".manifest.json"), 64 * 1024)
        .map_err(|_| error())?
        .into_bytes();
    let signature = read_bounded_text(&adjacent(path, ".sig"), 256)
        .map_err(|_| error())?
        .trim()
        .to_owned();
    let operation_id = uuid::Uuid::new_v4().to_string();
    let directory = data_dir.join(format!(".update-package-{operation_id}"));
    crate::desktop::ensure_private_dir(&directory).map_err(|_| error())?;
    let result = (|| {
        let mut source = open_regular_source(path).map_err(|_| error())?;
        let package = copy_bounded(
            &mut source,
            directory.join(format!("installer.{extension}")),
            MAX_PACKAGE_BYTES,
            || true,
        )
        .map_err(|_| error())?;
        crate::desktop::ensure_private_file(&package.path).map_err(|_| error())?;
        std::fs::OpenOptions::new()
            .write(true)
            .open(&package.path)
            .and_then(|f| f.sync_all())
            .map_err(|_| error())?;
        Ok(StagedPackage {
            package,
            metadata,
            signature,
            name: path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .into_owned(),
            operation_id: operation_id.clone(),
            extension: extension.into(),
            directory: directory.clone(),
            keep: false,
        })
    })();
    if result.is_err() {
        let _ = std::fs::remove_dir(&directory);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn unsupported_packages_never_create_staging() {
        let root = tempfile::tempdir().unwrap();
        assert!(stage(&root.path().join("script.sh"), root.path()).is_err());
        assert_eq!(std::fs::read_dir(root.path()).unwrap().count(), 0);
    }
    #[test]
    fn adjacent_metadata_does_not_replace_package_extension() {
        assert_eq!(
            adjacent(Path::new("update.pkg"), ".sig"),
            PathBuf::from("update.pkg.sig")
        );
    }
}

#[cfg(test)]
mod owned_tests {
    use super::*;
    #[test]
    fn staged_bytes_are_owned_and_cancel_removes_only_the_copy() {
        let root = tempfile::tempdir().unwrap();
        #[cfg(target_os = "macos")]
        let extension = "pkg";
        #[cfg(target_os = "windows")]
        let extension = "msi";
        #[cfg(target_os = "linux")]
        let extension = "deb";
        let source = root.path().join(format!("release.{extension}"));
        std::fs::write(&source, b"package").unwrap();
        std::fs::write(adjacent(&source, ".manifest.json"), "{}").unwrap();
        std::fs::write(adjacent(&source, ".sig"), "0".repeat(128)).unwrap();
        let staged = stage(&source, root.path()).unwrap();
        let directory = staged.directory.clone();
        std::fs::write(&source, b"changed input").unwrap();
        assert_eq!(staged.bytes().unwrap(), b"package");
        drop(staged);
        assert!(!directory.exists());
        assert_eq!(std::fs::read(source).unwrap(), b"changed input");
    }
}
