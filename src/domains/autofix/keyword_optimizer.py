"""
Keyword Optimization System

Optimizes resume keywords for ATS compatibility and job description matching.

References:
- SWEBOK v4.0a | https://computer.org/swebok | High | Requirements analysis
- Apigee Web API Design | https://apigee.com | Medium | Best practices
"""

from __future__ import annotations

import logging
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class KeywordMatch:
    """Represents a keyword match."""

    keyword: str
    count: int
    locations: list[str]
    importance: float  # 0-1


@dataclass
class OptimizationResult:
    """Result of keyword optimization."""

    matched_keywords: list[KeywordMatch]
    missing_keywords: list[str]
    over_optimized_keywords: list[str]
    optimization_score: float  # 0-100
    recommendations: list[str]
    metadata: dict[str, Any] = field(default_factory=dict)


class KeywordOptimizer:
    """
    Intelligent keyword optimization system.

    Analyzes and optimizes keywords for:
    - ATS compatibility
    - Job description matching
    - Natural language flow
    - Keyword density (2-3% optimal)
    """

    # Optimal keyword density range
    MIN_DENSITY = 0.015  # 1.5%
    MAX_DENSITY = 0.03  # 3%
    OPTIMAL_DENSITY = 0.025  # 2.5%

    # Keyword importance weights
    KEYWORD_WEIGHTS = {
        "technical_skills": 1.0,
        "soft_skills": 0.7,
        "certifications": 0.9,
        "tools": 0.8,
        "methodologies": 0.7,
    }

    def __init__(self):
        """Initialize keyword optimizer."""
        logger.info("KeywordOptimizer initialized")

    def optimize(
        self,
        resume_text: str,
        job_description: str,
        target_keywords: list[str] | None = None,
    ) -> OptimizationResult:
        """
        Optimize resume keywords for job description match.

        Args:
            resume_text: Current resume text
            job_description: Target job description
            target_keywords: Additional target keywords

        Returns:
            OptimizationResult with analysis and recommendations
        """
        logger.info("Optimizing resume keywords")

        # Extract keywords from job description
        jd_keywords = self._extract_keywords(job_description)

        # Add target keywords if provided
        if target_keywords:
            jd_keywords.update(target_keywords)

        # Analyze current keyword usage
        matched_keywords = []
        missing_keywords = []
        over_optimized = []

        resume_lower = resume_text.lower()
        resume_words = resume_text.split()
        total_words = len(resume_words)

        for keyword in jd_keywords:
            # Count occurrences
            count = resume_lower.count(keyword.lower())

            if count > 0:
                # Calculate density
                density = count / total_words if total_words > 0 else 0

                # Find locations
                locations = self._find_keyword_locations(resume_text, keyword)

                # Determine importance
                importance = self._calculate_keyword_importance(keyword, job_description)

                matched_keywords.append(
                    KeywordMatch(
                        keyword=keyword,
                        count=count,
                        locations=locations,
                        importance=importance,
                    )
                )

                # Check for over-optimization (keyword stuffing)
                if density > self.MAX_DENSITY and count > 5:
                    over_optimized.append(keyword)

            else:
                missing_keywords.append(keyword)

        # Calculate optimization score
        optimization_score = self._calculate_optimization_score(
            matched_keywords, missing_keywords, jd_keywords
        )

        # Generate recommendations
        recommendations = self._generate_recommendations(
            matched_keywords, missing_keywords, over_optimized, resume_text
        )

        logger.info(
            f"Keyword optimization complete: {optimization_score:.1f}% match, "
            f"{len(missing_keywords)} missing keywords"
        )

        return OptimizationResult(
            matched_keywords=matched_keywords,
            missing_keywords=missing_keywords,
            over_optimized_keywords=over_optimized,
            optimization_score=round(optimization_score, 1),
            recommendations=recommendations,
            metadata={
                "total_jd_keywords": len(jd_keywords),
                "total_matched": len(matched_keywords),
                "total_words": total_words,
            },
        )

    def _extract_keywords(self, text: str) -> set[str]:
        """Extract important keywords from text."""
        # Remove common stop words
        stop_words = {
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
            "from",
            "up",
            "about",
            "into",
            "through",
            "during",
            "is",
            "are",
            "was",
            "were",
            "be",
            "been",
            "being",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
        }

        # Extract words
        words = re.findall(r"\b[a-zA-Z][a-zA-Z+#.]{1,}\b", text.lower())

        # Filter and count
        word_counts = Counter([w for w in words if w not in stop_words])

        # Extract multi-word technical terms
        technical_patterns = [
            r"\b\w+\.js\b",  # JavaScript frameworks
            r"\b[A-Z]{2,}\b",  # Acronyms
            r"\b\w+[A-Z]\w+\b",  # CamelCase
        ]

        multi_word = set()
        for pattern in technical_patterns:
            multi_word.update(re.findall(pattern, text))

        # Get top keywords (appearing 2+ times)
        keywords = {word for word, count in word_counts.items() if count >= 2}

        # Add multi-word terms
        keywords.update(w.lower() for w in multi_word)

        # Limit to top 50 most relevant
        return set(sorted(keywords, key=lambda k: word_counts.get(k, 0), reverse=True)[:50])

    def _find_keyword_locations(self, text: str, keyword: str) -> list[str]:
        """Find where keyword appears in resume."""
        locations = []

        # Define section patterns
        sections = {
            "summary": r"(?i)(summary|objective|profile)",
            "experience": r"(?i)(experience|employment|work history)",
            "skills": r"(?i)(skills|technical skills|competencies)",
            "education": r"(?i)education",
            "projects": r"(?i)projects",
        }

        text_lower = text.lower()
        keyword_lower = keyword.lower()

        # Find keyword positions
        for section_name, pattern in sections.items():
            section_match = re.search(pattern, text)
            if section_match and keyword_lower in text_lower[section_match.start() :]:
                locations.append(section_name)

        return locations if locations else ["body"]

    def _calculate_keyword_importance(self, keyword: str, job_description: str) -> float:
        """Calculate importance of keyword based on context."""
        jd_lower = job_description.lower()

        # Count occurrences in job description
        count = jd_lower.count(keyword.lower())

        # Check if in requirements/qualifications section (higher weight)
        req_section = re.search(
            r"(?i)(requirements|qualifications|must have)(.*?)(?=\n\n|\Z)",
            job_description,
            re.DOTALL,
        )

        if req_section and keyword.lower() in req_section.group(0).lower():
            base_importance = 1.0
        else:
            base_importance = 0.7

        # Scale by frequency (max 1.0)
        frequency_score = min(1.0, count / 5.0)

        return base_importance * frequency_score

    def _calculate_optimization_score(
        self,
        matched: list[KeywordMatch],
        missing: list[str],
        all_jd_keywords: set[str],
    ) -> float:
        """Calculate overall keyword optimization score."""
        if not all_jd_keywords:
            return 50.0  # Neutral score if no keywords

        # Weight by importance
        total_importance = sum(m.importance for m in matched)
        max_importance = len(all_jd_keywords)  # Assuming avg importance of 1.0

        match_score = (total_importance / max_importance * 100) if max_importance > 0 else 0

        # Penalty for missing critical keywords
        critical_missing = len(
            [k for k in missing if len(k) > 5]
        )  # Longer keywords are likely more important
        penalty = min(30, critical_missing * 3)

        final_score = max(0, match_score - penalty)

        return final_score

    def _generate_recommendations(
        self,
        matched: list[KeywordMatch],
        missing: list[str],
        over_optimized: list[str],
        resume_text: str,
    ) -> list[str]:
        """Generate actionable keyword recommendations."""
        recommendations = []

        # Priority 1: Add missing critical keywords
        if missing:
            top_missing = missing[:5]  # Top 5 missing
            recommendations.append(f"Add these missing keywords: {', '.join(top_missing)}")

        # Priority 2: Address over-optimization
        if over_optimized:
            recommendations.append(
                f"Reduce repetition of: {', '.join(over_optimized)} (appears too frequently)"
            )

        # Priority 3: Improve keyword distribution
        section_coverage = {}
        for match in matched:
            for location in match.locations:
                section_coverage[location] = section_coverage.get(location, 0) + 1

        if "skills" not in section_coverage and missing:
            recommendations.append("Add a Skills section to showcase technical competencies")

        # Priority 4: Natural language
        if not over_optimized and matched:
            avg_count = sum(m.count for m in matched) / len(matched)
            if avg_count > 4:
                recommendations.append(
                    "Use synonyms and variations to maintain natural language flow"
                )

        # Priority 5: Strategic placement
        if matched:
            low_importance = [m for m in matched if m.importance < 0.5]
            if len(low_importance) > len(matched) / 2:
                recommendations.append(
                    "Focus on keywords that appear in the job requirements section"
                )

        if not recommendations:
            recommendations.append(
                "✓ Good keyword optimization! Consider minor refinements based on specific job descriptions"
            )

        return recommendations
