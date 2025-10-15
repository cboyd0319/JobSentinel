"""
Auto-Fix Systems for JobSentinel

Automatic correction and enhancement capabilities for resumes and job applications.

References:
- SWEBOK v4.0a | https://computer.org/swebok | High | Quality improvement processes
- OWASP ASVS 5.0 | https://owasp.org/ASVS | High | Input validation
"""

from .bullet_enhancer import BulletEnhancer, EnhancedBullet
from .keyword_optimizer import KeywordOptimizer, OptimizationResult
from .resume_auto_fixer import AutoFixResult, ResumeAutoFixer

__all__ = [
    "ResumeAutoFixer",
    "AutoFixResult",
    "BulletEnhancer",
    "EnhancedBullet",
    "KeywordOptimizer",
    "OptimizationResult",
]
