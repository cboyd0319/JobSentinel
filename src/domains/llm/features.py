"""
LLM-powered features for job search.

Privacy-first implementations:
- All features are opt-in
- Local-first by default (Ollama)
- Clear cost estimates for external APIs
- No data sent to external services without explicit consent
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from domains.llm.client import LLMClient, LLMConfig, LLMProvider, LLMResponse
from domains.llm.providers import AnthropicClient, OllamaClient, OpenAIClient


@dataclass
class CoverLetterRequest:
    """Cover letter generation request."""

    job_title: str
    company_name: str
    job_description: str
    resume_text: str
    tone: str = "professional"  # professional, enthusiastic, formal
    max_length: int = 500


@dataclass
class InterviewPrepRequest:
    """Interview preparation request."""

    job_title: str
    company_name: str
    job_description: str
    resume_text: str
    num_questions: int = 10


@dataclass
class JobAnalysisRequest:
    """Job description analysis request."""

    job_description: str
    analyze_culture: bool = True
    analyze_requirements: bool = True
    analyze_compensation: bool = True


class LLMFeatures:
    """LLM-powered job search features."""

    def __init__(self, config: LLMConfig | None = None):
        """Initialize LLM features.

        Args:
            config: LLM configuration (defaults to Ollama for privacy)
        """
        if config is None:
            config = LLMConfig(provider=LLMProvider.OLLAMA)

        self.config = config
        self.client = self._create_client(config)

    def _create_client(self, config: LLMConfig) -> LLMClient:
        """Create appropriate LLM client based on provider."""
        if config.provider == LLMProvider.OLLAMA:
            return OllamaClient(config)
        elif config.provider == LLMProvider.OPENAI:
            return OpenAIClient(config)
        elif config.provider == LLMProvider.ANTHROPIC:
            return AnthropicClient(config)
        else:
            raise ValueError(f"Unsupported provider: {config.provider}")

    async def generate_cover_letter(self, request: CoverLetterRequest) -> LLMResponse:
        """
        Generate personalized cover letter.

        Privacy: Uses configured provider (local Ollama by default).
        Cost: $0 for Ollama, ~$0.01-0.05 for external APIs.
        """
        system_prompt = (
            "You are an expert career coach specializing in cover letter writing. "
            "Write compelling, personalized cover letters that highlight relevant experience "
            "and demonstrate genuine interest in the role. Be concise, professional, and authentic."
        )

        user_prompt = f"""
Generate a {request.tone} cover letter for the following position:

**Job Title:** {request.job_title}
**Company:** {request.company_name}

**Job Description:**
{request.job_description[:2000]}  # Limit for token efficiency

**Candidate Resume:**
{request.resume_text[:2000]}

Requirements:
- Maximum {request.max_length} words
- Highlight 2-3 most relevant experiences
- Show genuine enthusiasm for the role
- Professional {request.tone} tone
- Include specific examples
- Do NOT use overly flowery language
- Do NOT include date, address, or salutation (start with opening paragraph)
"""

        return await self.client.generate(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.7,
            max_tokens=request.max_length * 2,  # Rough tokens estimate
        )

    async def prepare_interview_questions(self, request: InterviewPrepRequest) -> LLMResponse:
        """
        Generate likely interview questions.

        Privacy: Uses configured provider (local Ollama by default).
        Cost: $0 for Ollama, ~$0.01-0.05 for external APIs.
        """
        system_prompt = (
            "You are an expert interviewer who helps candidates prepare for job interviews. "
            "Generate realistic, role-specific interview questions that companies typically ask. "
            "Include behavioral, technical, and situational questions."
        )

        user_prompt = f"""
Generate {request.num_questions} likely interview questions for:

**Job Title:** {request.job_title}
**Company:** {request.company_name}

**Job Description:**
{request.job_description[:2000]}

**Candidate Background:**
{request.resume_text[:1500]}

