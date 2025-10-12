"""
Bullet Point Enhancement System

Transforms weak bullet points into powerful achievement statements.

References:
- SWEBOK v4.0a | https://computer.org/swebok | High | Quality improvement
- LinkedIn Career Advice | https://business.linkedin.com | Medium | Resume best practices
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class EnhancementType(Enum):
    """Types of bullet point enhancements."""

    ACTION_VERB_UPGRADE = "action_verb_upgrade"
    QUANTIFICATION_ADDED = "quantification_added"
    CONTEXT_ADDED = "context_added"
    IMPACT_EMPHASIZED = "impact_emphasized"
    TECHNICAL_DETAIL_ADDED = "technical_detail_added"


@dataclass
class EnhancedBullet:
    """Represents an enhanced bullet point."""

    original: str
    enhanced: str
    enhancements: list[EnhancementType]
    improvement_score: float  # 0-100
    explanation: str


class BulletEnhancer:
    """
    Intelligent bullet point enhancement system.

    Transforms weak statements into powerful achievements following the
    STAR (Situation, Task, Action, Result) or CAR (Challenge, Action, Result) format.
    """

    # Power words for different contexts
    LEADERSHIP_VERBS = {
        "led", "directed", "managed", "coordinated", "spearheaded",
        "championed", "orchestrated", "supervised", "mentored"
    }

    CREATION_VERBS = {
        "developed", "created", "designed", "built", "engineered",
        "architected", "established", "launched", "implemented"
    }

    IMPROVEMENT_VERBS = {
        "improved", "enhanced", "optimized", "streamlined", "accelerated",
        "increased", "boosted", "elevated", "strengthened"
    }

    ACHIEVEMENT_VERBS = {
        "achieved", "delivered", "exceeded", "accomplished", "attained",
        "secured", "generated", "produced"
    }

    # Quantification templates
    QUANTIFICATION_PATTERNS = {
        "performance": ["by {X}%", "from {X} to {Y}", "by {X}x"],
        "scale": ["{X}+ users", "{X} transactions", "{X} requests/sec"],
        "time": ["in {X} months", "reducing time by {X}%"],
        "money": ["saving ${X}K", "generating ${X}M in revenue"],
        "team": ["team of {X}", "{X} engineers", "{X} stakeholders"],
    }

    def __init__(self):
        """Initialize bullet enhancer."""
        logger.info("BulletEnhancer initialized")

    def enhance(self, bullet_point: str) -> EnhancedBullet:
        """
        Enhance a single bullet point.

        Args:
            bullet_point: Original bullet point text

        Returns:
            EnhancedBullet with improvements
        """
        # Clean input
        bullet = bullet_point.strip().lstrip("•-*").strip()

        if not bullet:
            return EnhancedBullet(
                original=bullet_point,
                enhanced=bullet_point,
                enhancements=[],
                improvement_score=0,
                explanation="Empty bullet point",
            )

        enhancements = []
        enhanced = bullet
        explanation_parts = []

        # 1. Upgrade action verb
        enhanced, verb_enhanced = self._upgrade_action_verb(enhanced)
        if verb_enhanced:
            enhancements.append(EnhancementType.ACTION_VERB_UPGRADE)
            explanation_parts.append("upgraded action verb")

        # 2. Check for quantification
        if not self._has_quantification(enhanced):
            enhanced, quant_added = self._suggest_quantification(enhanced)
            if quant_added:
                enhancements.append(EnhancementType.QUANTIFICATION_ADDED)
                explanation_parts.append("added quantification placeholder")

        # 3. Add context if missing
        enhanced, context_added = self._add_context(enhanced)
        if context_added:
            enhancements.append(EnhancementType.CONTEXT_ADDED)
            explanation_parts.append("added context")

        # 4. Emphasize impact
        enhanced, impact_emphasized = self._emphasize_impact(enhanced)
        if impact_emphasized:
            enhancements.append(EnhancementType.IMPACT_EMPHASIZED)
            explanation_parts.append("emphasized impact")

        # Calculate improvement score
        improvement_score = self._calculate_improvement(bullet, enhanced, enhancements)

        explanation = (
            f"Enhanced by: {', '.join(explanation_parts)}"
            if explanation_parts
            else "No enhancements needed"
        )

        logger.debug(f"Enhanced bullet: {improvement_score:.0f}% improvement")

        return EnhancedBullet(
            original=bullet_point,
            enhanced=enhanced,
            enhancements=enhancements,
            improvement_score=round(improvement_score, 1),
            explanation=explanation,
        )

    def enhance_batch(self, bullet_points: list[str]) -> list[EnhancedBullet]:
        """Enhance multiple bullet points."""
        return [self.enhance(bullet) for bullet in bullet_points]

    def _upgrade_action_verb(self, text: str) -> tuple[str, bool]:
        """Upgrade to a stronger action verb if possible."""
        # Check first word
        words = text.split()
        if not words:
            return text, False

        first_word = words[0].lower()

        # Map weak verbs to strong verbs based on context
        upgrades = {
            "worked": "developed",
            "helped": "facilitated",
            "did": "executed",
            "made": "created",
            "was": "served as",
            "handled": "managed",
            "used": "leveraged",
            "wrote": "authored",
        }

        if first_word in upgrades:
            words[0] = upgrades[first_word].capitalize() if words[0][0].isupper() else upgrades[first_word]
            return " ".join(words), True

        return text, False

    def _has_quantification(self, text: str) -> bool:
        """Check if text contains quantification."""
        patterns = [
            r"\d+%",  # Percentages
            r"\$\d+",  # Dollar amounts
            r"\d+\s*(million|thousand|k|m|b)\b",  # Large numbers
            r"\d+x\b",  # Multipliers
            r"\d+\+",  # Plus indicators
        ]

        return any(re.search(pattern, text, re.IGNORECASE) for pattern in patterns)

    def _suggest_quantification(self, text: str) -> tuple[str, bool]:
        """Add quantification suggestion to text."""
        # Identify what type of quantification would be appropriate
        text_lower = text.lower()

        suggestion = ""
        if any(word in text_lower for word in ["improve", "increase", "enhance", "boost"]):
            suggestion = " [ADD: by X%]"
        elif any(word in text_lower for word in ["reduce", "decrease", "lower"]):
            suggestion = " [ADD: by X%]"
        elif any(word in text_lower for word in ["develop", "create", "build"]):
            suggestion = " [ADD: serving X users or processing X transactions]"
        elif any(word in text_lower for word in ["manage", "lead", "coordinate"]):
            suggestion = " [ADD: team of X or X stakeholders]"
        elif any(word in text_lower for word in ["save", "generate", "produce"]):
            suggestion = " [ADD: $X or X hours]"

        if suggestion:
            return text + suggestion, True

        return text, False

    def _add_context(self, text: str) -> tuple[str, bool]:
        """Add context if the statement is too generic."""
        text_lower = text.lower()

        # Check if context is missing
        lacks_context = (
            len(text.split()) < 8
            and not any(tech in text_lower for tech in ["python", "java", "aws", "react", "docker"])
        )

        if lacks_context and any(word in text_lower for word in ["developed", "created", "built"]):
            suggestion = " using [TECHNOLOGY/METHOD]"
            return text + suggestion, True

        return text, False

    def _emphasize_impact(self, text: str) -> tuple[str, bool]:
        """Emphasize the impact of the action."""
        text_lower = text.lower()

        # Check if impact is mentioned
        has_impact = any(
            word in text_lower
            for word in ["result", "impact", "outcome", "improve", "increase", "reduce"]
        )

        if not has_impact and self._has_quantification(text):
            # Already quantified, just needs impact verb
            return text, False

        if not has_impact and len(text.split()) > 10:
            # Long statement without clear impact
            suggestion = ", resulting in [POSITIVE OUTCOME]"
            return text + suggestion, True

        return text, False

    def _calculate_improvement(
        self, original: str, enhanced: str, enhancements: list[EnhancementType]
    ) -> float:
        """Calculate improvement score."""
        if not enhancements:
            return 0.0

        # Weight different enhancement types
        weights = {
            EnhancementType.ACTION_VERB_UPGRADE: 15.0,
            EnhancementType.QUANTIFICATION_ADDED: 30.0,
            EnhancementType.CONTEXT_ADDED: 20.0,
            EnhancementType.IMPACT_EMPHASIZED: 25.0,
            EnhancementType.TECHNICAL_DETAIL_ADDED: 10.0,
        }

        total_score = sum(weights.get(e, 10.0) for e in enhancements)

        return min(100, total_score)
