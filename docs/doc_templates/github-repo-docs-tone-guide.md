# GitHub Repo Docs — Tone & Structure Guide (Chad Edition)

## Core voice (unchanged fundamentals — tightened)
- **Plainspoken, first-person**. No buzzwords, no TED-talk cadence. State facts, fast.  
- **Answer first, why second.** TL;DR up top, then rationale and tradeoffs.  
- **Active, present tense.** “Run this,” not “This can be leveraged to be run.”  
- **Security-minded by default.** Mention least privilege, secrets handling, supply-chain touchpoints only when relevant—with a one-liner risk and fix.  
- **No sales adjectives.** Ban: leverage, utilize, seamlessly, cutting-edge, game-changing. Replace hedges with evidence+likelihood.

## What every README must answer (the triad)
1. **What it is** (one line)  
2. **Why it exists** (pain, constraints, target users)  
3. **How to use it** (90-second quickstart + real example)

---

## Minimum Viable README (MVR) — exact section order
Keep this order unless you have a very good reason to change it (you probably don’t).

1) **Title + one-liner**  
2) **Badges (optional but recommended)** — build, tests, coverage, license, release, SBOM. Use shields.io.  
3) **TL;DR** — 1–2 sentences that include the runnable command or link to a demo.  
4) **Quickstart** — copy-paste block that **actually works** (pin versions, set env vars, note OS prerequisites). Include a sample config.  
5) **Prereqs** — runtime versions, services, secrets required. Use a table.  
6) **Install** — minimal steps; scriptable if possible.  
7) **Usage** — at least two real scenarios:  
   - *Basic*: default happy-path  
   - *Advanced*: a common non-default (flags, config file, or integration)  
8) **Configuration** — every knob in a compact table (name, type, default, example, notes).  
9) **Architecture (if applicable)** — one diagram + 3 bullets: flow, data in/out, trust boundaries.  
10) **Security** — secrets, least privilege, SBOM/release signing, disclosure link. (Short. Don’t sermonize.)  
11) **Troubleshooting** — the top 5 failures with error strings and fixes.  
12) **Performance** — expected limits or typical throughput/latency (even rough ranges help users).  
13) **Roadmap** — 3–7 bullets, linked issues.  
14) **Contributing** — link to CONTRIBUTING.md (style, tests, DCO/CLA), Code of Conduct, PR template.  
15) **License** — with a one-line “what you can/can’t do.” Link to choosealicense.com if undecided.

---

## File/Folder layout that supports good docs (drop these in root)
- `README.md` — you’re here  
- `CONTRIBUTING.md` — how to run tests, style/lint, commit format, release rules  
- `SECURITY.md` — vuln disclosure contact & PGP key, supported versions  
- `LICENSE` — OSI-approved license  
- `CODE_OF_CONDUCT.md` — Contributor Covenant or equivalent  
- `.github/` — `ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md`, `FUNDING.yml`, `workflows/`  
- `docs/` — longer guides, ADRs, diagrams, assets (don’t bloat README)

---

## Style rules (tighten yours with enforceable checks)
- **Paragraphs ≤ 3 sentences. Bullets > walls of text.**  
- **Code blocks are runnable.** Pin versions. Include expected output where helpful.  
- **Define terms once.** Don’t alphabet-soup your readers.  
- **Link real sources only.** No placeholder links.  
- **Version your examples.** If the CLI changed in v1.4, show `since:1.4`.  
- **Images:** use `.github/social-preview.png` for repo preview; keep diagrams in `docs/diagrams/`.  
- **Tables for configs and matrices.** Faster to scan than prose.

---

## Security section (one screen, no drama)
Include a **single** block:

```
Security
- Secrets: use <manager>, never commit. Example: $ENV_VAR (required), path/to/cred.json (optional)
- Least privilege: role X needs {perm:list}, role Y needs {perm:write}
- Supply chain: releases are signed (cosign), SBOM (SPDX) published at /releases/tag/v*
- Disclosure: email security@yourdomain.tld (PGP key in SECURITY.md)
```

Why so terse? It’s the most actionable way to communicate risk without turning README into a policy doc.

---

## Contribution hygiene (so you don’t babysit PRs)
- **CONTRIBUTING.md**: local dev, test, lint, how to structure PRs, “what good looks like.”  
- **PR template**: intent, changes, screenshots/logs, risk, test coverage.  
- **Issue templates**: bug vs feature vs question.  
- **Docs ownership**: list maintainers + expected SLA.

