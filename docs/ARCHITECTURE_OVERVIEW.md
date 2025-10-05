# Architecture Overview (Alpha)

This document provides a high-level map of the major subsystems in the project, highlighting design goals around cost, security, performance, and extensibility. Everything is *Alpha*; interfaces may evolve.

## Core Principles
- Minimal mandatory dependencies (opt-in heavy features)
- Clear separation: scraping vs enrichment vs notification
- Defensive security posture (allowlisted subprocess, no silent downloads)
- Cost transparency (future: per-task cost ledger hooks)
- Local-first / privacy-first (no remote model calls without consent)

## Subsystems

### 1. Scraping Layer (`sources/`, `examples/`)
Responsible for retrieving job listings from supported boards / APIs.
- Uses async networking (aiohttp / playwright) where beneficial.
- Normalizes job data into internal records (title, company, location, URL, metadata). 
- Future: plug-in registry for new job sources with capability flags (API vs HTML, pagination strategies).

### 2. Matching & Analysis (`utils/ats_analyzer.py`, legacy `utils/ats_scanner.py`)
Provides resume/job description alignment scoring.
- New Modular Analyzer: dimension-based scoring (keywords, sections, formatting, readability, experience, recency, taxonomy breadth).
- Extensible weights & plugin plan (see Plugin Hooks section).
- Legacy monolith retained with deprecation path; new code should not add features there.

### 3. Resume Parsing (`utils/resume_parser.py`)
Extracts structured content from PDF / DOCX (skills, titles, companies, education, years experience).
- Lazy optional dependencies (pdfplumber, python-docx, spaCy) – prompts or errors if missing.
- Caching extracted parse results (`data/cache/`) keyed by file hash to reduce repeated work.
- Integrated into analyzer when `resume_path` is a PDF/DOCX.

### 4. Notification Layer (`notify/`)
- Slack (`notify/slack.py`): formats concise alert blocks; includes safety truncation and retry logic.
- Email (`notify/emailer.py`): Structured plain-text or simple MIME messages (alpha-level; extend for rich formatting cautiously).
- Design emphasis: deterministic formatting, avoid spam; future: digest grouping logic.

### 5. Orchestration & Scripts (`scripts/`)
Categorized utility scripts for setup, validation, monitoring, and emergency operations.
- `scripts/setup/slack/slack_setup.py`: unified Slack bootstrap and testing.
- `scripts/monitoring/diagnostics.py`: environment introspection and health checks.
- `scripts/validation/`: deployment validation, code quality checks, scraper validation.
- `scripts/emergency/`: panic buttons and secure emergency procedures.
- `ats_cli.py`: lightweight CLI for resume analysis.

### 6. Configuration (`config/`)
- `resume_parser.json`: Skill & title keyword lists for parser heuristics.
- `skills_taxonomy.json` + `skills_taxonomy_v1.json` (planned): hierarchical skill groups for breadth scoring.
- Security & lint configuration (e.g., `bandit.yaml`) centralize policy and scanning thresholds.

### 7. Security & Hardening
- Subprocess Hardening: Future central wrapper (currently referenced secure patterns) should enforce:
  - Allowlist of executables
  - Timeouts
  - Redaction of sensitive args in logs
- Threat Model: Documented in `SECURITY.md` (attack surfaces: scraping inputs, dependency updates, webhook leakage, credential storage).
- Principle of Least Privilege: Slack integration is send-only; no broad scopes.

### 8. Cost & Performance Awareness
- Lightweight scoring heuristics (no large ML models by default).
- Fuzzy matching auto-disables in large token sets to prevent O(n^2) explosion.
- Resume length truncation guard prevents memory spikes on oversized inputs.
- Future: add `cost.py` ledger with pluggable counters (network requests, pages scraped, optional paid API units).

### 9. Plugin Hooks (Planned)
The analyzer will expose a simple plugin registry for new scoring dimensions without editing core logic.
Proposed interface:
```python
# plugins register a callable returning (score: float, issues: list[Issue], metadata: dict)
register_analyzer_plugin(name: str, weight: float, fn: Callable[[str, dict], tuple])
```
Registry merges weights, renormalizes, integrates into output structure.

### 10. Data Flow (Conceptual)
```
Scrapers -> Job Records -> (Optional storage/index) -> Notifications
                                   |                    ^
User Resume (PDF/DOCX/TXT) -> Parser -> Text ----------/ |
Job Description (optional) ------------------------------|
Text -> Analyzer Dimensions -> Scores + Issues -> CLI / Slack / Future UI
```

### 11. Extensibility Roadmap
| Area | Planned Enhancements |
|------|-----------------------|
| Scraping | Add concurrency controls, rotate user agents, structured error codes |
| Analyzer | Achievement quantifier, embedding similarity (opt-in), plugin registry |
| Parser | Table detection fallback, OCR integration (guarded) |
| Notifications | Digest batching, daily/weekly summary modes |
| Cost | Unified metrics + optional budgeting thresholds |
| Security | Integrity hash checks for downloaded artifacts, sandboxed execution for risky parsing |

### 12. Privacy Posture
- No silent outbound network calls besides user-triggered scraping and configured webhooks.
- Optional model downloads require explicit user consent.
- Local transient parsing caches; user can clear `data/cache/` safely.

### 13. Testing Strategy (Current & Planned)
| Layer | Current | Planned |
|-------|---------|---------|
| Analyzer | Unit tests for core scoring logic | Add fuzz tests for edge tokenization, plugin contract tests |
| Parser | Indirect via sample fixtures (future) | PDF/DOCX regression samples, malformed file tests |
| Notifications | Manual test via Slack wizard | Mock Slack client + formatting snapshot tests |
| Scripts | Manual smoke | CLI integration tests w/ temp dirs |

### 14. Known Gaps
- Lack of central domain model for jobs (ad-hoc dicts); consider Pydantic model.
- No standardized logging schema (JSON logging optional future feature).
- No integrated persistent store for scraped jobs (SQLite planned).
- CI pipeline not committed due to constraints (template to be added).

## Contributing Notes
When adding a new subsystem:
1. Isolate domain logic in its own module/folder.
2. Provide minimal public interface with docstring contract.
3. Add tests alongside (or note why if deferred briefly).
4. Update this overview if the architecture meaningfully changes.

---
*Alpha: Expect iterative refinement as modules stabilize.*
