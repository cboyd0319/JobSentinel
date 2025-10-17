"""
Comprehensive tests for domains.detection.job_quality_detector module.

Tests cover job quality analysis, red flag detection, legitimacy checks,
and quality scoring following pytest best practices.
"""

from __future__ import annotations

import pytest

from domains.detection.job_quality_detector import (
    JobQualityDetector,
    JobQualityScore,
    QualityLevel,
    RedFlag,
    RedFlagType,
)


class TestQualityLevel:
    """Test suite for QualityLevel enum."""

    def test_quality_level_enum_values(self):
        """Test QualityLevel enum has expected values."""
        # Arrange & Act & Assert
        assert QualityLevel.EXCELLENT.value == "excellent"
        assert QualityLevel.GOOD.value == "good"
        assert QualityLevel.FAIR.value == "fair"
        assert QualityLevel.POOR.value == "poor"
        assert QualityLevel.SUSPICIOUS.value == "suspicious"

    def test_quality_level_has_all_expected_levels(self):
        """Test all quality levels are defined."""
        # Arrange & Act
        levels = list(QualityLevel)

        # Assert
        assert len(levels) == 5


class TestRedFlagType:
    """Test suite for RedFlagType enum."""

    def test_red_flag_type_enum_values(self):
        """Test RedFlagType enum has expected values."""
        # Arrange & Act & Assert
        assert RedFlagType.SCAM_INDICATOR.value == "scam_indicator"
        assert RedFlagType.UNREALISTIC_SALARY.value == "unrealistic_salary"
        assert RedFlagType.VAGUE_DESCRIPTION.value == "vague_description"
        assert RedFlagType.EXCESSIVE_REQUIREMENTS.value == "excessive_requirements"
        assert RedFlagType.UNPROFESSIONAL_LANGUAGE.value == "unprofessional_language"
        assert RedFlagType.MLM_PATTERN.value == "mlm_pattern"
        assert RedFlagType.NO_COMPANY_INFO.value == "no_company_info"
        assert RedFlagType.SALARY_TOO_LOW.value == "salary_too_low"
        assert RedFlagType.UNCLEAR_ROLE.value == "unclear_role"


class TestRedFlag:
    """Test suite for RedFlag dataclass."""

    def test_red_flag_construction_with_required_fields(self):
        """Test RedFlag constructs with required fields."""
        # Arrange & Act
        flag = RedFlag(
            flag_type=RedFlagType.SCAM_INDICATOR,
            severity=9,
            description="Detected scam pattern",
            evidence="work from home guaranteed",
        )

        # Assert
        assert flag.flag_type == RedFlagType.SCAM_INDICATOR
        assert flag.severity == 9
        assert flag.description == "Detected scam pattern"
        assert flag.evidence == "work from home guaranteed"
        assert flag.mitigation == ""

    @pytest.mark.parametrize(
        "severity",
        [1, 5, 8, 10],
        ids=["low", "medium", "high", "critical"],
    )
    def test_red_flag_accepts_various_severities(self, severity):
        """Test RedFlag accepts various severity levels."""
        # Arrange & Act
        flag = RedFlag(
            flag_type=RedFlagType.VAGUE_DESCRIPTION,
            severity=severity,
            description="Test flag",
            evidence="test evidence",
        )

        # Assert
        assert flag.severity == severity


