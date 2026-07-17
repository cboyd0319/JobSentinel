# Crates DRY Remediation

Last updated: 2026-07-16.

Status: Active. `crates-dry-remediation` is the sole active feature.

## Problem

The repository ownership refactor established the intended crate graph, but the
Rust workspace still contains repeated policy, normalization, construction,
mapping, rendering, orchestration, and test setup. Some copies are exact and
some have already diverged semantically.

The read-only audit covered 14 crates, 493 maintained files, and 107,505 Rust
lines. At a 15-significant-line threshold, the audit measured 697 duplicated
production-line occurrences across 35 regions and 2,277 duplicated test-line
occurrences across 84 regions. Those figures are audit observations, not yet a
checked-in sensor baseline. Milestone 1 must reproduce them with the maintained
detector before they become contract evidence.

The current duplication contract scans `src` and `src-tauri/src` but excludes
`crates`. It therefore cannot prevent the confirmed crate debt from growing.
Removing copies without adding this guard would leave the cleanup incomplete.

## Scope

In scope:

- Every confirmed actionable duplication and DRY violation under `crates/`.
- Exact clones, near-duplicate policy, divergent normalization, repeated model
  shapes, repeated orchestration, repeated row mapping, and repeated test setup.
- Characterization tests before changing behavior-sensitive owners.
- A production and test duplication ratchet for maintained Rust crate code.
- Documentation, evidence, state, and debt-ledger updates needed to close the
  work honestly.
- Small dependency-edge changes already allowed by the architecture contract
  when a lower canonical owner must be consumed directly.

Out of scope:

- New product behavior or visual changes.
- A general utility crate, new framework, new template engine, or speculative
  abstraction layer.
- Rewriting source-specific payload types, provider parsing, migration SQL,
  external schema projections, or backend-specific inference pipelines merely
  because their shapes resemble one another.
- Persistent-data schema changes. If implementation reveals one is necessary,
  stop and add a separate migration contract before proceeding.
- Publication, packaging, or release execution.

## Success Criteria

- All 15 actionable families in the workstream map have one named canonical
  owner, all callers use it, and obsolete copies are deleted.
- URL privacy, webhook target validation, HTML encoding, redaction, title and
  location normalization, remote inference, and SQLite datetime parsing each
  have one behavior contract with adversarial or boundary tests.
- Renderer and exporter code consume one structured resume model and one
  `TemplateId`. Persistence and analysis retain only metadata or result wrappers
  that are semantically distinct.
- New jobs are constructed through a valid domain constructor. Scraper workers
  share one lifecycle runner while source-specific setup remains explicit.
- Repeated storage mappings, source-adapter helpers, renderer sections, market
  calculations, fixtures, and database setup are consolidated at the narrowest
  owner that serves all callers.
- The maintained detector reports zero unexplained exact clone regions in crate
  production code at the 15-line threshold. The raw target is zero. A nonzero
  result blocks completion unless the region is immutable external-contract
  data and receives an existing policy-shaped exception with owner, measured
  ceiling, reason, and removal trigger.
- Crate test code contains no repeated setup block of 15 significant lines or
  more. Independent assertions may remain explicit, but shared construction and
  schema setup must use owned test support.
- The duplication baseline only moves downward. Updating it upward to make a
  check pass is prohibited.
- Focused checks pass at every milestone. The final full gate, all-feature Rust
  tests, architecture check, duplication listing, and whitespace check pass
  with revision-bound evidence.

## Audience And Ease

- Primary user: JobSentinel maintainers and contributors.
- Technical knowledge assumed: Rust workspace development and repository
  verification commands.
- User-facing behavior must remain unchanged. Normalization corrections must
  improve consistency without adding prompts, settings, or manual recovery.
- Rollback is milestone-based. No milestone may require deleting user-owned
  data or reversing an applied database migration.

## Lean And DRY

- Prefer deletion, private modules, existing crate owners, and standard-library
  helpers. Add no cross-cutting crate.
- Consolidate only behavior that must evolve together. Similar provider data or
  source parsing stays separate when its external contract differs.
- Use adapters temporarily only for the resume-model cutover. Remove them in the
  following milestone instead of preserving compatibility layers.
