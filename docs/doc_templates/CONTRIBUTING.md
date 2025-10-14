# Contributing

Thanks for helping make this project better. This repo uses **tight docs hygiene** and **fast feedback**.

## Dev setup
```bash
# clone + env
git clone <url> && cd <repo>
python -m venv .venv && source .venv/bin/activate  # or your runtime
pip install -r requirements-dev.txt  # if applicable

# docs tooling
npm i -g markdownlint-cli
pip install vale
```

## Lint & test
```bash
# code
<your build/test here>

# docs
markdownlint "**/*.md"
vale .
npx linkinator README.md docs/**/*.md
```

## Commit style
- Conventional commits preferred: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- Keep PRs narrowly scoped. Include before/after evidence (logs, screenshots).

## PR checklist
- [ ] Quickstart works on a clean machine
- [ ] Updated README/config tables as needed
- [ ] Added/updated tests
- [ ] Security implications noted (secrets/permissions)
- [ ] Links valid, badges green

## Releasing
- Tag with SemVer (`vX.Y.Z`)
- Publish artifacts + SBOM (SPDX)
- Sign release (Sigstore/cosign); attach provenance/SLSA if available