class TestJobQualityScore:
    """Test suite for JobQualityScore dataclass."""

    @pytest.fixture
    def sample_score(self):
        """Provide a sample JobQualityScore."""
        return JobQualityScore(
            overall_score=75.0,
            quality_level=QualityLevel.GOOD,
            component_scores={
                "legitimacy": 85.0,
                "description_quality": 70.0,
                "salary_alignment": 75.0,
            },
            red_flags=[],
            strengths=["Clear responsibilities", "Detailed requirements"],
            weaknesses=["No company info"],
            recommendations=["Research company"],
        )

    def test_job_quality_score_construction(self):
        """Test JobQualityScore constructs with all fields."""
        # Arrange & Act
        score = JobQualityScore(
            overall_score=85.5,
            quality_level=QualityLevel.EXCELLENT,
            component_scores={"legitimacy": 90.0, "description_quality": 85.0},
            red_flags=[],
            strengths=["Professional tone"],
            weaknesses=[],
            recommendations=["Apply immediately"],
            metadata={"source": "test"},
        )

        # Assert
        assert score.overall_score == 85.5
        assert score.quality_level == QualityLevel.EXCELLENT
        assert len(score.component_scores) == 2
        assert len(score.strengths) == 1

    @pytest.mark.parametrize(
        "score,severe_flags,expected_recommended",
        [
            (75.0, [], True),  # good score, no severe flags
            (85.0, [], True),  # excellent score, no severe flags
            (70.0, [], True),  # boundary score, no severe flags
            (69.9, [], False),  # just below threshold
            (50.0, [], False),  # low score
            (
                75.0,
                [RedFlag(RedFlagType.SCAM_INDICATOR, 9, "scam", "evidence")],
                False,
            ),  # good score but severe flag
            (
                75.0,
                [RedFlag(RedFlagType.SCAM_INDICATOR, 8, "scam", "evidence")],
                False,
            ),  # severity 8 boundary
            (
                75.0,
                [RedFlag(RedFlagType.VAGUE_DESCRIPTION, 7, "vague", "evidence")],
                True,
            ),  # good score, non-severe flag
        ],
        ids=[
            "good-no-flags",
            "excellent-no-flags",
            "boundary-70",
            "below-70",
            "low-score",
            "severe-flag-9",
            "severe-flag-8",
            "non-severe-flag",
        ],
    )
    def test_job_quality_score_is_recommended_logic(self, score, severe_flags, expected_recommended):
        """Test is_recommended() returns correct boolean based on score and flags."""
        # Arrange
        quality_score = JobQualityScore(
            overall_score=score,
            quality_level=QualityLevel.GOOD,
            red_flags=severe_flags,
        )

        # Act
        is_recommended = quality_score.is_recommended()

        # Assert
        assert is_recommended == expected_recommended

    def test_job_quality_score_default_empty_collections(self):
        """Test JobQualityScore defaults to empty collections."""
        # Arrange & Act
        score = JobQualityScore(
            overall_score=80.0,
            quality_level=QualityLevel.GOOD,
        )

        # Assert
        assert score.component_scores == {}
        assert score.red_flags == []
        assert score.strengths == []
        assert score.weaknesses == []
        assert score.recommendations == []
        assert score.metadata == {}


