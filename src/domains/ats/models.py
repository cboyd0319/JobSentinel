"""
ATS Domain Models

Core data models and enums for ATS compatibility analysis.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum


class ATSIssueLevel(Enum):
    """Severity levels for ATS compatibility issues."""

    CRITICAL = "critical"  # Will likely cause resume rejection (90%+ impact)
    HIGH = "high"  # Major parsing issues (70-90% impact)
    MEDIUM = "medium"  # Noticeable degradation (40-70% impact)
    LOW = "low"  # Minor optimization opportunity (10-40% impact)
    INFO = "info"  # Best practice suggestion (<10% impact)


class ATSSystem(Enum):
    """Major ATS systems with different parsing capabilities."""

    TALEO = "taleo"  # Oracle Taleo (30% market share)
    WORKDAY = "workday"  # Workday HCM (25% market share)
    ICIMS = "icims"  # iCIMS (15% market share)
    GREENHOUSE = "greenhouse"  # Greenhouse (10% market share)
    LEVER = "lever"  # Lever (8% market share)
    JOBVITE = "jobvite"  # Jobvite (5% market share)
    SMARTRECRUITERS = "smartrecruiters"  # SmartRecruiters (4% market share)
    GENERIC = "generic"  # Generic ATS baseline


@dataclass
class ATSIssue:
    """Represents an ATS compatibility issue with detailed context."""

    level: ATSIssueLevel
    category: str
    description: str
    location: str | None = None
    affected_systems: list[ATSSystem] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)
    impact_score: float = 0.0  # 0-100 scale


@dataclass
class KeywordMatch:
    """Represents a keyword match with relevance scoring."""

    keyword: str
    matches: int
    relevance_score: float  # 0-1 scale
    context: list[str] = field(default_factory=list)
    is_skill: bool = False
    is_required: bool = False


@dataclass
class ATSCompatibilityScore:
    """Comprehensive ATS compatibility assessment."""

    overall_score: float  # 0-100 weighted score
    component_scores: dict[str, float] = field(default_factory=dict)

    # Individual analysis results
    issues: list[ATSIssue] = field(default_factory=list)
    keyword_matches: list[KeywordMatch] = field(default_factory=list)

    # System-specific compatibility
    system_scores: dict[ATSSystem, float] = field(default_factory=dict)

    # Analysis metadata
    analysis_timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))
    resume_word_count: int = 0
    resume_sections: list[str] = field(default_factory=list)

    # Recommendations
    priority_recommendations: list[str] = field(default_factory=list)
    quick_wins: list[str] = field(default_factory=list)

    def get_issues_by_level(self, level: ATSIssueLevel) -> list[ATSIssue]:
        """Get all issues of a specific severity level."""
        return [issue for issue in self.issues if issue.level == level]

    def get_critical_issues(self) -> list[ATSIssue]:
        """Get all critical issues that require immediate attention."""
        return self.get_issues_by_level(ATSIssueLevel.CRITICAL)

    def get_high_priority_issues(self) -> list[ATSIssue]:
        """Get critical and high priority issues."""
        return self.get_issues_by_level(ATSIssueLevel.CRITICAL) + self.get_issues_by_level(
            ATSIssueLevel.HIGH
        )
