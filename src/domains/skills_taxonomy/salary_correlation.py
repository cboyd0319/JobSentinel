"""
Salary Correlation Analysis

Analyzes how skills impact compensation and provides salary insights.

References:
- BLS OEWS Data | https://www.bls.gov/oes | High | Official wage statistics
- Glassdoor Salary Data | https://www.glassdoor.com | Medium | Self-reported salaries
- LinkedIn Salary Insights | https://business.linkedin.com | Medium | Industry benchmarks
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class SalaryImpact(Enum):
    """Impact level of a skill on salary."""

    CRITICAL = "critical"  # 20%+ salary increase
    HIGH = "high"  # 10-20% salary increase
    MEDIUM = "medium"  # 5-10% salary increase
    LOW = "low"  # 1-5% salary increase
    MINIMAL = "minimal"  # <1% salary increase


class ExperienceLevel(Enum):
    """Experience level for salary data."""

    ENTRY = "entry"  # 0-2 years
    MID = "mid"  # 2-5 years
    SENIOR = "senior"  # 5-10 years
    LEAD = "lead"  # 10+ years


@dataclass
class SalaryRange:
    """Represents a salary range."""

    min: int
    max: int
    median: int
    currency: str = "USD"

    def __str__(self) -> str:
        """Format salary range as string."""
        return f"${self.min:,}-${self.max:,} (median: ${self.median:,})"


@dataclass
class SalaryCorrelation:
    """Represents salary correlation data for a skill."""

    skill_id: str
    skill_name: str
    impact: SalaryImpact
    salary_premium: float  # Percentage increase (0-100)
    base_salary: SalaryRange  # Base salary without this skill
    with_skill_salary: SalaryRange  # Salary with this skill
    experience_level: ExperienceLevel
    sample_size: int  # Number of data points
    confidence: float  # 0-1 confidence score
    insights: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class SkillCombination:
    """Represents a combination of skills and their salary impact."""

    skill_ids: list[str]
    skill_names: list[str]
    combined_premium: float  # Percentage increase
    salary_range: SalaryRange
    synergy_bonus: float  # Additional % from skill combination
    market_examples: int  # Number of jobs with this combination


class SalaryCorrelationAnalyzer:
    """
    Analyzes correlation between skills and compensation.

    Provides insights on:
    - Individual skill impact on salary
    - Skill combinations with synergy bonuses
    - Experience-level salary ranges
    - Market salary benchmarks
    - ROI for learning specific skills
    """

    # Simulated salary data (in production, this would come from BLS/Glassdoor/LinkedIn APIs)
    SALARY_DATA = {
        # Programming Languages
        "python": {
            "impact": SalaryImpact.CRITICAL,
            "premium": 18.0,
            "base": (60000, 85000, 72000),
            "with_skill": (70000, 105000, 85000),
            "sample_size": 15000,
        },
        "javascript": {
            "impact": SalaryImpact.CRITICAL,
            "premium": 15.0,
            "base": (60000, 85000, 72000),
            "with_skill": (68000, 100000, 82000),
            "sample_size": 18000,
        },
        "typescript": {
            "impact": SalaryImpact.HIGH,
            "premium": 12.0,
            "base": (68000, 100000, 82000),
            "with_skill": (75000, 115000, 92000),
            "sample_size": 8000,
        },
        "java": {
            "impact": SalaryImpact.CRITICAL,
            "premium": 16.0,
            "base": (60000, 85000, 72000),
            "with_skill": (69000, 103000, 84000),
            "sample_size": 12000,
        },
        "go": {
            "impact": SalaryImpact.HIGH,
            "premium": 14.0,
            "base": (70000, 105000, 85000),
            "with_skill": (78000, 122000, 97000),
            "sample_size": 5000,
        },
        "rust": {
            "impact": SalaryImpact.HIGH,
            "premium": 16.0,
            "base": (70000, 105000, 85000),
            "with_skill": (80000, 128000, 99000),
            "sample_size": 2000,
        },
        # Frameworks
        "react": {
            "impact": SalaryImpact.HIGH,
            "premium": 13.0,
            "base": (65000, 95000, 78000),
            "with_skill": (72000, 110000, 88000),
            "sample_size": 12000,
        },
        "vue": {
            "impact": SalaryImpact.MEDIUM,
            "premium": 8.0,
            "base": (65000, 95000, 78000),
            "with_skill": (69000, 104000, 84000),
            "sample_size": 4000,
        },
        "angular": {
            "impact": SalaryImpact.MEDIUM,
            "premium": 9.0,
            "base": (65000, 95000, 78000),
            "with_skill": (70000, 106000, 85000),
            "sample_size": 5000,
        },
        "nextjs": {
            "impact": SalaryImpact.MEDIUM,
            "premium": 10.0,
            "base": (72000, 110000, 88000),
            "with_skill": (78000, 123000, 97000),
            "sample_size": 3000,
        },
        "django": {
            "impact": SalaryImpact.MEDIUM,
            "premium": 11.0,
            "base": (70000, 105000, 85000),
            "with_skill": (76000, 119000, 94000),
            "sample_size": 4000,
        },
        "flask": {
            "impact": SalaryImpact.MEDIUM,
            "premium": 9.0,
            "base": (70000, 105000, 85000),
            "with_skill": (75000, 116000, 93000),
            "sample_size": 3000,
        },
        "fastapi": {
            "impact": SalaryImpact.MEDIUM,
            "premium": 10.0,
            "base": (70000, 105000, 85000),
            "with_skill": (76000, 118000, 93000),
            "sample_size": 2000,
        },
        # Cloud Platforms
        "aws": {
            "impact": SalaryImpact.CRITICAL,
            "premium": 22.0,
            "base": (65000, 95000, 78000),
            "with_skill": (78000, 120000, 95000),
            "sample_size": 16000,
        },
        "azure": {
            "impact": SalaryImpact.CRITICAL,
            "premium": 20.0,
            "base": (65000, 95000, 78000),
            "with_skill": (76000, 118000, 93000),
            "sample_size": 10000,
        },
        "gcp": {
            "impact": SalaryImpact.HIGH,
            "premium": 19.0,
            "base": (65000, 95000, 78000),
            "with_skill": (75000, 115000, 92000),
            "sample_size": 7000,
        },
        # DevOps
        "docker": {
            "impact": SalaryImpact.HIGH,
            "premium": 15.0,
            "base": (70000, 100000, 83000),
            "with_skill": (79000, 118000, 95000),
            "sample_size": 11000,
        },
        "kubernetes": {
            "impact": SalaryImpact.CRITICAL,
            "premium": 24.0,
            "base": (70000, 100000, 83000),
            "with_skill": (85000, 130000, 103000),
            "sample_size": 9000,
        },
        "terraform": {
            "impact": SalaryImpact.HIGH,
            "premium": 18.0,
            "base": (75000, 110000, 90000),
            "with_skill": (87000, 135000, 106000),
            "sample_size": 6000,
        },
        "ansible": {
            "impact": SalaryImpact.MEDIUM,
            "premium": 12.0,
            "base": (75000, 110000, 90000),
            "with_skill": (82000, 126000, 101000),
            "sample_size": 4000,
        },
        # AI/ML
        "tensorflow": {
            "impact": SalaryImpact.CRITICAL,
            "premium": 21.0,
            "base": (75000, 110000, 90000),
            "with_skill": (89000, 140000, 109000),
            "sample_size": 5000,
        },
        "pytorch": {
            "impact": SalaryImpact.CRITICAL,
            "premium": 23.0,
            "base": (75000, 110000, 90000),
            "with_skill": (90000, 145000, 111000),
            "sample_size": 5500,
        },
        "scikit_learn": {
            "impact": SalaryImpact.MEDIUM,
            "premium": 13.0,
            "base": (75000, 110000, 90000),
            "with_skill": (83000, 128000, 102000),
            "sample_size": 6000,
        },
        # Databases
        "postgresql": {
            "impact": SalaryImpact.MEDIUM,
            "premium": 11.0,
            "base": (65000, 95000, 78000),
            "with_skill": (71000, 108000, 86000),
            "sample_size": 9000,
        },
        "mongodb": {
            "impact": SalaryImpact.MEDIUM,
            "premium": 10.0,
            "base": (65000, 95000, 78000),
            "with_skill": (70000, 106000, 86000),
            "sample_size": 7000,
        },
        "redis": {
            "impact": SalaryImpact.MEDIUM,
            "premium": 9.0,
            "base": (65000, 95000, 78000),
            "with_skill": (69000, 105000, 85000),
            "sample_size": 5000,
        },
    }

    # Skill combinations with synergy bonuses
    SKILL_COMBINATIONS = {
        ("python", "aws", "docker"): {
            "premium": 35.0,
            "synergy": 5.0,
            "examples": 3000,
        },
        ("javascript", "typescript", "react"): {
            "premium": 28.0,
            "synergy": 4.0,
            "examples": 5000,
        },
        ("kubernetes", "terraform", "aws"): {
            "premium": 42.0,
            "synergy": 8.0,
            "examples": 2500,
        },
        ("python", "tensorflow", "pytorch"): {
            "premium": 38.0,
            "synergy": 6.0,
            "examples": 2000,
        },
        ("python", "django", "postgresql"): {
            "premium": 30.0,
            "synergy": 4.0,
            "examples": 4000,
        },
    }

    def __init__(self):
        """Initialize salary correlation analyzer."""
        logger.info("SalaryCorrelationAnalyzer initialized")

    def get_skill_salary_impact(
        self,
        skill_id: str,
        skill_name: str | None = None,
        experience_level: ExperienceLevel = ExperienceLevel.MID,
    ) -> SalaryCorrelation:
        """
        Get salary correlation data for a skill.

        Args:
            skill_id: Skill identifier
            skill_name: Optional display name
            experience_level: Experience level for salary data

        Returns:
            SalaryCorrelation with impact analysis
        """
        data = self.SALARY_DATA.get(skill_id, self._get_default_salary())

        # Adjust for experience level
        multiplier = self._get_experience_multiplier(experience_level)
        base = tuple(int(x * multiplier) for x in data["base"])
        with_skill = tuple(int(x * multiplier) for x in data["with_skill"])

        # Generate insights
        insights = self._generate_salary_insights(
            data["impact"], data["premium"], data["sample_size"]
        )

        return SalaryCorrelation(
            skill_id=skill_id,
            skill_name=skill_name or skill_id.replace("_", " ").title(),
            impact=data["impact"],
            salary_premium=data["premium"],
            base_salary=SalaryRange(min=base[0], max=base[1], median=base[2]),
            with_skill_salary=SalaryRange(
                min=with_skill[0], max=with_skill[1], median=with_skill[2]
            ),
            experience_level=experience_level,
            sample_size=data["sample_size"],
            confidence=min(1.0, data["sample_size"] / 10000),
            insights=insights,
        )

    def _get_default_salary(self) -> dict[str, Any]:
        """Get default salary data for unknown skills."""
        return {
            "impact": SalaryImpact.LOW,
            "premium": 3.0,
            "base": (65000, 95000, 78000),
            "with_skill": (67000, 98000, 80000),
            "sample_size": 500,
        }

    def _get_experience_multiplier(self, level: ExperienceLevel) -> float:
        """Get salary multiplier for experience level."""
        multipliers = {
            ExperienceLevel.ENTRY: 0.75,
            ExperienceLevel.MID: 1.0,
            ExperienceLevel.SENIOR: 1.4,
            ExperienceLevel.LEAD: 1.8,
        }
        return multipliers.get(level, 1.0)

    def _generate_salary_insights(
        self, impact: SalaryImpact, premium: float, sample_size: int
    ) -> list[str]:
        """Generate insights about salary impact."""
        insights = []

        # Impact insights
        if impact == SalaryImpact.CRITICAL:
            insights.append(f"Critical skill with {premium:.0f}% salary premium")
            insights.append("Among top 10% of skills for earning potential")
        elif impact == SalaryImpact.HIGH:
            insights.append(f"High-value skill with {premium:.0f}% salary premium")
            insights.append("Strong ROI for learning investment")
        elif impact == SalaryImpact.MEDIUM:
            insights.append(f"Moderate salary impact: +{premium:.0f}%")
        elif impact == SalaryImpact.LOW:
            insights.append(f"Low salary impact: +{premium:.0f}%")

        # Data quality insights
        if sample_size > 5000:
            insights.append(f"High confidence (n={sample_size:,} data points)")
        elif sample_size > 1000:
            insights.append(f"Good confidence (n={sample_size:,} data points)")
        else:
            insights.append(f"Limited data (n={sample_size:,} data points)")

        return insights

    def get_top_paying_skills(
        self, limit: int = 10, experience_level: ExperienceLevel = ExperienceLevel.MID
    ) -> list[SalaryCorrelation]:
        """
        Get top paying skills by salary premium.

        Args:
            limit: Maximum number of skills to return
            experience_level: Experience level for salary data

        Returns:
            List of skills sorted by salary premium
        """
        all_skills = []

        for skill_id in self.SALARY_DATA.keys():
            correlation = self.get_skill_salary_impact(skill_id, experience_level=experience_level)
            all_skills.append(correlation)

        # Sort by salary premium
        all_skills.sort(key=lambda x: x.salary_premium, reverse=True)

        return all_skills[:limit]

    def analyze_skill_combination(
        self,
        skill_ids: list[str],
        experience_level: ExperienceLevel = ExperienceLevel.MID,
    ) -> SkillCombination:
        """
        Analyze salary impact of skill combination.

        Args:
            skill_ids: List of skill IDs
            experience_level: Experience level for salary data

        Returns:
            SkillCombination with synergy analysis
        """
        # Sort for consistent lookup
        skill_ids_sorted = tuple(sorted(skill_ids))

        # Check for known combination
        combo_data = self.SKILL_COMBINATIONS.get(skill_ids_sorted)

        if combo_data:
            premium = combo_data["premium"]
            synergy = combo_data["synergy"]
            examples = combo_data["examples"]
        else:
            # Calculate combined premium (additive with diminishing returns)
            individual_premiums = []
            for skill_id in skill_ids:
                data = self.SALARY_DATA.get(skill_id, self._get_default_salary())
                individual_premiums.append(data["premium"])

            # Diminishing returns: each additional skill contributes less
            premium = 0.0
            for i, p in enumerate(sorted(individual_premiums, reverse=True)):
                discount = 0.7 ** i  # 100%, 70%, 49%, ...
                premium += p * discount

            synergy = 0.0
            examples = 100

        # Calculate salary range
        multiplier = self._get_experience_multiplier(experience_level)
        base_median = int(78000 * multiplier)
        with_combo_median = int(base_median * (1 + premium / 100))

        salary_range = SalaryRange(
            min=int(with_combo_median * 0.85),
            max=int(with_combo_median * 1.25),
            median=with_combo_median,
        )

        skill_names = [skill_id.replace("_", " ").title() for skill_id in skill_ids]

        return SkillCombination(
            skill_ids=list(skill_ids),
            skill_names=skill_names,
            combined_premium=premium,
            salary_range=salary_range,
            synergy_bonus=synergy,
            market_examples=examples,
        )

    def compare_skills_roi(
        self, skill_ids: list[str], experience_level: ExperienceLevel = ExperienceLevel.MID
    ) -> list[dict[str, Any]]:
        """
        Compare ROI (return on investment) for learning different skills.

        Args:
            skill_ids: List of skill IDs to compare
            experience_level: Experience level for salary data

        Returns:
            List of skills with ROI analysis, sorted by ROI
        """
        roi_data = []

        for skill_id in skill_ids:
            correlation = self.get_skill_salary_impact(skill_id, experience_level=experience_level)

            # Estimate learning time (simplified - would be more sophisticated in production)
            learning_months = self._estimate_learning_time(correlation.impact)

            # Calculate ROI: (annual salary increase) / (learning investment)
            # Assume learning cost = $200/month for resources + opportunity cost
            learning_cost = learning_months * 200

            annual_increase = (
                correlation.with_skill_salary.median - correlation.base_salary.median
            )
            lifetime_value = annual_increase * 5  # 5-year projection

            roi = (lifetime_value - learning_cost) / learning_cost if learning_cost > 0 else 0

            roi_data.append(
                {
                    "skill_id": skill_id,
                    "skill_name": correlation.skill_name,
                    "salary_premium": correlation.salary_premium,
                    "annual_increase": annual_increase,
                    "learning_months": learning_months,
                    "learning_cost": learning_cost,
                    "lifetime_value_5y": lifetime_value,
                    "roi": roi,
                    "payback_months": learning_cost / (annual_increase / 12)
                    if annual_increase > 0
                    else float("inf"),
                }
            )

        # Sort by ROI
        roi_data.sort(key=lambda x: x["roi"], reverse=True)

        return roi_data

    def _estimate_learning_time(self, impact: SalaryImpact) -> int:
        """Estimate learning time in months based on skill impact."""
        times = {
            SalaryImpact.CRITICAL: 6,
            SalaryImpact.HIGH: 4,
            SalaryImpact.MEDIUM: 3,
            SalaryImpact.LOW: 2,
            SalaryImpact.MINIMAL: 1,
        }
        return times.get(impact, 3)

    def get_salary_percentile(
        self, salary: int, skill_ids: list[str], experience_level: ExperienceLevel
    ) -> dict[str, Any]:
        """
        Get salary percentile for given skills and experience.

        Args:
            salary: Current salary
            skill_ids: List of skills possessed
            experience_level: Experience level

        Returns:
            Dictionary with percentile analysis
        """
        # Analyze skill combination
        combination = self.analyze_skill_combination(skill_ids, experience_level)

        median = combination.salary_range.median
        max_salary = combination.salary_range.max

        # Calculate percentile (simplified)
        if salary >= max_salary:
            percentile = 95
        elif salary >= median:
            percentile = 50 + (salary - median) / (max_salary - median) * 45
        else:
            percentile = (salary / median) * 50

        return {
            "salary": salary,
            "percentile": round(percentile, 1),
            "median": median,
            "above_median": salary > median,
            "gap_to_median": median - salary if salary < median else 0,
            "market_range": f"{combination.salary_range}",
        }
