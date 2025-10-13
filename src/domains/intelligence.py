"""
Intelligence Layer for JobSentinel

Provides job market insights, trend analysis, salary benchmarking,
and smart ranking using data science techniques.

References:
- SWEBOK v4.0a | https://computer.org/swebok | High | Data analysis practices
- LinkedIn Economic Graph | https://economicgraph.linkedin.com | Medium | Labor market data
- Bureau of Labor Statistics | https://www.bls.gov | High | Employment statistics
"""

import logging
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from statistics import mean, median, stdev
from typing import Any, Optional


@dataclass
class SalaryInsight:
    """
    Salary analysis and benchmarking.

    Attributes:
        min_salary: Minimum salary found
        max_salary: Maximum salary found
        median_salary: Median salary
        average_salary: Average salary
        p25_salary: 25th percentile
        p75_salary: 75th percentile
        sample_size: Number of jobs analyzed
        currency: Currency code (USD, EUR, etc.)
    """

    min_salary: float
    max_salary: float
    median_salary: float
    average_salary: float
    p25_salary: float
    p75_salary: float
    sample_size: int
    currency: str = "USD"

    def get_negotiation_range(self) -> tuple[float, float]:
        """
        Get recommended negotiation range.

        Returns:
            Tuple of (low_target, high_target)

        Strategy:
            Aim for p75 (top 25%) as high target, median as low target
        """
        return (self.median_salary, self.p75_salary)

    def get_competitive_offer(self) -> float:
        """
        Get what would be considered a competitive offer.

        Returns:
            Competitive salary (p60-p65 range)
        """
        # Slightly above median
        return self.median_salary + (self.p75_salary - self.median_salary) * 0.4


@dataclass
class MarketTrend:
    """
    Job market trend analysis.

    Attributes:
        keyword: Keyword or skill being tracked
        frequency: How often it appears
        growth_rate: Growth rate (percentage)
        trend_direction: 'rising', 'stable', 'declining'
        time_period_days: Analysis period
    """

    keyword: str
    frequency: int
    growth_rate: float
    trend_direction: str
    time_period_days: int = 30

    @property
    def is_hot_skill(self) -> bool:
        """Check if this is a trending skill."""
        return self.growth_rate > 20.0 and self.frequency > 10


@dataclass
class JobInsight:
    """
    Comprehensive job market insights.

    Attributes:
        total_jobs: Total jobs analyzed
        active_companies: Number of unique companies
        top_skills: Most in-demand skills
        top_companies: Companies with most openings
        location_distribution: Jobs by location
        salary_insights: Salary analysis
        trending_skills: Skills with growth
        market_heat: Market activity level (0-100)
    """

    total_jobs: int
    active_companies: int
    top_skills: list[tuple[str, int]]
    top_companies: list[tuple[str, int]]
    location_distribution: dict[str, int]
    salary_insights: SalaryInsight | None = None
    trending_skills: list[MarketTrend] = field(default_factory=list)
    market_heat: float = 0.0


