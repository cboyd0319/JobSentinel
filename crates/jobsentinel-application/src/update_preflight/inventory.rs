//! Collects current build and local component compatibility through Rust-owned readers.

use super::{InstalledUpdateState, ReleaseVersion, UpdatePreflightError};
use jobsentinel_domain::{
    contracts::{Architecture, Platform, SchemaId},
    manifests::{Edition, EditionComponent, EditionManifest, ModelProfile, PackType},
};
use jobsentinel_storage::Database;
use std::path::Path;

/// The application supplies its resolved data directory; never accept it directly from IPC.
pub async fn collect_installed_update_state(
    database: &Database,
    data_dir: &Path,
) -> Result<InstalledUpdateState, UpdatePreflightError> {
    let version = parse_version(env!("CARGO_PKG_VERSION"))?;
    let (database_schema, migration) = database
        .update_schema_inventory()
        .await
        .map_err(|_| UpdatePreflightError::Inventory)?;
    let runtime = crate::pack_runtime::PackRuntimeEnvironment::for_data_dir(data_dir);
    let (packs, pack_identity) = crate::pack_runtime::update_pack_inventory(database, &runtime)
        .await
        .map_err(|_| UpdatePreflightError::Inventory)?;
    let (backup, export) = Database::update_archive_formats();
    let (model, model_identity) = model_formats(data_dir)?;
    let mut state = InstalledUpdateState {
        version,
        edition: build_edition()?,
        database: database_schema,
        migration,
        pack: Vec::new(),
        model,
        browser: vec![u64::from(
            jobsentinel_assistance::COMPANION_PROTOCOL_VERSION,
        )],
        region: Vec::new(),
        pack_app_versions: Vec::new(),
        pack_identity,
        model_identity,
        backup,
        export,
    };
    for pack in packs {
        match pack.manifest().schema {
            SchemaId::PackManifestV1 => state.pack.push(1),
            _ => return Err(UpdatePreflightError::Inventory),
        }
        if pack.manifest().pack_type == PackType::Region {
            state.region.push(1);
        }
        state.pack_app_versions.push((
            parse_version(pack.minimum_app_version())?,
            parse_version(pack.maximum_app_version())?,
        ));
    }
    Ok(state)
}

pub(super) fn parse_version(text: &str) -> Result<ReleaseVersion, UpdatePreflightError> {
    let values: Vec<u32> = text
        .split('.')
        .map(str::parse)
        .collect::<Result<_, _>>()
        .map_err(|_| UpdatePreflightError::Inventory)?;
    let version: [u32; 3] = values
        .try_into()
        .map_err(|_| UpdatePreflightError::Inventory)?;
    if version[0] != 3 {
        return Err(UpdatePreflightError::Inventory);
    }
    Ok(ReleaseVersion(version))
}

pub(super) fn build_edition() -> Result<EditionManifest, UpdatePreflightError> {
    let platform = match std::env::consts::OS {
        "macos" => Platform::Macos,
        "windows" => Platform::Windows,
        "linux" => Platform::Linux,
        _ => return Err(UpdatePreflightError::Inventory),
    };
    let architecture = match std::env::consts::ARCH {
        "aarch64" => Architecture::Aarch64,
        "x86_64" => Architecture::X86_64,
        _ => return Err(UpdatePreflightError::Inventory),
    };
    Ok(EditionManifest {
        schema: SchemaId::EditionManifestV1,
        edition: Edition::Essentials,
        profile: ModelProfile::Lighter,
        artifact_version: env!("CARGO_PKG_VERSION").into(),
        platform,
        architecture,
        compatibility_line: 3,
        rollback_supported: true,
        default_components: vec![
            EditionComponent::DeterministicMatching,
            EditionComponent::PublicSources,
            EditionComponent::SafeSupport,
        ],
        automatic_model_downloads: false,
    })
}

fn model_formats(data_dir: &Path) -> Result<(Vec<u64>, Vec<String>), UpdatePreflightError> {
    let root = data_dir.join("ml_models");
    match std::fs::symlink_metadata(&root) {
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Ok((Vec::new(), Vec::new()))
        }
        Ok(metadata) if metadata.is_dir() && !metadata.file_type().is_symlink() => {}
        _ => return Err(UpdatePreflightError::Inventory),
    }
    #[cfg(feature = "embedded-ml")]
    {
        jobsentinel_local_ai::ModelManager::new(data_dir.to_path_buf())
            .update_identity_inventory()
            .map_err(|_| UpdatePreflightError::Inventory)
    }
    #[cfg(not(feature = "embedded-ml"))]
    {
        for entry in std::fs::read_dir(root).map_err(|_| UpdatePreflightError::Inventory)? {
            let entry = entry.map_err(|_| UpdatePreflightError::Inventory)?;
            if entry.file_name() != ".xet"
                || !entry
                    .file_type()
                    .map_err(|_| UpdatePreflightError::Inventory)?
                    .is_dir()
            {
                return Err(UpdatePreflightError::Inventory);
            }
        }
        Ok((Vec::new(), Vec::new()))
    }
}
