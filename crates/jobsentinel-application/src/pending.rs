use std::sync::{Arc, RwLock};

use chrono::{DateTime, Duration, Utc};
use uuid::Uuid;

use jobsentinel_domain::Job;

const MAX_PENDING_URL_IMPORTS: usize = 20;
const PENDING_URL_IMPORT_LIFETIME: Duration = Duration::minutes(30);

#[derive(Clone, Default)]
pub struct PendingUrlImports {
    entries: Arc<RwLock<Vec<PendingUrlImport>>>,
}

#[derive(Clone)]
struct PendingUrlImport {
    id: String,
    created_at: DateTime<Utc>,
    job: Job,
}

impl PendingUrlImports {
    pub(super) fn queue(&self, job: Job, now: DateTime<Utc>) -> String {
        let mut entries = self.write_entries();
        retain_current(&mut entries, now);
        entries.retain(|entry| entry.job.hash != job.hash);
        while entries.len() >= MAX_PENDING_URL_IMPORTS {
            entries.remove(0);
        }

        let id = Uuid::new_v4().to_string();
        entries.push(PendingUrlImport {
            id: id.clone(),
            created_at: now,
            job,
        });
        id
    }

    pub(super) fn find(&self, id: &str, now: DateTime<Utc>) -> Option<Job> {
        let mut entries = self.write_entries();
        retain_current(&mut entries, now);
        entries
            .iter()
            .find(|entry| entry.id == id)
            .map(|entry| entry.job.clone())
    }

    pub(super) fn remove(&self, id: &str) {
        self.write_entries().retain(|entry| entry.id != id);
    }

    fn write_entries(&self) -> std::sync::RwLockWriteGuard<'_, Vec<PendingUrlImport>> {
        match self.entries.write() {
            Ok(entries) => entries,
            Err(poisoned) => poisoned.into_inner(),
        }
    }
}

fn retain_current(entries: &mut Vec<PendingUrlImport>, now: DateTime<Utc>) {
    entries.retain(|entry| now - entry.created_at < PENDING_URL_IMPORT_LIFETIME);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn job(hash: &str) -> Job {
        let now = Utc::now();
        Job {
            id: 0,
            hash: hash.to_string(),
            title: "Office Manager".to_string(),
            company: "Example Services".to_string(),
            url: "https://example.com/jobs/office-manager".to_string(),
            location: None,
            description: None,
            score: None,
            score_reasons: None,
            source: "import".to_string(),
            remote: Some(false),
            salary_min: None,
            salary_max: None,
            currency: None,
            created_at: now,
            updated_at: now,
            last_seen: now,
            times_seen: 1,
            immediate_alert_sent: false,
            included_in_digest: false,
            hidden: false,
            bookmarked: false,
            notes: None,
            ghost_score: None,
            ghost_reasons: None,
            first_seen: Some(now),
            repost_count: 0,
        }
    }

    #[test]
    fn queue_replaces_the_same_job_and_expires_old_entries() {
        let pending = PendingUrlImports::default();
        let now = Utc::now();
        let first_id = pending.queue(job("same"), now);
        let replacement_id = pending.queue(job("same"), now + Duration::minutes(1));

        assert!(pending
            .find(&first_id, now + Duration::minutes(1))
            .is_none());
        assert!(pending
            .find(&replacement_id, now + Duration::minutes(31))
            .is_none());
    }
}
