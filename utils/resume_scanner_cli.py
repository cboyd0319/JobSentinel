#!/usr/bin/env python3
"""
DEPRECATED CLI (legacy): Use `scripts/ats_cli.py` (Python) or `scripts/ats_cli.ps1` (PowerShell)
with the new modular analyzer instead of this legacy interface.

Historical Usage:
    python resume_scanner_cli.py scan resume.pdf
    python resume_scanner_cli.py scan resume.pdf --job-description job.txt --output report.html
"""

import argparse
import sys
from pathlib import Path

try:
    from .ultimate_ats_scanner import UltimateATSScanner, create_detailed_report
except ImportError:
    # Handle case where this is run directly
    sys.path.append(str(Path(__file__).parent))
    from ultimate_ats_scanner import UltimateATSScanner, create_detailed_report

try:
    from .resume_enhancer import ResumeEnhancer, create_resume_resources_guide
except ImportError:
    from resume_enhancer import ResumeEnhancer, create_resume_resources_guide


def scan_resume(args):
    """Scan a resume for ATS compatibility."""
    resume_path = args.resume_path
    job_description = None
    
    # Load job description if provided
    if args.job_description:
        try:
            with open(args.job_description, 'r', encoding='utf-8') as f:
                job_description = f.read()
        except Exception as e:
            print(f"⚠️ Warning: Could not read job description file: {e}")
    
    try:
        print(f"🔍 Scanning resume: {resume_path}")
        if job_description:
            print("📋 Using job description for targeted analysis")
        
        # Initialize scanner
        scanner = UltimateATSScanner(resume_path, job_description)
        
        # Perform comprehensive scan
        results = scanner.scan_comprehensive()
        
        # Display results
        print(f"\\n{'='*60}")
        print(f"🎯 ATS COMPATIBILITY REPORT")
        print(f"{'='*60}")
        
        # Overall score with visual indicator
        score = results.overall_score
        if score >= 90:
            score_indicator = "🟢 EXCELLENT"
        elif score >= 80:
            score_indicator = "🟡 GOOD"
        elif score >= 70:
            score_indicator = "🟠 FAIR"
        elif score >= 60:
            score_indicator = "🔴 POOR"
        else:
            score_indicator = "⚫ CRITICAL"
            
        print(f"\\nOverall ATS Score: {score:.1f}% {score_indicator}")
        
        if results.market_percentile:
            print(f"Market Percentile: {results.market_percentile:.1f}%")
        print(f"Improvement Potential: +{results.improvement_potential:.1f} points")
        
        # Component scores
        print(f"\\n📊 Component Breakdown:")
        print(f"  • Parsing Compatibility: {results.parsing_score:.1f}%")
        print(f"  • Keyword Optimization: {results.keyword_score:.1f}%")
        print(f"  • Format Compatibility: {results.formatting_score:.1f}%")
        print(f"  • Structure Quality: {results.structure_score:.1f}%")
        print(f"  • Readability: {results.readability_score:.1f}%")
        print(f"  • File Metadata: {results.metadata_score:.1f}%")
        
        # Critical issues
        critical_issues = [i for i in results.issues if i.level.value == "critical"]
        high_issues = [i for i in results.issues if i.level.value == "high"]
        
        if critical_issues:
            print(f"\\n🚨 CRITICAL ISSUES ({len(critical_issues)}) - Fix These First:")
            for issue in critical_issues[:5]:
                print(f"  ❌ {issue.title}")
                print(f"     {issue.fix_suggestion}")
                print()
        
        if high_issues:
            print(f"\\n⚠️ HIGH PRIORITY ISSUES ({len(high_issues)}):")
            for issue in high_issues[:3]:
                print(f"  🔸 {issue.title}")
                print(f"     {issue.fix_suggestion}")
                print()
        
        # Top recommendations
        print(f"\\n💡 TOP RECOMMENDATIONS:")
        for i, rec in enumerate(results.recommendations[:5], 1):
            print(f"  {i}. {rec}")
        
        # Missing sections
        if results.missing_sections:
            print(f"\\n📝 Missing Sections:")
            for section in results.missing_sections:
                print(f"  • {section.title()}")
        
        # Keywords analysis summary
        if results.keyword_analysis:
            found_keywords = len([k for k in results.keyword_analysis.values() if k.found_count > 0])
            total_keywords = len(results.keyword_analysis)
            print(f"\\n🔍 Keyword Analysis:")
            print(f"  • Found: {found_keywords}/{total_keywords} target keywords")
            
            # Show missing high-value keywords
            missing_keywords = [
                k for k, v in results.keyword_analysis.items() 
                if v.found_count == 0 and v.recommended_frequency > 0
            ]
            if missing_keywords:
                print(f"  • Missing: {', '.join(missing_keywords[:5])}")
        
        # ATS system compatibility
        if results.system_compatibility:
            print(f"\\n🏢 ATS System Compatibility:")
            for system, compat in results.system_compatibility.items():
                status = "✅" if compat >= 80 else "⚠️" if compat >= 60 else "❌"
                print(f"  {status} {system.value.title()}: {compat:.1f}%")
        
        # Generate detailed report if requested
        if args.output:
            print(f"\\n📄 Generating detailed HTML report...")
            create_detailed_report(results, args.output)
            print(f"✅ Detailed report saved to: {args.output}")
        
        # Final recommendation
        print(f"\\n{'='*60}")
        if score >= 85:
            print("🎉 Great job! Your resume is well-optimized for ATS systems.")
        elif score >= 70:
            print("👍 Your resume is decent but has room for improvement.")
        elif score >= 50:
            print("⚠️ Your resume needs significant improvements to pass ATS screening.")
        else:
            print("🚨 Your resume requires major revisions before submitting to jobs.")
        
        print("\\n💁 Pro Tip: Run 'python resume_scanner_cli.py resources' for optimization tips")
        
    except FileNotFoundError as e:
        print(f"❌ Error: {e}")
        return 1
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        print("\\n🔧 Troubleshooting:")
        print("  • Ensure your resume is a text-based PDF or DOCX file")
        print("  • Try converting scanned PDFs to text-based format")
        print("  • Check that all required dependencies are installed")
        return 1
    
    return 0


