#!/usr/bin/env python3
"""
Ultimate ATS-Level Resume Scanner and Optimizer

This module provides comprehensive ATS (Applicant Tracking System) analysis
for resumes, including keyword optimization, formatting checks, and compatibility
scoring.

Priority Features:
1. ATS Compatibility Scoring (most beneficial)
2. Keyword Optimization Suggestions
3. Formatting Analysis (ATS-friendly formatting)
4. Skills Gap Analysis (comparing resume to job descriptions)
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
import logging
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)

# Optional dependencies
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

try:
    from docx import Document
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

try:
    import pytesseract
    from PIL import Image
    import io
    HAS_OCR = True
except ImportError:
    HAS_OCR = False

try:
    from Levenshtein import distance as levenshtein_distance
    HAS_LEVENSHTEIN = True
except ImportError:
    HAS_LEVENSHTEIN = False


class ATSIssueLevel(Enum):
    """Severity levels for ATS compatibility issues."""
    CRITICAL = "critical"  # Will likely cause rejection
    WARNING = "warning"    # May cause issues
    INFO = "info"          # Best practice suggestion


@dataclass
class ATSIssue:
    """Represents an ATS compatibility issue."""
    level: ATSIssueLevel
    category: str
    message: str
    fix_suggestion: str
    line_number: Optional[int] = None


@dataclass
class ATSScore:
    """ATS compatibility score and analysis."""
    overall_score: float  # 0-100
    keyword_score: float  # 0-100
    formatting_score: float  # 0-100
    readability_score: float  # 0-100
    issues: List[ATSIssue] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    detected_sections: List[str] = field(default_factory=list)
    missing_sections: List[str] = field(default_factory=list)


@dataclass
class KeywordAnalysis:
    """Keyword optimization analysis."""
    found_keywords: Set[str]
    missing_keywords: Set[str]
    keyword_density: Dict[str, float]
    optimization_suggestions: List[str]
    industry_keywords: Set[str]


class ATSScanner:
    """
    Ultimate ATS-level resume scanner.

    Analyzes resumes for ATS compatibility, keyword optimization,
    formatting issues, and provides actionable recommendations.
    """

    # Standard resume sections ATS systems look for
    EXPECTED_SECTIONS = {
        "contact", "summary", "experience", "education",
        "skills", "certifications", "projects"
    }

    # Common ATS-problematic elements
    ATS_PROBLEMATIC_PATTERNS = {
        "tables": r"<table|<tr|<td",
        "text_boxes": r"text[-_]?box",
        "headers_footers": r"header|footer",
        "images": r"<img|image",
        "graphics": r"graphic|shape|drawing",
    }

    # Recommended fonts for ATS compatibility
    ATS_SAFE_FONTS = {
        "Arial", "Calibri", "Cambria", "Garamond", "Georgia",
        "Helvetica", "Times New Roman", "Trebuchet MS", "Verdana"
    }

    # Industry-specific keyword dictionaries
    INDUSTRY_KEYWORDS = {
        "software_engineering": {
            "python", "java", "javascript", "react", "node.js", "aws", "docker",
            "kubernetes", "ci/cd", "agile", "scrum", "git", "api", "rest",
            "microservices", "cloud", "devops", "sql", "nosql", "testing"
        },
        "data_science": {
            "python", "r", "sql", "machine learning", "deep learning", "tensorflow",
            "pytorch", "scikit-learn", "pandas", "numpy", "visualization", "statistics",
            "data analysis", "big data", "spark", "hadoop", "a/b testing"
        },
        "cybersecurity": {
            "penetration testing", "vulnerability assessment", "siem", "firewall",
            "ids/ips", "encryption", "compliance", "incident response", "threat analysis",
            "security audit", "cissp", "ceh", "oscp", "soc", "malware analysis"
        },
        "cloud_engineering": {
            "aws", "azure", "gcp", "terraform", "cloudformation", "kubernetes",
            "docker", "ci/cd", "infrastructure as code", "serverless", "lambda",
            "s3", "ec2", "cloud security", "cost optimization", "monitoring"
        },
    }

    def __init__(self, resume_path: str | Path):
        """
        Initialize ATS scanner with a resume file.

        Args:
            resume_path: Path to resume file (PDF or DOCX)
        """
        self.resume_path = Path(resume_path)
        self.text = ""
        self.raw_text = ""
        self.lines: List[str] = []
        self.word_count = 0

        if not self.resume_path.exists():
            raise FileNotFoundError(f"Resume file not found: {self.resume_path}")

        self._extract_text()

    def _extract_text(self) -> None:
        """Extract text from resume file."""
        suffix = self.resume_path.suffix.lower()

        if suffix == ".pdf":
            if not HAS_PDFPLUMBER:
                raise ValueError(
                    "PDF support requires pdfplumber. Install: pip install pdfplumber"
                )
            self._extract_pdf()
        elif suffix in [".docx", ".doc"]:
            if not HAS_DOCX:
                raise ValueError(
                    "DOCX support requires python-docx. Install: pip install python-docx"
                )
            self._extract_docx()
        else:
            raise ValueError(f"Unsupported file format: {suffix}")

        self.lines = self.text.split("\n")
        self.word_count = len(self.text.split())

    def _extract_pdf(self) -> None:
        """Extract text from PDF with OCR fallback."""
        text_parts = []

        with pdfplumber.open(self.resume_path) as pdf:
            for page in pdf.pages:
                try:
                    page_text = page.extract_text()
                    if page_text and page_text.strip():
                        text_parts.append(page_text)
                    elif HAS_OCR:
                        # Fallback to OCR for image-based pages
                        logger.info("Page has no text, attempting OCR...")
                        img = page.to_image(resolution=300)
                        pil_img = img.original
                        ocr_text = pytesseract.image_to_string(pil_img)
                        if ocr_text.strip():
                            text_parts.append(ocr_text)
                except Exception as e:
                    logger.warning(f"Failed to extract page: {e}")

        if not text_parts:
            raise ValueError(
                "No text extracted from PDF. "
                "It may be image-based without OCR support, or corrupted."
            )

        self.text = "\n".join(text_parts)
        self.raw_text = self.text

    def _extract_docx(self) -> None:
        """Extract text from DOCX file."""
        doc = Document(self.resume_path)
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]

        if not paragraphs:
            raise ValueError("No text extracted from DOCX file.")

        self.text = "\n".join(paragraphs)
        self.raw_text = self.text

    def calculate_ats_score(self) -> ATSScore:
        """
        Calculate comprehensive ATS compatibility score.

        Returns:
            ATSScore object with detailed analysis
        """
        issues: List[ATSIssue] = []
        recommendations: List[str] = []

        # Analyze formatting
        formatting_score, format_issues = self._analyze_formatting()
        issues.extend(format_issues)

        # Analyze sections
        detected_sections = self._detect_sections()
        missing_sections = self.EXPECTED_SECTIONS - detected_sections

        for section in missing_sections:
            issues.append(ATSIssue(
                level=ATSIssueLevel.WARNING,
                category="missing_section",
                message=f"Missing standard section: {section.upper()}",
                fix_suggestion=f"Add a '{section.upper()}' section to improve ATS compatibility"
            ))

        # Analyze readability
        readability_score = self._analyze_readability()

        # Analyze keywords (placeholder - requires job description)
        keyword_score = 75.0  # Default when no job description provided

        # Calculate overall score
        overall_score = (
            formatting_score * 0.35 +
            readability_score * 0.25 +
            keyword_score * 0.30 +
            (len(detected_sections) / len(self.EXPECTED_SECTIONS)) * 100 * 0.10
        )

        # Generate recommendations
        if overall_score < 60:
            recommendations.append("CRITICAL: Resume needs significant ATS optimization")
        elif overall_score < 80:
            recommendations.append("Resume has ATS issues that should be addressed")
        else:
            recommendations.append("Resume is well-optimized for ATS systems")

        if missing_sections:
            recommendations.append(
                f"Add missing sections: {', '.join(sorted(missing_sections))}"
            )

        if self.word_count < 300:
            recommendations.append(
                "Resume may be too brief (< 300 words). Add more detail."
            )
        elif self.word_count > 800:
            recommendations.append(
                "Resume may be too long (> 800 words). Consider condensing."
            )

        return ATSScore(
            overall_score=round(overall_score, 1),
            keyword_score=round(keyword_score, 1),
            formatting_score=round(formatting_score, 1),
            readability_score=round(readability_score, 1),
            issues=issues,
            recommendations=recommendations,
            detected_sections=sorted(detected_sections),
            missing_sections=sorted(missing_sections)
        )

    def _analyze_formatting(self) -> Tuple[float, List[ATSIssue]]:
        """
        Analyze resume formatting for ATS compatibility.

        Returns:
            Tuple of (score, issues_list)
        """
        score = 100.0
        issues: List[ATSIssue] = []

        # Check for problematic formatting
        text_lower = self.text.lower()

        for pattern_name, pattern in self.ATS_PROBLEMATIC_PATTERNS.items():
            if re.search(pattern, text_lower):
                score -= 15
                issues.append(ATSIssue(
                    level=ATSIssueLevel.CRITICAL,
                    category="formatting",
                    message=f"Contains {pattern_name.replace('_', ' ')} which ATS may not parse",
                    fix_suggestion=f"Remove {pattern_name.replace('_', ' ')} and use simple text formatting"
                ))

        # Check for special characters that may confuse ATS
        special_chars = set(re.findall(r'[^\w\s\-.,;:()/&@#+]', self.text))
        if len(special_chars) > 5:
            score -= 10
            issues.append(ATSIssue(
                level=ATSIssueLevel.WARNING,
                category="special_characters",
                message=f"Contains {len(special_chars)} types of special characters",
                fix_suggestion="Reduce use of special characters (bullets, symbols, etc.)"
            ))

        # Check line length variance (indicates columns/tables)
        line_lengths = [len(line.strip()) for line in self.lines if line.strip()]
        if line_lengths:
            avg_length = sum(line_lengths) / len(line_lengths)
            variance = sum((l - avg_length) ** 2 for l in line_lengths) / len(line_lengths)

            if variance > 500:  # High variance suggests formatting issues
                score -= 10
                issues.append(ATSIssue(
                    level=ATSIssueLevel.WARNING,
                    category="formatting",
                    message="Inconsistent line lengths detected (may indicate tables/columns)",
                    fix_suggestion="Use single-column layout for better ATS compatibility"
                ))

        # Check for contact information
        has_email = bool(re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', self.text))
        has_phone = bool(re.search(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', self.text))

        if not has_email:
            score -= 10
            issues.append(ATSIssue(
                level=ATSIssueLevel.CRITICAL,
                category="contact",
                message="No email address detected",
                fix_suggestion="Add a professional email address"
            ))

        if not has_phone:
            score -= 5
            issues.append(ATSIssue(
                level=ATSIssueLevel.WARNING,
                category="contact",
                message="No phone number detected",
                fix_suggestion="Add a phone number"
            ))

        return max(0, score), issues

    def _detect_sections(self) -> Set[str]:
        """
        Detect standard resume sections.

        Returns:
            Set of detected section names
        """
        detected = set()

        # Section headers pattern (looks for capitalized headers)
        section_patterns = {
            "contact": r'\b(contact|phone|email|address)\b',
            "summary": r'\b(summary|objective|profile|about)\b',
            "experience": r'\b(experience|work history|employment|professional)\b',
            "education": r'\b(education|academic|degree|university|college)\b',
            "skills": r'\b(skills|technical skills|competencies|expertise)\b',
            "certifications": r'\b(certifications?|licenses?|credentials?)\b',
            "projects": r'\b(projects?|portfolio)\b',
        }

        text_lower = self.text.lower()

        for section_name, pattern in section_patterns.items():
            if re.search(pattern, text_lower):
                detected.add(section_name)

        return detected

    def _analyze_readability(self) -> float:
        """
        Analyze resume readability and structure.

        Returns:
            Readability score (0-100)
        """
        score = 100.0

        # Check for bullet points (good for readability)
        bullet_count = len(re.findall(r'^\s*[•\-\*]', self.text, re.MULTILINE))
        if bullet_count < 5:
            score -= 10  # Resumes should have bullet points

        # Check average sentence length
        sentences = re.split(r'[.!?]+', self.text)
        sentences = [s.strip() for s in sentences if s.strip()]

        if sentences:
            avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences)

            if avg_sentence_length > 25:
                score -= 10  # Sentences too long
            elif avg_sentence_length < 8:
                score -= 5  # Sentences too short

        # Check for action verbs (good for ATS)
        action_verbs = {
            "achieved", "managed", "led", "developed", "created", "improved",
            "increased", "decreased", "implemented", "designed", "built",
            "analyzed", "coordinated", "executed", "established", "streamlined"
        }

        text_lower = self.text.lower()
        action_verb_count = sum(1 for verb in action_verbs if verb in text_lower)

        if action_verb_count < 3:
            score -= 10  # Should have more action verbs

        return max(0, score)

    def analyze_keywords(
        self,
        job_description: str,
        industry: Optional[str] = None
    ) -> KeywordAnalysis:
        """
        Analyze keyword optimization against a job description.

        Args:
            job_description: Job description text
            industry: Industry type (e.g., "software_engineering")

        Returns:
            KeywordAnalysis object
        """
        # Extract keywords from job description
        jd_keywords = self._extract_keywords(job_description)
        resume_keywords = self._extract_keywords(self.text)

        # Find matches and misses
        found_keywords = jd_keywords & resume_keywords
        missing_keywords = jd_keywords - resume_keywords

        # Calculate keyword density
        keyword_density = {}
        for keyword in found_keywords:
            count = self.text.lower().count(keyword.lower())
            keyword_density[keyword] = count / self.word_count if self.word_count > 0 else 0

        # Get industry keywords
        industry_keywords = set()
        if industry and industry in self.INDUSTRY_KEYWORDS:
            industry_keywords = self.INDUSTRY_KEYWORDS[industry]

        # Generate optimization suggestions
        suggestions = []

        if len(found_keywords) / len(jd_keywords) < 0.5 if jd_keywords else False:
            suggestions.append(
                "CRITICAL: Less than 50% keyword match with job description"
            )

        if missing_keywords:
            top_missing = sorted(missing_keywords)[:5]
            suggestions.append(
                f"Add these missing keywords: {', '.join(top_missing)}"
            )

        # Check for keyword stuffing
        overstuffed = [kw for kw, density in keyword_density.items() if density > 0.03]
        if overstuffed:
            suggestions.append(
                f"Reduce repetition of: {', '.join(overstuffed[:3])} (keyword stuffing)"
            )

        return KeywordAnalysis(
            found_keywords=found_keywords,
            missing_keywords=missing_keywords,
            keyword_density=keyword_density,
            optimization_suggestions=suggestions,
            industry_keywords=industry_keywords
        )

    def _extract_keywords(self, text: str) -> Set[str]:
        """
        Extract meaningful keywords from text.

        Args:
            text: Text to extract keywords from

        Returns:
            Set of keywords
        """
        # Remove common words
        stop_words = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
            "being", "have", "has", "had", "do", "does", "did", "will", "would",
            "could", "should", "may", "might", "must", "can", "about", "this",
            "that", "these", "those", "i", "you", "he", "she", "it", "we", "they"
        }

        # Extract words and phrases
        words = re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#/.]{2,}\b', text.lower())
        keywords = {w for w in words if w not in stop_words and len(w) > 2}

        # Extract multi-word technical terms
        multi_word_patterns = [
            r'\b(?:machine|deep) learning\b',
            r'\b(?:data|business) analy[sz]is\b',
            r'\b(?:cloud|software|full[- ]stack) engineer(?:ing)?\b',
            r'\b(?:project|product) manage(?:ment|r)\b',
        ]

        for pattern in multi_word_patterns:
            matches = re.findall(pattern, text.lower())
            keywords.update(matches)

        return keywords

    def generate_report(
        self,
        job_description: Optional[str] = None,
        industry: Optional[str] = None,
        output_format: str = "text"
    ) -> str:
        """
        Generate comprehensive ATS analysis report.

        Args:
            job_description: Optional job description for keyword analysis
            industry: Optional industry type
            output_format: "text" or "markdown"

        Returns:
            Formatted report string
        """
        ats_score = self.calculate_ats_score()

        if output_format == "markdown":
            return self._generate_markdown_report(ats_score, job_description, industry)
        else:
            return self._generate_text_report(ats_score, job_description, industry)

    def _generate_text_report(
        self,
        ats_score: ATSScore,
        job_description: Optional[str],
        industry: Optional[str]
    ) -> str:
        """Generate plain text report."""
        lines = []
        lines.append("=" * 70)
        lines.append("ATS COMPATIBILITY REPORT")
        lines.append("=" * 70)
        lines.append("")

        # Overall Score
        lines.append(f"OVERALL ATS SCORE: {ats_score.overall_score}/100")

        if ats_score.overall_score >= 80:
            grade = "EXCELLENT"
        elif ats_score.overall_score >= 60:
            grade = "GOOD"
        elif ats_score.overall_score >= 40:
            grade = "NEEDS IMPROVEMENT"
        else:
            grade = "CRITICAL ISSUES"

        lines.append(f"Grade: {grade}")
        lines.append("")

        # Component Scores
        lines.append("Component Scores:")
        lines.append(f"  • Formatting:   {ats_score.formatting_score}/100")
        lines.append(f"  • Readability:  {ats_score.readability_score}/100")
        lines.append(f"  • Keywords:     {ats_score.keyword_score}/100")
        lines.append("")

        # Detected Sections
        lines.append(f"Detected Sections: {', '.join(ats_score.detected_sections)}")
        if ats_score.missing_sections:
            lines.append(f"Missing Sections:  {', '.join(ats_score.missing_sections)}")
        lines.append("")

        # Issues
        if ats_score.issues:
            lines.append("ISSUES FOUND:")
            lines.append("-" * 70)

            critical = [i for i in ats_score.issues if i.level == ATSIssueLevel.CRITICAL]
            warnings = [i for i in ats_score.issues if i.level == ATSIssueLevel.WARNING]

            if critical:
                lines.append("\nCRITICAL ISSUES (fix immediately):")
                for issue in critical:
                    lines.append(f"  ✗ {issue.message}")
                    lines.append(f"    Fix: {issue.fix_suggestion}")
                    lines.append("")

            if warnings:
                lines.append("\nWARNINGS (recommended fixes):")
                for issue in warnings:
                    lines.append(f"  ⚠ {issue.message}")
                    lines.append(f"    Fix: {issue.fix_suggestion}")
                    lines.append("")

        # Recommendations
        if ats_score.recommendations:
            lines.append("RECOMMENDATIONS:")
            lines.append("-" * 70)
            for rec in ats_score.recommendations:
                lines.append(f"  • {rec}")
            lines.append("")

        # Keyword Analysis (if job description provided)
        if job_description:
            keyword_analysis = self.analyze_keywords(job_description, industry)
            lines.append("")
            lines.append("KEYWORD ANALYSIS:")
            lines.append("-" * 70)

            match_rate = (
                len(keyword_analysis.found_keywords) /
                (len(keyword_analysis.found_keywords) + len(keyword_analysis.missing_keywords))
            ) if (keyword_analysis.found_keywords or keyword_analysis.missing_keywords) else 0

            lines.append(f"Keyword Match Rate: {match_rate * 100:.1f}%")
            lines.append(f"Found Keywords: {len(keyword_analysis.found_keywords)}")
            lines.append(f"Missing Keywords: {len(keyword_analysis.missing_keywords)}")
            lines.append("")

            if keyword_analysis.missing_keywords:
                top_missing = sorted(keyword_analysis.missing_keywords)[:10]
                lines.append("Top Missing Keywords:")
                for kw in top_missing:
                    lines.append(f"  • {kw}")
                lines.append("")

            if keyword_analysis.optimization_suggestions:
                lines.append("Keyword Optimization:")
                for suggestion in keyword_analysis.optimization_suggestions:
                    lines.append(f"  • {suggestion}")
                lines.append("")

        lines.append("=" * 70)

        return "\n".join(lines)

    def _generate_markdown_report(
        self,
        ats_score: ATSScore,
        job_description: Optional[str],
        industry: Optional[str]
    ) -> str:
        """Generate markdown report."""
        lines = []
        lines.append("# ATS Compatibility Report\n")

        # Overall Score
        lines.append(f"## Overall ATS Score: {ats_score.overall_score}/100\n")

        if ats_score.overall_score >= 80:
            grade = "🟢 EXCELLENT"
        elif ats_score.overall_score >= 60:
            grade = "🟡 GOOD"
        elif ats_score.overall_score >= 40:
            grade = "🟠 NEEDS IMPROVEMENT"
        else:
            grade = "🔴 CRITICAL ISSUES"

        lines.append(f"**Grade:** {grade}\n")

        # Component Scores
        lines.append("### Component Scores\n")
        lines.append(f"- **Formatting:** {ats_score.formatting_score}/100")
        lines.append(f"- **Readability:** {ats_score.readability_score}/100")
        lines.append(f"- **Keywords:** {ats_score.keyword_score}/100\n")

        # Sections
        lines.append("### Resume Sections\n")
        lines.append(f"**Detected:** {', '.join(ats_score.detected_sections)}\n")
        if ats_score.missing_sections:
            lines.append(f"**Missing:** {', '.join(ats_score.missing_sections)}\n")

        # Issues
        if ats_score.issues:
            lines.append("## Issues Found\n")

            critical = [i for i in ats_score.issues if i.level == ATSIssueLevel.CRITICAL]
            warnings = [i for i in ats_score.issues if i.level == ATSIssueLevel.WARNING]

            if critical:
                lines.append("### 🔴 Critical Issues (Fix Immediately)\n")
                for issue in critical:
                    lines.append(f"- **{issue.message}**")
                    lines.append(f"  - *Fix:* {issue.fix_suggestion}\n")

            if warnings:
                lines.append("### ⚠️ Warnings (Recommended Fixes)\n")
                for issue in warnings:
                    lines.append(f"- **{issue.message}**")
                    lines.append(f"  - *Fix:* {issue.fix_suggestion}\n")

        # Recommendations
        if ats_score.recommendations:
            lines.append("## Recommendations\n")
            for rec in ats_score.recommendations:
                lines.append(f"- {rec}")
            lines.append("")

        # Keyword Analysis
        if job_description:
            keyword_analysis = self.analyze_keywords(job_description, industry)
            lines.append("## Keyword Analysis\n")

            match_rate = (
                len(keyword_analysis.found_keywords) /
                (len(keyword_analysis.found_keywords) + len(keyword_analysis.missing_keywords))
            ) if (keyword_analysis.found_keywords or keyword_analysis.missing_keywords) else 0

            lines.append(f"**Keyword Match Rate:** {match_rate * 100:.1f}%\n")
            lines.append(f"- Found Keywords: {len(keyword_analysis.found_keywords)}")
            lines.append(f"- Missing Keywords: {len(keyword_analysis.missing_keywords)}\n")

            if keyword_analysis.missing_keywords:
                top_missing = sorted(keyword_analysis.missing_keywords)[:10]
                lines.append("### Missing Keywords\n")
                for kw in top_missing:
                    lines.append(f"- `{kw}`")
                lines.append("")

            if keyword_analysis.optimization_suggestions:
                lines.append("### Optimization Suggestions\n")
                for suggestion in keyword_analysis.optimization_suggestions:
                    lines.append(f"- {suggestion}")
                lines.append("")

        return "\n".join(lines)


def scan_resume(
    resume_path: str | Path,
    job_description: Optional[str] = None,
    industry: Optional[str] = None,
    output_format: str = "text"
) -> str:
    """
    Convenience function to scan a resume for ATS compatibility.

    Args:
        resume_path: Path to resume file
        job_description: Optional job description for keyword analysis
        industry: Optional industry type
        output_format: "text" or "markdown"

    Returns:
        Formatted report string

    Example:
        >>> report = scan_resume("my_resume.pdf", job_description="...", industry="software_engineering")
        >>> print(report)
    """
    scanner = ATSScanner(resume_path)
    return scanner.generate_report(job_description, industry, output_format)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python ats_scanner.py <resume_path> [job_description_file] [industry]")
        print("\nIndustries: software_engineering, data_science, cybersecurity, cloud_engineering")
        sys.exit(1)

    resume_path = sys.argv[1]
    job_desc = None
    industry = None

    if len(sys.argv) >= 3:
        jd_path = Path(sys.argv[2])
        if jd_path.exists():
            job_desc = jd_path.read_text(encoding="utf-8")

    if len(sys.argv) >= 4:
        industry = sys.argv[3]

    try:
        report = scan_resume(resume_path, job_desc, industry, output_format="text")
        print(report)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
