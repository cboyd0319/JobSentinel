//! Signals cooperative inference cancellation without releasing ownership of running work.

use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

#[derive(Clone, Default)]
pub struct InferenceCancellation(Arc<AtomicBool>);

impl InferenceCancellation {
    pub fn cancel(&self) {
        self.0.store(true, Ordering::Release);
    }

    pub fn check(&self) -> anyhow::Result<()> {
        if self.0.load(Ordering::Acquire) {
            return Err(InferenceCancelled.into());
        }
        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
#[error("local inference cancelled")]
pub struct InferenceCancelled;
