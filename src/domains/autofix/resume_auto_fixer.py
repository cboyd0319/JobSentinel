"""
Resume Auto-Fixer System

Automatically fixes and enhances resume content for ATS optimization.

References:
- SWEBOK v4.0a | https://computer.org/swebok | High | Quality assurance
- OWASP ASVS 5.0 | https://owasp.org/ASVS | High | Input validation
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class FixType(Enum):
    """Types of automatic fixes."""

    GRAMMAR = "grammar"
    SPELLING = "spelling"
    FORMATTING = "formatting"
    ACTION_VERB = "action_verb"
    QUANTIFICATION = "quantification"
    KEYWORD_INJECTION = "keyword_injection"
    SECTION_REORDER = "section_reorder"
    BULLET_ENHANCEMENT = "bullet_enhancement"


@dataclass
class Fix:
    """Represents an applied fix."""

    fix_type: FixType
    original: str
    fixed: str
    confidence: float  # 0-1
    explanation: str


@dataclass
class AutoFixResult:
    """Result of auto-fix operation."""

    original_text: str
    fixed_text: str
    fixes_applied: list[Fix]
    improvement_score: float  # 0-100
    metadata: dict[str, Any] = field(default_factory=dict)


class ResumeAutoFixer:
    """
    Intelligent resume auto-fixer.

    Automatically applies fixes to improve resume quality:
    - Grammar and spelling corrections
    - ATS-friendly formatting
    - Action verb enhancement
    - Quantification suggestions
    - Keyword optimization
    """

    # Common spelling mistakes
    COMMON_MISSPELLINGS = {
        "achived": "achieved",
        "recieved": "received",
        "occured": "occurred",
        "seperate": "separate",
        "definately": "definitely",
        "accomodate": "accommodate",
        "managment": "management",
        "sucessful": "successful",
        "experiance": "experience",
        "responsibilty": "responsibility",
    }

    # Weak to strong action verb replacements
    ACTION_VERB_UPGRADES = {
        "worked on": "developed",
        "helped": "facilitated",
        "responsible for": "led",
        "did": "executed",
        "made": "created",
        "got": "achieved",
        "used": "leveraged",
        "was involved in": "contributed to",
        "participated in": "collaborated on",
        "dealt with": "managed",
    }

    # ATS-unfriendly formatting patterns
    ATS_FORMAT_ISSUES = [
        (r"\t+", " "),  # Tabs to spaces
        (r" {2,}", " "),  # Multiple spaces to single space
        (r"\n{3,}", "\n\n"),  # Multiple newlines to double
    ]

    def __init__(self):
        """Initialize resume auto-fixer."""
        logger.info("ResumeAutoFixer initialized")

    def auto_fix(
        self,
        resume_text: str,
        target_keywords: list[str] | None = None,
        aggressive: bool = False,
    ) -> AutoFixResult:
        """
        Automatically fix and enhance resume.

        Args:
            resume_text: Original resume text
            target_keywords: Keywords to optimize for
            aggressive: If True, applies more substantial changes

        Returns:
            AutoFixResult with fixes and improved text
        """
        logger.info("Starting auto-fix process")

        fixes_applied = []
        current_text = resume_text
        original_text = resume_text

        # 1. Fix spelling
        current_text, spelling_fixes = self._fix_spelling(current_text)
        fixes_applied.extend(spelling_fixes)

        # 2. Fix formatting
        current_text, format_fixes = self._fix_formatting(current_text)
        fixes_applied.extend(format_fixes)

        # 3. Enhance action verbs
        current_text, verb_fixes = self._enhance_action_verbs(current_text)
        fixes_applied.extend(verb_fixes)

        # 4. Add quantification suggestions (if aggressive)
        if aggressive:
            current_text, quant_fixes = self._suggest_quantification(current_text)
            fixes_applied.extend(quant_fixes)

        # 5. Inject keywords (if provided)
        if target_keywords and aggressive:
            current_text, keyword_fixes = self._inject_keywords(current_text, target_keywords)
            fixes_applied.extend(keyword_fixes)

        # 6. Reorder sections for ATS
        current_text, section_fixes = self._reorder_sections(current_text)
        fixes_applied.extend(section_fixes)

        # Calculate improvement score
        improvement_score = self._calculate_improvement(
            original_text, current_text, fixes_applied
        )

        logger.info(
            f"Auto-fix complete: {len(fixes_applied)} fixes applied, "
            f"{improvement_score:.1f}% improvement"
        )

        return AutoFixResult(
            original_text=original_text,
            fixed_text=current_text,
            fixes_applied=fixes_applied,
            improvement_score=round(improvement_score, 1),
            metadata={
                "aggressive_mode": aggressive,
                "target_keywords_provided": bool(target_keywords),
            },
        )

    def _fix_spelling(self, text: str) -> tuple[str, list[Fix]]:
        """Fix common spelling mistakes."""
        fixes = []
        fixed_text = text

        for misspelling, correction in self.COMMON_MISSPELLINGS.items():
            pattern = re.compile(r"\b" + re.escape(misspelling) + r"\b", re.IGNORECASE)
            matches = pattern.finditer(fixed_text)

            for match in matches:
                original_word = match.group(0)
                # Preserve capitalization
                if original_word[0].isupper():
                    corrected = correction.capitalize()
                else:
                    corrected = correction

                fixes.append(
                    Fix(
                        fix_type=FixType.SPELLING,
                        original=original_word,
                        fixed=corrected,
                        confidence=0.95,
                        explanation=f"Corrected spelling: {original_word} → {corrected}",
                    )
                )

            fixed_text = pattern.sub(correction, fixed_text)

        return fixed_text, fixes

    def _fix_formatting(self, text: str) -> tuple[str, list[Fix]]:
        """Fix ATS-unfriendly formatting."""
        fixes = []
        fixed_text = text

        for pattern, replacement in self.ATS_FORMAT_ISSUES:
            matches = re.finditer(pattern, fixed_text)
            match_count = sum(1 for _ in matches)

            if match_count > 0:
                fixes.append(
                    Fix(
                        fix_type=FixType.FORMATTING,
                        original=f"Pattern: {pattern}",
                        fixed=f"Replaced with: {replacement}",
                        confidence=1.0,
                        explanation=f"Fixed {match_count} formatting issues for ATS compatibility",
                    )
                )

            fixed_text = re.sub(pattern, replacement, fixed_text)

        return fixed_text, fixes

    def _enhance_action_verbs(self, text: str) -> tuple[str, list[Fix]]:
        """Replace weak phrases with strong action verbs."""
        fixes = []
        fixed_text = text

        for weak, strong in self.ACTION_VERB_UPGRADES.items():
            pattern = re.compile(r"\b" + re.escape(weak) + r"\b", re.IGNORECASE)
            matches = list(pattern.finditer(fixed_text))

            for match in matches:
                original = match.group(0)

                fixes.append(
                    Fix(
                        fix_type=FixType.ACTION_VERB,
                        original=original,
                        fixed=strong,
                        confidence=0.85,
                        explanation=f"Enhanced weak phrase: '{original}' → '{strong}'",
                    )
                )

            fixed_text = pattern.sub(strong, fixed_text)

        return fixed_text, fixes

    def _suggest_quantification(self, text: str) -> tuple[str, list[Fix]]:
        """Add quantification markers to achievements."""
        fixes = []
        fixed_text = text

        # Find bullet points without numbers
        lines = fixed_text.split("\n")
        updated_lines = []

        for line in lines:
            if line.strip().startswith(("•", "-", "*")):
                # Check if line has quantification
                has_number = bool(re.search(r"\d+", line))

                if not has_number and len(line.split()) > 5:
                    # Suggest adding quantification
                    suggestion = line + " [ADD METRIC: e.g., X%, $Y, Z users]"
                    updated_lines.append(suggestion)

                    fixes.append(
                        Fix(
                            fix_type=FixType.QUANTIFICATION,
                            original=line,
                            fixed=suggestion,
                            confidence=0.70,
                            explanation="Added quantification suggestion marker",
                        )
                    )
                else:
                    updated_lines.append(line)
            else:
                updated_lines.append(line)

        fixed_text = "\n".join(updated_lines)
        return fixed_text, fixes

    def _inject_keywords(
        self, text: str, keywords: list[str]
    ) -> tuple[str, list[Fix]]:
        """Inject missing keywords into appropriate sections."""
        fixes = []
        fixed_text = text

        # Find skills section
        skills_match = re.search(
            r"(?i)(skills|technical\s+skills|core\s+competencies)[:\s]*\n",
            fixed_text,
        )

        if skills_match:
            # Get existing skills
            text_lower = text.lower()
            missing_keywords = [
                kw for kw in keywords if kw.lower() not in text_lower
            ]

            if missing_keywords and len(missing_keywords) <= 5:
                # Add up to 5 missing keywords
                insertion_point = skills_match.end()
                keywords_text = ", ".join(missing_keywords[:5])

                fixed_text = (
                    fixed_text[:insertion_point]
                    + keywords_text
                    + "\n"
                    + fixed_text[insertion_point:]
                )

                fixes.append(
                    Fix(
                        fix_type=FixType.KEYWORD_INJECTION,
                        original="Skills section",
                        fixed=f"Added keywords: {keywords_text}",
                        confidence=0.75,
                        explanation=f"Injected {len(missing_keywords[:5])} relevant keywords",
                    )
                )

        return fixed_text, fixes

    def _reorder_sections(self, text: str) -> tuple[str, list[Fix]]:
        """Reorder sections for optimal ATS parsing."""
        fixes = []

        # Define optimal section order
        optimal_order = [
            r"(?i)(contact|personal\s+information)",
            r"(?i)(professional\s+)?summary|objective",
            r"(?i)(technical\s+)?skills|core\s+competencies",
            r"(?i)(work\s+|professional\s+)?experience",
            r"(?i)education",
            r"(?i)(certifications|certificates)",
            r"(?i)(projects|portfolio)",
        ]

        # For now, just note if sections are out of order
        # Full reordering would require more sophisticated parsing

        sections_found = []
        for i, pattern in enumerate(optimal_order):
            match = re.search(pattern, text)
            if match:
                sections_found.append((i, match.start(), pattern))

        # Check if sections are in order
        positions = [pos for _, pos, _ in sections_found]
        if positions != sorted(positions):
            fixes.append(
                Fix(
                    fix_type=FixType.SECTION_REORDER,
                    original="Current section order",
                    fixed="Suggested: Contact → Summary → Skills → Experience → Education",
                    confidence=0.80,
                    explanation="Consider reordering sections for better ATS compatibility",
                )
            )

        return text, fixes

    def _calculate_improvement(
        self, original: str, fixed: str, fixes: list[Fix]
    ) -> float:
        """Calculate improvement score based on fixes applied."""
        if not fixes:
            return 0.0

        # Weight different fix types
        weights = {
            FixType.SPELLING: 5.0,
            FixType.GRAMMAR: 5.0,
            FixType.FORMATTING: 3.0,
            FixType.ACTION_VERB: 4.0,
            FixType.QUANTIFICATION: 8.0,
            FixType.KEYWORD_INJECTION: 7.0,
            FixType.SECTION_REORDER: 6.0,
            FixType.BULLET_ENHANCEMENT: 5.0,
        }

        total_score = 0.0
        for fix in fixes:
            weight = weights.get(fix.fix_type, 3.0)
            total_score += weight * fix.confidence

        # Normalize to 0-100 scale
        # Assume 10 high-impact fixes = 100% improvement
        max_score = 10 * 8.0  # 10 quantification fixes at max weight
        improvement = min(100, (total_score / max_score) * 100)

        return improvement