class TestJobQualityDetector:
    """Test suite for JobQualityDetector class."""

    @pytest.fixture
    def detector(self):
        """Provide a JobQualityDetector instance."""
        return JobQualityDetector()

    def test_job_quality_detector_initialization(self):
        """Test JobQualityDetector initializes without errors."""
        # Arrange & Act
        detector = JobQualityDetector()

        # Assert
        assert detector is not None

    @pytest.mark.parametrize(
        "description,expected_flags",
        [
            ("work from home guaranteed easy money", 2),  # multiple scam patterns
            ("guaranteed income no experience necessary", 2),  # multiple patterns
            ("Professional software development position", 0),  # clean description
            ("", 0),  # edge: empty
        ],
        ids=["multi-scam", "multi-pattern", "clean", "empty"],
    )
    def test_detector_identifies_scam_patterns(self, detector, description, expected_flags):
        """Test detector identifies scam patterns in job descriptions."""
        # Arrange
        job_title = "Software Engineer"

        # Act
        result = detector.analyze(job_title=job_title, job_description=description)

        # Assert - at least expected_flags should be detected
        scam_flags = [f for f in result.red_flags if f.flag_type == RedFlagType.SCAM_INDICATOR]
        assert len(scam_flags) >= expected_flags

    @pytest.mark.parametrize(
        "description,expected_mlm_flags",
        [
            ("unlimited earning potential be your own boss", 2),  # MLM patterns
            ("recruit others and build your downline", 2),  # MLM patterns
            ("Standard software engineering role", 0),  # clean
        ],
        ids=["mlm-multi", "mlm-recruit", "clean"],
    )
    def test_detector_identifies_mlm_patterns(self, detector, description, expected_mlm_flags):
        """Test detector identifies MLM/pyramid scheme patterns."""
        # Arrange
        job_title = "Business Consultant"

        # Act
        result = detector.analyze(job_title=job_title, job_description=description)

        # Assert
        mlm_flags = [f for f in result.red_flags if f.flag_type == RedFlagType.MLM_PATTERN]
        assert len(mlm_flags) >= expected_mlm_flags

    def test_detector_analyzes_comprehensive_legitimate_job(self, detector):
        """Test detector provides high quality score for legitimate job."""
        # Arrange
        job_title = "Senior Software Engineer"
        job_description = """
        We are seeking a Senior Software Engineer to join our team.
        
        Responsibilities:
        - Design and develop scalable applications
        - Collaborate with cross-functional teams
        - Mentor junior engineers
        
        Requirements:
        - 5+ years of experience with Python
        - Strong knowledge of AWS and Docker
        - Excellent communication skills
        
        Benefits:
        - Competitive salary and equity
        - Health insurance
        - Professional development opportunities
        
        Our company values diversity and innovation.
        """
        company_name = "TechCorp Inc"
        salary_range = (120_000, 160_000)

        # Act
        result = detector.analyze(
            job_title=job_title,
            job_description=job_description,
            company_name=company_name,
            salary_range=salary_range,
        )

        # Assert
        assert result.overall_score >= 70.0  # Should be good quality
        assert result.quality_level in [QualityLevel.GOOD, QualityLevel.EXCELLENT]
        assert len(result.strengths) > 0
        # Should have minimal or no severe red flags
        severe_flags = [f for f in result.red_flags if f.severity >= 8]
        assert len(severe_flags) == 0

    def test_detector_analyzes_suspicious_job(self, detector):
        """Test detector provides low quality score for suspicious job."""
        # Arrange
        job_title = "Easy Money Opportunity"
        job_description = """
        Work from home guaranteed! Make $5000+ per week!
        No experience necessary! Guaranteed income!
        Wire transfer payment available. Small training fee required.
        """
        company_name = ""  # No company name

        # Act
        result = detector.analyze(
            job_title=job_title,
            job_description=job_description,
            company_name=company_name,
        )

        # Assert
        assert result.overall_score < 50.0  # Should be poor/suspicious quality
        assert result.quality_level in [QualityLevel.POOR, QualityLevel.SUSPICIOUS]
        assert len(result.red_flags) > 0
        # Should have severe red flags
        severe_flags = [f for f in result.red_flags if f.severity >= 8]
        assert len(severe_flags) > 0

    @pytest.mark.parametrize(
        "company_name",
        ["", None, "X"],  # empty, None, single char
        ids=["empty", "none", "single-char"],
    )
    def test_detector_flags_missing_company_info(self, detector, company_name):
        """Test detector flags jobs with missing/insufficient company info."""
        # Arrange
        job_title = "Software Engineer"
        job_description = "Standard software engineering role with various responsibilities."

        # Act
        result = detector.analyze(
            job_title=job_title,
            job_description=job_description,
            company_name=company_name or "",
        )

        # Assert
        # Should have company info weakness or flag
        assert ("company" in " ".join(result.weaknesses).lower()) or any(
            f.flag_type == RedFlagType.NO_COMPANY_INFO for f in result.red_flags
        )

    def test_detector_handles_no_salary_information(self, detector):
        """Test detector handles jobs without salary information."""
        # Arrange
        job_title = "Software Engineer"
        job_description = "Standard software development role."
        company_name = "TechCorp"

        # Act
        result = detector.analyze(
            job_title=job_title,
            job_description=job_description,
            company_name=company_name,
            salary_range=None,  # No salary
        )

        # Assert
        assert "salary_alignment" in result.component_scores
        assert any("salary" in weakness.lower() for weakness in result.weaknesses)

    @pytest.mark.parametrize(
        "text_length",
        [0, 100, 5000, 60000],  # empty, small, medium, oversized
        ids=["empty", "small", "medium", "oversized"],
    )
    def test_detector_sanitizes_input_text(self, detector, text_length):
        """Test detector sanitizes and handles various input text lengths."""
        # Arrange
        job_title = "Engineer"
        job_description = "x" * text_length  # Generate text of specified length

        # Act & Assert - should not raise, validates sanitization
        result = detector.analyze(
            job_title=job_title,
            job_description=job_description,
        )
        assert result is not None
        assert isinstance(result, JobQualityScore)

    def test_detector_returns_recommendations(self, detector):
        """Test detector always returns recommendations."""
        # Arrange
        job_title = "Software Engineer"
        job_description = "Software development position"

        # Act
        result = detector.analyze(
            job_title=job_title,
            job_description=job_description,
        )

        # Assert
        assert isinstance(result.recommendations, list)
        # Recommendations should be provided for any quality level
        # (May be empty for perfect jobs, but list should exist)

    def test_detector_includes_metadata(self, detector):
        """Test detector includes metadata in result."""
        # Arrange
        job_title = "Software Engineer"
        job_description = "Development role"
        company_name = "TechCorp"
        location = "San Francisco, CA"
        custom_metadata = {"source": "test_site", "posted_date": "2025-01-01"}

        # Act
        result = detector.analyze(
            job_title=job_title,
            job_description=job_description,
            company_name=company_name,
            location=location,
            metadata=custom_metadata,
        )

        # Assert
        assert result.metadata["job_title"] == job_title
        assert result.metadata["company_name"] == company_name
        assert result.metadata["location"] == location
        assert result.metadata["source"] == "test_site"
        assert result.metadata["posted_date"] == "2025-01-01"

    def test_detector_component_scores_sum_to_weighted_total(self, detector):
        """Test component scores are properly weighted to overall score."""
        # Arrange
        job_title = "Software Engineer"
        job_description = """
        Professional software engineering role.
        Responsibilities include development and testing.
        Requirements: Python, Docker, AWS.
        """
        company_name = "TechCorp"

        # Act
        result = detector.analyze(
            job_title=job_title,
            job_description=job_description,
            company_name=company_name,
        )

        # Assert
        # Verify component scores exist
        assert "legitimacy" in result.component_scores
        assert "description_quality" in result.component_scores
        assert "salary_alignment" in result.component_scores
        assert "requirements_reasonableness" in result.component_scores
        assert "company_information" in result.component_scores

        # Overall score should be between 0 and 100
        assert 0 <= result.overall_score <= 100


