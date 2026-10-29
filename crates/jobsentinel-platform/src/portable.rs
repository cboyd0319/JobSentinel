//! Selects one private portable profile and retains its process lock and verified database key.

use std::{
    ffi::{OsStr, OsString},
    fs::{self, File},
    io::{self, Read},
    path::{Component, Path, PathBuf},
    sync::{Mutex, OnceLock},
};
use zeroize::Zeroizing;

const MARKER: &str = ".jobsentinel-portable";
const MARKER_CONTENT: &str = "jobsentinel.portable.v1\n";
const LOCK: &str = ".portable.lock";
const CHILDREN: [&str; 3] = ["data", "config", "cache"];
static PROFILE: OnceLock<PortableProfile> = OnceLock::new();
static SELECTION: Mutex<()> = Mutex::new(());

struct PortableProfile {
    root: PathBuf,
    _lock: File,
    key: OnceLock<Zeroizing<String>>,
    #[cfg(windows)]
    _directory: crate::PrivateDirectory,
}

/// Parse explicit profile selection; arguments contain paths, never passphrases.
pub fn portable_root_from_args(
    args: impl IntoIterator<Item = OsString>,
) -> io::Result<Option<PathBuf>> {
    let mut args = args.into_iter();
    let mut selected = None;
    while let Some(arg) = args.next() {
        if arg == OsStr::new("--") {
            break;
        }
        if arg == OsStr::new("--portable") {
            if selected.is_some() {
                return Err(invalid("Select only one portable profile."));
            }
            let directory = args
                .next()
                .ok_or_else(|| invalid("Use --portable followed by an absolute directory."))?;
            if directory.is_empty() || directory.as_encoded_bytes().starts_with(b"--") {
                return Err(invalid("Use --portable followed by an absolute directory."));
            }
            selected = Some(PathBuf::from(directory));
        } else if arg.as_encoded_bytes().starts_with(b"--portable") {
            return Err(invalid("Use --portable followed by an absolute directory."));
        }
    }
    Ok(selected)
}

/// Select once before any storage, model-cache or desktop initialization; errors forbid fallback.
pub fn select_portable_root(root: &Path) -> io::Result<()> {
    let _selection = SELECTION
        .lock()
        .map_err(|_| invalid("Portable profile selection is unavailable."))?;
    if PROFILE.get().is_some() {
        return Err(invalid("A portable profile has already been selected."));
    }
    PROFILE
        .set(PortableProfile::open(root)?)
        .map_err(|_| invalid("A portable profile has already been selected."))
}

pub fn portable_root() -> Option<&'static Path> {
    PROFILE.get().map(|profile| profile.root.as_path())
}

/// Supply after read-only authentication, or explicit confirmation of a genuinely empty profile.
/// Startup, recovery and update consumers reuse this memory-only passphrase instead of OS storage.
pub fn set_portable_database_key(key: Zeroizing<String>) -> io::Result<()> {
    let profile = PROFILE
        .get()
        .ok_or_else(|| invalid("Select a portable profile before unlocking it."))?;
    if key.len() > 1024 || key.trim().chars().count() < 16 {
        return Err(invalid("Portable database key is invalid."));
    }
    match profile.key.set(key) {
        Ok(()) => Ok(()),
        Err(key)
            if profile
                .key
                .get()
                .is_some_and(|current| current.as_str() == key.as_str()) =>
        {
            Ok(())
        }
        Err(_) => Err(invalid(
            "The portable profile is already unlocked with a different key.",
        )),
    }
}

pub(crate) fn database_key() -> Option<Zeroizing<String>> {
    PROFILE.get()?.key.get().cloned()
}

