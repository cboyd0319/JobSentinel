# Repo Cleanup Handoff

## Current State

This handoff belongs to the active
[repo cleanup and quality sweep](repo-cleanup-and-quality-sweep.md).

The cleanup goal remains open. Do not mark it complete until current evidence
proves the repo-wide objective: identify and fix all known issues across the
JobSentinel repo, then verify docs and code against that full scope.

Latest committed stopping point observed on `main`:

- `50cde393 test: stabilize WebKit E2E shortcuts`
- Parent slice: `857c7bb4 test: stabilize Chromium E2E suite`

Current cleanup posture:

- Bloat and junk sensors exist and run through `npm run lint:bloat`.
- Docs harness exists and runs through `npm run harness:check`.
- Test-quality guard exists and blocks focused tests, runtime skips, and weak
  E2E assertions through `npm run lint:tests`.
- Chromium and WebKit focused E2E flows were stabilized for keyboard navigation
  and job filtering in the latest slice.
- Root README now points developers to the quality gates that protect this work.
- User ease is now a standalone goal requirement: assume zero technical
  knowledge for end users. Troubleshooting and issue reporting must stay
  one-click, plain-language, and privacy-preserving.
- Broad audience fit is also a standalone design requirement: JobSentinel is
  for all job seekers and technical plus non-technical roles, not just
  engineers.
- Harness docs and templates now require audience/ease, support-path, rollback,
  handoff, and experience-sensor thinking for non-trivial work. The harness
  check guards those template snippets.
- Root README was rechecked against live release assets, package version,
  current command count, and product direction.

## Recent Work Landed

Recent cleanup slices on `main` include:

- WebKit E2E shortcut delivery and dashboard count stabilization.
- Chromium E2E stabilization after full-suite failures.
- Harness improvement from current public harness-engineering references and
  Persona/Bluepeak-AI sibling repo patterns.
- Root README release/download accuracy update and WebKit slash-shortcut E2E
  stabilization.
- Resume sub-score percentage rendering fix.
- JSDOM download navigation noise cleanup.
- Empty source-directory bloat guard.
- Frontend development logging sanitization.
- Context hook split to remove react-refresh suppressions.
- Browser memory typing and trend-chart typing cleanup.
- Malformed stored JSON validation across resume, ATS, analytics, score, and
  error-log surfaces.
- Credential, scraper, notification, import, resume, feedback, and keyring
  privacy hardening.
- Maintained docs normalization to remove stale status markers, glyph-heavy
  diagrams, stale release promises, and version drift.

The active plan progress table has detailed slice history.

## Verified Recently

The latest stopping-point slice was verified with:

- Focused WebKit E2E for job filtering and keyboard navigation.
- Focused Chromium E2E for job filtering and keyboard navigation.
- `npm run test:scripts`
- `npm run lint:bloat`
- `npm run lint:tests`
- `npm run lint:docs`
- `npx tsc --noEmit`
- `git diff --check`

For this handoff-only update, rerun docs and bloat checks before committing.

## Known Remaining Work

Keep the objective broad. Do not collapse it to already-landed slices.

Next high-value passes:

1. Run a final root and nested junk scan.
   - Confirm untracked files are expected.
   - Confirm tracked disposable artifacts are absent.
   - Recheck docs images, fixtures, generated output, logs, reports, caches, and
     obsolete examples.
2. Run a final stale-docs and reference sweep.
   - Compare README, `docs/README.md`, harness docs, developer docs, security
     docs, feature docs, and source comments against live commands and APIs.
   - Update docs or add bloat sensors for every recurring drift class.
3. Continue backend and scraper edge review.
   - Recheck command error wrappers for path, URL, query, secret, cookie, and
     provider-body leaks.
   - Recheck scraper request caps, retry handling, rate limits, and health
     result shapes.
   - Keep no-bypass and local-first product rules intact.
4. Continue frontend boundary review.
   - Recheck stored JSON parsing, URL validation, error rendering, direct
     browser-open paths, logging, and malformed input handling.
   - Prefer focused Vitest and E2E coverage for each concrete defect.
5. Continue zero-technical-skill UX review.
   - Recheck setup, settings, feedback, recovery, empty states, and error
     screens for plain-language actions and no terminal/developer assumptions.
   - Keep sanitized debug-report generation one click from Settings, Error
     Logs, and crash/error recovery surfaces.
6. Continue broad-audience UX review.
   - Recheck onboarding, examples, placeholders, filters, profile presets, docs,
     and empty states for engineer-only assumptions.
   - Make sure technical and non-technical job searches both feel first-class.
7. Keep harness evidence current.
   - Use the updated change-contract and plan templates for broad follow-up
     work.
   - Promote any repeated ease, privacy, or flaky-test failure into a guide or
     sensor instead of leaving it in chat.
8. Decide final E2E scope.
   - Use focused E2E while fixing narrow browser-flow issues.
   - Run `npm run test:e2e:all` before claiming broad cross-browser completion,
     or document why it is deferred with exact risk.
9. Run final broad verification before goal completion.
   - Docs, bloat, test-quality, security, architecture, frontend tests, build,
     Rust formatting, Rust clippy, Rust tests, and chosen E2E scope all need
     current evidence.

## Completion Bar

Completion is not a vibes call. Before marking the goal complete, produce
current evidence for each requirement:

- Repo bloat and junk inventoried, removed, moved, merged, or explicitly kept.
- Docs accurately describe current behavior, commands, security posture,
  release state, and architecture.
- No known stale docs, duplicate sources of truth, tracked disposable artifacts,
  or generated outputs remain.
- No known privacy leaks through logs, renderer responses, command errors,
  scraper errors, notifications, credential paths, stored reports, or local path
  exposure remain.
- No known frontend/runtime issue found during the sweep remains unfixed.
- No known backend/Rust issue found during the sweep remains unfixed.
- No known user-facing path assumes technical knowledge for setup, recovery,
  troubleshooting, or GitHub issue reporting.
- No known user-facing path assumes the job seeker is an engineer or searching
  only for technical work.
- Relevant mechanical sensors cover recurring drift classes.
- Final verification commands pass from the current checkout.

If any evidence is stale, narrow, indirect, or missing, keep the goal open.

## Suggested Next Command Set

Start with cheap current-state checks:

```bash
npm run lint:bloat
npm run lint:docs
npm run lint:tests
npm run lint:security
npm run lint:architecture
npm run test:scripts
git status --short --branch
git diff --check
```

Then pick the next concrete sweep target from the known remaining work list.
