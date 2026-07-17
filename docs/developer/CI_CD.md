# Local Verification And Hosted Releases

JobSentinel has no hosted continuous integration during private pre-alpha
development. `scripts/harness/contracts/harness.json` owns the named
`pre-alpha-private-no-ci` user exception and the exact canonical requirements it
overrides. The installed `harness-engineering` standard defines no matching
private-repository exception, so this repository must not claim full canonical
CI conformance while the exception is active.

## Local Verification Lanes

Start with the smallest lane that can disprove a change:

```bash
./init.sh
npm run harness:plan -- --since <valid-ref>
npm run harness:check
git diff --check
```

Use `npm run verify:full` for shared contracts, broad refactors, uncertain
routing, or a repository-wide completion claim. It covers environment,
architecture, hard source limits, security, dependencies, documentation, types,
tests, builds, a bounded runtime journey, and Rust.

Local results are evidence for the host that ran them. They do not create a
remote shared-history gate. A skipped local check remains a gap.

## No-CI Enforcement

While the exception is active, `npm run harness:check` rejects any hosted
workflow with push, pull-request, merge-group, or scheduled triggers. It also
requires the authoritative CI list to remain empty and the retired
`.github/workflows/ci.yml` path to remain absent.

Restore authoritative CI and retire the exception before public alpha, external
contributor access, protected shared-history reliance, or any claim of canonical
CI compliance.

## Release Workflows

`.github/workflows/release.yml` is manual release automation.
`.github/workflows/verify-release-artifacts.yml` runs after a published release
or through manual dispatch. Neither workflow is continuous integration.

Dispatch, signing, upload, publication, and release-environment approval require
separate explicit authority. Workflow presence is not evidence that any release
ran. Release jobs target the GitHub `release` environment; required reviewers
must be configured and verified in GitHub before publication because repository
files cannot prove that external setting.

Release preflight includes `npm audit --audit-level=moderate` and
`cargo deny check advisories bans licenses sources`. Jobs use scoped permissions,
disable package lifecycle scripts during dependency installation, avoid shared
dependency caches before publication, and verify checksums, SBOMs, and staged
artifacts.

Release automation publishes both downloadable Agent Skills archives:
`JobSentinel-X.Y.Z-agent-skills.tar.gz` and
`JobSentinel-X.Y.Z-agent-skills.zip`. Use the ZIP for Windows-friendly extraction.
Verify both matching checksum sidecars and the Agent Skills tar.gz/ZIP archives
before relying on them.

## Portability Evidence

Run the shared local semantic core natively on every supported platform. The
current macOS host is macOS 27.0, which satisfies the macOS 26+ target. Native
Windows 11 remains unverified until `pwsh -File ./init.ps1` and
`npm run test:scripts` pass on a Windows 11 host. PowerShell on macOS is
cross-shell evidence only.

## Troubleshooting

- Invalid comparison bases and owner maps fail closed with a useful error.
- A hard-limit failure requires a cohesive split or a complete exact-path
  temporary ratchet in `scripts/harness/contracts/repository-structure.json`.
- A hook bypass leaves a local verification gap because no CI backstop exists.
- A native platform check that did not run must remain recorded as a gap.
