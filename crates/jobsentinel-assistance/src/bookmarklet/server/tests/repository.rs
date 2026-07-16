use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use jobsentinel_domain::Job;

use super::super::BookmarkletRepository;

#[derive(Default)]
pub(super) struct TestBookmarkletRepository {
    jobs: Mutex<Vec<Job>>,
}

#[async_trait]
impl BookmarkletRepository for TestBookmarkletRepository {
    async fn job_exists_by_hash(&self, hash: &str) -> Result<bool, String> {
        Ok(self.jobs().iter().any(|job| job.hash == hash))
    }

    async fn upsert_job(&self, job: &Job) -> Result<i64, String> {
        let mut jobs = self.jobs.lock().unwrap_or_else(|error| error.into_inner());
        if let Some(existing) = jobs.iter().position(|stored| stored.hash == job.hash) {
            jobs[existing] = job.clone();
            return Ok(i64::try_from(existing + 1).unwrap_or(i64::MAX));
        }
        jobs.push(job.clone());
        Ok(i64::try_from(jobs.len()).unwrap_or(i64::MAX))
    }
}

impl TestBookmarkletRepository {
    pub(super) fn jobs(&self) -> Vec<Job> {
        self.jobs
            .lock()
            .unwrap_or_else(|error| error.into_inner())
            .clone()
    }
}

pub(super) async fn bookmarklet_test_database() -> Arc<TestBookmarkletRepository> {
    Arc::new(TestBookmarkletRepository::default())
}

pub(super) async fn stored_job_count(database: &TestBookmarkletRepository) -> usize {
    database.jobs().len()
}
