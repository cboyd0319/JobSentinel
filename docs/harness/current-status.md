<!-- Owns current work selection, execution state and the immediate development handoff. -->

# Current Status

Last updated: 2026-11-06

## Execution

- Active feature: `v3-release-candidate`
- Status: `active`
- Development resumed; approved core fixes and release engineering are reviewed and locally verified.
- Follow the approved [release-first queue](../plans/v3/master-exec-plan.md#remaining-development-queue).
- Candidate: `feat/v3-release-candidate`, based on core `4b96e802`.
- Engineering baseline: `4c811f5a`, committed on `agent/goal-v3-baseline`.
- Next: resolve the [R1 freeze prerequisites](../plans/v3/evaluation-and-release-bar.md#r1-stability-plan),
  record the frozen source SHA externally, then begin Stability.
- [Preparation evidence](evidence/v3-release-candidate-2026-11-06.json)
  records the passing full development gate, reviews and earlier interrupted or failed runs.

## Preserved Scope

- `feat/v3-major-line` at `299779fb` preserves PR #329 and all Next implementation.
- R13/E15 development acceptance and partial P08/N15 remain on that branch, outside v3.0.
- D0 development acceptance is retained; it does not establish release readiness.
- V3.0.1 targets fixes/polish. Substantial enhancements resume in v3.1+.
- The master plan retains all 105 Now / 82 Next dispositions and the Gate 5 boundary.

## Open Release Evidence

- Final full phases remain Stability → Performance → Security, in order, before publication.
- Existing M11 and retrospective audit records remain partial, not current passes.
- R1 planning is active; no final release phase or native VM test has passed.
- Windows 11, Linux, exact macOS 26 and enforced 8 GiB proof remain open.
- Production trust, signing/notarization, Region artifacts and public-download verification remain open.
- Hosted general CI remains absent under `pre-alpha-private-no-ci`; its release decision remains open.
- Keep governed Qwen and numeric thresholds unchanged. Workbench policy remains expired and fail-closed.
