# Architecture (Draft - Alpha)

This project is mid-refactor toward a clearer modular layout. Current code is split across multiple top-level directories (`sources/`, `utils/`, `notify/`, `cloud/`, `matchers/`, `scripts/`). A future consolidated package namespace will live under `src/job_search_automation/`.

## Target Module Map

| Domain | Current Paths | Planned Namespace | Notes |
|--------|---------------|-------------------|-------|
| Core config & logging | `utils/config.py`, `utils/logging.py` | `core.config`, `core.logging` | Initialization early in CLI entrypoints |
| Cost tracking | `utils/cost_tracker.py` | `core.cost` | Local only, privacy-first |
| Scrapers | `sources/*.py` | `scrapers.*` | Async patterns & retry policy centralized |
| Filtering & scoring | `matchers/rules.py`, resume/ATS modules | `scoring.*` | Pluggable scoring weights |
| Resume analysis | `utils/resume_parser.py`, `utils/ats_scanner.py`, `utils/resume_enhancer.py` | `resume.*` | Lazy NLP model loading, local-only |
| Notifications | `notify/slack.py`, `notify/emailer.py` | `integrations.slack`, `integrations.email` | Slack interactive roadmap |
| Cloud helpers | `cloud/*` | `cloud.*` | Harden subprocess & validation |
| CLI & orchestration | `scripts/*.py` | `cli.*` | Single entrypoint `python -m job_search_automation` |

## Guiding Priorities
1. Cost: Minimal redundant HTTP requests; shared caching; rate limiting.
2. Security: No silent network model downloads; principle of least privilege for subprocess/cloud usage; no outbound telemetry.
3. Speed: Async scraping; connection pooling; batched notifications.
4. Simplicity: Zero-knowledge onboarding via `setup` command and clear prompts.

## Incremental Refactor Plan
1. Introduce namespace package under `src/job_search_automation/` with shim imports (avoid breakage).
2. Move low-risk stateless modules first (`utils/cost_tracker.py`, notification formatters).
3. Add CLI entry (`__main__.py`) exposing subcommands: `setup`, `scrape`, `analyze-resume`, `cost-report`.
4. Migrate scrapers & config; add dependency injection for HTTP client & rate limiter.
5. Finalize resume analysis module separation (parser vs ATS vs enhancer) with shared taxonomy file.
6. Remove legacy top-level duplicates once tests pass.

## Security Hardening Roadmap
* Central `secure_subprocess.run()` wrapper with allowlist.
* Hash & signature verification for downloaded vendor tools.
* Config schema validation (JSON Schema) before runtime use.
* Optional sandbox mode disabling any cloud modification actions.

## Cost Transparency
`utils/cost_tracker.py` collects local usage stats. Future: integrate per-provider cost hints (e.g., estimated GCP Scheduler price) with opt-in flag.

## Testing Strategy (Planned)
* Smoke tests: config load, basic scraper dry-run (mocked HTTP), Slack formatting.
* Resume: unit tests for skill extraction edge cases, regression corpus to avoid false positives.
* Security: test subprocess wrapper rejects disallowed binaries.

---
Status: Draft (Alpha). This file will evolve as modules move under the new namespace.