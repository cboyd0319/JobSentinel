use std::{io, path::Path};

#[cfg(unix)]
mod platform {
    use std::{fs::File, io, io::Read, io::Write, path::Path};

    use jobsentinel_domain::v3_signed_packs::MAX_SIGNED_PACK_BYTES;
    use rustix::{
        fd::OwnedFd,
        fs::{fchmod, fsync, linkat, mkdirat, open, openat, unlinkat, AtFlags, Mode, OFlags},
        io::Errno,
    };

    const DIR_MODE: Mode = Mode::RUSR.union(Mode::WUSR).union(Mode::XUSR);
    const FILE_MODE: Mode = Mode::RUSR.union(Mode::WUSR);

    pub(super) fn persist(
        root: &Path,
        publisher_dir: &str,
        pack_dir: &str,
        file_name: &str,
        bytes: &[u8],
    ) -> io::Result<()> {
        let (_, _, directory) = open_tree(root, publisher_dir, pack_dir, true)?;
        let temporary_name = format!(".{}.tmp", uuid::Uuid::new_v4());
        let descriptor = openat(
            &directory,
            &temporary_name,
            OFlags::WRONLY | OFlags::CREATE | OFlags::EXCL | OFlags::NOFOLLOW | OFlags::CLOEXEC,
            FILE_MODE,
        )?;
        fchmod(&descriptor, FILE_MODE)?;
        let mut temporary = File::from(descriptor);
        temporary.write_all(bytes)?;
        temporary.sync_all()?;
        drop(temporary);
        let linked = match linkat(
            &directory,
            &temporary_name,
            &directory,
            file_name,
            AtFlags::empty(),
        ) {
            Ok(()) => Ok(()),
            Err(Errno::EXIST) if read_from(&directory, file_name)? == bytes => Ok(()),
            Err(Errno::EXIST) => Err(io::Error::other("pack artifact already differs")),
            Err(error) => Err(error.into()),
        };
        let _ = unlinkat(&directory, &temporary_name, AtFlags::empty());
        linked?;
        if read_from(&directory, file_name)? != bytes {
            return Err(io::Error::other("pack artifact verification failed"));
        }
        fsync(&directory)?;
        Ok(())
    }

    pub(super) fn read(
        root: &Path,
        publisher_dir: &str,
        pack_dir: &str,
        file_name: &str,
    ) -> io::Result<Vec<u8>> {
        let (_, _, directory) = open_tree(root, publisher_dir, pack_dir, false)?;
        read_from(&directory, file_name)
    }

    pub(super) fn remove(
        root: &Path,
        publisher_dir: &str,
        pack_dir: &str,
        file_name: &str,
    ) -> io::Result<()> {
        let (_, _, directory) = open_tree(root, publisher_dir, pack_dir, false)?;
        match openat(
            &directory,
            file_name,
            OFlags::RDONLY | OFlags::NONBLOCK | OFlags::NOFOLLOW | OFlags::CLOEXEC,
            Mode::empty(),
        ) {
            Ok(descriptor) => {
                if !File::from(descriptor).metadata()?.is_file() {
                    return Err(io::Error::other("pack artifact is invalid"));
                }
            }
            Err(Errno::NOENT) => return Ok(()),
            Err(error) => return Err(error.into()),
        }
        unlinkat(&directory, file_name, AtFlags::empty())?;
        fsync(&directory)?;
        Ok(())
    }

    fn open_tree(
        root: &Path,
        publisher_dir: &str,
        pack_dir: &str,
        create: bool,
    ) -> io::Result<(OwnedFd, OwnedFd, OwnedFd)> {
        if create {
            match std::fs::create_dir(root) {
                Ok(()) => {}
                Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {}
                Err(error) => return Err(error),
            }
        }
        let root = open_dir(root)?;
        let publisher = open_child_dir(&root, publisher_dir, create)?;
        let pack = open_child_dir(&publisher, pack_dir, create)?;
        Ok((root, publisher, pack))
    }

    fn open_dir(path: &Path) -> io::Result<OwnedFd> {
        let descriptor = open(
            path,
            OFlags::RDONLY | OFlags::DIRECTORY | OFlags::NOFOLLOW | OFlags::CLOEXEC,
            Mode::empty(),
        )?;
        fchmod(&descriptor, DIR_MODE)?;
        Ok(descriptor)
    }

    fn open_child_dir(parent: &OwnedFd, name: &str, create: bool) -> io::Result<OwnedFd> {
        if create {
            match mkdirat(parent, name, DIR_MODE) {
                Ok(()) | Err(Errno::EXIST) => {}
                Err(error) => return Err(error.into()),
            }
        }
        let descriptor = openat(
            parent,
            name,
            OFlags::RDONLY | OFlags::DIRECTORY | OFlags::NOFOLLOW | OFlags::CLOEXEC,
            Mode::empty(),
        )?;
        fchmod(&descriptor, DIR_MODE)?;
        Ok(descriptor)
    }

    fn read_from(directory: &OwnedFd, file_name: &str) -> io::Result<Vec<u8>> {
        let descriptor = openat(
            directory,
            file_name,
            OFlags::RDONLY | OFlags::NONBLOCK | OFlags::NOFOLLOW | OFlags::CLOEXEC,
            Mode::empty(),
        )?;
        let mut file = File::from(descriptor);
        let metadata = file.metadata()?;
        if !metadata.is_file() || metadata.len() > MAX_SIGNED_PACK_BYTES as u64 {
            return Err(io::Error::other("pack artifact is invalid"));
        }
        let mut bytes = Vec::with_capacity(metadata.len() as usize);
        Read::by_ref(&mut file)
            .take(MAX_SIGNED_PACK_BYTES as u64 + 1)
            .read_to_end(&mut bytes)?;
        if bytes.len() > MAX_SIGNED_PACK_BYTES {
            return Err(io::Error::other("pack artifact is too large"));
        }
        Ok(bytes)
    }
}

