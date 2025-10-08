"""
Resume Domain Models

Core data models for resume processing and enhancement.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional


class ResumeTemplate(Enum):
    """Available resume templates optimized for different purposes."""

    ATS_OPTIMIZED = "ats_optimized"  # Maximum ATS compatibility
    EXECUTIVE = "executive"  # Senior leadership roles
    CREATIVE = "creative"  # Design/creative roles
    TECHNICAL = "technical"  # Software/engineering
    ENTRY_LEVEL = "entry_level"  # New graduates
    CAREER_CHANGE = "career_change"  # Career transition


class SuggestionType(Enum):
    """Types of resume suggestions."""

    ADD = "add"
    IMPROVE = "improve"
    REMOVE = "remove"
    RESTRUCTURE = "restructure"


class SectionType(Enum):
    """Standard resume section types."""

    CONTACT = "contact"
    SUMMARY = "summary"
    EXPERIENCE = "experience"
    EDUCATION = "education"
    SKILLS = "skills"
    PROJECTS = "projects"
    CERTIFICATIONS = "certifications"
    AWARDS = "awards"
    PUBLICATIONS = "publications"
    VOLUNTEER = "volunteer"
    REFERENCES = "references"


@dataclass
class ResumeSection:
    """Represents a resume section with content and formatting."""

    title: str
    content: List[str]
    section_type: SectionType
    order: int
    required: bool = True
    industry_specific: bool = False
    estimated_lines: int = 0


@dataclass
class ResumeSuggestion:
    """Content suggestion for resume improvement."""

    section: str
    suggestion_type: SuggestionType
    content: str
    reason: str
    priority: int  # 1=highest, 5=lowest
    impact_score: float = 0.0  # Expected score improvement
    effort_level: int = 1  # 1=low effort, 5=high effort


@dataclass
class IndustryProfile:
    """Industry-specific resume requirements and best practices."""

    name: str
    required_sections: List[SectionType]
    optional_sections: List[SectionType]
    key_skills: List[str]
    experience_format: str
    recommended_length: tuple[int, int]  # min, max pages
    emphasis: List[str]
    common_keywords: List[str] = field(default_factory=list)
    ats_considerations: List[str] = field(default_factory=list)


@dataclass
class ResumeAnalysis:
    """Comprehensive resume analysis and improvement suggestions."""

    current_score: float
    potential_score: float
    suggestions: List[ResumeSuggestion]
    missing_sections: List[str]
    weak_sections: List[str]
    strong_sections: List[str]
    industry_match: Optional[str]
    recommended_template: ResumeTemplate

    # Analysis metadata
    word_count: int = 0
    estimated_pages: float = 0.0
    keyword_density: Dict[str, float] = field(default_factory=dict)
    readability_score: float = 0.0

    def get_high_priority_suggestions(self) -> List[ResumeSuggestion]:
        """Get suggestions with priority 1-2."""
        return [s for s in self.suggestions if s.priority <= 2]

    def get_quick_wins(self) -> List[ResumeSuggestion]:
        """Get high-impact, low-effort suggestions."""
        return [s for s in self.suggestions if s.impact_score > 5 and s.effort_level <= 2]


@dataclass
class ResumeContent:
    """Structured representation of resume content."""

    sections: Dict[SectionType, ResumeSection] = field(default_factory=dict)
    metadata: Dict[str, str] = field(default_factory=dict)
    format_info: Dict[str, str] = field(default_factory=dict)

    def get_section(self, section_type: SectionType) -> Optional[ResumeSection]:
        """Get a specific section by type."""
        return self.sections.get(section_type)

    def has_section(self, section_type: SectionType) -> bool:
        """Check if resume has a specific section."""
        return section_type in self.sections

    def get_total_word_count(self) -> int:
        """Calculate total word count across all sections."""
        total = 0
        for section in self.sections.values():
            for content_line in section.content:
                total += len(content_line.split())
        return total
