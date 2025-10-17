"""Comprehensive tests for domains/resume/models.py.

Tests cover:
- ResumeTemplate enum: all templates and values
- SuggestionType enum: all suggestion types
- SectionType enum: all section types
- ResumeSection dataclass: initialization and fields
- ResumeSuggestion dataclass: all fields and defaults
- IndustryProfile dataclass: industry requirements
- ResumeAnalysis dataclass: analysis data and helper methods
- ResumeContent dataclass: section management and word counting
- Edge cases: empty data, boundary values, complex scenarios
"""

from __future__ import annotations

import pytest

from domains.resume.models import (
    IndustryProfile,
    ResumeAnalysis,
    ResumeContent,
    ResumeSection,
    ResumeSuggestion,
    ResumeTemplate,
    SectionType,
    SuggestionType,
)


# ============================================================================
# ResumeTemplate Enum Tests
# ============================================================================


def test_resume_template_enum_has_all_templates():
    """ResumeTemplate enum defines all expected templates."""
    assert ResumeTemplate.ATS_OPTIMIZED.value == "ats_optimized"
    assert ResumeTemplate.EXECUTIVE.value == "executive"
    assert ResumeTemplate.CREATIVE.value == "creative"
    assert ResumeTemplate.TECHNICAL.value == "technical"
    assert ResumeTemplate.ENTRY_LEVEL.value == "entry_level"
    assert ResumeTemplate.CAREER_CHANGE.value == "career_change"


def test_resume_template_enum_count():
    """ResumeTemplate has exactly 6 templates."""
    assert len(ResumeTemplate) == 6


@pytest.mark.parametrize(
    "template",
    [
        ResumeTemplate.ATS_OPTIMIZED,
        ResumeTemplate.EXECUTIVE,
        ResumeTemplate.CREATIVE,
        ResumeTemplate.TECHNICAL,
        ResumeTemplate.ENTRY_LEVEL,
        ResumeTemplate.CAREER_CHANGE,
    ],
    ids=["ats", "executive", "creative", "technical", "entry_level", "career_change"],
)
def test_resume_template_values_are_strings(template: ResumeTemplate):
    """ResumeTemplate values are strings."""
    assert isinstance(template.value, str)


# ============================================================================
# SuggestionType Enum Tests
# ============================================================================


def test_suggestion_type_enum_has_all_types():
    """SuggestionType enum defines all expected types."""
    assert SuggestionType.ADD.value == "add"
    assert SuggestionType.IMPROVE.value == "improve"
    assert SuggestionType.REMOVE.value == "remove"
    assert SuggestionType.RESTRUCTURE.value == "restructure"


def test_suggestion_type_enum_count():
    """SuggestionType has exactly 4 types."""
    assert len(SuggestionType) == 4


# ============================================================================
# SectionType Enum Tests
# ============================================================================


def test_section_type_enum_has_standard_sections():
    """SectionType enum defines all standard resume sections."""
    assert SectionType.CONTACT.value == "contact"
    assert SectionType.SUMMARY.value == "summary"
    assert SectionType.EXPERIENCE.value == "experience"
    assert SectionType.EDUCATION.value == "education"
    assert SectionType.SKILLS.value == "skills"
    assert SectionType.PROJECTS.value == "projects"
    assert SectionType.CERTIFICATIONS.value == "certifications"
    assert SectionType.AWARDS.value == "awards"
    assert SectionType.PUBLICATIONS.value == "publications"
    assert SectionType.VOLUNTEER.value == "volunteer"
    assert SectionType.REFERENCES.value == "references"


def test_section_type_enum_count():
    """SectionType has all expected sections."""
    assert len(SectionType) >= 11


# ============================================================================
# ResumeSection Tests
# ============================================================================


def test_resume_section_initializes_with_required_fields():
    """ResumeSection initializes with all required fields."""
    section = ResumeSection(
        title="Experience",
        content=["Job 1", "Job 2"],
        section_type=SectionType.EXPERIENCE,
        order=1,
    )
    
    assert section.title == "Experience"
    assert section.content == ["Job 1", "Job 2"]
    assert section.section_type == SectionType.EXPERIENCE
    assert section.order == 1
    assert section.required is True  # Default
    assert section.industry_specific is False  # Default
    assert section.estimated_lines == 0  # Default


