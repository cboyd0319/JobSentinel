use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

pub const PLATFORM_HEALTH_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub enum PlatformStorageArea {
    ApplicationData,
    Configuration,
    Cache,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PlatformPermissionState {
    Private,
    Missing,
    NeedsRepair,
    ManualReview,
    Unchecked,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PlatformPermissionAction {
    RepairLocally,
    FollowManualGuidance,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct PlatformPermissionCheck {
    pub area: PlatformStorageArea,
    pub state: PlatformPermissionState,
    pub action: Option<PlatformPermissionAction>,
    pub connectivity_required: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PackageRepairMode {
    GuidanceOnly,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PackageRepairActionId {
    UseDownloadedVerifiedInstaller,
    ObtainVerifiedInstaller,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct PackageRepairAction {
    pub action: PackageRepairActionId,
    pub connectivity_required: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct PackageRepairGuidance {
    pub mode: PackageRepairMode,
    pub actions: [PackageRepairAction; 2],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct PlatformHealthReport {
    pub schema_version: u32,
    pub permissions: [PlatformPermissionCheck; 3],
    pub package_repair: PackageRepairGuidance,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PlatformPermissionRepairOutcome {
    Repaired,
    ManualGuidanceRequired,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct PlatformPermissionRepair {
    pub schema_version: u32,
    pub area: PlatformStorageArea,
    pub outcome: PlatformPermissionRepairOutcome,
    pub connectivity_required: bool,
}

#[derive(Debug)]
struct PlatformPaths {
    data: PathBuf,
    config: PathBuf,
    cache: PathBuf,
}

impl PlatformPaths {
    fn new(
        data: impl Into<PathBuf>,
        config: impl Into<PathBuf>,
        cache: impl Into<PathBuf>,
    ) -> Self {
        Self {
            data: data.into(),
            config: config.into(),
            cache: cache.into(),
        }
    }

    fn get(&self, area: PlatformStorageArea) -> &Path {
        match area {
            PlatformStorageArea::ApplicationData => &self.data,
            PlatformStorageArea::Configuration => &self.config,
            PlatformStorageArea::Cache => &self.cache,
        }
    }
}

#[must_use]
pub fn inspect_platform_health() -> PlatformHealthReport {
    let paths = PlatformPaths::new(
        crate::get_data_dir(),
        crate::get_config_dir(),
        crate::get_cache_dir(),
    );
    inspect_platform_health_at(&paths, cfg!(unix))
}

#[must_use]
pub fn repair_platform_permissions(area: PlatformStorageArea) -> PlatformPermissionRepair {
    let paths = PlatformPaths::new(
        crate::get_data_dir(),
        crate::get_config_dir(),
        crate::get_cache_dir(),
    );
    repair_platform_permissions_at(area, &paths, cfg!(unix))
}

fn inspect_platform_health_at(
    paths: &PlatformPaths,
    unix_owner_modes: bool,
) -> PlatformHealthReport {
    PlatformHealthReport {
        schema_version: PLATFORM_HEALTH_SCHEMA_VERSION,
        permissions: [
            permission_check(
                PlatformStorageArea::ApplicationData,
                paths,
                unix_owner_modes,
            ),
            permission_check(PlatformStorageArea::Configuration, paths, unix_owner_modes),
            permission_check(PlatformStorageArea::Cache, paths, unix_owner_modes),
        ],
        package_repair: PackageRepairGuidance {
            mode: PackageRepairMode::GuidanceOnly,
            actions: [
                PackageRepairAction {
                    action: PackageRepairActionId::UseDownloadedVerifiedInstaller,
                    connectivity_required: false,
                },
                PackageRepairAction {
                    action: PackageRepairActionId::ObtainVerifiedInstaller,
                    connectivity_required: true,
                },
            ],
        },
    }
}

fn permission_check(
    area: PlatformStorageArea,
    paths: &PlatformPaths,
    unix_owner_modes: bool,
) -> PlatformPermissionCheck {
    let state = if unix_owner_modes {
        inspect_unix_permission_tree(paths.get(area))
    } else {
        PlatformPermissionState::Unchecked
    };
    let action = match state {
        PlatformPermissionState::Private => None,
        PlatformPermissionState::Missing | PlatformPermissionState::NeedsRepair => {
            Some(PlatformPermissionAction::RepairLocally)
        }
        PlatformPermissionState::ManualReview | PlatformPermissionState::Unchecked => {
            Some(PlatformPermissionAction::FollowManualGuidance)
        }
    };
    PlatformPermissionCheck {
        area,
        state,
        action,
        connectivity_required: false,
    }
}

fn repair_platform_permissions_at(
    area: PlatformStorageArea,
    paths: &PlatformPaths,
    unix_owner_modes: bool,
) -> PlatformPermissionRepair {
    let outcome = if unix_owner_modes {
        repair_unix_permissions(paths.get(area))
    } else {
        PlatformPermissionRepairOutcome::ManualGuidanceRequired
    };
    PlatformPermissionRepair {
        schema_version: PLATFORM_HEALTH_SCHEMA_VERSION,
        area,
        outcome,
        connectivity_required: false,
    }
}

#[cfg(unix)]
fn inspect_unix_permission_tree(path: &Path) -> PlatformPermissionState {
    use std::os::unix::fs::{MetadataExt, PermissionsExt};

    let metadata = match std::fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return PlatformPermissionState::Missing;
        }
        Err(_) => return PlatformPermissionState::ManualReview,
    };
    if !metadata.file_type().is_dir() {
        return PlatformPermissionState::ManualReview;
    }

    let mut needs_repair = metadata.permissions().mode() & 0o777 != 0o700;
    let entries = match std::fs::read_dir(path) {
        Ok(entries) => entries,
        Err(_) => return PlatformPermissionState::ManualReview,
    };
    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => return PlatformPermissionState::ManualReview,
        };
        let file_type = match entry.file_type() {
            Ok(file_type) => file_type,
            Err(_) => return PlatformPermissionState::ManualReview,
        };
        if file_type.is_symlink() {
            return PlatformPermissionState::ManualReview;
        }
        if file_type.is_dir() {
            match inspect_unix_permission_tree(&entry.path()) {
                PlatformPermissionState::Private => {}
                PlatformPermissionState::NeedsRepair => needs_repair = true,
                _ => return PlatformPermissionState::ManualReview,
            }
        } else if file_type.is_file() {
            let metadata = match std::fs::symlink_metadata(entry.path()) {
                Ok(metadata) => metadata,
                Err(_) => return PlatformPermissionState::ManualReview,
            };
            if !metadata.file_type().is_file() || metadata.nlink() != 1 {
                return PlatformPermissionState::ManualReview;
            }
            needs_repair |= metadata.permissions().mode() & 0o777 != 0o600;
        } else {
            return PlatformPermissionState::ManualReview;
        }
    }

    if needs_repair {
        PlatformPermissionState::NeedsRepair
    } else {
        PlatformPermissionState::Private
    }
}

#[cfg(not(unix))]
fn inspect_unix_permission_tree(_path: &Path) -> PlatformPermissionState {
    PlatformPermissionState::Unchecked
}

#[cfg(unix)]
fn repair_unix_permissions(path: &Path) -> PlatformPermissionRepairOutcome {
    match inspect_unix_permission_tree(path) {
        PlatformPermissionState::ManualReview | PlatformPermissionState::Unchecked => {
            return PlatformPermissionRepairOutcome::ManualGuidanceRequired;
        }
        PlatformPermissionState::Missing => {
            if std::fs::create_dir_all(path).is_err() {
                return PlatformPermissionRepairOutcome::Failed;
            }
        }
        PlatformPermissionState::Private | PlatformPermissionState::NeedsRepair => {}
    }

    if repair_unix_permission_tree(path).is_err() {
        return PlatformPermissionRepairOutcome::Failed;
    }
    match inspect_unix_permission_tree(path) {
        PlatformPermissionState::Private => PlatformPermissionRepairOutcome::Repaired,
        PlatformPermissionState::ManualReview => {
            PlatformPermissionRepairOutcome::ManualGuidanceRequired
        }
        _ => PlatformPermissionRepairOutcome::Failed,
    }
}

#[cfg(unix)]
fn repair_unix_permission_tree(path: &Path) -> std::io::Result<()> {
    set_verified_unix_mode(path, true, 0o700)?;
    for entry in std::fs::read_dir(path)? {
        let entry = entry?;
        let metadata = std::fs::symlink_metadata(entry.path())?;
        if metadata.file_type().is_dir() {
            repair_unix_permission_tree(&entry.path())?;
        } else if metadata.file_type().is_file() {
            set_verified_unix_mode(&entry.path(), false, 0o600)?;
        } else {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Platform permission repair requires ordinary local files",
            ));
        }
    }
    Ok(())
}

#[cfg(unix)]
fn set_verified_unix_mode(path: &Path, directory: bool, mode: u32) -> std::io::Result<()> {
    use std::os::unix::fs::{MetadataExt, PermissionsExt};

    let before = std::fs::symlink_metadata(path)?;
    if before.file_type().is_dir() != directory
        || before.file_type().is_file() == directory
        || (!directory && before.nlink() != 1)
    {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Platform permission repair requires ordinary local files",
        ));
    }
    let file = std::fs::File::open(path)?;
    let opened = file.metadata()?;
    let after = std::fs::symlink_metadata(path)?;
    if (opened.dev(), opened.ino()) != (after.dev(), after.ino())
        || after.file_type().is_dir() != directory
        || (!directory && opened.nlink() != 1)
    {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Platform permission repair changed while it was checked",
        ));
    }
    file.set_permissions(std::fs::Permissions::from_mode(mode))
}

#[cfg(not(unix))]
fn repair_unix_permissions(_path: &Path) -> PlatformPermissionRepairOutcome {
    PlatformPermissionRepairOutcome::ManualGuidanceRequired
}

#[cfg(test)]
mod tests;
