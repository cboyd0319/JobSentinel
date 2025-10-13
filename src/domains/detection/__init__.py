"""
Enhanced Detection Systems for JobSentinel

World-class detection capabilities for job quality, resume optimization,
and ATS compatibility.
"""

from .job_quality_detector import JobQualityDetector, JobQualityScore
from .resume_quality_detector import ResumeQualityDetector, ResumeQualityScore
from .skills_gap_analyzer import SkillsGap, SkillsGapAnalyzer

__all__ = [
    "JobQualityDetector",
    "JobQualityScore",
    "ResumeQualityDetector",
    "ResumeQualityScore",
    "SkillsGapAnalyzer",
    "SkillsGap",
]
