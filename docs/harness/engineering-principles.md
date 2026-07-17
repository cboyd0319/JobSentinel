# Engineering Principles

All current and future JobSentinel development is DRY and lean. This file is the
single source of truth for how code and docs are written here. `AGENTS.md`, the
change contract, and other instruction surfaces point back to it instead of
restating it.

## The Ladder

Before writing code, walk this ladder and stop at the first step that satisfies
the requirement:

1. Does this need to exist at all? Prefer YAGNI and deletion over new code.
2. Does the standard library do it? Use it.
3. Does a native platform feature cover it? Prefer it: `<input type="date">`
   over a date-picker library, CSS over JS, a database constraint over
   application code.
4. Does an already-installed dependency solve it? Use it. Never add a new
   dependency for what a few clear lines can do.
5. Can it be one line and still readable? Make it one line.

## Standing Rules

- Boring over clever. Clever is what someone has to decode at 3am.
- Reduce or remove duplication everywhere. Define a thing once and reference it.
- When two standard options are the same size, take the one that is correct on
  edge cases. Lazy means writing less code, not picking the flimsier algorithm.
- Documentation is product. If a change is not documented it does not exist;
  update the affected docs in the same change.

## How This Is Enforced

- `AGENTS.md` carries the ladder so every session starts with it.
- The [change contract](change-contract.md) requires each non-trivial change to
  name the ladder step it stops at and the duplication it removes.
- `npm run harness:check` locks this principle text into the instruction files
  and runs the sensors below.
- `npm run lint:dup` is the DRY ratchet: it fails when new or changed code
  raises duplicated-line volume above the tool-generated baseline in
  `scripts/harness/contracts/duplication.json`. The baseline may only ratchet down.
  Use `npm run lint:dup -- --list` to locate duplication and
  `npm run lint:dup -- --update-baseline` after removing some.
- `npm run lint:deps:why` is the YAGNI gate for ladder step 4: every direct npm
  and Cargo dependency needs a one-line reason in
  `scripts/harness/contracts/dependency-rationale.json`. Adding a dependency without one fails,
  and a stale entry for a removed dependency fails too.
- `npm run lint:bloat` guards repo bloat and the maintainable file-size
  contract.
- Reviewers reject new dependencies, abstractions, or duplication that a
  smaller, boring change would have avoided.

## Related

- [Harness map](harness-map.md)
- [Change contract](change-contract.md)
- [Verification matrix](verification-matrix.md)
- [Tech debt tracker](../plans/tech-debt-tracker.md)
