"""Resume analysis endpoints."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


class ResumeAnalysisRequest(BaseModel):
    """Resume analysis request."""

    resume_text: str = Field(..., min_length=10, max_length=50000)
    industry: Optional[str] = Field(None, description="Target industry (e.g., Tech, Healthcare)")


class ResumeAnalysisResponse(BaseModel):
    """Resume analysis response."""

    overall_score: float = Field(..., ge=0.0, le=100.0)
    content_depth_score: float
    quantification_score: float
    action_verbs_score: float
    keyword_density_score: float
    format_score: float
    length_score: float
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[str]
    ats_compatibility: float


class JobMatchRequest(BaseModel):
    """Job matching request."""

    resume_text: str = Field(..., min_length=10, max_length=50000)
    job_description: str = Field(..., min_length=10, max_length=50000)
    required_skills: list[str] = Field(default_factory=list)


class JobMatchResponse(BaseModel):
    """Job matching response."""

    match_percentage: float = Field(..., ge=0.0, le=100.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    key_alignments: list[str]
    gaps: list[str]
    semantic_similarity: float


@router.post("/resume/analyze", response_model=ResumeAnalysisResponse)
async def analyze_resume(request: ResumeAnalysisRequest) -> ResumeAnalysisResponse:
    """
    Analyze resume quality and ATS compatibility.

    Uses ML-powered analysis to score resume across multiple dimensions
    and provide actionable improvement suggestions.

    Privacy: All analysis happens locally, no external API calls.
    """
    try:
        # Import ML modules (lazy load)
        from domains.ats.resume_parser import ResumeParser

        parser = ResumeParser()
        result = parser.analyze_resume_text(
            resume_text=request.resume_text,
            target_industry=request.industry or "Tech",
        )

        return ResumeAnalysisResponse(
            overall_score=result.get("overall_score", 0.0),
            content_depth_score=result.get("content_depth_score", 0.0),
            quantification_score=result.get("quantification_score", 0.0),
            action_verbs_score=result.get("action_verbs_score", 0.0),
            keyword_density_score=result.get("keyword_density_score", 0.0),
            format_score=result.get("format_score", 0.0),
            length_score=result.get("length_score", 0.0),
            strengths=result.get("strengths", []),
            weaknesses=result.get("weaknesses", []),
            suggestions=result.get("suggestions", []),
            ats_compatibility=result.get("ats_compatibility", 0.0),
        )
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Resume analysis not available. Install with: pip install -e .[resume]",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume analysis failed: {str(e)}")


@router.post("/resume/match", response_model=JobMatchResponse)
async def match_resume_to_job(request: JobMatchRequest) -> JobMatchResponse:
    """
    Match resume to job description using semantic similarity.

    Uses BERT-based semantic matching for deep understanding of
    alignment between resume and job requirements.

    Privacy: All processing happens locally with pre-trained models.
    """
    try:
        # Import ML modules (lazy load)
        from domains.ml.semantic_matcher import SemanticMatcher

        matcher = SemanticMatcher()
        result = matcher.match_resume_to_job(
            resume_text=request.resume_text,
            job_description=request.job_description,
            required_skills=request.required_skills,
        )

        return JobMatchResponse(
            match_percentage=result.match_percentage,
            confidence=result.confidence,
            key_alignments=result.key_alignments,
            gaps=result.gaps,
            semantic_similarity=result.semantic_similarity,
        )
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Semantic matching not available. Install with: pip install -e .[ml]",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Job matching failed: {str(e)}")
