// Owns locked Windows private directories and their handle-relative child lifecycle.

use crate::{
    windows_acl_policy::PrivateObjectKind,
    windows_private_child::{
        create_child_file, open_child_file, rename_child_noclobber, set_child_delete_on_close,
    },
    windows_private_files::apply_private_dacl,
    windows_private_path::{
        create_child_directory, open_child_directory, open_child_directory_for_repair,
        open_directory, open_or_create_directory, LockedPrivatePath,
    },
};
use std::{
    fs::File,
    io::{self, Read, Write},
    path::Path,
    sync::atomic::{AtomicU64, Ordering},
};

pub struct PrivateDirectory {
    locked: LockedPrivatePath,
}

static TEMP_FILE_SEQUENCE: AtomicU64 = AtomicU64::new(0);

impl PrivateDirectory {
    pub fn open_or_create_child(mut self, name: &str) -> io::Result<Self> {
        let child = match open_owned_child(&self.locked, name) {
            Ok(child) => child,
            Err(error) if error.kind() == io::ErrorKind::NotFound => {
                match create_child_directory(&self.locked, name) {
                    Ok(child) => child,
                    Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {
                        open_owned_child(&self.locked, name)?
                    }
                    Err(error) => return Err(error),
                }
            }
            Err(error) => return Err(error),
        };
        apply_private_dacl(&child, PrivateObjectKind::Directory)?;
        self.locked.retain_object(child);
        Ok(self)
    }

    pub fn open_child(mut self, name: &str) -> io::Result<Self> {
        let child = open_owned_child(&self.locked, name)?;
        apply_private_dacl(&child, PrivateObjectKind::Directory)?;
        self.locked.retain_object(child);
        Ok(self)
    }

    pub fn write_file_noclobber(&self, name: &str, bytes: &[u8]) -> io::Result<bool> {
        for _ in 0..16 {
            let sequence = TEMP_FILE_SEQUENCE.fetch_add(1, Ordering::Relaxed);
            let temporary_name = format!(".jobsentinel-{}-{sequence}.tmp", std::process::id());
            let mut file = match create_child_file(&self.locked, &temporary_name) {
                Ok(file) => file,
                Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
                Err(error) => return Err(error),
            };
            let result = (|| {
                apply_private_dacl(&file, PrivateObjectKind::File)?;
                file.write_all(bytes)?;
                file.sync_all()?;
                rename_child_noclobber(&self.locked, &file, name)
            })();
            match result {
                Ok(()) => return Ok(true),
                Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {
                    set_child_delete_on_close(&file, true)?;
                    return Ok(false);
                }
                Err(error) => {
                    return match set_child_delete_on_close(&file, true) {
                        Ok(()) => Err(error),
                        Err(cleanup_error) => Err(cleanup_error),
                    };
                }
            }
        }
        Err(io::Error::new(
            io::ErrorKind::AlreadyExists,
            "private temporary file names are unavailable",
        ))
    }

    pub fn read_file(&self, name: &str, max_bytes: usize) -> io::Result<Vec<u8>> {
        let mut file = open_owned_file(&self.locked, name)?;
        let metadata = file.metadata()?;
        if metadata.len() > max_bytes as u64 {
            return Err(invalid_data("private storage file is too large"));
        }
        let mut bytes = Vec::with_capacity(metadata.len() as usize);
        Read::by_ref(&mut file)
            .take(max_bytes as u64 + 1)
            .read_to_end(&mut bytes)?;
        if bytes.len() > max_bytes {
            Err(invalid_data("private storage file is too large"))
        } else {
            Ok(bytes)
        }
    }

    pub fn remove_file(&self, name: &str) -> io::Result<()> {
        let file = match open_owned_file(&self.locked, name) {
            Ok(file) => file,
            Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
            Err(error) => return Err(error),
        };
        set_child_delete_on_close(&file, true)
    }
}

pub(crate) fn ensure_private_dir(path: &Path) -> io::Result<()> {
    open_or_create_private_dir(path).map(drop)
}

