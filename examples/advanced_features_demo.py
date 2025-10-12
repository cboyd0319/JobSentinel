"""
Advanced Features Demonstration

This example demonstrates JobSentinel's advanced capabilities:
- Extended industry profiles for resume optimization
- Intelligent job ranking and market analysis
- Security controls and rate limiting
- Observability and health monitoring
- Circuit breakers and resilience patterns

Run with: python examples/advanced_features_demo.py
"""

import asyncio
import json
from datetime import datetime, timedelta

# Import new domain modules
from src.domains.intelligence import get_intelligence_engine
from src.domains.observability import (
    get_metrics_collector,
    track_performance,
    get_slos,
)
from src.domains.resume.service import ResumeEnhancementService
from src.domains.resume.suggestions.industry_profiles_extended import (
    list_available_industries,
    get_industry_profile,
)
from src.domains.scraping_resilience import (
    ResilientScraper,
    RetryConfig,
    CircuitBreakerConfig,
    get_health_monitor,
)
from src.domains.security import (
    get_input_validator,
    get_rate_limiter,
    RateLimitConfig,
)


def demo_industry_profiles():
    """Demonstrate extended industry profiles."""
    print("\n" + "="*60)
    print("DEMO: Extended Industry Profiles")
    print("="*60)
    
    # List all available industries
    industries = list_available_industries()
    print(f"\n✓ Available Industries ({len(industries)}):")
    for industry in industries:
        print(f"  • {industry}")
    
    # Get specific industry details
    print("\n✓ Healthcare Industry Profile:")
    healthcare = get_industry_profile("healthcare")
    if healthcare:
        print(f"  Name: {healthcare.name}")
        print(f"  Required Sections: {[s.value for s in healthcare.required_sections]}")
        print(f"  Key Skills: {', '.join(healthcare.key_skills[:5])}...")
        print(f"  ATS Considerations:")
        for consideration in healthcare.ats_considerations:
            print(f"    - {consideration}")


def demo_resume_analysis():
    """Demonstrate resume analysis with new profiles."""
    print("\n" + "="*60)
    print("DEMO: Resume Analysis with Extended Profiles")
    print("="*60)
    
    # Sample resume text
    sample_resume = """
    Jane Smith
    Registered Nurse
    
    Professional Summary:
    Dedicated healthcare professional with 5 years of experience in acute care.
    
    Experience:
    Senior RN, City Hospital (2020-Present)
    - Provided patient care for 20+ patients per shift
    - Utilized Epic EMR system for documentation
    - Maintained HIPAA compliance
    
    Education:
    BSN, Nursing Science, State University, 2018
    
    Certifications:
    - RN License (Active)
    - BLS, ACLS
    """
    
    service = ResumeEnhancementService()
    
    # Analyze for healthcare industry
    print("\n✓ Analyzing resume for healthcare industry...")
    with track_performance("resume_analysis", {"industry": "healthcare"}):
        analysis = service.analyze_resume_text(
            sample_resume,
            target_industry="healthcare"
        )
    
    print(f"\n  Current Score: {analysis.current_score:.1f}/100")
    print(f"  Potential Score: {analysis.potential_score:.1f}/100")
    print(f"  Improvement Potential: {analysis.potential_score - analysis.current_score:.1f} points")
    
    print(f"\n  Top Suggestions ({len(analysis.suggestions)}):")
    for i, suggestion in enumerate(analysis.suggestions[:3], 1):
        print(f"    {i}. [{suggestion.section}] {suggestion.content}")
        print(f"       Priority: {suggestion.priority}, Impact: {suggestion.impact_score:.1f}")


