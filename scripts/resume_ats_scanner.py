#!/usr/bin/env python3
"""
Ultimate Resume ATS Scanner & Optimizer

A comprehensive, user-friendly resume analysis tool designed for job seekers
with zero technical knowledge. Provides enterprise-grade ATS compatibility
analysis with actionable recommendations.
"""

import sys
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import re
import tempfile
import webbrowser
from datetime import datetime

# Configure logging for user-friendly output
logging.basicConfig(level=logging.WARNING)  # Suppress debug messages
logger = logging.getLogger(__name__)

class ATSCompatibilityLevel(Enum):
    """ATS compatibility levels with clear descriptions."""
    EXCELLENT = "excellent"  # 90-100%
    GOOD = "good"           # 80-89%
    FAIR = "fair"           # 70-79%
    POOR = "poor"           # 60-69%
    CRITICAL = "critical"   # <60%

class IssueLevel(Enum):
    """Issue severity levels."""
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"

@dataclass
class ATSIssue:
    """Represents an ATS compatibility issue."""
    level: IssueLevel
    category: str
    title: str
    description: str
    fix_suggestion: str
    impact_score: int  # 1-10, how much this affects ATS score

@dataclass
class KeywordAnalysis:
    """Keyword analysis results."""
    found_keywords: List[str]
    missing_keywords: List[str]
    keyword_density: float
    industry_match_score: float
    recommendations: List[str]

@dataclass
class ResumeSection:
    """Information about a resume section."""
    name: str
    present: bool
    quality_score: float
    word_count: int
    issues: List[str]

@dataclass
class ATSCompatibilityReport:
    """Complete ATS compatibility analysis report."""
    overall_score: float
    compatibility_level: ATSCompatibilityLevel
    market_percentile: float
    improvement_potential: float
    
    # Component scores
    parsing_score: float
    keyword_score: float
    formatting_score: float
    structure_score: float
    readability_score: float
    
    # Detailed analysis
    sections: Dict[str, ResumeSection]
    keyword_analysis: KeywordAnalysis
    issues: List[ATSIssue]
    recommendations: List[str]
    
    # File metadata
    file_path: str
    file_size: int
    word_count: int
    analysis_date: str