impl PortableProfile {
    fn open(root: &Path) -> io::Result<Self> {
        validate_root(root)?;
        let root = root.canonicalize()?;
        for ancestor in root.ancestors().skip(1) {
            match fs::symlink_metadata(ancestor.join(MARKER)) {
                Err(error) if error.kind() == io::ErrorKind::NotFound => {}
                _ => return Err(invalid("Portable profiles cannot be nested.")),
            }
        }
        for installed in [
            crate::get_data_dir(),
            crate::get_config_dir(),
            crate::get_cache_dir(),
        ] {
            let installed = installed.canonicalize().unwrap_or(installed);
            if root.starts_with(&installed) || installed.starts_with(&root) {
                return Err(invalid(
                    "Portable storage must be separate from the installed profile.",
                ));
            }
        }
        for entry in fs::read_dir(&root)? {
            let name = entry?.file_name();
            if name != OsStr::new(MARKER)
                && name != OsStr::new(LOCK)
                && !CHILDREN.iter().any(|child| name == OsStr::new(child))
            {
                return Err(invalid(
                    "Choose an empty directory or an existing JobSentinel portable profile.",
                ));
            }
        }
        #[cfg(windows)]
        let directory = crate::open_private_dir(&root)?;
        inspect_private(&root)?;
        let marked = match crate::open_private_file(&root.join(MARKER))? {
            Some(file) => {
                let mut contents = Vec::new();
                file.take(MARKER_CONTENT.len() as u64 + 1)
                    .read_to_end(&mut contents)?;
                if contents != MARKER_CONTENT.as_bytes() {
                    return Err(invalid(
                        "Portable profile version is unsupported or its marker is invalid.",
                    ));
                }
                true
            }
            None => false,
        };
        if !marked && CHILDREN.iter().any(|child| root.join(child).exists()) {
            return Err(invalid(
                "Existing portable data has no valid profile marker.",
            ));
        }
        let lock = open_profile_lock(&root.join(LOCK))?;
        if !marked {
            crate::write_file_atomic_private(&root.join(MARKER), MARKER_CONTENT)?;
        }
        for child in CHILDREN {
            if !root.join(child).try_exists()? {
                crate::ensure_private_dir_tree(&root.join(child))?;
            }
        }
        inspect_private(&root)?;
        Ok(Self {
            root,
            _lock: lock,
            key: OnceLock::new(),
            #[cfg(windows)]
            _directory: directory,
        })
    }
}

fn invalid(message: &'static str) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidInput, message)
}

fn validate_root(root: &Path) -> io::Result<()> {
    if !root.is_absolute()
        || root.parent().is_none()
        || root
            .components()
            .any(|component| matches!(component, Component::ParentDir | Component::CurDir))
    {
        return Err(invalid(
            "Portable storage requires an existing absolute directory without traversal.",
        ));
    }
    #[cfg(windows)]
    if !matches!(root.components().next(), Some(Component::Prefix(prefix)) if matches!(prefix.kind(), std::path::Prefix::Disk(_) | std::path::Prefix::VerbatimDisk(_)))
    {
        return Err(invalid(
            "Portable storage requires a direct local drive path.",
        ));
    }
    for ancestor in root.ancestors() {
        let metadata = fs::symlink_metadata(ancestor)?;
        if !metadata.is_dir() || metadata.file_type().is_symlink() {
            return Err(invalid(
                "Portable storage cannot traverse links or non-directories.",
            ));
        }
        #[cfg(windows)]
        {
            use std::os::windows::fs::MetadataExt;
            if metadata.file_attributes()
                & windows_sys::Win32::Storage::FileSystem::FILE_ATTRIBUTE_REPARSE_POINT
                != 0
            {
                return Err(invalid("Portable storage cannot traverse reparse points."));
            }
        }
        #[cfg(unix)]
        {
            use std::os::unix::fs::MetadataExt;
            let owner = fs::symlink_metadata(root)?.uid();
            if (metadata.uid() != 0 && metadata.uid() != owner)
                || (metadata.mode() & 0o022 != 0 && metadata.mode() & 0o1000 == 0)
            {
                return Err(invalid(
                    "Portable storage has a writable or untrusted parent directory.",
                ));
            }
            if ancestor == root && metadata.mode() & 0o7777 != 0o700 {
                return Err(invalid(
                    "Portable storage requires a private directory with owner-only permissions.",
                ));
            }
        }
    }
    Ok(())
}