class JobIntelligenceEngine:
    """
    Intelligence engine for job market analysis.

    Provides insights, trends, and recommendations based on job data
    using statistical analysis and pattern recognition.
    """

    # Common tech skills for extraction
    TECH_SKILLS = {
        "python",
        "java",
        "javascript",
        "typescript",
        "go",
        "rust",
        "c++",
        "c#",
        "react",
        "angular",
        "vue",
        "node.js",
        "django",
        "flask",
        "spring",
        "aws",
        "azure",
        "gcp",
        "docker",
        "kubernetes",
        "terraform",
        "sql",
        "postgresql",
        "mongodb",
        "redis",
        "elasticsearch",
        "git",
        "ci/cd",
        "jenkins",
        "github actions",
        "gitlab",
        "machine learning",
        "deep learning",
        "data science",
        "ai",
        "rest api",
        "graphql",
        "microservices",
        "agile",
        "scrum",
    }

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def analyze_job_market(
        self, jobs: list[dict[str, Any]], time_window_days: int = 30
    ) -> JobInsight:
        """
        Perform comprehensive job market analysis.

        Args:
            jobs: List of job dictionaries
            time_window_days: Analysis time window

        Returns:
            JobInsight with comprehensive analysis

        Note:
            Follows SWEBOK v4.0 data analysis best practices
        """
        if not jobs:
            return JobInsight(
                total_jobs=0,
                active_companies=0,
                top_skills=[],
                top_companies=[],
                location_distribution={},
            )

        # Extract data
        companies = Counter()
        locations = Counter()
        skills = Counter()
        salaries = []

        for job in jobs:
            # Company analysis
            company = job.get("company", "Unknown")
            if company and company != "Unknown":
                companies[company] += 1

            # Location analysis
            location = job.get("location", "Unknown")
            if location and location != "Unknown":
                locations[self._normalize_location(location)] += 1

            # Skills extraction
            text = f"{job.get('title', '')} {job.get('description', '')}".lower()
            for skill in self.TECH_SKILLS:
                if skill in text:
                    skills[skill] += 1

            # Salary extraction
            salary = self._extract_salary(job)
            if salary:
                salaries.append(salary)

        # Salary insights
        salary_insights = None
        if salaries and len(salaries) >= 3:
            salary_insights = self._calculate_salary_insights(salaries)

        # Calculate market heat (0-100)
        market_heat = self._calculate_market_heat(jobs, time_window_days)

        return JobInsight(
            total_jobs=len(jobs),
            active_companies=len(companies),
            top_skills=skills.most_common(20),
            top_companies=companies.most_common(10),
            location_distribution=dict(locations),
            salary_insights=salary_insights,
            market_heat=market_heat,
        )

    def identify_trending_skills(
        self, current_jobs: list[dict], historical_jobs: list[dict]
    ) -> list[MarketTrend]:
        """
        Identify trending skills by comparing current vs historical data.

        Args:
            current_jobs: Recent jobs (last 30 days)
            historical_jobs: Older jobs (30-60 days ago)

        Returns:
            List of MarketTrend objects sorted by growth rate
        """
        current_skills = self._extract_skills_frequency(current_jobs)
        historical_skills = self._extract_skills_frequency(historical_jobs)

        trends = []

        for skill, current_freq in current_skills.items():
            historical_freq = historical_skills.get(skill, 0)

            # Calculate growth rate
            if historical_freq > 0:
                growth_rate = ((current_freq - historical_freq) / historical_freq) * 100
            else:
                growth_rate = 100.0 if current_freq > 0 else 0.0

            # Determine trend direction
            if growth_rate > 15:
                direction = "rising"
            elif growth_rate < -15:
                direction = "declining"
            else:
                direction = "stable"

            trends.append(
                MarketTrend(
                    keyword=skill,
                    frequency=current_freq,
                    growth_rate=growth_rate,
                    trend_direction=direction,
                    time_period_days=30,
                )
            )

        # Sort by growth rate
        trends.sort(key=lambda t: t.growth_rate, reverse=True)

        return trends

    def rank_jobs_intelligently(
        self, jobs: list[dict], user_skills: list[str], user_preferences: dict[str, Any]
    ) -> list[tuple[dict, float]]:
        """
        Rank jobs using multi-factor scoring algorithm.

        Args:
            jobs: List of job dictionaries
            user_skills: User's skills
            user_preferences: User preferences (location, salary, etc.)

        Returns:
            List of (job, score) tuples sorted by score descending

        Scoring Factors:
        - Skills match (40%)
        - Salary alignment (25%)
        - Location match (20%)
        - Company reputation (10%)
        - Recency (5%)
        """
        scored_jobs = []

        for job in jobs:
            score = 0.0

            # Skills match (40 points max)
            skills_score = self._calculate_skills_match(job, user_skills)
            score += skills_score * 0.4

            # Salary alignment (25 points max)
            salary_score = self._calculate_salary_score(job, user_preferences)
            score += salary_score * 0.25

            # Location match (20 points max)
            location_score = self._calculate_location_score(job, user_preferences)
            score += location_score * 0.2

            # Company reputation (10 points max)
            # Could integrate with external APIs in future
            company_score = 50.0  # Default neutral score
            score += company_score * 0.1

            # Recency (5 points max)
            recency_score = self._calculate_recency_score(job)
            score += recency_score * 0.05

            scored_jobs.append((job, score))

        # Sort by score descending
        scored_jobs.sort(key=lambda x: x[1], reverse=True)

        return scored_jobs

    def generate_career_recommendations(
        self, user_skills: list[str], market_trends: list[MarketTrend], current_role: str
    ) -> list[str]:
        """
        Generate career path recommendations based on skills and trends.

        Args:
            user_skills: User's current skills
            market_trends: Market trend data
            current_role: User's current role/title

        Returns:
            List of career recommendations with rationale
        """
        recommendations = []

        # Find hot skills user doesn't have
        hot_skills = [t for t in market_trends if t.is_hot_skill]
        user_skills_lower = [s.lower() for s in user_skills]

        skills_to_learn = [skill for skill in hot_skills if skill.keyword not in user_skills_lower][
            :5
        ]

        if skills_to_learn:
            for skill in skills_to_learn:
                recommendations.append(
                    f"Learn {skill.keyword}: Growing {skill.growth_rate:.1f}% "
                    f"with {skill.frequency} job postings"
                )

        # Role progression recommendations
        role_lower = current_role.lower()
        if "junior" in role_lower or "entry" in role_lower:
            recommendations.append(
                "Target mid-level positions: You have the foundation, "
                "focus on demonstrating impact and ownership"
            )
        elif "senior" in role_lower:
            recommendations.append(
                "Consider staff/principal roles: Emphasize technical leadership, "
                "architecture, and mentoring experience"
            )

        # Specialization recommendations
        if len(user_skills) > 10:
            recommendations.append(
                "Consider specializing: Deep expertise in 2-3 areas is more "
                "valuable than surface knowledge of many"
            )

        return recommendations

    def _extract_skills_frequency(self, jobs: list[dict]) -> dict[str, int]:
        """Extract skill frequencies from job listings."""
        skills_count = Counter()

        for job in jobs:
            text = f"{job.get('title', '')} {job.get('description', '')}".lower()
            for skill in self.TECH_SKILLS:
                if skill in text:
                    skills_count[skill] += 1

        return dict(skills_count)

    def _extract_salary(self, job: dict) -> float | None:
        """Extract salary from job posting."""
        # Try explicit fields first
        if "salary_min" in job and job["salary_min"]:
            return float(job["salary_min"])

        if "salary" in job and job["salary"]:
            return float(job["salary"])

        # Try parsing from description
        desc = job.get("description", "")
        salary_patterns = [
            r"\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)",  # $120,000
            r"(\d{1,3}(?:,\d{3})*)\s*k",  # 120k
        ]

        for pattern in salary_patterns:
            match = re.search(pattern, desc, re.IGNORECASE)
            if match:
                salary_str = match.group(1).replace(",", "")
                salary = float(salary_str)

                # Handle 'k' notation
                if "k" in desc[match.start() : match.end()].lower():
                    salary *= 1000

                # Sanity check (20k - 1M)
                if 20000 <= salary <= 1000000:
                    return salary

        return None

    def _calculate_salary_insights(self, salaries: list[float]) -> SalaryInsight:
        """Calculate comprehensive salary statistics."""
        sorted_salaries = sorted(salaries)
        n = len(sorted_salaries)

        return SalaryInsight(
            min_salary=min(salaries),
            max_salary=max(salaries),
            median_salary=median(salaries),
            average_salary=mean(salaries),
            p25_salary=sorted_salaries[n // 4],
            p75_salary=sorted_salaries[3 * n // 4],
            sample_size=n,
        )

    def _normalize_location(self, location: str) -> str:
        """Normalize location strings for consistency."""
        location = location.lower().strip()

        # Handle remote variations
        if any(word in location for word in ["remote", "anywhere", "distributed"]):
            return "Remote"

        # Extract city, state
        # Simple extraction - could be enhanced with geocoding API
        parts = location.split(",")
        if len(parts) >= 2:
            return f"{parts[0].strip().title()}, {parts[1].strip().upper()}"

        return location.title()

    def _calculate_market_heat(self, jobs: list[dict], window_days: int) -> float:
        """
        Calculate market heat score (0-100).

        Higher score = more active job market
        """
        if not jobs:
            return 0.0

        # Jobs per day
        jobs_per_day = len(jobs) / max(window_days, 1)

        # Normalize to 0-100 scale
        # Assume > 100 jobs/day = 100 heat
        heat = min(100.0, (jobs_per_day / 100.0) * 100)

        return heat

    def _calculate_skills_match(self, job: dict, user_skills: list[str]) -> float:
        """Calculate skills match score (0-100)."""
        if not user_skills:
            return 50.0  # Neutral score

        job_text = f"{job.get('title', '')} {job.get('description', '')}".lower()
        user_skills_lower = [s.lower() for s in user_skills]

        matches = sum(1 for skill in user_skills_lower if skill in job_text)

        # Score based on percentage of user skills found
        match_percentage = (matches / len(user_skills)) * 100

        return min(100.0, match_percentage)

    def _calculate_salary_score(self, job: dict, preferences: dict) -> float:
        """Calculate salary alignment score (0-100)."""
        job_salary = self._extract_salary(job)
        target_salary = preferences.get("salary_min", 0)

        if not job_salary or not target_salary:
            return 50.0  # Neutral if no salary info

        if job_salary >= target_salary:
            # Good - meets or exceeds target
            return 100.0
        else:
            # Calculate how close it is
            ratio = job_salary / target_salary
            return max(0.0, ratio * 100)

    def _calculate_location_score(self, job: dict, preferences: dict) -> float:
        """Calculate location match score (0-100)."""
        preferred_locations = preferences.get("locations", [])

        if not preferred_locations:
            return 50.0  # Neutral if no preference

        job_location = job.get("location", "").lower()

        # Check for matches
        for pref_location in preferred_locations:
            if pref_location.lower() in job_location:
                return 100.0

        # Check for remote
        if "remote" in job_location:
            if any("remote" in loc.lower() for loc in preferred_locations):
                return 100.0
            else:
                return 75.0  # Still good for most people

        return 25.0  # Not a match

    def _calculate_recency_score(self, job: dict) -> float:
        """Calculate recency score (0-100)."""
        posted_date = job.get("posted_date")

        if not posted_date:
            return 50.0  # Neutral if unknown

        try:
            if isinstance(posted_date, str):
                posted = datetime.fromisoformat(posted_date.replace("Z", "+00:00"))
            else:
                posted = posted_date

            days_old = (datetime.utcnow() - posted).days

            # Newer = better
            if days_old <= 1:
                return 100.0
            elif days_old <= 7:
                return 90.0
            elif days_old <= 14:
                return 75.0
            elif days_old <= 30:
                return 50.0
            else:
                return 25.0

        except Exception:
            return 50.0


# Global instance
_intelligence_engine = JobIntelligenceEngine()


def get_intelligence_engine() -> JobIntelligenceEngine:
    """Get global intelligence engine instance."""
    return _intelligence_engine
