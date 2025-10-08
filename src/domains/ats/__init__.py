"""
ATS (Applicant Tracking System) Domain

This domain handles all ATS-related functionality including:
- Resume parsing and analysis
- ATS compatibility scoring
- Format optimization recommendations
- Keyword matching and enhancement
"""

from .analyzers.compatibility_analyzer import CompatibilityAnalyzer
from .models import (
    ATSCompatibilityScore,
    ATSIssue,
    ATSIssueLevel,
    ATSSystem,
    KeywordMatch,
)
from .reports.report_generator import ReportGenerator
from .scoring.compatibility_scorer import CompatibilityScorer
from .service import ATSAnalysisService, analyze_resume

__all__ = [
    # Models
    "ATSIssueLevel",
    "ATSSystem",
    "ATSIssue",
    "KeywordMatch",
    "ATSCompatibilityScore",
    # Services
    "ATSAnalysisService",
    "CompatibilityAnalyzer",
    "CompatibilityScorer",
    "ReportGenerator",
    # Legacy compatibility
    "analyze_resume",
]
