"""
Tests for LLM-powered job search features.

Tests cover letter generation, interview prep, job analysis, etc.
"""

from unittest.mock import AsyncMock, patch

import pytest

from domains.llm.client import LLMConfig, LLMProvider, LLMResponse
from domains.llm.features import (
    CoverLetterRequest,
    InterviewPrepRequest,
    JobAnalysisRequest,
    LLMFeatures,
)


class TestLLMFeatures:
    """Test LLM-powered job search features."""

    @pytest.fixture
    def llm_features(self):
        """Create LLMFeatures instance with mocked client."""
        config = LLMConfig(provider=LLMProvider.OLLAMA)
        features = LLMFeatures(config)
        return features

    @pytest.fixture
    def mock_response(self):
        """Create mock LLM response."""
        return LLMResponse(
            content="Mock LLM response",
            provider=LLMProvider.OLLAMA,
            model="llama3.1:8b",
            tokens_used=100,
            cost_usd=0.0,
        )

    @pytest.mark.asyncio
    async def test_generate_cover_letter(self, llm_features, mock_response):
        """Test cover letter generation."""
        request = CoverLetterRequest(
            job_title="Senior Software Engineer",
            company_name="TechCorp",
            job_description="We are looking for a senior engineer...",
            resume_text="John Doe - 10 years experience...",
            tone="professional",
            max_length=500,
        )

        with patch.object(
            llm_features.client, "generate", new_callable=AsyncMock
        ) as mock_gen:
            mock_gen.return_value = mock_response

            response = await llm_features.generate_cover_letter(request)

            assert response.content == "Mock LLM response"
            assert response.cost_usd == 0.0  # Ollama is free

            # Verify correct parameters were used
            call_args = mock_gen.call_args
            assert "cover letter" in call_args.kwargs["prompt"].lower()
            assert request.job_title in call_args.kwargs["prompt"]
            assert request.company_name in call_args.kwargs["prompt"]

    @pytest.mark.asyncio
    async def test_prepare_interview_questions(self, llm_features, mock_response):
        """Test interview question generation."""
        request = InterviewPrepRequest(
            job_title="Data Scientist",
            company_name="DataCorp",
            job_description="We need a data scientist...",
            resume_text="Jane Doe - ML expert...",
            num_questions=10,
        )

        with patch.object(
            llm_features.client, "generate", new_callable=AsyncMock
        ) as mock_gen:
            mock_gen.return_value = mock_response

            response = await llm_features.prepare_interview_questions(request)

            assert response.content == "Mock LLM response"

            # Verify request includes job details
            call_args = mock_gen.call_args
            assert "interview questions" in call_args.kwargs["prompt"].lower()
            assert str(request.num_questions) in call_args.kwargs["prompt"]
            assert request.job_title in call_args.kwargs["prompt"]

    @pytest.mark.asyncio
    async def test_analyze_job_description(self, llm_features, mock_response):
        """Test job description analysis."""
        request = JobAnalysisRequest(
            job_description="Senior Engineer position requiring 5 years...",
            analyze_culture=True,
            analyze_requirements=True,
            analyze_compensation=True,
        )

        with patch.object(
            llm_features.client, "generate", new_callable=AsyncMock
        ) as mock_gen:
            mock_gen.return_value = mock_response

            response = await llm_features.analyze_job_description(request)

            assert response.content == "Mock LLM response"

            # Verify all analysis types are included
            call_args = mock_gen.call_args
            prompt = call_args.kwargs["prompt"]
            assert "requirements" in prompt.lower()
            assert "culture" in prompt.lower()
            assert "compensation" in prompt.lower()

    @pytest.mark.asyncio
    async def test_translate_skills(self, llm_features, mock_response):
        """Test skills translation."""
        resume_skills = ["Python", "Machine Learning", "TensorFlow"]
        job_requirements = ["AI Development", "Deep Learning", "PyTorch"]

        with patch.object(
            llm_features.client, "generate", new_callable=AsyncMock
        ) as mock_gen:
            mock_gen.return_value = mock_response

            response = await llm_features.translate_skills(resume_skills, job_requirements)

            assert response.content == "Mock LLM response"

            # Verify skills are included in prompt
            call_args = mock_gen.call_args
            prompt = call_args.kwargs["prompt"]
            for skill in resume_skills:
                assert skill in prompt
            for req in job_requirements:
                assert req in prompt

    @pytest.mark.asyncio
    async def test_improve_resume_section(self, llm_features, mock_response):
        """Test resume section improvement."""
        section_text = "Worked on Python projects. Made things better."
        job_description = "Senior Python Developer needed..."

        with patch.object(
            llm_features.client, "generate", new_callable=AsyncMock
        ) as mock_gen:
            mock_gen.return_value = mock_response

            response = await llm_features.improve_resume_section(
                section_text, job_description
            )

            assert response.content == "Mock LLM response"

            # Verify both inputs are in prompt
            call_args = mock_gen.call_args
            prompt = call_args.kwargs["prompt"]
            assert "Python projects" in prompt
            assert "Senior Python Developer" in prompt

    def test_is_available(self, llm_features):
        """Test availability check."""
        with patch.object(llm_features.client, "is_available", return_value=True):
            assert llm_features.is_available() is True

        with patch.object(llm_features.client, "is_available", return_value=False):
            assert llm_features.is_available() is False

    def test_estimate_cost_cover_letter(self, llm_features):
        """Test cost estimation for cover letter."""
        with patch.object(llm_features.client, "estimate_cost", return_value=0.0):
            cost = llm_features.estimate_cost("cover_letter")
            assert cost == 0.0  # Ollama is free

    def test_estimate_cost_interview_prep(self, llm_features):
        """Test cost estimation for interview prep."""
        # Change to OpenAI to test cost
        openai_config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key="sk-test",
        )
        features = LLMFeatures(openai_config)

        with patch.object(features.client, "estimate_cost", return_value=0.05):
            cost = features.estimate_cost("interview_prep")
            assert cost > 0.0

    def test_cover_letter_tone_variations(self, llm_features, mock_response):
        """Test different cover letter tones."""
        tones = ["professional", "enthusiastic", "formal"]

        for tone in tones:
            request = CoverLetterRequest(
                job_title="Engineer",
                company_name="Company",
                job_description="Description",
                resume_text="Resume",
                tone=tone,
            )

            with patch.object(
                llm_features.client, "generate", new_callable=AsyncMock
            ) as mock_gen:
                mock_gen.return_value = mock_response

                # Should not raise error
                import asyncio

                asyncio.run(llm_features.generate_cover_letter(request))

    def test_defaults_to_ollama(self):
        """Test that LLMFeatures defaults to Ollama for privacy."""
        features = LLMFeatures()

        assert features.config.provider == LLMProvider.OLLAMA

    def test_can_use_openai(self):
        """Test that OpenAI can be explicitly configured."""
        config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key="sk-test",
        )
        features = LLMFeatures(config)

        assert features.config.provider == LLMProvider.OPENAI

    def test_can_use_anthropic(self):
        """Test that Anthropic can be explicitly configured."""
        config = LLMConfig(
            provider=LLMProvider.ANTHROPIC,
            api_key="sk-ant-test",
        )
        features = LLMFeatures(config)

        assert features.config.provider == LLMProvider.ANTHROPIC


