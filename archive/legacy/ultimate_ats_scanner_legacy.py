#!/usr/bin/env python3
"""
DEPRECATED MODULE - LEGACY COMPATIBILITY ONLY

This module has been completely refactored into a modern, maintainable architecture.

NEW LOCATION: src/domains/ats/
MIGRATION GUIDE: See REORGANIZATION_PROGRESS.md

The monolithic 1,162-line module has been split into:
├── src/domains/ats/models.py              # Domain models & enums  
├── src/domains/ats/service.py             # Main orchestration service
├── src/domains/ats/parsers/               # Document parsing (PDF, DOCX, TXT)
├── src/domains/ats/analyzers/             # ATS compatibility analysis
├── src/domains/ats/scoring/               # Score calculation algorithms
└── src/domains/ats/reports/               # Report generation (HTML/Text)

USAGE MIGRATION:

Old usage:
    from utils.ultimate_ats_scanner import UltimateATSScanner
    scanner = UltimateATSScanner()
    result = scanner.analyze_resume("resume.pdf")

New usage (RECOMMENDED):
    from src.domains.ats import ATSAnalysisService
    service = ATSAnalysisService()
    score = service.analyze_resume("resume.pdf")

Legacy compatibility (TEMPORARY):
    from src.domains.ats import analyze_resume
    score = analyze_resume("resume.pdf")  # Drop-in replacement

CLI Migration:
    Old: python -m utils.ultimate_ats_scanner resume.pdf
    New: python -m src.domains.ats.cli resume.pdf --format html

This file will be removed in a future release.
"""

import warnings

# Issue deprecation warning
warnings.warn(
    "utils.ultimate_ats_scanner is deprecated and has been refactored. "
    "Use src.domains.ats.ATSAnalysisService for new code. "
    "See REORGANIZATION_PROGRESS.md for migration guide.",
    DeprecationWarning,
    stacklevel=2
)

# Import compatibility wrappers
from src.domains.ats.legacy_compatibility import UltimateATSScanner, analyze_resume

# Re-export for legacy compatibility
__all__ = ["UltimateATSScanner", "analyze_resume"]

# Legacy CLI support
if __name__ == "__main__":
    import sys
    print("DEPRECATED: Use 'python -m src.domains.ats.cli' instead")
    print("Falling back to legacy wrapper...")
    
    try:
        from src.domains.ats.cli import main
        sys.exit(main())
    except Exception as e:
        print(f"Legacy CLI failed: {e}")
        sys.exit(1)