- Reuse existing workspace dependencies. Any new direct internal dependency
  must already be an allowed architecture edge and must be added only to the
  consuming crate manifest.
- Do not trade readable, isolated assertions for a large test DSL. Extract
  fixtures and setup, not the meaning of each test.

## Risks

- Normalization copies have divergent behavior. Characterize current results,
  define the intended domain result and analytics bucket separately, then
  migrate callers in one milestone.
- Source adapters combine structured remote signals with text inference.
  Structured source data must remain authoritative; the shared heuristic is
  only the fallback.
- URL and webhook changes cross security boundaries. Tests must cover malformed
  URLs, userinfo, ports, suffix attacks, private targets, query secrets, and
  provider-specific path rules before callers move.
- Resume structures cross JSON import, export, rendering, ATS analysis, and
  storage. Preserve serialized field names and optionality with fixture-based
  round-trip tests before deleting any model.
- Shared test helpers can hide behavior or create dependency cycles. Keep them
  crate-local unless another crate tests a public contract, then expose the
  smallest feature-gated `test-support` surface.
- A broad refactor can conceal unrelated dirty-tree changes. Each milestone must
  start from a recorded revision, inspect its path-limited diff, and commit only
  files owned by that milestone.

## Orchestration

Use one coordinator for contract ownership, integration, and commits. Read-only
inventory or review slices may run in parallel by crate, but implementation is
dependency-ordered because later milestones consume earlier APIs. A specialist
slice must name its owned files, off-limits files, expected API, and focused
verification. Close each slice before integrating it.

Do not parallelize edits to shared manifests, the duplication contract, domain
normalization, security policy, the structured resume model, active state, or
completion evidence.

## Workstream Map

| ID | Confirmed family | Canonical owner | Milestone |
| -- | ---------------- | --------------- | --------- |
| 1 | Teams webhook allowlist and HTTPS parsing | `jobsentinel-security` target policy | 2 |
| 2 | URL privacy markers and provider canonicalization | Security query policy, domain job-URL normalization | 2 |
| 3 | Title, location, analytics buckets, and remote inference | Domain normalization plus named storage buckets | 3 |
| 4 | SQLite datetime parsing | Private storage SQLite-time module | 4 |
| 5 | HTML escaping | Security output encoding | 2 |
| 6 | Resume DTOs and duplicate `TemplateId` enums | `jobsentinel-documents::StructuredResume` and one `TemplateId` | 7 and 8 |
| 7 | Repeated `Job` initialization | Domain valid-construction API | 5 |
| 8 | Scraper lifecycle blocks | Application scraper runner | 5 |
| 9 | Storage query and row mapping | Private owner-local mappers and query helpers | 4 |
| 10 | Source-adapter string and URL helpers | Private `source_adapters` support module | 5 |
| 11 | Document sections and ATS result assembly | Documents renderer and ATS private helpers | 6 |
| 12 | Median, salary aggregation, and market alert insertion | Storage market-computation helpers | 4 |
| 13 | Status, notification, database, config, and job test setup | Crate-local or feature-gated test support | 9 |
| 14 | Hash wrappers, user-agent strings, debug redaction, and repeated copy | Existing domain, source, security, or message owner | 5 and 10 |
| 15 | Missing crate duplication enforcement | Harness duplication sensor and contract | 1 and 10 |

## Milestones

### Milestone 0: Activate The Plan Safely

- [x] Commit the already verified root-ownership batch as its own change.
- [x] Record `harness-canonical-remediation` as `passing` only against fresh,
  revision-bound evidence.
- [x] Add `crates-dry-remediation` to
  `scripts/harness/state/feature-list.json` as the sole active feature and update
  `docs/harness/current-status.md` to match.
- [x] Point `docs/plans/index.json` and `docs/plans/README.md` at this plan while
  preserving the completed repository-refactor plan and blueprint as historical
  architecture evidence.
- [x] Run the planning fast lane and commit the activation separately.

Commit boundary: `docs(plan): activate crates DRY remediation`.

### Milestone 1: Establish Guardrails And Characterization

- [x] Upgrade `scripts/checks/duplication.mjs` and
  `scripts/harness/contracts/duplication.json` to independent production and
  test scopes without changing the existing frontend production ratchet.
