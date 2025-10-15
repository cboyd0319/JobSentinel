"""
ATS Analysis Service

Main service that coordinates resume parsing, analysis, scoring, and reporting.
This replaces the monolithic UltimateATSScanner with a clean, modular architecture.
"""

import logging
from typing import Any

from .analyzers.compatibility_analyzer import CompatibilityAnalyzer
from .models import ATSCompatibilityScore
from .parsers import ResumeParserFactory
from .reports.report_generator import ReportGenerator
from .scoring.compatibility_scorer import CompatibilityScorer

# For dependency injection integration
try:
    from utils.dependency_injection import ServiceContainer, injectable

    HAS_DI = True
except ImportError:
    HAS_DI = False

    # Fallback decorator
    def injectable(interface=None):
        def decorator(cls):
            return cls

        return decorator


logger = logging.getLogger(__name__)


@injectable()
class ATSAnalysisService:
    """
    Main service for ATS compatibility analysis.

    Provides a clean, simple interface for the complex ATS analysis process.
    """

    def __init__(self):
        self.parser_factory = ResumeParserFactory()
        self.analyzer = CompatibilityAnalyzer()
        self.scorer = CompatibilityScorer()
        self.report_generator = ReportGenerator()

        logger.info("ATS Analysis Service initialized")

    def analyze_resume(
        self,
        resume_path: str,
        job_keywords: list[str] | None = None,
        output_path: str | None = None,
        format: str = "text",
    ) -> ATSCompatibilityScore:
        """
        Perform comprehensive ATS analysis of a resume.

        Args:
            resume_path: Path to the resume file (PDF, DOCX, or TXT)
            job_keywords: Optional list of job-specific keywords to analyze
            output_path: Optional path to save the report
            format: Report format ('text' or 'html')

        Returns:
            ATSCompatibilityScore with comprehensive analysis results
        """

        logger.info(f"Starting ATS analysis for: {resume_path}")

        # 1. Parse the resume
        parsed_data = self.parser_factory.parse_resume(resume_path)
        if not parsed_data:
            raise ValueError(f"Failed to parse resume: {resume_path}")

        resume_text = parsed_data["text"]
        metadata = parsed_data["metadata"]

        logger.info(
            f"Resume parsed successfully. Word count: {metadata.get('word_count', 'unknown')}"
        )

        # 2. Analyze compatibility issues
        issues = []

        # Formatting analysis
        formatting_issues = self.analyzer.analyze_formatting(resume_text)
        issues.extend(formatting_issues)

        # Readability analysis
        readability_issues = self.analyzer.analyze_readability(resume_text)
        issues.extend(readability_issues)

        # Structure analysis
        structure_issues = self.analyzer.analyze_structure(resume_text)
        issues.extend(structure_issues)

        logger.info(f"Analysis complete. Found {len(issues)} issues.")

        # 3. Analyze keywords
        keyword_matches = self.analyzer.analyze_keywords(resume_text, job_keywords)
        logger.info(f"Found {len(keyword_matches)} keyword matches.")

        # 4. Calculate scores
        compatibility_score = self.scorer.calculate_compatibility_score(
            issues=issues,
            keyword_matches=keyword_matches,
            resume_text=resume_text,
            job_keywords=job_keywords,
        )

        logger.info(f"Overall compatibility score: {compatibility_score.overall_score}/100")

        # 5. Generate report if requested
        if output_path:
            report_path = self.report_generator.save_report(
                compatibility_score, output_path, format
            )
            logger.info(f"Report saved to: {report_path}")

        return compatibility_score

    def analyze_text(
        self, resume_text: str, job_keywords: list[str] | None = None
    ) -> ATSCompatibilityScore:
        """
        Perform ATS analysis on resume text directly.

        Args:
            resume_text: The resume content as text
            job_keywords: Optional list of job-specific keywords

        Returns:
            ATSCompatibilityScore with analysis results
        """

        logger.info("Starting ATS analysis for provided text")

        # Analyze compatibility issues
        issues = []
        issues.extend(self.analyzer.analyze_formatting(resume_text))
        issues.extend(self.analyzer.analyze_readability(resume_text))
        issues.extend(self.analyzer.analyze_structure(resume_text))

        # Analyze keywords
        keyword_matches = self.analyzer.analyze_keywords(resume_text, job_keywords)

        # Calculate scores
        compatibility_score = self.scorer.calculate_compatibility_score(
            issues=issues,
            keyword_matches=keyword_matches,
            resume_text=resume_text,
            job_keywords=job_keywords,
        )

        logger.info(f"Text analysis complete. Score: {compatibility_score.overall_score}/100")

        return compatibility_score

    def generate_report(
        self, score: ATSCompatibilityScore, output_path: str | None = None, format: str = "text"
    ) -> str:
        """
        Generate and save a report from existing analysis results.

        Args:
            score: The ATSCompatibilityScore to generate report for
            output_path: Optional path to save the report
            format: Report format ('text' or 'html')

        Returns:
            Path to the saved report file
        """

        return self.report_generator.save_report(score, output_path, format)

    def get_analysis_summary(self, score: ATSCompatibilityScore) -> dict[str, Any]:
        """
        Get a concise summary of the analysis results.

        Args:
            score: The ATSCompatibilityScore to summarize

        Returns:
            Dictionary with key analysis metrics
        """

        critical_issues = score.get_critical_issues()
        high_issues = score.get_high_priority_issues()

        return {
            "overall_score": score.overall_score,
            "rating": self._get_score_rating(score.overall_score),
            "critical_issues_count": len(critical_issues),
            "high_priority_issues_count": len(high_issues),
            "total_issues": len(score.issues),
            "keyword_matches": len(score.keyword_matches),
            "word_count": score.resume_word_count,
            "sections_found": len(score.resume_sections),
            "top_recommendation": (
                score.priority_recommendations[0] if score.priority_recommendations else None
            ),
            "quick_win": score.quick_wins[0] if score.quick_wins else None,
            "best_system_score": max(score.system_scores.values()) if score.system_scores else 0,
            "worst_system_score": min(score.system_scores.values()) if score.system_scores else 0,
        }

    def _get_score_rating(self, score: float) -> str:
        """Get text rating for numerical score."""
        if score >= 90:
            return "Excellent"
        elif score >= 80:
            return "Good"
        elif score >= 70:
            return "Fair"
        elif score >= 60:
            return "Poor"
        else:
            return "Critical"


# Legacy compatibility function for existing code
def analyze_resume(resume_path: str, job_keywords: list[str] = None) -> ATSCompatibilityScore:
    """
    Legacy compatibility function for existing code.

    This provides backward compatibility with the old UltimateATSScanner interface.
    """
    logger.warning(
        "analyze_resume() is deprecated. " "Use ATSAnalysisService.analyze_resume() for new code."
    )

    service = ATSAnalysisService()
    return service.analyze_resume(resume_path, job_keywords)


# Register with dependency injection container if available
if HAS_DI:
    try:
        container = ServiceContainer()
        container.register_singleton(ATSAnalysisService)
        logger.info("ATSAnalysisService registered with dependency injection container")
    except Exception as e:
        logger.warning(f"Failed to register with DI container: {e}")
