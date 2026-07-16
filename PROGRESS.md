# Progress

Last updated: 2026-07-15

## Done

- The full repository refactor plan and ownership blueprint are locked in
  `docs/plans/active/current-work.md` and
  `docs/plans/active/repository-refactor-blueprint.md`.
- The earlier local harness checkpoint remains preserved at
  `docs/harness/evidence/harness-standard-contract-2026-07-14.md`.
- An adversarial review found that the checkpoint encoded local exceptions to
  the canonical `harness-engineering` contract. A corrective feature now owns
  the canonical remediation without rewriting the historical transition.
- The corrective harness implementation and full macOS local gate passed. Its
  native Windows 11 verification remains explicitly blocked, not inferred.
- The target Rust ownership graph is implemented across security, domain,
  network, platform, storage, intelligence, sources, application, assistance,
  local AI, documents, credentials, notifications, and external AI crates.
  `jobsentinel-core` is deleted, storage no longer exposes a raw SQLx pool, and
  the Tauri crate delegates product behavior through `jobsentinel-application`.
- Retired frontend, script, documentation, test-support, and Rust paths are
  enforced by the repository topology contract. Hosted CI is absent under the
  named `pre-alpha-private-no-ci` user override; this remains a deliberate
  nonconformance with the canonical `harness-engineering` CI requirement.

## In Progress

- Active feature: `full-repository-refactor`
- Status: `active`
- Objective: Replace the legacy Rust mega-crate and remaining mixed repository
  ownership with the crate, application, desktop, frontend, and support
  boundaries locked in the executable architecture contract.
- Branch: `refactor/full-repo-v2.9.5`
- Verified checkpoint: `npm run verify:full`, the 286-test Chromium and WebKit
  E2E lane, and the Rust all-features workspace lane passed on native macOS 27.0
  arm64. The standard initializer passed its three smoke checks. SQLx offline
  metadata is current and generated gate output is removed after verification.
- Next action: run the Windows initializer and script contracts on a native
  Windows 11 host, attach host-bound evidence, then decide the final feature
  transition without claiming canonical CI compliance.

## Blocked

- Final cross-platform evidence is blocked on native Windows 11. Run
  `pwsh -File ./init.ps1` and `npm run test:scripts` on Windows 11. Cross-shell
  PowerShell on macOS is not Windows proof.
- Canonical CI compliance is not blocked on evidence: it is intentionally unmet
  because hosted CI was removed by explicit user direction. The repository
  records this as `pre-alpha-private-no-ci`, not as a canonical exception.

Keep this as the current snapshot. Put command history and long evidence under
`docs/harness/evidence/`.
