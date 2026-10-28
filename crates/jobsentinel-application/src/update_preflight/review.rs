//! Binds a reviewed candidate to exact inputs and rechecks Rust-owned compatibility snapshots.

use super::*;
use jobsentinel_storage::Database;
use std::path::{Path, PathBuf};

/// Private compatibility review; excludes user records/configuration and grants no mutation authority.
pub struct ReviewedUpdate {
    metadata: Vec<u8>,
    signature: String,
    installed: InstalledUpdateState,
    data_dir: PathBuf,
}

/// The application must supply the database belonging to its resolved data directory.
pub async fn review_update(
    metadata: &[u8],
    signature: &str,
    package: &[u8],
    publishers: &[ReleasePublisher],
    database: &Database,
    data_dir: &Path,
) -> Result<ReviewedUpdate, UpdatePreflightError> {
    let installed = collect_installed_update_state(database, data_dir).await?;
    let mut review = assess_review(metadata, signature, package, publishers, installed)?;
    review.data_dir = data_dir
        .canonicalize()
        .map_err(|_| UpdatePreflightError::Inventory)?;
    Ok(review)
}

fn assess_review(
    metadata: &[u8],
    signature: &str,
    package: &[u8],
    publishers: &[ReleasePublisher],
    installed: InstalledUpdateState,
) -> Result<ReviewedUpdate, UpdatePreflightError> {
    preflight_update(metadata, signature, package, publishers, &installed)?;
    Ok(ReviewedUpdate {
        metadata: metadata.to_vec(),
        signature: signature.to_owned(),
        installed,
        data_dir: PathBuf::new(),
    })
}

/// Recollects inventory and authenticates again. This is not a lock or permission to mutate.
pub async fn revalidate_update(
    review: &ReviewedUpdate,
    metadata: &[u8],
    signature: &str,
    package: &[u8],
    publishers: &[ReleasePublisher],
    database: &Database,
    data_dir: &Path,
) -> Result<VerifiedUpdateCandidate, UpdatePreflightError> {
    if review.data_dir
        != data_dir
            .canonicalize()
            .map_err(|_| UpdatePreflightError::Inventory)?
    {
        return Err(UpdatePreflightError::Changed);
    }
    let current = collect_installed_update_state(database, data_dir).await?;
    revalidate_snapshot(review, metadata, signature, package, publishers, &current)
}

fn revalidate_snapshot(
    review: &ReviewedUpdate,
    metadata: &[u8],
    signature: &str,
    package: &[u8],
    publishers: &[ReleasePublisher],
    current: &InstalledUpdateState,
) -> Result<VerifiedUpdateCandidate, UpdatePreflightError> {
    if review.metadata != metadata || review.signature != signature || review.installed != *current
    {
        return Err(UpdatePreflightError::Changed);
    }
    preflight_update(metadata, signature, package, publishers, current)
}

#[cfg(test)]
mod tests {
    use super::super::tests::{fixture, signed};
    use super::*;

    #[test]
    fn same_format_component_replacement_invalidates_review() {
        let (manifest, mut installed) = fixture();
        installed.pack_identity = vec!["pack-release-1".into()];
        installed.model_identity = vec!["model-revision-1".into()];
        let (bytes, signature, publishers) = signed(&manifest);
        let review = assess_review(
            &bytes,
            &signature,
            b"package",
            &publishers,
            installed.clone(),
        )
        .expect("review");
        for pack in [true, false] {
            let mut changed = installed.clone();
            if pack {
                changed.pack_identity[0] = "pack-release-2".into();
            } else {
                changed.model_identity[0] = "model-revision-2".into();
            }
            assert_eq!(
                revalidate_snapshot(
                    &review,
                    &bytes,
                    &signature,
                    b"package",
                    &publishers,
                    &changed
                )
                .unwrap_err(),
                UpdatePreflightError::Changed
            );
        }
    }
    #[test]
    fn revalidation_rechecks_trust_package_and_exact_reviewed_metadata() {
        let (manifest, installed) = fixture();
        let (bytes, signature, mut publishers) = signed(&manifest);
        let review = assess_review(
            &bytes,
            &signature,
            b"package",
            &publishers,
            installed.clone(),
        )
        .expect("review");
        assert!(revalidate_snapshot(
            &review,
            &bytes,
            &signature,
            b"package",
            &publishers,
            &installed
        )
        .is_ok());
        assert_eq!(
            revalidate_snapshot(
                &review,
                &bytes,
                &signature,
                b"changed",
                &publishers,
                &installed
            )
            .unwrap_err(),
            UpdatePreflightError::Integrity
        );
        publishers[0].revoked = true;
        assert_eq!(
            revalidate_snapshot(
                &review,
                &bytes,
                &signature,
                b"package",
                &publishers,
                &installed
            )
            .unwrap_err(),
            UpdatePreflightError::Trust
        );
        let mut changed = manifest;
        changed.maximum_source = ReleaseVersion([3, 3, 0]);
        let (other, other_signature, publishers) = signed(&changed);
        assert_eq!(
            revalidate_snapshot(
                &review,
                &other,
                &other_signature,
                b"package",
                &publishers,
                &installed
            )
            .unwrap_err(),
            UpdatePreflightError::Changed
        );
    }
    #[tokio::test]
    async fn public_review_recollects_inventory_before_revalidation() {
        let root = tempfile::tempdir().expect("root");
        let database = Database::connect_memory().await.expect("database");
        database.migrate().await.expect("migrations");
        let state = collect_installed_update_state(&database, root.path())
            .await
            .expect("inventory");
        let (mut manifest, _) = fixture();
        manifest.edition.platform = state.edition.platform;
        manifest.edition.architecture = state.edition.architecture;
        let (bytes, signature, publishers) = signed(&manifest);
        let review = review_update(
            &bytes,
            &signature,
            b"package",
            &publishers,
            &database,
            root.path(),
        )
        .await
        .expect("review");
        assert!(revalidate_update(
            &review,
            &bytes,
            &signature,
            b"package",
            &publishers,
            &database,
            root.path()
        )
        .await
        .is_ok());
        let other_root = tempfile::tempdir().expect("other profile");
        assert!(matches!(
            revalidate_update(
                &review,
                &bytes,
                &signature,
                b"package",
                &publishers,
                &database,
                other_root.path()
            )
            .await,
            Err(UpdatePreflightError::Changed)
        ));
        std::fs::create_dir_all(root.path().join("ml_models/unknown")).expect("unknown cache");
        assert_eq!(
            revalidate_update(
                &review,
                &bytes,
                &signature,
                b"package",
                &publishers,
                &database,
                root.path()
            )
            .await
            .unwrap_err(),
            UpdatePreflightError::Inventory
        );
    }
}
