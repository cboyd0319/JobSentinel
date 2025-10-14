"""
Demand Trends Analysis

Tracks skill demand trends, hot/dying skills, and market insights.

References:
- BLS OEWS Data | https://www.bls.gov/oes | High | Official labor statistics
- Stack Overflow Developer Survey | https://insights.stackoverflow.com | Medium | Developer trends
- GitHub Octoverse | https://octoverse.github.com | Medium | Technology trends
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class TrendDirection(Enum):
    """Trend direction for skill demand."""

    RISING = "rising"  # Demand is increasing
    STABLE = "stable"  # Demand is stable
    DECLINING = "declining"  # Demand is decreasing
    EMERGING = "emerging"  # New/emerging skill
    DYING = "dying"  # Skill is becoming obsolete


class DemandLevel(Enum):
    """Overall demand level for a skill."""

    CRITICAL = "critical"  # Extremely high demand
    HIGH = "high"  # High demand
    MEDIUM = "medium"  # Moderate demand
    LOW = "low"  # Low demand
    MINIMAL = "minimal"  # Very low/niche demand


@dataclass
class DemandTrend:
    """Represents demand trend data for a skill."""

    skill_id: str
    skill_name: str
    demand_level: DemandLevel
    trend_direction: TrendDirection
    growth_rate: float  # Year-over-year growth rate (-1.0 to 1.0)
    demand_score: float  # 0-100 demand score
    job_postings_count: int  # Number of recent job postings
    market_share: float  # 0-100 market share percentage
    timestamp: datetime = field(default_factory=datetime.now)
    insights: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class TrendReport:
    """Comprehensive trend analysis report."""

    hot_skills: list[DemandTrend]  # Top rising skills
    declining_skills: list[DemandTrend]  # Skills with declining demand
    emerging_skills: list[DemandTrend]  # New emerging skills
    stable_high_demand: list[DemandTrend]  # Stable high-demand skills
    generated_at: datetime = field(default_factory=datetime.now)
    metadata: dict[str, Any] = field(default_factory=dict)


class DemandTrendsAnalyzer:
    """
    Analyzes skill demand trends and market dynamics.

    Provides insights on:
    - Hot skills (rising demand)
    - Dying skills (declining demand)
    - Emerging technologies
    - Market demand scoring
    - Growth rates and projections
    """

    # Simulated demand data (in production, this would come from real market data APIs)
    DEMAND_DATA = {
        # Programming Languages
        "python": {
            "demand_level": DemandLevel.CRITICAL,
            "trend": TrendDirection.RISING,
            "growth_rate": 0.15,
            "demand_score": 95,
            "postings": 25000,
            "market_share": 18.5,
        },
        "javascript": {
            "demand_level": DemandLevel.CRITICAL,
            "trend": TrendDirection.STABLE,
            "growth_rate": 0.05,
            "demand_score": 92,
            "postings": 30000,
            "market_share": 22.0,
        },
        "typescript": {
            "demand_level": DemandLevel.HIGH,
            "trend": TrendDirection.RISING,
            "growth_rate": 0.25,
            "demand_score": 88,
            "postings": 15000,
            "market_share": 12.0,
        },
        "java": {
            "demand_level": DemandLevel.HIGH,
            "trend": TrendDirection.STABLE,
            "growth_rate": 0.02,
            "demand_score": 85,
            "postings": 20000,
            "market_share": 15.0,
        },
        "go": {
            "demand_level": DemandLevel.MEDIUM,
            "trend": TrendDirection.RISING,
            "growth_rate": 0.18,
            "demand_score": 75,
            "postings": 8000,
            "market_share": 6.0,
        },
        "rust": {
            "demand_level": DemandLevel.LOW,
            "trend": TrendDirection.EMERGING,
            "growth_rate": 0.35,
            "demand_score": 65,
            "postings": 3000,
            "market_share": 2.5,
        },
        # Frameworks
        "react": {
            "demand_level": DemandLevel.CRITICAL,
            "trend": TrendDirection.STABLE,
            "growth_rate": 0.08,
            "demand_score": 93,
            "postings": 22000,
            "market_share": 16.0,
        },
        "vue": {
            "demand_level": DemandLevel.MEDIUM,
            "trend": TrendDirection.STABLE,
            "growth_rate": 0.03,
            "demand_score": 70,
            "postings": 7000,
            "market_share": 5.5,
        },
        "angular": {
            "demand_level": DemandLevel.MEDIUM,
            "trend": TrendDirection.DECLINING,
            "growth_rate": -0.08,
            "demand_score": 68,
            "postings": 8000,
            "market_share": 6.0,
        },
        "nextjs": {
            "demand_level": DemandLevel.HIGH,
            "trend": TrendDirection.EMERGING,
            "growth_rate": 0.40,
            "demand_score": 82,
            "postings": 9000,
            "market_share": 7.0,
        },
        # Cloud Platforms
        "aws": {
            "demand_level": DemandLevel.CRITICAL,
            "trend": TrendDirection.STABLE,
            "growth_rate": 0.10,
            "demand_score": 96,
            "postings": 28000,
            "market_share": 32.0,
        },
        "azure": {
            "demand_level": DemandLevel.HIGH,
            "trend": TrendDirection.RISING,
            "growth_rate": 0.15,
            "demand_score": 88,
            "postings": 18000,
            "market_share": 23.0,
        },
        "gcp": {
            "demand_level": DemandLevel.HIGH,
            "trend": TrendDirection.RISING,
            "growth_rate": 0.20,
            "demand_score": 85,
            "postings": 12000,
            "market_share": 18.0,
        },
        # DevOps
        "docker": {
            "demand_level": DemandLevel.CRITICAL,
            "trend": TrendDirection.STABLE,
            "growth_rate": 0.05,
            "demand_score": 90,
            "postings": 20000,
            "market_share": 25.0,
        },
        "kubernetes": {
            "demand_level": DemandLevel.CRITICAL,
            "trend": TrendDirection.RISING,
            "growth_rate": 0.22,
            "demand_score": 92,
            "postings": 18000,
            "market_share": 20.0,
        },
        "terraform": {
            "demand_level": DemandLevel.HIGH,
            "trend": TrendDirection.RISING,
            "growth_rate": 0.28,
            "demand_score": 87,
            "postings": 12000,
            "market_share": 15.0,
        },
        # AI/ML
        "tensorflow": {
            "demand_level": DemandLevel.HIGH,
            "trend": TrendDirection.STABLE,
            "growth_rate": 0.08,
            "demand_score": 82,
            "postings": 9000,
            "market_share": 12.0,
        },
        "pytorch": {
            "demand_level": DemandLevel.HIGH,
            "trend": TrendDirection.RISING,
            "growth_rate": 0.25,
            "demand_score": 85,
            "postings": 10000,
            "market_share": 14.0,
        },
        "huggingface": {
            "demand_level": DemandLevel.MEDIUM,
            "trend": TrendDirection.EMERGING,
            "growth_rate": 0.50,
            "demand_score": 78,
            "postings": 4000,
            "market_share": 5.0,
        },
        # Databases
        "postgresql": {
            "demand_level": DemandLevel.CRITICAL,
            "trend": TrendDirection.STABLE,
            "growth_rate": 0.07,
            "demand_score": 89,
            "postings": 16000,
            "market_share": 18.0,
        },
        "mongodb": {
            "demand_level": DemandLevel.HIGH,
            "trend": TrendDirection.STABLE,
            "growth_rate": 0.05,
            "demand_score": 83,
            "postings": 12000,
            "market_share": 14.0,
        },
        "redis": {
            "demand_level": DemandLevel.HIGH,
            "trend": TrendDirection.STABLE,
            "growth_rate": 0.08,
            "demand_score": 81,
            "postings": 10000,
            "market_share": 12.0,
        },
    }

    def __init__(self):
        """Initialize demand trends analyzer."""
        logger.info("DemandTrendsAnalyzer initialized")

    def get_skill_demand(self, skill_id: str, skill_name: str | None = None) -> DemandTrend:
        """
        Get demand trend for a specific skill.

        Args:
            skill_id: Skill identifier
            skill_name: Optional display name

        Returns:
            DemandTrend for the skill
        """
        data = self.DEMAND_DATA.get(skill_id, self._get_default_demand())

        # Generate insights
        insights = self._generate_insights(
            skill_id, data["trend"], data["growth_rate"], data["demand_level"]
        )

        return DemandTrend(
            skill_id=skill_id,
            skill_name=skill_name or skill_id.replace("_", " ").title(),
            demand_level=data["demand_level"],
            trend_direction=data["trend"],
            growth_rate=data["growth_rate"],
            demand_score=data["demand_score"],
            job_postings_count=data["postings"],
            market_share=data["market_share"],
            insights=insights,
        )

    def _get_default_demand(self) -> dict[str, Any]:
        """Get default demand data for unknown skills."""
        return {
            "demand_level": DemandLevel.LOW,
            "trend": TrendDirection.STABLE,
            "growth_rate": 0.0,
            "demand_score": 50,
            "postings": 1000,
            "market_share": 1.0,
        }

    def _generate_insights(
        self,
        skill_id: str,
        trend: TrendDirection,
        growth_rate: float,
        demand_level: DemandLevel,
    ) -> list[str]:
        """Generate insights about skill demand."""
        insights = []

        # Trend insights
        if trend == TrendDirection.RISING:
            insights.append(
                f"Demand is rising at {abs(growth_rate)*100:.0f}% year-over-year"
            )
            insights.append("Great time to learn this skill")
        elif trend == TrendDirection.DECLINING:
            insights.append(
                f"Demand is declining at {abs(growth_rate)*100:.0f}% year-over-year"
            )
            insights.append("Consider focusing on alternative skills")
        elif trend == TrendDirection.EMERGING:
            insights.append("Emerging technology with high growth potential")
            insights.append("Early adopters have competitive advantage")
        elif trend == TrendDirection.DYING:
            insights.append("Skill is becoming obsolete")
            insights.append("Migration to modern alternatives recommended")

        # Demand level insights
        if demand_level == DemandLevel.CRITICAL:
            insights.append("Critical skill with extremely high market demand")
        elif demand_level == DemandLevel.HIGH:
            insights.append("High demand across multiple industries")
        elif demand_level == DemandLevel.LOW:
            insights.append("Niche skill with limited market demand")

        return insights

    def get_hot_skills(self, limit: int = 10) -> list[DemandTrend]:
        """
        Get top hot skills (rising demand).

        Args:
            limit: Maximum number of skills to return

        Returns:
            List of hot skills sorted by growth rate
        """
        hot_skills = []

        for skill_id, data in self.DEMAND_DATA.items():
            if data["trend"] in [TrendDirection.RISING, TrendDirection.EMERGING]:
                trend = self.get_skill_demand(skill_id)
                hot_skills.append(trend)

        # Sort by growth rate
        hot_skills.sort(key=lambda x: x.growth_rate, reverse=True)

        return hot_skills[:limit]

    def get_declining_skills(self, limit: int = 10) -> list[DemandTrend]:
        """
        Get skills with declining demand.

        Args:
            limit: Maximum number of skills to return

        Returns:
            List of declining skills
        """
        declining = []

        for skill_id, data in self.DEMAND_DATA.items():
            if data["trend"] in [TrendDirection.DECLINING, TrendDirection.DYING]:
                trend = self.get_skill_demand(skill_id)
                declining.append(trend)

        # Sort by growth rate (most negative first)
        declining.sort(key=lambda x: x.growth_rate)

        return declining[:limit]

    def get_emerging_skills(self, limit: int = 10) -> list[DemandTrend]:
        """
        Get emerging skills with high growth potential.

        Args:
            limit: Maximum number of skills to return

        Returns:
            List of emerging skills
        """
        emerging = []

        for skill_id, data in self.DEMAND_DATA.items():
            if data["trend"] == TrendDirection.EMERGING:
                trend = self.get_skill_demand(skill_id)
                emerging.append(trend)

        # Sort by growth rate
        emerging.sort(key=lambda x: x.growth_rate, reverse=True)

        return emerging[:limit]

    def get_stable_high_demand(self, limit: int = 10) -> list[DemandTrend]:
        """
        Get skills with stable high demand.

        Args:
            limit: Maximum number of skills to return

        Returns:
            List of stable high-demand skills
        """
        stable = []

        for skill_id, data in self.DEMAND_DATA.items():
            if (
                data["trend"] == TrendDirection.STABLE
                and data["demand_level"] in [DemandLevel.CRITICAL, DemandLevel.HIGH]
            ):
                trend = self.get_skill_demand(skill_id)
                stable.append(trend)

        # Sort by demand score
        stable.sort(key=lambda x: x.demand_score, reverse=True)

        return stable[:limit]

    def generate_trend_report(self) -> TrendReport:
        """
        Generate comprehensive trend analysis report.

        Returns:
            TrendReport with hot, declining, emerging, and stable skills
        """
        logger.info("Generating trend report")

        return TrendReport(
            hot_skills=self.get_hot_skills(limit=10),
            declining_skills=self.get_declining_skills(limit=5),
            emerging_skills=self.get_emerging_skills(limit=10),
            stable_high_demand=self.get_stable_high_demand(limit=10),
            metadata={
                "total_skills_analyzed": len(self.DEMAND_DATA),
                "data_source": "Simulated market data (BLS/LinkedIn/Stack Overflow)",
            },
        )

    def compare_skills(self, skill_ids: list[str]) -> list[DemandTrend]:
        """
        Compare demand trends for multiple skills.

        Args:
            skill_ids: List of skill IDs to compare

        Returns:
            List of DemandTrends sorted by demand score
        """
        trends = [self.get_skill_demand(skill_id) for skill_id in skill_ids]
        trends.sort(key=lambda x: x.demand_score, reverse=True)
        return trends

    def get_market_outlook(self, skill_id: str) -> dict[str, Any]:
        """
        Get detailed market outlook for a skill.

        Args:
            skill_id: Skill identifier

        Returns:
            Dictionary with market outlook data
        """
        trend = self.get_skill_demand(skill_id)

        # Project future demand (simple linear projection)
        current_score = trend.demand_score
        growth = trend.growth_rate
        projected_1y = min(100, max(0, current_score * (1 + growth)))
        projected_3y = min(100, max(0, current_score * (1 + growth) ** 3))

        return {
            "current_demand": current_score,
            "projected_1_year": round(projected_1y, 1),
            "projected_3_years": round(projected_3y, 1),
            "job_openings": trend.job_postings_count,
            "market_share": trend.market_share,
            "trend_direction": trend.trend_direction.value,
            "recommendation": self._get_recommendation(trend),
        }

    def _get_recommendation(self, trend: DemandTrend) -> str:
        """Generate recommendation based on trend data."""
        if trend.trend_direction == TrendDirection.RISING and trend.growth_rate > 0.15:
            return "Highly recommended - Strong growth and increasing demand"
        elif trend.trend_direction == TrendDirection.EMERGING:
            return "Early adopter opportunity - High potential for career growth"
        elif (
            trend.trend_direction == TrendDirection.STABLE
            and trend.demand_level == DemandLevel.CRITICAL
        ):
            return "Solid choice - Stable high demand with good job security"
        elif trend.trend_direction == TrendDirection.DECLINING:
            return "Consider alternatives - Demand is declining"
        elif trend.trend_direction == TrendDirection.DYING:
            return "Not recommended - Skill is becoming obsolete"
        else:
            return "Moderate opportunity - Average market conditions"
