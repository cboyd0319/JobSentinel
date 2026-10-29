//! Verifies isolated portable selection, private path refusal and contained recovery hardlinks.

use super::*;

fn root() -> (tempfile::TempDir, PathBuf) {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().canonicalize().unwrap();
    crate::ensure_private_dir(&path).unwrap();
    (directory, path)
}

#[test]
fn portable_arguments_require_one_separate_nonempty_directory() {
    let parse = |values: &[&str]| portable_root_from_args(values.iter().map(OsString::from));
    assert!(parse(&[]).unwrap().is_none());
    assert_eq!(
        parse(&["--portable", "/profile"]).unwrap(),
        Some(PathBuf::from("/profile"))
    );
    for args in [
        vec!["--portable"],
        vec!["--portable", ""],
        vec!["--portable=/profile"],
        vec!["--portable", "--other"],
        vec!["--portable", "/a", "--portable", "/b"],
    ] {
        assert!(parse(&args).is_err());
    }
    assert!(parse(&["--", "--portable", "/ignored"]).unwrap().is_none());
}

#[test]
fn portable_profile_prepares_only_owned_children_and_excludes_other_instances() {
    let (_directory, path) = root();
    let profile = PortableProfile::open(&path).unwrap();
    assert_eq!(
        fs::read(path.join(MARKER)).unwrap(),
        MARKER_CONTENT.as_bytes()
    );
    assert!(CHILDREN.iter().all(|child| path.join(child).is_dir()));
    assert!(PortableProfile::open(&path.join("data")).is_err());
    assert_eq!(
        PortableProfile::open(&path).err().unwrap().kind(),
        io::ErrorKind::WouldBlock
    );
    drop(profile);
    assert!(PortableProfile::open(&path).is_ok());
}

#[test]
fn portable_profile_refuses_missing_relative_unknown_and_future_roots() {
    let (_directory, path) = root();
    for rejected in [
        PathBuf::from("relative"),
        path.join("missing"),
        path.join(".."),
    ] {
        assert!(PortableProfile::open(&rejected).is_err());
    }
    fs::write(path.join("unrelated"), b"unchanged").unwrap();
    assert!(PortableProfile::open(&path).is_err());
    assert_eq!(fs::read(path.join("unrelated")).unwrap(), b"unchanged");
    assert!(!path.join(LOCK).exists());
    fs::remove_file(path.join("unrelated")).unwrap();
    for marker in ["jobsentinel.portable.v2\n", "malformed", ""] {
        fs::write(path.join(MARKER), marker).unwrap();
        crate::ensure_private_file(&path.join(MARKER)).unwrap();
        assert!(PortableProfile::open(&path).is_err());
        assert_eq!(fs::read_to_string(path.join(MARKER)).unwrap(), marker);
        assert!(!path.join(LOCK).exists());
    }
}

#[test]
fn portable_profile_recovers_interrupted_selection_and_moves_without_installed_state() {
    let (_directory, path) = root();
    fs::write(path.join(LOCK), b"").unwrap();
    crate::ensure_private_file(&path.join(LOCK)).unwrap();
    drop(PortableProfile::open(&path).unwrap());
    let (_destination, destination) = root();
    let moved = destination.join("moved");
    fs::rename(&path, &moved).unwrap();
    assert_eq!(PortableProfile::open(&moved).unwrap().root, moved);
}

#[cfg(unix)]
#[test]
fn portable_profile_rejects_symlinks_nonprivate_children_and_writable_parents() {
    use std::os::unix::fs::{symlink, PermissionsExt};
    let (_directory, path) = root();
    let (_external, external) = root();
    let link = path.join("link");
    symlink(&external, &link).unwrap();
    assert!(PortableProfile::open(&link).is_err());
    fs::remove_file(link).unwrap();
    drop(PortableProfile::open(&path).unwrap());
    symlink(&external, path.join("data").join("linked")).unwrap();
    assert!(PortableProfile::open(&path).is_err());
    fs::remove_file(path.join("data").join("linked")).unwrap();
    fs::set_permissions(path.join("data"), fs::Permissions::from_mode(0o755)).unwrap();
    assert!(PortableProfile::open(&path).is_err());
    fs::set_permissions(path.join("data"), fs::Permissions::from_mode(0o700)).unwrap();
    fs::set_permissions(&path, fs::Permissions::from_mode(0o777)).unwrap();
    assert!(PortableProfile::open(&path).is_err());
    fs::set_permissions(&path, fs::Permissions::from_mode(0o700)).unwrap();
}

#[cfg(unix)]
#[test]
fn portable_promoted_restore_accepts_only_fully_contained_hardlinks() {
    use std::os::unix::fs::MetadataExt;
    let (_directory, path) = root();
    drop(PortableProfile::open(&path).unwrap());
    let stage = path.join("data/jobs.db.restore-stage");
    let primary = path.join("data/jobs.db");
    crate::write_file_atomic_private(&stage, "synthetic promoted database").unwrap();
    fs::hard_link(&stage, &primary).unwrap();
    drop(PortableProfile::open(&path).unwrap());
    let (_external, external) = root();
    let escaped = external.join("linked.db");
    fs::hard_link(&primary, &escaped).unwrap();
    let before = (
        fs::read(&stage).unwrap(),
        fs::metadata(&stage).unwrap().mode(),
    );
    assert!(PortableProfile::open(&path).is_err());
    assert_eq!(
        before,
        (
            fs::read(&stage).unwrap(),
            fs::metadata(&stage).unwrap().mode()
        )
    );
    assert_eq!(fs::metadata(&stage).unwrap().nlink(), 3);
    fs::remove_file(escaped).unwrap();
    drop(PortableProfile::open(&path).unwrap());
}

#[tokio::test]
async fn selected_root_isolates_paths_and_memory_key() {
    const TEST_ROOT: &str = "JOBSENTINEL_TEST_PORTABLE_PROFILE";
    let Some(selected) = std::env::var_os(TEST_ROOT) else {
        let (_directory, path) = root();
        let status = std::process::Command::new(std::env::current_exe().unwrap())
            .args([
                "--exact",
                "portable::tests::selected_root_isolates_paths_and_memory_key",
                "--nocapture",
            ])
            .env(TEST_ROOT, path)
            .status()
            .unwrap();
        assert!(status.success());
        return;
    };
    let root = PathBuf::from(selected);
    assert!(
        set_portable_database_key(Zeroizing::new("synthetic portable passphrase".into())).is_err()
    );
    select_portable_root(&root).unwrap();
    assert!(select_portable_root(&root).is_err());
    assert_eq!(crate::get_data_dir(), root.join("data"));
    assert_eq!(crate::get_config_dir(), root.join("config"));
    assert_eq!(crate::get_cache_dir(), root.join("cache"));
    crate::initialize().unwrap();
    assert!(crate::load_or_create_database_key().await.is_err());
    assert!(set_portable_database_key(Zeroizing::new("short".into())).is_err());
    for _ in 0..2 {
        set_portable_database_key(Zeroizing::new("synthetic portable passphrase".into())).unwrap();
    }
    assert!(
        set_portable_database_key(Zeroizing::new("different portable passphrase".into())).is_err()
    );
    assert!(
        crate::load_or_create_database_key().await.unwrap().as_str()
            == "synthetic portable passphrase"
    );
}