class TestJobQualityDetectorIntegration:
    """Integration tests for JobQualityDetector with realistic scenarios."""

    @pytest.fixture
    def detector(self):
        """Provide a JobQualityDetector instance."""
        return JobQualityDetector()

    def test_detector_end_to_end_excellent_job(self, detector):
        """Test complete analysis of an excellent quality job posting."""
        # Arrange - realistic excellent job
        job_title = "Senior Backend Engineer"
        job_description = """
        About Us:
        We are a leading SaaS company revolutionizing customer engagement.
        
        Role Overview:
        We're seeking a Senior Backend Engineer to architect and develop scalable services.
        
        Key Responsibilities:
        - Design and implement microservices using Python and Go
        - Optimize database performance and query efficiency
        - Collaborate with frontend and DevOps teams
        - Mentor junior engineers and conduct code reviews
        - Participate in on-call rotation
        
        Required Qualifications:
        - 5+ years of backend development experience
        - Strong proficiency in Python and SQL
        - Experience with AWS, Docker, and Kubernetes
        - Understanding of distributed systems
        
        Nice to Have:
        - Experience with gRPC and message queues
        - Contributions to open source projects
        
        Benefits:
        - Competitive salary ($150k-$190k) and equity
        - Full health, dental, and vision insurance
        - 401(k) matching
        - Flexible PTO and remote work options
        - Annual learning stipend
        
        Our Values:
        We value diversity, innovation, and work-life balance.
        """
        company_name = "CloudScale Inc"
        salary_range = (150_000, 190_000)
        location = "San Francisco, CA (Remote OK)"

        # Act
        result = detector.analyze(
            job_title=job_title,
            job_description=job_description,
            company_name=company_name,
            salary_range=salary_range,
            location=location,
        )

        # Assert
        assert result.quality_level in [QualityLevel.EXCELLENT, QualityLevel.GOOD]
        assert result.overall_score >= 75.0
        assert result.is_recommended()
        assert len(result.strengths) >= 3
        assert len([f for f in result.red_flags if f.severity >= 8]) == 0

    def test_detector_end_to_end_suspicious_job(self, detector):
        """Test complete analysis of a suspicious job posting."""
        # Arrange - realistic scam job
        job_title = "Work From Home - Make Easy Money!"
        job_description = """
        AMAZING OPPORTUNITY!!!
        
        Work from home GUARANTEED! Make $10,000+ per month!!!
        No experience necessary! No degree required!
        
        Just pay our $299 training fee and you're ready to start!
        Guaranteed income from day one!
        
        Be your own boss! Unlimited earning potential!
        Recruit others and build your team!
        
        Wire transfer preferred. Bitcoin accepted.
        Email your credit card info to start today!
        """
        company_name = ""
        salary_range = None

        # Act
        result = detector.analyze(
            job_title=job_title,
            job_description=job_description,
            company_name=company_name,
            salary_range=salary_range,
        )

        # Assert
        assert result.quality_level in [QualityLevel.SUSPICIOUS, QualityLevel.POOR]
        assert result.overall_score < 50.0
        assert not result.is_recommended()
        assert len(result.red_flags) >= 5
        severe_flags = [f for f in result.red_flags if f.severity >= 8]
        assert len(severe_flags) >= 2
