use super::*;
use futures_util::Stream;
use std::future::Future;
#[cfg(unix)]
use std::os::unix::fs::symlink;
use std::sync::atomic::{AtomicBool, Ordering};
use std::task::{Context, Poll};

struct ControlledStream {
    delivered: bool,
    dropped: Arc<AtomicBool>,
}

impl Stream for ControlledStream {
    type Item = std::io::Result<Vec<u8>>;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        _context: &mut Context<'_>,
    ) -> Poll<Option<Self::Item>> {
        if self.delivered {
            Poll::Pending
        } else {
            self.delivered = true;
            Poll::Ready(Some(Ok(b"partial".to_vec())))
        }
    }
}

impl Drop for ControlledStream {
    fn drop(&mut self) {
        self.dropped.store(true, Ordering::SeqCst);
    }
}

#[test]
fn dropping_staging_writer_cancels_its_source_stream() {
    let temp = tempfile::NamedTempFile::new().unwrap();
    let file = temp.reopen().unwrap();
    let dropped = Arc::new(AtomicBool::new(false));
    let stream = ControlledStream {
        delivered: false,
        dropped: Arc::clone(&dropped),
    };
    let mut write = Box::pin(write_download_stream(
        stream,
        file,
        temp.path(),
        7,
        0,
        7,
        None,
    ));
    let waker = futures_util::task::noop_waker();
    let mut context = Context::from_waker(&waker);

    assert!(write.as_mut().poll(&mut context).is_pending());
    drop(write);

    assert!(dropped.load(Ordering::SeqCst));
    assert_eq!(std::fs::read(temp.path()).unwrap(), b"partial");
}

#[tokio::test]
async fn staging_writer_rejects_before_writing_beyond_the_locked_size() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("model.partial");
    let file = File::create(&path).unwrap();
    let stream = futures_util::stream::iter([
        Ok::<_, std::io::Error>(b"first".to_vec()),
        Ok(b"overflow".to_vec()),
    ]);

    let result = write_download_stream(stream, file, &path, 5, 0, 5, None).await;

    assert!(result.is_err());
    assert!(!path.exists());
}

#[test]
fn staging_file_preserves_the_longest_safe_partial_for_resume() {
    let app_data_dir = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let mut spec = ModelManager::default_embedding_model_spec().unwrap();
    spec.files[0].size_bytes = Some(10);
    let paths = manager.staging_file_paths(&spec, &spec.files[0]).unwrap();
    std::fs::write(&paths[0], b"partial").unwrap();

    let (staged_path, staged_file, resume_bytes) =
        manager.prepare_staging_file(&spec, &spec.files[0]).unwrap();
    drop(staged_file);

    assert_eq!(resume_bytes, 7);
    assert_eq!(std::fs::read(staged_path).unwrap(), b"partial");
}

#[cfg(unix)]
#[test]
fn download_preparation_rejects_symlinked_cache_paths() {
    let app_data_dir = tempfile::tempdir().unwrap();
    let outside = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let spec = ModelManager::default_embedding_model_spec().unwrap();
    let cache_root = manager.model_cache_dir(&spec);
    std::fs::create_dir_all(cache_root.parent().unwrap()).unwrap();
    symlink(outside.path(), &cache_root).unwrap();

    assert!(manager.prepare_model_cache(&spec).is_err());
    assert!(std::fs::read_dir(outside.path()).unwrap().next().is_none());
}

#[cfg(unix)]
#[test]
fn download_preparation_rejects_symlinked_file_parents() {
    let app_data_dir = tempfile::tempdir().unwrap();
    let outside = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let mut spec = ModelManager::default_embedding_model_spec().unwrap();
    spec.files[0].path = "nested/config.json".to_string();
    let cache_root = manager.prepare_model_cache(&spec).unwrap();
    symlink(outside.path(), cache_root.join("nested")).unwrap();

    assert!(manager
        .prepare_model_file_path(&spec, &spec.files[0])
        .is_err());
    assert!(std::fs::read_dir(outside.path()).unwrap().next().is_none());
}

#[cfg(unix)]
#[test]
fn download_preparation_rejects_symlinked_destination_files() {
    let app_data_dir = tempfile::tempdir().unwrap();
    let outside = tempfile::NamedTempFile::new().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let spec = ModelManager::default_embedding_model_spec().unwrap();
    let cache_root = manager.prepare_model_cache(&spec).unwrap();
    symlink(outside.path(), cache_root.join(&spec.files[0].path)).unwrap();

    assert!(manager
        .prepare_model_file_path(&spec, &spec.files[0])
        .is_err());
}

#[cfg(unix)]
#[test]
fn download_preparation_rejects_symlinked_partial_files() {
    let app_data_dir = tempfile::tempdir().unwrap();
    let outside = tempfile::NamedTempFile::new().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let spec = ModelManager::default_embedding_model_spec().unwrap();
    let cache_root = manager.prepare_model_cache(&spec).unwrap();
    let staging_root = cache_root.join(".download");
    ensure_directory(&staging_root).unwrap();
    symlink(
        outside.path(),
        staging_root.join(format!("{}.partial", spec.files[0].path)),
    )
    .unwrap();

    assert!(manager.prepare_staging_file(&spec, &spec.files[0]).is_err());
}