Requirements:
- Mix of behavioral, technical, and role-specific questions
- Questions should align with the job description
- Include both common and company-specific questions
- Format as numbered list
- Include brief notes on what the interviewer is looking for
"""

        return await self.client.generate(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.6,
            max_tokens=1500,
        )

    async def analyze_job_description(self, request: JobAnalysisRequest) -> LLMResponse:
        """
        Analyze job description for insights.

        Extracts:
        - Key requirements and qualifications
        - Company culture indicators
        - Compensation and benefits insights
        - Red flags or concerns

        Privacy: Uses configured provider (local Ollama by default).
        Cost: $0 for Ollama, ~$0.01-0.03 for external APIs.
        """
        system_prompt = (
            "You are an expert recruiter who analyzes job descriptions. "
            "Extract key insights, requirements, and potential concerns. "
            "Be objective and help candidates make informed decisions."
        )

        analyses = []
        if request.analyze_requirements:
            analyses.append("- Key requirements and must-have qualifications")
        if request.analyze_culture:
            analyses.append("- Company culture indicators")
        if request.analyze_compensation:
            analyses.append("- Compensation and benefits insights")

        user_prompt = f"""
Analyze this job description in detail:

{request.job_description[:3000]}

Provide analysis of:
{chr(10).join(analyses)}
- Red flags or concerns
- Opportunities for growth
- Competitive advantages

Format as markdown with clear sections.
"""

        return await self.client.generate(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.5,
            max_tokens=1200,
        )

    async def translate_skills(
        self, resume_skills: list[str], job_requirements: list[str]
    ) -> LLMResponse:
        """
        Translate resume skills to job requirements language.

        Helps identify transferable skills and reframe experience.

        Privacy: Uses configured provider (local Ollama by default).
        Cost: $0 for Ollama, ~$0.01-0.02 for external APIs.
        """
        system_prompt = (
            "You are an expert at identifying transferable skills and reframing experience "
            "to match job requirements. Help candidates articulate how their background "
            "aligns with what employers are seeking."
        )

        user_prompt = f"""
Help translate these resume skills to match job requirements:

**Resume Skills:**
{', '.join(resume_skills)}

**Job Requirements:**
{', '.join(job_requirements)}

Provide:
1. Direct matches (skills that align well)
2. Transferable skills (how to reframe experience)
3. Skills gaps (what's missing)
4. Suggested language for resume/cover letter

Be specific and actionable.
"""

        return await self.client.generate(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.6,
            max_tokens=800,
        )

    async def improve_resume_section(self, section_text: str, job_description: str) -> LLMResponse:
        """
        Improve a resume section for a specific job.

        Privacy: Uses configured provider (local Ollama by default).
        Cost: $0 for Ollama, ~$0.01-0.03 for external APIs.
        """
        system_prompt = (
            "You are an expert resume writer. Improve resume sections to be more impactful, "
            "quantifiable, and aligned with job requirements. Use strong action verbs and "
            "specific metrics. Follow ATS best practices."
        )

        user_prompt = f"""
Improve this resume section for the target job:

**Current Resume Section:**
{section_text[:1000]}

**Target Job Description:**
{job_description[:1500]}

Requirements:
- Use strong action verbs
- Add quantifiable metrics where possible
- Align language with job requirements
- Keep it concise and impactful
- Follow ATS best practices
- Maintain truthfulness (don't invent facts)

Provide improved version and brief explanation of changes.
"""

        return await self.client.generate(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.7,
            max_tokens=1000,
        )

    def is_available(self) -> bool:
        """Check if LLM provider is available."""
        return self.client.is_available()

    def estimate_cost(self, feature: str) -> float:
        """
        Estimate cost for a feature.

        Args:
            feature: Feature name (cover_letter, interview_prep, etc.)

        Returns:
            Estimated cost in USD (0.0 for Ollama)
        """
        # Rough token estimates for each feature
        token_estimates = {
            "cover_letter": 2000,
            "interview_prep": 1500,
            "job_analysis": 1200,
            "skill_translation": 800,
            "resume_improvement": 1000,
        }

        tokens = token_estimates.get(feature, 1000)
        return self.client.estimate_cost("", tokens)
