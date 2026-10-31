//! Windows Hello consent for explicit actions; consent does not protect stored keys.

/// Native verification failures contain no OS diagnostics or credential material.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NativeUserPresenceError {
    Canceled,
    Unavailable,
    Failed,
}

impl std::fmt::Display for NativeUserPresenceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::Canceled => "Device verification was canceled.",
            Self::Unavailable => "Device verification is unavailable on this device.",
            Self::Failed => "Device verification failed.",
        })
    }
}

impl std::error::Error for NativeUserPresenceError {}

/// Verify an explicit action using the backend-owned application HWND.
///
/// This is application-enforced consent, not cryptographic protection of a key.
/// Dropping the future does not dismiss an active OS dialog; its eventual result
/// has no side effects. The caller must authorize the action only after success.
/// Portable profiles never invoke the host verifier.
pub async fn verify_windows_user_presence(hwnd: isize) -> Result<(), NativeUserPresenceError> {
    if crate::portable_root().is_some() || hwnd == 0 {
        return Err(NativeUserPresenceError::Unavailable);
    }
    #[cfg(windows)]
    {
        tokio::task::spawn_blocking(move || windows::verify(hwnd))
            .await
            .map_err(|_| NativeUserPresenceError::Failed)?
    }
    #[cfg(not(windows))]
    Err(NativeUserPresenceError::Unavailable)
}

#[cfg(any(windows, test))]
fn verification_result(result: i32) -> Result<(), NativeUserPresenceError> {
    match result {
        0 => Ok(()),
        1..=4 => Err(NativeUserPresenceError::Unavailable),
        6 => Err(NativeUserPresenceError::Canceled),
        _ => Err(NativeUserPresenceError::Failed),
    }
}

#[cfg(any(windows, test))]
fn verification_error(code: i32) -> NativeUserPresenceError {
    match code as u32 {
        0x8007_04c7 | 0x8000_4004 => NativeUserPresenceError::Canceled,
        _ => NativeUserPresenceError::Unavailable,
    }
}

#[cfg(windows)]
mod windows {
    #![allow(unsafe_code)]

    use ::windows::core::{self, HSTRING};
    use ::windows::Security::Credentials::UI::{
        UserConsentVerificationResult, UserConsentVerifier,
    };
    use ::windows::Win32::Foundation::HWND;
    use ::windows::Win32::System::Threading::GetCurrentProcessId;
    use ::windows::Win32::System::WinRT::{
        IUserConsentVerifierInterop, RoInitialize, RoUninitialize, RO_INIT_MULTITHREADED,
    };
    use ::windows::Win32::UI::WindowsAndMessaging::GetWindowThreadProcessId;
    use windows_future::IAsyncOperation;

    use super::{verification_error, verification_result, NativeUserPresenceError};

    struct Apartment;

    impl Drop for Apartment {
        fn drop(&mut self) {
            // SAFETY: Created only after successful RoInitialize; dropped on the
            // same blocking thread after all apartment-owned objects are dropped.
            unsafe { RoUninitialize() };
        }
    }

    pub(super) fn verify(hwnd: isize) -> Result<(), NativeUserPresenceError> {
        let hwnd = HWND(hwnd as *mut std::ffi::c_void);
        let mut process_id = 0;
        // SAFETY: Windows validates the opaque handle; the output pointer is live.
        let thread_id = unsafe { GetWindowThreadProcessId(hwnd, Some(&raw mut process_id)) };
        // SAFETY: This function has no pointer or initialization preconditions.
        if thread_id == 0 || process_id != unsafe { GetCurrentProcessId() } {
            return Err(NativeUserPresenceError::Unavailable);
        }
        // SAFETY: All WinRT work stays on this blocking thread. Successful calls,
        // including S_FALSE, are balanced by Apartment; a changed mode fails closed.
        unsafe { RoInitialize(RO_INIT_MULTITHREADED) }
            .map_err(|_| NativeUserPresenceError::Unavailable)?;
        let _apartment = Apartment;
        let interop = core::factory::<UserConsentVerifier, IUserConsentVerifierInterop>()
            .map_err(|_| NativeUserPresenceError::Unavailable)?;
        let message = HSTRING::from("Unlock saved JobSentinel details");
        // SAFETY: The HWND belongs to this process, the message lives through the
        // call, and the projection supplies the exact typed async-operation IID.
        let operation: IAsyncOperation<UserConsentVerificationResult> =
            unsafe { interop.RequestVerificationForWindowAsync(hwnd, &message) }
                .map_err(native_error)?;
        let result = operation.join().map_err(native_error)?;
        verification_result(result.0)
    }

    fn native_error(error: core::Error) -> NativeUserPresenceError {
        verification_error(error.code().0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_verified_consent_grants_access() {
        assert_eq!(verification_result(0), Ok(()));
        for result in [1, 2, 3, 4] {
            assert_eq!(
                verification_result(result),
                Err(NativeUserPresenceError::Unavailable)
            );
        }
        assert_eq!(verification_result(5), Err(NativeUserPresenceError::Failed));
        assert_eq!(
            verification_result(6),
            Err(NativeUserPresenceError::Canceled)
        );
        for result in [-1, 7, i32::MAX] {
            assert_eq!(
                verification_result(result),
                Err(NativeUserPresenceError::Failed)
            );
        }
    }

    #[test]
    fn canceled_native_operations_remain_canceled() {
        for code in [0x8007_04c7_u32, 0x8000_4004] {
            assert_eq!(
                verification_error(code as i32),
                NativeUserPresenceError::Canceled
            );
        }
        assert_eq!(verification_error(-1), NativeUserPresenceError::Unavailable);
    }

    #[tokio::test]
    async fn missing_window_never_prompts() {
        assert_eq!(
            verify_windows_user_presence(0).await,
            Err(NativeUserPresenceError::Unavailable)
        );
    }
}