def demo_job_intelligence():
    """Demonstrate intelligent job analysis."""
    print("\n" + "="*60)
    print("DEMO: Job Intelligence & Market Analysis")
    print("="*60)
    
    # Sample job data
    sample_jobs = [
        {
            "title": "Senior Python Developer",
            "company": "TechCorp",
            "location": "Remote",
            "salary_min": 140000,
            "description": "Looking for Python expert with AWS, Docker, Kubernetes experience",
            "posted_date": (datetime.utcnow() - timedelta(days=2)).isoformat()
        },
        {
            "title": "Backend Engineer",
            "company": "StartupXYZ",
            "location": "San Francisco, CA",
            "salary_min": 160000,
            "description": "Backend development with Go, PostgreSQL, microservices",
            "posted_date": (datetime.utcnow() - timedelta(days=1)).isoformat()
        },
        {
            "title": "Full Stack Developer",
            "company": "MegaCorp",
            "location": "New York, NY",
            "salary_min": 130000,
            "description": "React, Node.js, TypeScript, MongoDB experience required",
            "posted_date": (datetime.utcnow() - timedelta(days=5)).isoformat()
        },
    ]
    
    engine = get_intelligence_engine()
    
    # Market analysis
    print("\n✓ Analyzing job market...")
    insights = engine.analyze_job_market(sample_jobs, time_window_days=30)
    
    print(f"\n  Total Jobs: {insights.total_jobs}")
    print(f"  Active Companies: {insights.active_companies}")
    print(f"  Market Heat: {insights.market_heat:.1f}/100")
    
    print(f"\n  Top Skills in Demand:")
    for skill, count in insights.top_skills[:5]:
        print(f"    • {skill}: {count} mentions")
    
    if insights.salary_insights:
        salary = insights.salary_insights
        print(f"\n  Salary Insights:")
        print(f"    Range: ${salary.min_salary:,.0f} - ${salary.max_salary:,.0f}")
        print(f"    Median: ${salary.median_salary:,.0f}")
        print(f"    Average: ${salary.average_salary:,.0f}")
        
        low, high = salary.get_negotiation_range()
        print(f"    Negotiation Range: ${low:,.0f} - ${high:,.0f}")
        print(f"    Competitive Offer: ${salary.get_competitive_offer():,.0f}")
    
    # Intelligent ranking
    print("\n✓ Ranking jobs intelligently...")
    user_skills = ["python", "aws", "docker", "postgresql"]
    user_prefs = {
        "salary_min": 120000,
        "locations": ["Remote", "San Francisco"]
    }
    
    ranked_jobs = engine.rank_jobs_intelligently(
        sample_jobs,
        user_skills,
        user_prefs
    )
    
    print(f"\n  Ranked Jobs (by fit score):")
    for i, (job, score) in enumerate(ranked_jobs, 1):
        print(f"    {i}. {job['title']} at {job['company']}")
        print(f"       Score: {score:.1f}/100, Location: {job['location']}")


def demo_security_features():
    """Demonstrate security controls."""
    print("\n" + "="*60)
    print("DEMO: Security Controls (OWASP ASVS 5.0)")
    print("="*60)
    
    validator = get_input_validator()
    rate_limiter = get_rate_limiter()
    
    # Input validation
    print("\n✓ Input Validation:")
    
    # Valid email
    result, errors = validator.validate_email("user@example.com")
    print(f"  Email 'user@example.com': {result.value}")
    
    # Invalid email
    result, errors = validator.validate_email("invalid-email")
    print(f"  Email 'invalid-email': {result.value}")
    if errors:
        print(f"    Error: {errors[0].reason}")
    
    # URL validation
    result, errors = validator.validate_url(
        "https://jobs.company.com/careers",
        allowed_schemes=["https"]
    )
    print(f"\n  URL validation: {result.value}")
    
    # Injection detection
    suspicious_text = "'; DROP TABLE users; --"
    has_injection, patterns = validator.check_for_injection(suspicious_text)
    print(f"\n  Injection detection on suspicious input: {has_injection}")
    if patterns:
        print(f"    Detected: {patterns[0]}")
    
    # Rate limiting
    print("\n✓ Rate Limiting:")
    config = RateLimitConfig(max_requests=5, window_seconds=60)
    
    for i in range(7):
        allowed, metadata = rate_limiter.check_rate_limit("user123", config)
        status = "✓" if allowed else "✗"
        print(f"  Request {i+1}: {status} (Remaining: {metadata['remaining']})")


