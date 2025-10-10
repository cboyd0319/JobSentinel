#!/usr/bin/env python3
"""
DEPRECATED MODULE - CONSOLIDATED INTO NEW ARCHITECTURE

This module has been consolidated with ultimate_ats_scanner.py into a modern,
clean domain architecture located at src/domains/ats/

MIGRATION NOTICE:
All ATS-related functionality has been unified under src/domains/ats/ with:
- Clean separation of concerns
- Dependency injection
- Comprehensive testing support  
- Modern CLI interface
- Better error handling

OLD USAGE:
    from utils.ats_scanner import ATSScanner
    scanner = ATSScanner()
    result = scanner.scan_resume("resume.pdf")

NEW USAGE (RECOMMENDED):
    from src.domains.ats import ATSAnalysisService
    service = ATSAnalysisService()
    score = service.analyze_resume("resume.pdf")

LEGACY COMPATIBILITY (TEMPORARY):
    from src.domains.ats.legacy_compatibility import ATSScanner
    scanner = ATSScanner()  # Issues deprecation warning
    result = scanner.scan_resume("resume.pdf")

This file will be removed in a future release.
"""

import warnings

# Issue deprecation warning
warnings.warn(
    "utils.ats_scanner is deprecated and has been consolidated into src.domains.ats. "
    "Use ATSAnalysisService for new code. "
    "See REORGANIZATION_PROGRESS.md for migration guide.",
    DeprecationWarning,
    stacklevel=2
)

# Import compatibility wrapper
from src.domains.ats.legacy_compatibility import ATSScanner

# Re-export for legacy compatibility
__all__ = ["ATSScanner"]