def test_resume_section_stores_all_fields():
    """ResumeSection stores all provided fields."""
    content_lines = ["Line 1", "Line 2", "Line 3"]
    section = ResumeSection(
        title="Technical Skills",
        content=content_lines,
        section_type=SectionType.SKILLS,
        order=3,
        required=False,
        industry_specific=True,
        estimated_lines=5,
    )
    
    assert section.title == "Technical Skills"
    assert section.content == content_lines
    assert section.section_type == SectionType.SKILLS
    assert section.order == 3
    assert section.required is False
    assert section.industry_specific is True
    assert section.estimated_lines == 5


def test_resume_section_with_empty_content():
    """ResumeSection handles empty content list."""
    section = ResumeSection(
        title="Publications",
        content=[],
        section_type=SectionType.PUBLICATIONS,
        order=8,
    )
    
    assert section.content == []
    assert len(section.content) == 0


def test_resume_section_with_single_item():
    """ResumeSection handles single content item."""
    section = ResumeSection(
        title="Summary",
        content=["Experienced software engineer"],
        section_type=SectionType.SUMMARY,
        order=1,
    )
    
    assert len(section.content) == 1
    assert section.content[0] == "Experienced software engineer"


@pytest.mark.parametrize(
    "order",
    [1, 5, 10, 100],
    ids=["first", "middle", "tenth", "large"],
)
def test_resume_section_various_order_values(order: int):
    """ResumeSection accepts various order values."""
    section = ResumeSection(
        title="Test",
        content=["test"],
        section_type=SectionType.EDUCATION,
        order=order,
    )
    
    assert section.order == order


# ============================================================================
# ResumeSuggestion Tests
# ============================================================================


def test_resume_suggestion_initializes_with_required_fields():
    """ResumeSuggestion initializes with required fields."""
    suggestion = ResumeSuggestion(
        section="Experience",
        suggestion_type=SuggestionType.ADD,
        content="Add quantifiable achievements",
        reason="Increases impact",
        priority=1,
    )
    
    assert suggestion.section == "Experience"
    assert suggestion.suggestion_type == SuggestionType.ADD
    assert suggestion.content == "Add quantifiable achievements"
    assert suggestion.reason == "Increases impact"
    assert suggestion.priority == 1
    assert suggestion.impact_score == 0.0  # Default
    assert suggestion.effort_level == 1  # Default


def test_resume_suggestion_stores_all_fields():
    """ResumeSuggestion stores all provided fields."""
    suggestion = ResumeSuggestion(
        section="Skills",
        suggestion_type=SuggestionType.IMPROVE,
        content="Reorganize skills by category",
        reason="Better readability for ATS",
        priority=2,
        impact_score=7.5,
        effort_level=3,
    )
    
    assert suggestion.section == "Skills"
    assert suggestion.suggestion_type == SuggestionType.IMPROVE
    assert suggestion.content == "Reorganize skills by category"
    assert suggestion.reason == "Better readability for ATS"
    assert suggestion.priority == 2
    assert suggestion.impact_score == 7.5
    assert suggestion.effort_level == 3


@pytest.mark.parametrize(
    "sug_type",
    [SuggestionType.ADD, SuggestionType.IMPROVE, SuggestionType.REMOVE, SuggestionType.RESTRUCTURE],
    ids=["add", "improve", "remove", "restructure"],
)
def test_resume_suggestion_all_types(sug_type: SuggestionType):
    """ResumeSuggestion works with all suggestion types."""
    suggestion = ResumeSuggestion(
        section="Test",
        suggestion_type=sug_type,
        content="Test content",
        reason="Test reason",
        priority=3,
    )
    
    assert suggestion.suggestion_type == sug_type


@pytest.mark.parametrize(
    "priority,expected",
    [(1, 1), (2, 2), (3, 3), (4, 4), (5, 5)],
    ids=["highest", "high", "medium", "low", "lowest"],
)
def test_resume_suggestion_priority_levels(priority: int, expected: int):
    """ResumeSuggestion handles all priority levels."""
    suggestion = ResumeSuggestion(
        section="Test",
        suggestion_type=SuggestionType.ADD,
        content="Test",
        reason="Test",
        priority=priority,
    )
    
    assert suggestion.priority == expected


# ============================================================================
# IndustryProfile Tests
# ============================================================================


