"""
Tests for Bias Detector

Validates bias detection across gender, age, salary, and location dimensions.
"""

import pytest
from src.domains.detection.bias_detector import (
    BiasDetector,
    BiasType,
    BiasSeverity,
)


class TestBiasDetector:
    """Test suite for bias detection."""

    def setup_method(self):
        """Setup detector for each test."""
        self.detector = BiasDetector()

    def test_no_bias_clean_posting(self):
        """Test job posting with no bias."""
        result = self.detector.detect_bias(
            job_title="Software Engineer",
            job_description="""
            We're seeking a software engineer to join our team.
            
            Responsibilities include:
            - Design and implement backend systems
            - Collaborate with cross-functional teams
            - Mentor team members
            
            Qualifications:
            - 5+ years of experience with Python
            - Strong communication skills
            - Bachelor's degree in CS or equivalent experience
            
            Benefits:
            - Competitive salary: $120,000 - $150,000
            - Health insurance and 401k matching
            - Remote work options available
            
            We value diversity and equal opportunity.
            """,
            company_name="TechCorp",
        )

        assert result.has_bias is False
        assert result.overall_bias_score == 0.0
        assert BiasType.NO_BIAS in result.bias_types
        assert len(result.indicators) == 0

    def test_gender_bias_gendered_pronouns(self):
        """Test detection of gendered pronouns."""
        result = self.detector.detect_bias(
            job_title="Project Manager",
            job_description="The ideal candidate will manage his team effectively and report to his supervisor.",
        )

        assert result.has_bias is True
        assert BiasType.GENDER_BIAS in result.bias_types
        assert len(result.indicators) >= 2  # Two instances of "his"
        assert result.overall_bias_score > 0.5
        assert any(ind.severity == BiasSeverity.HIGH for ind in result.indicators)

    def test_gender_bias_gendered_job_titles(self):
        """Test detection of gendered job titles."""
        result = self.detector.detect_bias(
            job_title="Salesman",
            job_description="We need a hardworking salesman to join our team.",
        )

        assert result.has_bias is True
        assert BiasType.GENDER_BIAS in result.bias_types
        assert any("salesman" in ind.pattern.lower() for ind in result.indicators)
        assert any(ind.severity == BiasSeverity.HIGH for ind in result.indicators)

    def test_gender_bias_masculine_coded_language(self):
        """Test detection of masculine-coded adjectives."""
        result = self.detector.detect_bias(
            job_title="Sales Leader",
            job_description="Seeking aggressive, dominant, and competitive individual.",
        )

        assert result.has_bias is True
        assert BiasType.GENDER_BIAS in result.bias_types
        # Should detect multiple masculine-coded adjectives
        gender_indicators = [ind for ind in result.indicators if ind.bias_type == BiasType.GENDER_BIAS]
        assert len(gender_indicators) >= 2

    def test_gender_bias_feminine_coded_language(self):
        """Test detection of feminine-coded adjectives."""
        result = self.detector.detect_bias(
            job_title="Nurse",
            job_description="We need a nurturing and supportive team member with interpersonal skills.",
        )

        assert result.has_bias is True
        assert BiasType.GENDER_BIAS in result.bias_types
        gender_indicators = [ind for ind in result.indicators if ind.bias_type == BiasType.GENDER_BIAS]
        assert len(gender_indicators) >= 2

    def test_age_bias_direct_age_requirement(self):
        """Test detection of direct age requirements (ADEA violation)."""
        result = self.detector.detect_bias(
            job_title="Warehouse Worker",
            job_description="Must be under 40 years old. Physically demanding role.",
        )

        assert result.has_bias is True
        assert BiasType.AGE_BIAS in result.bias_types
        assert any(ind.severity == BiasSeverity.CRITICAL for ind in result.indicators)
        assert "ADEA" in result.explanation or any("ADEA" in ind.explanation for ind in result.indicators)

    def test_age_bias_age_range(self):
        """Test detection of age range requirements."""
        result = self.detector.detect_bias(
            job_title="Entry Level Developer",
            job_description="Looking for candidates 22-28 years old for this exciting opportunity.",
        )

        assert result.has_bias is True
        assert BiasType.AGE_BIAS in result.bias_types
        assert any(ind.severity == BiasSeverity.CRITICAL for ind in result.indicators)

    def test_age_bias_coded_language_young(self):
        """Test detection of age-coded language favoring younger candidates."""
        result = self.detector.detect_bias(
            job_title="Marketing Associate",
            job_description="We want young, energetic digital natives who are recent graduates.",
        )

        assert result.has_bias is True
        assert BiasType.AGE_BIAS in result.bias_types
        # Should detect multiple age-coded terms
        age_indicators = [ind for ind in result.indicators if ind.bias_type == BiasType.AGE_BIAS]
        assert len(age_indicators) >= 2

    def test_age_bias_coded_language_experienced(self):
        """Test detection of age-coded language that may signal older preferences."""
        result = self.detector.detect_bias(
            job_title="Senior Consultant",
            job_description="Seeking mature and seasoned professionals for senior-level positions.",
        )

        assert result.has_bias is True
        assert BiasType.AGE_BIAS in result.bias_types
        age_indicators = [ind for ind in result.indicators if ind.bias_type == BiasType.AGE_BIAS]
        assert len(age_indicators) >= 2

    def test_salary_bias_hidden_salary(self):
        """Test detection of hidden salary (pay equity issue)."""
        result = self.detector.detect_bias(
            job_title="Data Analyst",
            job_description="Competitive salary and benefits package. Great opportunity!",
        )

        assert result.has_bias is True
        assert BiasType.SALARY_BIAS in result.bias_types
        assert any("competitive salary" in ind.pattern.lower() for ind in result.indicators)

    def test_salary_bias_commensurate_with_experience(self):
        """Test detection of vague salary language."""
        result = self.detector.detect_bias(
            job_title="Engineer",
            job_description="Salary commensurate with experience. Apply today!",
        )

        assert result.has_bias is True
        assert BiasType.SALARY_BIAS in result.bias_types
        assert any(ind.bias_type == BiasType.SALARY_BIAS for ind in result.indicators)

    def test_salary_bias_wide_range(self):
        """Test detection of very wide salary range (>30% spread)."""
        result = self.detector.detect_bias(
            job_title="Manager",
            job_description="Salary range: $60,000 - $120,000 depending on qualifications.",
        )

        assert result.has_bias is True
        assert BiasType.SALARY_BIAS in result.bias_types
        # 100% spread should be flagged
        salary_indicators = [ind for ind in result.indicators if ind.bias_type == BiasType.SALARY_BIAS]
        assert len(salary_indicators) >= 1

    def test_salary_no_bias_narrow_range(self):
        """Test that narrow salary ranges (<30%) don't trigger bias."""
        result = self.detector.detect_bias(
            job_title="Developer",
            job_description="Salary range: $100,000 - $120,000 based on experience level.",
        )

        # 20% spread should not trigger salary range bias
        salary_range_indicators = [
            ind
            for ind in result.indicators
            if ind.bias_type == BiasType.SALARY_BIAS and "wide" in ind.explanation.lower()
        ]
        assert len(salary_range_indicators) == 0

    def test_location_bias_must_relocate(self):
        """Test detection of mandatory relocation requirements."""
        result = self.detector.detect_bias(
            job_title="Operations Manager",
            job_description="Must relocate to San Francisco. No remote options available.",
        )

        assert result.has_bias is True
        assert BiasType.LOCATION_BIAS in result.bias_types
        assert any(ind.bias_type == BiasType.LOCATION_BIAS for ind in result.indicators)

    def test_location_bias_local_only(self):
        """Test detection of local-only requirements."""
        result = self.detector.detect_bias(
            job_title="Sales Representative",
            job_description="Local candidates only. Must live in Boston area.",
        )

        assert result.has_bias is True
        assert BiasType.LOCATION_BIAS in result.bias_types
        location_indicators = [ind for ind in result.indicators if ind.bias_type == BiasType.LOCATION_BIAS]
        assert len(location_indicators) >= 2

    def test_location_bias_no_remote(self):
        """Test detection of no-remote policies."""
        result = self.detector.detect_bias(
            job_title="Accountant",
            job_description="No remote work. Office only, in-person required 5 days/week.",
        )

        assert result.has_bias is True
        assert BiasType.LOCATION_BIAS in result.bias_types

    def test_multiple_bias_types(self):
        """Test detection of multiple bias types in one posting."""
        result = self.detector.detect_bias(
            job_title="Salesman",
            job_description="""
            Seeking aggressive young salesman under 30 years old.
            Must live in New York. Competitive salary.
            He will report to the regional manager.
            """,
        )

        assert result.has_bias is True
        # Should detect gender, age, location, and salary bias
        assert len(result.bias_types) >= 3
        assert BiasType.GENDER_BIAS in result.bias_types
        assert BiasType.AGE_BIAS in result.bias_types
        assert BiasType.LOCATION_BIAS in result.bias_types
        assert BiasType.SALARY_BIAS in result.bias_types

        # Should have high bias score
        assert result.overall_bias_score >= 0.6

    def test_bias_score_calculation(self):
        """Test bias score calculation is reasonable."""
        # Low bias
        result_low = self.detector.detect_bias(
            job_title="Analyst",
            job_description="Office only position. Local preferred.",
        )
        # Should be low bias (only location, low severity)
        assert 0.0 < result_low.overall_bias_score < 0.3

        # High bias
        result_high = self.detector.detect_bias(
            job_title="Worker",
            job_description="Must be under 25 years old. SSN required upfront.",
        )
        # Should be high bias (critical age requirement)
        assert result_high.overall_bias_score > 0.7

    def test_suggestions_provided(self):
        """Test that actionable suggestions are provided."""
        result = self.detector.detect_bias(
            job_title="Salesman",
            job_description="Looking for young, aggressive salesman under 30. Competitive salary.",
        )

        assert result.has_bias is True
        assert len(result.suggestions) > 0
        # Should have suggestions for each bias type detected
        assert any("gender" in s.lower() for s in result.suggestions)
        assert any("age" in s.lower() or "ADEA" in s for s in result.suggestions)

    def test_alternatives_provided(self):
        """Test that alternatives are provided for each indicator."""
        result = self.detector.detect_bias(
            job_title="Salesman",
            job_description="Seeking aggressive salesman who will report to his manager.",
        )

        assert result.has_bias is True
        # Each indicator should have an alternative
        for indicator in result.indicators:
            assert indicator.alternative != ""
            assert len(indicator.alternative) > 0

    def test_explanation_generated(self):
        """Test that explanation is generated."""
        result = self.detector.detect_bias(
            job_title="Engineer",
            job_description="Young, energetic recent graduate needed.",
        )

        assert result.has_bias is True
        assert result.explanation != ""
        assert "bias score" in result.explanation.lower()
        assert len(result.indicators) > 0

    def test_metadata_populated(self):
        """Test that metadata is properly populated."""
        result = self.detector.detect_bias(
            job_title="Manager",
            job_description="Must be under 35. Young and aggressive. No remote work. Competitive salary.",
        )

        assert "total_indicators" in result.metadata
        assert result.metadata["total_indicators"] == len(result.indicators)
        assert "critical_count" in result.metadata
        assert "high_count" in result.metadata
        assert "medium_count" in result.metadata
        assert "low_count" in result.metadata

    def test_context_captured(self):
        """Test that context is captured for each indicator."""
        result = self.detector.detect_bias(
            job_title="Developer",
            job_description="The developer will work with his team on various projects.",
        )

        assert result.has_bias is True
        for indicator in result.indicators:
            assert indicator.context != ""
            # Context should include the matched pattern
            assert indicator.pattern in indicator.context.lower()

    def test_input_validation_empty_title(self):
        """Test input validation for empty title."""
        with pytest.raises(ValueError, match="Job title and description required"):
            self.detector.detect_bias(job_title="", job_description="Test description")

    def test_input_validation_empty_description(self):
        """Test input validation for empty description."""
        with pytest.raises(ValueError, match="Job title and description required"):
            self.detector.detect_bias(job_title="Test Title", job_description="")

    def test_input_validation_too_long(self):
        """Test input validation for overly long descriptions."""
        long_text = "x" * 60000  # 60KB, over 50KB limit
        with pytest.raises(ValueError, match="too long"):
            self.detector.detect_bias(job_title="Test", job_description=long_text)

    def test_case_insensitive_matching(self):
        """Test that pattern matching is case-insensitive."""
        result_lower = self.detector.detect_bias(
            job_title="Manager",
            job_description="looking for aggressive young salesman",
        )

        result_upper = self.detector.detect_bias(
            job_title="Manager",
            job_description="LOOKING FOR AGGRESSIVE YOUNG SALESMAN",
        )

        result_mixed = self.detector.detect_bias(
            job_title="Manager",
            job_description="Looking For Aggressive Young Salesman",
        )

        # All should detect the same bias
        assert result_lower.has_bias is True
        assert result_upper.has_bias is True
        assert result_mixed.has_bias is True

        # Should have similar number of indicators
        assert len(result_lower.indicators) == len(result_upper.indicators)
        assert len(result_lower.indicators) == len(result_mixed.indicators)

    def test_position_tracking(self):
        """Test that start and end positions are tracked."""
        result = self.detector.detect_bias(
            job_title="Engineer",
            job_description="We need an aggressive young engineer who will report to his manager.",
        )

        assert result.has_bias is True
        for indicator in result.indicators:
            # Positions should be non-negative
            assert indicator.start_pos >= 0
            assert indicator.end_pos > indicator.start_pos

    def test_confidence_scores(self):
        """Test that confidence scores are reasonable."""
        result = self.detector.detect_bias(
            job_title="Worker",
            job_description="Must be under 30 years old. Competitive salary.",
        )

        assert result.has_bias is True
        for indicator in result.indicators:
            # Confidence should be between 0 and 1
            assert 0.0 <= indicator.confidence <= 1.0
            # Age requirement (ADEA violation) should have very high confidence
            if indicator.severity == BiasSeverity.CRITICAL:
                assert indicator.confidence >= 0.9

    def test_real_world_inclusive_posting(self):
        """Test a real-world inclusive job posting."""
        result = self.detector.detect_bias(
            job_title="Senior Software Engineer - Backend",
            job_description="""
            About the Role:
            We're seeking a talented backend engineer to join our growing team.
            
            Responsibilities:
            - Design and implement scalable backend services
            - Collaborate with cross-functional teams
            - Mentor and support team members
            - Participate in code reviews and technical discussions
            
            Required Qualifications:
            - 5+ years of professional software development experience
            - Strong proficiency in Python and related frameworks
            - Experience with cloud platforms (AWS, GCP, or Azure)
            - Excellent problem-solving and communication skills
            
            Preferred Qualifications:
            - Experience with microservices architecture
            - Familiarity with containerization (Docker, Kubernetes)
            - Contributions to open-source projects
            
            Compensation & Benefits:
            - Salary range: $140,000 - $170,000 based on experience
            - Equity package
            - Comprehensive health, dental, and vision insurance
            - 401(k) with company match
            - Flexible PTO policy
            - Remote work options available
            
            Our Commitment:
            We are an equal opportunity employer committed to building a diverse
            and inclusive workplace. We welcome applicants from all backgrounds
            and encourage candidates who may not meet 100% of qualifications to apply.
            """,
            company_name="TechCorp Inc",
        )

        assert result.has_bias is False
        assert result.overall_bias_score == 0.0
        assert BiasType.NO_BIAS in result.bias_types
        assert len(result.indicators) == 0

    def test_real_world_problematic_posting(self):
        """Test a real-world problematic job posting."""
        result = self.detector.detect_bias(
            job_title="Office Manager / Receptionist",
            job_description="""
            We're looking for a young, energetic recent graduate to join our team
            as an office manager. She will be responsible for greeting visitors,
            answering phones, and providing administrative support.
            
            Requirements:
            - Must be under 30 years old
            - Attractive personality and appearance
            - Recent college graduate preferred
            - Must be located in downtown area, no remote work
            
            Salary commensurate with experience.
            """,
        )

        assert result.has_bias is True
        # Should detect gender, age, location, and salary bias
        assert BiasType.GENDER_BIAS in result.bias_types
        assert BiasType.AGE_BIAS in result.bias_types
        assert BiasType.LOCATION_BIAS in result.bias_types
        assert BiasType.SALARY_BIAS in result.bias_types

        # Should have high bias score due to critical ADEA violation
        assert result.overall_bias_score > 0.7

        # Should have actionable suggestions
        assert len(result.suggestions) >= 3
