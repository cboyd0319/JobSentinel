"""
RipGrep Integration Demo

Demonstrates the RipGrep-powered features in JobSentinel for:
1. Resume keyword optimization
2. Fast job deduplication
3. Log analysis
4. Keyword pre-filtering

Reference: docs/RIPGREP_INTEGRATION.md
"""

import json
import os
import sys
import tempfile
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "src"))

from jsa.resume_analyzer import (
    analyze_resume_gaps,
    extract_keywords_from_jobs,
    generate_resume_report,
)
from jsa.deduplicator import (
    filter_duplicate_jobs,
    find_similar_titles,
    get_existing_job_urls,
)
from jsa.log_analyzer import (
    analyze_scraper_logs,
    find_failed_sources,
    generate_health_report,
)
from jsa.filters import bulk_delete_blacklisted_jobs, find_blacklisted_companies
from jsa.config_validator import (
    find_deprecated_settings,
    validate_config_keys,
)
from matchers.keyword_filter import (
    fast_keyword_filter,
    optimized_scoring_workflow,
)


def demo_resume_analysis():
    """Demo 1: Resume Keyword Optimization"""
    print("\n" + "=" * 60)
    print("DEMO 1: Resume Keyword Optimization")
    print("=" * 60)

    # Create a temporary resume
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".txt", delete=False
    ) as resume_file:
        resume_file.write(
            """
        John Doe
        Software Engineer
        
        Skills: Python, Django, SQL, JavaScript, React, Git
        
        Experience:
        - Built web applications with Django and React
        - Worked with PostgreSQL databases
        - Used Git for version control
        """
        )
        resume_path = resume_file.name

    # Create temporary jobs directory with sample jobs
    jobs_dir = tempfile.mkdtemp()
    sample_jobs = [
        {
            "title": "Senior Python Developer",
            "description": "Looking for Python, Django, Kubernetes, AWS expert",
            "url": "https://example.com/job1",
        },
        {
            "title": "Full Stack Developer",
            "description": "React, Node.js, Docker, CI/CD experience required",
            "url": "https://example.com/job2",
        },
        {
            "title": "DevOps Engineer",
            "description": "Terraform, AWS, Kubernetes, Python automation",
            "url": "https://example.com/job3",
        },
    ]

    for i, job in enumerate(sample_jobs):
        job_file = Path(jobs_dir) / f"job_{i}.json"
        with open(job_file, "w") as f:
            json.dump(job, f)

    try:
        # Extract keywords from jobs
        print(f"\n📊 Extracting keywords from {len(sample_jobs)} sample jobs...")
        keywords = extract_keywords_from_jobs(jobs_dir, top_n=20)
        print(f"Top keywords found: {', '.join(kw for kw, _ in keywords[:10])}")

        # Analyze resume gaps
        print(f"\n📄 Analyzing resume: {resume_path}")
        target_keywords = ["python", "django", "kubernetes", "aws", "docker", "terraform"]
        analysis = analyze_resume_gaps(resume_path, target_keywords)

        print(f"\n✅ Found keywords: {', '.join(analysis['found'])}")
        print(f"❌ Missing keywords: {', '.join(analysis['missing'])}")
        print(f"📈 Coverage: {analysis['coverage_pct']:.1f}%")
        print(f"💡 Recommendation: {analysis['recommendation']}")

        # Generate full report
        report_path = Path(jobs_dir) / "resume_report.txt"
        print(f"\n📝 Generating full report: {report_path}")
        generate_resume_report(resume_path, jobs_dir, str(report_path))
        print("✓ Report generated successfully")

    finally:
        # Cleanup
        os.unlink(resume_path)
        for file in Path(jobs_dir).glob("*"):
            file.unlink()
        os.rmdir(jobs_dir)


