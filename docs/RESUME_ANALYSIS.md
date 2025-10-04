# Resume & ATS Analysis (Alpha)

This document explains the modular ATS scoring engine introduced in `utils/ats_analyzer.py`. It is **Alpha quality**: interfaces and weights may evolve. Use results as *suggestive guidance*, not authoritative hiring advice.

---
## Objectives
1. Provide transparent, explainable resume scoring.
2. Support zero‑knowledge users (plain language output + structured JSON for power users).
3. Remain resource‑efficient (bounded memory / time; avoid large model downloads w/o explicit consent).
4. Be easily extensible (add new scoring dimensions without rewriting everything).
5. Allow optional fuzzy / NLP enrichment only when dependencies are present.

---
## High‑Level Flow
```
(raw text | file path) -> normalization -> (optional) lightweight NLP -> token sets
                        -> scoring components (each dimension) -> dimension scores + issues
                        -> weight rebalance & overall composite -> ATSAnalysisResult
```

---
## Inputs
| Parameter | Type | Description |
|-----------|------|-------------|
| `resume_text` | str | Raw resume text (mutually exclusive w/ `resume_path`). |
| `resume_path` | str | Path to a resume file (txt/pdf/docx) – parsing delegated to existing extraction utilities (future integration). |
| `job_description` | str | Optional job description text to contextualize keyword alignment. |
| `skills_taxonomy_path` | str | Path to taxonomy JSON (hierarchical industry/skill groups). |
| `weights` | dict[str, float] | Optional override of dimension weights. Missing keys filled; weights auto‑normalized. |
| `enable_fuzzy` | bool | Enables fuzzy partial matching (requires `rapidfuzz`). |
| `fuzzy_threshold` | float | Match confidence (0–1). Lower increases matches & cost. |
| `max_chars` | int | Hard resume length guard to prevent memory blow‑ups. |
| `collect_timing` | bool | Adds per‑dimension timing metadata. |

---
## Outputs: ATSAnalysisResult
| Field | Type | Meaning |
|-------|------|---------|
| `overall_score` | float (0–100) | Weighted composite after normalization & capping. |
| `dimension_scores` | dict[str, float] | Individual dimension raw scores (0–100). |
| `issues` | list[Issue] | Structured improvement hints. |
| `metadata` | dict | Timings, token counts, taxonomy stats, flags. |
| `weights` | dict[str, float] | Final normalized weights used. |

Issue fields:
- `dimension`: name (e.g., `keywords`)
- `severity`: `info` | `warning` | `critical`
- `message`: human readable guidance
- `suggestion`: actionable tip (when possible)

---
## Scoring Dimensions (Current)
| Dimension | Type | Purpose | Method Highlights |
|-----------|------|---------|------------------|
| `keywords` | core | Overlap w/ job description | Exact + optional fuzzy matching; coverage ratio + partial boosts. |
| `industry` (skills breadth) | core | Distribution across taxonomy buckets | Counts hits per taxonomy node; breadth ratio with light smoothing. |
| `sections` | core | Presence of key sections | Regex heuristics (summary, experience, education, skills, projects, certifications). |
| `formatting` | core | Formatting hygiene | Symbol overuse, blank lines, non-ASCII ratio, line length variance. |
| `readability` | core | Bullet/action verb / sentence balance | Bullet count, avg sentence length, action verb presence. |
| `experience` | core | Seniority depth vs JD | Year extraction heuristics; gap vs required years. |
| `recency` | core | Freshness of recent activity | Latest year & density of year mentions. |
| `achievements` | plugin (default) | Quantified impact signals | Detects lines with numbers + action verbs; combines ratios. |
| `leadership_signal` | plugin (default) | Leadership & management emphasis | Counts distinct leadership verbs & total mentions. |
| `action_verb_density` | plugin (default) | Strength of bullet phrasing | Ratio of lines starting w/ action verbs. |

Retired legacy dimensions have been consolidated or superseded by lightweight plugin equivalents.

Planned (Future Plugins): redundancy penalty, tense consistency, chronology coherence, semantic skill clustering (consent-gated embeddings).

---
## Weighting Strategy
- Default weights live in `DEFAULT_WEIGHTS` inside `ats_analyzer.py`.
- User overrides merged; omitted dimensions retain defaults.
- Negative weights rejected.
- All weights normalized to sum = 1.0 (floating tolerance).
- Composite = Σ (normalized_weight * dimension_score).

---
## Taxonomy File
`config/skills_taxonomy.json` (Alpha) defines nested categories: e.g.
```
{
  "cloud": ["aws", "azure", "gcp", ...],
  "security": ["siem", "iam", "cissp", ...],
  ...
}
```
Guidelines:
- Keep category lists < ~150 entries to avoid performance regressions.
- Lowercase all terms.
- Avoid excessive synonyms; rely on fuzzy mode for variants.

---
## Fuzzy Matching (Optional)
Activated with `enable_fuzzy=True` and presence of `rapidfuzz`.
- Applies to keyword overlap vs job description.
- Each job keyword matched at most once.
- Threshold controls similarity; 0.85 default balances recall/precision.
- Guardrails: if token set > 600 unique tokens, fuzzy automatically disabled unless explicitly overridden (prevents O(n^2) blowup).