- [x] Classify Rust test-only files and `#[cfg(test)]` items without discarding
  production items that appear later in the same file.
- [x] Add detector tests for inline test modules, nested braces, production code
  after test code, crate test files, downward ratchets, and upward-baseline
  rejection.
- [x] Reproduce the audit measurements with the checked-in detector and save a
  structured baseline under `docs/harness/evidence/`. Record discrepancies as
  discoveries before source edits.
- [x] Add behavior tables for URL handling, webhook validation, title and
  location normalization, remote inference, datetime parsing, HTML escaping,
  resume serialization, and scraper success or failure lifecycle.
- [x] Run focused tests before refactoring and preserve any intentional semantic
  corrections as explicit expected results.

Commit boundary: `test(harness): cover Rust crate duplication`.

### Milestone 2: Consolidate Security And Output Policies

- [x] Move Teams target-host and path rules from credentials and notifications
  into a named `jobsentinel-security` policy. Keep channel-specific payload and
  transport behavior in notifications.
- [x] Keep one HTTPS URL parse and common target-safety path, with provider rules
  passed as explicit policy rather than copied validation steps.
- [x] Make security own sensitive query markers and query stripping. Make domain
  job-URL canonicalization delegate privacy stripping, then apply only job
  identity rules.
- [x] Route the LinkedIn workbench and bookmarklet import through the same domain
  canonicalizer. Delete their provider-special copies.
- [x] Add one context-correct HTML text encoder in security and migrate email and
  document rendering to it. Add the already architecture-approved documents to
  security dependency directly in the documents manifest.
- [x] Add one secret debug-redaction helper and migrate repeated implementations.
- [x] Verify malicious input and unchanged valid output in every affected crate.

Commit boundary: `refactor(security): consolidate shared input policies`.

### Milestone 3: Separate Domain Normalization From Analytics Bucketing

- [x] Define canonical title and location normalization in
  `jobsentinel-domain/src/normalization/` with table-driven edge cases.
- [x] Define one generic remote-text fallback in domain. Preserve structured
  source flags as authoritative and test unknown, hybrid, and conflicting data.
- [x] Replace source-local generic inference in Dice, YC, HN, Lever, Glassdoor,
  and equivalent adapters while retaining source-specific structured mapping.
- [x] Name salary and market grouping transformations as analytics buckets in
  storage. They may consume canonical domain output but must not masquerade as
  general normalization.
- [x] Migrate salary analyzer, predictor, market intelligence, and assistance
  callers. Delete obsolete normalizers only after behavior tables pass.

Commit boundary: `refactor(domain): unify job normalization semantics`.

### Milestone 4: Consolidate Storage Primitives And Mappers

- [x] Move SQLite datetime parsing from application-tracking types to a neutral
  private storage module and migrate resume, salary, and tracking callers.
- [x] Extract one attempt row mapper, one interview row mapper, one answer
  suggestion mapper, and one user-skill query owner where row contracts match.
- [x] Share market median and salary aggregation helpers. Keep distinct
  statistical definitions separate and name them accordingly.
- [x] Route market alert insertion through one private function with a single
  binding order and error context.
- [x] Add null, malformed datetime, empty sample, even and odd median, and row
  conversion tests before deleting copies.

Commit boundary: `refactor(storage): consolidate row and analytics helpers`.

### Milestone 5: Consolidate Job Construction And Scraper Orchestration

- [x] Add a domain constructor for a newly discovered job that establishes all
  required invariants. Do not add a permissive `Default` implementation.
- [x] Migrate all 17 production construction sites and storage row conversion,
  retaining explicit source fields after construction.
- [x] Add a private source-adapter support module for `first_non_empty`, absolute
  HTTP URL checks, whitespace normalization, and hexadecimal prefixes. Migrate
  Phenom, Workday, and Radancy adapters.
- [x] Delete `compute_hash` forwarding wrappers and call the domain hash owner
  directly.
- [x] Centralize identical browser user-agent values at the narrowest source or
  network owner. Keep genuinely provider-required values explicit.
- [x] Extract one generic async scraper lifecycle runner for timer, logging,
  result accumulation, completion, and error handling. Keep credentials,
  acknowledgements, rate limits, and source configuration outside the runner.