def demo_deduplication():
    """Demo 2: Fast Job Deduplication"""
    print("\n" + "=" * 60)
    print("DEMO 2: Fast Job Deduplication")
    print("=" * 60)

    # Create temporary cache directory
    cache_dir = tempfile.mkdtemp()
    cached_jobs = [
        {"title": "Python Developer", "url": "https://example.com/job1"},
        {"title": "Java Developer", "url": "https://example.com/job2"},
    ]

    for i, job in enumerate(cached_jobs):
        job_file = Path(cache_dir) / f"cached_{i}.json"
        with open(job_file, "w") as f:
            json.dump(job, f)

    try:
        # Get existing URLs
        print(f"\n🔍 Extracting URLs from cache: {cache_dir}")
        existing_urls = get_existing_job_urls(cache_dir)
        print(f"Found {len(existing_urls)} existing URLs")

        # Filter duplicates from new jobs
        new_jobs = [
            {"title": "Python Developer", "url": "https://example.com/job1"},  # Duplicate
            {"title": "React Developer", "url": "https://example.com/job3"},  # New
            {"title": "DevOps Engineer", "url": "https://example.com/job4"},  # New
        ]

        print(f"\n📦 Checking {len(new_jobs)} new jobs for duplicates...")
        unique_jobs = filter_duplicate_jobs(new_jobs, cache_dir)
        print(f"✓ {len(unique_jobs)} unique jobs after deduplication")

        # Find similar titles
        print("\n🔎 Finding similar job titles...")
        similar = find_similar_titles("Python Developer", cache_dir)
        print(f"Similar titles to 'Python Developer': {', '.join(similar)}")

    finally:
        # Cleanup
        for file in Path(cache_dir).glob("*.json"):
            file.unlink()
        os.rmdir(cache_dir)


def demo_log_analysis():
    """Demo 3: Log Analysis"""
    print("\n" + "=" * 60)
    print("DEMO 3: Log Analysis for Debugging")
    print("=" * 60)

    # Create temporary log directory
    log_dir = tempfile.mkdtemp()
    log_content = """
2025-10-18 10:00:00 INFO Starting scraper
2025-10-18 10:00:01 ERROR Failed to connect to API
2025-10-18 10:00:02 WARNING Rate limit hit: 429 Too many requests
2025-10-18 10:00:03 INFO Request took 6500ms
2025-10-18 10:00:04 ERROR Exception: Connection timeout
2025-10-18 10:00:05 ERROR Source: ReedAPI ERROR Failed to authenticate
    """

    log_file = Path(log_dir) / "scraper.log"
    with open(log_file, "w") as f:
        f.write(log_content)

    try:
        # Analyze logs
        print(f"\n📜 Analyzing logs in: {log_dir}")
        stats = analyze_scraper_logs(log_dir)

        print(f"\n📊 Log Analysis Results:")
        print(f"  Errors: {len(stats['errors'])}")
        print(f"  Rate Limits: {len(stats['rate_limits'])}")
        print(f"  Slow Requests: {len(stats['slow_requests'])}")

        if stats["errors"]:
            print(f"\n❌ Recent Errors:")
            for error in stats["errors"][:3]:
                print(f"  • {error[:80]}...")

        # Find failed sources
        print(f"\n🔍 Identifying failed sources...")
        failed_sources = find_failed_sources(log_dir)
        if failed_sources:
            print(f"  Failed sources: {failed_sources}")

        # Generate health report
        report_path = Path(log_dir) / "health_report.txt"
        print(f"\n📝 Generating health report: {report_path}")
        generate_health_report(log_dir, str(report_path))
        print("✓ Health report generated")

    finally:
        # Cleanup
        log_file.unlink()
        report_file = Path(log_dir) / "health_report.txt"
        if report_file.exists():
            report_file.unlink()
        os.rmdir(log_dir)


def demo_blacklist_filtering():
    """Demo 4: Company Blacklist Enforcement"""
    print("\n" + "=" * 60)
    print("DEMO 4: Company Blacklist Enforcement")
    print("=" * 60)

    # Create temporary jobs directory
    jobs_dir = tempfile.mkdtemp()
    sample_jobs = [
        {"title": "Developer", "company": "GoodCompany", "url": "https://example.com/job1"},
        {"title": "Engineer", "company": "BadCompany", "url": "https://example.com/job2"},
        {"title": "Analyst", "company": "AnotherGood", "url": "https://example.com/job3"},
    ]

    for i, job in enumerate(sample_jobs):
        job_file = Path(jobs_dir) / f"job_{i}.json"
        with open(job_file, "w") as f:
            json.dump(job, f)

    try:
        # Find blacklisted companies
        blacklist = ["BadCompany", "ToxicCorp"]
        print(f"\n🚫 Blacklist: {', '.join(blacklist)}")
        print(f"📁 Scanning jobs in: {jobs_dir}")

        blacklisted_files = find_blacklisted_companies(jobs_dir, blacklist)
        print(f"✓ Found {len(blacklisted_files)} jobs from blacklisted companies")

        # Note: Not actually deleting in demo mode
        print("\n⚠️  Would delete these files (demo mode - not actually deleting):")
        for file in blacklisted_files:
            print(f"  • {file}")

    finally:
        # Cleanup
        for file in Path(jobs_dir).glob("*.json"):
            file.unlink()
        os.rmdir(jobs_dir)


