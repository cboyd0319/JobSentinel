"""ML and AI endpoints."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


class SentimentAnalysisRequest(BaseModel):
    """Sentiment analysis request."""

    text: str = Field(..., min_length=1, max_length=10000)


class SentimentAnalysisResponse(BaseModel):
    """Sentiment analysis response."""

    sentiment: str = Field(..., description="positive, negative, or neutral")
    confidence: float = Field(..., ge=0.0, le=1.0)
    scores: dict[str, float] = Field(..., description="Detailed sentiment scores")
    red_flags: list[str] = Field(default_factory=list)


class SkillsGapRequest(BaseModel):
    """Skills gap analysis request."""

    current_skills: list[str] = Field(..., min_items=1)
    target_role: str = Field(..., min_length=1, max_length=200)
    industry: str | None = Field(None, max_length=100)


class SkillsGapResponse(BaseModel):
    """Skills gap analysis response."""

    missing_skills: list[str]
    adjacent_skills: list[str]
    learning_paths: list[dict[str, str]]
    estimated_time_months: int
    salary_potential: dict[str, int] | None = None


@router.post("/ml/sentiment", response_model=SentimentAnalysisResponse)
async def analyze_sentiment(request: SentimentAnalysisRequest) -> SentimentAnalysisResponse:
    """
    Analyze sentiment of job descriptions.

    Detects red flags like scams, MLM schemes, and unprofessional language.

    Privacy: Uses local VADER sentiment analysis, no external API calls.
    """
    try:
        from domains.ml.sentiment_analyzer import SentimentAnalyzer

        analyzer = SentimentAnalyzer()
        result = analyzer.analyze(request.text)

        return SentimentAnalysisResponse(
            sentiment=result.sentiment,
            confidence=result.confidence,
            scores=result.scores,
            red_flags=result.red_flags,
        )
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Sentiment analysis not available. Install with: pip install -e .[ml]",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sentiment analysis failed: {str(e)}")


@router.post("/ml/skills-gap", response_model=SkillsGapResponse)
async def analyze_skills_gap(request: SkillsGapRequest) -> SkillsGapResponse:
    """
    Analyze skills gap for target role.

    Provides learning paths, resource recommendations, and salary projections.

    Privacy: All analysis happens locally using skills taxonomy.
    """
    try:
        from domains.ml.skills_gap_analyzer import SkillsGapAnalyzer

        analyzer = SkillsGapAnalyzer()
        result = analyzer.analyze(
            current_skills=request.current_skills,
            target_role=request.target_role,
            industry=request.industry,
        )

        return SkillsGapResponse(
            missing_skills=result.missing_skills,
            adjacent_skills=result.adjacent_skills,
            learning_paths=result.learning_paths,
            estimated_time_months=result.estimated_time_months,
            salary_potential=result.salary_potential,
        )
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Skills gap analysis not available. Install with: pip install -e .[ml]",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Skills gap analysis failed: {str(e)}")


@router.get("/ml/status")
async def ml_status() -> dict[str, bool]:
    """
    Check which ML features are available.

    Returns availability of each ML module based on installed dependencies.
    """
    status = {
        "semantic_matching": False,
        "sentiment_analysis": False,
        "resume_analysis": False,
        "skills_gap_analysis": False,
    }

    try:
        from domains.ml.semantic_matcher import SemanticMatcher

        status["semantic_matching"] = True
    except ImportError:
        pass

    try:
        from domains.ml.sentiment_analyzer import SentimentAnalyzer

        status["sentiment_analysis"] = True
    except ImportError:
        pass

    try:
        from domains.ats.resume_parser import ResumeParser

        status["resume_analysis"] = True
    except ImportError:
        pass

    try:
        from domains.ml.skills_gap_analyzer import SkillsGapAnalyzer

        status["skills_gap_analysis"] = True
    except ImportError:
        pass

    return status
