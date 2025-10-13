"""
Skills Gap Analysis System

Identifies skill gaps and provides career development recommendations.

References:
- SWEBOK v4.0a | https://computer.org/swebok | High | Knowledge areas
- LinkedIn Skills Taxonomy | https://business.linkedin.com | Medium | Industry skills
- Bureau of Labor Statistics | https://www.bls.gov | High | Job market trends
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class SkillLevel(Enum):
    """Skill proficiency levels."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class SkillCategory(Enum):
    """Skill categories."""

    TECHNICAL = "technical"
    SOFT = "soft"
    DOMAIN = "domain"
    TOOLS = "tools"
    CERTIFICATIONS = "certifications"


class SkillPriority(Enum):
    """Priority for learning skills."""

    CRITICAL = "critical"  # Required for role
    HIGH = "high"  # Strongly recommended
    MEDIUM = "medium"  # Nice to have
    LOW = "low"  # Optional


@dataclass
class Skill:
    """Represents a skill."""

    name: str
    category: SkillCategory
    level: SkillLevel | None = None
    years_experience: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class SkillGapItem:
    """Represents a skill gap."""

    skill_name: str
    category: SkillCategory
    priority: SkillPriority
    market_demand: float  # 0-100
    learning_resources: list[str] = field(default_factory=list)
    estimated_learning_time: str = ""  # e.g., "3-6 months"
    related_skills: list[str] = field(default_factory=list)


@dataclass
class CareerPathSuggestion:
    """Career development suggestion."""

    path_name: str
    description: str
    required_skills: list[str]
    timeline: str
    potential_salary_increase: str
    market_growth: str


@dataclass
class SkillsGap:
    """Comprehensive skills gap analysis."""

    gaps: list[SkillGapItem]
    strengths: list[Skill]
    career_paths: list[CareerPathSuggestion]
    overall_match_score: float  # 0-100
    metadata: dict[str, Any] = field(default_factory=dict)


