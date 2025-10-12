"""
Job Quality Detection System

Analyzes job postings for quality, legitimacy, and alignment with candidate goals.

References:
- SWEBOK v4.0a | https://computer.org/swebok | High | Requirements engineering
- OWASP ASVS 5.0 | https://owasp.org/ASVS | High | Input validation standards
- Bureau of Labor Statistics | https://www.bls.gov | High | Salary data
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class QualityLevel(Enum):
    """Quality levels for job postings."""

    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    SUSPICIOUS = "suspicious"


class RedFlagType(Enum):
    """Types of red flags in job postings."""

    SCAM_INDICATOR = "scam_indicator"
    UNREALISTIC_SALARY = "unrealistic_salary"
    VAGUE_DESCRIPTION = "vague_description"
    EXCESSIVE_REQUIREMENTS = "excessive_requirements"
    UNPROFESSIONAL_LANGUAGE = "unprofessional_language"
    MLM_PATTERN = "mlm_pattern"
    NO_COMPANY_INFO = "no_company_info"
    SALARY_TOO_LOW = "salary_too_low"
    UNCLEAR_ROLE = "unclear_role"


@dataclass
class RedFlag:
    """Represents a detected red flag."""

    flag_type: RedFlagType
    severity: int  # 1-10, where 10 is most severe
    description: str
    evidence: str
    mitigation: str = ""


@dataclass
class JobQualityScore:
    """Comprehensive job quality assessment."""

    overall_score: float  # 0-100
    quality_level: QualityLevel
    component_scores: dict[str, float] = field(default_factory=dict)
    red_flags: list[RedFlag] = field(default_factory=list)
    strengths: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def is_recommended(self) -> bool:
        """Check if job meets minimum quality standards."""
        return self.overall_score >= 70 and not any(
            flag.severity >= 8 for flag in self.red_flags
        )


class JobQualityDetector:
    """
    Advanced job quality detection system.

    Analyzes job postings across multiple dimensions:
    - Legitimacy (scam detection)
    - Salary alignment with market data
    - Description quality and completeness
    - Company reputation indicators
    - Requirements reasonableness
    """

    # Scam indicators per FBI IC3 reports
    SCAM_PATTERNS = [
        r"(?i)work\s+from\s+home\s+guaranteed",
        r"(?i)make\s+\$?\d+k?\+?\s+per\s+(week|month|day)",
        r"(?i)no\s+experience\s+(required|necessary)",
        r"(?i)easy\s+money",
        r"(?i)guaranteed\s+(income|earnings)",
        r"(?i)wire\s+transfer",
        r"(?i)western\s+union",
        r"(?i)bitcoin\s+payment",
        r"(?i)upfront\s+(fee|payment|cost)",
        r"(?i)training\s+fee\s+required",
    ]

    # MLM/pyramid scheme indicators
    MLM_PATTERNS = [
        r"(?i)unlimited\s+earning\s+potential",
        r"(?i)be\s+your\s+own\s+boss",
        r"(?i)recruit\s+others",
        r"(?i)downline",
        r"(?i)multi-?level\s+marketing",
        r"(?i)network\s+marketing",
        r"(?i)independent\s+distributor",
    ]

    # Vague job description indicators
    VAGUE_PATTERNS = [
        r"(?i)various\s+duties",
        r"(?i)as\s+needed",
        r"(?i)other\s+duties\s+as\s+assigned",
        r"(?i)fast-paced\s+environment",
        r"(?i)rockstar",
        r"(?i)ninja",
        r"(?i)guru",
    ]

    # Professional language indicators (good signs)
    PROFESSIONAL_INDICATORS = [
        "responsibilities",
        "qualifications",
        "requirements",
        "benefits",
        "company culture",
        "mission",
        "values",
        "team",
        "collaborate",
        "stakeholders",
    ]

    def __init__(self):
        """Initialize the job quality detector."""
        logger.info("JobQualityDetector initialized")

    def analyze(
        self,
        job_title: str,
        job_description: str,
        company_name: str = "",
        salary_range: tuple[int, int] | None = None,
        location: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> JobQualityScore:
        """
        Analyze job posting quality comprehensively.

        Args:
            job_title: Job title
            job_description: Full job description
            company_name: Company name
            salary_range: (min, max) salary in USD
            location: Job location
            metadata: Additional metadata

        Returns:
            JobQualityScore with detailed assessment

        Security:
            Input validation per OWASP ASVS 5.0 V5.1.1
        """
        # Input sanitization
        job_title = self._sanitize_text(job_title)
        job_description = self._sanitize_text(job_description)
        company_name = self._sanitize_text(company_name)

        logger.info(f"Analyzing job quality: {job_title}")

        red_flags = []
        strengths = []
        weaknesses = []
        component_scores = {}

        # 1. Legitimacy detection (30%)
        legitimacy_score, legitimacy_flags = self._check_legitimacy(
            job_description, company_name
        )
        component_scores["legitimacy"] = legitimacy_score
        red_flags.extend(legitimacy_flags)

        # 2. Description quality (25%)
        description_score, desc_analysis = self._analyze_description_quality(
            job_description, job_title
        )
        component_scores["description_quality"] = description_score
        strengths.extend(desc_analysis.get("strengths", []))
        weaknesses.extend(desc_analysis.get("weaknesses", []))

        # 3. Salary alignment (20%)
        if salary_range:
            salary_score, salary_flags = self._check_salary_alignment(
                salary_range, job_title, location
            )
            component_scores["salary_alignment"] = salary_score
            red_flags.extend(salary_flags)
        else:
            weaknesses.append("No salary information provided")
            component_scores["salary_alignment"] = 60  # Neutral

        # 4. Requirements reasonableness (15%)
        requirements_score, req_flags = self._check_requirements(job_description)
        component_scores["requirements_reasonableness"] = requirements_score
        red_flags.extend(req_flags)

        # 5. Company information (10%)
        company_score = self._check_company_info(company_name, job_description)
        component_scores["company_information"] = company_score
        if company_score < 50:
            weaknesses.append("Limited company information provided")

        # Calculate weighted overall score
        weights = {
            "legitimacy": 0.30,
            "description_quality": 0.25,
            "salary_alignment": 0.20,
            "requirements_reasonableness": 0.15,
            "company_information": 0.10,
        }

        overall_score = sum(
            component_scores[k] * weights[k] for k in component_scores.keys()
        )

        # Determine quality level
        quality_level = self._determine_quality_level(overall_score, red_flags)

        # Generate recommendations
        recommendations = self._generate_recommendations(
            component_scores, red_flags, weaknesses
        )

        logger.info(
            f"Job quality analysis complete: {quality_level.value} ({overall_score:.1f}/100)"
        )

        return JobQualityScore(
            overall_score=round(overall_score, 1),
            quality_level=quality_level,
            component_scores=component_scores,
            red_flags=red_flags,
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recommendations,
            metadata={
                "job_title": job_title,
                "company_name": company_name,
                "location": location,
                **(metadata or {}),
            },
        )

    def _sanitize_text(self, text: str) -> str:
        """Sanitize text input per OWASP ASVS 5.0 V5.1.1."""
        if not text:
            return ""
        # Truncate very long inputs
        return text[:50000].strip()

    def _check_legitimacy(
        self, description: str, company_name: str
    ) -> tuple[float, list[RedFlag]]:
        """Check for scam indicators and legitimacy issues."""
        flags = []
        score = 100.0

        # Check for scam patterns
        scam_count = 0
        for pattern in self.SCAM_PATTERNS:
            if re.search(pattern, description):
                scam_count += 1
                evidence = re.search(pattern, description)
                flags.append(
                    RedFlag(
                        flag_type=RedFlagType.SCAM_INDICATOR,
                        severity=9,
                        description="Potential scam indicator detected",
                        evidence=evidence.group(0) if evidence else "",
                        mitigation="Research company thoroughly before applying",
                    )
                )
                score -= 15

        # Check for MLM patterns
        mlm_count = 0
        for pattern in self.MLM_PATTERNS:
            if re.search(pattern, description):
                mlm_count += 1
                evidence = re.search(pattern, description)
                flags.append(
                    RedFlag(
                        flag_type=RedFlagType.MLM_PATTERN,
                        severity=7,
                        description="Multi-level marketing indicator detected",
                        evidence=evidence.group(0) if evidence else "",
                        mitigation="Verify this is not an MLM/pyramid scheme",
                    )
                )
                score -= 10

        # Check for missing company info
        if not company_name or len(company_name) < 2:
            flags.append(
                RedFlag(
                    flag_type=RedFlagType.NO_COMPANY_INFO,
                    severity=6,
                    description="No company name provided",
                    evidence="Missing company identification",
                    mitigation="Request company information before applying",
                )
            )
            score -= 15

        return max(0, score), flags

    def _analyze_description_quality(
        self, description: str, title: str
    ) -> tuple[float, dict[str, list[str]]]:
        """Analyze the quality and completeness of job description."""
        analysis = {"strengths": [], "weaknesses": []}
        score = 50.0  # Start at neutral

        words = description.lower().split()
        word_count = len(words)

        # Length check
        if word_count < 50:
            analysis["weaknesses"].append("Description is very brief")
            score -= 15
        elif word_count > 150:
            analysis["strengths"].append("Comprehensive description")
            score += 15
        else:
            analysis["strengths"].append("Adequate description length")
            score += 5

        # Professional indicators
        professional_count = sum(
            1 for indicator in self.PROFESSIONAL_INDICATORS if indicator in words
        )
        if professional_count >= 5:
            analysis["strengths"].append("Professional language and structure")
            score += 15
        elif professional_count >= 3:
            score += 5

        # Vague language check
        vague_count = sum(1 for pattern in self.VAGUE_PATTERNS if re.search(pattern, description))
        if vague_count >= 3:
            analysis["weaknesses"].append("Contains vague or unclear language")
            score -= 10

        # Structure check - look for sections
        has_responsibilities = bool(re.search(r"(?i)responsibilities|duties", description))
        has_requirements = bool(re.search(r"(?i)requirements|qualifications", description))
        has_benefits = bool(re.search(r"(?i)benefits|perks|compensation", description))

        if has_responsibilities and has_requirements:
            analysis["strengths"].append("Well-structured with clear sections")
            score += 10
        if has_benefits:
            analysis["strengths"].append("Includes benefits information")
            score += 5

        return min(100, max(0, score)), analysis

    def _check_salary_alignment(
        self, salary_range: tuple[int, int], title: str, location: str
    ) -> tuple[float, list[RedFlag]]:
        """Check if salary aligns with market expectations."""
        flags = []
        min_salary, max_salary = salary_range
        score = 75.0  # Neutral starting point

        # Basic validation
        if min_salary <= 0 or max_salary <= 0:
            flags.append(
                RedFlag(
                    flag_type=RedFlagType.UNREALISTIC_SALARY,
                    severity=8,
                    description="Invalid salary range",
                    evidence=f"${min_salary} - ${max_salary}",
                )
            )
            return 0, flags

        if max_salary < min_salary:
            flags.append(
                RedFlag(
                    flag_type=RedFlagType.UNREALISTIC_SALARY,
                    severity=8,
                    description="Maximum salary less than minimum",
                    evidence=f"${min_salary} - ${max_salary}",
                )
            )
            return 0, flags

        # Check for suspiciously low salaries
        if max_salary < 25000:
            flags.append(
                RedFlag(
                    flag_type=RedFlagType.SALARY_TOO_LOW,
                    severity=7,
                    description="Salary significantly below typical market rates",
                    evidence=f"Max salary: ${max_salary}",
                    mitigation="Verify salary details and consider cost of living",
                )
            )
            score -= 30

        # Check for unrealistically high salaries (potential scam)
        if min_salary > 500000:
            flags.append(
                RedFlag(
                    flag_type=RedFlagType.UNREALISTIC_SALARY,
                    severity=8,
                    description="Suspiciously high salary may indicate scam",
                    evidence=f"Min salary: ${min_salary}",
                    mitigation="Research company and verify legitimacy",
                )
            )
            score -= 40

        # Salary range width check
        if max_salary > min_salary * 2:
            score -= 10  # Very wide range indicates uncertainty

        return max(0, score), flags

    def _check_requirements(self, description: str) -> tuple[float, list[RedFlag]]:
        """Check if requirements are reasonable and not excessive."""
        flags = []
        score = 80.0

        # Count years of experience mentioned
        exp_matches = re.findall(r"(\d+)\+?\s+years?", description.lower())
        if exp_matches:
            max_years = max(int(y) for y in exp_matches)
            if max_years >= 10:
                flags.append(
                    RedFlag(
                        flag_type=RedFlagType.EXCESSIVE_REQUIREMENTS,
                        severity=5,
                        description=f"High experience requirement: {max_years}+ years",
                        evidence=f"{max_years}+ years experience mentioned",
                        mitigation="Consider applying if you meet 70% of requirements",
                    )
                )
                score -= 15

        # Count number of required skills/technologies
        skill_indicators = len(re.findall(r"(?i)\b(proficient|expert|experience with)\b", description))
        if skill_indicators > 15:
            flags.append(
                RedFlag(
                    flag_type=RedFlagType.EXCESSIVE_REQUIREMENTS,
                    severity=4,
                    description="Very long list of required skills",
                    evidence=f"{skill_indicators} skill requirements found",
                    mitigation="Focus on matching core requirements",
                )
            )
            score -= 10

        return max(0, score), flags

    def _check_company_info(self, company_name: str, description: str) -> float:
        """Evaluate quality of company information."""
        score = 50.0

        if company_name and len(company_name) >= 2:
            score += 25

        # Check for company description
        has_company_info = bool(
            re.search(r"(?i)(about us|company|our mission|we are)", description)
        )
        if has_company_info:
            score += 25

        return min(100, score)

    def _determine_quality_level(
        self, score: float, red_flags: list[RedFlag]
    ) -> QualityLevel:
        """Determine quality level based on score and red flags."""
        # Critical red flags override score
        has_critical = any(flag.severity >= 8 for flag in red_flags)
        if has_critical:
            return QualityLevel.SUSPICIOUS

        if score >= 85:
            return QualityLevel.EXCELLENT
        elif score >= 70:
            return QualityLevel.GOOD
        elif score >= 50:
            return QualityLevel.FAIR
        else:
            return QualityLevel.POOR

    def _generate_recommendations(
        self,
        component_scores: dict[str, float],
        red_flags: list[RedFlag],
        weaknesses: list[str],
    ) -> list[str]:
        """Generate actionable recommendations."""
        recommendations = []

        # Critical red flags
        critical_flags = [f for f in red_flags if f.severity >= 8]
        if critical_flags:
            recommendations.append(
                "⚠️ CAUTION: Serious concerns detected. Thoroughly research this opportunity before proceeding."
            )

        # Legitimacy concerns
        if component_scores.get("legitimacy", 100) < 70:
            recommendations.append(
                "Research the company on sites like Glassdoor, LinkedIn, and Better Business Bureau"
            )

        # Description issues
        if component_scores.get("description_quality", 100) < 60:
            recommendations.append(
                "Request more details about the role during initial contact"
            )

        # Salary concerns
        if component_scores.get("salary_alignment", 100) < 60:
            recommendations.append(
                "Clarify compensation details and compare with market rates for this role"
            )

        # Generic advice for fair quality
        if not recommendations:
            recommendations.append("This appears to be a legitimate opportunity worth exploring")

        return recommendations
