//! Verifies close handling and native authentication focus handoff without OS prompts.

use super::*;
use crate::bootstrap::operation::OperationAdmission;
use std::{cell::Cell, future::Future, sync::Arc, task::Poll};

#[test]
fn close_request_prevents_close_and_hides_main_window() {
    let prevented = Cell::new(false);
    let hidden = Cell::new(false);
    handle_close_request(
        "main",
        || prevented.set(true),
        || {
            hidden.set(true);
            Ok(())
        },
    );
    assert!(prevented.get());
    assert!(hidden.get());
}

#[test]
fn blur_rejects_active_passphrase_even_after_focus_returns() {
    let gate = Arc::new(OperationAdmission::with_privacy_lock(true));
    let generation = gate.authentication_generation().unwrap();
    record_authentication_focus(&gate, &WindowEvent::Focused(false), false).unwrap();
    record_authentication_focus(&gate, &WindowEvent::Focused(true), false).unwrap();
    assert!(gate.unlock_after_authentication(generation).is_err());
    assert!(gate.privacy_locked());
    assert!(gate.admit().is_err());
}

#[tokio::test]
async fn native_prompt_blur_waits_covered_until_focus_returns() {
    let gate = Arc::new(OperationAdmission::with_privacy_lock(true));
    let generation = gate.authentication_generation().unwrap();
    let _native = gate.native_authentication(generation).unwrap();
    record_authentication_focus(&gate, &WindowEvent::Focused(false), false).unwrap();
    record_authentication_focus(&gate, &WindowEvent::Focused(false), false).unwrap();
    let mut focus = std::pin::pin!(gate.wait_for_authentication_focus(generation));
    std::future::poll_fn(|context| {
        assert!(focus.as_mut().poll(context).is_pending());
        Poll::Ready(())
    })
    .await;
    assert!(gate.unlock_after_authentication(generation).is_err());
    assert!(gate.admit().is_err());
    record_authentication_focus(&gate, &WindowEvent::Focused(true), false).unwrap();
    focus.await.unwrap();
    gate.unlock_after_authentication(generation).unwrap();
    assert!(gate.admit().is_ok());
}

#[tokio::test]
async fn hidden_or_second_blur_cancels_native_focus_wait() {
    for hidden in [true, false] {
        let gate = Arc::new(OperationAdmission::with_privacy_lock(true));
        let generation = gate.authentication_generation().unwrap();
        let _native = gate.native_authentication(generation).unwrap();
        record_authentication_focus(&gate, &WindowEvent::Focused(false), false).unwrap();
        let mut focus = std::pin::pin!(gate.wait_for_authentication_focus(generation));
        std::future::poll_fn(|context| {
            assert!(focus.as_mut().poll(context).is_pending());
            Poll::Ready(())
        })
        .await;
        if !hidden {
            record_authentication_focus(&gate, &WindowEvent::Focused(true), false).unwrap();
        }
        record_authentication_focus(&gate, &WindowEvent::Focused(false), hidden).unwrap();
        assert!(focus.await.is_err());
        record_authentication_focus(&gate, &WindowEvent::Focused(true), false).unwrap();
        assert!(gate.unlock_after_authentication(generation).is_err());
        assert!(gate.admit().is_err());
    }
}

#[tokio::test]
async fn expired_native_focus_wait_drops_exemption_and_preserves_cleanup_epoch() {
    let gate = Arc::new(OperationAdmission::default());
    gate.lock_privacy().unwrap();
    let cleanup = gate.privacy_generation().unwrap();
    let generation = gate.authentication_generation().unwrap();
    {
        let _native = gate.native_authentication(generation).unwrap();
        record_authentication_focus(&gate, &WindowEvent::Focused(false), false).unwrap();
        assert!(tokio::time::timeout(
            std::time::Duration::ZERO,
            gate.wait_for_authentication_focus(generation)
        )
        .await
        .is_err());
    }
    record_authentication_focus(&gate, &WindowEvent::Focused(true), false).unwrap();
    assert!(gate.unlock_after_authentication(generation).is_err());
    let next = gate.authentication_generation().unwrap();
    record_authentication_focus(&gate, &WindowEvent::Focused(false), false).unwrap();
    record_authentication_focus(&gate, &WindowEvent::Focused(true), false).unwrap();
    assert!(gate.unlock_after_authentication(next).is_err());
    gate.unlock_privacy(cleanup).unwrap();
    assert!(gate.admit().is_ok());
}