class UltimateResumeScanner:
    """
    Enterprise-grade resume ATS scanner.
    
    Designed for users with zero technical knowledge.
    Provides comprehensive analysis and actionable recommendations.
    """
    
    # ATS-friendly fonts
    ATS_SAFE_FONTS = {
        'Arial', 'Calibri', 'Cambria', 'Georgia', 'Helvetica',
        'Times New Roman', 'Trebuchet MS', 'Verdana'
    }
    
    # Expected resume sections
    REQUIRED_SECTIONS = {
        'contact': ['contact', 'personal', 'info'],
        'summary': ['summary', 'objective', 'profile'],
        'experience': ['experience', 'work', 'employment', 'professional'],
        'education': ['education', 'academic', 'degree'],
        'skills': ['skills', 'technical', 'competencies'],
    }
    
    OPTIONAL_SECTIONS = {
        'projects': ['projects', 'portfolio'],
        'certifications': ['certifications', 'certificates', 'licenses'],
        'achievements': ['achievements', 'awards', 'accomplishments'],
        'publications': ['publications', 'papers', 'articles'],
        'languages': ['languages'],
        'volunteer': ['volunteer', 'community', 'service']
    }
    
    # ATS problematic elements
    PROBLEMATIC_PATTERNS = {
        'tables': r'<table|<tr|<td|\|.*\|',
        'text_boxes': r'text[-_]?box|textbox',
        'headers_footers': r'header|footer',
        'images': r'<img|image|photo|picture',
        'graphics': r'graphic|shape|drawing|chart',
        'columns': r'column|multi[-_]?column',
        'special_chars': r'[★☆♦♠♣♥▪▫◦•▲►◆■□▼◄]',
    }
    
    # Action verbs for impact assessment
    ACTION_VERBS = {
        'achieved', 'managed', 'led', 'developed', 'created', 'improved',
        'increased', 'decreased', 'implemented', 'designed', 'built',
        'analyzed', 'coordinated', 'executed', 'established', 'streamlined',
        'optimized', 'delivered', 'launched', 'transformed', 'innovated'
    }
    
    def __init__(self):
        """Initialize the scanner."""
        self.resume_text = ""
        self.file_path = ""
        self.file_size = 0
        self.word_count = 0
        self.issues = []
        self.recommendations = []
        
    def scan_resume(
        self, 
        resume_path: Union[str, Path],
        job_description: Optional[str] = None,
        industry: Optional[str] = None
    ) -> ATSCompatibilityReport:
        """
        Perform comprehensive ATS compatibility scan.
        
        Args:
            resume_path: Path to resume file (PDF, DOCX, or TXT)
            job_description: Optional job description for targeted analysis
            industry: Optional industry context
            
        Returns:
            ATSCompatibilityReport with detailed analysis
        """
        resume_path = Path(resume_path)
        self.file_path = str(resume_path)
        
        if not resume_path.exists():
            raise FileNotFoundError(f"Resume file not found: {resume_path}")
        
        self.file_size = resume_path.stat().st_size
        
        # Extract text from resume
        self.resume_text = self._extract_text(resume_path)
        self.word_count = len(self.resume_text.split())
        
        # Reset analysis state
        self.issues = []
        self.recommendations = []
        
        # Perform analysis
        parsing_score = self._analyze_parsing_compatibility()
        formatting_score = self._analyze_formatting()
        structure_score = self._analyze_structure()
        readability_score = self._analyze_readability()
        
        # Keyword analysis
        keyword_analysis = self._analyze_keywords(job_description, industry)
        keyword_score = keyword_analysis.industry_match_score
        
        # Section analysis
        sections = self._analyze_sections()
        
        # Calculate overall score
        component_scores = {
            'parsing': parsing_score,
            'keywords': keyword_score,
            'formatting': formatting_score,
            'structure': structure_score,
            'readability': readability_score
        }
        
        # Weighted average (parsing and keywords are most important for ATS)
        weights = {
            'parsing': 0.30,
            'keywords': 0.25,
            'formatting': 0.20,
            'structure': 0.15,
            'readability': 0.10
        }
        
        overall_score = sum(score * weights[component] 
                          for component, score in component_scores.items())
        
        # Determine compatibility level
        compatibility_level = self._get_compatibility_level(overall_score)
        
        # Calculate market percentile (approximate)
        market_percentile = min(95, max(5, overall_score - 5))
        
        # Calculate improvement potential
        improvement_potential = min(100 - overall_score, 30)
        
        # Generate final recommendations
        self._generate_final_recommendations(overall_score, sections, keyword_analysis)
        
        # Create report
        report = ATSCompatibilityReport(
            overall_score=overall_score,
            compatibility_level=compatibility_level,
            market_percentile=market_percentile,
            improvement_potential=improvement_potential,
            parsing_score=parsing_score,
            keyword_score=keyword_score,
            formatting_score=formatting_score,
            structure_score=structure_score,
            readability_score=readability_score,
            sections=sections,
            keyword_analysis=keyword_analysis,
            issues=self.issues,
            recommendations=self.recommendations,
            file_path=self.file_path,
            file_size=self.file_size,
            word_count=self.word_count,
            analysis_date=datetime.now().isoformat()
        )
        
        return report
    
    def _extract_text(self, file_path: Path) -> str:
        """Extract text from resume file."""
        suffix = file_path.suffix.lower()
        
        try:
            if suffix == '.txt':
                return file_path.read_text(encoding='utf-8')
            elif suffix == '.pdf':
                return self._extract_pdf_text(file_path)
            elif suffix in ['.docx', '.doc']:
                return self._extract_docx_text(file_path)
            else:
                raise ValueError(f"Unsupported file format: {suffix}")
        except Exception as e:
            self.issues.append(ATSIssue(
                level=IssueLevel.CRITICAL,
                category="file_reading",
                title="Cannot Read Resume File",
                description=f"Failed to extract text from resume: {e}",
                fix_suggestion="Ensure the file is not corrupted and is in a supported format (PDF, DOCX, TXT)",
                impact_score=10
            ))
            return ""
    
    def _extract_pdf_text(self, file_path: Path) -> str:
        """Extract text from PDF file."""
        try:
            # Try pdfplumber first (better formatting preservation)
            import pdfplumber
            text = ""
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            return text
        except ImportError:
            pass
        
        try:
            # Fall back to pdfminer
            from pdfminer.high_level import extract_text
            return extract_text(str(file_path))
        except ImportError:
            pass
        
        # If all else fails, suggest manual conversion
        self.issues.append(ATSIssue(
            level=IssueLevel.CRITICAL,
            category="dependencies",
            title="PDF Processing Not Available",
            description="Cannot process PDF files. PDF processing libraries not installed.",
            fix_suggestion="Install PDF processing: pip install pdfplumber pdfminer.six",
            impact_score=10
        ))
        return ""
    
    def _extract_docx_text(self, file_path: Path) -> str:
        """Extract text from DOCX file."""
        try:
            import docx
            doc = docx.Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        except ImportError:
            self.issues.append(ATSIssue(
                level=IssueLevel.CRITICAL,
                category="dependencies",
                title="DOCX Processing Not Available",
                description="Cannot process DOCX files. Required library not installed.",
                fix_suggestion="Install DOCX processing: pip install python-docx",
                impact_score=10
            ))
            return ""
    
    def _analyze_parsing_compatibility(self) -> float:
        """Analyze how well ATS systems can parse this resume."""
        score = 100.0
        
        # Check for problematic elements
        for pattern_name, pattern in self.PROBLEMATIC_PATTERNS.items():
            matches = re.findall(pattern, self.resume_text, re.IGNORECASE)
            if matches:
                penalty = len(matches) * 5
                score -= penalty
                
                self.issues.append(ATSIssue(
                    level=IssueLevel.WARNING if penalty < 15 else IssueLevel.CRITICAL,
                    category="parsing",
                    title=f"ATS Problematic Content: {pattern_name.title()}",
                    description=f"Found {len(matches)} instances of {pattern_name} which may cause parsing issues",
                    fix_suggestion=self._get_parsing_fix_suggestion(pattern_name),
                    impact_score=min(penalty // 5, 8)
                ))
        
        # Check file size (too large files may be rejected)
        if self.file_size > 1024 * 1024:  # 1MB
            score -= 20
            self.issues.append(ATSIssue(
                level=IssueLevel.WARNING,
                category="file_size",
                title="Large File Size",
                description=f"Resume file is {self.file_size / (1024*1024):.1f}MB",
                fix_suggestion="Keep resume files under 1MB for better ATS compatibility",
                impact_score=5
            ))
        
        # Check for reasonable text length
        if self.word_count < 200:
            score -= 25
            self.issues.append(ATSIssue(
                level=IssueLevel.CRITICAL,
                category="content_length",
                title="Resume Too Short",
                description=f"Resume has only {self.word_count} words",
                fix_suggestion="Expand resume content. Most resumes should be 300-800 words",
                impact_score=8
            ))
        elif self.word_count > 1000:
            score -= 10
            self.issues.append(ATSIssue(
                level=IssueLevel.INFO,
                category="content_length",
                title="Resume Quite Long",
                description=f"Resume has {self.word_count} words",
                fix_suggestion="Consider condensing content. Most resumes should be 300-800 words",
                impact_score=3
            ))
        
        return max(0, score)
    
    def _analyze_formatting(self) -> float:
        """Analyze formatting for ATS compatibility."""
        score = 100.0
        
        # Check for consistent formatting patterns
        lines = self.resume_text.split('\n')
        
        # Check for bullet points (good for ATS)
        bullet_lines = [line for line in lines if re.match(r'^\s*[•\-\*\+▪]', line)]
        if len(bullet_lines) < 3:
            score -= 15
            self.issues.append(ATSIssue(
                level=IssueLevel.WARNING,
                category="formatting",
                title="Few Bullet Points",
                description="Resume has very few bullet points",
                fix_suggestion="Use bullet points to list achievements and responsibilities",
                impact_score=4
            ))
        
        # Check for excessive special characters
        special_char_count = len(re.findall(r'[^\w\s\-\.\,\(\)\:\/]', self.resume_text))
        if special_char_count > 50:
            score -= 20
            self.issues.append(ATSIssue(
                level=IssueLevel.WARNING,
                category="formatting",
                title="Excessive Special Characters",
                description=f"Found {special_char_count} special characters",
                fix_suggestion="Remove decorative characters and use simple formatting",
                impact_score=5
            ))
        
        # Check for reasonable line lengths
        long_lines = [line for line in lines if len(line) > 100]
        if len(long_lines) > len(lines) * 0.3:
            score -= 10
            self.issues.append(ATSIssue(
                level=IssueLevel.INFO,
                category="formatting",
                title="Long Lines",
                description="Many lines are very long",
                fix_suggestion="Break long lines for better readability",
                impact_score=2
            ))
        
        return max(0, score)
    
    def _analyze_structure(self) -> float:
        """Analyze resume structure and organization."""
        score = 100.0
        
        # Check for clear section headers
        section_headers = 0
        for section_name, keywords in {**self.REQUIRED_SECTIONS, **self.OPTIONAL_SECTIONS}.items():
            for keyword in keywords:
                if re.search(rf'\b{keyword}\b', self.resume_text, re.IGNORECASE):
                    section_headers += 1
                    break
        
        if section_headers < 4:
            score -= 25
            self.issues.append(ATSIssue(
                level=IssueLevel.WARNING,
                category="structure",
                title="Missing Section Headers",
                description=f"Only found {section_headers} clear section headers",
                fix_suggestion="Add clear section headers like 'Experience', 'Education', 'Skills'",
                impact_score=6
            ))
        
        # Check for dates in experience section
        date_patterns = [
            r'\b\d{4}\s*[-–]\s*\d{4}\b',  # 2020-2023
            r'\b\d{4}\s*[-–]\s*present\b',  # 2020-present
            r'\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\b'  # Month Year
        ]
        
        date_matches = 0
        for pattern in date_patterns:
            date_matches += len(re.findall(pattern, self.resume_text, re.IGNORECASE))
        
        if date_matches < 2:
            score -= 20
            self.issues.append(ATSIssue(
                level=IssueLevel.WARNING,
                category="structure",
                title="Missing Employment Dates",
                description="Few or no employment dates found",
                fix_suggestion="Include employment dates for all positions (e.g., 'Jan 2020 - Present')",
                impact_score=5
            ))
        
        return max(0, score)
    
    def _analyze_readability(self) -> float:
        """Analyze readability for both ATS and human reviewers."""
        score = 100.0
        
        # Check for action verbs
        found_action_verbs = set()
        for verb in self.ACTION_VERBS:
            if re.search(rf'\b{verb}\b', self.resume_text, re.IGNORECASE):
                found_action_verbs.add(verb)
        
        action_verb_ratio = len(found_action_verbs) / len(self.ACTION_VERBS)
        if action_verb_ratio < 0.1:
            score -= 20
            self.issues.append(ATSIssue(
                level=IssueLevel.WARNING,
                category="readability",
                title="Few Action Verbs",
                description=f"Only {len(found_action_verbs)} action verbs found",
                fix_suggestion="Use more action verbs: achieved, managed, developed, etc.",
                impact_score=5
            ))
        
        # Check for quantified achievements
        number_patterns = [
            r'\b\d+%\b',  # percentages
            r'\$\d+[kmb]?\b',  # money
            r'\b\d+[kmb]?\+?\s*(?:users|customers|clients|projects|people)\b',  # quantities
        ]
        
        quantified_achievements = 0
        for pattern in number_patterns:
            quantified_achievements += len(re.findall(pattern, self.resume_text, re.IGNORECASE))
        
        if quantified_achievements < 3:
            score -= 15
            self.issues.append(ATSIssue(
                level=IssueLevel.INFO,
                category="readability",
                title="Few Quantified Achievements",
                description=f"Only {quantified_achievements} quantified achievements found",
                fix_suggestion="Add numbers to achievements: '50% increase', '$2M revenue', '100+ users'",
                impact_score=4
            ))
        
        return max(0, score)
    
    def _analyze_keywords(self, job_description: Optional[str], industry: Optional[str]) -> KeywordAnalysis:
        """Analyze keyword optimization."""
        found_keywords = []
        missing_keywords = []
        recommendations = []
        
        if job_description:
            # Extract keywords from job description
            jd_keywords = self._extract_job_keywords(job_description)
            
            for keyword in jd_keywords:
                if re.search(rf'\b{re.escape(keyword)}\b', self.resume_text, re.IGNORECASE):
                    found_keywords.append(keyword)
                else:
                    missing_keywords.append(keyword)
            
            if missing_keywords:
                recommendations.append(f"Add missing keywords: {', '.join(missing_keywords[:5])}")
        
        # Industry-specific keyword analysis
        industry_score = 75.0  # Default score
        if industry:
            industry_keywords = self._get_industry_keywords(industry)
            industry_matches = 0
            for keyword in industry_keywords:
                if re.search(rf'\b{re.escape(keyword)}\b', self.resume_text, re.IGNORECASE):
                    industry_matches += 1
            
            industry_score = min(95, (industry_matches / len(industry_keywords)) * 100)
            
            if industry_score < 60:
                recommendations.append(f"Add more {industry} keywords to improve relevance")
        
        # Calculate keyword density
        total_words = len(self.resume_text.split())
        keyword_count = len(found_keywords)
        keyword_density = (keyword_count / total_words) * 100 if total_words > 0 else 0
        
        return KeywordAnalysis(
            found_keywords=found_keywords,
            missing_keywords=missing_keywords,
            keyword_density=keyword_density,
            industry_match_score=industry_score,
            recommendations=recommendations
        )
    
    def _analyze_sections(self) -> Dict[str, ResumeSection]:
        """Analyze resume sections."""
        sections = {}
        
        for section_name, keywords in self.REQUIRED_SECTIONS.items():
            present = False
            quality_score = 0.0
            word_count = 0
            issues = []
            
            # Check if section is present
            for keyword in keywords:
                if re.search(rf'\b{keyword}\b', self.resume_text, re.IGNORECASE):
                    present = True
                    break
            
            if present:
                # Estimate section quality and word count
                # This is a simplified analysis - could be enhanced
                quality_score = 80.0  # Default good score
                word_count = self.word_count // 5  # Rough estimate
            else:
                issues.append(f"Missing {section_name} section")
                self.issues.append(ATSIssue(
                    level=IssueLevel.WARNING,
                    category="sections",
                    title=f"Missing {section_name.title()} Section",
                    description=f"No clear {section_name} section found",
                    fix_suggestion=f"Add a clearly labeled {section_name.title()} section",
                    impact_score=6
                ))
            
            sections[section_name] = ResumeSection(
                name=section_name,
                present=present,
                quality_score=quality_score,
                word_count=word_count,
                issues=issues
            )
        
        return sections
    
    def _extract_job_keywords(self, job_description: str) -> List[str]:
        """Extract important keywords from job description."""
        # This is a simplified keyword extraction
        # In practice, you'd use more sophisticated NLP
        
        # Common technical keywords patterns
        patterns = [
            r'\b[A-Z]{2,}[a-z]*\b',  # Acronyms like API, SQL
            r'\b\w+(?:\.\w+)+\b',    # Technologies like React.js
            r'\b\w+(?:-\w+)+\b',     # Hyphenated terms
        ]
        
        keywords = set()
        for pattern in patterns:
            matches = re.findall(pattern, job_description)
            keywords.update(match.lower() for match in matches if len(match) > 2)
        
        # Remove common words
        stop_words = {'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'will', 'one', 'our', 'out', 'day', 'get', 'use', 'her', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'}
        keywords = [kw for kw in keywords if kw not in stop_words and len(kw) > 2]
        
        return list(keywords)[:20]  # Return top 20 keywords
    
    def _get_industry_keywords(self, industry: str) -> List[str]:
        """Get common keywords for specific industries."""
        industry_keywords = {
            'software': ['python', 'java', 'javascript', 'react', 'angular', 'api', 'database', 'git', 'agile', 'scrum'],
            'data_science': ['python', 'sql', 'machine learning', 'tensorflow', 'pandas', 'statistics', 'visualization', 'analysis'],
            'marketing': ['seo', 'content', 'social media', 'analytics', 'campaigns', 'brand', 'digital marketing'],
            'finance': ['excel', 'financial analysis', 'accounting', 'budget', 'forecasting', 'risk management'],
            'healthcare': ['patient care', 'medical', 'clinical', 'healthcare', 'treatment', 'diagnosis'],
        }
        
        return industry_keywords.get(industry.lower(), [])
    
    def _get_compatibility_level(self, score: float) -> ATSCompatibilityLevel:
        """Determine compatibility level from score."""
        if score >= 90:
            return ATSCompatibilityLevel.EXCELLENT
        elif score >= 80:
            return ATSCompatibilityLevel.GOOD
        elif score >= 70:
            return ATSCompatibilityLevel.FAIR
        elif score >= 60:
            return ATSCompatibilityLevel.POOR
        else:
            return ATSCompatibilityLevel.CRITICAL
    
    def _get_parsing_fix_suggestion(self, pattern_name: str) -> str:
        """Get fix suggestion for parsing issues."""
        suggestions = {
            'tables': 'Replace tables with bullet points or simple lists',
            'text_boxes': 'Remove text boxes and use regular text formatting',
            'headers_footers': 'Move header/footer content into main resume body',
            'images': 'Remove images and replace with text descriptions',
            'graphics': 'Replace graphics with text descriptions',
            'columns': 'Use single-column layout instead of multiple columns',
            'special_chars': 'Replace special characters with standard text formatting',
        }
        return suggestions.get(pattern_name, 'Simplify formatting for better ATS compatibility')
    
    def _generate_final_recommendations(self, overall_score: float, sections: Dict[str, ResumeSection], keyword_analysis: KeywordAnalysis):
        """Generate final improvement recommendations."""
        # Priority recommendations based on score
        if overall_score < 70:
            self.recommendations.insert(0, "URGENT: Your resume needs significant improvements to pass ATS screening")
        
        # Section-specific recommendations
        missing_sections = [name for name, section in sections.items() if not section.present]
        if missing_sections:
            self.recommendations.append(f"Add missing sections: {', '.join(missing_sections)}")
        
        # Keyword recommendations
        self.recommendations.extend(keyword_analysis.recommendations)
        
        # General recommendations
        if overall_score < 85:
            self.recommendations.extend([
                "Use a clean, simple format with clear section headers",
                "Include quantified achievements with specific numbers",
                "Use action verbs to start bullet points",
                "Ensure employment dates are clearly visible",
                "Keep file size under 1MB and use PDF format"
            ])

def print_report(report: ATSCompatibilityReport, show_details: bool = True):
    """Print a user-friendly report."""
    print("\n" + "="*80)
    print("🎯 RESUME ATS COMPATIBILITY REPORT")
    print("="*80)
    
    # Overall score with visual indicator
    score = report.overall_score
    level = report.compatibility_level
    
    level_indicators = {
        ATSCompatibilityLevel.EXCELLENT: "🟢 EXCELLENT",
        ATSCompatibilityLevel.GOOD: "🟡 GOOD", 
        ATSCompatibilityLevel.FAIR: "🟠 FAIR",
        ATSCompatibilityLevel.POOR: "🔴 POOR",
        ATSCompatibilityLevel.CRITICAL: "⚫ CRITICAL"
    }
    
    print(f"\nOverall ATS Score: {score:.1f}% {level_indicators[level]}")
    print(f"Market Percentile: {report.market_percentile:.1f}%")
    print(f"Improvement Potential: +{report.improvement_potential:.1f} points")
    
    # Component breakdown
    print("\n📊 Component Breakdown:")
    print(f"  • Parsing Compatibility: {report.parsing_score:.1f}%")
    print(f"  • Keyword Optimization: {report.keyword_score:.1f}%")
    print(f"  • Formatting: {report.formatting_score:.1f}%")
    print(f"  • Structure: {report.structure_score:.1f}%")
    print(f"  • Readability: {report.readability_score:.1f}%")
    
    # Issues summary
    if report.issues:
        critical_issues = [i for i in report.issues if i.level == IssueLevel.CRITICAL]
        warning_issues = [i for i in report.issues if i.level == IssueLevel.WARNING]
        
        print(f"\n🚨 Issues Found: {len(report.issues)} total")
        if critical_issues:
            print(f"  • Critical: {len(critical_issues)}")
        if warning_issues:
            print(f"  • Warnings: {len(warning_issues)}")
        
        if show_details and critical_issues:
            print("\n🔴 Critical Issues (Fix These First):")
            for issue in critical_issues[:3]:  # Show top 3
                print(f"  • {issue.title}")
                print(f"    Fix: {issue.fix_suggestion}")
    
    # Top recommendations
    if report.recommendations:
        print("\n💡 TOP RECOMMENDATIONS:")
        for i, rec in enumerate(report.recommendations[:5], 1):
            print(f"  {i}. {rec}")
    
    # Section analysis
    print("\n📝 Section Analysis:")
    for name, section in report.sections.items():
        status = "✅" if section.present else "❌"
        print(f"  {status} {name.title()}: {'Present' if section.present else 'Missing'}")
    
    # Keywords
    if report.keyword_analysis.found_keywords:
        print(f"\n🔍 Keywords Found: {len(report.keyword_analysis.found_keywords)}")
        if report.keyword_analysis.missing_keywords:
            print(f"Missing Keywords: {', '.join(report.keyword_analysis.missing_keywords[:5])}")
    
    # Final assessment
    print(f"\n{'='*80}")
    if score >= 85:
        print("🎉 Great job! Your resume is well-optimized for ATS systems.")
    elif score >= 70:
        print("👍 Your resume is decent but has room for improvement.")
    elif score >= 50:
        print("⚠️ Your resume needs significant improvements to pass ATS screening.")
    else:
        print("🚨 Your resume requires major revisions before submitting to jobs.")
    
    print("\n💡 Next Steps:")
    print("1. Address critical issues first")
    print("2. Add missing sections and keywords")
    print("3. Test with different job descriptions")
    print("4. Save as PDF and keep file size under 1MB")

def create_html_report(report: ATSCompatibilityReport, output_path: str):
    """Create a detailed HTML report."""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Resume ATS Analysis Report</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }}
            .header {{ background: #2c3e50; color: white; padding: 20px; border-radius: 10px; }}
            .score {{ font-size: 3em; font-weight: bold; text-align: center; margin: 20px 0; }}
            .excellent {{ color: #27ae60; }}
            .good {{ color: #f39c12; }}
            .fair {{ color: #e67e22; }}
            .poor {{ color: #e74c3c; }}
            .critical {{ color: #8b0000; }}
            .section {{ margin: 20px 0; padding: 15px; border-left: 4px solid #3498db; }}
            .issue {{ margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }}
            .issue.critical {{ border-left: 4px solid #e74c3c; }}
            .issue.warning {{ border-left: 4px solid #f39c12; }}
            .recommendation {{ margin: 5px 0; padding: 8px; background: #e8f5e8; border-radius: 3px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Resume ATS Compatibility Report</h1>
            <p>File: {report.file_path}</p>
            <p>Analysis Date: {report.analysis_date}</p>
        </div>
        
        <div class="score {report.compatibility_level.value}">
            {report.overall_score:.1f}% - {report.compatibility_level.value.upper()}
        </div>
        
        <div class="section">
            <h2>Component Scores</h2>
            <ul>
                <li>Parsing Compatibility: {report.parsing_score:.1f}%</li>
                <li>Keyword Optimization: {report.keyword_score:.1f}%</li>
                <li>Formatting: {report.formatting_score:.1f}%</li>
                <li>Structure: {report.structure_score:.1f}%</li>
                <li>Readability: {report.readability_score:.1f}%</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>Issues Found</h2>
            {"".join(f'<div class="issue {issue.level.value}"><strong>{issue.title}</strong><br>{issue.description}<br><em>Fix: {issue.fix_suggestion}</em></div>' for issue in report.issues)}
        </div>
        
        <div class="section">
            <h2>Recommendations</h2>
            {"".join(f'<div class="recommendation">• {rec}</div>' for rec in report.recommendations)}
        </div>
        
        <div class="section">
            <h2>Section Analysis</h2>
            <ul>
                {"".join(f'<li>{"✅" if section.present else "❌"} {name.title()}: {"Present" if section.present else "Missing"}</li>' for name, section in report.sections.items())}
            </ul>
        </div>
    </body>
    </html>
    """
    
    Path(output_path).write_text(html_content, encoding='utf-8')
    print(f"✅ Detailed HTML report saved to: {output_path}")

def main():
    """Main entry point for the resume scanner."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Ultimate Resume ATS Scanner & Optimizer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Scan a resume
  python ultimate_resume_scanner.py resume.pdf
  
  # Scan with job description for targeted analysis
  python ultimate_resume_scanner.py resume.pdf --job-description job.txt
  
  # Generate detailed HTML report
  python ultimate_resume_scanner.py resume.pdf --output report.html
  
  # Specify industry for better keyword analysis
  python ultimate_resume_scanner.py resume.pdf --industry software
        """
    )
    
    parser.add_argument(
        "resume_path", 
        help="Path to resume file (PDF, DOCX, or TXT)"
    )
    parser.add_argument(
        "--job-description", "-j",
        help="Path to job description file for targeted analysis"
    )
    parser.add_argument(
        "--industry", "-i",
        choices=['software', 'data_science', 'marketing', 'finance', 'healthcare'],
        help="Industry for specialized keyword analysis"
    )
    parser.add_argument(
        "--output", "-o",
        help="Path to save detailed HTML report"
    )
    parser.add_argument(
        "--json", 
        action="store_true",
        help="Output results as JSON"
    )
    
    args = parser.parse_args()
    
    try:
        # Load job description if provided
        job_description = None
        if args.job_description:
            try:
                job_description = Path(args.job_description).read_text(encoding='utf-8')
                print(f"📋 Loaded job description from {args.job_description}")
            except Exception as e:
                print(f"⚠️ Warning: Could not read job description: {e}")
        
        print(f"🔍 Scanning resume: {args.resume_path}")
        if args.industry:
            print(f"🏢 Industry context: {args.industry}")
        
        # Initialize scanner and perform analysis
        scanner = UltimateResumeScanner()
        report = scanner.scan_resume(args.resume_path, job_description, args.industry)
        
        # Output results
        if args.json:
            # Convert to JSON (excluding complex objects)
            report_dict = asdict(report)
            # Convert enums to strings
            report_dict['compatibility_level'] = report.compatibility_level.value
            for issue in report_dict['issues']:
                issue['level'] = issue['level'].value if hasattr(issue['level'], 'value') else str(issue['level'])
            print(json.dumps(report_dict, indent=2))
        else:
            print_report(report)
        
        # Generate HTML report if requested
        if args.output:
            create_html_report(report, args.output)
            # Open in browser
            try:
                webbrowser.open(f"file://{Path(args.output).absolute()}")
            except:
                pass
        
        # Return appropriate exit code based on score
        if report.overall_score >= 70:
            return 0
        elif report.overall_score >= 50:
            return 1
        else:
            return 2
            
    except FileNotFoundError as e:
        print(f"❌ Error: {e}")
        return 1
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        print("\n🔧 Troubleshooting:")
        print("  • Ensure your resume is a text-based PDF or DOCX file")
        print("  • Try converting scanned PDFs to text-based format")
        print("  • Check that all required dependencies are installed")
        return 1

if __name__ == "__main__":
    sys.exit(main())