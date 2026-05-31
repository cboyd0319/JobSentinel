# Entropy Control

Agents amplify existing repo patterns. Bad patterns spread unless the harness
catches them early.

## Drift Signals

Capture these as docs, scripts, tests, or tracker items:

- Repeated review comments.
- Repeated failing commands.
- Stale test counts or version claims.
- Docs that duplicate the same command differently.
- Large files that agents avoid reading.
- Unclear ownership between frontend, Tauri commands, and core logic.
- Security rules written only as prose with no tests.

## Cleanup Cadence

After each substantial change:

1. Update affected docs.
2. Run `npm run harness:check`.
3. Add repeated issues to `docs/plans/tech-debt-tracker.md`.

Weekly or before release:

1. Run full docs and harness checks.
2. Search for stale version and test-count claims.
3. Review open plans in `docs/plans/active/`.
4. Promote repeated manual review comments into a sensor.
5. Retire completed plans.

## Debt Entry Format

```text
ID:
Title:
Area:
Observed evidence:
Risk:
Recommended sensor or guide:
Owner:
Status:
```

## Current Harness Debt

Use `docs/plans/tech-debt-tracker.md` as the single current debt source. Keep
audit detail in dated harness reviews such as
`docs/harness/deep-harness-audit-2026-05-31.md`, then promote accepted work into
the tracker. Do not keep a second live debt table here.

## Promotion Rule

When the same problem appears twice, do not only fix the instance. Improve one
of these:

- Guide: docs, template, `AGENTS.md`, feature contract.
- Sensor: test, lint, script, CI job, PR checklist.
- Topology: file layout, module boundary, generated artifact.
