"""
Skills Taxonomy System

Advanced skills graph with LinkedIn integration, learning paths, and market insights.

This module provides:
- LinkedIn Skills Graph: 50K+ skills with relationships
- Skill Adjacency: Related skills mapping
- Learning Paths: Junior → Mid → Senior progression
- Demand Trends: Hot/dying skills, market demand
- Salary Correlation: Skills impact on compensation
"""

from .demand_trends import (
    DemandLevel,
    DemandTrend,
    DemandTrendsAnalyzer,
    TrendDirection,
)
from .learning_paths import (
    CareerLevel,
    LearningPath,
    LearningPathManager,
    PathNode,
    PathStep,
)
from .salary_correlation import (
    ExperienceLevel,
    SalaryCorrelation,
    SalaryCorrelationAnalyzer,
    SalaryImpact,
    SalaryRange,
)
from .skills_graph import (
    RelationshipType,
    Skill,
    SkillLevel,
    SkillRelationship,
    SkillsGraphManager,
)

__all__ = [
    # Skills Graph
    "Skill",
    "SkillRelationship",
    "RelationshipType",
    "SkillLevel",
    "SkillsGraphManager",
    # Learning Paths
    "LearningPath",
    "LearningPathManager",
    "PathNode",
    "PathStep",
    "CareerLevel",
    # Demand Trends
    "DemandTrend",
    "DemandTrendsAnalyzer",
    "TrendDirection",
    "DemandLevel",
    # Salary Correlation
    "SalaryCorrelation",
    "SalaryCorrelationAnalyzer",
    "SalaryImpact",
    "ExperienceLevel",
    "SalaryRange",
]
