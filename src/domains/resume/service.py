"""
Resume Analysis Service

Main service that coordinates resume parsing, analysis, and enhancement.
"""

import logging

from .analyzers.content_analyzer import ContentAnalyzer
from .models import (
    IndustryProfile,
    ResumeAnalysis,
    ResumeContent,
    ResumeSuggestion,
    ResumeTemplate,
    SectionType,
)
from .parsers.content_parser import ResumeContentParser
from .suggestions.suggestion_engine import SuggestionEngine

# For dependency injection integration
try:
    from utils.dependency_injection import ServiceContainer, injectable

    HAS_DI = True
except ImportError:
    HAS_DI = False

    # Fallback decorator
    def injectable(interface=None):
        def decorator(cls):
            return cls

        return decorator


logger = logging.getLogger(__name__)


@injectable()
class ResumeEnhancementService:
    """
    Main service for resume analysis and enhancement.

    Provides a clean interface for resume processing, analysis, and improvement suggestions.
    """

    def __init__(self):
        self.parser = ResumeContentParser()
        self.suggestion_engine = SuggestionEngine()
        self.content_analyzer = ContentAnalyzer()

        logger.info("Resume Enhancement Service initialized")

    def analyze_resume_text(
        self,
        resume_text: str,
        target_industry: str | None = None,
        job_description: str | None = None,
    ) -> ResumeAnalysis:
        """
        Perform comprehensive analysis of resume text.

        Args:
            resume_text: The resume content as text
            target_industry: Target industry for optimization
            job_description: Specific job description to match against

        Returns:
            ResumeAnalysis with comprehensive enhancement suggestions
        """

        logger.info("Starting resume enhancement analysis")

        # 1. Parse resume into structured format
        resume_content = self.parser.parse_resume_text(resume_text)

        # 2. Analyze content quality
        content_analysis = self.content_analyzer.analyze_content(resume_content)

        # 3. Generate improvement suggestions
        suggestions = self.suggestion_engine.generate_suggestions(
            resume_content, target_industry, job_description
        )

        # 4. Calculate scores
        current_score = self._calculate_current_score(resume_content, content_analysis)
        potential_score = self._calculate_potential_score(current_score, suggestions)

        # 5. Categorize sections
        strong_sections, weak_sections, missing_sections = self._categorize_sections(
            resume_content, suggestions
        )

        # 6. Determine industry match and template recommendation
        industry_match = target_industry or self._detect_industry(resume_content)
        recommended_template = self._recommend_template(resume_content, industry_match)

        analysis = ResumeAnalysis(
            current_score=current_score,
            potential_score=potential_score,
            suggestions=suggestions,
            missing_sections=missing_sections,
            weak_sections=weak_sections,
            strong_sections=strong_sections,
            industry_match=industry_match,
            recommended_template=recommended_template,
            word_count=resume_content.get_total_word_count(),
            estimated_pages=float(resume_content.format_info.get("estimated_pages", 1.0)),
            keyword_density=content_analysis.get("keyword_density", {}),
            readability_score=content_analysis.get("readability_score", 0.0),
        )

        logger.info(
            f"Analysis complete. Current score: {current_score}, Potential: {potential_score}"
        )
        return analysis

    def get_industry_profiles(self) -> dict[str, IndustryProfile]:
        """
        Get available industry profiles.
        
        Returns:
            Dictionary mapping industry keys to IndustryProfile objects
            
        Note:
            Includes both core and extended industry profiles
        """
        return self.suggestion_engine._all_profiles.copy()
    
    def list_available_industries(self) -> list[str]:
        """
        Get list of all available industry profile keys.
        
        Returns:
            Sorted list of industry identifiers
        """
        return self.suggestion_engine.get_available_industries()

    def get_template_recommendations(self, industry: str | None = None) -> ResumeTemplate:
        """Get template recommendation for industry."""
        if not industry:
            return ResumeTemplate.ATS_OPTIMIZED

        template_map = {
            "software_engineering": ResumeTemplate.TECHNICAL,
            "data_science": ResumeTemplate.TECHNICAL,
            "marketing": ResumeTemplate.ATS_OPTIMIZED,
            "executive": ResumeTemplate.EXECUTIVE,
            "creative": ResumeTemplate.CREATIVE,
        }

        return template_map.get(industry, ResumeTemplate.ATS_OPTIMIZED)

    def _calculate_current_score(
        self, resume_content: ResumeContent, content_analysis: dict
    ) -> float:
        """Calculate current resume quality score."""
        score = 50.0  # Base score

        # Section completeness (40 points max)
        required_sections = [
            SectionType.CONTACT,
            SectionType.SUMMARY,
            SectionType.EXPERIENCE,
            SectionType.EDUCATION,
        ]

        sections_score = 0
        for section_type in required_sections:
            if resume_content.has_section(section_type):
                sections_score += 10

        # Content quality (30 points max)
        word_count = resume_content.get_total_word_count()
        content_score = 0

        if 300 <= word_count <= 600:
            content_score += 15  # Optimal length
        elif 200 <= word_count < 800:
            content_score += 10  # Acceptable length
        else:
            content_score += 5  # Suboptimal length

        # Readability (15 points max)
        readability_score = content_analysis.get("readability_score", 0.0)
        readability_points = min(15, readability_score * 15 / 100)

        # Contact information (15 points max)
        contact_info = resume_content.metadata
        contact_score = 0
        if contact_info.get("email"):
            contact_score += 5
        if contact_info.get("phone"):
            contact_score += 5
        if contact_info.get("linkedin") or contact_info.get("github"):
            contact_score += 5

        total_score = min(
            100, score + sections_score + content_score + readability_points + contact_score
        )
        return round(total_score, 1)

    def _calculate_potential_score(
        self, current_score: float, suggestions: list[ResumeSuggestion]
    ) -> float:
        """Calculate potential score after implementing suggestions."""
        potential_improvement = sum(s.impact_score for s in suggestions if s.priority <= 2)
        potential_score = min(100, current_score + potential_improvement)
        return round(potential_score, 1)

    def _categorize_sections(
        self, resume_content: ResumeContent, suggestions: list[ResumeSuggestion]
    ) -> tuple[list[str], list[str], list[str]]:
        """Categorize sections into strong, weak, and missing."""

        all_sections = set(section_type.value for section_type in SectionType)
        present_sections = set(
            section.section_type.value for section in resume_content.sections.values()
        )

        # Missing sections
        missing_sections = list(all_sections - present_sections)

        # Sections with improvement suggestions are considered weak
        sections_with_suggestions = set(
            s.section for s in suggestions if s.section in present_sections
        )
        weak_sections = list(sections_with_suggestions)

        # Strong sections are present and don't have major improvement suggestions
        strong_sections = [
            section for section in present_sections if section not in sections_with_suggestions
        ]

        return strong_sections, weak_sections, missing_sections

    def _detect_industry(self, resume_content: ResumeContent) -> str | None:
        """Attempt to detect industry from resume content."""

        # Combine all resume text
        all_text = " ".join(
            [" ".join(section.content) for section in resume_content.sections.values()]
        ).lower()

        # Simple keyword-based detection
        industry_keywords = {
            "software_engineering": [
                "software",
                "programming",
                "developer",
                "engineer",
                "python",
                "java",
                "javascript",
                "react",
                "api",
                "database",
                "git",
                "agile",
            ],
            "data_science": [
                "data",
                "analytics",
                "machine learning",
                "python",
                "sql",
                "statistics",
                "modeling",
                "visualization",
                "pandas",
                "numpy",
                "tensorflow",
            ],
            "marketing": [
                "marketing",
                "campaign",
                "brand",
                "social media",
                "seo",
                "content",
                "advertising",
                "digital marketing",
                "conversion",
                "engagement",
            ],
        }

        industry_scores = {}
        for industry, keywords in industry_keywords.items():
            score = sum(1 for keyword in keywords if keyword in all_text)
            if score > 0:
                industry_scores[industry] = score

        if industry_scores:
            return max(industry_scores, key=industry_scores.get)

        return None

    def _recommend_template(
        self, resume_content: ResumeContent, industry: str | None
    ) -> ResumeTemplate:
        """Recommend appropriate template based on content and industry."""

        # Check for seniority indicators
        all_text = " ".join(
            [" ".join(section.content) for section in resume_content.sections.values()]
        ).lower()

        seniority_keywords = [
            "senior",
            "lead",
            "director",
            "manager",
            "executive",
            "vp",
            "ceo",
            "cto",
        ]
        is_senior = any(keyword in all_text for keyword in seniority_keywords)

        if is_senior:
            return ResumeTemplate.EXECUTIVE

        # Industry-specific recommendations
        if industry == "software_engineering" or industry == "data_science":
            return ResumeTemplate.TECHNICAL
        elif industry == "creative" or "design" in all_text:
            return ResumeTemplate.CREATIVE

        # Check for entry-level indicators
        entry_level_keywords = ["graduate", "intern", "entry", "junior", "new grad"]
        is_entry_level = any(keyword in all_text for keyword in entry_level_keywords)

        if is_entry_level:
            return ResumeTemplate.ENTRY_LEVEL

        # Default to ATS optimized
        return ResumeTemplate.ATS_OPTIMIZED


# Legacy compatibility function
def enhance_resume(resume_text: str, target_industry: str = None) -> ResumeAnalysis:
    """
    Legacy compatibility function for existing code.

    This provides backward compatibility with the old ResumeEnhancer interface.
    """
    logger.warning(
        "enhance_resume() is deprecated. "
        "Use ResumeEnhancementService.analyze_resume_text() for new code."
    )

    service = ResumeEnhancementService()
    return service.analyze_resume_text(resume_text, target_industry)


# Register with dependency injection container if available
if HAS_DI:
    try:
        container = ServiceContainer()
        container.register_singleton(ResumeEnhancementService)
        logger.info("ResumeEnhancementService registered with dependency injection container")
    except Exception as e:
        logger.warning(f"Failed to register with DI container: {e}")
