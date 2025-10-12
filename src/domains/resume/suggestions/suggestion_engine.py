"""
Resume Suggestion Engine

Generates intelligent suggestions for resume improvement based on industry
best practices and ATS optimization guidelines.

References:
- SWEBOK v4.0a | https://computer.org/swebok | High | Requirements engineering
- OWASP ASVS 5.0 | https://owasp.org/ASVS | High | Input validation standards
"""

import logging

from ..models import (
    IndustryProfile,
    ResumeContent,
    ResumeSection,
    ResumeSuggestion,
    SectionType,
    SuggestionType,
)
from .industry_profiles_extended import EXTENDED_INDUSTRY_PROFILES

logger = logging.getLogger(__name__)


class SuggestionEngine:
    """
    Generates intelligent resume improvement suggestions.
    
    Follows SWEBOK v4.0 requirements engineering principles and provides
    actionable, prioritized suggestions based on industry best practices.
    """

    # Core industry profiles with specific requirements
    INDUSTRY_PROFILES = {
        "software_engineering": IndustryProfile(
            name="Software Engineering",
            required_sections=[
                SectionType.CONTACT,
                SectionType.SUMMARY,
                SectionType.SKILLS,
                SectionType.EXPERIENCE,
                SectionType.EDUCATION,
                SectionType.PROJECTS,
            ],
            optional_sections=[
                SectionType.CERTIFICATIONS,
                SectionType.PUBLICATIONS,
                SectionType.AWARDS,
            ],
            key_skills=[
                "programming languages",
                "frameworks",
                "cloud platforms",
                "databases",
                "version control",
                "testing",
                "ci/cd",
                "system design",
            ],
            experience_format="technical_detailed",
            recommended_length=(1, 2),
            emphasis=["technical skills", "project impact", "problem solving"],
            common_keywords=[
                "python",
                "java",
                "javascript",
                "react",
                "node.js",
                "aws",
                "docker",
                "kubernetes",
                "git",
                "agile",
                "microservices",
                "api",
                "database",
            ],
            ats_considerations=[
                "Use standard technical terms",
                "Include specific technologies and frameworks",
                "Quantify achievements with metrics",
            ],
        ),
        "data_science": IndustryProfile(
            name="Data Science",
            required_sections=[
                SectionType.CONTACT,
                SectionType.SUMMARY,
                SectionType.SKILLS,
                SectionType.EXPERIENCE,
                SectionType.EDUCATION,
                SectionType.PROJECTS,
            ],
            optional_sections=[SectionType.PUBLICATIONS, SectionType.CERTIFICATIONS],
            key_skills=[
                "python",
                "r",
                "sql",
                "machine learning",
                "statistics",
                "data visualization",
                "pandas",
                "numpy",
                "scikit-learn",
                "tensorflow",
                "pytorch",
            ],
            experience_format="quantified_results",
            recommended_length=(1, 2),
            emphasis=["analytical skills", "business impact", "technical expertise"],
            common_keywords=[
                "machine learning",
                "deep learning",
                "statistics",
                "python",
                "sql",
                "tableau",
                "power bi",
                "predictive modeling",
                "data mining",
                "big data",
            ],
        ),
        "marketing": IndustryProfile(
            name="Marketing",
            required_sections=[
                SectionType.CONTACT,
                SectionType.SUMMARY,
                SectionType.EXPERIENCE,
                SectionType.EDUCATION,
                SectionType.SKILLS,
            ],
            optional_sections=[
                SectionType.CERTIFICATIONS,
                SectionType.AWARDS,
                SectionType.PROJECTS,
            ],
            key_skills=[
                "digital marketing",
                "content marketing",
                "seo",
                "sem",
                "social media",
                "analytics",
                "campaign management",
                "brand management",
            ],
            experience_format="results_focused",
            recommended_length=(1, 2),
            emphasis=["campaign results", "roi improvement", "brand growth"],
            common_keywords=[
                "marketing",
                "campaign",
                "roi",
                "conversion",
                "engagement",
                "brand",
                "social media",
                "content",
                "analytics",
                "digital",
                "seo",
                "sem",
            ],
        ),
    }
    
    def __init__(self):
        """Initialize suggestion engine with extended industry profiles."""
        # Merge core and extended profiles
        self._all_profiles = {**self.INDUSTRY_PROFILES, **EXTENDED_INDUSTRY_PROFILES}
        logger.info(f"SuggestionEngine initialized with {len(self._all_profiles)} industry profiles")

    def generate_suggestions(
        self,
        resume_content: ResumeContent,
        target_industry: str | None = None,
        job_description: str | None = None,
    ) -> list[ResumeSuggestion]:
        """
        Generate comprehensive improvement suggestions.
        
        Args:
            resume_content: Parsed resume content
            target_industry: Target industry key (e.g., 'software_engineering')
            job_description: Optional job description for tailored suggestions
            
        Returns:
            Prioritized list of ResumeSuggestion objects
            
        Security:
            Input validation per OWASP ASVS 5.0 V5.1.1
        """

        suggestions = []

        # Get industry profile with validation
        industry_profile = None
        if target_industry:
            # Sanitize industry key
            sanitized_industry = "".join(
                c for c in target_industry.lower() if c.isalnum() or c == "_"
            )
            if sanitized_industry in self._all_profiles:
                industry_profile = self._all_profiles[sanitized_industry]

        # Section-based suggestions
        suggestions.extend(self._suggest_missing_sections(resume_content, industry_profile))
        suggestions.extend(self._suggest_section_improvements(resume_content, industry_profile))

        # Content-based suggestions
        suggestions.extend(self._suggest_content_improvements(resume_content))

        # Industry-specific suggestions
        if industry_profile:
            suggestions.extend(
                self._suggest_industry_optimizations(resume_content, industry_profile)
            )

        # Job description matching
        if job_description:
            suggestions.extend(
                self._suggest_job_matching_improvements(resume_content, job_description)
            )

        # Sort by priority and impact
        suggestions.sort(key=lambda s: (s.priority, -s.impact_score))

        logger.info(f"Generated {len(suggestions)} improvement suggestions")
        return suggestions
    
    def get_available_industries(self) -> list[str]:
        """
        Get list of all available industry profiles.
        
        Returns:
            Sorted list of industry identifiers
        """
        return sorted(self._all_profiles.keys())
    
    def get_industry_profile(self, industry_key: str) -> IndustryProfile | None:
        """
        Get a specific industry profile.
        
        Args:
            industry_key: Industry identifier
            
        Returns:
            IndustryProfile if found, None otherwise
        """
        sanitized_key = "".join(c for c in industry_key.lower() if c.isalnum() or c == "_")
        return self._all_profiles.get(sanitized_key)

    def _suggest_missing_sections(
        self, resume_content: ResumeContent, industry_profile: IndustryProfile | None
    ) -> list[ResumeSuggestion]:
        """Suggest missing critical sections."""
        suggestions = []

        # Standard required sections
        standard_required = [
            SectionType.CONTACT,
            SectionType.SUMMARY,
            SectionType.EXPERIENCE,
            SectionType.EDUCATION,
        ]

        required_sections = standard_required
        if industry_profile:
            required_sections = industry_profile.required_sections

        for section_type in required_sections:
            if not resume_content.has_section(section_type):
                suggestions.append(
                    ResumeSuggestion(
                        section=section_type.value,
                        suggestion_type=SuggestionType.ADD,
                        content=f"Add {section_type.value.title()} section",
                        reason=f"{section_type.value.title()} section is required for professional resumes",
                        priority=1,
                        impact_score=15.0,
                        effort_level=2,
                    )
                )

        return suggestions

    def _suggest_section_improvements(
        self, resume_content: ResumeContent, industry_profile: IndustryProfile | None
    ) -> list[ResumeSuggestion]:
        """Suggest improvements to existing sections."""
        suggestions = []

        for section_type, section in resume_content.sections.items():
            # Check section length
            if len(section.content) < 2:
                suggestions.append(
                    ResumeSuggestion(
                        section=section_type.value,
                        suggestion_type=SuggestionType.IMPROVE,
                        content=f"Expand {section_type.value} section with more detailed content",
                        reason="Section appears too brief and may lack sufficient detail",
                        priority=2,
                        impact_score=8.0,
                        effort_level=3,
                    )
                )

            # Section-specific suggestions
            if section_type == SectionType.SUMMARY:
                suggestions.extend(self._suggest_summary_improvements(section))
            elif section_type == SectionType.EXPERIENCE:
                suggestions.extend(self._suggest_experience_improvements(section))
            elif section_type == SectionType.SKILLS:
                suggestions.extend(self._suggest_skills_improvements(section, industry_profile))

        return suggestions

    def _suggest_content_improvements(
        self, resume_content: ResumeContent
    ) -> list[ResumeSuggestion]:
        """Suggest general content improvements."""
        suggestions = []

        total_words = resume_content.get_total_word_count()

        # Length suggestions
        if total_words < 200:
            suggestions.append(
                ResumeSuggestion(
                    section="overall",
                    suggestion_type=SuggestionType.IMPROVE,
                    content="Expand resume content - aim for 300-500 words total",
                    reason="Resume appears too brief and may not provide sufficient information",
                    priority=2,
                    impact_score=12.0,
                    effort_level=4,
                )
            )
        elif total_words > 800:
            suggestions.append(
                ResumeSuggestion(
                    section="overall",
                    suggestion_type=SuggestionType.IMPROVE,
                    content="Condense resume content - aim for 400-600 words total",
                    reason="Resume may be too lengthy for initial screening",
                    priority=3,
                    impact_score=6.0,
                    effort_level=3,
                )
            )

        return suggestions

    def _suggest_summary_improvements(
        self, summary_section: ResumeSection
    ) -> list[ResumeSuggestion]:
        """Suggest improvements to professional summary."""
        suggestions = []

        summary_text = " ".join(summary_section.content).lower()

        # Check for key elements
        if "years" not in summary_text and "experience" not in summary_text:
            suggestions.append(
                ResumeSuggestion(
                    section="summary",
                    suggestion_type=SuggestionType.IMPROVE,
                    content="Include years of experience in professional summary",
                    reason="Quantifying experience helps with initial screening",
                    priority=2,
                    impact_score=7.0,
                    effort_level=1,
                )
            )

        if len(summary_text.split()) < 15:
            suggestions.append(
                ResumeSuggestion(
                    section="summary",
                    suggestion_type=SuggestionType.IMPROVE,
                    content="Expand professional summary to 20-50 words",
                    reason="Summary should provide meaningful context about your background",
                    priority=3,
                    impact_score=5.0,
                    effort_level=2,
                )
            )

        return suggestions

    def _suggest_experience_improvements(
        self, experience_section: ResumeSection
    ) -> list[ResumeSuggestion]:
        """Suggest improvements to work experience."""
        suggestions = []

        experience_text = " ".join(experience_section.content).lower()

        # Check for quantified achievements
        has_numbers = any(char.isdigit() for char in experience_text)
        if not has_numbers:
            suggestions.append(
                ResumeSuggestion(
                    section="experience",
                    suggestion_type=SuggestionType.IMPROVE,
                    content="Add quantified achievements (numbers, percentages, metrics)",
                    reason="Quantified results demonstrate impact and are preferred by recruiters",
                    priority=1,
                    impact_score=12.0,
                    effort_level=3,
                )
            )

        # Check for action verbs
        weak_verbs = ["responsible for", "duties included", "worked on"]
        if any(phrase in experience_text for phrase in weak_verbs):
            suggestions.append(
                ResumeSuggestion(
                    section="experience",
                    suggestion_type=SuggestionType.IMPROVE,
                    content="Replace passive phrases with strong action verbs",
                    reason="Action verbs create more impactful descriptions",
                    priority=2,
                    impact_score=8.0,
                    effort_level=2,
                )
            )

        return suggestions

    def _suggest_skills_improvements(
        self, skills_section: ResumeSection, industry_profile: IndustryProfile | None
    ) -> list[ResumeSuggestion]:
        """Suggest improvements to skills section."""
        suggestions = []

        skills_text = " ".join(skills_section.content).lower()

        if industry_profile:
            # Check for industry-specific skills
            missing_skills = []
            for skill in industry_profile.key_skills:
                if skill.lower() not in skills_text:
                    missing_skills.append(skill)

            if missing_skills:
                suggestions.append(
                    ResumeSuggestion(
                        section="skills",
                        suggestion_type=SuggestionType.IMPROVE,
                        content=f"Consider adding relevant skills: {', '.join(missing_skills[:5])}",
                        reason=f"These skills are commonly required in {industry_profile.name}",
                        priority=2,
                        impact_score=10.0,
                        effort_level=1,
                    )
                )

        return suggestions

    def _suggest_industry_optimizations(
        self, resume_content: ResumeContent, industry_profile: IndustryProfile
    ) -> list[ResumeSuggestion]:
        """Suggest industry-specific optimizations."""
        suggestions = []

        # Suggest optional sections that are valuable for the industry
        for section_type in industry_profile.optional_sections:
            if not resume_content.has_section(section_type):
                suggestions.append(
                    ResumeSuggestion(
                        section=section_type.value,
                        suggestion_type=SuggestionType.ADD,
                        content=f"Consider adding {section_type.value.title()} section",
                        reason=f"This section is valuable for {industry_profile.name} roles",
                        priority=3,
                        impact_score=6.0,
                        effort_level=3,
                    )
                )

        return suggestions

    def _suggest_job_matching_improvements(
        self, resume_content: ResumeContent, job_description: str
    ) -> list[ResumeSuggestion]:
        """Suggest improvements based on specific job description."""
        suggestions = []

        # This is a simplified implementation
        # In a full implementation, this would use NLP to extract
        # key requirements from the job description

        job_desc_lower = job_description.lower()
        resume_text = " ".join(
            [" ".join(section.content) for section in resume_content.sections.values()]
        ).lower()

        # Simple keyword matching
        important_keywords = [
            "python",
            "java",
            "javascript",
            "react",
            "aws",
            "docker",
            "agile",
            "leadership",
            "management",
            "analysis",
            "design",
        ]

        missing_keywords = []
        for keyword in important_keywords:
            if keyword in job_desc_lower and keyword not in resume_text:
                missing_keywords.append(keyword)

        if missing_keywords:
            suggestions.append(
                ResumeSuggestion(
                    section="overall",
                    suggestion_type=SuggestionType.IMPROVE,
                    content=f"Consider incorporating these job-relevant keywords: {', '.join(missing_keywords[:3])}",
                    reason="These keywords appear in the job description but not in your resume",
                    priority=1,
                    impact_score=15.0,
                    effort_level=2,
                )
            )

        return suggestions
