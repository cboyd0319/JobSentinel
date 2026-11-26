<!-- Owns current work selection, execution state and the immediate development handoff. -->

# Current Status

Last updated: 2026-11-25

## Execution

- Active feature: `v3-release-candidate`
- Status: `active`
- Follow the approved [release-first queue](../plans/v3/master-exec-plan.md#remaining-development-queue).
- The candidate for tag `v3.0.0` is the head of `feat/v3-release-candidate`: checkpoint `6c72871c`
  plus fail-closed key creation, the exact-draft pipeline, its local release route and the
  recovery key warning. No tag exists yet.
- The checkpoint's update and Region public trust are enrolled, reviewed and full-gate verified.
- The integrated tree passed `verify:full` and independent review:
  [evidence](evidence/v3-release-candidate-2026-11-26.json).
- Qualification: a draft built by the [local release route](../developer/RELEASING.md#local-release-route),
  with no hosted runner, then R1 Stability → R2 Performance → R3 Security on that draft, per the
  [R1 plan](../plans/v3/evaluation-and-release-bar.md#r1-stability-plan).
- Phase evidence goes only in `docs/releases/v3.0.0-final-phases.json` and its records;
  any source change after tagging needs a new candidate tag.
- Earlier [2026-11-21](evidence/v3-release-candidate-2026-11-21.json),
  [2026-11-20](evidence/v3-release-candidate-2026-11-20.json) and
  [2026-11-06](evidence/v3-release-candidate-2026-11-06.json) evidence covers its own trees.

## Preserved Scope

- `feat/v3-major-line` at `299779fb` preserves PR #329 and all Next implementation.
- R13/E15 development acceptance and partial P08/N15 remain on that branch, outside v3.0.
- D0 development acceptance is retained; it does not establish release readiness.
- V3.0.1 targets fixes/polish. Substantial enhancements resume in v3.1+.
- The master plan retains all 105 Now / 82 Next dispositions and the Gate 5 boundary.

## Open Release Evidence

- Final full phases remain Stability → Performance → Security, in order, before publication.
- Existing M11 and retrospective audit records remain partial, not current passes.
- No final release phase or native VM test has passed.
- Windows 11 and Linux are planned for local ARM64 UTM guests under x86_64 translation.
  Their toolchains, cross-builds and isolated launchers are not yet established.
- Exact macOS 26 and enforced 8 GiB proof remain open.
- Qualification signatures, OS signing/notarization, Region artifacts and public-download proof remain open.
- The local release route is unexecuted; tag push, draft upload and publication need explicit authority.
- Hosted general CI remains absent under `pre-alpha-private-no-ci`; its release decision remains open.
- Keep governed Qwen and numeric thresholds unchanged. Workbench policy remains expired and fail-closed.
