
# Repository Instructions — JobSentinel (Authoritative for GitHub Copilot Agent)
> **Purpose:** Private, local‑first job‑search automation. Scrape public job boards, score against user prefs, alert on high‑value roles. Runs locally for $0; optional low‑cost cloud scheduling. **Never** add features that compromise privacy or require third‑party data brokers.

---

## 🚨 Non‑Negotiables (Read This, Copilot)
- **All application code lives under `deploy/`.** Root (repo top‑level) is metadata/docs only.
- **Do NOT write files directly into `deploy/common/` root.** That directory is **not** a dumping ground. Use the correct subdirectory from the router below.
- **When path is not provided, you must pick the correct path from the router.** Do **not** default to `./deploy/common` or create new root‑level folders.
- **If path is ambiguous, FAIL LOUDLY** and ask for the intended category (“scraper”, “config”, “test”, “web”, “cloud”, “local”). Do not guess.
- **Never reference deprecated root‑level paths** like `src/`, `tests/`, `scripts/`, or `config/` outside of `deploy/`.

---

## Path Router (Mandatory — aligned to current repo)
Use these exact mappings when creating, moving, or suggesting files.

| Content Type | Canonical Path | Notes |
|---|---|---|
| **Core Python package (domain & pipeline)** | `deploy/common/app/src/jsa/` | `cli.py`, `config.py`, `db.py`, `health_check.py`, `logging.py`, `errors.py`, `http/`, `web/` |
| **Additional core modules** | `deploy/common/app/src/` | Only if part of the public package surface. Prefer putting inside `jsa/` when feasible. |
| **Scrapers (job boards)** | `deploy/common/app/sources/` | One subdir per source: `greenhouse/`, `lever/`, `workable/`, etc. |
| **Models & Schemas** | `deploy/common/app/models/` | Pydantic/ORM models, JSON schemas. |
| **Shared Utils & Helpers** | `deploy/common/app/utils/` | Reusable helpers, adapters, rate limiters. |
| **Web UI (server‑side / templates / static)** | `deploy/common/web/` | `templates/`, `static/`, `emails/`. |
| **Web UI (frontend app)** | `deploy/common/web/frontend/` | React/Vite. |
| **Configuration (user & system)** | `deploy/common/config/` | `user_prefs.json`, `*.schema.json`, `bandit.yaml`, etc. |
| **Scripts / Ops utilities** | `deploy/common/scripts/` | CLI helpers, setup/validate scripts, not feature code. |
| **Examples & Fixtures** | `deploy/common/examples/` | Golden files, recorded fixtures, sample data. |
| **Tests** | `deploy/common/tests/` | See enforced layout below. |
| **Platform deployments — local** | `deploy/local/{windows|macos|linux}/` | Setup and launch per OS. |
| **Platform deployments — cloud** | `deploy/cloud/{gcp|aws|azure}/` | IaC, providers; shared code in `deploy/cloud/common/` and `deploy/cloud/docker/`. |
| **Runtime data** | `data/` | SQLite, logs. **Not code.** |
| **Documentation** | `docs/` | All documentation; not under `deploy/common`. |
| **GitHub config** | `.github/` | Workflows, templates, **this file**, MCP config. |

**Enforced test layout**  
- Unit tests (core package): `deploy/common/tests/unit_jsa/`  
- Other unit suites (module‑level): keep under `deploy/common/tests/unit/` (existing) **or** migrate to `{area}/tests/` if tightly scoped.  
- Integration tests: `deploy/common/tests/integration/`  
- Property‑based tests: `deploy/common/tests/property/`  
- Test fixtures: `deploy/common/tests/fixtures/`

> If a new path category is needed, propose it in a PR with rationale and update this router.

---

