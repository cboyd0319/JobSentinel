#!/usr/bin/env python3
"""
DEPRECATED MODULE - CONSOLIDATED INTO NEW ARCHITECTURE

This modular analyzer has been integrated into the new domain architecture
at src/domains/ats/ which provides enhanced functionality with:

- Better separation of concerns
- Comprehensive compatibility analysis  
- Industry-specific optimizations
- Modern scoring algorithms
- Enhanced reporting capabilities

MIGRATION GUIDE:

OLD USAGE:
    from utils.ats_analyzer import analyze_resume
    result = analyze_resume("resume.pdf", ["python", "java"])

NEW USAGE (RECOMMENDED):
    from src.domains.ats import ATSAnalysisService
    service = ATSAnalysisService()
    score = service.analyze_resume("resume.pdf", job_keywords=["python", "java"])

LEGACY COMPATIBILITY (TEMPORARY):
    from src.domains.ats import analyze_resume
    score = analyze_resume("resume.pdf", ["python", "java"])

The new architecture provides:
✅ Enhanced ATS system compatibility scoring
✅ Better keyword analysis with context
✅ Improved formatting issue detection  
✅ Industry-specific recommendations
✅ HTML and text report generation
✅ Comprehensive CLI interface

This file will be removed in a future release.
"""

import warnings

# Issue deprecation warning
warnings.warn(
    "utils.ats_analyzer is deprecated and has been enhanced in src.domains.ats. "
    "Use ATSAnalysisService for new code with improved functionality. "
    "See REORGANIZATION_PROGRESS.md for migration guide.",
    DeprecationWarning,
    stacklevel=2
)

# Import the enhanced service for compatibility
from src.domains.ats import analyze_resume

# Re-export for legacy compatibility
__all__ = ["analyze_resume"]