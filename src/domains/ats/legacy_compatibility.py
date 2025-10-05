"""
ATS Module Consolidation

Utility to help migrate from legacy ATS modules to the new domain architecture.
"""

import logging
import warnings
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class LegacyATSWrapper:
    """
    Wrapper to provide backward compatibility for legacy ATS scanner modules.
    
    This helps existing code migrate gradually to the new domain architecture.
    """
    
    def __init__(self):
        # Import the new service
        from src.domains.ats import ATSAnalysisService
        self._service = ATSAnalysisService()
        
        # Issue deprecation warning
        warnings.warn(
            "Legacy ATS modules are deprecated. "
            "Use src.domains.ats.ATSAnalysisService for new code. "
            "See REORGANIZATION_PROGRESS.md for migration guide.",
            DeprecationWarning,
            stacklevel=2
        )
    
    def analyze_resume(self, resume_path: str, job_keywords: Optional[list] = None) -> Dict[str, Any]:
        """Legacy compatibility method."""
        try:
            # Use new service
            score = self._service.analyze_resume(resume_path, job_keywords)
            
            # Convert to legacy format for backward compatibility
            return self._convert_to_legacy_format(score)
            
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            raise
    
    def _convert_to_legacy_format(self, score) -> Dict[str, Any]:
        """Convert new format to legacy format for backward compatibility."""
        return {
            "overall_score": score.overall_score,
            "component_scores": score.component_scores,
            "issues": [
                {
                    "level": issue.level.value,
                    "category": issue.category,
                    "description": issue.description,
                    "recommendations": issue.recommendations
                }
                for issue in score.issues
            ],
            "keyword_matches": [
                {
                    "keyword": match.keyword,
                    "matches": match.matches,
                    "relevance": match.relevance_score
                }
                for match in score.keyword_matches
            ],
            "recommendations": score.priority_recommendations,
            "analysis_timestamp": score.analysis_timestamp.isoformat()
        }


# Legacy compatibility functions
def analyze_resume(resume_path: str, job_keywords: Optional[list] = None) -> Dict[str, Any]:
    """
    Legacy compatibility function.
    
    DEPRECATED: Use src.domains.ats.ATSAnalysisService instead.
    """
    wrapper = LegacyATSWrapper()
    return wrapper.analyze_resume(resume_path, job_keywords)


# For imports from the old modules
class UltimateATSScanner:
    """Legacy class wrapper for backward compatibility."""
    
    def __init__(self):
        warnings.warn(
            "UltimateATSScanner is deprecated. Use ATSAnalysisService instead.",
            DeprecationWarning,
            stacklevel=2
        )
        self._wrapper = LegacyATSWrapper()
    
    def analyze_resume(self, resume_path: str, job_keywords: Optional[list] = None):
        """Legacy method."""
        return self._wrapper.analyze_resume(resume_path, job_keywords)


class ATSScanner:
    """Legacy class wrapper for backward compatibility."""
    
    def __init__(self):
        warnings.warn(
            "ATSScanner is deprecated. Use ATSAnalysisService instead.",
            DeprecationWarning,
            stacklevel=2
        )
        self._wrapper = LegacyATSWrapper()
    
    def scan_resume(self, resume_path: str, job_description: Optional[str] = None):
        """Legacy method."""
        job_keywords = None
        if job_description:
            # Simple keyword extraction from job description
            import re
            words = re.findall(r'\b\w+\b', job_description.lower())
            job_keywords = list(set(words))[:20]  # Limit to 20 keywords
        
        return self._wrapper.analyze_resume(resume_path, job_keywords)