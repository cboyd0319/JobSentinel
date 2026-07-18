# JobSentinel V3 Master Execution Plan

Last updated: 2026-07-18.

This is the sole execution plan for the v3 major line. The other files in this
directory provide product, architecture, research, and evaluation detail. They
do not independently authorize implementation or add scope.

## Problem

The repository has a broad v3 strategy package, a ranked 233-item idea index,
one narrow foundation plan, public-roadmap commitments, research follow-ups,
open or stale debt records, and deferred release work. Those sources do not
form one ordered, implementation-ready plan. Starting work from any one of them
would risk building dependent features in the wrong order, freezing an unstable
compatibility contract, or silently losing unfinished commitments.

V3 needs one durable plan that:

- defines what ships in v3.0 and later v3.x releases;
- orders architecture, migration, product, security, evaluation, and release work by dependency;
- gives every maintained unfinished commitment one explicit disposition;
- keeps only one active feature at a time;
- proves user value and recovery, not only implementation completion.

## Scope

In scope:

- The complete v3.0 foundation and first user-visible vertical release.
- Ordered v3.x enhancement work after the v3.0 compatibility boundary ships.
- Every `Now` and `Next` item in [Idea Index](idea-index.md), consolidated into bounded workstreams.
- Unfinished commitments from maintained roadmaps, plans, feature docs,
  research docs, testing docs, security docs, release docs, and debt tracking.
- Safe v2.9-to-v3 migration, backup, restore, compatible v3 rollback, and unsupported-newer-data handling.
- Product, privacy, security, accessibility, performance, documentation, packaging, supply-chain, and release evidence.

Out of scope:

- `Later` and `Moonshot` ideas unless a recorded v3 discovery proves they are necessary for an accepted milestone.
- Ideas prohibited by the cut lines in [Idea Index](idea-index.md).
- Hidden restricted-source monitoring, stored restricted-session material,
  control bypasses, fabricated resume evidence, opaque hiring predictions, or
  final application submission without user review.
- Hosted accounts, telemetry, required external AI, or required large-model downloads for core workflows.
- Claiming externally blocked distribution guarantees without the required credentials and live evidence.

## Success Criteria

- Observable result: v3.0 ships one coherent local-first job-search system built
  around opportunity case files, explainable evidence, safe source workflows,
  recovery, and stable compatibility contracts.
- User-ease result: a nontechnical job seeker can install, reach a useful
  workflow, import or find a job, decide whether it is worth pursuing, prepare
  truthful materials, track progress, recover from failure, and export their
  data without a hosted account.
- Scope result: all 102 `Now` ideas are covered by v3.0 milestones; all 76
  `Next` ideas are assigned to ordered v3.x trains; all 44 `Later` and 11
  `Moonshot` ideas are explicitly deferred; prohibited ideas remain retired.