fn inspect_private(root: &Path) -> io::Result<()> {
    #[cfg(unix)]
    {
        use rustix::fs::{fstat, open, openat, statat, AtFlags, Dir, FileType, Mode, OFlags};
        use std::{collections::HashMap, os::unix::fs::MetadataExt};
        let flags = OFlags::RDONLY | OFlags::NOFOLLOW | OFlags::NONBLOCK | OFlags::CLOEXEC;
        let directory = File::from(open(root, flags | OFlags::DIRECTORY, Mode::empty())?);
        let owner = directory.metadata()?.uid();
        fn inspect_directory(
            directory: &File,
            owner: u32,
            files: &mut HashMap<(u64, u64), (File, u64)>,
        ) -> io::Result<()> {
            let flags = OFlags::RDONLY | OFlags::NOFOLLOW | OFlags::NONBLOCK | OFlags::CLOEXEC;
            let metadata = directory.metadata()?;
            if metadata.uid() != owner || metadata.mode() & 0o7777 != 0o700 {
                return Err(invalid("Portable directories must remain private."));
            }
            for entry in Dir::read_from(directory)? {
                let entry = entry?;
                let name = entry.file_name();
                if matches!(name.to_bytes(), b"." | b"..") {
                    continue;
                }
                let expected = statat(directory, name, AtFlags::SYMLINK_NOFOLLOW)?;
                let kind = FileType::from_raw_mode(expected.st_mode);
                if !kind.is_dir() && !kind.is_file() {
                    return Err(invalid(
                        "Portable storage rejects links and nonordinary entries.",
                    ));
                }
                let child = File::from(openat(directory, name, flags, Mode::empty())?);
                let opened = fstat(&child)?;
                if (opened.st_dev, opened.st_ino, opened.st_mode)
                    != (expected.st_dev, expected.st_ino, expected.st_mode)
                {
                    return Err(invalid("Portable storage changed during inspection."));
                }
                if kind.is_dir() {
                    inspect_directory(&child, owner, files)?;
                } else {
                    let metadata = child.metadata()?;
                    if metadata.uid() != owner || metadata.mode() & 0o7777 != 0o600 {
                        return Err(invalid("Portable files must remain private."));
                    }
                    if metadata.nlink() > 1 {
                        let entry = files
                            .entry((metadata.dev(), metadata.ino()))
                            .or_insert((child, 0));
                        entry.1 += 1;
                    }
                }
            }
            Ok(())
        }
        let mut files = HashMap::new();
        inspect_directory(&directory, owner, &mut files)?;
        for (file, contained_links) in files.values() {
            if file.metadata()?.nlink() != *contained_links {
                return Err(invalid(
                    "Portable file links must all remain inside the profile.",
                ));
            }
        }
    }
    #[cfg(not(any(unix, windows)))]
    return Err(invalid(
        "This platform cannot enforce portable storage privacy.",
    ));
    #[cfg(windows)]
    for entry in fs::read_dir(root)? {
        let entry = entry?;
        let kind = entry.file_type()?;
        if kind.is_dir() {
            let _directory = crate::open_private_dir(&entry.path())?;
            inspect_private(&entry.path())?;
        } else if kind.is_file() {
            crate::ensure_private_file(&entry.path())?;
        } else {
            return Err(invalid(
                "Portable storage rejects links and nonordinary entries.",
            ));
        }
    }
    Ok(())
}

fn open_profile_lock(path: &Path) -> io::Result<File> {
    #[cfg(unix)]
    let file = {
        use rustix::fs::{open, Mode, OFlags};
        File::from(
            open(
                path,
                OFlags::RDWR
                    | OFlags::CREATE
                    | OFlags::NOFOLLOW
                    | OFlags::NONBLOCK
                    | OFlags::CLOEXEC,
                Mode::RUSR | Mode::WUSR,
            )
            .map_err(io::Error::from)?,
        )
    };
    #[cfg(windows)]
    let file = {
        use std::os::windows::fs::OpenOptionsExt;
        let mut options = fs::OpenOptions::new();
        options.read(true).write(true).create(true);
        options.custom_flags(windows_sys::Win32::Storage::FileSystem::FILE_FLAG_OPEN_REPARSE_POINT);
        options.open(path)?
    };
    if !crate::opened_file_matches_path(&file, path) {
        return Err(invalid("Portable profile lock is invalid."));
    }
    crate::ensure_private_file(path)?;
    file.try_lock().map_err(|error| match error {
        fs::TryLockError::WouldBlock => io::Error::new(
            io::ErrorKind::WouldBlock,
            "This portable profile is already open.",
        ),
        fs::TryLockError::Error(error) => error,
    })?;
    Ok(file)
}

#[cfg(test)]
mod tests;
