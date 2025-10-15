#!/usr/bin/env python3
"""
Bias Detection Demo

Demonstrates the comprehensive bias detection system with real-world examples.
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.domains.detection.bias_detector import BiasDetector


def print_separator():
    """Print a visual separator."""
    print("\n" + "=" * 80 + "\n")


def analyze_job_posting(detector, title, description, context=""):
    """Analyze a job posting and print detailed results."""
    print(f"📋 JOB POSTING: {title}")
    if context:
        print(f"Context: {context}")
    print(f"\nDescription:\n{description}\n")

    result = detector.detect_bias(job_title=title, job_description=description)

    if result.has_bias:
        print(f"⚠️  BIAS DETECTED!")
        print(f"Bias Score: {result.overall_bias_score:.2f}/1.00")
        print(
            f"Bias Types: {', '.join(bt.value.replace('_', ' ').title() for bt in result.bias_types)}"
        )
        print(f"\n{result.explanation}")

        print("\n🔍 Detailed Indicators:")
        for i, indicator in enumerate(result.indicators, 1):
            print(f"\n{i}. {indicator.bias_type.value.replace('_', ' ').upper()}")
            print(f"   Pattern: '{indicator.pattern}'")
            print(f"   Severity: {indicator.severity.value.upper()}")
            print(f"   Context: ...{indicator.context}...")
            print(f"   Explanation: {indicator.explanation}")
            print(f"   ✅ Alternative: {indicator.alternative}")

        print("\n💡 Suggestions:")
        for suggestion in result.suggestions:
            print(f"   • {suggestion}")
    else:
        print("✅ NO BIAS DETECTED - Job posting uses inclusive language!")
        print(f"Bias Score: {result.overall_bias_score:.2f}/1.00")

    print_separator()


def main():
    """Run bias detection demo."""
    print("=" * 80)
    print("BIAS DETECTION DEMO - JobSentinel v0.6.1+")
    print("=" * 80)
    print("\nThis demo shows how JobSentinel detects bias in job postings.")
    print("We'll analyze several examples demonstrating different types of bias.\n")

    detector = BiasDetector()

    # Example 1: Clean, inclusive posting
    analyze_job_posting(
        detector,
        title="Senior Software Engineer",
        description="""
        We're seeking a talented software engineer to join our team.
        
        Responsibilities:
        - Design and implement scalable backend services
        - Collaborate with cross-functional teams
        - Mentor team members
        
        Requirements:
        - 5+ years of professional software development experience
        - Strong proficiency in Python
        - Excellent problem-solving skills
        
        Compensation & Benefits:
        - Salary range: $140,000 - $160,000 based on experience
        - Comprehensive health insurance
        - Remote work options available
        
        We are an equal opportunity employer committed to diversity and inclusion.
        """,
        context="Example of an inclusive job posting",
    )

    # Example 2: Gender bias
    analyze_job_posting(
        detector,
        title="Salesman",
        description="""
        Looking for an aggressive and competitive salesman to join our team.
        The ideal candidate will manage his territory and report to his regional manager.
        """,
        context="Example with gendered language",
    )

    # Example 3: Age bias (ADEA violation)
    analyze_job_posting(
        detector,
        title="Marketing Assistant",
        description="""
        We're looking for a young, energetic recent graduate to join our marketing team.
        Must be under 30 years old. Digital natives preferred.
        """,
        context="Example with age discrimination (illegal under ADEA)",
    )

    # Example 4: Salary bias
    analyze_job_posting(
        detector,
        title="Data Analyst",
        description="""
        Exciting opportunity for a data analyst!
        Competitive salary and great benefits.
        Salary commensurate with experience.
        """,
        context="Example with hidden salary (pay equity issue)",
    )

    # Example 5: Location bias
    analyze_job_posting(
        detector,
        title="Operations Manager",
        description="""
        Must be located in downtown San Francisco and able to work in-office 5 days per week.
        Local candidates only. No remote work available.
        """,
        context="Example with geographic discrimination",
    )

    # Example 6: Multiple bias types
    analyze_job_posting(
        detector,
        title="Office Manager / Receptionist",
        description="""
        We're looking for a young, attractive recent graduate to join our team.
        She will greet visitors and provide administrative support.
        
        Requirements:
        - Must be under 30 years old
        - Must be located in downtown area
        
        Competitive salary based on experience.
        """,
        context="Real-world problematic posting with multiple bias types",
    )

    print("\n" + "=" * 80)
    print("DEMO COMPLETE")
    print("=" * 80)
    print("\nKey Takeaways:")
    print("• Gender Bias: Use neutral pronouns (they/them) and job titles (salesperson)")
    print("• Age Bias: Focus on experience, not age (ADEA compliance)")
    print("• Salary Bias: Disclose ranges for pay equity and transparency")
    print("• Location Bias: Consider remote options to increase diversity")
    print("\nFor more information, see docs/FEATURES.md")


if __name__ == "__main__":
    main()