def test_industry_profile_initializes_with_required_fields():
    """IndustryProfile initializes with required fields."""
    profile = IndustryProfile(
        name="Software Engineering",
        required_sections=[SectionType.EXPERIENCE, SectionType.SKILLS],
        optional_sections=[SectionType.PROJECTS, SectionType.CERTIFICATIONS],
        key_skills=["Python", "AWS", "Docker"],
        experience_format="reverse_chronological",
        recommended_length=(1, 2),
        emphasis=["technical skills", "impact"],
    )
    
    assert profile.name == "Software Engineering"
    assert len(profile.required_sections) == 2
    assert len(profile.optional_sections) == 2
    assert profile.key_skills == ["Python", "AWS", "Docker"]
    assert profile.experience_format == "reverse_chronological"
    assert profile.recommended_length == (1, 2)
    assert profile.emphasis == ["technical skills", "impact"]
    assert profile.common_keywords == []  # Default
    assert profile.ats_considerations == []  # Default


def test_industry_profile_with_all_fields():
    """IndustryProfile stores all provided fields."""
    profile = IndustryProfile(
        name="Healthcare",
        required_sections=[SectionType.EDUCATION, SectionType.CERTIFICATIONS],
        optional_sections=[SectionType.VOLUNTEER],
        key_skills=["Patient Care", "EMR Systems"],
        experience_format="functional",
        recommended_length=(1, 2),
        emphasis=["certifications", "compliance"],
        common_keywords=["HIPAA", "patient safety", "clinical"],
        ats_considerations=["Use full certification names", "Include license numbers"],
    )
    
    assert profile.name == "Healthcare"
    assert len(profile.common_keywords) == 3
    assert len(profile.ats_considerations) == 2
    assert "HIPAA" in profile.common_keywords
    assert "Include license numbers" in profile.ats_considerations


def test_industry_profile_empty_optional_sections():
    """IndustryProfile handles empty optional sections."""
    profile = IndustryProfile(
        name="Test",
        required_sections=[SectionType.EXPERIENCE],
        optional_sections=[],
        key_skills=["skill1"],
        experience_format="standard",
        recommended_length=(1, 1),
        emphasis=["test"],
    )
    
    assert profile.optional_sections == []


def test_industry_profile_recommended_length_tuple():
    """IndustryProfile recommended_length is a tuple of (min, max)."""
    profile = IndustryProfile(
        name="Executive",
        required_sections=[SectionType.SUMMARY],
        optional_sections=[],
        key_skills=["Leadership"],
        experience_format="executive",
        recommended_length=(2, 3),
        emphasis=["leadership"],
    )
    
    assert isinstance(profile.recommended_length, tuple)
    assert len(profile.recommended_length) == 2
    assert profile.recommended_length[0] == 2
    assert profile.recommended_length[1] == 3


# ============================================================================
# ResumeAnalysis Tests
# ============================================================================


def test_resume_analysis_initializes_with_required_fields():
    """ResumeAnalysis initializes with required fields."""
    analysis = ResumeAnalysis(
        current_score=65.0,
        potential_score=85.0,
        suggestions=[],
        missing_sections=["Projects"],
        weak_sections=["Skills"],
        strong_sections=["Experience"],
        industry_match="Technology",
        recommended_template=ResumeTemplate.TECHNICAL,
    )
    
    assert analysis.current_score == 65.0
    assert analysis.potential_score == 85.0
    assert analysis.suggestions == []
    assert analysis.missing_sections == ["Projects"]
    assert analysis.weak_sections == ["Skills"]
    assert analysis.strong_sections == ["Experience"]
    assert analysis.industry_match == "Technology"
    assert analysis.recommended_template == ResumeTemplate.TECHNICAL
    # Check defaults
    assert analysis.word_count == 0
    assert analysis.estimated_pages == 0.0
    assert analysis.keyword_density == {}
    assert analysis.readability_score == 0.0


def test_resume_analysis_with_all_fields():
    """ResumeAnalysis stores all provided fields."""
    suggestions = [
        ResumeSuggestion("Skills", SuggestionType.ADD, "Add Python", "Key skill", 1),
        ResumeSuggestion("Summary", SuggestionType.IMPROVE, "More specific", "Clarity", 2),
    ]
    keywords = {"python": 0.05, "aws": 0.03}
    
    analysis = ResumeAnalysis(
        current_score=70.0,
        potential_score=90.0,
        suggestions=suggestions,
        missing_sections=["Certifications"],
        weak_sections=[],
        strong_sections=["Experience", "Education"],
        industry_match="Software",
        recommended_template=ResumeTemplate.ATS_OPTIMIZED,
        word_count=450,
        estimated_pages=1.5,
        keyword_density=keywords,
        readability_score=72.0,
    )
    
    assert analysis.word_count == 450
    assert analysis.estimated_pages == 1.5
    assert analysis.keyword_density == keywords
    assert analysis.readability_score == 72.0
    assert len(analysis.suggestions) == 2