---

## Badges that actually matter (not NASCAR)
- Build, Test, Coverage, Release (SemVer), License  
- Security: `OpenSSF Best Practices` (if relevant), `SBOM available`, `Sigstore verified`  
- Support Matrix: OS/runtime versions you test

---

## “Docs debt” controls (automation you should wire up)
- **Markdown lint**: `markdownlint` (CI fail on rules).  
- **Vale** (style linter): enforce your diction bans and “no sales adjectives.”  
- **Link checker**: CI to prevent rot.  
- **Doc tests**: smoke-run the Quickstart on CI; fail if it breaks.  
- **Docs PR label**: auto-require one maintainer with `docs` expertise.

---

## Two blessed README scaffolds

### A) Library/SDK
```
# <Name> — <one-line value prop>

[badges]

**TL;DR**: Install, import, call one function.

## Quickstart
```bash
pip install yourlib==1.4.2
python -c "import yourlib; print(yourlib.ping())"
```

## Usage
### Basic
```python
from yourlib import Client
Client().do_thing()
```

### Advanced (config file)
```toml
[auth]
token="..."
```

## Configuration
| Key | Type | Default | Example | Notes |
|-----|------|---------|---------|-------|
| timeout | int | 30 | 10 | seconds |

## Architecture
![diagram](docs/diagrams/arch.png)
- Flow: A → B → C
- Data: input.csv → result.json
- Trust: token only, no long-lived creds

## Security
(secrets/privilege/signing/SBOM/disclosure)

## Troubleshooting
- `AuthError`: token missing → set $YOURLIB_TOKEN
- `Timeout`: raise `timeout` to 60

## Contributing | License
links…
```

### B) CLI/App
```
# <Name>: <one-line problem solved>

[badges]

**TL;DR**: One command to get value.

## Quickstart
```bash
curl -fsSL https://.../install.sh | bash
app init --project demo
app run --input samples/a.json --out out/
```

## Prereqs
| Item | Version | Why |
|------|---------|-----|
| Node | >=20 | runtime |
| gcloud | >=460 | deploy |

## Usage
- Basic: `app run --input …`
- With config: `app run -c config.yaml`

## Config
| Name | Type | Default | Example |
|------|------|---------|---------|
| threads | int | 4 | 8 |

## Security
(secrets/least-priv/signing/SBOM/disclosure)

## Performance
- Single node: ~2k items/min, p95 latency ~120ms

## Troubleshooting
(errors → fixes)

## Roadmap
- [ ] Feature X
- [ ] Provider Y

## Contributing | License
links…
```

These structures align with general README best practices while keeping the “answer first” and scannable ethos.

---

## Repo-level docs strategy (when README isn’t enough)
- **Use `/docs` for deep dives** (architecture, FAQs, ADRs, threat model), keep README lean.  
- **Templates live in `.github/`** (issues/PRs).  
- **Social preview image** in `.github/social-preview.png` (helps link previews/SEO).

---

## SEO & discoverability (lightweight and honest)
- Mirror your **one-liner** into the GitHub description and topics.  
- Use **concrete nouns**: “job alerts,” “SBOM,” “Okta,” “macOS,” not vague “automation.”  
- Add a **social preview** that shows architecture or a before/after value shot.

---

## “Chad voice” guardrails (to keep it you)
- Dry, quick humor is fine; never punch down.  
- Emojis: off unless explicitly asked (max 1, never in headings).  
- If unknown, say so and name the next input you need. Optionally tag confidence `[conf: ~80%]`.

---

## Editor/linter snippet (pin this in CONTRIBUTING.md)
```bash
# Docs setup
npm i -g markdownlint-cli
pip install --upgrade vale

# Lint all docs
markdownlint "**/*.md"
vale .

# Check links (CI)
npx linkinator README.md docs/**/*.md
```

---

## Final sanity checklist (run before merging)
- TL;DR works, copy-paste quickstart runs clean on a fresh machine.  
- All links resolve; badges green; license present.  
- Config table complete; defaults are real; examples tested.  
- Security section names secrets, roles, SBOM/release signing, and disclosure path.  
- README < ~5 minutes to read; deep dives offloaded to `/docs`.