class SkillsGapAnalyzer:
    """
    Advanced skills gap analysis system.

    Analyzes skill gaps between current skills and target role/industry:
    - Identifies critical missing skills
    - Prioritizes learning paths
    - Provides career development recommendations
    - Tracks market demand for skills
    """

    # Industry-specific skill sets (simplified - would be much larger in production)
    INDUSTRY_SKILLS = {
        "software_engineering": {
            "critical": {
                "programming": ["Python", "Java", "JavaScript", "Go"],
                "frameworks": ["React", "Django", "Spring Boot", "Node.js"],
                "databases": ["PostgreSQL", "MongoDB", "Redis"],
                "cloud": ["AWS", "Azure", "GCP"],
                "devops": ["Docker", "Kubernetes", "CI/CD"],
            },
            "high": {
                "architecture": ["Microservices", "System Design", "APIs"],
                "testing": ["Unit Testing", "Integration Testing"],
                "version_control": ["Git", "GitHub"],
            },
            "medium": {
                "security": ["OAuth", "JWT", "Encryption"],
                "monitoring": ["Prometheus", "Grafana", "DataDog"],
            },
        },
        "data_science": {
            "critical": {
                "programming": ["Python", "R", "SQL"],
                "ml_frameworks": ["TensorFlow", "PyTorch", "Scikit-learn"],
                "statistics": ["Statistical Analysis", "Hypothesis Testing"],
                "visualization": ["Matplotlib", "Tableau", "Power BI"],
            },
            "high": {
                "big_data": ["Spark", "Hadoop"],
                "cloud": ["AWS SageMaker", "GCP AI Platform"],
            },
        },
        "devops": {
            "critical": {
                "containers": ["Docker", "Kubernetes"],
                "ci_cd": ["Jenkins", "GitLab CI", "GitHub Actions"],
                "infrastructure": ["Terraform", "Ansible"],
                "cloud": ["AWS", "Azure", "GCP"],
                "scripting": ["Bash", "Python"],
            },
            "high": {
                "monitoring": ["Prometheus", "Grafana", "ELK Stack"],
                "security": ["Security Scanning", "Compliance"],
            },
        },
    }

    # Learning resources by skill category
    LEARNING_RESOURCES = {
        "programming": [
            "freeCodeCamp.org - Free coding bootcamp",
            "LeetCode - Practice coding problems",
            "Coursera - University courses",
        ],
        "cloud": [
            "AWS Free Tier - Hands-on practice",
            "A Cloud Guru - Cloud certifications",
            "Linux Academy - DevOps skills",
        ],
        "data_science": [
            "Kaggle - Data science competitions",
            "Fast.ai - Practical deep learning",
            "DataCamp - Interactive courses",
        ],
    }

    def __init__(self):
        """Initialize skills gap analyzer."""
        logger.info("SkillsGapAnalyzer initialized")

    def analyze(
        self,
        current_skills: list[str],
        target_role: str,
        target_industry: str = "software_engineering",
        years_experience: float = 0.0,
    ) -> SkillsGap:
        """
        Analyze skills gap for target role.

        Args:
            current_skills: List of current skill names
            target_role: Target job role
            target_industry: Target industry
            years_experience: Years of relevant experience

        Returns:
            SkillsGap with detailed analysis and recommendations
        """
        logger.info(f"Analyzing skills gap for {target_role} in {target_industry}")

        # Normalize skills for comparison
        current_skills_normalized = {skill.lower().strip() for skill in current_skills}

        # Get required skills for industry
        industry_skills = self.INDUSTRY_SKILLS.get(
            target_industry, self.INDUSTRY_SKILLS["software_engineering"]
        )

        gaps = []
        strengths = []
        matched_skills = set()

        # Analyze gaps by priority
        for priority_level in ["critical", "high", "medium"]:
            if priority_level not in industry_skills:
                continue

            priority_enum = {
                "critical": SkillPriority.CRITICAL,
                "high": SkillPriority.HIGH,
                "medium": SkillPriority.MEDIUM,
            }[priority_level]

            for category, skills in industry_skills[priority_level].items():
                for skill in skills:
                    skill_normalized = skill.lower()

                    # Check if skill is present (fuzzy matching in production)
                    if skill_normalized in current_skills_normalized:
                        # Skill is present - add to strengths
                        matched_skills.add(skill)
                        strengths.append(
                            Skill(
                                name=skill,
                                category=self._categorize_skill(category),
                                level=self._estimate_level(years_experience),
                            )
                        )
                    else:
                        # Skill is missing - add to gaps
                        gaps.append(
                            SkillGapItem(
                                skill_name=skill,
                                category=self._categorize_skill(category),
                                priority=priority_enum,
                                market_demand=self._estimate_market_demand(skill),
                                learning_resources=self._get_learning_resources(category),
                                estimated_learning_time=self._estimate_learning_time(
                                    skill, priority_enum
                                ),
                                related_skills=self._get_related_skills(skill),
                            )
                        )

        # Calculate overall match score
        total_required = sum(
            len(skills)
            for category_skills in industry_skills.values()
            for skills in category_skills.values()
        )
        overall_match_score = (
            (len(matched_skills) / total_required * 100) if total_required > 0 else 0
        )

        # Generate career path suggestions
        career_paths = self._generate_career_paths(
            current_skills_normalized, target_industry, overall_match_score
        )

        logger.info(
            f"Skills gap analysis complete: {overall_match_score:.1f}% match, {len(gaps)} gaps identified"
        )

        return SkillsGap(
            gaps=gaps,
            strengths=strengths,
            career_paths=career_paths,
            overall_match_score=round(overall_match_score, 1),
            metadata={
                "target_role": target_role,
                "target_industry": target_industry,
                "years_experience": years_experience,
                "skills_analyzed": len(current_skills),
            },
        )

    def _categorize_skill(self, category_name: str) -> SkillCategory:
        """Map category name to SkillCategory enum."""
        mapping = {
            "programming": SkillCategory.TECHNICAL,
            "frameworks": SkillCategory.TOOLS,
            "databases": SkillCategory.TOOLS,
            "cloud": SkillCategory.TOOLS,
            "devops": SkillCategory.TECHNICAL,
            "architecture": SkillCategory.DOMAIN,
            "testing": SkillCategory.TECHNICAL,
            "version_control": SkillCategory.TOOLS,
            "security": SkillCategory.DOMAIN,
            "monitoring": SkillCategory.TOOLS,
            "ml_frameworks": SkillCategory.TOOLS,
            "statistics": SkillCategory.TECHNICAL,
            "visualization": SkillCategory.TOOLS,
            "big_data": SkillCategory.TOOLS,
            "containers": SkillCategory.TOOLS,
            "ci_cd": SkillCategory.TOOLS,
            "infrastructure": SkillCategory.TOOLS,
            "scripting": SkillCategory.TECHNICAL,
        }
        return mapping.get(category_name, SkillCategory.TECHNICAL)

    def _estimate_level(self, years: float) -> SkillLevel:
        """Estimate skill level based on years of experience."""
        if years < 1:
            return SkillLevel.BEGINNER
        elif years < 3:
            return SkillLevel.INTERMEDIATE
        elif years < 7:
            return SkillLevel.ADVANCED
        else:
            return SkillLevel.EXPERT

    def _estimate_market_demand(self, skill: str) -> float:
        """Estimate market demand for a skill (0-100)."""
        # Simplified demand estimation based on skill popularity
        high_demand = {
            "python",
            "javascript",
            "java",
            "aws",
            "kubernetes",
            "docker",
            "react",
            "node.js",
            "tensorflow",
            "sql",
        }

        skill_lower = skill.lower()
        if any(hd in skill_lower for hd in high_demand):
            return 90.0
        else:
            return 70.0

    def _get_learning_resources(self, category: str) -> list[str]:
        """Get learning resources for a skill category."""
        # Map category to resource category
        resource_map = {
            "programming": "programming",
            "cloud": "cloud",
            "ml_frameworks": "data_science",
            "statistics": "data_science",
        }

        resource_category = resource_map.get(category, "programming")
        return self.LEARNING_RESOURCES.get(resource_category, [])[:3]

    def _estimate_learning_time(self, skill: str, priority: SkillPriority) -> str:
        """Estimate time to learn a skill."""
        if priority == SkillPriority.CRITICAL:
            return "1-3 months intensive study"
        elif priority == SkillPriority.HIGH:
            return "2-4 months part-time learning"
        else:
            return "3-6 months casual learning"

    def _get_related_skills(self, skill: str) -> list[str]:
        """Get related skills that complement the target skill."""
        # Simplified skill relationships
        relationships = {
            "Python": ["Django", "Flask", "FastAPI"],
            "JavaScript": ["React", "Node.js", "TypeScript"],
            "AWS": ["Terraform", "CloudFormation", "Docker"],
            "Docker": ["Kubernetes", "Docker Compose"],
            "React": ["Redux", "Next.js", "TypeScript"],
        }

        return relationships.get(skill, [])

    def _generate_career_paths(
        self, current_skills: set[str], industry: str, match_score: float
    ) -> list[CareerPathSuggestion]:
        """Generate career development suggestions."""
        paths = []

        if industry == "software_engineering":
            if match_score >= 70:
                paths.append(
                    CareerPathSuggestion(
                        path_name="Senior Software Engineer",
                        description="Advance to senior role with leadership responsibilities",
                        required_skills=["System Design", "Mentoring", "Architecture"],
                        timeline="12-18 months",
                        potential_salary_increase="20-30%",
                        market_growth="Strong - High demand for senior engineers",
                    )
                )

            if match_score >= 50:
                paths.append(
                    CareerPathSuggestion(
                        path_name="Technical Lead",
                        description="Lead technical decisions and team architecture",
                        required_skills=[
                            "System Design",
                            "Team Leadership",
                            "Architecture Patterns",
                        ],
                        timeline="18-24 months",
                        potential_salary_increase="30-40%",
                        market_growth="Excellent - Growing demand for tech leads",
                    )
                )

            paths.append(
                CareerPathSuggestion(
                    path_name="Cloud Architect",
                    description="Specialize in cloud infrastructure and architecture",
                    required_skills=["AWS", "Terraform", "System Design", "Security"],
                    timeline="12-24 months",
                    potential_salary_increase="25-35%",
                    market_growth="Excellent - Cloud adoption is accelerating",
                )
            )

        elif industry == "data_science":
            paths.append(
                CareerPathSuggestion(
                    path_name="Senior Data Scientist",
                    description="Lead data science projects and mentor team members",
                    required_skills=["ML Engineering", "Model Deployment", "Business Acumen"],
                    timeline="18-24 months",
                    potential_salary_increase="25-35%",
                    market_growth="Strong - Data science is mainstream",
                )
            )

        return paths
