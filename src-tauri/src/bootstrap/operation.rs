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
    state: Mutex<(bool, usize, bool)>,
    idle: Notify,
}

pub(crate) struct OperationLease(Arc<OperationAdmission>);
impl Drop for OperationLease {
    fn drop(&mut self) {
        let mut state = self.0.state.lock().unwrap_or_else(|p| p.into_inner());
        state.1 -= 1;
        if state.1 == 0 {
            self.0.idle.notify_waiters();
        }
    }
}

impl OperationAdmission {
    pub(crate) fn admit(self: &Arc<Self>) -> Result<Arc<OperationLease>, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "Native operation admission is unavailable.")?;
        if state.0 {
            return Err(
                "Local update preparation is active. Restart JobSentinel to continue.".into(),
            );
        }
        state.1 += 1;
        Ok(Arc::new(OperationLease(self.clone())))
    }

    pub(crate) fn closed(&self) -> bool {
        self.state.lock().map_or(true, |state| state.0)
    }

    pub(crate) async fn close_and_wait(&self) -> Result<(), String> {
        {
            let mut state = self
                .state
                .lock()
                .map_err(|_| "Native operation admission is unavailable.")?;
            state.0 = true;
        }
        loop {
            let idle = self.idle.notified();
            tokio::pin!(idle);
            idle.as_mut().enable();
            if self
                .state
                .lock()
                .map_err(|_| "Native operation admission is unavailable.")?
                .1
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
        state.0 = true;
        state.2 = true;
        Ok(())
    }

    pub(crate) fn reopen(&self) {
        if let Ok(mut state) = self.state.lock() {
            if !state.2 {
                state.0 = false;
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