- [x] Migrate the scheduler and browser, federal, and JobsWithGPT workers with
  success, partial-result, and error characterization tests.

Commit boundary: `refactor(sources): share job and scraper lifecycle paths`.

### Milestone 6: Consolidate Document Rendering And ATS Assembly

- [x] Extract small contact, experience, education, and skills section renderers
  from the five template variants. Pass only explicit style options.
- [x] Preserve generated HTML with fixture or snapshot comparisons, including
  absent sections and escaped untrusted text.
- [x] Extract a shared ATS result builder for score totals, issue construction,
  and common metadata. Keep rule-specific evidence generation explicit.
- [x] Consolidate repeated requirement-taxonomy lookup without introducing a
  new rules engine.
- [x] Confirm exports remain deterministic and no new template dependency was
  added.

Commit boundary: `refactor(documents): share rendering and ATS assembly`.

### Milestone 7: Introduce The Canonical Resume Contract

- [x] Define `jobsentinel-documents::StructuredResume` as the canonical shared
  personal, summary, experience, education, skills, and certification model.
- [x] Define one public `TemplateId` with the complete supported identifier set,
  parsing behavior, and stable serialized representation.
- [x] Add fixture-based conversion and round-trip tests for JSON import, HTML,
  DOCX, ATS input, and storage-builder boundaries.
- [x] Add temporary explicit conversions from the old template, export, ATS,
  and storage shapes. Mark every adapter for removal in Milestone 8.
- [x] Preserve analysis-only fields in an ATS wrapper and persistence-only
  identifiers and timestamps in a storage wrapper.

Commit boundary: `refactor(documents): add canonical structured resume model`.

### Milestone 8: Cut Over Resume Consumers And Delete Duplicate Models

- [x] Migrate template rendering and every exporter to `&StructuredResume`.
- [x] Migrate ATS analysis and the storage resume builder through their explicit
  wrappers without copying shared fields into parallel DTOs.
- [x] Migrate application callers and public re-exports. Preserve serialized
  names, optionality, and template identifiers proven in Milestone 7.
- [x] Delete duplicate `ResumeData` structures, duplicate `TemplateId`, manual
  field-copy rendering adapters, and temporary conversion code.
- [x] Run all document, storage, application, import, export, and all-feature
  tests before committing.

Commit boundary: `refactor(documents): complete resume model cutover`.

### Milestone 9: Consolidate Test Support

- [x] Replace the repeated 112-line application-status fixture with one local
  fixture builder and explicit per-test overrides.
- [x] Add one notification fixture owner for channel suites. Expose a minimal
  feature-gated test-support API only where application tests consume the same
  public contract.
- [x] Replace manual database schema recreation in the 13 identified Rust test
  files with the migrated in-memory database helper when the full schema is the
  subject. Keep minimal-schema helpers only for deliberate repository isolation.
- [x] Consolidate repeated application config setup and source job fixtures at
  their crate-local owners.
- [x] Rerun the test duplication scope after each extraction. Reject helpers that
  hide assertions or create production dependency edges.

Commit boundary: `test(rust): consolidate crate fixtures and database setup`.

### Milestone 10: Delete Residue, Ratchet To The Final Baseline, And Close

- [x] Run the detector listing and a symbol-level sweep for every family in the
  workstream map. Delete stale wrappers, constants, imports, adapters, and tests
  that only covered retired copies.
- [x] Consolidate repeated external-AI user messages at their existing copy
  owner without changing wording or gateway behavior.
- [x] Require zero unexplained production clone regions and no repeated test
  setup regions at the maintained threshold. Do not add exclusions for code
  created or moved by this plan.
- [x] Lower each duplication baseline to the measured result and close DRY-001
  in `docs/plans/tech-debt-tracker.md` with final evidence.
- [x] Update architecture and testing docs only where ownership or test-support
  APIs changed.
- [x] Run the full verification matrix, save structured completion evidence,
  update active state, and move this plan to `docs/plans/completed/` only after
  every required command passes.

Commit boundary: `refactor(crates): complete DRY remediation`.

## Verification

Every milestone:

```bash
npm run harness:plan -- --since <milestone-base>
npm run harness:check
npm run lint:file-size
cargo fmt --all -- --check
git diff --check
```

Harness milestone:

```bash
node --test scripts/tests/checks/check-duplication.test.mjs
npm run lint:dup -- --list
npm run test:scripts
```

Focused Rust lanes:

```bash
cargo test -p jobsentinel-security -p jobsentinel-credentials -p jobsentinel-notifications
cargo test -p jobsentinel-domain -p jobsentinel-sources -p jobsentinel-application
cargo test -p jobsentinel-storage
cargo test -p jobsentinel-documents
```

Final lane:

```bash
npm run lint:architecture
npm run lint:security
npm run lint:dup -- --list
cargo clippy --workspace -- -D warnings
cargo test --workspace
cargo test --workspace --all-features
npm run verify:full
git diff --check
```

Completion evidence must record the revision, platform, timestamp, command,
exit status, relevant result, and caveat. A skipped required command remains a
gap and blocks `passing`.

## Progress

| Date | Status | Notes |
| ---- | ------ | ----- |
| 2026-07-16 | Planned | Audit reconciled with live crate graph, harness contract, active state, and verification owners. |
| 2026-07-16 | Active | Root ownership committed at `880fca80`; post-commit full gate passed and Milestone 0 activated this plan. |
| 2026-07-16 | Guarded | Milestone 1 added independent downward-only sensors, measured crate baselines, and recorded pre-refactor behavior. |
| 2026-07-16 | Secured | Milestone 2 centralized webhook, URL privacy, HTML encoding, provider job identity, and debug secret policy. |
| 2026-07-16 | Normalized | Milestone 3 centralized work-arrangement inference and separated canonical values from salary and market buckets. |
| 2026-07-16 | Consolidated | Milestone 4 centralized SQLite time parsing, storage row mapping, user-skill queries, salary statistics, and alert insertion. Production crate duplication fell to 480 lines across 24 regions. |
| 2026-07-16 | Orchestrated | Milestone 5 centralized new-job invariants, source-adapter helpers, shared user agents, canonical hash ownership, and scraper lifecycle handling. Production crate duplication fell to 266 lines across 13 regions; test duplication fell to 2,127 lines across 77 regions. |
| 2026-07-16 | Rendered | Milestone 6 centralized document sections, byte-stable shared style fragments, ATS format-result assembly, plain-text bullet traversal, and requirement-taxonomy search terms. Production crate duplication fell to 98 lines across 5 regions; document production clones fell to zero. |
| 2026-07-16 | Modeled | Milestone 7 added the canonical structured resume, one complete template identifier contract, exact boundary fixtures, and temporary analysis and persistence adapters. HTML, DOCX, ATS, JSON import, and storage round trips pass without increasing production duplication. |
| 2026-07-16 | Cut over | Milestone 8 moved rendering, export, ATS analysis, storage, command, and frontend consumers to the canonical resume contract; deleted every temporary adapter and legacy Rust resume DTO; preserved the flat stored-draft contract with an exact round trip; and renamed the distinct local inference result to `ExtractedResume`. Production duplication remains 98 lines across 5 regions and test duplication remains 2,127 lines across 77 regions. |
| 2026-07-16 | Test support | Milestone 9 centralized application status, notification, config, job, migrated database, scraper parsing, and focused assertion fixtures. Test duplication fell from 2,127 lines across 77 regions to zero; production remains 98 lines across 5 regions. |
| 2026-07-16 | Complete | Milestone 10 removed the final production clones and below-threshold forwarding copies, centralized shared prompt-injection and secure-storage policy, refreshed SQLx metadata and harness sensors, ratcheted both crate baselines to zero, and passed the full verification matrix. |

- [x] Milestone 0: activate the plan safely.
- [x] Milestone 1: establish guardrails and characterization.
- [x] Milestone 2: consolidate security and output policies.
- [x] Milestone 3: separate normalization from analytics bucketing.
- [x] Milestone 4: consolidate storage primitives and mappers.
- [x] Milestone 5: consolidate job construction and scraper orchestration.
- [x] Milestone 6: consolidate document rendering and ATS assembly.
- [x] Milestone 7: introduce the canonical resume contract.
- [x] Milestone 8: cut over resume consumers and delete duplicate models.
- [x] Milestone 9: consolidate test support.
- [x] Milestone 10: delete residue, ratchet baselines, and close.