def test_resume_analysis_industry_match_can_be_none():
    """ResumeAnalysis allows None for industry_match."""
    analysis = ResumeAnalysis(
        current_score=50.0,
        potential_score=70.0,
        suggestions=[],
        missing_sections=[],
        weak_sections=[],
        strong_sections=[],
        industry_match=None,
        recommended_template=ResumeTemplate.ENTRY_LEVEL,
    )
    
    assert analysis.industry_match is None


def test_resume_analysis_get_high_priority_suggestions():
    """ResumeAnalysis.get_high_priority_suggestions() returns priority 1-2."""
    suggestions = [
        ResumeSuggestion("S1", SuggestionType.ADD, "C1", "R1", priority=1),
        ResumeSuggestion("S2", SuggestionType.ADD, "C2", "R2", priority=2),
        ResumeSuggestion("S3", SuggestionType.ADD, "C3", "R3", priority=3),
        ResumeSuggestion("S4", SuggestionType.ADD, "C4", "R4", priority=4),
    ]
    
    analysis = ResumeAnalysis(
        current_score=60.0,
        potential_score=80.0,
        suggestions=suggestions,
        missing_sections=[],
        weak_sections=[],
        strong_sections=[],
        industry_match=None,
        recommended_template=ResumeTemplate.TECHNICAL,
    )
    
    high_priority = analysis.get_high_priority_suggestions()
    
    assert len(high_priority) == 2
    assert all(s.priority <= 2 for s in high_priority)


def test_resume_analysis_get_high_priority_empty_when_none():
    """ResumeAnalysis.get_high_priority_suggestions() returns empty when no high priority."""
    suggestions = [
        ResumeSuggestion("S1", SuggestionType.ADD, "C1", "R1", priority=3),
        ResumeSuggestion("S2", SuggestionType.ADD, "C2", "R2", priority=4),
    ]
    
    analysis = ResumeAnalysis(
        current_score=60.0,
        potential_score=80.0,
        suggestions=suggestions,
        missing_sections=[],
        weak_sections=[],
        strong_sections=[],
        industry_match=None,
        recommended_template=ResumeTemplate.TECHNICAL,
    )
    
    high_priority = analysis.get_high_priority_suggestions()
    
    assert high_priority == []


def test_resume_analysis_get_quick_wins():
    """ResumeAnalysis.get_quick_wins() returns high impact, low effort suggestions."""
    suggestions = [
        ResumeSuggestion("S1", SuggestionType.ADD, "C1", "R1", 1, impact_score=8.0, effort_level=1),
        ResumeSuggestion("S2", SuggestionType.ADD, "C2", "R2", 2, impact_score=6.0, effort_level=2),
        ResumeSuggestion("S3", SuggestionType.ADD, "C3", "R3", 1, impact_score=4.0, effort_level=1),
        ResumeSuggestion("S4", SuggestionType.ADD, "C4", "R4", 3, impact_score=7.0, effort_level=4),
    ]
    
    analysis = ResumeAnalysis(
        current_score=60.0,
        potential_score=80.0,
        suggestions=suggestions,
        missing_sections=[],
        weak_sections=[],
        strong_sections=[],
        industry_match=None,
        recommended_template=ResumeTemplate.TECHNICAL,
    )
    
    quick_wins = analysis.get_quick_wins()
    
    # Should get S1 (impact=8, effort=1) and S2 (impact=6, effort=2)
    assert len(quick_wins) == 2
    assert all(s.impact_score > 5 and s.effort_level <= 2 for s in quick_wins)


def test_resume_analysis_get_quick_wins_empty_when_none():
    """ResumeAnalysis.get_quick_wins() returns empty when no quick wins."""
    suggestions = [
        ResumeSuggestion("S1", SuggestionType.ADD, "C1", "R1", 1, impact_score=3.0, effort_level=1),
        ResumeSuggestion("S2", SuggestionType.ADD, "C2", "R2", 2, impact_score=8.0, effort_level=4),
    ]
    
    analysis = ResumeAnalysis(
        current_score=60.0,
        potential_score=80.0,
        suggestions=suggestions,
        missing_sections=[],
        weak_sections=[],
        strong_sections=[],
        industry_match=None,
        recommended_template=ResumeTemplate.TECHNICAL,
    )
    
    quick_wins = analysis.get_quick_wins()
    
    assert quick_wins == []