- Backlog result: every unfinished maintained-doc commitment listed in
  [Completion Inventory](#completion-inventory) is completed, deferred with a
  trigger, or retired with evidence.
- Compatibility result: fresh install, v2.9 migration, failed-migration
  recovery, backup restore, compatible v3 rollback, and newer-data refusal are
  proven without silent data loss.
- Verification result: every milestone has focused evidence, every release cut
  passes the full applicable local and hosted gates, and final GUI QA covers
  every shipped action.

## Audience And Ease

- Primary user: technical and nontechnical job seekers, including career changers and people in long searches.
- Technical knowledge assumed: none for install, setup, normal workflows, recovery, update, export, or support.
- Broad job-seeker fit: examples, fixtures, taxonomies, pay models, credentials,
  and source packs must cover multiple job families and work arrangements.
- Support and recovery: every failure offers a plain next action, preserves
  local data, and provides a reviewable safe support report when useful.

## Product And Trust Contract

- Rust remains the durable local trust boundary. Tauri remains a thin desktop
  and IPC shell. React feature owners render typed application contracts.
- User data stays local unless the user explicitly configures and approves an external channel.
- External AI stays optional, disabled by default, previewed, editable,
  cancellable, redacted, approved, metadata-logged, and gateway-routed.
- Job postings, resumes, browser content, packs, and model output are untrusted inputs.
- Every recommendation names evidence, uncertainty, blockers, and the local data used.
- Every durable write, external send, restricted-source action, sensitive
  export, and final application action remains visible and user controlled.
- Core workflows retain deterministic local fallbacks.
- Accessibility, data-loss handling, credential safety, source pacing, and
  platform parity are release requirements, not later polish.
- V3 contracts favor deletion and existing owners over new crates, dependencies, daemons, services, or plugin runtimes.

## Authority And Change Control

1. `scripts/harness/state/feature-list.json` owns the single active feature.
2. This file owns v3 sequence, scope, decisions, progress, and handoff.
3. [V3 Planning](README.md) indexes strategy and research references.
4. [Idea Index](idea-index.md) owns idea descriptions and priority labels.
5. Closest feature and security docs own shipped behavior.
6. A reference document cannot add release scope without a decision recorded here.
7. Activate one milestone or one bounded child feature at a time. Record its
   acceptance behavior, paths, verification, and rollback before code changes.
8. Scope changes require an updated disposition, dependency review, and user approval when they change the release boundary.
9. Only verification can move a milestone or child feature to `passing`.

## Completion Inventory

| Source | Unfinished or conflicting work | Disposition |
| --- | --- | --- |
| `README.md`, `docs/README.md`, `docs/ROADMAP.md`, `docs/features/capabilities.md`, `docs/releases/v2.9.5.md`, `CHANGELOG.md` | Several maintained docs still describe v2.9.5 as an unpublished candidate or v2.9.1 as current. | Milestone 0 corrects and verifies all release truth before product implementation. |
| Root `ROADMAP.md` | Resume readability, source verification, repost lineage, pay protection, long-search support, bias-aware routes, protective UX, and local control remain planned. | Milestones 4 through 9 implement them; Milestone 11 evaluates them. |
| `docs/plans/tech-debt-tracker.md` DRY-002 | Small direct dependencies still require replacement review. | Milestone 0 evaluates each named dependency and either removes it or records why the existing rationale remains sufficient. |
| `docs/plans/tech-debt-tracker.md` DRY-003 | The tracker says frontend duplication is open, while the live duplication gate reports zero. | Milestone 0 closes the stale item with fresh evidence. |
| Deferred release-pipeline plan | Whether public verification belongs inside the blocking release workflow remains unresolved. | Milestone 0 re-audits the current workflow; Milestone 11 implements or explicitly rejects the change. |
| `docs/harness/current-status.md` | Shared-history CI is deferred under an explicit user override. | Keep the exception visible. Milestone 11 requires a fresh user decision before v3 release and records the enforcement gap if retained. |
| `docs/developer/TESTING.md` | Full pipeline integration, property tests, mutation tests, benchmarks, mock servers, and JSON snapshots are listed as future work. | Milestone 0 closes already-implemented items. Milestones 1 and 11 add only risk-based mutation and performance checks; snapshot testing is retired unless a stable JSON contract needs it. |
| `tests/e2e/README.md` | Drag-and-drop relies on retries; native file-picker behavior lacks installed-app smoke coverage. | Milestone 1 makes drag-and-drop deterministic and adds a native smoke owner. |
| Research open evaluations | Ghost, pay, negotiation, behavior, source, resume, and screening-system studies contain unevaluated product questions. | Milestone 1 creates versioned eval sets; feature milestones add fixtures before implementation; Milestone 11 runs the accepted evaluations. |
| Resume feature and research docs | Broader evidence strength, synonym handling, recency, seniority, profession weighting, YAML import, static export, draft history, and a public-profile importer remain future work. | Core evidence and weighting ship in Milestone 5. Import/export extensions enter the v3.x train in Milestone 12. |
| Job-source research and feature docs | Source registry, permission notes, pacing, stop conditions, freshness comparison, and source review remain open. | Milestone 4 owns the source graph, policy ledger, fixtures, and browser protocol. |
| Employer-intelligence plan | Dataset mode, starter sources, Essentials size, manual observations, expiry, and minimum dossier remain open decisions. | Decision Gate 4 resolves them before Milestone 8 implementation. |
| Security docs | Future private-data AI, encrypted-secret backup, and stricter local-auth choices are conditional, not approved behavior. | Milestones 3 and 7 may promote only reviewed paths with focused threat models and local fallbacks. |
| Distribution-dependent platform work | Start-on-login, sandboxing, signing, notarization, and final native proof remain incomplete or externally constrained. | Design and fixture work stays late. Live platform and distribution proof is part of Milestone 11 only. |
| Completed and archived plans | Completed plans are historical. The release-pipeline plan is the only archived plan with an explicit unresolved `Next` item. | Do not reopen historical checklists. Carry forward only the release decision named above. |
| Checklists and boundary language | Security, contribution, support, and skill checkboxes are reusable procedures; phrases such as “not yet submitted” describe state. | Not backlog. Keep them as verification or user guidance. |

The inventory covers maintained root state, roadmaps, plan references, feature
docs, research, developer and testing guidance, security guidance, and release
records. Completed or archived material remains historical unless it contains an
explicit unresolved commitment named above. New maintained commitments must add
or update an inventory row before implementation.

## Idea Disposition

The IDs below come from [Idea Index](idea-index.md). An accepted ID is a
requirement to satisfy, not necessarily a separate screen, table, or abstraction.

### V3.0 Accepted

| Milestone | Accepted `Now` IDs |
| --- | --- |
| 1 | A01, A07, A08, A09, A11, A12, A13, A16, A18, C01, C02, C03, C04, C05, C06, C07, C08, C10, C11, C12, C13, C14, C15, C16 |
| 2 | A02, A03, A04, A05, A10, A15 |
| 3 | P01, P02, P04, P06, P07, P09, E11, E12, N10, N20 |
| 4 | A06, S01, S02, S03, S06, S08, S11, S12, S13, S14, S16, S17, S19, S22, S26, S27 |
| 5 | M01, M02, M03, M05, M10, M11, M12, M16, M18, M19, M21, M22, M27, X05 |
| 6 | U01, U02, U11, U12, U13, U14, G12, O07, N07, R01, R02 |
| 7 | G01, G05, G06, G11, G16, G17, G18, G19, P10, P11, E13 |
| 8 | U20, X21 |
| 9 | R04, R05, R06, R07, R17, E01, E03 |
| 10 | E02 |

### V3.x Accepted After V3.0

Milestone 12 uses this default dependency order. Each ID or tightly coupled
group remains a separately activated child feature.

| Order | V3.x train | Accepted `Next` IDs | Dependency rule |
| --- | --- | --- | --- |
| 12A | Campaign operating loop | U03, U04, U05, U06, U07, U08, U10, U15, U21 | Starts from stable v3.0 case-file and event evidence. |
| 12B | Source reach and reliability | S04, S05, S07, S09, S10, S15, S18, S21, S23, S24, S28 | Preserves Gate 3 policy, pacing, permission, and revocation contracts. |
| 12C | Application, interview, and offer quality | M04, M06, M07, M08, M09, M15, M17, M20, M23, O01, O02, O05, O06, O11, O12 | Uses frozen evidence and outcome contracts; never invents candidate evidence. |
| 12D | Privacy and governance | P05, P08, P12, P14 | Requires focused threat models and local fallbacks. |
| 12E | Safe automation | G02, G03, G04, G07, G08, G09, G10, G13, G15 | Cannot widen the v3.0 capability boundary without a major-version deferral. |
| 12F | Ecosystem and distribution | E04, E05, E06, E07, E10, E14, E15 | Uses signed, compatible pack and edition contracts. |
| 12G | Native integration | A14, N01, N02, N03, N06, N08, N14, N15, N16, N18, N19 | Builds the adapter contract before individual integrations. |
| 12H | Regional and access expansion | R03, R08, R11, R13, R15, R16 | Extends manifests and fixtures without claiming unsupported completeness. |
| 12I | Frontier and benchmark | X02, X07, X18, C09 | Requires measured value and cannot displace accepted safety or recovery work. |

### Explicitly Deferred Beyond V3

- `Later`: A17, A19, A20, A21, E08, E09, E16, G14, M13, M14, M24, M26,
  N04, N05, N09, N11, N12, N13, N17, O03, O04, O08, O09, O10, P03, P13,
  R09, R10, R12, R14, S20, S25, U09, U16, U17, U18, X04, X08, X09, X10,
  X13, X15, X16, X17.
- `Moonshot`: M25, P15, U19, X01, X03, X06, X11, X12, X14, X19, X20.
- Promotion trigger: a completed v3 discovery must prove user value, data and
  trust boundaries, architecture ownership, focused evals, rollback, and no
  displacement of accepted work.

### Retired

The following remain prohibited: hidden restricted-source monitoring, stored
restricted-session credentials, background account-backed refresh, final
submission without review, fabricated resume claims, control evasion, broad
pack privileges, and opaque hiring-probability claims.

## Constraints And Risks

| Risk | Required control |
| --- | --- |
| V3 freezes the wrong contract | Complete Milestone 1 decision records and compatibility fixtures before schema or protocol freeze. |
| Migration damages local data | Verified encrypted backup, integrity checks, retry, restore, and unsupported-newer-data refusal are blocking tests. |
| Event or graph systems duplicate private text | Typed event allowlists, metadata size limits, privacy labels, redaction tests, and no raw resume, note, credential, or provider payload fields. |
| Browser or source work exceeds safe access | Source class, policy reference, rate limit, visible user action, loopback pairing, revocation, and stop-condition tests precede adapters. |
| Model output becomes authoritative | Evidence citations, blocker caps, deterministic fallback, stale-vector detection, calibration, and manual explanation review. |
| Packs or agents widen privilege | Signed manifests, capability grants, quarantine, denial tests, approval gates, local logs, uninstall, and cleanup. |
| Scope becomes unfinishable | One active child feature, hard release cut lines, dependency gates, and promotion only through this plan. |
| Modest hardware is excluded | Essentials profile, no required model download, bounded memory and storage tests, and responsive fallback paths. |
| Documentation diverges | Closest feature docs and generated contracts update in the same milestone; stale release claims fail Milestone 0. |
| Platform-specific work consumes the stream early | Keep native distribution proof in the final release milestone unless an earlier contract test requires a fixture. |

## Orchestration

- The coordinating agent owns this plan, active state, integration, and final
  verification.
- Keep tightly coupled migration and contract work local.
- Delegate only bounded, independent work with disjoint file ownership when the
  user, platform, and active profile authorize it.
- Every delegated result receives local diff review and verification.
- Use a specification reviewer after each milestone plan and an adversarial
  reviewer for migrations, security boundaries, browser protocols, agents,
  packs, compatibility, and release claims.

## Decision Gates

| Gate | Decision required | Blocks |
| --- | --- | --- |
| 0 | User approves this master scope and Milestone 0 activation. | All implementation |
| 1 | Freeze v3 identifiers, privacy labels, manifest schemas, backup/export envelope, compatibility policy, vector backend, and executable-pack class. | Milestones 2 through 10 |
| 2 | Approve the minimum case-file, event, graph, receipt, and policy data model after migration prototypes. | Milestones 3 through 8 |
| 3 | Approve browser protocol, source classes, permission model, revocation, and replacement or coexistence of existing capture tools after threat-model tests. | Browser and source UI |
| 4 | Approve model thresholds, local runtime and provider matrix, setup defaults, employer datasets, regional delivery mode and sources, expiry, and Essentials footprint from eval evidence. | Milestones 5, 8, and 9 release claims |
| 5 | Approve edition names, component matrix, update and rollback UX, and v3.0 feature cut. | Milestones 10 and 11 |
| 6 | Approve final release after full evidence, known gaps, and external blockers are recorded. | Publication |

## Milestones

| Milestone | Required work | Owners and exit |
| --- | --- | --- |
| 0. Planning authority and repository truth | [ ] Verify this file remains active in the plan index, v3 planning, plans hub, current status, and feature state.<br>[ ] Correct stale v2.9.5 release records.<br>[ ] Reconcile DRY-002 and close stale DRY-003 with live evidence.<br>[ ] Reconcile testing future-work claims against existing coverage.<br>[ ] Re-audit the deferred release-pipeline decision.<br>[ ] Add a deterministic idea-disposition check and a focused docs-marker audit for inventory drift.<br>[ ] Record Gate 0 and activate Milestone 1.<br>Verify: `npm run harness:check`, `npm run lint:docs`, `npm run lint:deps:why`, `npm run lint:dup -- --list`, `npm run lint:file-size`, and `git diff --check`. | Planning and harness owners.<br>Exit: one active plan, one active feature, no contradictory current-state docs, and no unowned open debt. |
| 1. Contract, evaluation, and quality baseline | [ ] Define versioned Rust-owned schemas for compatibility, manifests, privacy receipts, agent tasks, packs, regions, editions, model provenance, and vector freshness.<br>[ ] Add fixtures for current v2.9, malformed, unsupported-newer, and forward-compatible unknown input.<br>[ ] Create public or synthetic eval sets for source truth, resume evidence, pay clarity, posting risk, employer context, accessibility, recovery, modest hardware, and commercial comparison.<br>[ ] Make drag-and-drop E2E deterministic and add installed-app native file-picker smoke coverage.<br>[ ] Set benchmark budgets and use mutation testing only where it can disprove high-risk test quality.<br>[ ] Complete Gate 1. | `jobsentinel-domain`, security, local AI, platform, harness contracts, tests, and closest docs.<br>Exit: schemas and evals fail closed, are versioned, and require no database migration. |
| 2. V3 local data foundation | [ ] Write fail-first tests for case-file create/reuse, sanitized events, metadata limits, privacy receipts, source policy upsert, compatibility reads, failed migration, retry, and backup restore.<br>[ ] Add append-only SQLx migrations for case files, typed events, career/source graph records, receipts, source policies, and compatibility metadata.<br>[ ] Exclude raw resumes, notes, credentials, browser storage, provider payloads, and unrelated history from event metadata.<br>[ ] Add application-layer operations without frontend commands.<br>[ ] Prove fresh install and v2.9 fixture migration, then complete Gate 2. | Storage, domain, application, and `.sqlx/`.<br>Exit: the foundation is local, typed, bounded, migration-safe, and has no renderer surface. |
| 3. Recovery, portability, policy, and repair | [ ] Implement encrypted backup and restore, migration provenance, compatible rollback, newer-data refusal, export without lock-in, and storage cleanup.<br>[ ] Build Privacy Doctor, safe support bundle, policy ledger, smart consent, and recovery/repair services.<br>[ ] Keep secret export disabled unless a separate design passes threat review and explicit approval.<br>[ ] Add platform-health and package-repair contracts with plain fallbacks. | Storage, security, credentials, application, platform, Settings, and user-data docs.<br>Exit: destructive and irreversible paths have backup, restore, cancel, support, and test evidence. |
| 4. Source graph and browser companion | [ ] Implement source identity, class, policy, rate limit, permission, fixture, confidence, freshness, lineage, and stop-condition records.<br>[ ] Consolidate official APIs, public ATS pages, employer discovery, regional packs, restricted Workbench, visible capture, smart paste, and applied logging behind the graph.<br>[ ] Prototype secure loopback pairing, scoped permissions, revocation, replay protection, and no stored restricted-session material.<br>[ ] Add a source simulator, policy fixtures, robots and terms review records, freshness comparison, and adversarial protocol tests.<br>[ ] Complete Gate 3 before browser UI. | Sources, network, security, application, platform, browser assets, Settings, and source docs.<br>Exit: every source action is classified, paced, visible, revocable, and explainable. |
| 5. Local evidence, resume, and matching engine | [ ] Build a provenance-aware evidence graph shared by resume, requirement, packet, and case-file workflows.<br>[ ] Add requirement states, hard constraints, seniority, recency, profession and regional profiles, transparent blockers, and "why not" diagnostics.<br>[ ] Calibrate Qwen3 retrieval and reranking against frozen evals while preserving deterministic fallback and stale-vector repair.<br>[ ] Guard jobs, resumes, models, and packs against prompt injection and poisoned input.<br>[ ] Implement Model Doctor, match debugger, feedback capture, and evidence-bound packets.<br>[ ] Complete Gate 4 model and data decisions. | Documents, intelligence, local AI, assistance, storage, resume UI, and matching docs.<br>Exit: every match claim is evidence-linked, bounded, reproducible, and useful without external AI. |
| 6. Opportunity case file and daily workflow | [ ] Ship plain-language first run, one useful initial search path, and clear skip and recovery choices.<br>[ ] Make the case file the shared view for job, source, risk, evidence, packet, application, interview, contact, offer, and outcome state.<br>[ ] Add mission board, timeline, evidence wall, decision summary, "why not this job," "prepare this job," debrief, and drag-and-drop import.<br>[ ] Preserve focused feature ownership and typed application commands.<br>[ ] Test empty, partial, duplicate, offline, failed-source, and restored-data states at desktop and narrow layouts. | Application, storage, assistance, `src/features/`, shared UI, and closest docs.<br>Exit: the primary v3 journey works end to end without hidden automation. |
| 7. Agent and pack runtime | [ ] Implement local skill execution, reviewed task plans, bounded resume and packet agents, failure views, and eval packs.<br>[ ] Define signed manifests, capability grants, quarantine, self-test, install, update, disable, uninstall, and cleanup.<br>[ ] Limit v3.0 executable packs to reviewed typed actions; keep generic script or dynamic adapter execution deferred until sandbox denial tests and an explicit future promotion pass.<br>[ ] Deny broad shell, filesystem, network, credential, and external-send access by default.<br>[ ] Test injection, malformed packs, signatures, downgrade, revocation, replay, partial install, and rollback.<br>[ ] Keep static Agent Skills compatible and external AI gateway-bound. | Application, security, AI, assistance, platform, `skills/`, pack UI, and security docs.<br>Exit: agents and packs cannot exceed visible user-approved capabilities. |
| 8. Employer, pay, and outcome intelligence | [ ] Resolve all employer-intelligence open decisions at Gate 4.<br>[ ] Build the minimum employer dossier from official public sources, provenance, freshness, user-owned observations, and local outcomes.<br>[ ] Integrate source verification, posting history, pay clarity, scam response, application channel, interview context, and offer evidence without verdicts or central private reviews.<br>[ ] Revalidate volatile legal, policy, pay, and public-data claims before use. | Intelligence, sources, storage, salary, application, company research, and research docs.<br>Exit: guidance shows source, date, uncertainty, and safe next actions. |
| 9. Regions, access, editions, and first-run doctor | [ ] Define region manifests, taxonomy bridges, location and pay normalization, CV profiles, public-source fixtures, and starter packs.<br>[ ] Validate starter coverage without claiming regional completeness.<br>[ ] Implement Essentials and stronger-local profiles, download chooser, first-run doctor, model-free startup, and in-place model upgrade.<br>[ ] Cover role families, work modes, credentials, pay types, and accessibility needs in examples and tests.<br>[ ] Complete Gate 4 regional and footprint decisions and Gate 5 edition decisions. | Domain, sources, documents, intelligence, local AI, platform, onboarding, Settings, packaging, and region docs.<br>Exit: modest hardware and model-free installs complete the core journey. |
| 10. Update, rollback, repair, and distribution design | [ ] Implement explicit update availability, package verification, compatible rollback, repair, and component cleanup without silent updates.<br>[ ] Bind app, edition, pack, model, browser, region, export, and database compatibility metadata.<br>[ ] Test interrupted update, checksum failure, unsupported package, missing component, rollback restore, and offline recovery.<br>[ ] Freeze the v3.0 feature and component cut at Gate 5. | Application, platform, security, storage, release scripts, Settings, updater docs, and release docs.<br>Exit: update and repair are reversible, inspectable, and need no developer instructions. |
| 11. V3.0 integration, QA, and release | [ ] Run all end-to-end scenarios and commercial benchmarks in the evaluation bar.<br>[ ] Perform full GUI QA for every shipped action, recovery path, keyboard flow, accessibility state, responsive layout, and installed-app boundary.<br>[ ] Prove fresh install, v2.9 migration, failure recovery, compatible rollback, export/import, pack and model removal, and newer-data refusal.<br>[ ] Resolve release-pipeline and shared-history enforcement decisions; record any retained exception as a gap.<br>[ ] Update all front-door, product, security, migration, release, and support docs.<br>[ ] Verify assets, checksums, SBOMs, attestations, archives, labels, and public downloads.<br>[ ] Perform final live platform and distribution proof last, then complete Gate 6. | All affected owners.<br>Exit: every v3.0 success criterion and the [Evaluation And Release Bar](evaluation-and-release-bar.md) done definition has revision-bound evidence. |
| 12. V3.x enhancement trains | [ ] Activate one `Next` ID or tightly coupled group at a time.<br>[ ] Preserve v3 compatibility; defer breaking changes to the next major line.<br>[ ] Apply the same red-test, privacy-label, migration, docs, GUI QA, and release-evidence rules as v3.0.<br>[ ] Use the default train order; within an eligible train, sequence by measured user burden, not novelty.<br>[ ] Reorder trains only through a recorded dependency and user-value decision.<br>[ ] Re-score after each minor release without silently promoting `Later` or `Moonshot` work. | Closest canonical owners.<br>Exit: every accepted `Next` ID is shipped, moved with evidence, or retired by user-approved decision. |
| 13. V3 line closure | [ ] Confirm every accepted ID and inventory item has a final disposition.<br>[ ] Move completed child plans and evidence to canonical completed owners.<br>[ ] Record compatibility guarantees, unsupported paths, retained exceptions, and the v4 backlog.<br>[ ] Audit docs, architecture, security, dependencies, duplication, migration, GUI, packages, and public artifacts. | Planning, harness, release, and all affected owners.<br>Exit: no active v3 work remains outside this plan, current state is compact, and the next major line starts from an explicit backlog. |

## Verification

Every child feature starts with:

```bash
./init.sh
npm run harness:plan -- --since <valid-ref>
```

Minimum planning and documentation gate:

```bash
npm run harness:check
npm run lint:docs
npm run lint:language
npm run lint:file-size
git diff --check
```

Frontend or desktop behavior gate:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run test:e2e:smoke
```

Rust, migration, security, source, model, pack, or compatibility work adds the
focused crate tests and:

```bash
npm run lint:architecture
npm run lint:security
npm run lint:sqlx
npm run verify:rust
```

Milestone and release cuts run:

```bash
npm run verify:full
npm run test:e2e:all:budget
node scripts/dev/run-cargo.mjs test --workspace --all-features
```

Release cuts also run current package, public-artifact, supply-chain, migration,
rollback, and installed-app commands selected by the verification matrix.
Evidence records the command, revision, platform or fixture, exit status,
relevant result, and caveat.

## Progress

| Date | Status | Notes |
| --- | --- | --- |
| 2026-07-18 | Drafted | Consolidated v3 strategy, 233 indexed ideas, the foundation plan, maintained roadmap commitments, open debt, testing gaps, research evaluations, and deferred release work. Activated canonical routing and absorbed the foundation plan. Awaiting Gate 0 approval. |

## Discoveries

- The v3 package is comprehensive strategy but did not previously have a
  comprehensive execution owner.
- The prior foundation plan is a valid storage slice but is not registered as
  active and covers only part of Milestone 2.
- The live duplication gate is zero while DRY-003 remains marked open.
- Several maintained docs still describe the already-published v2.9.5 release
  as a candidate.
- Several testing “future improvements” already exist in source, so Milestone 0
  must reconcile docs before creating redundant infrastructure.
- The ranked index contains 102 `Now` and 76 `Next` ideas. They require
  consolidation into user outcomes, not 178 independent features.

## Decisions

- Treat v3 as a major line: v3.0 freezes durable contracts and ships the first
  coherent vertical product; v3.x delivers accepted dependent enhancements.
- Accept `Now` and `Next` items, defer `Later` and `Moonshot` items, and retain
  all cut lines unless the user approves a future product-boundary change.
- Absorb the foundation plan into Milestone 2 and retire the separate file.
- Keep the existing crate graph unless a milestone proves an ownership gap that
  cannot be solved by an existing owner.
- Put platform-specific live distribution proof at the end of the release
  stream.

## Outcomes

- Pending implementation and verification.

## Handoff

- Current state: master plan drafted; no v3 implementation has started.
- Evidence: repository inventory, live state files, plan index, idea index,
  roadmaps, debt tracker, docs marker audit, and current harness baseline.
- Next step: obtain Gate 0 user approval, complete Milestone 0, then activate
  Milestone 1 as the sole feature.
- Open risks: scope remains large, contract freeze is irreversible within the
  v3 compatibility line, and some final distribution evidence depends on
  external credentials.
