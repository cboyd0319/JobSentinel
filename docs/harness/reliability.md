# Reliability And Observability

This file defines how JobSentinel proves it is healthy, restartable, and
diagnosable from repo-local signals. Static sensors prove code shape. This file
covers runtime behavior: what the app must log, which journeys must work, and
what a clean restart means.

Source frameworks: WalkingLabs learn-harness-engineering, Lecture 11 (make the
runtime observable) and the observability-feedback-loop standard operating
procedure. See <https://walkinglabs.github.io/learn-harness-engineering/>.

## Rule 0 First

Observability never weakens privacy. Logs and traces stay local, carry no
secrets, no full database contents, and no machine-specific local paths, and
follow the redaction rules enforced by `scripts/harness/checks/privacy-logging.mjs`.
If a signal would expose user data, it must be redacted or omitted, not shipped.

## Standard Paths

| Path | Command |
| ---- | ------- |
| Environment readiness | `npm run doctor` (and `npm run doctor:e2e` for Playwright) |
| Verification | `npm run harness:check` plus matrix sensors for the change |
| Start app for local development | `npm run tauri dev` |
| Restart snapshot for agents | `npm run harness:session` |

## Required Runtime Signals

The app emits structured, privacy-safe signals so failures are diagnosable
without guesswork:

- Application lifecycle: startup begin, ready, and shutdown.
- Critical-path entry and outcome for scrape, import, scoring, resume matching,
  and external-AI gateway requests. Record source, action, and result, never the
  payload contents.
- External-AI gateway decisions: allowed or blocked and the reason, with no
  prompt or payload text.
- Recoverable error states with enough context to locate the layer, redacted to
  remove user data.

Prefer one structured logger boundary over ad hoc `console` calls so signals are
consistent and machine-readable.

## Golden Journeys

These user-visible journeys must work and must survive an app restart. Each is a
candidate for end-to-end or manual validation before release.

| Journey | Works when | Failure signal |
| ------- | ---------- | -------------- |
| First run with no account | App launches locally and reaches a usable home screen | Startup error or blank window |
| Search a reviewed public source | Results appear and persist locally | Empty results with no error state, or scrape error without user feedback |
| Track an application on the board | A saved application reopens unchanged after restart | Lost or duplicated card after restart |
| Resume fit explanation locally | Fit guidance renders with local data by default | Silent failure or external call without consent |
| Enable external AI through the gateway | Preview, redaction, approval, and cancel all work before anything leaves the device | Payload sent without preview or approval |
| Copy a safe support report | A sanitized report copies with no secrets or local paths | Report includes credentials, raw paths, or user data |

Full manual coverage and current evidence live in
`full-manual-validation-v2.9.1.md`.

## Restart Expectations

- The app starts from the standard path without manual repair.
- No half-finished import or migration leaves the local database inconsistent.
- `npm run doctor` passes on a clean checkout after dependency install.
- A fresh agent session can reach current state with `npm run harness:session`.

## Reliability Rules

- No feature is complete if the app cannot restart cleanly afterward. See
  `completion-gate.md`.
- Runtime failures should be diagnosable from local signals, not only from
  reading code.
- When a failure mode repeats, add a benchmark, test, or guardrail for it and
  record the promotion in `entropy-control.md`.
- Cleanup is part of reliability, not a separate concern.

## Related Harness Docs

- [Completion gate](completion-gate.md)
- [Harness map](harness-map.md)
- [Quality grades](quality-grades.md)
- [Full manual validation](full-manual-validation-v2.9.1.md)