## Surprises And Discoveries

- The maintained duplication sensor currently excludes the entire crate tree,
  so its passing result does not contradict the audit findings.
- The root-ownership remediation passed against commit `880fca80`; this plan is
  now the sole active feature.
- The architecture contract already allows documents to depend on security, but
  the documents manifest does not currently declare that direct dependency.
- Exact clone counts alone do not capture the highest-risk debt. Normalization
  and resume models need semantic and serialization characterization in addition
  to the mechanical detector.
- The maintained item-range classifier measured 693 production lines across 35
  regions and 2,184 test lines across 79 regions. The prototype was higher by 4
  production lines and 93 test lines across 5 additional test regions.
- The repeated market salary collector decoded nullable SQLite values directly
  as `f64`, which admitted a null row into the average. The shared owner now
  decodes `Option<f64>` explicitly and the null contract prevents regression.
- The local inference crate used `StructuredResume` for a compact extracted
  evidence record unrelated to the canonical document model. Renaming it to
  `ExtractedResume` removed the false ownership signal without coupling the
  inference contract to document rendering fields.
- Two-line migrated-database setup and three-line forwarding functions remained
  below the mechanical detector threshold. The symbol and setup sweep removed
  them while preserving separate integrity, migration, file-backed, and
  minimal-schema test contracts.
- The final full gate exposed two stale harness predicates and two obsolete SQLx
  cache entries left by earlier canonical-owner cutovers. Updating those
  sensors and generated query metadata restored alignment with live ownership.

## Decision Log

- 2026-07-16: Activate this plan only after the prior feature passed with
  revision-bound evidence; the single-active-feature contract remains intact.
- 2026-07-16: Use existing crates as canonical owners. Do not create a shared
  utility crate.
- 2026-07-16: Treat structured source remote fields as authoritative and shared
  text inference as a fallback.
- 2026-07-16: Keep canonical domain normalization distinct from named analytics
  bucketing where product semantics differ.
- 2026-07-16: Use one documents-owned structured resume DTO and one template ID,
  with temporary adapters removed in the immediately following milestone.
- 2026-07-16: Keep the local inference extraction contract semantically separate
  from the canonical document model and name it `ExtractedResume`.
- 2026-07-16: Set zero as the raw production-clone target and prohibit baseline
  increases or cleanup-only exclusions.
- 2026-07-16: Keep explicit schema keys, source-specific selectors, platform
  parity contracts, and semantically distinct setup local. Similar spelling is
  not a DRY violation without one shared behavior owner.
- 2026-07-16: Split the remaining frontend duplication into DRY-003 so closing
  the crate remediation does not hide unrelated measured debt.

## Outcomes And Retrospective

- Maintained crate production duplication fell from 693 lines across 35 regions
  to zero. Maintained crate test duplication fell from 2,184 lines across 79
  regions to zero.
- Security, normalization, SQLite mapping, source orchestration, document
  rendering, structured resume data, notification formatting, and test setup
  now have narrow canonical owners in existing crates. No new crate or external
  dependency was added.
- The shared salary aggregation now excludes null rows explicitly. Source
  remote fallbacks, URL policy, HTML encoding, webhook validation, prompt-like
  content checks, and resume serialization are protected by focused contracts.
- Intentional repetition remains only where the repeated text is an explicit
  protocol, schema, taxonomy, provider, platform-parity, or test-subject
  contract. The completion evidence records these categories and the passing
  command matrix.
- Frontend production duplication remains measured separately at 778 lines
  across 38 regions under DRY-003; it is not part of this completed crate scope.

## Handoff

- Current state: all ten milestones are complete and both maintained crate
  duplication scopes are ratcheted to zero.
- Evidence: `docs/harness/evidence/crates-dry-completion-2026-07-16.json`
  records the full command matrix, measurements, retained intentional
  repetition, revision scope, and caveats.
- Next step: treat any crate duplication increase as a regression. The separate
  frontend DRY-003 feature owns the next duplication workstream.
- Open risk: none within the completed crate scope.
