use std::sync::Arc;

use async_trait::async_trait;
use jobsentinel_assistance::{
    confirm_pending_bookmarklet_imports, BookmarkletImportConfirmResult, BookmarkletRepository,
    PendingBookmarkletImports,
};
use jobsentinel_domain::Job;
use jobsentinel_storage::Database;

struct StorageBookmarkletRepository {
    database: Arc<Database>,
}

#[async_trait]
impl BookmarkletRepository for StorageBookmarkletRepository {
    async fn job_exists_by_hash(&self, hash: &str) -> Result<bool, String> {
        self.database
            .job_exists_by_hash(hash)
            .await
            .map_err(|error| error.to_string())
    }

    async fn upsert_job(&self, job: &Job) -> Result<i64, String> {
        self.database
            .upsert_job(job)
            .await
            .map_err(|error| error.to_string())
    }
}

pub fn bookmarklet_repository(database: Arc<Database>) -> Arc<dyn BookmarkletRepository> {
    Arc::new(StorageBookmarkletRepository { database })
}

pub async fn confirm_bookmarklet_imports(
    database: Arc<Database>,
    pending_imports: &PendingBookmarkletImports,
    ids: &[String],
) -> Result<BookmarkletImportConfirmResult, String> {
    let repository = StorageBookmarkletRepository { database };
    confirm_pending_bookmarklet_imports(&repository, pending_imports, ids).await
}