## Prohibited (Denylist)
- ❌ `deploy/common/` (top‑level) — **never** write files directly here (no loose `.py`, `.md`, etc.).  
- ❌ Root code folders like `src/`, `tests/`, `scripts/`, `config/` — invalid since v0.9.  
- ❌ New top‑level folders at repo root unless metadata (e.g., `pyproject.toml`, `Makefile`).  
- ❌ Committing `__pycache__/` or build artifacts — ensure `.gitignore` excludes them.

If unsure, **stop** and ask. Otherwise refuse and cite this section.

---

## Quick Reference for Agents
| Task | Path/Command | Notes |
|------|--------------|-------|
| **Core code** | `deploy/common/app/src/jsa/` | Main application code |
| **Scrapers** | `deploy/common/app/sources/` | Job board integrations |
| **Tests** | `deploy/common/tests/` | Unit, integration, property |
| **Config** | `deploy/common/config/user_prefs.json` | User preferences |
| **Run locally** | `python -m jsa.cli run-once` | Single scrape run |
| **Web UI** | `python -m jsa.cli web --port 8000` | Start web interface |
| **Test suite** | `make test` | Run all tests (≥85% coverage) |
| **Type check** | `make type` | mypy strict on `src/jsa` |
| **Lint** | `make lint` | Ruff |
| **Docs** | `docs/DOCUMENTATION_INDEX.md` | Doc index |

---

## Directory Map (Canonical — October 2025)
```
deploy/
├── local/
│   ├── windows/  ├── macos/  └── linux/
├── cloud/
│   ├── common/   ├── docker/ ├── gcp/ ├── aws/ └── azure/
└── common/
    ├── app/
    │   ├── src/ (preferred: put new feature code in src/jsa/)
    │   ├── models/   ├── sources/   └── utils/
    ├── web/ (templates/, static/, frontend/)
    ├── config/
    ├── tests/ (unit_jsa/, unit/, integration/, property/, fixtures/)
    ├── scripts/
    ├── examples/
    └── constraints/
```

---

## Copilot File‑Creation Rules (Enforceable Behavior)
When generating or modifying files, follow these. If a condition doesn’t match, **stop and ask**.

1. **Core feature code (CLI, pipeline, domain)** → `deploy/common/app/src/jsa/`
2. **New scraper** → `deploy/common/app/sources/{provider}/`
3. **Model/schema** → `deploy/common/app/models/`
4. **Helper/utility** → `deploy/common/app/utils/`
5. **Config or schema** → `deploy/common/config/`
6. **Unit tests for core** → `deploy/common/tests/unit_jsa/`
7. **Other unit tests** → `deploy/common/tests/unit/`
8. **Integration tests** → `deploy/common/tests/integration/`
9. **Property‑based tests** → `deploy/common/tests/property/`
10. **Fixtures** → `deploy/common/tests/fixtures/`
11. **Ops script** → `deploy/common/scripts/`
12. **Web (server‑side/templates/static)** → `deploy/common/web/`
13. **Web frontend** → `deploy/common/web/frontend/`
14. **Docs** → `docs/` (never `deploy/common/docs/`)

**Edits to existing files:** Do not relocate across categories without an explicit refactor request **and** matching tests.

---

## Migration Notes (aligning current tree)
- Move any loose code at `deploy/common/*.py` (e.g., launchers) into:
  - GUI/UX launchers → `deploy/common/app/src/jsa/` or `deploy/common/web/` depending on responsibility.
- Move any docs under `deploy/common/docs/` to top‑level `docs/`.
- Ensure `__pycache__/` directories are ignored by `.gitignore` and not committed.

> Use `git mv` to preserve history; see “Path Guard” below to prevent regressions.

---

## Project Overview
- **Version:** 0.9.0 (October 2025) — deployment‑centric layout
- **Python:** 3.11+
- Core loop: **Scrape → Normalize → Score → Alert → Persist**.
- Sources: Greenhouse, Lever, JobsWithGPT, Reed, JobSpy. **Public endpoints only.**
- Alerts: Slack Incoming Webhook.
- Storage: Local files + SQLite. No telemetry. **Never** exfiltrate user data.
- Config: `deploy/common/config/user_prefs.json` (+ schema). Keep schema stable; new keys behind sane defaults.
- AI/ML (v0.6+): semantic matching, resume analysis, scam detection, accessibility, MCP integration.

