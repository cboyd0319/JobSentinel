# Active Plan Status

Last updated: 2026-06-22. Read this file first; load archived or completed
history only when old decision context is needed.

## Goal State

The repo-wide goal remains open: zero known errors, privacy leaks, stale docs,
brittle tests, user-facing technical assumptions, engineer-only defaults, and
unverified claims.

The `v2.9.1` maintenance release is published, verified, and closed out in
maintained docs. Current work is release-pipeline optimization: preserve the
verified release evidence and reduce future hosted release time and cost
without weakening platform, checksum, SBOM, attestation, or public-asset
verification gates.

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

## Active Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Current product and quality work | Active | Post-release docs accuracy, harness health, release pipeline hygiene, and regression watch | [Plan](current-work.md) |
| Release pipeline audit and optimization | Active | Reduce release time and runner cost, make local macOS the default no-account path, and preserve release evidence | [Plan](release-pipeline-audit-and-optimization.md) |

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
- v3 planning remains useful background, but implementation is deferred unless
  the user explicitly changes scope.
- Cleanup is allowed when it fixes stale docs, broken harness state, bloat,
  test brittleness, security or privacy drift, portability issues, or release
  metadata inaccuracies.
- Coverage for all configured source adapters and user-gated restricted-source
  paths must retain focused parser/import/gate evidence before any release-ready
  claim.

## Next Best Work

1. Use the new manual release dispatch flow for the next release: local macOS
   by default for no-account builds, hosted `windows-linux` for Windows/Linux,
   and explicit public verification.
2. Decide whether to add a blocking in-workflow public verifier before or
   immediately after publication, instead of relying on a separate release-event
   workflow.
3. Keep future product work scoped by the current active plan and the
   verification matrix.

## Completion Bar

- Active plan directory contains only current restart docs.
- `status.md` answers current state, recent evidence, macOS posture, and next
  best work without old plan reads.
- Plan indexes, docs hubs, roadmap links, README, release notes, harness
  expectations, and public wiki posture match the published `v2.9.1` state.
- Release pipeline docs distinguish hosted releases from local macOS uploads
  and do not overclaim hosted provenance for local artifacts.
- No known repo bloat, stale docs, generated artifacts, or duplicate sources of
  truth block product, privacy, security, or verification work.
- No known privacy leak remains in logs, command errors, renderer messages,
  safe support reports, source adapters, external AI calls, or notification
  payloads.
- No known user-facing flow assumes terminal, GitHub, debugging, engineering
  knowledge, or only technical job searches.
- Final docs, bloat, security, release-readiness, workflow, and chosen
  verification gates pass before any ready or complete claim.