# ============================================================================
# ResumeContent Tests
# ============================================================================


def test_resume_content_initializes_with_defaults():
    """ResumeContent initializes with empty defaults."""
    content = ResumeContent()
    
    assert content.sections == {}
    assert content.metadata == {}
    assert content.format_info == {}


def test_resume_content_stores_sections():
    """ResumeContent stores resume sections."""
    sections = {
        SectionType.SUMMARY: ResumeSection(
            "Summary", ["Experienced engineer"], SectionType.SUMMARY, 1
        ),
        SectionType.EXPERIENCE: ResumeSection(
            "Experience", ["Job 1", "Job 2"], SectionType.EXPERIENCE, 2
        ),
    }
    
    content = ResumeContent(sections=sections)
    
    assert len(content.sections) == 2
    assert SectionType.SUMMARY in content.sections
    assert SectionType.EXPERIENCE in content.sections


def test_resume_content_stores_metadata():
    """ResumeContent stores metadata."""
    metadata = {"author": "John Doe", "created": "2025-01-01", "version": "1.0"}
    content = ResumeContent(metadata=metadata)
    
    assert content.metadata == metadata
    assert content.metadata["author"] == "John Doe"


def test_resume_content_stores_format_info():
    """ResumeContent stores format info."""
    format_info = {"font": "Arial", "size": "11pt", "margins": "1in"}
    content = ResumeContent(format_info=format_info)
    
    assert content.format_info == format_info


def test_resume_content_get_section_returns_section():
    """ResumeContent.get_section() returns the requested section."""
    summary_section = ResumeSection("Summary", ["Test"], SectionType.SUMMARY, 1)
    sections = {SectionType.SUMMARY: summary_section}
    content = ResumeContent(sections=sections)
    
    result = content.get_section(SectionType.SUMMARY)
    
    assert result is not None
    assert result == summary_section
    assert result.title == "Summary"


def test_resume_content_get_section_returns_none_when_missing():
    """ResumeContent.get_section() returns None for missing section."""
    content = ResumeContent()
    
    result = content.get_section(SectionType.EXPERIENCE)
    
    assert result is None


def test_resume_content_has_section_true_when_exists():
    """ResumeContent.has_section() returns True when section exists."""
    sections = {
        SectionType.SKILLS: ResumeSection("Skills", ["Python"], SectionType.SKILLS, 3)
    }
    content = ResumeContent(sections=sections)
    
    assert content.has_section(SectionType.SKILLS) is True


def test_resume_content_has_section_false_when_missing():
    """ResumeContent.has_section() returns False when section missing."""
    content = ResumeContent()
    
    assert content.has_section(SectionType.EDUCATION) is False


def test_resume_content_get_total_word_count_empty():
    """ResumeContent.get_total_word_count() returns 0 for empty content."""
    content = ResumeContent()
    
    assert content.get_total_word_count() == 0


def test_resume_content_get_total_word_count_single_section():
    """ResumeContent.get_total_word_count() counts words in single section."""
    sections = {
        SectionType.SUMMARY: ResumeSection(
            "Summary",
            ["Experienced software engineer with five years"],  # 6 words
            SectionType.SUMMARY,
            1,
        )
    }
    content = ResumeContent(sections=sections)
    
    assert content.get_total_word_count() == 6


def test_resume_content_get_total_word_count_multiple_sections():
    """ResumeContent.get_total_word_count() counts words across all sections."""
    sections = {
        SectionType.SUMMARY: ResumeSection(
            "Summary",
            ["Experienced software engineer"],  # 3 words
            SectionType.SUMMARY,
            1,
        ),
        SectionType.EXPERIENCE: ResumeSection(
            "Experience",
            ["Software Engineer at Company", "Developed web applications"],  # 7 words
            SectionType.EXPERIENCE,
            2,
        ),
    }
    content = ResumeContent(sections=sections)
    
    assert content.get_total_word_count() == 10


