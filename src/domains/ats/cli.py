"""
Modern ATS Analysis CLI

Clean, user-friendly command-line interface for ATS resume analysis.
Replaces the legacy CLI functionality from ultimate_ats_scanner.py.
"""

import argparse
import logging
import sys
from pathlib import Path
from typing import List, Optional

from ..service import ATSAnalysisService

logger = logging.getLogger(__name__)


def create_parser() -> argparse.ArgumentParser:
    """Create the command-line argument parser."""
    parser = argparse.ArgumentParser(
        description="Analyze resume ATS compatibility",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s resume.pdf                    # Basic analysis
  %(prog)s resume.pdf --keywords python,java,sql  # With job keywords
  %(prog)s resume.pdf --output report.html --format html  # HTML report
  %(prog)s resume.pdf --summary          # Just show summary
        """
    )
    
    parser.add_argument(
        "resume",
        help="Path to resume file (PDF, DOCX, or TXT)"
    )
    
    parser.add_argument(
        "--keywords",
        help="Comma-separated list of job keywords to analyze"
    )
    
    parser.add_argument(
        "--output", "-o",
        help="Output file path for detailed report"
    )
    
    parser.add_argument(
        "--format", "-f",
        choices=["text", "html"],
        default="text",
        help="Report format (default: text)"
    )
    
    parser.add_argument(
        "--summary", "-s",
        action="store_true",
        help="Show only summary information"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )
    
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Suppress all output except results"
    )
    
    return parser


def setup_logging(verbose: bool = False, quiet: bool = False):
    """Setup logging configuration."""
    if quiet:
        level = logging.ERROR
    elif verbose:
        level = logging.DEBUG
    else:
        level = logging.INFO
    
    logging.basicConfig(
        level=level,
        format="%(levelname)s: %(message)s",
        stream=sys.stderr
    )


def parse_keywords(keywords_str: Optional[str]) -> Optional[List[str]]:
    """Parse comma-separated keywords string."""
    if not keywords_str:
        return None
    
    return [k.strip() for k in keywords_str.split(",") if k.strip()]


def print_summary(service: ATSAnalysisService, score):
    """Print a concise summary of the analysis."""
    summary = service.get_analysis_summary(score)
    
    print(f"\nATS COMPATIBILITY ANALYSIS")
    print("=" * 40)
    print(f"Overall Score: {summary['overall_score']}/100 ({summary['rating']})")
    print(f"Issues Found: {summary['total_issues']} (Critical: {summary['critical_issues_count']}, High: {summary['high_priority_issues_count']})")
    print(f"Keyword Matches: {summary['keyword_matches']}")
    print(f"Resume Length: {summary['word_count']} words")
    
    if summary['top_recommendation']:
        print(f"\nTop Priority: {summary['top_recommendation']}")
    
    if summary['quick_win']:
        print(f"Quick Win: {summary['quick_win']}")
    
    # System compatibility range
    if summary['best_system_score'] != summary['worst_system_score']:
        print(f"\nSystem Compatibility: {summary['worst_system_score']}-{summary['best_system_score']}/100")
    
    print()


def print_detailed_results(score):
    """Print detailed analysis results to console."""
    print(f"\nOVERALL SCORE: {score.overall_score}/100")
    
    # Component scores
    print("\nCOMPONENT SCORES:")
    for component, component_score in score.component_scores.items():
        print(f"  {component.title()}: {component_score}/100")
    
    # Critical issues
    critical_issues = score.get_critical_issues()
    if critical_issues:
        print(f"\nCRITICAL ISSUES ({len(critical_issues)}):")
        for i, issue in enumerate(critical_issues, 1):
            print(f"  {i}. {issue.description}")
            if issue.recommendations:
                print(f"     → {issue.recommendations[0]}")
    
    # Top recommendations
    if score.priority_recommendations:
        print(f"\nPRIORITY RECOMMENDATIONS:")
        for i, rec in enumerate(score.priority_recommendations[:3], 1):
            print(f"  {i}. {rec}")
    
    # Top keywords
    if score.keyword_matches:
        print(f"\nTOP KEYWORD MATCHES:")
        top_matches = sorted(score.keyword_matches, key=lambda x: x.relevance_score, reverse=True)[:5]
        for match in top_matches:
            print(f"  • {match.keyword} (Relevance: {match.relevance_score:.2f}, Count: {match.matches})")
    
    print()


def main(args: Optional[List[str]] = None) -> int:
    """Main CLI entry point."""
    parser = create_parser()
    parsed_args = parser.parse_args(args)
    
    # Setup logging
    setup_logging(parsed_args.verbose, parsed_args.quiet)
    
    # Validate input file
    resume_path = Path(parsed_args.resume)
    if not resume_path.exists():
        print(f"Error: Resume file not found: {resume_path}", file=sys.stderr)
        return 1
    
    if not resume_path.is_file():
        print(f"Error: Path is not a file: {resume_path}", file=sys.stderr)
        return 1
    
    try:
        # Parse keywords
        job_keywords = parse_keywords(parsed_args.keywords)
        if job_keywords and not parsed_args.quiet:
            print(f"Analyzing with {len(job_keywords)} job keywords...")
        
        # Initialize service and analyze
        service = ATSAnalysisService()
        
        if not parsed_args.quiet:
            print(f"Analyzing resume: {resume_path}")
        
        score = service.analyze_resume(
            str(resume_path),
            job_keywords=job_keywords,
            output_path=parsed_args.output,
            format=parsed_args.format
        )
        
        # Display results
        if parsed_args.summary:
            print_summary(service, score)
        else:
            print_detailed_results(score)
        
        # Report generation message
        if parsed_args.output and not parsed_args.quiet:
            print(f"Detailed report saved to: {parsed_args.output}")
        
        return 0
        
    except Exception as e:
        if parsed_args.verbose:
            logger.exception("Analysis failed")
        else:
            print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())