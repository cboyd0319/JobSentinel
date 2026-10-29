//! Retains native command admission through async completion and blocks new work during updates.

use std::{
    ops::Deref,
    sync::{Arc, Mutex},
};
use tauri::{
    ipc::{CommandArg, CommandItem, InvokeError},
    Runtime,
};
use tokio::sync::Notify;

#[derive(Default)]
pub(crate) struct OperationAdmission {
    state: Mutex<Admission>,
    idle: Notify,
}

#[derive(Default)]
struct Admission {
    closed: bool,
    active: usize,
    shutdown: bool,
    privacy_locked: bool,
    privacy_generation: u64,
}

pub(crate) struct OperationLease(Arc<OperationAdmission>);
impl Drop for OperationLease {
    fn drop(&mut self) {
        let mut state = self.0.state.lock().unwrap_or_else(|p| p.into_inner());
        state.active -= 1;
        if state.active == 0 {
            self.0.idle.notify_waiters();
        }
    }
}

impl OperationAdmission {
    pub(crate) fn with_privacy_lock(locked: bool) -> Self {
        Self {
            state: Mutex::new(Admission {
                privacy_locked: locked,
                ..Admission::default()
            }),
            idle: Notify::new(),
        }
    }

    pub(crate) fn privacy_locked(&self) -> bool {
        self.state.lock().map_or(true, |state| state.privacy_locked)
    }

    pub(crate) fn lock_privacy(&self) -> Result<(), String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "Native operation admission is unavailable.")?;
        state.privacy_locked = true;
        state.privacy_generation = state.privacy_generation.wrapping_add(1);
        Ok(())
    }

    pub(crate) fn privacy_generation(&self) -> Result<u64, String> {
        self.state
            .lock()
            .map(|state| state.privacy_generation)
            .map_err(|_| "Native operation admission is unavailable.".into())
    }

    pub(crate) fn unlock_privacy(&self, generation: u64) -> Result<(), String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "Native operation admission is unavailable.")?;
        if state.privacy_generation != generation || state.closed {
            return Err("The session changed. Unlock JobSentinel again.".into());
        }
        state.privacy_locked = false;
        Ok(())
    }

    pub(crate) fn admit(self: &Arc<Self>) -> Result<Arc<OperationLease>, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "Native operation admission is unavailable.")?;
        if state.privacy_locked {
            return Err("JobSentinel is locked. Unlock it to continue.".into());
        }
        if state.closed {
            return Err(
                "Local update preparation is active. Restart JobSentinel to continue.".into(),
            );
        }
        state.active += 1;
        Ok(Arc::new(OperationLease(self.clone())))
    }

    pub(crate) fn closed(&self) -> bool {
        self.state.lock().map_or(true, |state| state.closed)
    }

    pub(crate) async fn close_and_wait(&self) -> Result<(), String> {
        {
            let mut state = self
                .state
                .lock()
                .map_err(|_| "Native operation admission is unavailable.")?;
            state.closed = true;
        }
        self.wait_for_idle().await
    }

    pub(crate) async fn wait_for_idle(&self) -> Result<(), String> {
        loop {
            let idle = self.idle.notified();
            tokio::pin!(idle);
            idle.as_mut().enable();
            if self
                .state
                .lock()
                .map_err(|_| "Native operation admission is unavailable.")?
                .active
                == 0
            {
                return Ok(());
            }
            idle.await;
        }
    }

    pub(crate) fn begin_shutdown(&self) -> Result<(), String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "Native operation admission is unavailable.")?;
        state.closed = true;
        state.shutdown = true;
        Ok(())
    }

    pub(crate) fn reopen(&self) {
        if let Ok(mut state) = self.state.lock() {
            if !state.shutdown {
                state.closed = false;
            }
        }
    }
}

pub(crate) type AdmissionState<'r> = State<'r, Arc<OperationAdmission>>;

pub(crate) struct State<'r, T: Send + Sync + 'static> {
    value: tauri::State<'r, T>,
    lease: Arc<OperationLease>,
}

impl<'r, T: Send + Sync + 'static> State<'r, T> {
    pub(crate) fn admit(
        value: tauri::State<'r, T>,
        admission: &Arc<OperationAdmission>,
    ) -> Result<Self, String> {
        Ok(Self {
            value,
            lease: admission.admit()?,
        })
    }
    pub(crate) fn inner(&self) -> &'r T {
        self.value.inner()
    }
    pub(crate) fn lease(&self) -> Arc<OperationLease> {
        self.lease.clone()
    }
}
impl<T: Send + Sync + 'static> Clone for State<'_, T> {
    fn clone(&self) -> Self {
        Self {
            value: self.value.clone(),
            lease: self.lease.clone(),
        }
    }
}
impl<T: Send + Sync + 'static> Deref for State<'_, T> {
    type Target = T;
    fn deref(&self) -> &T {
        self.value.inner()
    }
}
impl<'r, 'de: 'r, T: Send + Sync + 'static, R: Runtime> CommandArg<'de, R> for State<'r, T> {
    fn from_command(command: CommandItem<'de, R>) -> Result<Self, InvokeError> {
        let admission = command
            .message
            .state_ref()
            .try_get::<Arc<OperationAdmission>>()
            .ok_or_else(|| InvokeError::from("Native operation admission is unavailable."))?;
        let lease = admission.admit().map_err(InvokeError::from)?;
        let value = tauri::State::from_command(command)?;
        Ok(Self { value, lease })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn privacy_lock_blocks_admission_and_update_reopen_cannot_unlock_it() {
        let admission = Arc::new(OperationAdmission::with_privacy_lock(true));
        assert!(admission.admit().is_err());
        admission.reopen();
        assert!(admission.privacy_locked());
        let generation = admission.privacy_generation().unwrap();
        admission.unlock_privacy(generation).unwrap();
        assert!(admission.admit().is_ok());
        admission.lock_privacy().unwrap();
        assert!(admission.unlock_privacy(generation).is_err());
        assert!(admission.privacy_locked());
        assert!(admission.admit().is_err());
    }

    #[test]
    fn privacy_authentication_cannot_reopen_an_update_or_shutdown() {
        let admission = OperationAdmission::with_privacy_lock(true);
        let generation = admission.privacy_generation().unwrap();
        admission.begin_shutdown().unwrap();
        assert!(admission.unlock_privacy(generation).is_err());
        assert!(admission.privacy_locked());
    }

    #[tokio::test]
    async fn admission_waits_for_last_worker_lease_and_rejects_new_work() {
        let admission = Arc::new(OperationAdmission::default());
        let command = admission.admit().unwrap();
        let worker = command.clone();
        drop(command);
        let closing = admission.clone();
        let wait = tokio::spawn(async move { closing.close_and_wait().await });
        tokio::task::yield_now().await;
        assert!(admission.closed());
        assert!(admission.admit().is_err());
        assert!(!wait.is_finished());
        drop(worker);
        wait.await.unwrap().unwrap();
        admission.reopen();
        assert!(admission.admit().is_ok());
    }
    #[tokio::test]
    async fn repeated_close_waits_for_existing_leases() {
        let admission = Arc::new(OperationAdmission::default());
        let worker = admission.admit().unwrap();
        admission.begin_shutdown().unwrap();
        let gate = admission.clone();
        let wait = tokio::spawn(async move { gate.close_and_wait().await });
        tokio::task::yield_now().await;
        assert!(!wait.is_finished());
        drop(worker);
        wait.await.unwrap().unwrap();
        admission.reopen();
        assert!(admission.closed());
    }
}