---

## Commands (Most Used)
```bash
# Dev
make dev
playwright install chromium

# Run
python -m jsa.cli run-once
python -m jsa.cli run-once --dry-run
python -m jsa.cli web --port 5000
python -m jsa.cli health

# Quality gates
make fmt && make lint && make type && make test
make cov      # ≥85%
make security # Bandit + PyGuard
```

---

## Coding Standards (Short Version)
- **Style:** Black (line‑length=100) + Ruff (E,F,B,I,UP,S). Exceptions in `pyproject.toml`.
- **Types:** mypy strict for `deploy/common/app/src/jsa`. All public functions typed.
- **Logging:** Structured JSON; sanitize secrets; no PII.
- **Testing:** pytest (unit/integration/property). Mock external calls; no live scraping.
- **Security:** Bandit + PyGuard, input validation, per‑source rate limits, secrets via `.env` only.
- **Dependencies:** Prefer stdlib; then `requests`, `bs4`, `playwright`. Optional extras `[resume]`, `[ml]`, `[mcp]`. Versions pinned.

---

## Guardrails
- Respect `robots.txt` and rate limits; polite concurrency with backoff/jitter.
- No login‑required scraping; no captcha/paywall bypass.
- Secrets via env or `.env` (never committed). Never echo secrets.
- Privacy by default; minimum data persisted; no third‑party brokers.
- Licensing/Attribution: store only minimal job metadata.

---

## MCP Integration (Summary)
- Built‑in: **github‑mcp** (OAuth). Do **not** add GitHub server to `.github/copilot-mcp.json`.
- External: **context7**, **openai-websearch**, **fetch**, **playwright** (configured in `.github/copilot-mcp.json`).
- Validate: `python3 deploy/common/scripts/validate_mcp_config.py`.
- Docs: `.github/MCP_CONFIG_README.md`, `docs/MCP_INTEGRATION.md`.

---

## PR Review Checklist (Enforced Mindset)
- [ ] Paths obey this document; no files in `deploy/common/` root.
- [ ] No secrets; `.env`/env vars only.
- [ ] Robots.txt respected; sane concurrency.
- [ ] New config keys documented with defaults and schema.
- [ ] Tests updated and passing; coverage ≥85%.
- [ ] Lint & type check pass.
- [ ] Security scan clean.
- [ ] Docs updated if APIs/config changed.
- [ ] Conventional commits (`feat:`, `fix:`, `docs:` …).

---

## Path Guard (CI Snippet — prevents bad placements)
```yaml
# .github/workflows/path-guard.yml
name: Path Guard
on: [pull_request]
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate paths
        run: |
          set -euo pipefail
          base="origin/${{ github.base_ref }}"
          disallowed=$(git diff --name-only "$base"... | \
            grep -E '^(src/|tests/|scripts/|config/|deploy/common/[^/]+\.(py|md|sh|ps1)$|deploy/common/docs/)' || true)
          if [ -n "$disallowed" ]; then
            echo "Disallowed file locations detected:"
            echo "$disallowed"
            exit 1
          fi
```

---

## Documentation Hub
See `docs/DOCUMENTATION_INDEX.md` for quick links to: Quickstart, Troubleshooting, UI, API Integrations, Deployment, Architecture, Standards, AI/ML Roadmap, Database Guide, Contributing.

---

**Absolute rules:**
- No login flows, authenticated screen‑scraping, or paywall/captcha bypassing.
- No outbound analytics/telemetry.
- No Slack posts without a valid webhook + channel.
- No secrets committed (use `.env`).
- No violations of robots.txt or rate limits.
- Use direct, plainspoken language. No “we/our/us”. Address the user as “you”.
