"""
ATS Compatibility Scorer

Calculates overall ATS compatibility scores based on analysis results.
"""

import logging
from typing import Dict, List

from ..models import (
    ATSCompatibilityScore,
    ATSIssue,
    ATSIssueLevel,
    ATSSystem,
    KeywordMatch,
)

logger = logging.getLogger(__name__)


class CompatibilityScorer:
    """Calculates comprehensive ATS compatibility scores."""

    # Weight factors for different score components
    COMPONENT_WEIGHTS = {
        "formatting": 0.35,  # Most critical for ATS parsing
        "keywords": 0.25,  # Important for relevance
        "readability": 0.20,  # Affects human reviewers
        "structure": 0.20,  # Important for organization
    }

    # Base scores for different ATS systems (out of 100)
    ATS_BASE_SCORES = {
        ATSSystem.TALEO: 70,  # Oldest, most restrictive
        ATSSystem.WORKDAY: 80,  # More modern, better parsing
        ATSSystem.ICIMS: 75,  # Middle ground
        ATSSystem.GREENHOUSE: 85,  # Developer-friendly
        ATSSystem.LEVER: 85,  # Modern, good parsing
        ATSSystem.JOBVITE: 80,  # Decent parsing
        ATSSystem.SMARTRECRUITERS: 82,  # Good modern system
        ATSSystem.GENERIC: 70,  # Conservative estimate
    }

    def calculate_compatibility_score(
        self,
        issues: List[ATSIssue],
        keyword_matches: List[KeywordMatch],
        resume_text: str,
        job_keywords: List[str] = None,
    ) -> ATSCompatibilityScore:
        """Calculate comprehensive ATS compatibility score."""

        # Calculate component scores
        component_scores = {
            "formatting": self._calculate_formatting_score(issues),
            "keywords": self._calculate_keyword_score(keyword_matches, job_keywords),
            "readability": self._calculate_readability_score(issues, resume_text),
            "structure": self._calculate_structure_score(issues),
        }

        # Calculate weighted overall score
        overall_score = sum(
            score * self.COMPONENT_WEIGHTS[component]
            for component, score in component_scores.items()
        )

        # Calculate system-specific scores
        system_scores = self._calculate_system_scores(issues, overall_score)

        # Generate recommendations
        priority_recommendations = self._generate_priority_recommendations(issues)
        quick_wins = self._generate_quick_wins(issues, keyword_matches)

        # Extract resume metadata
        word_count = len(resume_text.split()) if resume_text else 0
        sections = self._identify_sections(resume_text) if resume_text else []

        return ATSCompatibilityScore(
            overall_score=round(overall_score, 1),
            component_scores=component_scores,
            issues=issues,
            keyword_matches=keyword_matches,
            system_scores=system_scores,
            resume_word_count=word_count,
            resume_sections=sections,
            priority_recommendations=priority_recommendations,
            quick_wins=quick_wins,
        )

    def _calculate_formatting_score(self, issues: List[ATSIssue]) -> float:
        """Calculate formatting compatibility score."""
        formatting_issues = [i for i in issues if i.category == "formatting"]

        if not formatting_issues:
            return 100.0

        # Deduct points based on issue severity and count
        total_deduction = 0
        for issue in formatting_issues:
            severity_deduction = {
                ATSIssueLevel.CRITICAL: 25,
                ATSIssueLevel.HIGH: 15,
                ATSIssueLevel.MEDIUM: 8,
                ATSIssueLevel.LOW: 3,
                ATSIssueLevel.INFO: 1,
            }
            total_deduction += severity_deduction.get(issue.level, 5)

        score = max(0, 100 - total_deduction)
        return round(score, 1)

    def _calculate_keyword_score(
        self, keyword_matches: List[KeywordMatch], job_keywords: List[str] = None
    ) -> float:
        """Calculate keyword relevance score."""
        if not keyword_matches:
            return 20.0  # Very low if no keywords found

        # Base score from keyword density and relevance
        total_relevance = sum(match.relevance_score for match in keyword_matches)
        keyword_count = len(keyword_matches)

        # Factor in match quality
        high_relevance_matches = [m for m in keyword_matches if m.relevance_score > 0.7]
        skill_matches = [m for m in keyword_matches if m.is_skill]

        # Calculate base score
        base_score = min(80, (total_relevance / max(1, keyword_count)) * 100)

        # Bonus for high-quality matches
        quality_bonus = min(20, len(high_relevance_matches) * 2)
        skill_bonus = min(10, len(skill_matches))

        final_score = base_score + quality_bonus + skill_bonus
        return round(min(100, final_score), 1)

    def _calculate_readability_score(self, issues: List[ATSIssue], resume_text: str) -> float:
        """Calculate readability score."""
        readability_issues = [i for i in issues if i.category == "readability"]

        base_score = 85.0  # Start with good baseline

        # Deduct for readability issues
        for issue in readability_issues:
            severity_deduction = {
                ATSIssueLevel.CRITICAL: 20,
                ATSIssueLevel.HIGH: 12,
                ATSIssueLevel.MEDIUM: 7,
                ATSIssueLevel.LOW: 3,
                ATSIssueLevel.INFO: 1,
            }
            base_score -= severity_deduction.get(issue.level, 5)

        # Simple length check
        if resume_text:
            word_count = len(resume_text.split())
            if word_count < 200:
                base_score -= 15  # Too short
            elif word_count > 800:
                base_score -= 10  # Too long

        return round(max(0, base_score), 1)

    def _calculate_structure_score(self, issues: List[ATSIssue]) -> float:
        """Calculate structure and organization score."""
        structure_issues = [i for i in issues if i.category == "structure"]

        base_score = 90.0

        for issue in structure_issues:
            severity_deduction = {
                ATSIssueLevel.CRITICAL: 30,
                ATSIssueLevel.HIGH: 20,
                ATSIssueLevel.MEDIUM: 10,
                ATSIssueLevel.LOW: 5,
                ATSIssueLevel.INFO: 2,
            }
            base_score -= severity_deduction.get(issue.level, 8)

        return round(max(0, base_score), 1)

    def _calculate_system_scores(
        self, issues: List[ATSIssue], overall_score: float
    ) -> Dict[ATSSystem, float]:
        """Calculate compatibility scores for specific ATS systems."""
        system_scores = {}

        for ats_system in ATSSystem:
            base_score = self.ATS_BASE_SCORES[ats_system]

            # Find issues that affect this system
            system_issues = [
                issue
                for issue in issues
                if ats_system in issue.affected_systems or not issue.affected_systems
            ]

            # Calculate deductions for this system
            total_deduction = 0
            for issue in system_issues:
                # System-specific deduction multipliers
                severity_multiplier = {
                    ATSIssueLevel.CRITICAL: 1.5 if ats_system == ATSSystem.TALEO else 1.0,
                    ATSIssueLevel.HIGH: 1.2 if ats_system == ATSSystem.TALEO else 1.0,
                    ATSIssueLevel.MEDIUM: 1.0,
                    ATSIssueLevel.LOW: 0.8,
                    ATSIssueLevel.INFO: 0.5,
                }

                deduction = issue.impact_score * severity_multiplier.get(issue.level, 1.0) / 100
                total_deduction += deduction

            # Final score calculation
            final_score = max(
                0, min(100, base_score + (overall_score - 70) * 0.3 - total_deduction)
            )
            system_scores[ats_system] = round(final_score, 1)

        return system_scores

    def _generate_priority_recommendations(self, issues: List[ATSIssue]) -> List[str]:
        """Generate prioritized recommendations based on issues."""
        recommendations = []

        # Critical issues first
        critical_issues = [i for i in issues if i.level == ATSIssueLevel.CRITICAL]
        for issue in critical_issues[:3]:  # Top 3 critical
            recommendations.extend(issue.recommendations[:1])  # First recommendation only

        # High priority issues
        high_issues = [i for i in issues if i.level == ATSIssueLevel.HIGH]
        for issue in high_issues[:2]:  # Top 2 high
            recommendations.extend(issue.recommendations[:1])

        return recommendations[:5]  # Limit to 5 total

    def _generate_quick_wins(
        self, issues: List[ATSIssue], keyword_matches: List[KeywordMatch]
    ) -> List[str]:
        """Generate quick win recommendations."""
        quick_wins = []

        # Low-effort, high-impact fixes
        low_issues = [i for i in issues if i.level == ATSIssueLevel.LOW]
        for issue in low_issues[:3]:
            if issue.recommendations:
                quick_wins.append(issue.recommendations[0])

        # Keyword improvements
        if len(keyword_matches) < 10:
            quick_wins.append("Add more relevant industry keywords to improve searchability")

        # Format improvements
        formatting_issues = [i for i in issues if i.category == "formatting"]
        if any(i.level in [ATSIssueLevel.LOW, ATSIssueLevel.MEDIUM] for i in formatting_issues):
            quick_wins.append("Convert complex formatting to simple, ATS-friendly layout")

        return quick_wins[:4]  # Limit to 4 quick wins

    def _identify_sections(self, text: str) -> List[str]:
        """Identify sections present in the resume."""
        # This is a simplified version - could be enhanced
        sections = []
        text_lower = text.lower()

        section_keywords = {
            "contact": ["email", "phone", "address", "linkedin"],
            "summary": ["summary", "objective", "profile"],
            "experience": ["experience", "work", "employment"],
            "education": ["education", "degree", "university"],
            "skills": ["skills", "technical", "programming"],
            "projects": ["projects", "portfolio"],
            "certifications": ["certification", "certificate"],
        }

        for section, keywords in section_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                sections.append(section)

        return sections
