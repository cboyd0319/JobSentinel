# Repository Instructions — JobSentinel

> Purpose: Private, local-first job-search automation. Scrape public job boards, score against user prefs, alert on high-value roles. Runs locally for $0; optional cloud schedule for low cost. Do not add features that compromise privacy or require third-party data brokers.

## Project overview
- Core loop: **Scrape → Normalize → Score → Alert → Persist**.
- Sources (public only): Greenhouse, Lever, JobsWithGPT, Reed, JobSpy aggregator. Do **not** log in to sites or bypass paywalls.
- Alerts: Slack Incoming Webhook (channel configured by user).
- Storage: Local files + SQLite (or equivalent). No telemetry. **Never** ship code that exfiltrates user data.
- Config: `config/user_prefs.json` (see example file in repo). Keep schema stable; add new keys behind sensible defaults.

## Guardrails (read carefully)
- **Respect robots.txt + rate limits.** Default to polite concurrency and exponential backoff. Never DOS a source.
- **No login-required scraping.** Public endpoints only; no captchas, no fake headers that imply authenticated sessions.
- **Secrets** come from `.env` or environment variables. Never hardcode tokens, keys, or webhooks. Do not echo secrets to logs.
- **Privacy by default.** Data stays local. No third-party APIs for resume content unless user explicitly enables them.
- **Licensing/Attribution.** If pulling structured fields from public pages, store only the minimum necessary job metadata.

## Repo map (high level)
- `src/` — app code (scrapers, normalizers, scoring, alerting, CLI/web).
- `config/` — `user_prefs.json` (user-tunable knobs) and examples.
- `templates/` — Slack or message templates (if present).
- `docker/`, `deploy/`, `terraform/` — container & cloud bits (optional use).
- `examples/` — runnable demos / smoke tests.
- `tests/` — unit/integration tests.

## Tooling & commands
- Local run (one-shot): `python -m jsa.cli run-once`
- Web UI: `python -m jsa.cli web --port 5000`
- Validate config: `python -m jsa.cli config-validate --path config/user_prefs.json`
- Dev convenience (when available):
  - `make dev` (deps), `make test`, `make lint`, `make fmt`, `make type`
  - Docker image build/run under `docker/`

> If a command here appears missing, prefer adding a small, well-documented CLI subcommand to `jsa.cli` rather than inventing new scripts.

## Coding standards
- Language: Python (modern 3.x). Favor stdlib + requests/Playwright when scraping; avoid heavyweight deps without justification.
- Style: PEP 8/PEP 257. If `ruff/black` configs exist, follow them. Use type hints (`mypy`-friendly).
- Logging: Structured, single-line JSON where feasible. No secrets. Info for normal ops; Debug for development; Warnings/Errors with clear remediation.
- Tests: Pytest. New features require unit tests; scrapers get contract tests with recorded fixtures where possible.

## Data contracts

### Job record (normalized)
```json
{
  "source": "greenhouse|lever|reed|jobspy|jobswithgpt|…",
  "source_job_id": "string",
  "title": "string",
  "company": "string",
  "location": "string",
  "remote": true,
  "posted_at": "ISO8601",
  "url": "https://…",
  "description_raw": "string",
  "salary_min": 0,
  "salary_max": 0,
  "currency": "USD",
  "tags": ["python","backend", "…"],
  "collected_at": "ISO8601"
}
```

### Score record
```json
{
  "job_id": "fk to job",
  "overall": 0.0,
  "factors": {
    "skills": 0.0,
    "salary": 0.0,
    "location": 0.0,
    "company": 0.0,
    "recency": 0.0
  }
}
```

> If you add fields, maintain backward compatibility and provide a migration.

## Scoring rules (default weighting)
- Skills 40%, Salary 25%, Location 20%, Company 10%, Recency 5%.
- Keep weights configurable in `user_prefs.json`; never hardcode user-specific keywords in code.
- When missing data (e.g., no salary), degrade gracefully, don't crash.

## Slack alerts
- Post only high-value matches (threshold from config). Include title, company, location, score breakdown, and link.
- Do not include full description bodies or any PII. Respect Slack rate limits and retries.

## Source scrapers — pattern to follow
1. **Capability probe** (robots.txt, lightweight HEAD/GET).
2. **Fetch** with polite headers and backoff.
3. **Parse** HTML/JSON → normalized Job record.
4. **De-dupe** on `(source, source_job_id)` or canonical URL.
5. **Persist** to SQLite; return normalized jobs to the pipeline.
6. **Error handling**: catch/label transient vs permanent errors; don't fail the entire run on a single bad page.

## "Ghost job" detection (early heuristics to implement/extend)
- Evergreen titles + unchanging content for >21 days.
- Missing canonical job ID or application link; aggregator-only pages.
- Excessive recruiter contact CTAs; "always hiring" language.
- Score "ghostiness" 0–1; suppress above threshold but keep record for metrics.

## Performance & reliability
- Target 10–50 jobs/min single-process on a dev laptop.
- Use exponential backoff (jitter), timeouts, and circuit breakers around sources to avoid cascading failures.
- Treat external sources as unreliable; prefer idempotent writes and resumable runs.

## Good first tasks for Copilot Agent
- Add a new public scraper (e.g., Workable) behind a feature flag.
- Implement `ghost_job_score()` + unit tests and wire into the scoring pipeline.
- Add `--dry-run` paths that emit what would be sent to Slack without posting.
- Improve config validation with schema checking and helpful error messages.
- Write golden-file tests for an existing scraper (recorded fixtures).

## Review checklist (pull requests)
- [ ] No secrets committed; `.env`/env-vars only.
- [ ] Robots.txt respected; concurrency sane.
- [ ] New config keys documented with defaults.
- [ ] Tests added/updated and passing locally.
- [ ] Logs are structured; no PII or secrets.
- [ ] Backward compatibility: schema migrations included if needed.

---
**Absolute rules:**
- Do not propose login flows, screen-scraping behind auth, or bypassing paywalls/captchas.
- Do not add outbound analytics/telemetry.
- Do not post to Slack without a valid webhook URL and channel from config.
