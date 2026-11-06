<!-- Defines required release evidence and distinguishes it from focused development verification. -->

# Evaluation And Release Bar

V3 should not be considered ready because the ideas are exciting. It should be
ready only when the product works across real job-search workflows, source
classes, resumes, local models, browser capture paths, privacy boundaries, and
platforms.

## When To Run These Checks

The master plan's [remaining development queue](master-exec-plan.md#remaining-development-queue)
owns timing. The approved v3.0 core proceeds to qualification after release-critical
engineering; Next enhancements and broad cleanup do not block it.

Use focused regression checks while preparing the candidate. Then run the
[Release Contract](../../developer/RELEASING.md#mandatory-final-release-phases)'s
separate full Stability, Performance and Security phases, in order, for every release.
Reuse evidence only while its candidate, environment and inputs remain applicable.

Local Mac and the running Windows 11 VM are authorized for testing after development.
Runner safety and availability remain prerequisites; no platform coverage is waived.
Current Mac results do not establish other-platform, exact macOS 26 or modest-hardware coverage.
Numeric limits and release safety requirements remain unchanged.

## R1 Stability Plan

The release coordinator owns execution and the pass decision. Engineering baseline
`4c811f5a` passed development verification; it is not an R1 pass. Resolve the
trusted-update prerequisite below before freeze. Once resolved,
record the accepted planning commit's actual full SHA externally before building or
testing. A draft plan is not a source freeze; do not guess the SHA or move source during R1.
Keep the approved v3.0 core, Gate 5 cut, 105 Now / 82 Next dispositions and governed
Qwen models unchanged; Next consumers remain outside this candidate.

### Entry and evidence

Entry requires the reviewed engineering baseline, this platform/acceptance matrix,
the committed source SHA and a credential-isolated runner for each executed row.
Draft v3.0.0 release notes and changelog metadata are prepared under the Release Contract;
validate them before package builds. The release remains unpublished.
Missing runners block their rows, not independent work on an available runner.
Use synthetic data in disposable app storage; never test against the user's live store.
Retain exact tool versions, source tree, OS/architecture, fixture hashes, commands,
exit codes, UTC start/end times, installer hashes and observed outcomes.

Set `EVIDENCE_ROOT` to an external directory for the frozen SHA. Keep `r1/commands.json`,
`r1/platforms.json`, `r1/journeys.json`, `r1/recovery.json`, `r1/accessibility.json`,
`r1/sustained-use.json` and `r1/decision.json` there, with raw logs/artifact manifests
alongside them. Each scenario records expected/observed behavior, platform and artifact
identity, result and unresolved gap. Failed/blocked/skipped records remain explicit.
The Release Contract owns the eventual publication-proof schema; do not fabricate
passing records or upload these working records before qualification is accepted.

### Frozen platform matrix

The advertised target set follows the release workflow; unavailable rows are not dropped.

| Qualification row | Candidate artifact and required execution | Available evidence and prerequisite |
| --- | --- | --- |
| macOS 26+ arm64 | Universal DMG/app; installed arm64 journeys, vault, OS fallback and recovery | Local macOS 27.2 arm64/64 GiB is authorized; it does not prove exact macOS 26 or constrained memory. |
| macOS 26+ x86_64 slice | Same universal artifact; exercise the x86_64 slice on macOS where supported | Rosetta availability is unverified. Record translation explicitly; require additional hardware only for a claim translation cannot establish. |
| Windows 11, x86_64 installers | MSI and NSIS; install/uninstall, Windows workflows, key persistence and recovery | Authorized ARM64 Windows 11 VM can exercise x64 installers under OS translation. Record that limit; its 10 GiB and pagefile do not prove 8 GiB zero-swap. |
| Linux x86_64 | AppImage and Debian package; installed journeys, vault/passphrase fallback and recovery | No local Linux runner. Define a concrete VM scope before any provisioning; conditional willingness is not an executed environment. |
| Enforced modest hardware | Complete model-free Essentials journey and persistence on an enforced 8 GiB zero-swap profile | No current qualifying profile. R1 proves functional reliability; R2 measures the unchanged numeric budgets below. |

The Windows guest-agent executes as SYSTEM and is not an approved repository test
launcher. Before Windows execution, establish a supported credential-isolated user
launcher, bounded filesystem/network/share access, pinned Node/npm/Rust and native
MSVC/SDK tools. Existing restricted account names and PATH probes do not prove this.
This plan adds no VM provisioning or hosted dispatch authority. Existing local
Mac/Windows testing and the explicit update-identity authorization below remain in force.

### Approved update-trust preparation

The user approved creating/storing `jobsentinel-update-publisher-v1` as a concealed item
in the 1Password Private vault, enrolling only its public key, and signing exact unpublished
3.0.0/3.0.1 qualification artifacts before installed R1 journeys. Enroll and verify
public trust first, freeze source second, then build and sign the exact artifacts.
Final full R3 Security still follows R2. Approval is not execution evidence.

| Input | Approved scope and remaining preparation |
| --- | --- |
| Public registry | `crates/jobsentinel-application/src/update_preflight/review.rs`, `ReleasePublisher::production_trust()`, contains only the approved public ID/key/revocation metadata; enrollment passed independent review and full development verification. |
| Publisher identity | Approved `jobsentinel-update-publisher-v1`; public-key enrollment is reviewed and verified. This is distinct from pack publisher identities and the public test seed. |
| Concealed signing variable | Proposed `JOBSENTINEL_UPDATE_PRIVATE_KEY_PKCS8_B64`; the CLI accepts a caller-selected `--key-env`, and no production update variable is currently defined. |
| Secret-store inputs | Concealed “JobSentinel Update Publisher v1” item in the approved Private vault, Ed25519 PKCS#8 base64 injected into the caller-selected signing variable, matching raw 32-byte public-key hex, publisher ID and authority to use it for the exact qualification artifact. No secret values enter evidence or the repository. |
| First artifact target | A macOS aarch64 Essentials v3.0.0 DMG from the eventual frozen candidate, with exact checksum and adjacent `.manifest.json`/`.sig`; use reviewed `macos`/`aarch64` edition and compatibility/readers metadata. Universal first-install artifacts do not imply a universal update-manifest architecture. |
| Positive-path counterpart | Qualification-only 3.0.1 build from the same code with a coherent version-only metadata/lock delta in a separate checkout; not published or substituted for the 3.0.0 candidate. This version-only preparation is authorized. |

The signing consumer is `npm run release:sign-update` with exact package/spec paths,
`--publisher-key-id`, `--expected-public-key-hex` and the approved `--key-env` name.
Load the installed 1Password skill and host execution gate before any eventual secret
operation. Keep private material concealed and injected only into the approved consuming
process; no key file, command argument or repository value. Enrollment changes the
source candidate, so review/verify it before freezing. This preparation is not an R3 pass.

### Proposed installed update/rollback route

Same-version repair is not a substitute: `connection/update_journal.rs` rejects equal
source/target versions and requires the source version to match the running build.
`update_preflight/startup.rs` authenticates the signed target edition/version against
the actual running binary. Changing only a manifest version cannot satisfy this contract.

After the approved trust preparation is verified:

1. Build the frozen 3.0.0 candidate and the separately identified 3.0.1 counterpart for
   macOS/aarch64. Keep both no-account DMGs and app bundles under external
   `r1/update/artifacts/candidate/` and `r1/update/artifacts/counterpart/`; record both
   source trees, version-only diff, coherent Cargo/npm/Tauri/lock versions and checksums.
2. Produce exact signed sidecars for each real DMG. The 3.0.1 target accepts source
   `[3,0,0]`; the 3.0.0 rollback target accepts source `[3,0,1]`. Both require matching
   Essentials/macOS/aarch64 identity. Derive compatibility and all eight reader ranges
   from the Rust inventory, not fixture guesses. Current code owns database schema 2,
   migrations through 34 and backup/export format 1; verify those actual installed values.
   Keep migration files/checksums unchanged in the version-only counterpart, so its
   data remains readable by the candidate. Do not claim new-format migration from this run.
3. Use the existing macOS package-smoke data contract: a temporary
   `jobsentinel-macos-smoke-` root and one ephemeral database key held across relaunches.
   Reuse `macos-package-contract.mjs` launch/redaction helpers under verified process
   isolation; they redirect app/config data and configure incognito app views. This
   isolates synthetic user data; it does not override the update publisher registry.
4. Install/copy and launch the actual 3.0.0 app in task-owned storage, create synthetic
   records, then use the real reviewed local-update UI to select/apply the signed
   3.0.1 DMG. Complete the real installer handoff in the task-owned app location,
   restart 3.0.1 with the same isolated data root/key, and verify journal completion,
   displayed version, exact records and backup state. Do not replace the live user app.
5. From the actual 3.0.1 app, review/apply the signed frozen 3.0.0 DMG, complete the
   native handoff and restart the actual candidate using the same isolation. Confirm
   rollback labeling, authenticated startup, unchanged data and retry/repair behavior.
   Record both artifact identities; any inaccessible OS step remains a gap.

Both binaries need the approved public update identity. The only secret signing input
is consumed by the separately authorized signer; no production key enters either build
or installed test. This authorized route has not been executed.

### Automated lane

Run from the frozen checkout in verified isolation with the repository-pinned tools.
Use `pwsh -File ./init.ps1` instead of `./init.sh` on Windows. Capture every command's
output and exit code under `EVIDENCE_ROOT/r1`; do not infer a pass from a wrapper starting.

```bash
./init.sh
npm run clean:generated
npm run release:check-version -- v3.0.0
npm run verify:full
npm run lint:sqlx
npm run test:e2e:all:budget
node scripts/dev/run-cargo.mjs clippy --workspace --all-features -- -D warnings
node scripts/dev/run-cargo.mjs test --workspace --all-features
```

The full gate includes default Rust tests, frontend/script checks, builds and Chromium
smoke; the explicit commands add all-browser and shipped embedded-ML feature coverage.
Inventory ignored tests and bind each required native/model scenario to an attended,
scoped execution or a remaining gap; never enable all ignored tests indiscriminately.
Use current governed model caches where available; absence does not justify a model swap.
Development results and the 21 historical default-suite skips are context, not R1 passes.

Build and inspect the selected artifacts using the exact commands in the
[Native Platform Assets](../../developer/RELEASING.md#native-platform-assets) contract:
Mac universal build plus launch/install smoke, Windows MSI/NSIS build, Linux AppImage/DEB
build and package inspection. Record source SHA and package hashes before installation.
Keep no-account/unsigned labels truthful; final signature/notarization and supply-chain
acceptance belongs to R3. Approved update signatures are required before installed
positive update/rollback journeys, after the frozen artifacts are built.

### Installed acceptance matrix

Execute each applicable row on the advertised OS/artifact combinations above. Cover every
shipped click/action using [End-To-End User Scenarios](#end-to-end-user-scenarios);
unsupported optional integrations must show their documented fallback.

| Row | Required scenarios | Pass evidence |
| --- | --- | --- |
| Essentials and core workflows | Fresh model-free setup without accounts; public source check; visible browser import; synthetic civilian/veteran resume; deterministic matching; packet review; tracking/reminders; interview/pay review; support report | All scenario expectations pass, final user review is preserved, records survive restart, and support output omits synthetic private markers. |
| Installed platform and optional components | Native file picker/drop, deep links, notifications, permissions, browser companion, vault/fallback; governed model setup/removal and unavailable-model behavior; pack/Region lifecycle | Installed behavior and unavailable-platform fallback match the shipped surface; no fixture-only substitute for native claims. |
| Persistence and portability | Save/relaunch; export/import; encrypted backup/restore; settings and component removal; offline reopen | Record identities, counts and selected synthetic values remain correct; removed components stay removed and user data is preserved. |
| Migration and rollback | Fresh v3.0.0 baseline; supported v3.x migration with backup; compatible rollback; unsupported-newer/pre-v3 refusal; failed migration retry | Accepted paths preserve data; rejected paths preserve primary/WAL/backup state and provide usable recovery/support output. |
| Interrupted and failed operations | Cancel import/download; kill/restart during import, migration and update/restore; unavailable source/network/model/vault; corrupt/incomplete backup or package | No silent loss, duplicate durable action or unusable half-state; retry/repair works with explicit user review. |
| Installed update workflow | Review/cancel/refuse untrusted or incompatible package; positive trusted update and compatible rollback on disposable data | Actual native execution, restart and preserved data are proven. CLI-to-Rust fixtures do not establish this row. Candidate-valid trusted artifacts remain a prerequisite; no trust enrollment is implied. |
| Accessibility and usability | Keyboard-only and screen-reader journeys; focus after dialogs/errors; empty/loading/error states; narrow width, high zoom, reduced motion and novice tasks | Every shipped action is reachable and understandable; no focus trap, unlabeled control or obscured required action. Record reader/browser/OS versions and observations. |
| Sustained use | Synthetic working-day run per supported OS; eight hours is proposed, with duration selected and recorded from risk before execution. Repeat the core save/import/track cycle, cancel/retry one failed operation, and restart twice | No unexpected crash, hang, unhandled error or data mismatch; final restart and backup/restore succeed. This protocol makes no performance-budget claim. |

The `ReleasePublisher::production_trust()` enrollment passed review and development
verification; source acceptance and freeze remain pending. Follow the
[approved update-trust preparation](#approved-update-trust-preparation) in its stated
order. The test-only coordinator does not prove installed behavior; do not add fixture
trust, a smoke bypass or a passing exception.

### Exit and change handling

R1 passes only after all required matrix rows and applicable suites pass for the exact
frozen source/artifacts, blocking defects are resolved and the coordinator accepts the
recorded evidence and remaining risks. Missing native hardware, ignored required cases,
failed recovery, unavailable trust or deferred rows leave R1 incomplete; no R2 starts.
If a correction is required, record the defect and new source/artifact identity, then
repeat affected checks and downstream evidence under the Release Contract. Do not keep
calling an edited candidate frozen. R2 budgets/commercial comparisons and full R3
security/trust/supply-chain work remain separately planned phases, not passes inferred
from R1 or from this development checkpoint.

## Release Bar Summary

Before v3 ships, JobSentinel should prove:

- A novice user can set up a search and understand the main workflow.
- A novice user can install, launch, finish first-run setup, and reach useful
  job-search help without accounts, external AI, or model downloads.
- The dashboard gives useful next actions without requiring spreadsheet work.
- Source checks and browser companion flows handle public and restricted
  boundaries correctly.
- Resume/job matching explanations are evidence-backed and eval-tested.
- Application packet and tracker flows preserve final user review.
- External AI remains optional, previewed, approved, and locally logged.
- Sensitive data stays local unless the user explicitly chooses otherwise.
- Windows 11+, macOS, and Linux are verified for the major workflows.
- Essentials package works on modest hardware without large model downloads.
- V3 migration, backup, compatible rollback, and unsupported-newer-data handling
  are verified.
- UK, EU, and India starter framework paths are verified if shipped in v3.
- OS-native model and OCR helpers are verified as reviewable suggestions with
  deterministic fallbacks.
- Commercial-superiority workflows beat tracked alternatives on defined
  metrics for at least the main install, import, match, apply, track, interview,
  offer, recovery, and export paths.

## End-To-End User Scenarios

Create manual and automated verification scenarios for:

- first-run setup without accounts
- install, update, repair, and rollback paths
- saved search setup
- official source check
- employer careers discovery
- public ATS import
- restricted-source browser session
- Browser Import or browser companion visible import
- native deep link, notification, file association, and permission fallback
- duplicate or repost detection
- job risk and ghost-job review
- resume import and parsing
- resume-to-job match
- application packet preparation
- application tracking state changes
- reminder and follow-up
- interview prep
- offer and pay review
- external AI public-job summary
- external AI sensitive-data blocked path
- safe support report
- export and backup
- edition selection and Essentials first-run path
- security doctor, consent revocation, privacy receipt, and repair flows
- regional starter setup for UK, EU, or India when a region pack ships
- OCR-assisted visible import from user-selected content
- OS-native micro-assist fallback when the platform feature is unavailable
- commercial benchmark demo against tracker, resume-scanner, browser-copilot,
  and auto-apply product classes

Each scenario needs success criteria, expected privacy boundary, and evidence
captured outside private user data.

## Source Verification

For every native source adapter:

- source manifest exists
- source class is declared
- rate limit is declared
- restricted status and rationale are declared when needed
- fixtures cover list and detail parsing
- parser returns canonical records
- URL validation is covered
- response size limits are covered
- safe error messages are covered
- source health appears in UI

For restricted sources:

- warning appears before sign-in or restricted action
- source session is user-started
- no session material is stored
- no hidden browser state is read
- no scheduled background refresh occurs
- imported records require local review
- privacy reminder and close controls work

## Browser Companion Verification

If v3 includes an extension or side panel, verify:

- pairing is user-approved
- token or key material rotates
- command scope is enforced
- browser origin is recorded
- revocation works
- extension cannot read local database directly
- extension cannot access vault material
- visible-page import works
- hidden/background page import is rejected
- copied text and URL token scrubbing work
- review queue prevents silent durable records
- Chrome, Edge, Firefox, and Safari strategy is documented

## ML And Ranking Verification

For local intelligence:

- model lock validates exact revisions and hashes
- model doctor handles missing, stale, and mismatched models
- cache paths are portable and user-visible
- fallback behavior is clear
- dense retrieval and reranker behavior pass eval fixtures
- Qwen3 requirement-level retrieval and reranking pass hard-negative fixtures
- hard blockers cap otherwise strong matches
- exact skill matches do not over-expand related skills
- seniority mismatch is explained
- "why not matched" works
- adversarial posting text is handled as untrusted input
- fairness counterfactuals are included
- latency and memory are measured on modest-hardware profiles
- OS-native local model helpers are measured against deterministic and Qwen3
  alternatives for accepted task types
- regional terminology fixtures pass before a region pack is labeled ready

Do not ship ranking changes without eval deltas and explanation review.

## Regional Pack Verification

For each region pack that ships:

- region manifest validates
- source classes are declared
- pay and currency normalization works
- location and work-mode parsing works
- CV or resume profile behavior is documented
- taxonomy bridge provenance is stored
- incomplete-coverage labels appear where appropriate
- source warnings use region-appropriate plain language
- Qwen3 and deterministic matching pass regional terminology fixtures
- region pack can be installed, disabled, removed, and upgraded independently

## Agent Workflow Verification

For every v3 agent workflow:

- declared inputs and outputs
- visible task plan
- privacy labels
- local-only path or external AI path
- approval points
- cancel path
- error state
- audit trail
- deterministic fallback where possible
- no final submission automation
- no hidden restricted-source access
- no unrestricted shell, file, or network access

Agents must be tested with malicious job postings, hidden instructions, missing
inputs, conflicting requirements, and low-confidence data.

## External AI Verification

For every provider-backed workflow:

- feature privacy label is registered
- provider is disabled by default
- preview is shown
- redaction is applied when enabled
- user can edit, cancel, or approve
- backend validates outgoing payload
- sensitive data is blocked unless feature-specific opt-in exists
- metadata-only request history is stored locally
- provider errors are safe and understandable
- local fallback exists or the feature is clearly labeled external-AI-required

No feature may bypass the gateway.

## Privacy And Security Verification

Run threat reviews for:

- browser companion loopback protocol
- local MCP server
- source packs
- model downloads
- downloadable pack registry
- sandboxed dynamic adapters
- OS-native model and OCR helpers
- external AI provider payloads
- safe support reports
- encrypted backup and restore
- multi-profile vaults
- import/export
- URL handling
- extension permissions

Required checks:

- secret scanning
- dependency and crate pin checks
- action pin checks
- file-size bloat checks
- URL validation tests
- CSP and XSS tests
- keyring and passphrase tests
- command execution boundaries
- source policy manifest validation
- privacy-label manifest validation
- privacy receipt validation
- consent reset and revocation tests
- Security Doctor repair-flow tests
- pack quarantine and self-test validation
- sandbox denial tests for filesystem, shell, credential, database, and ambient
  network access
- OCR provenance and review tests
- OS-native model fallback tests

## Migration And Rollback Verification

Because v3 is the first long-term compatibility boundary, verify:

- fresh v3 install
- v3.0.0 is the first supported compatibility baseline
- pre-v3 readers, migration shims, fixtures, and release claims are absent
- backup-before-v3.x migration
- failed v3.x migration retry
- v3.x backup restore
- compatible v3 patch rollback
- unsupported-newer-data detection
- source pack compatibility
- model pack compatibility
- settings compatibility
- browser companion permission reset when protocol changes
- safe support report when migration fails

## UX And Accessibility Verification

V3 must be manually verified across:

- keyboard navigation
- screen reader labels
- focus states
- loading states
- empty states
- error states
- narrow width
- high zoom
- reduced motion
- low contrast risk
- nontechnical copy
- first-run flow
- advanced settings hidden behind expert mode

Use real novice-user tasks, not only component snapshots.

## Cross-Platform Verification

The current execution scope and runner gaps are frozen in the [R1 matrix](#frozen-platform-matrix).
Local Mac and running Windows 11 VM testing are authorized after development; Linux
provisioning needs a concrete scope. Missing native rows remain open, never passed by
proxy. Record these limitations in Gate 6 evidence; frozen thresholds remain unchanged.

Required platform checks:

- Windows 11 install, launch, vault, file import/export, browser companion,
  model cache, and source checks.
- macOS install, launch, vault, file import/export, browser companion,
  model cache, and source checks.
- Linux install, launch, vault or passphrase fallback, file import/export,
  browser companion strategy, model cache, and source checks.
- Essentials package install, launch, setup, source check, resume import,
  deterministic matching, tracker update, pay review, and support report on
  modest-hardware profiles.
- Native OS integrations for each platform that ships them, including fallback
  behavior when the platform feature is unavailable.
- OS-native model and OCR helpers for each platform that ships them, including
  unavailable-platform fallback.

If a platform lacks a feature, the UI must say so plainly and offer a fallback.

### Essentials Numeric Thresholds

These Gate 4 release thresholds are derived from measured evidence on the
macOS 27 arm64 host and the enforced 8 GiB zero-swap Linux guest recorded in
`docs/harness/evidence/`. They bind release claims only for measured
platforms; Windows 11 and macOS 26 must be measured before claiming them.

| Threshold | Limit | Measured basis |
| --- | --- | --- |
| Model-free macOS DMG size | <= 25,000,000 bytes | 14,224,509 bytes |
| Model-free installed macOS app size | <= 50,000,000 bytes | 29,704,192 bytes |
| Model-free Debian package size | <= 30,000,000 bytes | 16,181,176 bytes |
| Model-free AppImage size | <= 120,000,000 bytes | 89,344,504 bytes |
| Model-free installed Linux binary size | <= 60,000,000 bytes | 39,689,664 bytes |
| Installed first visible window, polling upper bound | <= 2,000 ms | 825 ms, 582 ms, 277 ms |
| Complete Essentials first-run journey peak memory on an enforced 8 GiB zero-swap profile | <= 1,073,741,824 bytes with zero memory-limit and OOM events | 687,190,016 bytes |
| Persistence relaunch peak memory on the same profile | <= 1,073,741,824 bytes | 717,479,936 bytes |
| Aggregate app-coalition observed maximum RSS on an unconstrained macOS host | <= 536,870,912 bytes | 246,251,520 bytes |
| Model-payload filenames inside model-free packages | exactly 0 matches | 0 matches |

The stronger-local download payload is not a threshold: the lock owns the
exact 2,406,043,460-byte required total for the governed Qwen3 pair, and
changing it requires a model-lock change with fresh calibration evidence.

## Triage Framework

Classify each v3 idea before implementation:

| Class | Meaning |
| --- | --- |
| Now | Strong user value, clear boundaries, fits existing architecture, testable. |
| Next | Valuable but needs a prototype, source review, eval data, or UX study. |
| Later | Valuable but depends on other v3 primitives. |
| Moonshot | Big upside, high uncertainty, needs research before product commitment. |
| Cut | Conflicts with Rule 0, user control, platform boundaries, or product trust. |

Every accepted idea needs:

- user problem
- data boundary
- source or provider boundary
- architecture owner
- tests
- manual verification path
- docs update path
- rollback or disable strategy

## Commercial Benchmark Verification

Before v3 ships, run a product benchmark against commercially similar tools.
Use current public docs and hands-on testing where feasible.

Benchmark categories:

- job tracker and CRM
- resume scanner and builder
- browser save, autofill, and copilot
- job board and source aggregator
- AI auto-apply
- general chatbot workflow

For each category, compare:

- account requirement
- local-first privacy posture
- install and first-use time
- visible job import effort
- application logging effort
- resume evidence quality
- match explanation quality
- source breadth
- recovery behavior
- export and lock-in
- accessibility and nontechnical usability
- modest-hardware behavior
- regional readiness

V3 does not need to match unsafe final-submit automation, but it must make the
safe user-controlled path faster, clearer, and more helpful.

## V3 Done Definition

V3 is not done until:

- All accepted v3 features are represented in maintained docs.
- Feature privacy labels cover every sensitive or external-AI-capable workflow.
- Source manifests cover every native source.
- Agent workflows have explicit approval gates.
- Browser companion flows pass security review.
- ML ranking changes pass eval and manual explanation review.
- Main README and wiki reflect the shipped v3 experience.
- Release assets, checksums, SBOMs, and attestations are produced.
- Manual UI verification covers every click and action in the shipped surface.
- Compatibility and rollback docs define v3.0.0 as the first supported baseline
  and make clear that pre-v3 upgrades are unsupported.
