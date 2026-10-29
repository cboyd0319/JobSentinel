<!-- Owns current work selection, execution state and the immediate development handoff. -->

# Current Status

Last updated: 2026-10-28

## Execution

- Active feature: `v3-portable-app`
- Status: `active`
- Implementation goal: **paused** at the user's request after Serena setup.
  Resume with E15 development acceptance; broad qualification remains parked.
- Follow the [development queue](../plans/v3/master-exec-plan.md#remaining-development-queue):
  finish accepted engineering and code cleanup before broad qualification or release.
- Current work: E15 (`13e64abd`) portable startup/recovery and relocation implementation checkpoint.
  Focused checks pass; record acceptance next. Installed proof remains deferred.
- R13 development accepted at `70b813d7`; installed qualification remains R1.
- Evidence: `docs/harness/evidence/v3-shared-computer-privacy-2026-10-28.json`.

## Remaining Scope

- Milestones 0 through 10 record development checkpoints for 105 Now IDs. Historical labels do not
  establish current acceptance or release readiness.
- The 82 Next IDs have explicit outcomes and dependency groups in the master plan.
  R13 has development acceptance; the other 81 remain. Release acceptance is separate.
- Milestone 13 code cleanup moves before final QA. Release-pipeline implementation
  and remaining documentation/header/boundary repairs are development, not final testing.
- M11 broad qualification is parked until development is ready. Its earlier partial
  evidence and failures remain recorded, not passing or silently reset.
- Keep Gate 5's v3.0/Next release cuts separate while changing coding order.
- Later/Moonshot scope and prohibited behavior remain unchanged.

## Preserved Work And Evidence

- Serena 2.1.0: seven backends, Rust/TS bodies/callers, test sources and diagnostics verified.
  Separate main/worktree stdio servers are verified; reconnect the MCP client after restart.
  Root AGENTS links `.serena/AGENTS.md`; local overrides remain private.
- Documentation audit: 215 tracked Markdown files reviewed; current claims corrected,
  historical evidence retained. Docs checks and 36 focused documentation sensors pass.
- D0 is development-passing at `4b96e802`, the preserved v3.0 core source cut.
- D0 scope/results: `docs/harness/evidence/v3-source-compatibility-cleanup-2026-10-28.json`.
- Audit coverage/gaps: `docs/harness/evidence/v3-retrospective-audit-2026-10-28.json`.
- Partial M11 work: `docs/harness/evidence/v3-milestone-11-local-qualification-2026-10-28.json`.
- Workbench fixture aging is corrected: 11 focused tests pass with an explicit date.
  Production policy remains expired and fail-closed until genuinely reviewed.
- The bounded Mac reference comparison supports retaining governed Qwen. No model or
  numeric threshold change is approved. Reuse results instead of repeating comparisons now.
- Windows/Linux VM testing remains user-deferred. Current Mac27.2 evidence does not
  establish exact26 or enforced8GiB zero-swap qualification.
- Production app/Region enrollment, signing, notarization, installed journeys and
  public artifact checks remain late work. Hosted general CI remains absent under
  `pre-alpha-private-no-ci`. The release decision must state retained exceptions.

Standing release rule: final full phases are Stability → Performance → Security,
in order, before any release. The Release Contract owns their gates; development continues first.
