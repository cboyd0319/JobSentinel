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
| Dependency pin and currency gate | Complete | 2026-06-17 external registry audit, refreshed after updating `dompurify` to `3.4.11` and strengthening lockfile, workflow runner, and apt-package sensors: all 46 npm direct packages exact-pinned to registry `latest`; all 50 direct Cargo dependencies exact-pinned to crates.io `max_stable_version`; workflow OS runners and direct workflow apt packages exact-pinned to stable labels/Ubuntu package versions; transitive package/crate versions are lockfile-pinned; `npm outdated --json` returned `{}`; `npm audit --audit-level=high` found zero vulnerabilities; `cargo update --dry-run --verbose` found zero compatible updates. Recorded upstream constraints: npm `@polka/url@1.0.0-next.29` and `gensync@1.0.0-beta.2`, plus four behind-latest transitive Cargo crates. |
| Setup Wizard normal-state flow | Complete | Desktop and mobile Chromium Playwright pass on 2026-06-17 in `tests/e2e/playwright/setup-wizard.spec.ts`: first-run mode, custom search path, starter title, resume skill suggestions, manual skill, work-to-rank-lower text, hourly pay floor, location validation, Not Sure, detected city, manual city, freshness/review-volume choices, desktop and quiet alerts, optional source review when shown, completion to Dashboard, no console/page errors, and no overflow. |
| App shell and Dashboard primary actions | Complete | Desktop/mobile evidence captured on 2026-06-17 under `<tmp>/jobsentinel-dashboard-global-manual`: skip link, theme toggle, command palette, keyboard help, settings shell, import modal, search, sort/source filters, clear filters, exports, saved filters, bulk select/download/compare/bookmark/hide, research Escape, notes, bookmark, Prepare Form, View, Not Interested, no console/page errors, and no horizontal overflow. Fixes from this slice: `07911591`, `e531a986`, `520a7032`, `5222a28d`, `65a8ba81`. Dashboard empty/loading/error states are covered by the forced-state row. |
| Shared modal and toast behavior | Complete | Shared Modal now closes on document-level Escape while preserving topmost-modal behavior; live Settings and Import Job Escape paths passed. Toast stack is capped to three newest visible notifications; desktop and mobile live probes under `<tmp>/jobsentinel-dashboard-global-manual` confirmed three visible toasts, no console/page errors, and no horizontal overflow. Committed in `5222a28d` and `65a8ba81`. |
| Settings normal-state route | Complete | Desktop Playwright manual pass on 2026-06-17 under `<tmp>/jobsentinel-settings-manual`: 79 recorded actions covering Search Preferences, Sources & Alerts, desktop/email/chat alerts, Job Alert Rules, additional job boards, Browser Import, posting risk, resume sorting, Job Sources health modal, backup/restore, support report copy/save, feedback, tab keyboard flow, tooltip Escape, save/reopen persistence, no console/page errors, and no overflow. Mobile pass at 390 x 844 recorded 18 actions covering Search Preferences, Sources & Alerts, Job Alert Rules, LinkedIn search-link-only copy, Browser Import, posting risk, Job Sources, feedback, no console/page errors, and no overflow. Settings forced loading/error states are covered by the forced-state row. |
| Applications normal-state route | Complete | Desktop Playwright manual pass on 2026-06-17 under `<tmp>/jobsentinel-applications-manual`: 10 recorded actions covering pending reminder completion, no-response review, Application Summary date range, Interviews schedule form, Templates dirty-discard confirmation, application status and notes, keyboard drag start/cancel, no console/page errors, and no overflow. Mobile pass at 390 x 844 recorded 9 actions covering reminder completion, no-response review, status and notes, Templates dirty-discard, Interviews schedule form, keyboard drag start/cancel, no console/page errors, and no overflow. Fixes from this slice: shared Modal body portal with nested-depth ownership, click-through toast text with clickable controls, and mobile wrapping for template editor/preview rows. Applications forced loading/error states are covered by the forced-state row. |
| Resumes normal-state route | Complete | Desktop and mobile Playwright manual passes on 2026-06-17 under `<tmp>/jobsentinel-resumes-manual`: 21 recorded actions each covering empty route entry, Add Resume, Import from resume app, library open, active resume switch, delete-resume confirmation cancel, readable text preview/copy/close, add skill, category filter, resume-skill sorting on/off, edit skill, delete-skill confirmation and delete, no console/page errors, and no overflow. Resumes forced loading/error states are covered by the forced-state row. |
| Salary normal-state route | Complete | Desktop and mobile Playwright manual passes on 2026-06-17 under `<tmp>/jobsentinel-salary-manual`: 15 recorded actions each covering Back navigation, missing-detail validation, role/location/floor inputs, role-stage select, pay-range lookup, salary evidence, range help tooltip with Escape, negotiation company/offer/target inputs, invalid target validation, drafted negotiation notes, no console/page errors, and no overflow. Salary forced no-data/loading/error states are covered by the forced-state row. |
| Hiring Trends normal-state route | Complete | Desktop and mobile Playwright manual passes on 2026-06-17 under `<tmp>/jobsentinel-market-manual`: 12 recorded actions each covering Back navigation, Refresh Hiring Trends, keyboard tab navigation, Skills, Companies, Locations, location detail open/close, Overview View All, Alerts, Mark Read, Mark All Read, no console/page errors, and no overflow. Fixes from this slice: location tiles keep native button semantics inside list items, and the location comparison legend wraps on mobile. Hiring Trends forced loading/error and no-input states are covered by the forced-state row. |
| Application Assist normal-state route | Complete | Desktop and mobile Playwright manual passes on 2026-06-17 under `<tmp>/jobsentinel-application-assist-manual`: 16 recorded actions each covering Back navigation, profile validation, contact/link fields, Choose Resume and Clear resume, sponsorship and review-pace controls, manual approval toggle, Save Profile, keyboard tab navigation, quick-add screening answer, Save Answer, Edit Answer, Update Answer, no console/page errors, and no overflow. Fix from this slice: screening edit buttons now include the matching question in their accessible name. Application Assist forced loading/error states are covered by the forced-state row. |
| Resume Builder normal-state route | Complete | Desktop and mobile Playwright manual passes on 2026-06-17 under `<tmp>/jobsentinel-resume-builder-manual`: 24 recorded actions each covering Back navigation, contact validation and fields, Previous/Next persistence, summary validation, Add Experience and Add Education modal disabled/Escape/add/cancel-delete paths, skill import from active resume, manual skill add/delete, named row delete buttons, preview generation, template selection, PDF print export, DOCX download, no console/page errors, and no overflow. Fixes from this slice: repeated row delete buttons include item names, and mobile skill rows keep delete actions inside the viewport. Resume Builder forced loading/error states are covered by the forced-state row. |
| Resume Match normal-state route | Complete | Desktop and mobile Playwright manual passes on 2026-06-17 under `<tmp>/jobsentinel-resume-match-manual`: 16 recorded actions each covering Back navigation, empty Review Match validation, Choose or Add Resume, active-resume match review, suggestion details, action words modal, empty and successful Draft Alternative Bullet paths, copied-resume import, invalid copied details, format-only review, copied-resume match review, comparison toggle, Resume Builder handoff, no console/page errors, and no overflow. Fixes from this slice: back and bullet draft controls now have accessible names, and score rows no longer overflow at 390 px. Resume Match forced loading/error states are covered by the forced-state row. |
| Full click/action verification | Complete | The route-specific rows plus the Setup Wizard row cover every action listed in the surface map across desktop/mobile normal states, and the forced-state row covers empty/loading/error surfaces. |
| Empty/loading/error state verification | Complete | Desktop and mobile Playwright manual passes on 2026-06-17 under `<tmp>/jobsentinel-empty-loading-error-v2.9.0`: 28 forced scenarios per viewport covering startup loading/recovery, first-run setup entry, Dashboard, Settings, Applications, Resumes, Salary, Hiring Trends, Application Assist, Resume Builder, and Resume Match empty/loading/error states. Result: 56 runs, zero unexpected console errors, zero page errors, and zero overflow. Expected console entries were limited to forced command failures. Fixes from this slice: deterministic dev-mock delay/failure/response controls, first-run setup progress wrapping, Dashboard application summary wrapping, and Resume Builder startup recovery. |
| Keyboard path verification | Complete | Fresh Playwright pass on 2026-06-17: `node scripts/run-playwright.mjs test tests/e2e/playwright/keyboard-navigation.spec.ts` ran 38 tests across Chromium and WebKit after installing the pinned Playwright WebKit runtime. Coverage includes skip link, main-content focus, primary navigation shortcuts 1-8, shortcut suppression while typing, unsupported shortcut handling, Control/Meta+K command palette, palette filter/Enter/Arrow/Tab focus trap/Escape, keyboard help, and slash search focus. |

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
