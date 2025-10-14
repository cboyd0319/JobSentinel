"""
Skills Taxonomy API Endpoints

Provides REST API access to skills taxonomy features:
- Skills Graph with relationships
- Skill Adjacency (related skills)
- Learning Paths (career progression)
- Demand Trends (market insights)
- Salary Correlation (compensation analysis)
"""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from src.domains.skills_taxonomy import (
    CareerLevel,
    DemandTrendsAnalyzer,
    ExperienceLevel,
    LearningPathManager,
    RelationshipType,
    SalaryCorrelationAnalyzer,
    SkillsGraphManager,
    TrendDirection,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/skills", tags=["skills-taxonomy"])

# Initialize analyzers (singleton pattern - would use dependency injection in production)
_skills_manager: SkillsGraphManager | None = None
_learning_paths_manager: LearningPathManager | None = None
_demand_analyzer: DemandTrendsAnalyzer | None = None
_salary_analyzer: SalaryCorrelationAnalyzer | None = None


def get_skills_manager() -> SkillsGraphManager:
    """Get or create skills manager instance."""
    global _skills_manager
    if _skills_manager is None:
        _skills_manager = SkillsGraphManager()
    return _skills_manager


def get_learning_paths_manager() -> LearningPathManager:
    """Get or create learning paths manager instance."""
    global _learning_paths_manager
    if _learning_paths_manager is None:
        _learning_paths_manager = LearningPathManager(get_skills_manager())
    return _learning_paths_manager


def get_demand_analyzer() -> DemandTrendsAnalyzer:
    """Get or create demand trends analyzer instance."""
    global _demand_analyzer
    if _demand_analyzer is None:
        _demand_analyzer = DemandTrendsAnalyzer()
    return _demand_analyzer


def get_salary_analyzer() -> SalaryCorrelationAnalyzer:
    """Get or create salary correlation analyzer instance."""
    global _salary_analyzer
    if _salary_analyzer is None:
        _salary_analyzer = SalaryCorrelationAnalyzer()
    return _salary_analyzer


# Pydantic models for API responses
class SkillResponse(BaseModel):
    """Skill information response."""

    id: str
    name: str
    category: str
    description: str = ""
    aliases: list[str] = Field(default_factory=list)


class SkillRelationshipResponse(BaseModel):
    """Skill relationship response."""

    from_skill: str
    to_skill: str
    relationship_type: str
    strength: float


class AdjacentSkillResponse(BaseModel):
    """Adjacent skill with relationship info."""

    skill: SkillResponse
    relationship_type: str
    strength: float


class LearningPathStepResponse(BaseModel):
    """Learning path step response."""

    skill: SkillResponse
    level: str
    estimated_time: str
    priority: str
    resources: list[str]
    prerequisites: list[str]


class PathNodeResponse(BaseModel):
    """Career path node response."""

    level: str
    title: str
    required_skills: list[LearningPathStepResponse]
    optional_skills: list[LearningPathStepResponse]
    estimated_years: str
    average_salary: str
    responsibilities: list[str]


class LearningPathResponse(BaseModel):
    """Learning path response."""

    name: str
    description: str
    domain: str
    nodes: list[PathNodeResponse]
    total_duration: str
    market_demand: str


class DemandTrendResponse(BaseModel):
    """Demand trend response."""

    skill_id: str
    skill_name: str
    demand_level: str
    trend_direction: str
    growth_rate: float
    demand_score: float
    job_postings_count: int
    market_share: float
    insights: list[str]


class TrendReportResponse(BaseModel):
    """Comprehensive trend report response."""

    hot_skills: list[DemandTrendResponse]
    declining_skills: list[DemandTrendResponse]
    emerging_skills: list[DemandTrendResponse]
    stable_high_demand: list[DemandTrendResponse]
    generated_at: str
    metadata: dict[str, Any]


class SalaryRangeResponse(BaseModel):
    """Salary range response."""

    min: int
    max: int
    median: int
    currency: str = "USD"


class SalaryCorrelationResponse(BaseModel):
    """Salary correlation response."""

    skill_id: str
    skill_name: str
    impact: str
    salary_premium: float
    base_salary: SalaryRangeResponse
    with_skill_salary: SalaryRangeResponse
    experience_level: str
    sample_size: int
    confidence: float
    insights: list[str]


class SkillCombinationResponse(BaseModel):
    """Skill combination salary response."""

    skill_ids: list[str]
    skill_names: list[str]
    combined_premium: float
    salary_range: SalaryRangeResponse
    synergy_bonus: float
    market_examples: int


# Skills Graph Endpoints
@router.get("/graph", response_model=dict[str, Any])
async def get_skills_graph():
    """
    Get the complete skills graph with all skills and relationships.

    Returns the full taxonomy including:
    - All skills with metadata
    - All relationships between skills
    """
    try:
        manager = get_skills_manager()
        graph_data = manager.export_graph()
        return graph_data
    except Exception as e:
        logger.error(f"Error getting skills graph: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search", response_model=list[SkillResponse])
async def search_skills(
    query: str = Query(..., description="Search query for skills"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
):
    """
    Search for skills by name or description.

    Args:
        query: Search query string
        limit: Maximum number of results (1-50)

    Returns:
        List of matching skills
    """
    try:
        manager = get_skills_manager()
        skills = manager.search_skills(query, limit=limit)

        return [
            SkillResponse(
                id=skill.id,
                name=skill.name,
                category=skill.category,
                description=skill.description,
                aliases=skill.aliases,
            )
            for skill in skills
        ]
    except Exception as e:
        logger.error(f"Error searching skills: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/skill/{skill_id}", response_model=SkillResponse)
async def get_skill(skill_id: str):
    """
    Get detailed information about a specific skill.

    Args:
        skill_id: Skill identifier

    Returns:
        Skill details
    """
    try:
        manager = get_skills_manager()
        skill = manager.get_skill(skill_id)

        if not skill:
            raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")

        return SkillResponse(
            id=skill.id,
            name=skill.name,
            category=skill.category,
            description=skill.description,
            aliases=skill.aliases,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting skill: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Skill Adjacency Endpoints
@router.get("/adjacency/{skill_id}", response_model=list[AdjacentSkillResponse])
async def get_adjacent_skills(
    skill_id: str,
    relationship_types: list[str] | None = Query(
        None, description="Filter by relationship types"
    ),
):
    """
    Get skills adjacent to a specific skill (related/connected skills).

    Args:
        skill_id: Skill identifier
        relationship_types: Optional filter by relationship types

    Returns:
        List of adjacent skills with relationship information
    """
    try:
        manager = get_skills_manager()

        # Parse relationship types if provided
        rel_types = None
        if relationship_types:
            try:
                rel_types = [RelationshipType(rt) for rt in relationship_types]
            except ValueError as e:
                raise HTTPException(
                    status_code=400, detail=f"Invalid relationship type: {e}"
                )

        adjacent = manager.get_adjacent_skills(skill_id, relationship_types=rel_types)

        return [
            AdjacentSkillResponse(
                skill=SkillResponse(
                    id=skill.id,
                    name=skill.name,
                    category=skill.category,
                    description=skill.description,
                    aliases=skill.aliases,
                ),
                relationship_type=rel.relationship_type.value,
                strength=rel.strength,
            )
            for skill, rel in adjacent
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting adjacent skills: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/related/{skill_id}", response_model=list[SkillResponse])
async def get_related_skills(
    skill_id: str, max_distance: int = Query(1, ge=1, le=3, description="Max graph distance")
):
    """
    Get skills related to a specific skill via breadth-first search.

    Args:
        skill_id: Skill identifier
        max_distance: Maximum graph distance (1-3)

    Returns:
        List of related skills
    """
    try:
        manager = get_skills_manager()
        related = manager.get_related_skills(skill_id, max_distance=max_distance)

        return [
            SkillResponse(
                id=skill.id,
                name=skill.name,
                category=skill.category,
                description=skill.description,
                aliases=skill.aliases,
            )
            for skill in related
        ]
    except Exception as e:
        logger.error(f"Error getting related skills: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/requirements/{skill_id}", response_model=list[SkillResponse])
async def get_skill_requirements(skill_id: str):
    """
    Get prerequisites/requirements for learning a skill.

    Args:
        skill_id: Skill identifier

    Returns:
        List of required prerequisite skills
    """
    try:
        manager = get_skills_manager()
        requirements = manager.get_skill_requirements(skill_id)

        return [
            SkillResponse(
                id=skill.id,
                name=skill.name,
                category=skill.category,
                description=skill.description,
                aliases=skill.aliases,
            )
            for skill in requirements
        ]
    except Exception as e:
        logger.error(f"Error getting skill requirements: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Learning Paths Endpoints
@router.get("/learning-paths", response_model=list[LearningPathResponse])
async def get_all_learning_paths():
    """
    Get all available career learning paths.

    Returns:
        List of all learning paths with progression details
    """
    try:
        manager = get_learning_paths_manager()
        paths = manager.get_all_paths()

        return [_convert_learning_path(path) for path in paths]
    except Exception as e:
        logger.error(f"Error getting learning paths: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/learning-paths/{path_name}", response_model=LearningPathResponse)
async def get_learning_path(path_name: str):
    """
    Get a specific career learning path.

    Args:
        path_name: Learning path name (e.g., 'software_engineering')

    Returns:
        Complete learning path with all career levels
    """
    try:
        manager = get_learning_paths_manager()
        path = manager.get_path(path_name)

        if not path:
            raise HTTPException(status_code=404, detail=f"Path '{path_name}' not found")

        return _convert_learning_path(path)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting learning path: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/learning-paths/{path_name}/next-level")
async def get_next_career_level(path_name: str, current_level: str):
    """
    Get the next career level in a learning path.

    Args:
        path_name: Learning path name
        current_level: Current career level

    Returns:
        Next career level node
    """
    try:
        manager = get_learning_paths_manager()

        # Parse career level
        try:
            level = CareerLevel(current_level.lower())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid career level: {current_level}")

        next_node = manager.get_next_level(path_name, level)

        if not next_node:
            return {"message": "No next level available"}

        return _convert_path_node(next_node)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting next career level: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Demand Trends Endpoints
@router.get("/trends", response_model=TrendReportResponse)
async def get_trend_report():
    """
    Get comprehensive market demand trend report.

    Returns:
        Trend report with hot, declining, emerging, and stable skills
    """
    try:
        analyzer = get_demand_analyzer()
        report = analyzer.generate_trend_report()

        return TrendReportResponse(
            hot_skills=[_convert_demand_trend(t) for t in report.hot_skills],
            declining_skills=[_convert_demand_trend(t) for t in report.declining_skills],
            emerging_skills=[_convert_demand_trend(t) for t in report.emerging_skills],
            stable_high_demand=[_convert_demand_trend(t) for t in report.stable_high_demand],
            generated_at=report.generated_at.isoformat(),
            metadata=report.metadata,
        )
    except Exception as e:
        logger.error(f"Error generating trend report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends/{skill_id}", response_model=DemandTrendResponse)
async def get_skill_demand_trend(skill_id: str):
    """
    Get market demand trend for a specific skill.

    Args:
        skill_id: Skill identifier

    Returns:
        Demand trend analysis for the skill
    """
    try:
        analyzer = get_demand_analyzer()
        trend = analyzer.get_skill_demand(skill_id)

        return _convert_demand_trend(trend)
    except Exception as e:
        logger.error(f"Error getting skill demand trend: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends/hot", response_model=list[DemandTrendResponse])
async def get_hot_skills(limit: int = Query(10, ge=1, le=50)):
    """
    Get top hot/rising skills with increasing demand.

    Args:
        limit: Maximum number of skills to return

    Returns:
        List of hot skills sorted by growth rate
    """
    try:
        analyzer = get_demand_analyzer()
        hot_skills = analyzer.get_hot_skills(limit=limit)

        return [_convert_demand_trend(t) for t in hot_skills]
    except Exception as e:
        logger.error(f"Error getting hot skills: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Salary Correlation Endpoints
@router.get("/salary-correlation/{skill_id}", response_model=SalaryCorrelationResponse)
async def get_skill_salary_impact(
    skill_id: str, experience_level: str = Query("mid", description="Experience level")
):
    """
    Get salary impact analysis for a specific skill.

    Args:
        skill_id: Skill identifier
        experience_level: Experience level (entry, mid, senior, lead)

    Returns:
        Salary correlation analysis
    """
    try:
        analyzer = get_salary_analyzer()

        # Parse experience level
        try:
            exp_level = ExperienceLevel(experience_level.lower())
        except ValueError:
            raise HTTPException(
                status_code=400, detail=f"Invalid experience level: {experience_level}"
            )

        correlation = analyzer.get_skill_salary_impact(skill_id, experience_level=exp_level)

        return _convert_salary_correlation(correlation)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting salary correlation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/salary-correlation/top-paying", response_model=list[SalaryCorrelationResponse])
async def get_top_paying_skills(
    limit: int = Query(10, ge=1, le=50), experience_level: str = Query("mid")
):
    """
    Get top paying skills by salary premium.

    Args:
        limit: Maximum number of skills to return
        experience_level: Experience level

    Returns:
        List of skills sorted by salary premium
    """
    try:
        analyzer = get_salary_analyzer()

        try:
            exp_level = ExperienceLevel(experience_level.lower())
        except ValueError:
            raise HTTPException(
                status_code=400, detail=f"Invalid experience level: {experience_level}"
            )

        top_skills = analyzer.get_top_paying_skills(limit=limit, experience_level=exp_level)

        return [_convert_salary_correlation(c) for c in top_skills]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting top paying skills: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/salary-correlation/combination", response_model=SkillCombinationResponse)
async def analyze_skill_combination(
    skill_ids: list[str], experience_level: str = Query("mid")
):
    """
    Analyze salary impact of a skill combination.

    Args:
        skill_ids: List of skill IDs
        experience_level: Experience level

    Returns:
        Salary analysis for the skill combination
    """
    try:
        analyzer = get_salary_analyzer()

        try:
            exp_level = ExperienceLevel(experience_level.lower())
        except ValueError:
            raise HTTPException(
                status_code=400, detail=f"Invalid experience level: {experience_level}"
            )

        combination = analyzer.analyze_skill_combination(skill_ids, experience_level=exp_level)

        return _convert_skill_combination(combination)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing skill combination: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Helper functions for data conversion
def _convert_learning_path(path) -> LearningPathResponse:
    """Convert LearningPath to response model."""
    return LearningPathResponse(
        name=path.name,
        description=path.description,
        domain=path.domain,
        nodes=[_convert_path_node(node) for node in path.nodes],
        total_duration=path.total_duration,
        market_demand=path.market_demand,
    )


def _convert_path_node(node) -> PathNodeResponse:
    """Convert PathNode to response model."""
    return PathNodeResponse(
        level=node.level.value,
        title=node.title,
        required_skills=[_convert_path_step(step) for step in node.required_skills],
        optional_skills=[_convert_path_step(step) for step in node.optional_skills],
        estimated_years=node.estimated_years,
        average_salary=node.average_salary,
        responsibilities=node.responsibilities,
    )


def _convert_path_step(step) -> LearningPathStepResponse:
    """Convert PathStep to response model."""
    return LearningPathStepResponse(
        skill=SkillResponse(
            id=step.skill.id,
            name=step.skill.name,
            category=step.skill.category,
            description=step.skill.description if hasattr(step.skill, "description") else "",
            aliases=step.skill.aliases if hasattr(step.skill, "aliases") else [],
        ),
        level=step.level.value,
        estimated_time=step.estimated_time,
        priority=step.priority,
        resources=step.resources,
        prerequisites=step.prerequisites,
    )


def _convert_demand_trend(trend) -> DemandTrendResponse:
    """Convert DemandTrend to response model."""
    return DemandTrendResponse(
        skill_id=trend.skill_id,
        skill_name=trend.skill_name,
        demand_level=trend.demand_level.value,
        trend_direction=trend.trend_direction.value,
        growth_rate=trend.growth_rate,
        demand_score=trend.demand_score,
        job_postings_count=trend.job_postings_count,
        market_share=trend.market_share,
        insights=trend.insights,
    )


def _convert_salary_correlation(correlation) -> SalaryCorrelationResponse:
    """Convert SalaryCorrelation to response model."""
    return SalaryCorrelationResponse(
        skill_id=correlation.skill_id,
        skill_name=correlation.skill_name,
        impact=correlation.impact.value,
        salary_premium=correlation.salary_premium,
        base_salary=SalaryRangeResponse(
            min=correlation.base_salary.min,
            max=correlation.base_salary.max,
            median=correlation.base_salary.median,
            currency=correlation.base_salary.currency,
        ),
        with_skill_salary=SalaryRangeResponse(
            min=correlation.with_skill_salary.min,
            max=correlation.with_skill_salary.max,
            median=correlation.with_skill_salary.median,
            currency=correlation.with_skill_salary.currency,
        ),
        experience_level=correlation.experience_level.value,
        sample_size=correlation.sample_size,
        confidence=correlation.confidence,
        insights=correlation.insights,
    )


def _convert_skill_combination(combination) -> SkillCombinationResponse:
    """Convert SkillCombination to response model."""
    return SkillCombinationResponse(
        skill_ids=combination.skill_ids,
        skill_names=combination.skill_names,
        combined_premium=combination.combined_premium,
        salary_range=SalaryRangeResponse(
            min=combination.salary_range.min,
            max=combination.salary_range.max,
            median=combination.salary_range.median,
            currency=combination.salary_range.currency,
        ),
        synergy_bonus=combination.synergy_bonus,
        market_examples=combination.market_examples,
    )