async def demo_resilience_patterns():
    """Demonstrate resilience patterns."""
    print("\n" + "="*60)
    print("DEMO: Resilience Patterns (Circuit Breaker & Retry)")
    print("="*60)
    
    # Create resilient scraper
    retry_config = RetryConfig(
        max_attempts=3,
        base_delay_seconds=0.5,
        strategy="exponential"
    )
    
    circuit_config = CircuitBreakerConfig(
        failure_threshold=3,
        timeout_seconds=30
    )
    
    scraper = ResilientScraper(
        name="demo_scraper",
        retry_config=retry_config,
        circuit_config=circuit_config
    )
    
    print("\n✓ Testing retry with exponential backoff:")
    
    attempt_count = [0]
    
    async def failing_function():
        """Simulated failing function."""
        attempt_count[0] += 1
        print(f"  Attempt {attempt_count[0]}")
        if attempt_count[0] < 3:
            raise Exception("Simulated failure")
        return "Success!"
    
    try:
        result = await scraper.execute_with_retry(failing_function)
        print(f"  Result: {result}")
    except Exception as e:
        print(f"  Failed: {e}")
    
    # Health monitoring
    print("\n✓ Health Monitoring:")
    health_monitor = get_health_monitor()
    
    # Record some attempts
    health_monitor.record_attempt("greenhouse", True, 1250.5)
    health_monitor.record_attempt("greenhouse", True, 1100.2)
    health_monitor.record_attempt("greenhouse", False, 5000.0, "Timeout")
    health_monitor.record_attempt("lever", True, 980.3)
    
    # Get health status
    all_health = health_monitor.get_all_health_statuses()
    print(f"  Monitored Scrapers: {len(all_health)}")
    for health in all_health:
        status_icon = "✓" if health.is_healthy else "✗"
        print(f"    {status_icon} {health.scraper_name}:")
        print(f"       Success Rate: {health.success_rate*100:.1f}%")
        print(f"       Avg Latency: {health.avg_latency_ms:.1f}ms")


def demo_observability():
    """Demonstrate observability features."""
    print("\n" + "="*60)
    print("DEMO: Observability & Metrics (Google SRE)")
    print("="*60)
    
    metrics = get_metrics_collector()
    
    # Record some metrics
    print("\n✓ Recording metrics...")
    metrics.record_counter("jobs.scraped.total", 42, {"source": "greenhouse"})
    metrics.record_gauge("active_scrapers", 5)
    metrics.record_histogram("resume.analysis.score", 87.5)
    
    # Get summary
    summary = metrics.get_metrics_summary()
    print(f"\n  Metrics Summary:")
    print(f"    Total Metrics: {summary['total_metrics']}")
    print(f"    Success Rate: {summary['success_rate']:.1f}%")
    print(f"    Metrics by Type: {json.dumps(summary['metrics_by_type'], indent=6)}")
    
    # Show SLOs
    print("\n✓ Service Level Objectives:")
    slos = get_slos()
    for slo in slos:
        print(f"\n  {slo.name}:")
        print(f"    Target: {slo.target_percentage}%")
        print(f"    Window: {slo.window_hours} hours")
        print(f"    Description: {slo.description}")


def main():
    """Run all demonstrations."""
    print("\n" + "="*60)
    print("JobSentinel Advanced Features Demo")
    print("Demonstrating World-Class Job Search Automation")
    print("="*60)
    
    # Run demos
    demo_industry_profiles()
    demo_resume_analysis()
    demo_job_intelligence()
    demo_security_features()
    
    # Run async demos
    print("\n✓ Running async demonstrations...")
    asyncio.run(demo_resilience_patterns())
    
    demo_observability()
    
    print("\n" + "="*60)
    print("Demo Complete!")
    print("="*60)
    print("\nKey Takeaways:")
    print("  ✓ 13 industry profiles for targeted resume optimization")
    print("  ✓ Intelligent job ranking with multi-factor scoring")
    print("  ✓ Comprehensive security controls (OWASP ASVS 5.0)")
    print("  ✓ Circuit breakers and retry strategies for reliability")
    print("  ✓ SLO-based observability following Google SRE principles")
    print("\nJobSentinel is production-ready for world-class job searching!")


if __name__ == "__main__":
    main()