def demo_keyword_filtering():
    """Demo 5: Keyword Pre-Filtering"""
    print("\n" + "=" * 60)
    print("DEMO 5: Keyword Pre-Filtering Before Scoring")
    print("=" * 60)

    # Create temporary jobs directory
    jobs_dir = tempfile.mkdtemp()
    sample_jobs = [
        {
            "title": "Python Developer",
            "description": "Python, Django, PostgreSQL experience",
            "url": "https://example.com/job1",
        },
        {
            "title": "Java Engineer",
            "description": "Java, Spring Boot, MySQL",
            "url": "https://example.com/job2",
        },
        {
            "title": "Full Stack Python",
            "description": "Python, React, Docker, Kubernetes",
            "url": "https://example.com/job3",
        },
        {
            "title": "PHP Developer",
            "description": "PHP, Laravel, MySQL",
            "url": "https://example.com/job4",
        },
    ]

    for i, job in enumerate(sample_jobs):
        job_file = Path(jobs_dir) / f"job_{i}.json"
        with open(job_file, "w") as f:
            json.dump(job, f)

    try:
        # Fast keyword filter
        keywords = ["python", "django", "kubernetes"]
        print(f"\n🔍 Filtering for keywords: {', '.join(keywords)}")
        print(f"📁 Scanning {len(sample_jobs)} jobs in: {jobs_dir}")

        candidate_files = fast_keyword_filter(jobs_dir, keywords, min_matches=2)
        print(f"✓ Found {len(candidate_files)} candidates matching at least 2 keywords")

        # Show which jobs matched
        print("\n📋 Matching jobs:")
        for file_path in candidate_files:
            with open(file_path) as f:
                job = json.load(f)
            print(f"  • {job['title']}")

    finally:
        # Cleanup
        for file in Path(jobs_dir).glob("*.json"):
            file.unlink()
        os.rmdir(jobs_dir)


def demo_config_validation():
    """Demo 6: Configuration Validation"""
    print("\n" + "=" * 60)
    print("DEMO 6: Configuration Validation")
    print("=" * 60)

    # Create temporary config directory
    config_dir = tempfile.mkdtemp()
    configs = [
        {"api_key": "test123", "enabled": True},
        {"enabled": True},  # Missing api_key
        {"api_key": "test456", "enabled": True, "use_old_api": True},  # Deprecated
    ]

    for i, config in enumerate(configs):
        config_file = Path(config_dir) / f"config_{i}.json"
        with open(config_file, "w") as f:
            json.dump(config, f)

    try:
        # Validate required keys
        required_keys = ["api_key", "enabled"]
        print(f"\n🔍 Validating configs for required keys: {', '.join(required_keys)}")
        missing_keys = validate_config_keys(config_dir, required_keys)

        if missing_keys:
            print("\n❌ Missing keys found:")
            for key, files in missing_keys.items():
                print(f"  {key}: {len(files)} file(s)")
        else:
            print("✓ All required keys present")

        # Find deprecated settings
        print("\n🔍 Checking for deprecated settings...")
        deprecated = find_deprecated_settings(config_dir)

        if deprecated:
            print("⚠️  Deprecated settings found:")
            for finding in deprecated:
                print(f"  Pattern: {finding['pattern']}")
                print(f"  Locations: {len(finding['locations'])}")
        else:
            print("✓ No deprecated settings found")

    finally:
        # Cleanup
        for file in Path(config_dir).glob("*.json"):
            file.unlink()
        os.rmdir(config_dir)


def main():
    """Run all RipGrep integration demos"""
    print("\n" + "=" * 60)
    print("JobSentinel RipGrep Integration Demo")
    print("=" * 60)
    print("\nThis demonstrates RipGrep-powered features:")
    print("• Resume keyword optimization")
    print("• Fast job deduplication")
    print("• Log analysis for debugging")
    print("• Company blacklist enforcement")
    print("• Keyword pre-filtering")
    print("• Configuration validation")
    print("\nReference: docs/RIPGREP_INTEGRATION.md")

    try:
        demo_resume_analysis()
        demo_deduplication()
        demo_log_analysis()
        demo_blacklist_filtering()
        demo_keyword_filtering()
        demo_config_validation()

        print("\n" + "=" * 60)
        print("✅ All demos completed successfully!")
        print("=" * 60)
        print("\nNote: RipGrep features automatically fall back to Python")
        print("implementations when 'rg' command is not available.")

    except Exception as e:
        print(f"\n❌ Demo failed: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
