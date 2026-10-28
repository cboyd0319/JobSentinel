//! Waits for the OS launcher acknowledgement while retaining the staged package and update lock.

use super::staging::StagedPackage;
use tokio::sync::OwnedMutexGuard;

pub(super) async fn open_package(
    mut package: StagedPackage,
    operation: OwnedMutexGuard<()>,
    launch: impl FnOnce(&std::path::Path) -> std::io::Result<()> + Send + 'static,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let _operation = operation;
        // The launcher may still need its input after acknowledgement, including ambiguous failures.
        package.retain_for_installer();
        launch(&package.package.path)
            .map_err(|_| "The installer launcher did not acknowledge opening the package. Restart JobSentinel; current data and the recovery snapshot were preserved.".to_string())
    }).await.map_err(|_| "Installer handoff was interrupted. Restart JobSentinel before continuing.".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn missing_package_launcher_failure_does_not_report_handoff_success() {
        let root = tempfile::tempdir().unwrap();
        #[cfg(target_os = "macos")]
        let extension = "pkg";
        #[cfg(target_os = "windows")]
        let extension = "msi";
        #[cfg(target_os = "linux")]
        let extension = "deb";
        let source = root.path().join(format!("release.{extension}"));
        std::fs::write(&source, b"package").unwrap();
        std::fs::write(
            root.path()
                .join(format!("release.{extension}.manifest.json")),
            "{}",
        )
        .unwrap();
        std::fs::write(
            root.path().join(format!("release.{extension}.sig")),
            "0".repeat(128),
        )
        .unwrap();
        let package = super::super::staging::stage(&source, root.path()).unwrap();
        std::fs::remove_file(&package.package.path).unwrap();
        let lock = std::sync::Arc::new(tokio::sync::Mutex::new(()));
        let result = open_package(package, lock.clone().lock_owned().await, |path| {
            open::that(path)
        })
        .await;
        assert!(result.unwrap_err().contains("did not acknowledge"));
        assert!(
            lock.try_lock().is_ok(),
            "launcher worker finished before releasing update ownership"
        );
    }
}
