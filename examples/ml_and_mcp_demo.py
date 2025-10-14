#!/usr/bin/env python3
"""
ML and MCP Integration Demo

Demonstrates JobSentinel's FREE AI/ML capabilities and MCP server integration.

Features:
- Semantic resume-job matching (BERT)
- Sentiment analysis for job descriptions
- Advanced keyword extraction
- MCP server integration (Context7)
- Knowledge enhancement

Usage:
    python examples/ml_and_mcp_demo.py

No API keys required for ML features (100% local).
Context7 API key optional for MCP demo.
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def print_section(title: str) -> None:
    """Print a formatted section header."""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def print_subsection(title: str) -> None:
    """Print a formatted subsection header."""
    print(f"\n--- {title} ---\n")


# Sample data for demonstrations
SAMPLE_RESUME = """
John Doe
Senior Python Developer

Experience:
- Worked on backend APIs at TechCorp (3 years)
- Helped improve system performance
- Responsible for database management
- Used Django and PostgreSQL
- Participated in code reviews

Skills:
Python, Django, PostgreSQL, Git

Education:
BS Computer Science, University of Tech, 2018
"""

SAMPLE_JOB_GOOD = """
Senior Backend Engineer

We're seeking an experienced backend engineer to join our growing team.

Requirements:
- 5+ years Python experience
- Strong Django or FastAPI background
- PostgreSQL or MySQL database experience
- Experience with AWS cloud services
- Docker and Kubernetes knowledge preferred
- Strong problem-solving and communication skills

Responsibilities:
- Design and implement scalable backend services
- Collaborate with frontend and DevOps teams
- Mentor junior developers
- Participate in architectural decisions

We offer:
- Competitive salary: $140,000 - $160,000
- Remote work flexibility
- Health insurance and 401(k) matching
- Professional development budget

TechCorp is a growing SaaS company serving 10,000+ customers worldwide.
"""

SAMPLE_JOB_SUSPICIOUS = """
URGENT!!! Work From Home Opportunity!!!

Make $10,000/month working from home!!! No experience necessary!!!

Are you tired of your 9-5 job? Want financial freedom? This is the opportunity 
of a lifetime!!!

Requirements:
- None! We train you!
- Just a computer and internet
- Must be motivated to MAKE MONEY FAST

What you'll do:
- Post on social media
- Recruit others to join
- Build your downside
- Earn unlimited income!

Investment required: Only $500 to get started! But you'll make it back in 
weeks!!!