---
## Performance & Resource Guards
| Guard | Purpose |
|-------|---------|
| `max_chars` truncation | Avoid unbounded memory on huge pasted resumes. |
| Fuzzy auto-disable > token cap | Prevent quadratic cost. |
| Timing collection | Surface hotspots for later optimization. |
| Lightweight parsing | Heavy NLP (spaCy model) intentionally deferred to legacy or optional future module. |

Expected baseline: <50ms for typical 2–5 page resume without fuzzy; <200ms with fuzzy & moderate length on modern CPU.

---
## Error Handling
- Invalid weight (<0) -> ValueError.
- Missing resume input (both `resume_text` & `resume_path` None) -> ValueError.
- Taxonomy load failure -> falls back to empty taxonomy (dimension scores degrade gracefully).
- Fuzzy requested but dependency missing -> flagged in metadata and skipped (no exception).

---
## Extending the Analyzer
1. Add a new function `score_<dimension>(normalized_text: str, tokens: list[str], ...) -> tuple[float, list[Issue], dict]`.
2. Register dimension name & default weight in `DEFAULT_WEIGHTS`.
3. Integrate call in `analyze_resume()` building `dimension_scores`, `issues`, merging metadata.
4. Update tests with at least: baseline/no JD, targeted presence test, edge case (empty resume).
5. Document dimension rationale here.

### Plugin Architecture
The analyzer supports lightweight, opt-in extension points so new semantic signals can be added without modifying the core engine.

Core pieces:
* Global registry `_ANALYZER_PLUGINS` mapping plugin name -> `{ weight, fn }`.
* Registration helper: `register_analyzer_plugin(name, weight, fn)`.
* Default plugin bundle: `register_default_plugins()` (idempotent) adds: `achievements`, `leadership_signal`, `action_verb_density`.
* Each plugin callable signature:
  ```python
  def plugin(resume_text: str, context: dict) -> tuple[float, list[Issue], dict]
  # score 0-100, list of Issue instances, arbitrary metadata dict
  ```
* Plugin weights are merged with core weights then renormalized to sum = 1.0.

### Plugin Metadata
Per-plugin metadata is exposed via `ATSAnalysisResult.plugin_metadata` as:
```json
{
  "achievements": {"quantified_lines": 4, "ratio": 0.07, ...},
  "leadership_signal": {"unique_terms": 2, "total_mentions": 5},
  "action_verb_density": {"ratio": 0.35}
}
```
Failed plugins are isolated: they contribute a score of 0, emit a warning Issue, and include an `{"error": "..."}` entry in metadata (ensuring resilience during experimentation).

### Custom Plugin Example
```python
from utils.ats_analyzer import register_analyzer_plugin

def cloud_focus(text: str, ctx: dict):
    mentions = text.lower().count("cloud")
    words = max(1, len(text.split()))
    ratio = mentions / words
    score = min(100.0, ratio * 4000)
    meta = {"cloud_mentions": mentions, "ratio": round(ratio, 4)}
    return score, [], meta

register_analyzer_plugin("cloud_focus", 0.02, cloud_focus)
```

Then run analysis normally; the new dimension appears in `component_scores` and metadata.

Keep functions pure & side-effect free; pass only needed context.

---
## Interoperability with Legacy Components
- Legacy `utils/ats_scanner.py` retained temporarily (will be deprecated). New tooling should import `analyze_resume()`.
- Existing extraction logic in `utils/resume_parser.py` can feed richer structured data (education dates, titles) later. Interface intentionally simple for now.

---
## Example Minimal Usage
```python
from utils.ats_analyzer import analyze_resume

result = analyze_resume(
    resume_text=open("resume.txt").read(),
    job_description=open("jd.txt").read(),
    enable_fuzzy=True,
    collect_timing=True,
)
print(result.overall_score)
for issue in result.issues:
    print(f"[{issue.severity}] {issue.dimension}: {issue.message}")
```

CLI wrapper (future enhancement) will output JSON + human summary.

---
## Privacy & Data Handling
- No remote calls – fully local analysis.
- No telemetry emitted.
- Users should redact confidential data before sharing results externally.

---
## Limitations (Alpha)
- Does not parse PDFs / DOCX directly yet in this new module (reuses legacy parser externally).
- Experience year detection heuristic; may misread unconventional date formats.
- Readability metric simplistic (no full linguistic parsing yet).
- No deep semantic similarity (embedding models intentionally excluded for cost/privacy).

---
## Roadmap (Planned Enhancements)
- Rich achievements quantifier (numbers + action verbs weighting).
- Terminal-friendly CLI + Slack formatting variant.
- Integration with resume parser structured entities for precision.
- Optional embedding-based context alignment (user-consent gated) for semantic job fit.
- Aggressive deduplication & noise penalty.

---
## Contributing / Feedback
File issues with concrete examples (redacted). Provide:
- Resume length (# pages or # chars)
- Which dimension felt inaccurate
- Expected vs actual behavior

This sharpens heuristics before adding heavier NLP layers.

---
*Alpha module: Interfaces may change. Treat scores as directional signals, not definitive hiring outcomes.*
