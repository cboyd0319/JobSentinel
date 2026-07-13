# Release Pipeline Audit And Optimization

Deferred on 2026-07-13 while the full repository refactor and cleanup take
priority. Re-evaluate these decisions against the final workspace during the
v2.9.5 readiness milestone.

Last updated: 2026-06-22.

## Problem

The `v2.9.1` release was successful, but the process took too long and spent
hosted runner time where local platform work was available. Hosted release run
`27990965207` took about 40 minutes end to end; Linux packaging took 12m43s,
macOS took 19m18s, and Windows took 24m46s. The no-account macOS package path
can be built and smoke-verified locally, so future no-account releases should
not default to hosted macOS unless we explicitly need hosted cross-platform
proof or Developer ID/Gatekeeper validation.

## Scope

In scope:

- Release workflow dispatch, platform selection, publication sequencing, and
  public verification.
- Local macOS build/upload documentation and evidence requirements.
- Cost and time reduction that preserves checksums, package verification, SBOM
  generation, attestation claims where applicable, and public asset checks.
- Release docs, CI/CD docs, harness manifest, active-plan routing, and release
  validation ledgers.

Out of scope:

- Product features.
- Signing-credential acquisition.
- Removing Windows, macOS, or Linux as supported platforms.
- Weakening Rule 0, package validation, unsigned/no-account labels, checksums,
  SBOMs, or explicit public verification.

## Audit Findings

| Severity | Finding | Evidence | Direction |
| -------- | ------- | -------- | --------- |
| High | Tag pushes automatically triggered a full hosted release, including macOS. | `release.yml` had a tag push trigger and `INPUT_PLATFORM` fell back to `all`; v2.9.1 run `27990965207` spent 19m18s on hosted macOS. | Make release publication manual from the selected tag ref; keep hosted `all` opt-in. |
| High | Public release verification was documented as automatic, but no `Verify Release Artifacts` run appeared for v2.9.1. | `gh run list` after publication showed Release and CI runs for `v2.9.1`, but not the verifier workflow; local verifier commands supplied the actual evidence. | Treat public verification as explicit until it is folded into the release workflow or manually dispatched. |
| Medium | Manual verifier platform scoping did not actually skip the macOS runner. | `verify-release-artifacts.yml` scoped the Ubuntu verifier by `inputs.platforms`, but the macOS job had no platform condition. | Skip the macOS job when manual `platforms` does not include `macos`. |
| Medium | Local macOS uploads differ from hosted artifacts. | Local DMGs can have checksum, package-smoke, and SBOM evidence, but not GitHub Actions build provenance attestations unless built in Actions. | Document the exception clearly; do not claim hosted SLSA provenance for local Mac artifacts. |

## Current Decisions

- Future no-account releases should default operationally to local macOS build
  and upload, then hosted Windows/Linux packaging.
- Hosted `all` remains available for explicit full cross-platform CI proof.
- Developer ID signed and notarized macOS releases still require the hosted or
  local Gatekeeper-required verifier path with Apple credentials.
- Public release verification must be run and recorded explicitly. For hosted
  assets, keep supply-chain verification on. For local macOS assets, use the
  no-supply-chain flag only for the macOS verifier and record the provenance
  exception.

## Milestones

1. Completed: close `v2.9.1` docs and validation ledgers as published evidence.
2. Completed: make release dispatch manual from a tag ref and add a hosted
   `windows-linux` platform option for local-macOS releases.
3. Completed: fix manual public-verifier scoping so Windows/Linux-only
   verification does not start a macOS runner.
4. Completed: update releasing, CI/CD, macOS, Linux, README, docs hub, roadmap,
   active plans, and harness manifest to match the new process.
5. Next: decide whether public verification should be folded into the release
   workflow as a blocking job.

## Verification

```bash
npm run release:readiness -- --version 2.9.1
npm run lint:actions
npm run lint:security
npm run lint:docs
npm run lint:bloat
npm run harness:check
git diff --check
```

## Progress

- 2026-06-22: Opened the pipeline audit after `v2.9.1` publication. Initial
  evidence identified hosted macOS runner time, full hosted releases starting
  as a side effect of pushing a tag, and verifier workflow overclaiming as the
  highest-value fixes.
- 2026-06-22: Applied the first pipeline fixes: release publication is manual
  from the tag ref, hosted `windows-linux` is available after local macOS
  upload, manual public verification can skip the macOS runner, and maintained
  docs now close `v2.9.1` as published evidence.

## Handoff

Start from [active status](../active/status.md), then this plan. Keep release-process
changes small and backed by command output. Do not remove package verification,
checksums, SBOMs, attestations for hosted artifacts, unsigned/no-account labels,
or explicit public verification to make the release faster.
