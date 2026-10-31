<!-- Describes optional scoped mutation analysis without claiming unmeasured repository scores. -->

# Mutation testing

Mutation testing checks whether tests detect deliberate implementation changes.
Coverage records executed code; neither metric alone proves correct behavior.
Use mutation analysis for an unresolved test-quality question, not as an automatic
full-workspace development gate.

No hosted continuous integration runs under the active `pre-alpha-private-no-ci` policy.

## Setup and scope

`cargo-mutants` is optional and is not installed by repository initialization.
Use its [official documentation](https://mutants.rs/) and installed
`cargo mutants --help` before selecting version-specific options. The repository
currently has no `.cargo-mutants.toml` configuration file and no current global
mutation score certified by this document.

Start from a known revision with passing focused tests. Scope mutations to the
changed owner, such as `crates/jobsentinel-application/src/config/validation.rs`,
rather than retired `src/core/` paths. Preserve the toolchain, features, fixtures
and test selection across comparisons. Do not run real credential-store tests,
live provider calls or model downloads unintentionally.

## Interpret results

| Outcome | Meaning and response |
| --- | --- |
| Caught | A selected test detects that mutation; inspect whether it detects the intended behavior. |
| Missed | No selected test detects it; establish whether the behavioral change matters before adding coverage. |
| Unviable | The mutation does not compile; this is not evidence of test effectiveness. |
| Timeout | The result is unresolved; distinguish a changed algorithm from an unsuitable test budget. |

Boundary comparisons, boolean guards and error paths are useful targets. Prefer a
focused behavioral assertion over tests coupled to implementation details. Equivalent
mutations need a written rationale; do not exclude meaningful failures to raise a score.

## Evidence

The aspirational goal is a 90%+ caught rate for critical modules, subject to the
actual mutation set and justified equivalent cases. Report revision, command,
features, selected tests, counts, exclusions and elapsed time. Example scores or
old runs must not be presented as current repository coverage.

Full release qualification still follows the separate Stability, Performance and
Security phases in [the Release Contract](RELEASING.md#mandatory-final-release-phases).
See [Testing](TESTING.md) for ordinary development checks.
