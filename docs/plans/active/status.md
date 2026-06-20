# Active Plan Status

Last updated: 2026-06-20. Read this file first; load archived history only for old decision context.

## Goal State

The repo-wide goal remains open: zero known errors, privacy leaks, stale docs, brittle tests,
user-facing technical assumptions, engineer-only defaults, and unverified claims.
Current priority is final v2.9.0 release-gate handoff for an urgent single-user search.

Release creation is paused. Do not push, retag, upload, or publish `v2.9.0`
until final gates pass from the verified commit and the user confirms
publication. Capability verification and follow-up local gates have passed, but
repeat them after any further local change and before moving the tag. Do not
retag or upload over the same `v2.9.0` release while an older workflow run is
still building assets.

Rule 0 still controls the work: user data stays local unless the user explicitly
configures an external channel, external AI stays optional and disabled by
default, and users stay in control before anything leaves the device.

Quiet Shield redesign is now part of the active repo-wide goal and the repo harness.
It remains a harness-controlled active-goal acceptance gate behind primary
v2.9.0 gates; `DESIGN.md`, `docs/design/README.md`, and
`docs/design/design-spec.md` remain UI/UX contracts.

The v2.9.0 goal adds durable release-readiness requirements:

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
| Current product and quality work | Active | Final gates and release handoff | [Plan](current-work.md) |
| v2.9.0 completion and full-feature roadmap | Active | Checklist has local evidence; publication sequence remains blocked until user-confirmed push, tag, hosted build, and asset verification | [Plan](v2.9.0-completion-and-full-feature-roadmap.md) |

## Current Posture

- `origin/main` is the pushed `2.7.7` release-recovery baseline; local metadata
  is staged for `2.9.0`. A premature remote `v2.9.0` tag and draft release
  exist; do not publish or delete them without explicit user approval.
- Latest exact full-gate validation commit is `07a03891`.
- Recent evidence covers dependency/action pins, security, frontend/build,
  Rust, E2E, docs/bloat/harness, skills, source/resume/AI/ML, screenshots, and
  no-account asset staging. Capability verification records the 2026-06-20
  pass; final publication gates must rerun from the exact push/tag commit.
- Credential paths use encrypted local storage; passive status/list checks must
  remain non-interactive and must not cache vault keys.
- No-account release assets can publish for Windows, macOS, and Linux, but
  Apple Developer ID and Windows signing remain external gaps.
- Browser Import, LinkedIn-compatible Workbench, source-health checks, and
  live public source probes have fresh 2026-06-19 evidence with no credential,
  cookie, token, private note, resume, salary floor, or application-history
  exposure. New local API research now feeds shared source taxonomy and native
  parser contracts for Workday CXS, Phenom widgets, and Radancy/TalentBrew
  static HTML, plus Oracle Fusion/Taleo and long-tail ATS fingerprints.
- Resume, application preview, cover-letter review, role-family taxonomy,
  source corpus/taxonomy, local interest learning, and public docs/screenshots
  have focused coverage. Publication remains user-confirmed.
- 2026-06-19 private resume-corpus aggregate probe parsed all 12 local files
  across DOCX, Markdown, and PDF formats, ran skill extraction plus
  ATS/readability checks against three broad job descriptions, ran
  bullet-review checks, and verified synthetic export templates with
  aggregate-only output. Focused public/synthetic UI and E2E passes now cover
  resume import, match, tailoring, builder/export, application-form,
  cover-letter, screening-answer, and semantic diagnostics surfaces.
- 2026-06-19 local semantic matching governance now uses `models.lock.toml`
  for pinned model identity, revisions, file hashes, sizes, licenses, backend
  compatibility, instruction profiles, thresholds, and stale-vector rules.
  Qwen3 embedding and reranker backends have focused downloaded-artifact
  validation. Direct matcher commands now prefer Qwen3 dense retrieval plus
  bounded Qwen3 reranking when both governed models are downloaded and
  verified, with MiniLM retained as a fallback. The typed hybrid scorer covers dense,
  BM25, exact skill, required-coverage, seniority, reranker, blocker, and
  provenance signals; `embedded-ml` resume/job scoring uses it with a legacy
  fallback. Settings includes **Local Match Check** through
  `get_semantic_matching_diagnostics`. Seed evals and contract tests cover
  role-family fit, generated-advice separation, skill graph confusables,
  fairness, self-preference, adversarial postings, evidence explanations, and
  modular extractor/classifier/matcher/analyzer stages.
- 2026-06-19 optional outside-AI setup now supports OpenAI, Anthropic, Google
  Gemini, GitHub Copilot, and custom HTTPS providers in Settings. Users can
  configure multiple providers, order preferences, per-provider model names,
  private-details-after-review, and metadata-only local request history.
  Provider keys use `CredentialService` and the local secure vault. The shared
  review/cancel dialog, metadata-only request-history storage, Rust provider
  transport boundary, and first reviewed public job-posting summary path are
  implemented. Job cards now expose **Summarize posting with Outside AI**; it
  loads saved settings locally, shows the review/edit/cancel dialog, sends only
  reviewed public posting fields through `send_external_ai_request`, and keeps
  provider secrets in the backend. No private-data outside-AI features ship in
  `2.9.0`; future sensitive sends must receive the same review and
  backend-validation path before becoming available.
- `validation/file_size_contract.json` now owns hard maintainable file caps;
  `npm run lint:bloat` enforces scope limits and frozen legacy exceptions. New
  Rust/frontend production modules must stay at or below 700 lines unless an
  explicit reviewed exception is added and kept from growing.
- Script tests were moved out of the flat `scripts/` root in commit
  `b238c7d4`; keep future script tests under test directories.
- 2026-06-20 capability verification records every capability row, source
  class, privacy boundary, route probe, focused scraper/resume/AI/ML gate,
  skills/SBOM checks, private corpus refresh, Qwen3 runtime checks, live source
  probes, and macOS no-account DMG verifier. Remaining blocker:
  user-confirmed push/publish and public hosted asset verification.

## Next Best Work

1. Wait for user confirmation before pushing `main`, wiki, tags, or release assets.
2. Keep macOS readiness honest: no Gatekeeper-ready claim before Apple credentials.
3. Rerun final gates after any further local change.

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