pub fn open_or_create_private_dir(path: &Path) -> io::Result<PrivateDirectory> {
    lock_private_dir(open_or_create_directory(path)?)
}

pub fn open_private_dir(path: &Path) -> io::Result<PrivateDirectory> {
    lock_private_dir(open_directory(path)?)
}

fn lock_private_dir(mut locked: LockedPrivatePath) -> io::Result<PrivateDirectory> {
    for object in locked.acl_objects() {
        apply_private_dacl(object, PrivateObjectKind::Directory)?;
    }
    let target = locked.reopen_target_directory()?;
    apply_private_dacl(&target, PrivateObjectKind::Directory)?;
    locked.retain_object(target);
    Ok(PrivateDirectory { locked })
}

fn open_owned_child(parent: &LockedPrivatePath, name: &str) -> io::Result<File> {
    match open_child_directory(parent, name) {
        Ok(child) => Ok(child),
        Err(error) if error.kind() == io::ErrorKind::PermissionDenied => {
            let repair = open_child_directory_for_repair(parent, name)?;
            apply_private_dacl(&repair, PrivateObjectKind::Directory)?;
            drop(repair);
            open_child_directory(parent, name)
        }
        Err(error) => Err(error),
    }
}

fn open_owned_file(parent: &LockedPrivatePath, name: &str) -> io::Result<File> {
    let file = open_child_file(parent, name)?;
    apply_private_dacl(&file, PrivateObjectKind::File)?;
    Ok(file)
}

fn invalid_data(message: &'static str) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, message)
}

#[cfg(test)]
#[path = "windows_private_files_tests.rs"]
mod tests;

/// Publish a same-directory temporary file with Windows write-through rename semantics.
pub fn persist_file_write_through(
    temporary: tempfile::NamedTempFile,
    path: &Path,
) -> io::Result<std::fs::File> {
    if temporary.path().parent() != path.parent() {
        return Err(io::Error::other("Publication requires the same directory"));
    }
    persist_file(temporary, path, true)
}

/// Publish without replacement on the same Windows volume; cross-volume moves fail.
pub fn persist_file_noclobber_write_through(
    temporary: tempfile::NamedTempFile,
    path: &Path,
) -> io::Result<std::fs::File> {
    persist_file(temporary, path, false)
}

fn persist_file(
    temporary: tempfile::NamedTempFile,
    path: &Path,
    replace_existing: bool,
) -> io::Result<std::fs::File> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MoveFileExW, SetFileAttributesW, FILE_ATTRIBUTE_NORMAL, MOVEFILE_REPLACE_EXISTING,
        MOVEFILE_WRITE_THROUGH,
    };
    let (file, mut temporary_path) = temporary.into_parts();
    let wide = |path: &Path| -> io::Result<Vec<u16>> {
        let mut value: Vec<_> = path.as_os_str().encode_wide().collect();
        if value.contains(&0) {
            return Err(io::Error::other("Invalid publication path"));
        }
        value.push(0);
        Ok(value)
    };
    let source = wide(&temporary_path)?;
    let destination = wide(path)?;
    // SAFETY: source is NUL-terminated and live through this synchronous call.
    if unsafe { SetFileAttributesW(source.as_ptr(), FILE_ATTRIBUTE_NORMAL) } == 0 {
        return Err(io::Error::last_os_error());
    }
    file.sync_all()?;
    // COPY_ALLOWED is omitted so publication cannot become a cross-volume copy/delete.
    let flags = MOVEFILE_WRITE_THROUGH
        | if replace_existing {
            MOVEFILE_REPLACE_EXISTING
        } else {
            0
        };
    // SAFETY: both buffers are NUL-terminated and live through this synchronous call.
    if unsafe { MoveFileExW(source.as_ptr(), destination.as_ptr(), flags) } == 0 {
        return Err(io::Error::last_os_error());
    }
    temporary_path.disable_cleanup(true);
    Ok(file)
}