#[cfg(windows)]
mod platform {
    use std::{
        fs::{File, OpenOptions},
        io::{self, Read, Write},
        os::windows::fs::{MetadataExt, OpenOptionsExt},
        path::{Path, PathBuf},
    };

    use jobsentinel_domain::v3_signed_packs::MAX_SIGNED_PACK_BYTES;

    const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x0000_0400;
    const FILE_FLAG_BACKUP_SEMANTICS: u32 = 0x0200_0000;
    const FILE_FLAG_OPEN_REPARSE_POINT: u32 = 0x0020_0000;
    const FILE_SHARE_READ: u32 = 0x0000_0001;
    const FILE_SHARE_WRITE: u32 = 0x0000_0002;

    pub(super) fn persist(
        root: &Path,
        publisher_dir: &str,
        pack_dir: &str,
        file_name: &str,
        bytes: &[u8],
    ) -> io::Result<()> {
        let (_locks, directory) = lock_tree(root, publisher_dir, pack_dir, true)?;
        let path = directory.join(file_name);
        let mut temporary = tempfile::NamedTempFile::new_in(&directory)?;
        temporary.write_all(bytes)?;
        temporary.as_file().sync_all()?;
        match temporary.into_temp_path().persist_noclobber(&path) {
            Ok(_) => {}
            Err(error) if error.error.kind() == io::ErrorKind::AlreadyExists => {
                if read_file(&path)? != bytes {
                    return Err(io::Error::other("pack artifact already differs"));
                }
            }
            Err(error) => return Err(error.error),
        }
        jobsentinel_platform::ensure_private_file(&path)?;
        if read_file(&path)? != bytes {
            return Err(io::Error::other("pack artifact verification failed"));
        }
        Ok(())
    }

    pub(super) fn read(
        root: &Path,
        publisher_dir: &str,
        pack_dir: &str,
        file_name: &str,
    ) -> io::Result<Vec<u8>> {
        let (_locks, directory) = lock_tree(root, publisher_dir, pack_dir, false)?;
        read_file(&directory.join(file_name))
    }

    pub(super) fn remove(
        root: &Path,
        publisher_dir: &str,
        pack_dir: &str,
        file_name: &str,
    ) -> io::Result<()> {
        let (_locks, directory) = lock_tree(root, publisher_dir, pack_dir, false)?;
        let path = directory.join(file_name);
        match std::fs::symlink_metadata(&path) {
            Ok(metadata) if metadata.is_file() && !is_reparse(&metadata) => {
                std::fs::remove_file(path)
            }
            Ok(_) => Err(io::Error::other("pack artifact is invalid")),
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(error),
        }
    }

    fn lock_tree(
        root: &Path,
        publisher_dir: &str,
        pack_dir: &str,
        create: bool,
    ) -> io::Result<(Vec<File>, PathBuf)> {
        let mut locks = Vec::with_capacity(3);
        let mut current = root.to_path_buf();
        for component in [None, Some(publisher_dir), Some(pack_dir)] {
            if let Some(component) = component {
                current.push(component);
            }
            if create {
                match std::fs::create_dir(&current) {
                    Ok(()) => {}
                    Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {}
                    Err(error) => return Err(error),
                }
            }
            locks.push(lock_dir(&current)?);
            jobsentinel_platform::ensure_private_dir(&current)?;
        }
        Ok((locks, current))
    }

    fn lock_dir(path: &Path) -> io::Result<File> {
        let mut options = OpenOptions::new();
        options
            .read(true)
            .share_mode(FILE_SHARE_READ | FILE_SHARE_WRITE)
            .custom_flags(FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT);
        let directory = options.open(path)?;
        let metadata = directory.metadata()?;
        if !metadata.is_dir() || is_reparse(&metadata) {
            return Err(io::Error::other("pack artifact directory is invalid"));
        }
        Ok(directory)
    }

    fn read_file(path: &Path) -> io::Result<Vec<u8>> {
        let mut options = OpenOptions::new();
        options
            .read(true)
            .custom_flags(FILE_FLAG_OPEN_REPARSE_POINT);
        let mut file = options.open(path)?;
        let metadata = file.metadata()?;
        if !metadata.is_file()
            || is_reparse(&metadata)
            || metadata.len() > MAX_SIGNED_PACK_BYTES as u64
        {
            return Err(io::Error::other("pack artifact is invalid"));
        }
        let mut bytes = Vec::with_capacity(metadata.len() as usize);
        Read::by_ref(&mut file)
            .take(MAX_SIGNED_PACK_BYTES as u64 + 1)
            .read_to_end(&mut bytes)?;
        if bytes.len() > MAX_SIGNED_PACK_BYTES {
            return Err(io::Error::other("pack artifact is too large"));
        }
        Ok(bytes)
    }

    fn is_reparse(metadata: &std::fs::Metadata) -> bool {
        metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0
    }
}

pub(super) fn persist(
    root: &Path,
    publisher_dir: &str,
    pack_dir: &str,
    file_name: &str,
    bytes: &[u8],
) -> io::Result<()> {
    platform::persist(root, publisher_dir, pack_dir, file_name, bytes)
}

pub(super) fn read(
    root: &Path,
    publisher_dir: &str,
    pack_dir: &str,
    file_name: &str,
) -> io::Result<Vec<u8>> {
    platform::read(root, publisher_dir, pack_dir, file_name)
}

pub(super) fn remove(
    root: &Path,
    publisher_dir: &str,
    pack_dir: &str,
    file_name: &str,
) -> io::Result<()> {
    platform::remove(root, publisher_dir, pack_dir, file_name)
}
