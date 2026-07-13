use serde::{Deserialize, Serialize};

/// Retry attempt counter
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct RetryAttempt(pub i32);

impl RetryAttempt {
    #[inline]
    pub fn new(attempt: i32) -> Self {
        Self(attempt)
    }

    #[inline]
    pub fn value(&self) -> i32 {
        self.0
    }

    #[inline]
    pub fn increment(&mut self) {
        self.0 += 1;
    }
}

impl From<i32> for RetryAttempt {
    #[inline]
    fn from(attempt: i32) -> Self {
        Self(attempt)
    }
}

impl From<RetryAttempt> for i32 {
    #[inline]
    fn from(attempt: RetryAttempt) -> Self {
        attempt.0
    }
}