def test_resume_content_get_total_word_count_empty_lines():
    """ResumeContent.get_total_word_count() handles empty content lines."""
    sections = {
        SectionType.SKILLS: ResumeSection(
            "Skills", ["Python JavaScript", "", "AWS Docker"], SectionType.SKILLS, 3
        )
    }
    content = ResumeContent(sections=sections)
    
    # "Python JavaScript" (2) + "" (0) + "AWS Docker" (2) = 4
    assert content.get_total_word_count() == 4


def test_resume_content_get_total_word_count_multiword_lines():
    """ResumeContent.get_total_word_count() correctly counts multi-word lines."""
    sections = {
        SectionType.EXPERIENCE: ResumeSection(
            "Experience",
            [
                "Senior Software Engineer at Tech Company",  # 6
                "Led a team of five developers",  # 6
                "Implemented microservices architecture",  # 3
            ],
            SectionType.EXPERIENCE,
            2,
        )
    }
    content = ResumeContent(sections=sections)
    
    assert content.get_total_word_count() == 15


# ============================================================================
# Integration Tests
# ============================================================================


def test_complete_resume_workflow():
    """Integration test: complete resume with analysis."""
    # Create sections
    sections = {
        SectionType.SUMMARY: ResumeSection(
            "Professional Summary",
            ["Experienced software engineer with 5 years"],
            SectionType.SUMMARY,
            1,
        ),
        SectionType.EXPERIENCE: ResumeSection(
            "Work Experience",
            ["Software Engineer at TechCo", "Developed scalable applications"],
            SectionType.EXPERIENCE,
            2,
        ),
        SectionType.SKILLS: ResumeSection(
            "Technical Skills", ["Python, AWS, Docker, Kubernetes"], SectionType.SKILLS, 3
        ),
    }
    
    # Create content
    content = ResumeContent(
        sections=sections,
        metadata={"author": "Test User", "date": "2025-01-01"},
        format_info={"template": "modern"},
    )
    
    # Verify content
    assert content.has_section(SectionType.SUMMARY)
    assert content.has_section(SectionType.EXPERIENCE)
    assert content.has_section(SectionType.SKILLS)
    assert content.get_total_word_count() > 0
    
    # Create suggestions
    suggestions = [
        ResumeSuggestion(
            "Experience",
            SuggestionType.ADD,
            "Add quantifiable achievements",
            "Increases impact",
            priority=1,
            impact_score=8.0,
            effort_level=2,
        ),
        ResumeSuggestion(
            "Skills",
            SuggestionType.RESTRUCTURE,
            "Group by category",
            "Better organization",
            priority=2,
            impact_score=6.0,
            effort_level=2,
        ),
    ]
    
    # Create analysis
    analysis = ResumeAnalysis(
        current_score=75.0,
        potential_score=90.0,
        suggestions=suggestions,
        missing_sections=["Projects", "Certifications"],
        weak_sections=["Skills"],
        strong_sections=["Experience"],
        industry_match="Technology",
        recommended_template=ResumeTemplate.TECHNICAL,
        word_count=content.get_total_word_count(),
        estimated_pages=1.0,
        keyword_density={"python": 0.04, "aws": 0.02},
        readability_score=70.0,
    )
    
    # Verify analysis
    assert analysis.current_score < analysis.potential_score
    high_priority = analysis.get_high_priority_suggestions()
    assert len(high_priority) == 2
    quick_wins = analysis.get_quick_wins()
    assert len(quick_wins) == 2  # Both have impact > 5 and effort <= 2


def test_industry_profile_with_resume_recommendations():
    """Integration test: industry profile guiding resume structure."""
    # Create industry profile
    profile = IndustryProfile(
        name="Data Science",
        required_sections=[
            SectionType.SUMMARY,
            SectionType.EXPERIENCE,
            SectionType.EDUCATION,
            SectionType.SKILLS,
        ],
        optional_sections=[SectionType.PROJECTS, SectionType.PUBLICATIONS],
        key_skills=["Python", "R", "SQL", "Machine Learning", "Statistics"],
        experience_format="reverse_chronological",
        recommended_length=(1, 2),
        emphasis=["technical skills", "projects", "quantifiable results"],
        common_keywords=["data analysis", "modeling", "visualization", "big data"],
        ats_considerations=["Include specific tools and libraries", "Quantify impact"],
    )
    
    # Verify profile structure
    assert len(profile.required_sections) == 4
    assert SectionType.PROJECTS in profile.optional_sections
    assert "Python" in profile.key_skills
    assert profile.recommended_length == (1, 2)
    assert len(profile.ats_considerations) > 0
