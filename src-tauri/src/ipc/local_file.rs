//! Opens regular local inputs once and bounds cancellable copies with failure cleanup.

use std::{
    fs::{File, OpenOptions},
    io::{self, Read, Write},
    path::{Path, PathBuf},
};

pub(crate) fn open_regular_source(path: &Path) -> io::Result<File> {
    let mut options = OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        options.custom_flags(0x0020_0000); // FILE_FLAG_OPEN_REPARSE_POINT
    }
    let file = options.open(path)?;
    let metadata = file.metadata()?;
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x0000_0400 != 0 {
            return Err(io::Error::other("Input must be a regular file"));
        }
    }
    if !metadata.is_file() {
        return Err(io::Error::other("Input must be a regular file"));
    }
    Ok(file)
}

#[derive(Debug)]
pub(crate) struct LocalFileCopy {
    pub(crate) path: PathBuf,
}
impl LocalFileCopy {
    pub(crate) fn keep(mut self) -> PathBuf {
        std::mem::take(&mut self.path)
    }
}
impl Drop for LocalFileCopy {
    fn drop(&mut self) {
        if !self.path.as_os_str().is_empty() {
            let _ = std::fs::remove_file(&self.path);
        }
    }
}

pub(crate) fn copy_bounded(
    source: &mut File,
    destination: PathBuf,
    limit: u64,
    current: impl Fn() -> bool,
) -> io::Result<LocalFileCopy> {
    if source.metadata()?.len() > limit {
        return Err(io::Error::new(
            io::ErrorKind::FileTooLarge,
            "Input exceeds byte limit",
        ));
    }
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let owned;
    {
        let mut output = options.open(&destination)?;
        owned = LocalFileCopy { path: destination };
        let mut total = 0_u64;
        let mut buffer = [0; 8192];
        loop {
            if !current() {
                return Err(io::Error::new(
                    io::ErrorKind::Interrupted,
                    "Import superseded",
                ));
            }
            let count = source.read(&mut buffer)?;
            if count == 0 {
                break;
            }
            total += count as u64;
            if total > limit {
                return Err(io::Error::new(
                    io::ErrorKind::FileTooLarge,
                    "Input exceeds byte limit",
                ));
            }
            output.write_all(&buffer[..count])?;
        }
        if !current() {
            return Err(io::Error::new(
                io::ErrorKind::Interrupted,
                "Import superseded",
            ));
        }
    }
    Ok(owned)
}

pub(crate) fn read_bounded_text(path: &Path, limit: u64) -> io::Result<String> {
    let file = open_regular_source(path)?;
    if file.metadata()?.len() > limit {
        return Err(io::Error::new(
            io::ErrorKind::FileTooLarge,
            "Input exceeds byte limit",
        ));
    }
    let mut bytes = Vec::new();
    file.take(limit + 1).read_to_end(&mut bytes)?;
    if bytes.len() as u64 > limit {
        return Err(io::Error::new(
            io::ErrorKind::FileTooLarge,
            "Input exceeds byte limit",
        ));
    }
    String::from_utf8(bytes).map_err(|_| io::Error::other("Input must be UTF-8"))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn copy_is_bounded_cancellable_and_removes_failed_output() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("source");
        std::fs::write(&path, vec![1; 20000]).unwrap();
        let destination = dir.path().join("copy");
        assert!(copy_bounded(
            &mut open_regular_source(&path).unwrap(),
            destination.clone(),
            10,
            || true
        )
        .is_err());
        let checks = std::cell::Cell::new(0);
        assert!(copy_bounded(
            &mut open_regular_source(&path).unwrap(),
            destination.clone(),
            30000,
            || {
                checks.set(checks.get() + 1);
                checks.get() < 2
            }
        )
        .is_err());
        assert!(!destination.exists());
    }
    #[test]
    fn growth_after_open_cannot_exceed_copy_limit_or_leave_partial_output() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("source");
        std::fs::write(&path, b"tiny").unwrap();
        let mut source = open_regular_source(&path).unwrap();
        let changed = std::cell::Cell::new(false);
        let destination = dir.path().join("copy");
        assert!(copy_bounded(&mut source, destination.clone(), 8192, || {
            if !changed.replace(true) {
                std::fs::write(&path, vec![1; 20000]).unwrap();
            }
            true
        })
        .is_err());
        assert!(!destination.exists());
        assert_eq!(std::fs::metadata(&path).unwrap().len(), 20000);
    }

    #[test]
    fn copy_accepts_exact_byte_boundary() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("source");
        std::fs::write(&path, b"data").unwrap();
        let destination = dir.path().join("copy");
        let copy = copy_bounded(
            &mut open_regular_source(&path).unwrap(),
            destination.clone(),
            4,
            || true,
        )
        .unwrap();
        assert_eq!(std::fs::read(&copy.path).unwrap(), b"data");
        drop(copy);
        assert!(!destination.exists());
    }

    #[test]
    fn text_read_enforces_bytes_and_utf8() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("resume.json");
        std::fs::write(&path, b"{}").unwrap();
        assert_eq!(read_bounded_text(&path, 2).unwrap(), "{}");
        assert!(read_bounded_text(&path, 1).is_err());
        std::fs::write(&path, [0xff]).unwrap();
        assert!(read_bounded_text(&path, 2).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn retained_source_ignores_path_replacement_and_fifo_never_blocks() {
        use std::os::unix::fs::symlink;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("source");
        std::fs::write(&path, b"original").unwrap();
        let mut source = open_regular_source(&path).unwrap();
        std::fs::rename(&path, dir.path().join("old")).unwrap();
        symlink("other", &path).unwrap();
        let copy = copy_bounded(&mut source, dir.path().join("copy"), 100, || true).unwrap();
        assert_eq!(std::fs::read(&copy.path).unwrap(), b"original");
        let fifo = dir.path().join("fifo");
        assert!(std::process::Command::new("mkfifo")
            .arg(&fifo)
            .status()
            .unwrap()
            .success());
        let (send, receive) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            send.send(open_regular_source(&fifo).is_err()).unwrap();
        });
        assert!(receive
            .recv_timeout(std::time::Duration::from_secs(1))
            .expect("FIFO open must not block"));
    }
}
