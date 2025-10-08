"""
Resume Domain

This domain handles all resume-related functionality including:
- Resume content parsing and analysis
- Enhancement suggestions and optimization
- Template recommendations and formatting
- Industry-specific customizations
"""

from .analyzers.content_analyzer import ContentAnalyzer
from .models import (
    IndustryProfile,
    ResumeAnalysis,
    ResumeContent,
    ResumeSection,
    ResumeSuggestion,
    ResumeTemplate,
    SectionType,
    SuggestionType,
)
from .parsers.content_parser import ResumeContentParser
from .service import ResumeEnhancementService, enhance_resume
from .suggestions.suggestion_engine import SuggestionEngine

__all__ = [
    # Models
    "ResumeTemplate",
    "SuggestionType",
    "SectionType",
    "ResumeSection",
    "ResumeSuggestion",
    "IndustryProfile",
    "ResumeAnalysis",
    "ResumeContent",
    # Services
    "ResumeEnhancementService",
    "ResumeContentParser",
    "SuggestionEngine",
    "ContentAnalyzer",
    # Legacy compatibility
    "enhance_resume",
]
