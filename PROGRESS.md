# Progress

Last updated: 2026-07-16

## Done

- The full repository refactor plan and ownership blueprint are locked in
  `docs/plans/active/current-work.md` and
  `docs/plans/active/repository-refactor-blueprint.md`.
- The earlier local harness checkpoint remains preserved at
  `docs/harness/evidence/harness-standard-contract-2026-07-14.md`.
- An adversarial review found that the checkpoint encoded local exceptions to
  the canonical `harness-engineering` contract. A corrective feature now owns
  the canonical remediation without rewriting the historical transition.
- The corrective harness implementation and full local gate passed for its
  completed scope.
- The target Rust ownership graph is implemented across security, domain,
  network, platform, storage, intelligence, sources, application, assistance,
  local AI, documents, credentials, notifications, and external AI crates.
  `jobsentinel-core` is deleted, storage no longer exposes a raw SQLx pool, and
  the Tauri crate delegates product behavior through `jobsentinel-application`.
- The Rust crate graph, desktop application composition, frontend platform
  routing, and development-runtime ownership are implemented. The active
  blueprint still requires script-test ownership, structural exception
  reduction, and a final whole-repository audit.

## In Progress

- Active feature: `full-repository-refactor`
- Status: `active`
- Objective: Replace the legacy Rust mega-crate and remaining mixed repository
  ownership with the crate, application, desktop, frontend, and support
  boundaries locked in the executable architecture contract.
- Branch: `refactor/full-repo-v2.9.5`
- Current slice: `jobsentinel-application` now constructs configuration,
  storage, credentials, scheduler, and browser-import services. The Tauri
  bootstrap only adapts that service graph and bridges desktop events. The
  frontend command, event, and notification clients now live under `platform/`.
  The central registry, state, dev-only vitals, runtime loader, and all
  feature-specific simulators live under `dev-runtime/` behind enforced
  development and ownership boundaries. All 24 former root-level scripts now
  live under explicit `checks`, `dev`, `harness`, or `release` owners, and the
  topology contract rejects future root-level scripts. The source duplication
  ceiling fell from 810 lines across 40 regions to 778 lines across 38 regions.
- Next action: reorganize script tests under matching owner directories, reduce
  structural debt and exceptions, then run the final whole-repository audit.

## Deferred

- Hosted CI remains intentionally absent under the named
  `pre-alpha-private-no-ci` user override. It is not part of the current cleanup
  slice.

Keep this as the current snapshot. Put command history and long evidence under
`docs/harness/evidence/`.
