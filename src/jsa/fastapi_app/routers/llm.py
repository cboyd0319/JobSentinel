"""
LLM-powered features API.

Privacy-first design:
- All features are opt-in
- Default to local Ollama (FREE, private)
- Clear cost estimates for external APIs
- Explicit warnings when using external services
"""

from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from domains.llm.client import LLMConfig, LLMProvider
from domains.llm.features import (
    CoverLetterRequest,
    InterviewPrepRequest,
    JobAnalysisRequest,
    LLMFeatures,
)

router = APIRouter()


class LLMConfigRequest(BaseModel):
    """LLM configuration request."""

    provider: LLMProvider = Field(
        default=LLMProvider.OLLAMA, description="LLM provider (ollama, openai, anthropic)"
    )
    model: str | None = Field(None, description="Provider-specific model")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2000, ge=100, le=8000)


class CoverLetterAPIRequest(BaseModel):
    """Cover letter generation request."""

    job_title: str = Field(..., min_length=1, max_length=200)
    company_name: str = Field(..., min_length=1, max_length=200)
    job_description: str = Field(..., min_length=10, max_length=10000)
    resume_text: str = Field(..., min_length=10, max_length=10000)
    tone: str = Field(default="professional", pattern="^(professional|enthusiastic|formal)$")
    max_length: int = Field(default=500, ge=100, le=1000)
    llm_config: LLMConfigRequest | None = None


class InterviewPrepAPIRequest(BaseModel):
    """Interview preparation request."""

    job_title: str = Field(..., min_length=1, max_length=200)
    company_name: str = Field(..., min_length=1, max_length=200)
    job_description: str = Field(..., min_length=10, max_length=10000)
    resume_text: str = Field(..., min_length=10, max_length=10000)
    num_questions: int = Field(default=10, ge=3, le=20)
    llm_config: LLMConfigRequest | None = None


class JobAnalysisAPIRequest(BaseModel):
    """Job analysis request."""

    job_description: str = Field(..., min_length=10, max_length=10000)
    analyze_culture: bool = Field(default=True)
    analyze_requirements: bool = Field(default=True)
    analyze_compensation: bool = Field(default=True)
    llm_config: LLMConfigRequest | None = None


class SkillTranslationRequest(BaseModel):
    """Skill translation request."""

    resume_skills: list[str] = Field(..., min_items=1, max_items=50)
    job_requirements: list[str] = Field(..., min_items=1, max_items=50)
    llm_config: LLMConfigRequest | None = None


class ResumeSectionRequest(BaseModel):
    """Resume section improvement request."""

    section_text: str = Field(..., min_length=10, max_length=5000)
    job_description: str = Field(..., min_length=10, max_length=10000)
    llm_config: LLMConfigRequest | None = None


class LLMResponse(BaseModel):
    """LLM response."""

    content: str
    provider: str
    model: str
    tokens_used: int
    cost_usd: float
    privacy_note: str


def _create_config(req_config: LLMConfigRequest | None) -> LLMConfig:
    """Create LLM config from request."""
    if req_config is None:
        # Default to Ollama (privacy-first)
        return LLMConfig(provider=LLMProvider.OLLAMA)

    # Get API keys from environment
    api_key = None
    if req_config.provider == LLMProvider.OPENAI:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="OpenAI API key not configured. Set OPENAI_API_KEY environment variable.",
            )
    elif req_config.provider == LLMProvider.ANTHROPIC:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.",
            )

    return LLMConfig(
        provider=req_config.provider,
        model=req_config.model,
        api_key=api_key,
        temperature=req_config.temperature,
        max_tokens=req_config.max_tokens,
    )


def _create_response(llm_response) -> LLMResponse:
    """Create API response from LLM response."""
    privacy_notes = {
        LLMProvider.OLLAMA: "✅ Processed locally. No data sent to external services.",
        LLMProvider.OPENAI: "⚠️  Data sent to OpenAI API. See OpenAI privacy policy.",
        LLMProvider.ANTHROPIC: "⚠️  Data sent to Anthropic API. See Anthropic privacy policy.",
    }

    return LLMResponse(
        content=llm_response.content,
        provider=llm_response.provider.value,
        model=llm_response.model,
        tokens_used=llm_response.tokens_used,
        cost_usd=llm_response.cost_usd,
        privacy_note=privacy_notes.get(
            llm_response.provider, "Privacy status unknown for this provider."
        ),
    )


