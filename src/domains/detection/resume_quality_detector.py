"""
Resume Quality Detection System

Advanced ML-based resume content quality scoring and analysis.

References:
- SWEBOK v4.0a | https://computer.org/swebok | High | Software Engineering practices
- Textstat | https://pypi.org/project/textstat | Medium | Readability metrics
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class QualityDimension(Enum):
    """Quality dimensions for resume analysis."""

    CONTENT_DEPTH = "content_depth"
    QUANTIFICATION = "quantification"
    ACTION_VERBS = "action_verbs"
    KEYWORD_DENSITY = "keyword_density"
    FORMATTING = "formatting"
    LENGTH = "length"
    READABILITY = "readability"


@dataclass
class QualityIssue:
    """Represents a quality issue in resume."""

    dimension: QualityDimension
    severity: int  # 1-10
    description: str
    location: str
    fix_suggestion: str


@dataclass
class ResumeQualityScore:
    """Comprehensive resume quality assessment."""

    overall_score: float  # 0-100
    dimension_scores: dict[str, float] = field(default_factory=dict)
    issues: list[QualityIssue] = field(default_factory=list)
    strengths: list[str] = field(default_factory=list)
    improvement_potential: float = 0.0  # How much score could improve
    metadata: dict[str, Any] = field(default_factory=dict)


class ResumeQualityDetector:
    """
    AI-powered resume quality detection system.

    Analyzes resume content quality across multiple dimensions:
    - Content depth and specificity
    - Achievement quantification
    - Action verb usage
    - Keyword density
    - Format and structure
    """

    # Strong action verbs for achievements
    STRONG_ACTION_VERBS = {
        "achieved", "accelerated", "accomplished", "advanced", "analyzed",
        "architected", "automated", "built", "championed", "consolidated",
        "created", "decreased", "delivered", "designed", "developed",
        "drove", "engineered", "enhanced", "established", "exceeded",
        "expanded", "generated", "implemented", "improved", "increased",
        "launched", "led", "managed", "optimized", "orchestrated",
        "pioneered", "reduced", "resolved", "spearheaded", "streamlined",
        "strengthened", "transformed", "upgraded",
    }

    # Weak or passive words to avoid
    WEAK_WORDS = {
        "responsible for", "duties included", "worked on", "helped",
        "assisted", "involved in", "participated in", "contributed to",
    }

    # Quantification patterns
    QUANTIFICATION_PATTERNS = [
        r"\d+%",  # Percentages
        r"\$\d+[kmb]?",  # Dollar amounts
        r"\d+\+?\s+(million|thousand|billion)",  # Large numbers
        r"\d+x",  # Multipliers
        r"top\s+\d+%",  # Rankings
    ]

    def __init__(self):
        """Initialize resume quality detector."""
        logger.info("ResumeQualityDetector initialized")

    def analyze(
        self,
        resume_text: str,
        target_industry: str | None = None,
        target_role: str | None = None,
    ) -> ResumeQualityScore:
        """
        Analyze resume quality comprehensively.

        Args:
            resume_text: Full resume text
            target_industry: Target industry for keyword analysis
            target_role: Target role for relevance

        Returns:
            ResumeQualityScore with detailed assessment
        """
        logger.info("Analyzing resume quality")

        issues = []
        strengths = []
        dimension_scores = {}

        # 1. Content depth (25%)
        depth_score, depth_issues = self._analyze_content_depth(resume_text)
        dimension_scores["content_depth"] = depth_score
        issues.extend(depth_issues)

        # 2. Quantification (20%)
        quant_score, quant_issues = self._analyze_quantification(resume_text)
        dimension_scores["quantification"] = quant_score
        issues.extend(quant_issues)
        if quant_score >= 80:
            strengths.append("Strong use of quantifiable achievements")

        # 3. Action verbs (20%)
        action_score, action_issues = self._analyze_action_verbs(resume_text)
        dimension_scores["action_verbs"] = action_score
        issues.extend(action_issues)
        if action_score >= 85:
            strengths.append("Excellent use of strong action verbs")

        # 4. Keyword density (15%)
        keyword_score = self._analyze_keyword_density(resume_text, target_industry)
        dimension_scores["keyword_density"] = keyword_score

        # 5. Formatting (10%)
        format_score, format_issues = self._analyze_formatting(resume_text)
        dimension_scores["formatting"] = format_score
        issues.extend(format_issues)

        # 6. Length (10%)
        length_score, length_issues = self._analyze_length(resume_text)
        dimension_scores["length"] = length_score
        issues.extend(length_issues)

        # Calculate weighted overall score
        weights = {
            "content_depth": 0.25,
            "quantification": 0.20,
            "action_verbs": 0.20,
            "keyword_density": 0.15,
            "formatting": 0.10,
            "length": 0.10,
        }

        overall_score = sum(dimension_scores[k] * weights[k] for k in weights.keys())

        # Calculate improvement potential
        max_possible = 100
        improvement_potential = max_possible - overall_score

        logger.info(f"Resume quality analysis complete: {overall_score:.1f}/100")

        return ResumeQualityScore(
            overall_score=round(overall_score, 1),
            dimension_scores=dimension_scores,
            issues=issues,
            strengths=strengths,
            improvement_potential=round(improvement_potential, 1),
            metadata={
                "target_industry": target_industry,
                "target_role": target_role,
                "word_count": len(resume_text.split()),
            },
        )

    def _analyze_content_depth(self, text: str) -> tuple[float, list[QualityIssue]]:
        """Analyze depth and specificity of content."""
        issues = []
        score = 60.0  # Start at passing

        lines = [line.strip() for line in text.split("\n") if line.strip()]

        # Check for shallow bullet points
        shallow_count = 0
        for line in lines:
            if line.startswith(("•", "-", "*")) and len(line.split()) < 5:
                shallow_count += 1

        if shallow_count > 5:
            issues.append(
                QualityIssue(
                    dimension=QualityDimension.CONTENT_DEPTH,
                    severity=6,
                    description="Multiple bullet points are too brief",
                    location="Throughout experience section",
                    fix_suggestion="Expand bullet points to 10-20 words with specific details",
                )
            )
            score -= 20

        # Check for generic statements
        generic_patterns = [
            r"(?i)responsible for",
            r"(?i)managed\s+(\w+\s+){0,2}team",
            r"(?i)worked on various",
        ]

        generic_count = sum(1 for pattern in generic_patterns if re.search(pattern, text))
        if generic_count >= 3:
            issues.append(
                QualityIssue(
                    dimension=QualityDimension.CONTENT_DEPTH,
                    severity=5,
                    description="Contains generic statements lacking specificity",
                    location="Experience section",
                    fix_suggestion="Replace generic statements with specific outcomes and technologies",
                )
            )
            score -= 15

        # Bonus for specific technical details
        tech_indicators = len(re.findall(r"(?i)\b(implemented|designed|architected|built)\s+\w+", text))
        if tech_indicators >= 5:
            score += 15

        return min(100, max(0, score)), issues

    def _analyze_quantification(self, text: str) -> tuple[float, list[QualityIssue]]:
        """Analyze use of numbers and quantifiable achievements."""
        issues = []

        # Count quantifications
        quant_count = 0
        for pattern in self.QUANTIFICATION_PATTERNS:
            quant_count += len(re.findall(pattern, text, re.IGNORECASE))

        # Estimate number of achievement statements
        achievement_lines = len(re.findall(r"[•\-\*]\s+\w+", text))

        if achievement_lines == 0:
            return 50, []  # No bullet points to quantify

        # Calculate ratio
        quant_ratio = quant_count / max(achievement_lines, 1)

        if quant_ratio < 0.3:
            issues.append(
                QualityIssue(
                    dimension=QualityDimension.QUANTIFICATION,
                    severity=7,
                    description=f"Only {int(quant_ratio * 100)}% of achievements are quantified",
                    location="Experience section",
                    fix_suggestion="Add metrics: percentages, dollar amounts, time savings, team sizes",
                )
            )
            score = 40
        elif quant_ratio < 0.5:
            issues.append(
                QualityIssue(
                    dimension=QualityDimension.QUANTIFICATION,
                    severity=4,
                    description="Some achievements lack quantifiable metrics",
                    location="Experience section",
                    fix_suggestion="Increase quantification to at least 70% of bullets",
                )
            )
            score = 65
        elif quant_ratio < 0.7:
            score = 85
        else:
            score = 95

        return score, issues

    def _analyze_action_verbs(self, text: str) -> tuple[float, list[QualityIssue]]:
        """Analyze use of strong action verbs."""
        issues = []
        score = 70.0

        text_lower = text.lower()

        # Count strong action verbs
        strong_count = sum(1 for verb in self.STRONG_ACTION_VERBS if verb in text_lower)

        # Count weak phrases
        weak_count = sum(1 for weak in self.WEAK_WORDS if weak in text_lower)

        if weak_count >= 5:
            issues.append(
                QualityIssue(
                    dimension=QualityDimension.ACTION_VERBS,
                    severity=6,
                    description=f"Contains {weak_count} instances of weak passive phrases",
                    location="Experience section",
                    fix_suggestion="Replace 'responsible for' with action verbs like 'led', 'implemented', 'developed'",
                )
            )
            score -= 25

        if strong_count < 10:
            issues.append(
                QualityIssue(
                    dimension=QualityDimension.ACTION_VERBS,
                    severity=4,
                    description="Limited use of strong action verbs",
                    location="Experience section",
                    fix_suggestion="Start bullets with power words: achieved, optimized, spearheaded",
                )
            )
            score -= 15
        elif strong_count >= 20:
            score += 15

        return min(100, max(0, score)), issues

    def _analyze_keyword_density(self, text: str, industry: str | None) -> float:
        """Analyze keyword density for ATS optimization."""
        # Simplified keyword analysis
        # In production, this would use industry-specific keyword lists
        score = 75.0

        word_count = len(text.split())

        # Check for keyword repetition (2-3% is optimal)
        # This is a simplified version
        if word_count > 300:
            score += 10

        return min(100, score)

    def _analyze_formatting(self, text: str) -> tuple[float, list[QualityIssue]]:
        """Analyze resume formatting."""
        issues = []
        score = 80.0

        # Check for common formatting issues
        if len(re.findall(r"\t", text)) > 10:
            issues.append(
                QualityIssue(
                    dimension=QualityDimension.FORMATTING,
                    severity=3,
                    description="Uses tabs instead of spaces",
                    location="Throughout document",
                    fix_suggestion="Replace tabs with consistent spacing",
                )
            )
            score -= 10

        # Check for consistent bullet points
        bullet_styles = {
            len(re.findall(r"^•", text, re.MULTILINE)),
            len(re.findall(r"^-", text, re.MULTILINE)),
            len(re.findall(r"^\*", text, re.MULTILINE)),
        }
        if len([s for s in bullet_styles if s > 0]) > 1:
            issues.append(
                QualityIssue(
                    dimension=QualityDimension.FORMATTING,
                    severity=2,
                    description="Inconsistent bullet point styles",
                    location="Throughout document",
                    fix_suggestion="Use a single bullet style throughout",
                )
            )
            score -= 5

        return max(0, score), issues

    def _analyze_length(self, text: str) -> tuple[float, list[QualityIssue]]:
        """Analyze resume length."""
        issues = []

        word_count = len(text.split())

        if word_count < 200:
            issues.append(
                QualityIssue(
                    dimension=QualityDimension.LENGTH,
                    severity=7,
                    description=f"Resume is too brief ({word_count} words)",
                    location="Overall document",
                    fix_suggestion="Expand to 400-800 words with detailed achievements",
                )
            )
            score = 40
        elif word_count > 1200:
            issues.append(
                QualityIssue(
                    dimension=QualityDimension.LENGTH,
                    severity=5,
                    description=f"Resume is too long ({word_count} words)",
                    location="Overall document",
                    fix_suggestion="Condense to 800-1000 words, focusing on recent relevant experience",
                )
            )
            score = 60
        elif 400 <= word_count <= 800:
            score = 95
        else:
            score = 80

        return score, issues