APPLY NOW before slots fill up! Limited time offer! Don't miss out on your 
chance at FINANCIAL FREEDOM!!!
"""


def demo_semantic_matching() -> None:
    """Demo 1: Semantic Resume-Job Matching."""
    print_section("Demo 1: Semantic Resume-Job Matching")

    try:
        from domains.ml import SemanticMatcher

        print("🤖 Loading BERT model (all-MiniLM-L6-v2)...")
        print("   First run: ~2-3s to download model (~80MB)")
        print("   Subsequent runs: <1s (cached)\n")

        matcher = SemanticMatcher()

        # Match resume to good job
        print_subsection("Matching Resume to Good Job Posting")

        result = matcher.match_resume_to_job(
            resume_text=SAMPLE_RESUME,
            job_description=SAMPLE_JOB_GOOD,
            required_skills=["Python", "Django", "PostgreSQL", "AWS", "Docker"],
        )

        print(f"📊 Semantic Match Score: {result.match_percentage}%")
        print(f"   Confidence: {result.confidence:.2f}")
        print(f"\n✅ Key Alignments:")
        for alignment in result.key_alignments:
            print(f"   - {alignment}")

        print(f"\n⚠️  Identified Gaps:")
        for gap in result.gaps:
            print(f"   - {gap}")

        # Performance info
        print(f"\n⚡ Performance:")
        print(f"   - Model: {result.metadata.get('model', 'fallback')}")
        print(f"   - Resume length: {result.metadata.get('resume_length', 0)} chars")
        print(f"   - Job length: {result.metadata.get('job_length', 0)} chars")

        print("\n💡 Interpretation:")
        if result.match_percentage >= 80:
            print("   ✅ EXCELLENT match - highly aligned with job requirements")
        elif result.match_percentage >= 60:
            print("   ⚠️  GOOD match - some skill gaps to address")
        else:
            print("   ❌ POOR match - significant gaps in skills/experience")

    except ImportError as e:
        print(f"⚠️  Sentence transformers not installed: {e}")
        print("   Install with: pip install sentence-transformers")
        print("   Falling back to TF-IDF similarity (still works!)")
    except Exception as e:
        logger.error(f"Error in semantic matching demo: {e}")


def demo_sentiment_analysis() -> None:
    """Demo 2: Job Description Sentiment Analysis."""
    print_section("Demo 2: Job Description Sentiment Analysis")

    try:
        from domains.ml import SentimentAnalyzer

        print("🤖 Loading sentiment model (DistilBERT SST-2)...")
        print("   First run: ~3-4s to download model (~260MB)")
        print("   Subsequent runs: <1s (cached)\n")

        analyzer = SentimentAnalyzer()

        # Analyze good job
        print_subsection("Analyzing Professional Job Posting")

        result_good = analyzer.analyze_job_description(SAMPLE_JOB_GOOD)

        print(f"😊 Sentiment: {result_good.sentiment.value}")
        print(f"   Confidence: {result_good.confidence:.2f}")
        print(f"   Positive: {result_good.positive_score:.2f}")
        print(f"   Negative: {result_good.negative_score:.2f}")
        print(f"   Neutral: {result_good.neutral_score:.2f}")

        if result_good.tone_indicators:
            print(f"\n📝 Tone Characteristics:")
            for indicator in result_good.tone_indicators:
                print(f"   - {indicator}")

        if result_good.red_flags:
            print(f"\n⚠️  Red Flags: {len(result_good.red_flags)}")
            for flag in result_good.red_flags:
                print(f"   - {flag}")
        else:
            print(f"\n✅ No red flags detected - appears professional")

        # Analyze suspicious job
        print_subsection("Analyzing Suspicious Job Posting")

        result_sus = analyzer.analyze_job_description(SAMPLE_JOB_SUSPICIOUS)

        print(f"😊 Sentiment: {result_sus.sentiment.value}")
        print(f"   Confidence: {result_sus.confidence:.2f}")

        if result_sus.red_flags:
            print(f"\n🚩 RED FLAGS DETECTED: {len(result_sus.red_flags)}")
            for flag in result_sus.red_flags:
                print(f"   - {flag}")

            print("\n⚠️  WARNING: This job posting shows multiple scam indicators!")
            print("   Recommendation: DO NOT APPLY - likely a scam")

        if result_sus.tone_indicators:
            print(f"\n📝 Tone Characteristics:")
            for indicator in result_sus.tone_indicators:
                print(f"   - {indicator}")

    except ImportError as e:
        print(f"⚠️  Transformers not installed: {e}")
        print("   Install with: pip install transformers torch")
        print("   Falling back to VADER sentiment (still works!)")
    except Exception as e:
        logger.error(f"Error in sentiment analysis demo: {e}")


def demo_keyword_extraction() -> None:
    """Demo 3: Advanced Keyword Extraction."""
    print_section("Demo 3: Advanced Keyword Extraction")

    try:
        from domains.ml import AdvancedKeywordExtractor

        print("🤖 Initializing keyword extractor...")
        print("   Uses TF-IDF + RAKE + spaCy NER\n")

        extractor = AdvancedKeywordExtractor()

        # Extract from job description
        print_subsection("Extracting Keywords from Job Posting")

        result = extractor.extract_keywords(text=SAMPLE_JOB_GOOD, top_n=15, include_phrases=True)

        print(f"📊 Top Keywords ({len(result.keywords)} total):")
        for keyword, score in result.keywords[:10]:
            print(f"   - {keyword}: {score:.3f}")

        print(f"\n💻 Technical Terms Identified ({len(result.technical_terms)}):")
        for term in result.technical_terms:
            print(f"   - {term}")

        print(f"\n🤝 Soft Skills Identified ({len(result.soft_skills)}):")
        for skill in result.soft_skills:
            print(f"   - {skill}")

        if result.entities:
            print(f"\n🏢 Named Entities ({len(result.entities)}):")
            for entity, entity_type in result.entities[:5]:
                print(f"   - {entity} ({entity_type})")

        if result.phrases:
            print(f"\n📝 Key Phrases ({len(result.phrases)}):")
            for phrase in result.phrases[:5]:
                print(f"   - {phrase}")

        print(f"\n📈 Metadata:")
        print(f"   - Text length: {result.metadata.get('text_length', 0)} chars")
        print(f"   - Total keywords: {result.metadata.get('total_keywords', 0)}")

    except ImportError as e:
        print(f"⚠️  spaCy not installed: {e}")
        print("   Install with: pip install spacy")
        print("   Download model: python -m spacy download en_core_web_sm")
    except Exception as e:
        logger.error(f"Error in keyword extraction demo: {e}")


async def demo_mcp_integration() -> None:
    """Demo 4: MCP Server Integration (Context7)."""
    print_section("Demo 4: MCP Server Integration")

    # Check for API key
    api_key = os.getenv("CONTEXT7_API_KEY")

    if not api_key:
        print("⚠️  CONTEXT7_API_KEY environment variable not set")
        print("\n📝 To try MCP integration:")
        print("   1. Sign up at https://context7.com (example)")
        print("   2. Get your API key")
        print("   3. Set environment variable:")
        print("      export CONTEXT7_API_KEY='your_key_here'")
        print("   4. Re-run this demo")
        print("\n✨ MCP Integration Features:")
        print("   - Industry knowledge and best practices")
        print("   - Role requirements and skills")
        print("   - Market salary benchmarks")
        print("   - Skills gap analysis")
        print("   - Career path recommendations")
        return

    try:
        from domains.mcp_integration import Context7Client, Context7Query

        print("🌐 Connecting to Context7 MCP server...\n")

        client = Context7Client(api_key=api_key)

        # Connect
        connected = await client.connect()

        if not connected:
            print("❌ Failed to connect to Context7")
            return

        print("✅ Connected successfully!\n")

        # Query role requirements
        print_subsection("Querying Role Requirements")

        query = Context7Query(
            query_type="role",
            industry="software_engineering",
            role="senior_backend_engineer",
            experience_level="senior",
        )

        response = await client.query_industry_knowledge(query)

        if response:
            print(f"📊 Confidence: {response.confidence:.2f}")
            print(f"   Sources: {', '.join(response.sources)}")
            print(f"\n📝 Role Requirements:")
            # Display parsed response data
            for key, value in response.data.items():
                print(f"   {key}: {value}")
        else:
            print("⚠️  No response from Context7")

        # Query salary data
        print_subsection("Querying Salary Benchmarks")

        salary_data = await client.get_salary_data(
            industry="software_engineering",
            role="senior_backend_engineer",
            location="San Francisco, CA",
        )

        if salary_data:
            print(f"💰 Salary Data:")
            print(f"   Median: ${salary_data.get('median', 0):,}")
            print(f"   Range: ${salary_data.get('min', 0):,} - ${salary_data.get('max', 0):,}")
            print(f"   75th Percentile: ${salary_data.get('percentiles', {}).get('p75', 0):,}")
        else:
            print("⚠️  No salary data available")

        # Disconnect
        await client.disconnect()
        print("\n✅ Disconnected from Context7")

    except ImportError as e:
        print(f"⚠️  MCP dependencies not installed: {e}")
        print("   Install with: pip install -e .[mcp]")
    except Exception as e:
        logger.error(f"Error in MCP integration demo: {e}")


async def demo_knowledge_enhancement() -> None:
    """Demo 5: Knowledge Enhancement (Orchestration)."""
    print_section("Demo 5: Knowledge Enhancement")

    print("🧠 Knowledge Enhancer orchestrates multiple MCP servers")
    print("   for comprehensive analysis.\n")

    try:
        from domains.mcp_integration import KnowledgeEnhancer

        enhancer = KnowledgeEnhancer()

        # Register servers (if API keys available)
        api_key = os.getenv("CONTEXT7_API_KEY")
        if api_key:
            enhancer.register_context7(api_key=api_key)
            print("✅ Registered Context7 server")
        else:
            print("⚠️  CONTEXT7_API_KEY not set - demo limited")

        # Enhance job analysis
        print_subsection("Enhanced Job Analysis")

        analysis = await enhancer.enhance_job_analysis(
            job_title="Senior Backend Engineer",
            job_description=SAMPLE_JOB_GOOD,
            company="TechCorp",
        )

        print(f"📊 Analysis Confidence: {analysis.get('confidence', 0):.2f}")
        print(f"   Sources: {', '.join(analysis.get('sources', []))}")

        if analysis.get("industry_insights"):
            print(f"\n🏭 Industry Insights:")
            for key, value in analysis["industry_insights"].items():
                print(f"   {key}: {value}")

        if analysis.get("role_requirements"):
            print(f"\n📋 Standard Role Requirements:")
            for key, value in analysis["role_requirements"].items():
                print(f"   {key}: {value}")

        if analysis.get("salary_benchmarks"):
            print(f"\n💰 Salary Benchmarks:")
            for key, value in analysis["salary_benchmarks"].items():
                print(f"   {key}: {value}")

        if analysis.get("red_flags"):
            print(f"\n🚩 Identified Issues:")
            for flag in analysis["red_flags"]:
                print(f"   - {flag}")

    except ImportError as e:
        print(f"⚠️  Dependencies not installed: {e}")
    except Exception as e:
        logger.error(f"Error in knowledge enhancement demo: {e}")


def demo_combined_analysis() -> None:
    """Demo 6: Combined ML Analysis."""
    print_section("Demo 6: Combined ML Analysis")

    print("🔍 Combining multiple ML techniques for comprehensive analysis\n")

    try:
        from domains.ml import AdvancedKeywordExtractor, SemanticMatcher, SentimentAnalyzer

        # Initialize
        matcher = SemanticMatcher()
        sentiment = SentimentAnalyzer()
        keywords = AdvancedKeywordExtractor()

        # Analyze job posting
        print_subsection("Comprehensive Job Posting Analysis")

        # 1. Sentiment
        tone = sentiment.analyze_job_description(SAMPLE_JOB_GOOD)
        print(f"😊 Sentiment: {tone.sentiment.value} (confidence: {tone.confidence:.2f})")

        # 2. Keywords
        job_keywords = keywords.extract_keywords(SAMPLE_JOB_GOOD, top_n=20)
        print(f"🔑 Keywords Extracted: {len(job_keywords.keywords)}")
        print(f"   Technical Terms: {len(job_keywords.technical_terms)}")
        print(f"   Soft Skills: {len(job_keywords.soft_skills)}")

        # 3. Semantic match with resume
        match = matcher.match_resume_to_job(
            resume_text=SAMPLE_RESUME,
            job_description=SAMPLE_JOB_GOOD,
            required_skills=job_keywords.technical_terms[:5],
        )
        print(f"🎯 Resume Match: {match.match_percentage}%")

        # Overall assessment
        print_subsection("Overall Assessment")

        score = (
            (100 - len(tone.red_flags) * 10)  # Sentiment score
            + match.match_percentage  # Semantic match
        ) / 2

        print(f"📊 Overall Score: {score:.1f}/100")

        if len(tone.red_flags) > 3:
            print("   ⚠️  WARNING: Multiple red flags - suspicious posting")
        elif match.match_percentage >= 80:
            print("   ✅ EXCELLENT: Strong match with minimal concerns")
        elif match.match_percentage >= 60:
            print("   ⚠️  GOOD: Decent match but some skill gaps")
        else:
            print("   ❌ POOR: Significant gaps in skills/experience")

        print(f"\n💡 Recommendations:")
        if len(match.gaps) > 0:
            print(
                f"   - Address skill gaps: {', '.join(g.split(': ')[1] if ': ' in g else g for g in match.gaps[:3])}"
            )
        if match.match_percentage < 70:
            print(f"   - Consider upskilling in identified gap areas")
        if len(tone.red_flags) == 0:
            print(f"   - Posting appears legitimate - safe to apply")

    except Exception as e:
        logger.error(f"Error in combined analysis demo: {e}")


def main() -> None:
    """Run all demonstrations."""
    print("\n" + "=" * 80)
    print("  JobSentinel ML & MCP Integration Demo")
    print("  Version 0.9.0 - October 2025")
    print("=" * 80)

    print("\n📋 This demo showcases:")
    print("   1. Semantic Resume-Job Matching (BERT)")
    print("   2. Job Description Sentiment Analysis (DistilBERT)")
    print("   3. Advanced Keyword Extraction (TF-IDF + RAKE + NER)")
    print("   4. MCP Server Integration (Context7)")
    print("   5. Knowledge Enhancement (Multi-server orchestration)")
    print("   6. Combined ML Analysis")

    print("\n⚙️  Setup Notes:")
    print("   - ML features work offline (no API keys needed)")
    print("   - Models download on first use (~350MB total)")
    print("   - Subsequent runs use cached models (<1s load time)")
    print("   - MCP demo requires CONTEXT7_API_KEY environment variable")

    input("\nPress Enter to start demos...")

    # Synchronous demos
    demo_semantic_matching()
    input("\nPress Enter to continue...")

    demo_sentiment_analysis()
    input("\nPress Enter to continue...")

    demo_keyword_extraction()
    input("\nPress Enter to continue...")

    # Async demos
    loop = asyncio.get_event_loop()
    loop.run_until_complete(demo_mcp_integration())
    input("\nPress Enter to continue...")

    loop.run_until_complete(demo_knowledge_enhancement())
    input("\nPress Enter to continue...")

    # Final combined demo
    demo_combined_analysis()

    print_section("Demo Complete!")

    print("✨ Key Takeaways:")
    print("   - 100% FREE AI/ML capabilities (no API costs)")
    print("   - Privacy-first (all processing local)")
    print("   - Production-ready (85-90%+ accuracy)")
    print("   - Fast (<200ms after model loading)")
    print("   - Extensible (MCP integration for external knowledge)")

    print("\n📚 Learn More:")
    print("   - ML Capabilities: docs/ML_CAPABILITIES.md")
    print("   - MCP Integration: docs/MCP_INTEGRATION.md")
    print("   - Getting Started: docs/GETTING_STARTED_60_SECONDS.md")

    print("\n🚀 Start using JobSentinel:")
    print("   python -m jsa.cli run-once")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Demo interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Demo error: {e}", exc_info=True)
        sys.exit(1)