@router.post("/llm/cover-letter", response_model=LLMResponse)
async def generate_cover_letter(request: CoverLetterAPIRequest) -> LLMResponse:
    """
    Generate personalized cover letter.

    **Privacy Options:**
    - **Ollama (default)**: FREE, 100% local, no data leaves your machine
    - **OpenAI**: Requires API key, ~$0.01-0.05 per generation
    - **Anthropic**: Requires API key, ~$0.01-0.05 per generation

    Set `llm_config.provider` to choose.
    """
    try:
        config = _create_config(request.llm_config)
        features = LLMFeatures(config)

        if not features.is_available():
            raise HTTPException(
                status_code=503,
                detail=(
                    "LLM provider not available. "
                    "For Ollama: ensure it's running (http://localhost:11434). "
                    "For external APIs: check API key configuration."
                ),
            )

        llm_request = CoverLetterRequest(
            job_title=request.job_title,
            company_name=request.company_name,
            job_description=request.job_description,
            resume_text=request.resume_text,
            tone=request.tone,
            max_length=request.max_length,
        )

        result = await features.generate_cover_letter(llm_request)
        return _create_response(result)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {str(e)}")


@router.post("/llm/interview-prep", response_model=LLMResponse)
async def prepare_interview(request: InterviewPrepAPIRequest) -> LLMResponse:
    """
    Generate likely interview questions for preparation.

    Uses LLM to predict role-specific questions based on job description.
    """
    try:
        config = _create_config(request.llm_config)
        features = LLMFeatures(config)

        if not features.is_available():
            raise HTTPException(status_code=503, detail="LLM provider not available")

        llm_request = InterviewPrepRequest(
            job_title=request.job_title,
            company_name=request.company_name,
            job_description=request.job_description,
            resume_text=request.resume_text,
            num_questions=request.num_questions,
        )

        result = await features.prepare_interview_questions(llm_request)
        return _create_response(result)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interview prep failed: {str(e)}")


@router.post("/llm/analyze-job", response_model=LLMResponse)
async def analyze_job(request: JobAnalysisAPIRequest) -> LLMResponse:
    """
    Analyze job description for insights.

    Extracts requirements, culture indicators, compensation insights, and red flags.
    """
    try:
        config = _create_config(request.llm_config)
        features = LLMFeatures(config)

        if not features.is_available():
            raise HTTPException(status_code=503, detail="LLM provider not available")

        llm_request = JobAnalysisRequest(
            job_description=request.job_description,
            analyze_culture=request.analyze_culture,
            analyze_requirements=request.analyze_requirements,
            analyze_compensation=request.analyze_compensation,
        )

        result = await features.analyze_job_description(llm_request)
        return _create_response(result)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Job analysis failed: {str(e)}")


@router.post("/llm/translate-skills", response_model=LLMResponse)
async def translate_skills(request: SkillTranslationRequest) -> LLMResponse:
    """
    Translate resume skills to job requirements language.

    Helps identify transferable skills and reframe experience.
    """
    try:
        config = _create_config(request.llm_config)
        features = LLMFeatures(config)

        if not features.is_available():
            raise HTTPException(status_code=503, detail="LLM provider not available")

        result = await features.translate_skills(request.resume_skills, request.job_requirements)
        return _create_response(result)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Skill translation failed: {str(e)}")


@router.post("/llm/improve-resume", response_model=LLMResponse)
async def improve_resume_section(request: ResumeSectionRequest) -> LLMResponse:
    """
    Improve a resume section for a specific job.

    Uses LLM to suggest better phrasing, action verbs, and quantifiable metrics.
    """
    try:
        config = _create_config(request.llm_config)
        features = LLMFeatures(config)

        if not features.is_available():
            raise HTTPException(status_code=503, detail="LLM provider not available")

        result = await features.improve_resume_section(
            request.section_text, request.job_description
        )
        return _create_response(result)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume improvement failed: {str(e)}")


@router.get("/llm/status")
async def llm_status() -> dict:
    """
    Check LLM provider availability and estimated costs.

    Returns which providers are configured and their estimated costs.
    """
    status = {
        "ollama": {
            "available": False,
            "cost": "$0 (FREE, local)",
            "privacy": "100% local, no data leaves your machine",
            "setup": "Install from https://ollama.com",
        },
        "openai": {
            "available": bool(os.getenv("OPENAI_API_KEY")),
            "cost": "$0.01-0.05 per request (GPT-4o-mini)",
            "privacy": "Data sent to OpenAI API",
            "setup": "Set OPENAI_API_KEY environment variable",
        },
        "anthropic": {
            "available": bool(os.getenv("ANTHROPIC_API_KEY")),
            "cost": "$0.01-0.05 per request (Claude Sonnet)",
            "privacy": "Data sent to Anthropic API",
            "setup": "Set ANTHROPIC_API_KEY environment variable",
        },
    }

    # Check if Ollama is running
    try:
        from domains.llm.client import LLMConfig, LLMProvider
        from domains.llm.providers import OllamaClient

        client = OllamaClient(LLMConfig(provider=LLMProvider.OLLAMA))
        status["ollama"]["available"] = client.is_available()
    except Exception:
        pass

    return status
