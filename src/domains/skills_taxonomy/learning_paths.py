"""
Learning Paths System

Provides career progression paths from Junior → Mid → Senior levels
with skill requirements and timeline estimates.

References:
- Career Ladders | https://progression.fyi | Medium | Industry career paths
- LinkedIn Career Explorer | https://business.linkedin.com | Medium | Career progression
- O*NET Career Exploration | https://www.onetonline.org | High | BLS-backed paths
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from .skills_graph import Skill, SkillLevel, SkillsGraphManager

logger = logging.getLogger(__name__)


class CareerLevel(Enum):
    """Career progression levels."""

    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"
    PRINCIPAL = "principal"
    STAFF = "staff"


@dataclass
class PathStep:
    """Represents a step in a learning path."""

    skill: Skill
    level: SkillLevel
    estimated_time: str  # e.g., "2-3 months"
    priority: str  # "critical", "high", "medium", "low"
    resources: list[str] = field(default_factory=list)
    prerequisites: list[str] = field(default_factory=list)  # Skill IDs


@dataclass
class PathNode:
    """Represents a node (level) in a career path."""

    level: CareerLevel
    title: str  # e.g., "Junior Software Engineer"
    required_skills: list[PathStep]
    optional_skills: list[PathStep]
    estimated_years: str  # e.g., "0-2 years"
    average_salary: str  # e.g., "$70K-$90K"
    responsibilities: list[str] = field(default_factory=list)


@dataclass
class LearningPath:
    """Represents a complete career progression path."""

    name: str
    description: str
    domain: str  # e.g., "software_engineering", "data_science"
    nodes: list[PathNode]  # Progression through career levels
    total_duration: str  # e.g., "5-7 years to senior"
    market_demand: str  # "high", "medium", "low"
    metadata: dict[str, Any] = field(default_factory=dict)


class LearningPathManager:
    """
    Manages career learning paths and skill progression.

    Provides structured paths from Junior → Senior with skill requirements,
    timelines, and resources for each level.
    """

    def __init__(self, skills_manager: SkillsGraphManager):
        """
        Initialize learning path manager.

        Args:
            skills_manager: SkillsGraphManager instance
        """
        self.skills_manager = skills_manager
        self.paths: dict[str, LearningPath] = {}
        self._build_default_paths()

        logger.info(f"LearningPathManager initialized with {len(self.paths)} paths")

    def _build_default_paths(self) -> None:
        """Build default learning paths for common careers."""
        # Software Engineering Path
        se_path = self._build_software_engineering_path()
        self.paths[se_path.name] = se_path

        # Data Science Path
        ds_path = self._build_data_science_path()
        self.paths[ds_path.name] = ds_path

        # DevOps Path
        devops_path = self._build_devops_path()
        self.paths[devops_path.name] = devops_path

        # Frontend Development Path
        frontend_path = self._build_frontend_path()
        self.paths[frontend_path.name] = frontend_path

    def _build_software_engineering_path(self) -> LearningPath:
        """Build software engineering career path."""
        # Junior Level
        junior_node = PathNode(
            level=CareerLevel.JUNIOR,
            title="Junior Software Engineer",
            required_skills=[
                PathStep(
                    skill=self.skills_manager.get_skill("python")
                    or Skill(id="python", name="Python", category="programming"),
                    level=SkillLevel.INTERMEDIATE,
                    estimated_time="3-6 months",
                    priority="critical",
                    resources=[
                        "Python.org Tutorial",
                        "freeCodeCamp Python Course",
                        "LeetCode Python Problems",
                    ],
                ),
                PathStep(
                    skill=self.skills_manager.get_skill("git")
                    or Skill(id="git", name="Git", category="tools"),
                    level=SkillLevel.INTERMEDIATE,
                    estimated_time="1-2 months",
                    priority="critical",
                    resources=["Git Documentation", "GitHub Learning Lab"],
                ),
                PathStep(
                    skill=self.skills_manager.get_skill("postgresql")
                    or Skill(id="postgresql", name="PostgreSQL", category="database"),
                    level=SkillLevel.BEGINNER,
                    estimated_time="2-3 months",
                    priority="high",
                    resources=["PostgreSQL Tutorial", "SQL Zoo"],
                ),
            ],
            optional_skills=[
                PathStep(
                    skill=self.skills_manager.get_skill("docker")
                    or Skill(id="docker", name="Docker", category="devops"),
                    level=SkillLevel.BEGINNER,
                    estimated_time="1-2 months",
                    priority="medium",
                    resources=["Docker Getting Started", "Play with Docker"],
                )
            ],
            estimated_years="0-2 years",
            average_salary="$70K-$90K",
            responsibilities=[
                "Write clean, maintainable code",
                "Fix bugs and implement features",
                "Participate in code reviews",
                "Learn from senior engineers",
            ],
        )

        # Mid Level
        mid_node = PathNode(
            level=CareerLevel.MID,
            title="Software Engineer",
            required_skills=[
                PathStep(
                    skill=self.skills_manager.get_skill("python")
                    or Skill(id="python", name="Python", category="programming"),
                    level=SkillLevel.ADVANCED,
                    estimated_time="12-18 months",
                    priority="critical",
                    resources=[
                        "Advanced Python Patterns",
                        "Design Patterns in Python",
                    ],
                ),
                PathStep(
                    skill=self.skills_manager.get_skill("aws")
                    or Skill(id="aws", name="AWS", category="cloud"),
                    level=SkillLevel.INTERMEDIATE,
                    estimated_time="4-6 months",
                    priority="high",
                    resources=["AWS Training", "A Cloud Guru"],
                ),
                PathStep(
                    skill=Skill(
                        id="system_design",
                        name="System Design",
                        category="architecture",
                    ),
                    level=SkillLevel.INTERMEDIATE,
                    estimated_time="6-12 months",
                    priority="critical",
                    resources=[
                        "System Design Primer",
                        "Designing Data-Intensive Applications",
                    ],
                ),
            ],
            optional_skills=[
                PathStep(
                    skill=self.skills_manager.get_skill("kubernetes")
                    or Skill(id="kubernetes", name="Kubernetes", category="devops"),
                    level=SkillLevel.INTERMEDIATE,
                    estimated_time="3-4 months",
                    priority="medium",
                    resources=["Kubernetes Basics", "K8s by Example"],
                )
            ],
            estimated_years="2-5 years",
            average_salary="$100K-$130K",
            responsibilities=[
                "Design and implement features end-to-end",
                "Mentor junior engineers",
                "Participate in technical discussions",
                "Improve system architecture",
            ],
        )

        # Senior Level
        senior_node = PathNode(
            level=CareerLevel.SENIOR,
            title="Senior Software Engineer",
            required_skills=[
                PathStep(
                    skill=self.skills_manager.get_skill("python")
                    or Skill(id="python", name="Python", category="programming"),
                    level=SkillLevel.EXPERT,
                    estimated_time="24+ months",
                    priority="critical",
                    resources=["Python Internals", "Contributing to CPython"],
                ),
                PathStep(
                    skill=Skill(
                        id="system_design",
                        name="System Design",
                        category="architecture",
                    ),
                    level=SkillLevel.ADVANCED,
                    estimated_time="12-24 months",
                    priority="critical",
                    resources=[
                        "Distributed Systems Course",
                        "Cloud Architecture Patterns",
                    ],
                ),
                PathStep(
                    skill=self.skills_manager.get_skill("leadership")
                    or Skill(id="leadership", name="Leadership", category="soft_skills"),
                    level=SkillLevel.ADVANCED,
                    estimated_time="Ongoing",
                    priority="high",
                    resources=["The Manager's Path", "Staff Engineer"],
                ),
            ],
            optional_skills=[
                PathStep(
                    skill=Skill(
                        id="security",
                        name="Security Engineering",
                        category="security",
                    ),
                    level=SkillLevel.ADVANCED,
                    estimated_time="6-12 months",
                    priority="medium",
                    resources=["OWASP Top 10", "Security Engineering Book"],
                )
            ],
            estimated_years="5-8 years",
            average_salary="$140K-$180K",
            responsibilities=[
                "Lead technical design and architecture",
                "Mentor team members",
                "Drive technical decisions",
                "Improve engineering processes",
                "Cross-team collaboration",
            ],
        )

        return LearningPath(
            name="software_engineering",
            description="Full-stack software engineering career path",
            domain="software_engineering",
            nodes=[junior_node, mid_node, senior_node],
            total_duration="5-8 years to senior",
            market_demand="high",
            metadata={"industries": ["tech", "finance", "healthcare", "e-commerce"]},
        )

    def _build_data_science_path(self) -> LearningPath:
        """Build data science career path."""
        junior_node = PathNode(
            level=CareerLevel.JUNIOR,
            title="Junior Data Scientist",
            required_skills=[
                PathStep(
                    skill=self.skills_manager.get_skill("python")
                    or Skill(id="python", name="Python", category="programming"),
                    level=SkillLevel.INTERMEDIATE,
                    estimated_time="3-6 months",
                    priority="critical",
                    resources=["Python for Data Science", "Kaggle Learn"],
                ),
                PathStep(
                    skill=Skill(
                        id="statistics", name="Statistics", category="data_science"
                    ),
                    level=SkillLevel.INTERMEDIATE,
                    estimated_time="4-6 months",
                    priority="critical",
                    resources=["Statistics Course", "Khan Academy Statistics"],
                ),
                PathStep(
                    skill=self.skills_manager.get_skill("scikit_learn")
                    or Skill(id="scikit_learn", name="Scikit-learn", category="ml_ai"),
                    level=SkillLevel.BEGINNER,
                    estimated_time="2-3 months",
                    priority="high",
                    resources=["Scikit-learn Tutorial", "Hands-on ML Book"],
                ),
            ],
            optional_skills=[],
            estimated_years="0-2 years",
            average_salary="$75K-$95K",
            responsibilities=[
                "Clean and analyze data",
                "Build simple ML models",
                "Create visualizations",
                "Learn from senior data scientists",
            ],
        )

        mid_node = PathNode(
            level=CareerLevel.MID,
            title="Data Scientist",
            required_skills=[
                PathStep(
                    skill=self.skills_manager.get_skill("tensorflow")
                    or Skill(id="tensorflow", name="TensorFlow", category="ml_ai"),
                    level=SkillLevel.INTERMEDIATE,
                    estimated_time="4-6 months",
                    priority="high",
                    resources=["TensorFlow Tutorial", "Deep Learning Specialization"],
                ),
                PathStep(
                    skill=self.skills_manager.get_skill("spark")
                    or Skill(id="spark", name="Apache Spark", category="data"),
                    level=SkillLevel.INTERMEDIATE,
                    estimated_time="3-4 months",
                    priority="medium",
                    resources=["Spark Documentation", "Big Data with PySpark"],
                ),
            ],
            optional_skills=[],
            estimated_years="2-5 years",
            average_salary="$110K-$140K",
            responsibilities=[
                "Design and deploy ML models",
                "Work with large datasets",
                "Collaborate with engineering",
                "Present insights to stakeholders",
            ],
        )

        senior_node = PathNode(
            level=CareerLevel.SENIOR,
            title="Senior Data Scientist / ML Engineer",
            required_skills=[
                PathStep(
                    skill=Skill(id="mlops", name="MLOps", category="ml_ai"),
                    level=SkillLevel.ADVANCED,
                    estimated_time="6-12 months",
                    priority="critical",
                    resources=["MLOps Guide", "Kubeflow Tutorial"],
                ),
            ],
            optional_skills=[],
            estimated_years="5-8 years",
            average_salary="$150K-$200K",
            responsibilities=[
                "Lead ML projects",
                "Design ML infrastructure",
                "Mentor data scientists",
                "Strategic technical decisions",
            ],
        )

        return LearningPath(
            name="data_science",
            description="Data science and machine learning career path",
            domain="data_science",
            nodes=[junior_node, mid_node, senior_node],
            total_duration="5-8 years to senior",
            market_demand="high",
        )

    def _build_devops_path(self) -> LearningPath:
        """Build DevOps career path."""
        junior_node = PathNode(
            level=CareerLevel.JUNIOR,
            title="Junior DevOps Engineer",
            required_skills=[
                PathStep(
                    skill=self.skills_manager.get_skill("docker")
                    or Skill(id="docker", name="Docker", category="devops"),
                    level=SkillLevel.INTERMEDIATE,
                    estimated_time="2-3 months",
                    priority="critical",
                    resources=["Docker Documentation", "Docker Mastery Course"],
                ),
                PathStep(
                    skill=Skill(id="linux", name="Linux", category="devops"),
                    level=SkillLevel.INTERMEDIATE,
                    estimated_time="3-6 months",
                    priority="critical",
                    resources=["Linux Journey", "Linux Command Line"],
                ),
            ],
            optional_skills=[],
            estimated_years="0-2 years",
            average_salary="$75K-$95K",
            responsibilities=[
                "Maintain CI/CD pipelines",
                "Deploy applications",
                "Monitor systems",
                "Learn infrastructure as code",
            ],
        )

        mid_node = PathNode(
            level=CareerLevel.MID,
            title="DevOps Engineer",
            required_skills=[
                PathStep(
                    skill=self.skills_manager.get_skill("kubernetes")
                    or Skill(id="kubernetes", name="Kubernetes", category="devops"),
                    level=SkillLevel.ADVANCED,
                    estimated_time="6-9 months",
                    priority="critical",
                    resources=["Kubernetes Documentation", "CKAD Certification"],
                ),
                PathStep(
                    skill=self.skills_manager.get_skill("terraform")
                    or Skill(id="terraform", name="Terraform", category="devops"),
                    level=SkillLevel.ADVANCED,
                    estimated_time="3-6 months",
                    priority="high",
                    resources=["Terraform Documentation", "HashiCorp Learn"],
                ),
            ],
            optional_skills=[],
            estimated_years="2-5 years",
            average_salary="$110K-$140K",
            responsibilities=[
                "Design cloud infrastructure",
                "Implement automation",
                "Improve reliability",
                "On-call rotations",
            ],
        )

        senior_node = PathNode(
            level=CareerLevel.SENIOR,
            title="Senior DevOps / SRE",
            required_skills=[
                PathStep(
                    skill=Skill(id="sre", name="Site Reliability", category="devops"),
                    level=SkillLevel.EXPERT,
                    estimated_time="12-24 months",
                    priority="critical",
                    resources=["SRE Book", "Building Secure & Reliable Systems"],
                ),
            ],
            optional_skills=[],
            estimated_years="5-8 years",
            average_salary="$140K-$180K",
            responsibilities=[
                "Lead infrastructure strategy",
                "Define SLOs and SLIs",
                "Mentor DevOps engineers",
                "Drive platform decisions",
            ],
        )

        return LearningPath(
            name="devops_engineering",
            description="DevOps and Site Reliability Engineering path",
            domain="devops",
            nodes=[junior_node, mid_node, senior_node],
            total_duration="5-8 years to senior",
            market_demand="high",
        )

    def _build_frontend_path(self) -> LearningPath:
        """Build frontend development career path."""
        junior_node = PathNode(
            level=CareerLevel.JUNIOR,
            title="Junior Frontend Developer",
            required_skills=[
                PathStep(
                    skill=self.skills_manager.get_skill("javascript")
                    or Skill(id="javascript", name="JavaScript", category="programming"),
                    level=SkillLevel.INTERMEDIATE,
                    estimated_time="3-6 months",
                    priority="critical",
                    resources=["JavaScript.info", "freeCodeCamp JS"],
                ),
                PathStep(
                    skill=self.skills_manager.get_skill("react")
                    or Skill(id="react", name="React", category="frontend"),
                    level=SkillLevel.BEGINNER,
                    estimated_time="2-4 months",
                    priority="high",
                    resources=["React Documentation", "React Tutorial"],
                ),
            ],
            optional_skills=[],
            estimated_years="0-2 years",
            average_salary="$70K-$90K",
            responsibilities=[
                "Build UI components",
                "Fix frontend bugs",
                "Implement designs",
                "Learn best practices",
            ],
        )

        mid_node = PathNode(
            level=CareerLevel.MID,
            title="Frontend Developer",
            required_skills=[
                PathStep(
                    skill=self.skills_manager.get_skill("typescript")
                    or Skill(id="typescript", name="TypeScript", category="programming"),
                    level=SkillLevel.ADVANCED,
                    estimated_time="4-6 months",
                    priority="high",
                    resources=["TypeScript Handbook", "TypeScript Deep Dive"],
                ),
                PathStep(
                    skill=self.skills_manager.get_skill("nextjs")
                    or Skill(id="nextjs", name="Next.js", category="frontend"),
                    level=SkillLevel.INTERMEDIATE,
                    estimated_time="2-3 months",
                    priority="medium",
                    resources=["Next.js Documentation", "Next.js Tutorial"],
                ),
            ],
            optional_skills=[],
            estimated_years="2-5 years",
            average_salary="$100K-$130K",
            responsibilities=[
                "Design UI architecture",
                "Optimize performance",
                "Mentor juniors",
                "Collaborate with design",
            ],
        )

        senior_node = PathNode(
            level=CareerLevel.SENIOR,
            title="Senior Frontend Engineer",
            required_skills=[
                PathStep(
                    skill=Skill(
                        id="frontend_architecture",
                        name="Frontend Architecture",
                        category="architecture",
                    ),
                    level=SkillLevel.EXPERT,
                    estimated_time="12-24 months",
                    priority="critical",
                    resources=["Frontend Architecture", "Web Performance"],
                ),
            ],
            optional_skills=[],
            estimated_years="5-8 years",
            average_salary="$130K-$170K",
            responsibilities=[
                "Lead frontend strategy",
                "Drive technical decisions",
                "Mentor team members",
                "Improve developer experience",
            ],
        )

        return LearningPath(
            name="frontend_development",
            description="Frontend development career path",
            domain="frontend",
            nodes=[junior_node, mid_node, senior_node],
            total_duration="5-8 years to senior",
            market_demand="high",
        )

    def get_path(self, path_name: str) -> LearningPath | None:
        """Get a learning path by name."""
        return self.paths.get(path_name)

    def get_all_paths(self) -> list[LearningPath]:
        """Get all available learning paths."""
        return list(self.paths.values())

    def get_path_for_domain(self, domain: str) -> LearningPath | None:
        """Get learning path for a specific domain."""
        for path in self.paths.values():
            if path.domain == domain:
                return path
        return None

    def get_next_level(
        self, path_name: str, current_level: CareerLevel
    ) -> PathNode | None:
        """Get the next career level in a path."""
        path = self.get_path(path_name)
        if not path:
            return None

        level_order = [
            CareerLevel.JUNIOR,
            CareerLevel.MID,
            CareerLevel.SENIOR,
            CareerLevel.LEAD,
            CareerLevel.PRINCIPAL,
        ]

        try:
            current_idx = level_order.index(current_level)
        except ValueError:
            return None

        # Find next level node
        for node in path.nodes:
            try:
                node_idx = level_order.index(node.level)
                if node_idx > current_idx:
                    return node
            except ValueError:
                continue

        return None

    def get_skills_to_next_level(
        self, path_name: str, current_level: CareerLevel, current_skills: list[str]
    ) -> list[PathStep]:
        """
        Get skills needed to progress to next level.

        Args:
            path_name: Name of the learning path
            current_level: Current career level
            current_skills: List of current skill IDs

        Returns:
            List of PathSteps for missing skills
        """
        next_level = self.get_next_level(path_name, current_level)
        if not next_level:
            return []

        current_skills_set = set(current_skills)
        missing_skills = []

        # Check required skills
        for step in next_level.required_skills:
            if step.skill.id not in current_skills_set:
                missing_skills.append(step)

        return missing_skills
