//! Serializes model ownership and retains bounded, request-scoped cancellation before admission.

use crate::application::resume::InferenceCancellation;
use std::{
    collections::{HashSet, VecDeque},
    sync::{LazyLock, Mutex, MutexGuard, PoisonError},
};
use tokio::sync::watch;

const MAX_REQUEST_HISTORY: usize = 128;

enum ActiveModelLifecycle {
    Inference {
        request_id: Option<String>,
        cancellation: InferenceCancellation,
    },
    Download(watch::Sender<bool>),
    Exclusive,
}

#[derive(Default)]
struct ModelLifecycle {
    active: Option<ActiveModelLifecycle>,
    pending_cancellations: HashSet<String>,
    completed: VecDeque<String>,
    overflowed: bool,
}

static MODEL_LIFECYCLE: LazyLock<Mutex<ModelLifecycle>> =
    LazyLock::new(|| Mutex::new(ModelLifecycle::default()));

pub(crate) struct ModelLifecycleReservation;
impl Drop for ModelLifecycleReservation {
    fn drop(&mut self) {
        let mut state = slot();
        if let Some(ActiveModelLifecycle::Inference {
            request_id: Some(id),
            ..
        }) = state.active.take()
        {
            state.complete(id);
        }
    }
}

fn slot() -> MutexGuard<'static, ModelLifecycle> {
    MODEL_LIFECYCLE
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
}

pub(crate) fn reserve_model_lifecycle(
    cancellation: Option<watch::Sender<bool>>,
) -> Result<ModelLifecycleReservation, String> {
    let mut state = slot();
    if state.active.is_some() {
        return Err("Another local model action is already running.".into());
    }
    state.active = Some(cancellation.map_or(
        ActiveModelLifecycle::Exclusive,
        ActiveModelLifecycle::Download,
    ));
    Ok(ModelLifecycleReservation)
}

pub(crate) struct InferenceRequest(pub(crate) InferenceCancellation);
impl Drop for InferenceRequest {
    fn drop(&mut self) {
        self.0.cancel();
    }
}

pub(crate) fn reserve_inference(
    request_id: Option<String>,
    cancellation: InferenceCancellation,
) -> Result<ModelLifecycleReservation, String> {
    let request_id = request_id
        .as_deref()
        .map(canonical_request_id)
        .transpose()?;
    let mut state = slot();
    if let Some(id) = &request_id {
        if state.pending_cancellations.remove(id) || state.completed.contains(id) {
            cancellation.cancel();
        }
    }
    // Never evict an unconsumed cancellation and accidentally run its delayed request.
    if state.overflowed {
        cancellation.cancel();
    }
    if state.active.is_some() {
        if let Some(id) = request_id {
            state.complete(id);
        }
        return Err("Another local model action is already running.".into());
    }
    state.active = Some(ActiveModelLifecycle::Inference {
        request_id,
        cancellation,
    });
    Ok(ModelLifecycleReservation)
}

fn canonical_request_id(id: &str) -> Result<String, String> {
    if id.len() != 36 {
        return Err("Invalid review request ID.".into());
    }
    let canonical = uuid::Uuid::parse_str(id)
        .map_err(|_| "Invalid review request ID.".to_string())?
        .to_string();
    if canonical != id {
        return Err("Invalid review request ID.".into());
    }
    // Retain a fresh fixed-length value, not an overallocated caller buffer.
    Ok(canonical)
}

pub(super) fn cancel_review(request_id: String) -> Result<bool, String> {
    let request_id = canonical_request_id(&request_id)?;
    slot().cancel_review(request_id)
}

impl ModelLifecycle {
    fn complete(&mut self, id: String) {
        if self.completed.len() == MAX_REQUEST_HISTORY {
            self.completed.pop_front();
        }
        self.completed.push_back(id);
    }