def enhance_resume(args):
    """Provide resume enhancement suggestions."""
    try:
        enhancer = ResumeEnhancer()
        
        job_description = None
        if args.job_description:
            with open(args.job_description, 'r', encoding='utf-8') as f:
                job_description = f.read()
        
        print(f"🚀 Analyzing resume for enhancement opportunities...")
        analysis = enhancer.analyze_resume(args.resume_path, job_description)
        
        print(f"\\n{'='*60}")
        print(f"📈 RESUME ENHANCEMENT ANALYSIS")
        print(f"{'='*60}")
        
        print(f"\\nCurrent Score: {analysis.current_score:.1f}%")
        print(f"Potential Score: {analysis.potential_score:.1f}%")
        print(f"Improvement Opportunity: +{analysis.potential_score - analysis.current_score:.1f} points")
        
        if analysis.industry_match:
            print(f"\\nDetected Industry: {analysis.industry_match.replace('_', ' ').title()}")
        print(f"Recommended Template: {analysis.recommended_template.value.replace('_', ' ').title()}")
        
        print(f"\\n🎯 ENHANCEMENT SUGGESTIONS:")
        for i, suggestion in enumerate(analysis.suggestions[:10], 1):
            priority_icon = "🔥" if suggestion.priority == 1 else "⚡" if suggestion.priority == 2 else "💡"
            print(f"  {priority_icon} {suggestion.content}")
            print(f"     Reason: {suggestion.reason}")
            print()
        
        if analysis.strong_sections:
            print(f"\\n✅ Strong Sections:")
            for section in analysis.strong_sections:
                print(f"  • {section.replace('_', ' ').title()}")
        
        if analysis.weak_sections:
            print(f"\\n⚠️ Sections Needing Improvement:")
            for section in analysis.weak_sections:
                print(f"  • {section.replace('_', ' ').title()}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0


def show_resources(args):
    """Show resume resources and best practices."""
    guide = create_resume_resources_guide()
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(guide)
        print(f"✅ Resume resources guide saved to: {args.output}")
    else:
        print(guide)
    
    return 0


def generate_template(args):
    """Generate a resume template."""
    try:
        from .resume_enhancer import ResumeTemplate
        
        enhancer = ResumeEnhancer()
        template_type = ResumeTemplate(args.type)
        
        print(f"📝 Generating {template_type.value.replace('_', ' ').title()} template...")
        
        template_content = enhancer.generate_resume_template(
            template_type, args.industry, args.level
        )
        
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(template_content)
            print(f"✅ Template saved to: {args.output}")
        else:
            print(template_content)
        
        print(f"\\n💡 Next Steps:")
        print(f"  1. Fill in your personal information and experience")
        print(f"  2. Customize content for target job/industry") 
        print(f"  3. Run 'scan' command to check ATS compatibility")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0


def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(
        description="Ultimate Resume Scanner & Enhancement Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Scan a resume for ATS compatibility
  python resume_scanner_cli.py scan my_resume.pdf
  
  # Scan with job description for targeted analysis  
  python resume_scanner_cli.py scan my_resume.pdf --job-description job.txt
  
  # Generate detailed HTML report
  python resume_scanner_cli.py scan my_resume.pdf --output report.html
  
  # Get enhancement suggestions
  python resume_scanner_cli.py enhance my_resume.pdf --job-description job.txt
  
  # Generate ATS-optimized template
  python resume_scanner_cli.py template --type ats_optimized --industry software_engineering
  
  # Show resources and best practices
  python resume_scanner_cli.py resources
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Scan command
    scan_parser = subparsers.add_parser(
        "scan", 
        help="Scan resume for ATS compatibility",
        description="Analyze your resume for ATS compatibility and get actionable improvement suggestions"
    )
    scan_parser.add_argument("resume_path", help="Path to resume file (PDF, DOCX, TXT)")
    scan_parser.add_argument(
        "--job-description", "-j",
        help="Path to job description file for targeted analysis"
    )
    scan_parser.add_argument(
        "--output", "-o",
        help="Path to save detailed HTML report"
    )
    scan_parser.set_defaults(func=scan_resume)
    
    # Enhance command
    enhance_parser = subparsers.add_parser(
        "enhance",
        help="Get resume enhancement suggestions",
        description="Analyze your resume and get specific suggestions for improvement"
    )
    enhance_parser.add_argument("resume_path", help="Path to resume file")
    enhance_parser.add_argument(
        "--job-description", "-j",
        help="Path to job description file for targeted suggestions"
    )
    enhance_parser.set_defaults(func=enhance_resume)
    
    # Template command
    template_parser = subparsers.add_parser(
        "template",
        help="Generate resume template",
        description="Generate a professionally designed, ATS-optimized resume template"
    )
    template_parser.add_argument(
        "--type", "-t",
        choices=["ats_optimized", "technical", "executive", "entry_level", "creative", "career_change"],
        default="ats_optimized",
        help="Type of template to generate"
    )
    template_parser.add_argument(
        "--industry", "-i",
        help="Target industry for customization"
    )
    template_parser.add_argument(
        "--level", "-l",
        choices=["entry", "mid", "senior", "executive"],
        default="mid",
        help="Experience level"
    )
    template_parser.add_argument(
        "--output", "-o",
        help="Path to save template file"
    )
    template_parser.set_defaults(func=generate_template)
    
    # Resources command
    resources_parser = subparsers.add_parser(
        "resources",
        help="Show resume resources and best practices",
        description="Display comprehensive guide to resume optimization and ATS best practices"
    )
    resources_parser.add_argument(
        "--output", "-o",
        help="Path to save resources guide"
    )
    resources_parser.set_defaults(func=show_resources)
    
    args = parser.parse_args()
    
    if not args.command:
        print("🎯 Ultimate Resume Scanner & Enhancement Tool")
        print("=" * 50)
        print()
        print("Commands:")
        print("  scan      - Analyze resume for ATS compatibility")
        print("  enhance   - Get targeted improvement suggestions")
        print("  template  - Generate optimized resume template")
        print("  resources - Show best practices guide")
        print()
        print("Quick start:")
        print("  python resume_scanner_cli.py scan your_resume.pdf")
        print()
        print("For detailed help on any command:")
        print("  python resume_scanner_cli.py COMMAND --help")
        return 1
    
    return args.func(args)


if __name__ == "__main__":
    exit(main())