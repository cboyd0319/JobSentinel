# Active Plan Status

Last updated: 2026-06-19. Read this file first; load archived history only for old decision context.

## Goal State

The repo-wide goal remains open: zero known errors, privacy leaks, stale docs, brittle tests,
user-facing technical assumptions, engineer-only defaults, and unverified claims.
Current priority is final v2.9.0 release-gate handoff for an urgent single-user search.

Release creation is paused. Do not push, retag, upload, or publish `v2.9.0`
until final local gates pass from the verified commit and the user confirms
publication. Do not retag or upload over the same `v2.9.0` release while an
older workflow run is still building assets.

Rule 0 still controls the work: user data stays local unless the user explicitly
configures an external channel, external AI stays optional and disabled by
default, and users stay in control before anything leaves the device.

Quiet Shield redesign is now part of the active repo-wide goal and the repo harness.
It remains a harness-controlled active-goal acceptance gate behind primary
v2.9.0 gates; `DESIGN.md`, `docs/design/README.md`, and
`docs/design/design-spec.md` remain UI/UX contracts.

The v2.9.0 goal adds four durable release-readiness requirements:

- Add spec-compliant downloadable Agent Skills under `skills/`.
- Keep the npm package manager, repo-declared npm packages, and Cargo crates
  exact-pinned latest stable; keep resolved transitives lockfile-pinned,
  latest-compatible, and never forced outside upstream constraints.
- Support restricted job sites through explicit user-directed paths with a hard
  warning/acknowledgement gate. Do not collect logins/cookies, bypass checks,
  or run hidden background access.
- Treat all configured source adapters and user-gated restricted-source paths as
  release blockers with focused parser/import/gate coverage and UI validation.
- Near the end, run a Rust expert and multi-agent improvement analysis across
  non-`content/` surfaces, then apply and verify accepted fixes before push.

## Active Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Current product and quality work | Active | Docs/readme/screenshots, manual scraper/source verification, manual resume verification, final UI proof, and release handoff | [Plan](current-work.md) |
| v2.9.0 completion and full-feature roadmap | Active | Checklist is open; publication sequence remains blocked until every non-external row has evidence | [Plan](v2.9.0-completion-and-full-feature-roadmap.md) |

## Current Posture

- `origin/main` is the pushed `2.7.7` release-recovery baseline; local metadata
  is staged for `2.9.0`. A premature remote `v2.9.0` tag and draft release
  exist; do not publish or delete them without explicit user approval.
- Recent evidence covers dependency/action pins, security sensors, frontend,
  build, Rust fmt/clippy/lib, E2E, docs, bloat, harness, skills packaging, and
  no-account release asset staging. Rerun final gates from the final commit.
- Credential paths use encrypted local storage; passive status/list checks must
  remain non-interactive and must not cache vault keys.
- No-account release assets can publish for Windows, macOS, and Linux, but
  Apple Developer ID and Windows signing remain external gaps.
- Browser Import and LinkedIn-compatible Workbench have prior no-session-cookie
  proof, but final signoff still needs fresh restricted-source UI, artifact,
  acknowledgement, and no-hidden-access validation.
- Resume, application preview, cover-letter review, role-family taxonomy,
  source corpus/taxonomy, and local interest learning have focused coverage;
  final release still needs manual full-corpus and full-surface evidence.
- 2026-06-19 local semantic matching governance now uses `models.lock.toml`
  for pinned model identity, revisions, file hashes, sizes, licenses, backend
  compatibility, instruction profiles, thresholds, and stale-vector rules.
  Qwen3 embedding and reranker are locked as the target architecture. The
  text-only Qwen3 embedding backend is implemented behind the governed cache
  and has focused live validation with downloaded artifacts. The bounded Qwen3
  reranker backend is implemented and has focused live validation with
  downloaded artifacts. Existing commands still use the MiniLM baseline until
  Qwen3 dense and reranker diagnostics are wired into the UI. The typed hybrid
  scorer now combines dense, BM25, exact skill, required-coverage, seniority,
  reranker, blocker, and provenance signals with focused tests, and
  `embedded-ml` resume/job scoring uses it with a legacy fallback when local ML
  is disabled.
- 2026-06-19 optional outside-AI setup now supports OpenAI, Anthropic, Google
  Gemini, GitHub Copilot, and custom HTTPS providers in Settings. Users can
  configure multiple providers, order preferences, and per-provider model
  names. Provider keys use `CredentialService` and the local secure vault; no
  provider transport sends data until the gateway preview, redaction, cancel,
  and request-log UI is implemented.
- `validation/file_size_contract.json` now owns hard maintainable file caps;
  `npm run lint:bloat` enforces scope limits and frozen legacy exceptions. New
  Rust/frontend production modules must stay at or below 700 lines unless an
  explicit reviewed exception is added and kept from growing.
- Script tests were moved out of the flat `scripts/` root in commit
  `b238c7d4`; keep future script tests under test directories.
- 2026-06-19 release blockers remain open for major README and screenshot
  refresh, stale docs cleanup, external-AI preview/send UI completion, Qwen3
  diagnostics UI/data-flow integration, manual verification of every
  scraper/source flow, manual verification of every resume capability, final
  whole-UI proof, final local gates, and user-confirmed push/publish.

## Next Best Work

1. Update, reorganize, archive, or delete stale maintained docs, including the
   public README and screenshots for current v2.9.0 surfaces.
2. Manually verify every current scraper/source path and every resume feature
   against the local corpora, then record evidence.
3. Add Qwen3 diagnostics and UI/data-flow integration evidence behind the model
   governance layer, then expand semantic-matching evals from the research
   contract.
4. Run final local release gates from the verified commit.
5. Push `main` and wiki only after the user confirms final publication steps.
6. Keep macOS readiness honest: no Gatekeeper-ready claim before Apple credentials.

## Completion Bar

- No known repo bloat, stale docs, generated artifacts, or duplicate sources of
  truth block product, privacy, security, or verification work.
- No known privacy leak remains in logs, command errors, renderer messages,
  safe support reports, source adapters, external AI calls, or notification
  payloads.
- No known user-facing flow assumes terminal, GitHub, debugging, engineering
  knowledge, or only technical job searches.
- Every shipped scraper, import path, and non-scraper restricted-source workflow
  has source-debug evidence, including proof that restricted-site auth material
  and hidden page state are not stored.
- Final docs, bloat, security, architecture, frontend, build, Rust, and chosen
  E2E or Computer Use gates pass before any production-ready or release-ready
  claim.