    fn cancel_review(&mut self, request_id: String) -> Result<bool, String> {
        if let Some(ActiveModelLifecycle::Inference {
            request_id: Some(active),
            cancellation,
        }) = &self.active
        {
            if active == &request_id {
                cancellation.cancel();
                return Ok(true);
            }
        }
        if self.completed.contains(&request_id) {
            return Ok(false);
        }
        if self.pending_cancellations.contains(&request_id) {
            return Ok(true);
        }
        if self.pending_cancellations.len() == MAX_REQUEST_HISTORY {
            self.overflowed = true;
            return Err(
                "Review cancellation capacity reached. Restart before another local review.".into(),
            );
        }
        self.pending_cancellations.insert(request_id);
        Ok(true)
    }
}

pub(crate) fn cancel_active_model_work() {
    match slot().active.as_ref() {
        Some(ActiveModelLifecycle::Download(cancellation)) => {
            cancellation.send_replace(true);
        }
        Some(ActiveModelLifecycle::Inference { cancellation, .. }) => cancellation.cancel(),
        _ => {}
    }
}

pub(super) fn cancel_download() -> bool {
    matches!(slot().active.as_ref(), Some(ActiveModelLifecycle::Download(cancellation)) if cancellation.send(true).is_ok())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn cancellation_overflow_fails_closed_without_evicting_requests() {
        let mut state = ModelLifecycle::default();
        for _ in 0..MAX_REQUEST_HISTORY {
            assert!(state
                .cancel_review(uuid::Uuid::new_v4().to_string())
                .unwrap());
        }
        assert!(state
            .cancel_review(uuid::Uuid::new_v4().to_string())
            .is_err());
        assert!(state.overflowed);
        assert_eq!(state.pending_cancellations.len(), MAX_REQUEST_HISTORY);
    }

    #[tokio::test]
    async fn invalid_request_ids_never_enter_lifecycle_state() {
        let _serial = super::super::MODEL_TEST_LOCK.lock().await;
        let before = {
            let state = slot();
            assert!(state.active.is_none());
            (
                state.pending_cancellations.clone(),
                state.completed.clone(),
                state.overflowed,
            )
        };
        for id in [
            "x".repeat(1024 * 1024),
            "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA".into(),
            "aaaaaaaaaaaa4aaa8aaaaaaaaaaaaaaa".into(),
        ] {
            let cancellation = InferenceCancellation::default();
            assert!(reserve_inference(Some(id.clone()), cancellation.clone()).is_err());
            assert!(cancellation.check().is_ok());
            assert!(cancel_review(id).is_err());
        }
        let state = slot();
        assert!(state.active.is_none());
        assert_eq!(state.pending_cancellations, before.0);
        assert_eq!(state.completed, before.1);
        assert_eq!(state.overflowed, before.2);
    }

    #[tokio::test]
    async fn shutdown_signals_models_without_releasing_work_ownership() {
        let _serial = super::super::MODEL_TEST_LOCK.lock().await;
        let admission =
            std::sync::Arc::new(crate::bootstrap::operation::OperationAdmission::default());
        let lease = admission.admit().unwrap();
        let inference = InferenceCancellation::default();
        let reservation = reserve_inference(None, inference.clone()).unwrap();
        cancel_active_model_work();
        assert!(inference.check().is_err());
        assert!(reserve_model_lifecycle(None).is_err());
        drop(reservation);
        let (cancel, receiver) = watch::channel(false);
        let download = reserve_model_lifecycle(Some(cancel)).unwrap();
        cancel_active_model_work();
        assert!(*receiver.borrow());
        assert!(reserve_model_lifecycle(None).is_err());
        let mut drain = std::pin::pin!(admission.close_and_wait());
        assert!(
            tokio::time::timeout(std::time::Duration::from_millis(10), &mut drain)
                .await
                .is_err()
        );
        drop(download);
        drop(lease);
        drain.await.unwrap();
        assert!(reserve_model_lifecycle(None).is_ok());
    }
}
