#!/usr/bin/env python3
"""
Demo: World-Class Detection and Auto-Fix Systems

Demonstrates the enhanced detection and auto-fix capabilities that make
JobSentinel the best job search automation tool.

Usage:
    python examples/detection_and_autofix_demo.py
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "src"))

from domains.detection import (
    JobQualityDetector,
    ResumeQualityDetector,
    SkillsGapAnalyzer,
)
from domains.autofix import (
    BulletEnhancer,
    KeywordOptimizer,
    ResumeAutoFixer,
)


def print_section(title: str):
    """Print formatted section header."""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")


def demo_job_quality_detection():
    """Demonstrate job quality detection."""
    print_section("JOB QUALITY DETECTION")

    detector = JobQualityDetector()

    # Example 1: High-quality job
    good_job = """
    Senior Software Engineer

    We are seeking an experienced Senior Software Engineer to join our team.

    Responsibilities:
    - Design and implement scalable microservices
    - Lead technical decisions and mentor junior developers
    - Collaborate with product managers and stakeholders

    Requirements:
    - 5+ years of software development experience
    - Strong proficiency in Python, Java, or Go
    - Experience with AWS and containerization
    - Excellent communication skills

    Benefits:
    - Competitive salary and equity
    - Health, dental, and vision insurance
    - Flexible work arrangements
    - Professional development budget
    """

    result = detector.analyze(
        job_title="Senior Software Engineer",
        job_description=good_job,
        company_name="TechCorp Inc",
        salary_range=(120000, 180000),
        location="San Francisco, CA",
    )

    print(f"✓ Analyzing: Senior Software Engineer at TechCorp Inc")
    print(f"  Overall Score: {result.overall_score}/100 ({result.quality_level.value})")
    print(f"\n  Component Scores:")
    for component, score in result.component_scores.items():
        print(f"    - {component}: {score:.1f}/100")

    if result.strengths:
        print(f"\n  Strengths:")
        for strength in result.strengths:
            print(f"    ✓ {strength}")

    if result.red_flags:
        print(f"\n  Red Flags:")
        for flag in result.red_flags:
            print(f"    ⚠ {flag.description} (severity: {flag.severity}/10)")

    print(f"\n  Recommendations:")
    for rec in result.recommendations:
        print(f"    • {rec}")

    # Example 2: Suspicious job
    print("\n" + "-" * 80)

    suspicious_job = """
    Make $5000 per week from home! No experience required!

    Work from anywhere with our proven system. Just pay a small training fee
    of $299 to get started. Guaranteed income!

    Contact us via wire transfer for instant access.
    """

    result2 = detector.analyze(
        job_title="Work from Home Opportunity",
        job_description=suspicious_job,
        company_name="",
        salary_range=(5000, 10000),
    )

    print(f"\n✓ Analyzing: Work from Home Opportunity")
    print(f"  Overall Score: {result2.overall_score}/100 ({result2.quality_level.value})")

    if result2.red_flags:
        print(f"\n  Red Flags Detected:")
        for flag in result2.red_flags:
            print(f"    🚨 {flag.description} (severity: {flag.severity}/10)")
            if flag.mitigation:
                print(f"       Mitigation: {flag.mitigation}")


def demo_resume_quality_detection():
    """Demonstrate resume quality detection."""
    print_section("RESUME QUALITY DETECTION")

    detector = ResumeQualityDetector()

    sample_resume = """
    John Doe
    Software Engineer

    Experience:
    • Worked on backend systems
    • Helped with database optimization
    • Responsible for API development
    • Made improvements to the codebase
    • Was involved in code reviews

    Skills:
    Python, Java, SQL, Git

    Education:
    BS Computer Science, University of Technology
    """

    result = detector.analyze(
        resume_text=sample_resume,
        target_industry="software_engineering",
        target_role="Senior Software Engineer",
    )

    print(f"✓ Analyzing resume quality")
    print(f"  Overall Score: {result.overall_score}/100")
    print(f"  Improvement Potential: +{result.improvement_potential:.1f} points")

    print(f"\n  Dimension Scores:")
    for dimension, score in result.dimension_scores.items():
        status = "✓" if score >= 80 else "⚠" if score >= 60 else "✗"
        print(f"    {status} {dimension}: {score:.1f}/100")

    if result.issues:
        print(f"\n  Issues Found:")
        for issue in result.issues:
            print(f"    • {issue.description} (severity: {issue.severity}/10)")
            print(f"      Fix: {issue.fix_suggestion}")

    if result.strengths:
        print(f"\n  Strengths:")
        for strength in result.strengths:
            print(f"    ✓ {strength}")


def demo_skills_gap_analysis():
    """Demonstrate skills gap analysis."""
    print_section("SKILLS GAP ANALYSIS")

    analyzer = SkillsGapAnalyzer()

    current_skills = ["Python", "Django", "SQL", "Git", "Linux", "REST APIs"]

    result = analyzer.analyze(
        current_skills=current_skills,
        target_role="Senior Software Engineer",
        target_industry="software_engineering",
        years_experience=3.0,
    )

    print(f"✓ Analyzing skills for Senior Software Engineer")
    print(f"  Overall Match: {result.overall_match_score:.1f}%")
    print(f"  Skills Analyzed: {result.metadata['skills_analyzed']}")

    print(f"\n  Your Strengths ({len(result.strengths)} skills):")
    for skill in result.strengths[:5]:
        print(f"    ✓ {skill.name} ({skill.level.value if skill.level else 'known'})")

    if result.gaps:
        print(f"\n  Skills to Develop ({len(result.gaps)} gaps identified):")
        critical_gaps = [g for g in result.gaps if g.priority.value == "critical"]
        for gap in critical_gaps[:5]:
            print(f"    • {gap.skill_name} (Priority: {gap.priority.value})")
            print(f"      Learning time: {gap.estimated_learning_time}")
            if gap.learning_resources:
                print(f"      Resources: {gap.learning_resources[0]}")

    if result.career_paths:
        print(f"\n  Career Path Suggestions:")
        for path in result.career_paths[:2]:
            print(f"    → {path.path_name}")
            print(f"      {path.description}")
            print(f"      Timeline: {path.timeline}")
            print(f"      Salary increase: {path.potential_salary_increase}")


def demo_resume_auto_fix():
    """Demonstrate automatic resume fixing."""
    print_section("RESUME AUTO-FIX")

    fixer = ResumeAutoFixer()

    weak_resume = """
    Experience:
    • Worked on various projects
    • Helped with developement of features
    • Responsible for testing
    • Did code reviews
    • Made improvments to performance
    """

    result = fixer.auto_fix(
        resume_text=weak_resume,
        target_keywords=["Python", "microservices", "AWS"],
        aggressive=True,
    )

    print(f"✓ Auto-fixing resume")
    print(f"  Improvement: +{result.improvement_score:.1f}%")
    print(f"  Fixes Applied: {len(result.fixes_applied)}")

    print(f"\n  Original:")
    for line in weak_resume.strip().split("\n")[:3]:
        print(f"    {line}")

    print(f"\n  Fixed:")
    for line in result.fixed_text.strip().split("\n")[:3]:
        print(f"    {line}")

    print(f"\n  Changes Made:")
    for fix in result.fixes_applied[:5]:
        print(f"    • {fix.fix_type.value}: {fix.explanation}")


def demo_bullet_enhancement():
    """Demonstrate bullet point enhancement."""
    print_section("BULLET POINT ENHANCEMENT")

    enhancer = BulletEnhancer()

    weak_bullets = [
        "Worked on backend API development",
        "Helped improve system performance",
        "Responsible for database management",
    ]

    print("✓ Enhancing bullet points\n")

    for i, bullet in enumerate(weak_bullets, 1):
        result = enhancer.enhance(bullet)

        print(f"  Bullet {i}:")
        print(f"    Before: {result.original}")
        print(f"    After:  {result.enhanced}")
        print(f"    Improvement: +{result.improvement_score:.0f}%")
        print(f"    Changes: {result.explanation}\n")


def demo_keyword_optimization():
    """Demonstrate keyword optimization."""
    print_section("KEYWORD OPTIMIZATION")

    optimizer = KeywordOptimizer()

    resume = """
    Software Engineer with experience in web development.
    Worked with Python and JavaScript.

    Experience:
    - Developed web applications
    - Worked with databases
    - Implemented REST APIs
    """

    job_description = """
    We're seeking a Senior Software Engineer with expertise in:
    - Python, Django, and FastAPI
    - React and TypeScript
    - AWS, Docker, and Kubernetes
    - PostgreSQL and Redis
    - Microservices architecture
    - CI/CD pipelines

    Must have 5+ years of experience.
    """

    result = optimizer.optimize(
        resume_text=resume,
        job_description=job_description,
    )

    print(f"✓ Optimizing keywords for job match")
    print(f"  Optimization Score: {result.optimization_score:.1f}%")

    print(f"\n  Matched Keywords ({len(result.matched_keywords)}):")
    for match in result.matched_keywords[:5]:
        print(f"    ✓ {match.keyword} (count: {match.count}, importance: {match.importance:.1f})")

    print(f"\n  Missing Keywords ({len(result.missing_keywords)}):")
    for keyword in result.missing_keywords[:8]:
        print(f"    • {keyword}")

    if result.over_optimized_keywords:
        print(f"\n  Over-Optimized (keyword stuffing detected):")
        for keyword in result.over_optimized_keywords:
            print(f"    ⚠ {keyword}")

    print(f"\n  Recommendations:")
    for rec in result.recommendations:
        print(f"    • {rec}")


def main():
    """Run all demos."""
    print("\n" + "=" * 80)
    print("  JOBSENTINEL: WORLD-CLASS DETECTION & AUTO-FIX DEMO")
    print("  Making JobSentinel the #1 job search automation tool")
    print("=" * 80)

    try:
        demo_job_quality_detection()
        demo_resume_quality_detection()
        demo_skills_gap_analysis()
        demo_resume_auto_fix()
        demo_bullet_enhancement()
        demo_keyword_optimization()

        print("\n" + "=" * 80)
        print("  ✓ Demo Complete!")
        print("  All systems operational and ready for production use.")
        print("=" * 80 + "\n")

    except Exception as e:
        print(f"\n✗ Error running demo: {e}")
        import traceback

        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
