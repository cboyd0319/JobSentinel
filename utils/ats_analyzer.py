#!/usr/bin/env python3
"""Modular ATS analysis engine (enhanced) for job-search-automation.

Provides structured, explainable scoring of a resume (and optional job description)
across multiple dimensions: keywords, skills taxonomy coverage, experience alignment,
section completeness, formatting, readability, recency.

Design constraints:
- No heavy downloads implicitly (spaCy model only if already present and requested)
- Optional fuzzy matching via rapidfuzz
- Memory conscious: truncates very large texts
- Extensible weights & taxonomy
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple, Any
from pathlib import Path
import re
import time
import json
import logging
from types import SimpleNamespace

# Optional libraries
try:
    from rapidfuzz import fuzz  # type: ignore
    HAS_RAPIDFUZZ = True
except ImportError:  # pragma: no cover
    HAS_RAPIDFUZZ = False

try:
    import spacy  # type: ignore
    HAS_SPACY = True
except ImportError:  # pragma: no cover
    HAS_SPACY = False

# Constants
MAX_TEXT_CHARS = 150_000
DEFAULT_WEIGHTS = {
    "keywords": 0.30,
    "formatting": 0.15,
    "sections": 0.10,
    "readability": 0.10,
    "experience": 0.15,
    "industry": 0.10,
    "recency": 0.10,
}

# Plugin registry: name -> plugin spec
# A plugin spec is a dict: { 'weight': float, 'fn': callable }
_ANALYZER_PLUGINS: Dict[str, Dict[str, Any]] = {}

def register_analyzer_plugin(name: str, weight: float, fn):
    """Register a custom analyzer plugin.

    Plugin callable signature:
        fn(resume_text: str, context: dict) -> tuple[float, list[Issue], dict]
        Returns: (score 0-100, issues, metadata)

    Args:
        name: unique dimension name (not clashing with built-ins)
        weight: relative weight (>=0). Re-normalized with existing weights.
        fn: callable implementing the scoring.
    """
    if not callable(fn):  # pragma: no cover - defensive
        raise TypeError("fn must be callable")
    if weight < 0:
        raise ValueError("weight must be >= 0")
    if name in DEFAULT_WEIGHTS:
        raise ValueError(f"Plugin name '{name}' collides with built-in dimension")
    _ANALYZER_PLUGINS[name] = {"weight": weight, "fn": fn}

ACTION_VERBS = {
    "achieved", "managed", "led", "developed", "created", "improved",
    "increased", "decreased", "implemented", "designed", "built",
    "analyzed", "coordinated", "executed", "established", "streamlined"
}

EXPECTED_SECTIONS = {
    "contact", "summary", "experience", "education", "skills", "projects", "certifications"
}

STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "must", "can", "about", "this", "that", "these",
    "those", "i", "you", "he", "she", "it", "we", "they"
}

RECENCY_PATTERN = re.compile(r"\b(20\d{2})\b")
EXPERIENCE_REQ_PATTERN = re.compile(r"(?:(?:at\s+least|minimum|\bmin\b|\b~?)(?:\s+of)?)\s*(\d{1,2})\+?\s+years", re.IGNORECASE)
YEARS_ONLY_PATTERN = re.compile(r"(\d{1,2})\+?\s+years", re.IGNORECASE)


@dataclass
class Issue:
    level: str  # 'critical' | 'warning' | 'info'
    category: str
    message: str
    suggestion: Optional[str] = None


@dataclass
class ATSAnalysisResult:
    overall_score: float
    component_scores: Dict[str, float]
    keyword_overlap: Dict[str, Any]
    skills_alignment: Dict[str, Any]
    experience_alignment: Dict[str, Any]
    section_coverage: Dict[str, Any]
    readability: Dict[str, Any]
    formatting: Dict[str, Any]
    recency: Dict[str, Any]
    issues: List[Issue] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    timing_ms: Dict[str, int] = field(default_factory=dict)
    metadata: Dict[str, str] = field(default_factory=dict)
    # New: detailed per-plugin metadata (plugin_name -> metadata dict)
    plugin_metadata: Dict[str, Dict[str, Any]] = field(default_factory=dict)


class ATSAnalyzer:
    def __init__(
        self,
        taxonomy_path: Path | str = Path("config/skills_taxonomy.json"),
        weights: Optional[Dict[str, float]] = None,
        enable_fuzzy: bool = True,
        enable_spacy_entities: bool = False,
        use_parser: bool = True,
    ) -> None:
        self.taxonomy_path = Path(taxonomy_path)
        # Merge default weights + plugin weights + user overrides
        base_weights = dict(DEFAULT_WEIGHTS)
        for pname, pspec in _ANALYZER_PLUGINS.items():
            base_weights[pname] = pspec["weight"]
        if weights:
            base_weights.update({k: v for k, v in weights.items() if v >= 0})
        self.weights = self._normalize_weights(base_weights)
        self.enable_fuzzy = enable_fuzzy and HAS_RAPIDFUZZ
        self.enable_spacy_entities = enable_spacy_entities and HAS_SPACY
        self.use_parser = use_parser
        self.taxonomy = self._load_taxonomy()
        self._nlp = None
        self._logger = logging.getLogger(__name__)

    def _load_taxonomy(self) -> Dict[str, Any]:
        # Prefer versioned taxonomy if available
        versioned = Path("config/skills_taxonomy_v1.json")
        candidate = versioned if versioned.exists() else self.taxonomy_path
        if not candidate.exists():
            return {}
        try:
            return json.loads(candidate.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _normalize_weights(self, weights: Dict[str, float]) -> Dict[str, float]:
        total = sum(v for v in weights.values() if v > 0)
        if total <= 0:
            # fallback: equal distribution
            n = len(weights)
            return {k: 1 / n for k in weights}
        return {k: v / total for k, v in weights.items() if v > 0}

    # ---------------------- Public API ----------------------
    def analyze(
        self,
        resume_text: Optional[str] = None,
        job_description: Optional[str] = None,
        resume_path: Optional[str | Path] = None,
        industry: Optional[str] = None,
        extracted_years_experience: Optional[int] = None,
    ) -> ATSAnalysisResult:
        t0 = time.time()
        issues: List[Issue] = []
        timings: Dict[str, int] = {}

        # Acquire resume text
        # Accept explicit empty string as valid (analyze blank resume) but require one of the inputs
        if resume_text is None and resume_path:
            # If parser enabled and file is PDF/DOCX, reuse structured parser
            suffix = str(resume_path).lower()
            if self.use_parser and (suffix.endswith('.pdf') or suffix.endswith('.docx')):
                try:
                    from utils.resume_parser import ResumeParser  # local import to avoid heavy deps if unused
                    parser = ResumeParser()
                    parsed = parser.parse_file(str(resume_path))
                    text = parsed.get('text') or parser.text  # parser stores raw text
                    if parsed.get('years_experience') is not None:
                        extracted_years_experience = extracted_years_experience or parsed.get('years_experience')
                except Exception as e:  # fallback gracefully
                    self._logger.warning(f"ResumeParser failed ({e}); falling back to raw read")
                    text = self._read_file(resume_path)
            else:
                text = self._read_file(resume_path)
        elif resume_text is not None:
            text = resume_text
        else:
            raise ValueError("Either resume_text or resume_path must be provided")

        if len(text) > MAX_TEXT_CHARS:
            issues.append(Issue(level="warning", category="truncation", message="Resume truncated for analysis", suggestion="Reduce file length"))
            text = text[:MAX_TEXT_CHARS]

        # Keyword extraction
        k_start = time.time()
        keyword_data = self._keyword_overlap(text, job_description)
        timings["keywords"] = int((time.time() - k_start) * 1000)

        # Taxonomy / skills alignment
        s_start = time.time()
        skills_alignment = self._skills_alignment(text, industry)
        timings["skills"] = int((time.time() - s_start) * 1000)

        # Sections
        sec_start = time.time()
        section_cov = self._section_coverage(text)
        timings["sections"] = int((time.time() - sec_start) * 1000)

        # Formatting
        fmt_start = time.time()
        formatting = self._formatting(text, issues)
        timings["formatting"] = int((time.time() - fmt_start) * 1000)

        # Readability
        read_start = time.time()
        readability = self._readability(text)
        timings["readability"] = int((time.time() - read_start) * 1000)

        # Experience alignment
        exp_start = time.time()
        experience_alignment = self._experience_alignment(text, job_description, extracted_years_experience)
        timings["experience"] = int((time.time() - exp_start) * 1000)

        # Recency
        rec_start = time.time()
        recency = self._recency(text)
        timings["recency"] = int((time.time() - rec_start) * 1000)

        # Compute component scores (0-100 each before weighting)
        component_scores = {
            "keywords": keyword_data["score"],
            "formatting": formatting["score"],
            "sections": section_cov["score"],
            "readability": readability["score"],
            "experience": experience_alignment["score"],
            "industry": skills_alignment["industry_score"],
            "recency": recency["score"],
        }

        # Run plugins
        if _ANALYZER_PLUGINS:
            plugin_context = {
                "taxonomy": self.taxonomy,
                "base_component_scores": component_scores,
                "metadata": {
                    "fuzzy": self.enable_fuzzy,
                    "spacy_entities": self.enable_spacy_entities,
                }
            }
            collected_plugin_meta: Dict[str, Dict[str, Any]] = {}
            for pname, pspec in _ANALYZER_PLUGINS.items():
                p_start = time.time()
                try:
                    p_score, p_issues, p_meta = pspec["fn"](text, plugin_context)
                    p_score = max(0.0, min(100.0, float(p_score)))
                except Exception as e:  # pragma: no cover
                    self._logger.error(f"Plugin '{pname}' failed: {e}")
                    p_score, p_issues, p_meta = 0.0, [Issue(level="warning", category=pname, message=f"Plugin error: {e}")], {"error": str(e)}
                component_scores[pname] = p_score
                issues.extend(p_issues)
                timings[pname] = int((time.time() - p_start) * 1000)
                # Store plugin metadata (always dict)
                if not isinstance(p_meta, dict):  # pragma: no cover - defensive
                    p_meta = {"value": str(p_meta)}
                collected_plugin_meta[pname] = p_meta
        else:
            collected_plugin_meta = {}

        overall = sum(component_scores[k] * self.weights.get(k, 0) for k in component_scores)

        # Recommendations synthesis
        recommendations = self._recommendations(component_scores, keyword_data, experience_alignment, section_cov, readability, formatting)

        result = ATSAnalysisResult(
            overall_score=round(overall, 2),
            component_scores=component_scores,
            keyword_overlap=keyword_data,
            skills_alignment=skills_alignment,
            experience_alignment=experience_alignment,
            section_coverage=section_cov,
            readability=readability,
            formatting=formatting,
            recency=recency,
            issues=issues,
            recommendations=recommendations,
            timing_ms=timings,
            metadata={
                "fuzzy": str(self.enable_fuzzy),
                "spacy_entities": str(self.enable_spacy_entities),
                "plugins": ",".join(sorted(_ANALYZER_PLUGINS.keys())) if _ANALYZER_PLUGINS else "",
            },
            plugin_metadata=collected_plugin_meta,
        )
        return result

    # ---------------------- Internal scoring helpers ----------------------
    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r"\b[a-zA-Z][a-zA-Z0-9+#/.]{2,}\b", text.lower())

    def _keyword_overlap(self, resume_text: str, job_description: Optional[str]) -> Dict[str, Any]:
        if not job_description:
            return {"score": 75.0, "found": set(), "missing": set(), "partial": set(), "density": {}, "note": "No job description provided"}

        jd_tokens = set(t for t in self._tokenize(job_description) if t not in STOP_WORDS)
        resume_tokens = set(self._tokenize(resume_text))

        found = jd_tokens & resume_tokens
        missing = jd_tokens - found
        partial: Set[str] = set()

        if self.enable_fuzzy and missing:
            # Limit comparisons for performance
            resume_sample = list(resume_tokens)[:500]
            for m in list(missing):
                for r in resume_sample:
                    if len(r) > 3 and fuzz.ratio(m, r) >= 85:  # type: ignore
                        partial.add(m)
                        break
            missing -= partial

        density = {kw: resume_text.lower().count(kw) for kw in found}
        coverage_ratio = len(found) / len(jd_tokens) if jd_tokens else 0
        score = 100 * coverage_ratio
        if coverage_ratio < 0.5:
            score *= 0.85
        if partial:
            score += min(10, len(partial) * 1.5)  # small boost for fuzzy matches
        return {
            "score": min(100.0, round(score, 2)),
            "found": sorted(found),
            "missing": sorted(missing),
            "partial": sorted(partial),
            "density": density,
            "coverage_ratio": round(coverage_ratio, 3),
        }

    def _skills_alignment(self, text: str, industry: Optional[str]) -> Dict[str, Any]:
        tokens = set(self._tokenize(text))
        taxonomy_hits: Dict[str, int] = {}
        industry_score = 0.0

        for key, value in self.taxonomy.items():
            if isinstance(value, list):
                matches = sum(1 for v in value if v.lower().replace(" ", "") in {t.replace(" ", "") for t in tokens})
                taxonomy_hits[key] = matches
            elif isinstance(value, dict):
                for sub, items in value.items():
                    matches = sum(1 for v in items if v.lower().replace(" ", "") in {t.replace(" ", "") for t in tokens})
                    taxonomy_hits[f"{key}.{sub}"] = matches

        if industry:
            # Derive crude industry score: proportion of non-zero taxonomy buckets in related domain
            related = [k for k in taxonomy_hits if industry.lower() in k.lower() or k.startswith(industry.lower())]
            if related:
                non_zero = sum(1 for k in related if taxonomy_hits[k] > 0)
                industry_score = (non_zero / len(related)) * 100

        # Generic skills score (breadth) as number of buckets with at least 1 hit
        breadth = sum(1 for v in taxonomy_hits.values() if v > 0)
        breadth_score = min(100.0, breadth / max(1, len(taxonomy_hits)) * 100)

        return {
            "taxonomy_hits": taxonomy_hits,
            "breadth_score": round(breadth_score, 2),
            "industry_score": round(industry_score or breadth_score * 0.6, 2),
        }

    def _section_coverage(self, text: str) -> Dict[str, Any]:
        lower = text.lower()
        detected = {s for s in EXPECTED_SECTIONS if re.search(rf"\b{s}\b", lower)}
        missing = EXPECTED_SECTIONS - detected
        coverage = len(detected) / len(EXPECTED_SECTIONS)
        score = round(coverage * 100, 2)
        return {"score": score, "detected": sorted(detected), "missing": sorted(missing)}

    def _formatting(self, text: str, issues: List[Issue]) -> Dict[str, Any]:
        score = 100.0
        lower = text.lower()

        # Overuse of special symbols
        special = re.findall(r"[^\w\s\-.,;:()/&@#+]", text)
        if len(set(special)) > 5:
            score -= 10
            issues.append(Issue(level="warning", category="formatting", message="Many unique symbols", suggestion="Use simple ASCII-friendly bullets"))

        # Excessive blank lines
        blanks = re.findall(r"\n{3,}", text)
        if blanks:
            score -= 5
            issues.append(Issue(level="info", category="formatting", message="Excess blank lines", suggestion="Condense spacing"))

        # Non-ASCII ratio
        non_ascii = sum(1 for c in text if ord(c) > 126)
        if non_ascii / max(1, len(text)) > 0.02:
            score -= 10
            issues.append(Issue(level="warning", category="formatting", message="High non-ASCII character usage", suggestion="Replace decorative symbols"))

        # Line length variance heuristic
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        lengths = [len(l) for l in lines]
        if lengths:
            avg = sum(lengths) / len(lengths)
            variance = sum((l - avg) ** 2 for l in lengths) / len(lengths)
            if variance > 600:
                score -= 10
                issues.append(Issue(level="warning", category="formatting", message="High line length variance", suggestion="Avoid multi-column or table layouts"))

        return {"score": max(0.0, round(score, 2))}

    def _readability(self, text: str) -> Dict[str, Any]:
        score = 100.0
        bullets = len(re.findall(r"^\s*[•\-*]", text, re.MULTILINE))
        if bullets < 5:
            score -= 10
        sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
        if sentences:
            avg_len = sum(len(s.split()) for s in sentences) / len(sentences)
            if avg_len > 25:
                score -= 10
            elif avg_len < 8:
                score -= 5
        text_lower = text.lower()
        action_count = sum(1 for v in ACTION_VERBS if v in text_lower)
        if action_count < 3:
            score -= 10
        return {"score": max(0.0, round(score, 2)), "bullets": bullets, "action_verbs_found": action_count}

    def _experience_alignment(self, text: str, jd: Optional[str], extracted_years: Optional[int]) -> Dict[str, Any]:
        # Extract years of experience requirement from JD if present
        required = None
        if jd:
            m = EXPERIENCE_REQ_PATTERN.search(jd)
            if not m:
                m = YEARS_ONLY_PATTERN.search(jd)
            if m:
                try:
                    required = int(m.group(1))
                except Exception:
                    required = None
        # Infer from resume if not provided
        if extracted_years is None:
            # Heuristic: count distinct years appearing and infer earliest
            years = {int(y) for y in RECENCY_PATTERN.findall(text) if int(y) > 1985}
            inferred_years = None
            if years:
                current = max(years)
                earliest = min(years)
                span = max(0, current - earliest)
                inferred_years = min(span, 40)
            extracted_years = inferred_years or 0
        gap = None
        if required is not None:
            gap = extracted_years - required
        score = 100.0
        if required is not None:
            if gap < 0:
                score -= min(60, abs(gap) * 10)
            elif gap > 5:
                score -= 5  # Potential overqualification slight deduction
        if extracted_years == 0:
            score -= 20
        return {"score": max(0.0, round(score, 2)), "required": required, "extracted": extracted_years, "gap": gap}

    def _recency(self, text: str) -> Dict[str, Any]:
        years = sorted({int(y) for y in RECENCY_PATTERN.findall(text) if 1990 <= int(y) <= 2100})
        score = 50.0
        recent_bonus = 0.0
        if years:
            latest = max(years)
            if latest >= 2024:
                recent_bonus += 30
            elif latest >= 2022:
                recent_bonus += 15
            if len(years) >= 5:
                recent_bonus += 5
            score = min(100.0, score + recent_bonus)
        else:
            score = 30.0
        return {"score": round(score, 2), "years_detected": years[-10:]}

    def _recommendations(self, comps: Dict[str, float], kw: Dict[str, Any], exp: Dict[str, Any], sect: Dict[str, Any], read: Dict[str, Any], fmt: Dict[str, Any]) -> List[str]:
        recs: List[str] = []
        if comps["keywords"] < 60:
            recs.append("Increase keyword alignment with job description (add missing terms).")
        if kw.get("missing"):
            recs.append("Add missing high-impact keywords: " + ", ".join(kw["missing"][:8]))
        if comps["sections"] < 80:
            recs.append("Add or complete missing sections: " + ", ".join(sect.get("missing", [])[:5]))
        if comps["experience"] < 70 and exp.get("required"):
            recs.append("Highlight experience depth matching stated requirement.")
        if comps["formatting"] < 80:
            recs.append("Simplify formatting (avoid symbols, multi-columns).")
        if comps["readability"] < 75:
            recs.append("Improve readability (more action verbs, concise bullet points).")
        if comps["recency"] < 60:
            recs.append("Add recent roles or projects (update years to reflect current work).")
        if not recs:
            recs.append("Strong ATS alignment detected. Fine-tune keywords for specific roles.")
        return recs

    # ---------------------- Utilities ----------------------
    def _read_file(self, path: str | Path) -> str:
        p = Path(path)
        return p.read_text(encoding="utf-8", errors="ignore")


def analyze_resume(**kwargs) -> ATSAnalysisResult:
    analyzer = ATSAnalyzer()
    return analyzer.analyze(**kwargs)


def register_default_plugins(force: bool = False) -> None:
    """Register built-in example plugins providing richer semantic signals.

    Plugins (idempotent unless force=True):
      - achievements: Detects quantified achievement lines (numbers + action verbs).
      - leadership_signal: Presence of leadership terms (led, managed, mentored, spearheaded...).
      - action_verb_density: Ratio of lines starting with an action verb.

    Weights are modest so as not to overwhelm core dimensions.
    """
    # Avoid duplicate registration unless force specified
    if not force and all(p in _ANALYZER_PLUGINS for p in [
        "achievements", "leadership_signal", "action_verb_density"
    ]):
        return

    leadership_terms = {"led", "managed", "mentored", "spearheaded", "coordinated", "supervised", "directed"}

    def _achievements_plugin(text: str, ctx: Dict[str, Any]):
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        pattern = re.compile(r"^(?:[-*•]\s*)?(?=.*\b\d+(?:%|k|m)?\b).{0,140}$", re.IGNORECASE)
        action_hits = 0
        quantified = 0
        samples: List[str] = []
        for l in lines:
            low = l.lower()
            if any(v in low for v in ACTION_VERBS):
                action_hits += 1
            if pattern.search(l):
                quantified += 1
                if len(samples) < 5:
                    samples.append(l[:160])
        if not lines:
            return 0.0, [], {"reason": "no_lines"}
        ratio = quantified / len(lines)
        action_ratio = action_hits / len(lines)
        score = min(100.0, (ratio * 70 + action_ratio * 30) * 100)
        meta = {
            "quantified_lines": quantified,
            "total_lines": len(lines),
            "sample_achievement_lines": samples,
            "ratio": round(ratio, 3),
            "action_ratio": round(action_ratio, 3),
        }
        issues: List[Issue] = []
        if ratio < 0.03:
            issues.append(Issue(level="info", category="achievements", message="Few quantified achievements", suggestion="Add metrics (%, $, time saved) to bullet points"))
        return score, issues, meta

    def _leadership_plugin(text: str, ctx: Dict[str, Any]):
        lower = text.lower()
        counts = {t: lower.count(t) for t in leadership_terms}
        total = sum(counts.values())
        unique = sum(1 for c in counts.values() if c > 0)
        score = min(100.0, (unique * 12) + min(40, total * 6))
        meta = {"counts": counts, "unique_terms": unique, "total_mentions": total}
        issues: List[Issue] = []
        if unique == 0:
            issues.append(Issue(level="info", category="leadership", message="No leadership verbs detected", suggestion="Highlight leadership or mentoring examples"))
        return score, issues, meta

    def _action_density_plugin(text: str, ctx: Dict[str, Any]):
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        if not lines:
            return 0.0, [], {"reason": "no_lines"}
        starts = 0
        for l in lines:
            first = l.split(" ", 1)[0].lower().strip("-*•")
            if first in ACTION_VERBS:
                starts += 1
        ratio = starts / len(lines)
        score = min(100.0, ratio * 120)
        meta = {"action_start_lines": starts, "total_lines": len(lines), "ratio": round(ratio, 3)}
        issues: List[Issue] = []
        if ratio < 0.1:
            issues.append(Issue(level="info", category="action_verb_density", message="Few bullet points start with action verbs", suggestion="Lead bullet points with strong verbs"))
        return score, issues, meta

    # (Re)register plugins with chosen weights
    register_analyzer_plugin("achievements", 0.05, _achievements_plugin)
    register_analyzer_plugin("leadership_signal", 0.04, _leadership_plugin)
    register_analyzer_plugin("action_verb_density", 0.03, _action_density_plugin)



if __name__ == "__main__":  # Basic CLI smoke
    import argparse as _arg
    cli = _arg.ArgumentParser(description="ATS Analyzer")
    cli.add_argument("resume", help="Path to resume text or markdown file")
    cli.add_argument("--jd", help="Path to job description text", default=None)
    cli.add_argument("--industry", help="Industry hint (e.g., software, cloud)", default=None)
    args = cli.parse_args()
    resume_text = Path(args.resume).read_text(encoding="utf-8", errors="ignore")
    jd_text = Path(args.jd).read_text(encoding="utf-8", errors="ignore") if args.jd else None
    result = analyze_resume(resume_text=resume_text, job_description=jd_text, industry=args.industry)
    print("Overall Score:", result.overall_score)
    print("Component Scores:", result.component_scores)
    print("Recommendations:", *result.recommendations, sep="\n - ")