class TestCoverLetterRequest:
    """Test cover letter request validation."""

    def test_valid_request(self):
        """Test valid cover letter request."""
        request = CoverLetterRequest(
            job_title="Software Engineer",
            company_name="TechCorp",
            job_description="Description",
            resume_text="Resume",
        )

        assert request.job_title == "Software Engineer"
        assert request.company_name == "TechCorp"
        assert request.tone == "professional"  # Default
        assert request.max_length == 500  # Default

    def test_custom_tone(self):
        """Test custom tone."""
        request = CoverLetterRequest(
            job_title="Engineer",
            company_name="Corp",
            job_description="Desc",
            resume_text="Resume",
            tone="enthusiastic",
        )

        assert request.tone == "enthusiastic"

    def test_custom_length(self):
        """Test custom max length."""
        request = CoverLetterRequest(
            job_title="Engineer",
            company_name="Corp",
            job_description="Desc",
            resume_text="Resume",
            max_length=1000,
        )

        assert request.max_length == 1000


class TestInterviewPrepRequest:
    """Test interview prep request validation."""

    def test_valid_request(self):
        """Test valid interview prep request."""
        request = InterviewPrepRequest(
            job_title="Data Scientist",
            company_name="DataCorp",
            job_description="Description",
            resume_text="Resume",
        )

        assert request.num_questions == 10  # Default

    def test_custom_num_questions(self):
        """Test custom number of questions."""
        request = InterviewPrepRequest(
            job_title="Engineer",
            company_name="Corp",
            job_description="Desc",
            resume_text="Resume",
            num_questions=5,
        )

        assert request.num_questions == 5


class TestJobAnalysisRequest:
    """Test job analysis request validation."""

    def test_valid_request(self):
        """Test valid job analysis request."""
        request = JobAnalysisRequest(job_description="Description")

        assert request.analyze_culture is True  # Default
        assert request.analyze_requirements is True  # Default
        assert request.analyze_compensation is True  # Default

    def test_selective_analysis(self):
        """Test selective analysis options."""
        request = JobAnalysisRequest(
            job_description="Description",
            analyze_culture=False,
            analyze_requirements=True,
            analyze_compensation=False,
        )

        assert request.analyze_culture is False
        assert request.analyze_requirements is True
        assert request.analyze_compensation is False
