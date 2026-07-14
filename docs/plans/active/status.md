# Active Plan Status

Last updated: 2026-07-13. Read this first; load archived history only when needed.

## Goal State

The repo-wide goal remains open: zero known errors, privacy leaks, stale docs,
brittle tests, user-facing technical assumptions, engineer-only defaults, and
unverified claims.

The `v2.9.1` maintenance release is published, verified, and closed out in
maintained docs. Current work is the full repository refactor and v2.9.5
readiness effort. Milestones 0 through 6 are complete: structural sensors,
neutral data ownership, frontend feature ownership, backend cycle repair, the
explicit two-member Cargo workspace, core extraction, and the thin private
Tauri shell, and final script and harness ownership all have passing evidence.
Milestone 7's file caps, Rust boundaries, owner audits, dependency and artifact
cleanup, stale-path repair, and maintained-document alignment are complete. The
public wiki and v2.9.5 version contract are complete. Platform evidence and the
final release-readiness proof remain.

Observed release state on 2026-06-22 local time:

- Public `v2.9.1` release exists at
  `https://github.com/cboyd0319/JobSentinel/releases/tag/v2.9.1`.
- GitHub CLI reports `JobSentinel 2.9.1` as latest, published
  `2026-06-23T00:06:36Z`, non-draft, and non-prerelease.
- Local `main`, `origin/main`, and tag `v2.9.1` point at `81e2df0e`.
- Release workflow run `27990965207` passed. Total elapsed time was about
  40 minutes; platform package legs were Linux 12m43s, macOS 19m18s, and
  Windows 24m46s.
- Public asset verification passed locally with
  `npm run release:verify:public -- --tag v2.9.1 --platforms windows,macos,linux`.
- Public macOS DMG verification passed locally with
  `npm run tauri:verify:macos:latest -- --tag v2.9.1`.
- The public wiki pages were pushed to `JobSentinel.wiki` commit `78f9b2b`.

Rule 0 still controls the work: user data stays local unless the user
explicitly configures an external channel, external AI stays optional and
disabled by default, and users stay in control before anything leaves the
device.

Quiet Shield redesign is now part of the active repo-wide goal and the repo
harness. It remains a harness-controlled active-goal acceptance gate;
`DESIGN.md`, `docs/design/README.md`, and `docs/design/design-spec.md` remain
UI/UX contracts.

The user reopened a full repository refactor on 2026-07-13 with no internal
backward-compatibility requirement. Privacy guarantees are immutable. Behavior,
APIs, schemas, storage, tests, docs, and tooling may change; data changes require
safe migration and no silent loss, and security may not weaken.

## Active Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Current product and quality work | Active | Keep privacy, design, platform, harness, and release evidence aligned during the refactor | [Plan](current-work.md) |
| Full repository refactor and v2.9.5 readiness | Active | Establish the version contract and run final release-readiness proof | [Plan](repository-architecture-reorganization.md) |

## Current Posture

- `v2.9.1` release operations are complete. Do not route new work through the
  old release-cut checklist except as completed evidence.
- The `v2.9.1` public release includes Windows unsigned installers, a no-account
  universal macOS DMG, Linux AppImage and deb packages, Agent Skills archives,
  checksums, SBOM manifests, SPDX SBOMs, and hosted attestations.
- macOS and Windows signing gaps remain external. Do not claim Gatekeeper-ready
  macOS or signed Windows distribution before credential-backed proof exists.
- The no-account macOS package is verified for checksum, metadata,
  architecture, signature, launch smoke, install smoke, and private local data;
  expected Gatekeeper rejection remains an accepted no-account limitation.
- The separate `Verify Release Artifacts` workflow did not appear in the latest
  GitHub run list for the workflow-token-published `v2.9.1` release, so public
  release verification must be run explicitly until the pipeline has a blocking
  in-workflow verifier.
- General v3 feature work and the prior release-pipeline optimization plan are
  deferred. The user explicitly opened a full repository refactor on
  2026-07-13.
- Cleanup is allowed when it fixes stale docs, broken harness state, bloat,
  test brittleness, security or privacy drift, portability issues, or release
  metadata inaccuracies.
- Final file caps are live: 500 lines for production and scripts, 800 for tests,
  and 700 for maintained documents. The focused cap and policy harness passes.
- Rust lint policy denies unsafe code and unreachable public items from the root
  workspace. A module-graph sensor rejects uncompiled source, and Tauri command
  and response items are crate-visible.
- The core crate exposes an explicit bounded facade. Its integration targets
  are deliberate, and embedded model diagnostics do not expose cache paths.
- Credential and application-assistance internals are private behind flat
  facades. The legacy OS credential adapter cannot be called across the crate
  boundary, and default tests explicitly keep live keyring access disabled.
- Scraper implementations and source-adapter contracts are private to their
  core owner. Scheduler, health, and import consumers use one flat internal
  facade, while scraper integration and live checks compile under that owner.
- Resume implementation modules are private behind the existing typed facade.
  The unused parser status check and section extractor are gone, and file-type
  and path-safety tests now exercise the real resume parsing entrypoint.
- Notification provider modules are private behind the typed service facade.
  Only the Slack and email validators used by Tauri commands remain public;
  unused Discord, Teams, and Telegram network test-message APIs are gone.
- Core owns job-link preview, parsing, capped and expiring memory-only review
  state, and atomic insertion. Tauri confirms opaque identifiers without
  refetching or overwriting a concurrent save; successful imports invalidate
  the Dashboard job and statistics caches.
- Market, salary, and database internals are private. Existing migrations require
  a verified encrypted snapshot and live integrity checks before initialization.
- The orphan, dependency, root-entrypoint, generated-artifact, stale-path, and
  maintained-document cleanup audits are complete with passing gates.
- Coverage for all configured source adapters and user-gated restricted-source
  paths must retain focused parser/import/gate evidence before any release-ready
  claim.

## Next Best Work

1. Run the complete frontend, Rust, E2E, security, dependency, SQLx, and package
   readiness matrix.
2. Record final Windows 11, macOS 26, and Linux evidence or named host gaps.
3. Close the active plan without tagging, publishing, uploading, or dispatching
   a release.

## Completion Bar

- Active plan directory contains only current restart docs.
- `status.md` answers current state, recent evidence, macOS posture, and next
  best work without old plan reads.
- Plan indexes, docs hubs, roadmap links, README, release notes, harness
  expectations, and public wiki distinguish v2.9.5 source readiness from the
  published `v2.9.1` release.
- Release pipeline docs and final v2.9.5 readiness evidence distinguish hosted
  releases from local macOS uploads and do not overclaim provenance.
- No known repo bloat, stale docs, generated artifacts, or duplicate sources of
  truth block product, privacy, security, or verification work.
- No known privacy leak remains in logs, command errors, renderer messages,
  safe support reports, source adapters, external AI calls, or notification
  payloads.
- No known user-facing flow assumes terminal, GitHub, debugging, engineering
  knowledge, or only technical job searches.
- Final docs, bloat, security, release-readiness, workflow, and chosen
  verification gates pass before any ready or complete claim.
