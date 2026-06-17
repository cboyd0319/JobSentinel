# v2.9.0 Whole-UI Manual Verification

Last updated: 2026-06-17.

## Purpose

This ledger is the completion gate for the v2.9.0 manual UI pass. Do not call
v2.9.0 ready until every shipped route, click, action, modal, toast, form,
settings panel, import flow, keyboard path, empty/loading/error state, and
narrow-width surface below has fresh manual verification evidence.

## Ground Rules

- Verify desktop at 1440 x 1000 and mobile at 390 x 844 unless a surface needs
  an additional viewport.
- Record no horizontal overflow, no console errors, no page errors, and no
  incoherent text overlap for every route-level pass.
- Keep all evidence outside the repo unless a future plan explicitly requests
  checked-in artifacts. Use placeholders such as `<tmp>/jobsentinel-ui-inventory`
  rather than machine-specific absolute paths.
- Do not trigger live OS keyring prompts in default tests. Live keyring proof
  requires `JOBSENTINEL_LIVE_KEYRING_TESTS=1`.
- Keep LinkedIn support user-opened and user-clicked only: no session-cookie
  storage, token replay, background monitoring, result-list crawling, or account
  automation.

## Evidence Ledger

| Surface | State | Evidence |
| ------- | ----- | -------- |
| Browser Import compliant LinkedIn path | Complete | Desktop and mobile Playwright manual pass on 2026-06-17: settings, port validation, copy behavior, private-link rejection, LinkedIn single-job preview/save, duplicate handling, no console errors, no overflow. Committed in `a0573373`. |
| Route inventory and screenshots | Complete | Desktop and mobile route inventory captured on 2026-06-17 under `<tmp>/jobsentinel-ui-inventory`; eight primary routes rendered with no console or page errors and no route-level horizontal overflow. |
| Dependency pin and currency gate | Complete | 2026-06-17 external registry audit: all 46 npm direct packages exact-pinned to registry `latest`; all 50 direct Cargo dependencies exact-pinned to crates.io `max_stable_version`; `npm outdated --json` returned `{}`; `npm audit --audit-level=high` found zero vulnerabilities; `cargo update` refreshed `muda`, `webpki-root-certs`, and `webpki-roots`; `cargo update --dry-run --verbose` found zero compatible updates; `cargo check --locked` and `cargo test --lib --locked` passed. Four behind-latest transitive crates remain upstream-constrained by exact dependencies. Committed in `56ae82a0`. |
| App shell and Dashboard primary actions | Complete for primary action slice | Desktop/mobile evidence captured on 2026-06-17 under `<tmp>/jobsentinel-dashboard-global-manual`: skip link, theme toggle, command palette, keyboard help, settings shell, import modal, search, sort/source filters, clear filters, exports, saved filters, bulk select/download/compare/bookmark/hide, research Escape, notes, bookmark, Prepare Form, View, Not Interested, no console/page errors, and no horizontal overflow. Fixes from this slice: `07911591`, `e531a986`, `520a7032`, `5222a28d`, `65a8ba81`. Dashboard empty/loading/error states remain pending. |
| Shared modal and toast behavior | Complete for shared components | Shared Modal now closes on document-level Escape while preserving topmost-modal behavior; live Settings and Import Job Escape paths passed. Toast stack is capped to three newest visible notifications; desktop and mobile live probes under `<tmp>/jobsentinel-dashboard-global-manual` confirmed three visible toasts, no console/page errors, and no horizontal overflow. Committed in `5222a28d` and `65a8ba81`. |
| Full click/action verification | Pending | Must exercise every action listed in the surface map. |
| Empty/loading/error state verification | Pending | Must force or mock representative empty, loading, and error states per route. |
| Keyboard path verification | Pending | Must exercise skip link, primary navigation shortcuts, command palette, keyboard help, focus traps, and modal escape paths. |

## Surface Map

| Area | Required Manual Coverage |
| ---- | ------------------------ |
| App shell | Startup loading, startup recovery, safe support report copy/save, skip link, sidebar navigation, theme toggle, tour, command palette, keyboard help, route focus, desktop/mobile overflow. |
| Setup Wizard | First-run location, pay floor, resume suggestions, source review, notification choices, skip/default paths, completion, loading/error states, desktop/mobile overflow. |
| Dashboard | Search Now, Import Job, high-match shortcut, Remote Only, Download Top Jobs, Shortcuts help, all filters, salary min/max, possible repeats, select mode, download list, save filters, job-card score details, research, notes add/edit, bookmark/unbookmark, Prepare Form, View, Not Interested, application summary, empty/error/loading states. |
| Settings | Search Preferences tab, Sources & Alerts tab, desktop/email/chat alerts, quiet hours, alert rules, additional job boards, Browser Import, posting risk and freshness, resume sorting, match review guide, backup/restore, safe support report copy/save, feedback, close and keyboard/focus behavior. |
| Applications | Back navigation, Templates, Interviews, Summary, Review No Responses, Done, drag/drop or keyboard drag cards, application detail modal, status changes, reminders, import-job handoff, empty/error/loading states. |
| Resumes | Back navigation, Import from resume app, Add Resume, resume selection, resume detail actions, empty/error/loading states, desktop/mobile overflow. |
| Salary | Back navigation, role/location inputs, pay unit, Check Pay Range, result and guidance states, empty/error/loading states. |
| Hiring Trends | Back navigation, Refresh Hiring Trends, all tabs, View All, mark alerts read, chart/tool/location cards, empty/error/loading states. |
| Application Assist | Back navigation, Basic Info and Preferences tabs, profile text fields, location and links, Choose Resume, screening answers, review pace, Save Profile, validation/error states, no auto-submit behavior. |
| Resume Builder | Back to Dashboard, step navigation, contact/summary/experience/education/skills/forms, Add Work Experience modal, Add Education modal, preview/export actions if present, validation/error/loading states. |
| Resume Match | Choose or Add Resume, Import from Resume App, job-post input, Review Match, action words modal, bullet improver modal, Draft Alternative Bullet, Open Resume Builder path, empty/error/loading states. |
| Global toasts and modals | Success/info/error toasts, dismiss actions, shared modal focus trap, Escape close, close buttons, narrow-width button wrapping, safe recovery copy. |

## Route Inventory Counts

The 2026-06-17 inventory found the following visible route-level controls in
the mock desktop and mobile app:

| Route | Buttons | Inputs | Other Controls |
| ----- | ------- | ------ | -------------- |
| Dashboard | 79 | 3 | filters, cards, status regions |
| Applications | 9 | 0 | application cards, drag handles |
| Resumes | 5 | 0 | resume empty/import surfaces |
| Salary | 2 | 3 | pay unit chooser |
| Hiring Trends | 5 | 0 | 5 tabs |
| Application Assist | 8 | 9 | 2 tabs |
| Resume Builder | 3 | 7 | step navigation |
| Resume Match | 5 | 1 | review actions |
| Settings Sources & Alerts | 30 | 3 | 8 checkboxes, 2 tabs, sliders |

## Verification Commands

Use focused checks while filling this ledger, then broaden before v2.9.0:

```bash
npm run harness:check
npm run lint:docs
npm run lint
npm run test:run
npm run build
cd src-tauri && cargo fmt --all -- --check
cd src-tauri && cargo clippy -- -D warnings
cd src-tauri && cargo test --lib
```
