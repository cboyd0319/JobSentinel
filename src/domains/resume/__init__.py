"""
Resume Domain

This domain handles all resume-related functionality including:
- Resume content parsing and analysis
- Enhancement suggestions and optimization
- Template recommendations and formatting
- Industry-specific customizations
"""

from .models import (
    ResumeTemplate,
    SuggestionType,
    SectionType,
    ResumeSection,
    ResumeSuggestion,
    IndustryProfile,
    ResumeAnalysis,
    ResumeContent,
)

from .service import ResumeEnhancementService, enhance_resume
from .parsers.content_parser import ResumeContentParser
from .suggestions.suggestion_engine import SuggestionEngine
from .analyzers.content_analyzer import ContentAnalyzer

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