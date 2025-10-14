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

from .skills_graph import (
    Skill,
    SkillRelationship,
    RelationshipType,
    SkillLevel,
    SkillsGraphManager,
)
from .learning_paths import (
    LearningPath,
    LearningPathManager,
    PathNode,
    PathStep,
    CareerLevel,
)
from .demand_trends import (
    DemandTrend,
    DemandTrendsAnalyzer,
    TrendDirection,
    DemandLevel,
)
from .salary_correlation import (
    SalaryCorrelation,
    SalaryCorrelationAnalyzer,
    SalaryImpact,
    ExperienceLevel,
    SalaryRange,
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
