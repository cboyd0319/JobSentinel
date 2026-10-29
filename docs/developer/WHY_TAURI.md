<!-- Records the desktop architecture choice and separates design goals from measured release evidence. -->

# Why Tauri

JobSentinel uses Tauri 2 to combine its React interface with Rust-owned local
storage, credential protection, source access and reviewed native operations.
The application can provide its core workflows without a hosted account or
external AI. This is a product design enforced by JobSentinel's code and policy,
not a privacy guarantee conferred by a framework.

## Decision

The current implementation needs native window, file, notification and permission
boundaries alongside an existing web UI. Rust owner crates contain the product
logic; the thin Tauri shell registers validated commands and native integrations.
SQLCipher stores local records, and credential, network and document owners expose
bounded interfaces. See [the architecture](ARCHITECTURE_CORE.md).

Using the platform webview avoids bundling a separate full Chromium application
runtime. It also creates a platform-specific rendering and accessibility matrix
that must be tested. The packaging configuration and runtime checks own supported
platforms and prerequisites; framework selection alone proves neither installation
compatibility nor a fixed memory footprint.

## Privacy and security

`src-tauri/tauri.conf.json` owns renderer CSP and package configuration;
`src-tauri/capabilities/` owns plugin permissions. Native commands still need input
validation, authorization, safe paths and minimal responses. Rust's type system
and safe code reduce classes of implementation errors, but FFI, dependencies,
logic and configuration remain security boundaries.

Local-first behavior does not mean no networking: configured source checks,
notifications, model downloads and reviewed optional external AI can make explicit
outbound requests. [Security](../../SECURITY.md) and
[the privacy contract](../../PRIVACY.md) describe those boundaries.

## Tradeoffs

- Native webviews differ across operating systems; installed-platform evidence
  is separate from browser-mock tests.
- Rust and frontend ownership require explicit IPC contracts and cross-owner tests.
- Package size and runtime resource use vary with build, platform, model state and
  workload. Model-free core behavior remains required.
- Signing, notarization and platform permissions are release work, not automatic
  consequences of using Tauri.

## Performance evidence

This document makes no fixed download-size, memory, startup or competitor benchmark
claim. Use candidate-bound measurements under the
[release evaluation bar](../plans/v3/evaluation-and-release-bar.md). Every release
must complete full Stability, Performance and Security phases under the
[Release Contract](RELEASING.md#mandatory-final-release-phases).

Alternative desktop, browser-extension and web architectures can also support
local storage or offline behavior. The decision here reflects JobSentinel's
current owners and native workflows, not a blanket limitation of those platforms.
