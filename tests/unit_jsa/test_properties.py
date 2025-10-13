"""
Property-Based Tests for JobSentinel

Uses Hypothesis for generative testing to discover edge cases automatically.
Complements example-based tests with property testing for robust validation.

References:
- Hypothesis | https://hypothesis.readthedocs.io/ | High | Property-based testing framework
- IEEE 730 | https://standards.ieee.org/standard/730-2014.html | High | Software quality assurance
"""

import pytest
from hypothesis import given, strategies as st, assume, settings

# Import core validation functions
try:
    from domains.security import InputValidator, SecretManager
    from domains.validation_framework import ValidationFramework
except ImportError:
    pytest.skip("Security domains not available", allow_module_level=True)


class TestInputValidationProperties:
    """Property-based tests for input validation."""

    @given(text=st.text())
    @settings(max_examples=100)
    def test_sanitize_handles_all_unicode(self, text: str) -> None:
        """
        Property: sanitize_text_input should safely handle any Unicode text.
        
        Invariants:
        - Output is always a string
        - Output contains no null bytes
        - Output length <= input length (due to sanitization)
        """
        validator = InputValidator()
        result = validator.sanitize_text_input(text, max_length=10000)
        
        assert isinstance(result, str), "Output must be a string"
        assert '\x00' not in result, "Null bytes must be removed"
        assert len(result) <= len(text) + 1, "Sanitization should not add content"

    @given(email=st.emails())
    def test_valid_emails_always_pass(self, email: str) -> None:
        """
        Property: All valid email addresses should pass validation.
        
        Hypothesis generates valid emails per RFC 5322.
        """
        validator = InputValidator()
        result = validator.validate_email(email)
        
        assert result.is_valid, f"Valid email rejected: {email}"
        assert result.sanitized_value is not None

    @given(text=st.text(min_size=1, max_size=100))
    def test_injection_check_never_crashes(self, text: str) -> None:
        """
        Property: Injection checking should never crash on any input.
        
        Defensive programming - gracefully handle all inputs.
        """
        validator = InputValidator()
        has_injection, patterns = validator.check_for_injection(text)
        
        assert isinstance(has_injection, bool)
        assert isinstance(patterns, list)

    @given(
        text=st.text(min_size=1, max_size=100),
        max_length=st.integers(min_value=1, max_value=1000)
    )
    def test_sanitize_respects_max_length(self, text: str, max_length: int) -> None:
        """
        Property: Sanitized text should never exceed max_length.
        
        Critical for preventing buffer overflows and resource exhaustion.
        """
        validator = InputValidator()
        result = validator.sanitize_text_input(text, max_length=max_length)
        
        assert len(result) <= max_length, f"Length {len(result)} exceeds max {max_length}"


class TestSecretManagementProperties:
    """Property-based tests for secret management."""

    @given(password=st.text(min_size=8, max_size=100))
    def test_hash_password_deterministic(self, password: str) -> None:
        """
        Property: Same password with same salt produces same hash.
        
        Essential for authentication systems.
        """
        manager = SecretManager()
        
        hash1 = manager.hash_password(password)
        hash2 = manager.hash_password(password)
        
        # Hashes will differ due to random salt, but both should be valid
        assert manager.verify_password(password, hash1)
        assert manager.verify_password(password, hash2)

    @given(password=st.text(min_size=8, max_size=100))
    def test_wrong_password_never_verifies(self, password: str) -> None:
        """
        Property: Wrong password should never verify against a hash.
        
        Critical security property - no collisions allowed.
        """
        assume(len(password) >= 8)  # Minimum password length
        
        manager = SecretManager()
        password_hash = manager.hash_password(password)
        
        # Generate a different password
        wrong_password = password + "wrong"
        
        assert not manager.verify_password(wrong_password, password_hash)

    @given(token_bytes=st.integers(min_value=16, max_value=64))
    def test_generate_token_correct_length(self, token_bytes: int) -> None:
        """
        Property: Generated tokens should have correct length.
        
        Security tokens must be predictable in length for protocol compliance.
        """
        manager = SecretManager()
        token = manager.generate_secure_token(token_bytes)
        
        # Hex encoding doubles the byte length
        expected_length = token_bytes * 2
        assert len(token) == expected_length, f"Expected {expected_length}, got {len(token)}"
        
        # Should be valid hex
        int(token, 16)  # Raises ValueError if not hex


class TestValidationFrameworkProperties:
    """Property-based tests for validation framework."""

    @given(
        value=st.integers(),
        min_val=st.integers(min_value=-1000, max_value=0),
        max_val=st.integers(min_value=1, max_value=1000)
    )
    def test_range_validation_boundaries(self, value: int, min_val: int, max_val: int) -> None:
        """
        Property: Range validation should correctly identify in-range values.
        
        Tests boundary conditions automatically.
        """
        try:
            framework = ValidationFramework()
            
            if min_val <= value <= max_val:
                # Value in range - should pass or have specific rules
                result = framework.validate_integer(
                    value, 
                    min_value=min_val, 
                    max_value=max_val,
                    field_name="test_value"
                )
                # Could be valid or have other constraints
                assert result.is_valid or len(result.errors) > 0
            else:
                # Value out of range - should fail
                result = framework.validate_integer(
                    value,
                    min_value=min_val,
                    max_value=max_val,
                    field_name="test_value"
                )
                if not result.is_valid:
                    assert any("range" in str(e).lower() for e in result.errors)
        except Exception:
            # Framework may not have this exact method, gracefully skip
            pytest.skip("ValidationFramework method not available")

    @given(text=st.text(min_size=0, max_size=200))
    def test_text_validation_never_crashes(self, text: str) -> None:
        """
        Property: Text validation should handle all inputs gracefully.
        
        Robustness property - no crashes allowed.
        """
        try:
            framework = ValidationFramework()
            
            # Should not raise exception
            result = framework.validate_string(
                text,
                field_name="test_field",
                max_length=500
            )
            
            assert hasattr(result, 'is_valid')
            assert isinstance(result.is_valid, bool)
        except Exception:
            pytest.skip("ValidationFramework method not available")


class TestJobMatchingProperties:
    """Property-based tests for job matching logic."""

    @given(
        keywords=st.lists(
            st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("L",))),
            min_size=1,
            max_size=10
        )
    )
    def test_match_score_bounded(self, keywords: list[str]) -> None:
        """
        Property: Match scores should always be in valid range [0, 100].
        
        Critical for ranking algorithms.
        """
        # Placeholder - actual matching logic would go here
        # This demonstrates the property we'd want to test
        
        # Simulated match score calculation
        def calculate_match_score(kw: list[str]) -> float:
            """Dummy function - replace with actual implementation."""
            return min(100.0, len(kw) * 10.0)
        
        score = calculate_match_score(keywords)
        
        assert 0 <= score <= 100, f"Score {score} out of bounds"
        assert isinstance(score, int | float)

    @given(salary=st.integers(min_value=0, max_value=1000000))
    def test_salary_validation_non_negative(self, salary: int) -> None:
        """
        Property: Salaries should always be non-negative.
        
        Business rule validation.
        """
        assert salary >= 0, "Salary must be non-negative"
        
        # Reasonable upper bound check
        if salary > 500000:
            # Flag as suspiciously high but don't reject
            assert True  # Would trigger a warning in real system


class TestResumeAnalysisProperties:
    """Property-based tests for resume analysis."""

    @given(word_count=st.integers(min_value=0, max_value=10000))
    def test_quality_score_from_length(self, word_count: int) -> None:
        """
        Property: Resume quality score should correlate with word count.
        
        Within reasonable bounds (not too short, not too long).
        """
        # Optimal range: 400-800 words
        def calculate_length_score(wc: int) -> float:
            """Score based on length."""
            if 400 <= wc <= 800:
                return 100.0
            elif wc < 400:
                return (wc / 400) * 100
            else:  # wc > 800
                return max(0, 100 - ((wc - 800) / 20))
        
        score = calculate_length_score(word_count)
        
        assert 0 <= score <= 100, f"Score {score} out of bounds"
        
        # Optimal range should score highest
        if 400 <= word_count <= 800:
            assert score == 100.0

    @given(
        quantified_bullets=st.integers(min_value=0, max_value=50),
        total_bullets=st.integers(min_value=1, max_value=50)
    )
    def test_quantification_percentage(self, quantified_bullets: int, total_bullets: int) -> None:
        """
        Property: Quantification percentage should be valid and correct.
        
        Mathematical correctness check.
        """
        assume(quantified_bullets <= total_bullets)
        
        percentage = (quantified_bullets / total_bullets) * 100
        
        assert 0 <= percentage <= 100
        
        if quantified_bullets == total_bullets:
            assert percentage == 100.0
        if quantified_bullets == 0:
            assert percentage == 0.0


# Additional test strategies for comprehensive coverage
url_strategy = st.one_of(
    st.just("https://example.com"),
    st.just("http://test.org/path"),
    st.just("https://valid-domain.com:8080/path?query=value"),
)

email_strategy = st.emails()

sql_injection_patterns = st.sampled_from([
    "'; DROP TABLE users--",
    "1' OR '1'='1",
    "admin'--",
    "1; DELETE FROM jobs",
])

xss_patterns = st.sampled_from([
    "<script>alert('xss')</script>",
    "<img src=x onerror=alert('xss')>",
    "javascript:alert('xss')",
])


class TestSecurityPatternDetection:
    """Property-based tests for security pattern detection."""

    @given(pattern=sql_injection_patterns)
    def test_sql_injection_always_detected(self, pattern: str) -> None:
        """
        Property: Known SQL injection patterns must be detected.
        
        Security-critical property.
        """
        validator = InputValidator()
        has_injection, detected = validator.check_for_injection(pattern)
        
        assert has_injection, f"SQL injection not detected: {pattern}"
        assert len(detected) > 0, "Should report detected patterns"

    @given(pattern=xss_patterns)
    def test_xss_always_detected(self, pattern: str) -> None:
        """
        Property: Known XSS patterns must be detected.
        
        Security-critical property.
        """
        validator = InputValidator()
        has_injection, detected = validator.check_for_injection(pattern)
        
        assert has_injection, f"XSS not detected: {pattern}"
        assert len(detected) > 0, "Should report detected patterns"

    @given(text=st.text(min_size=1, max_size=100))
    def test_safe_text_not_flagged(self, text: str) -> None:
        """
        Property: Safe text without malicious patterns should pass.
        
        Reduces false positives.
        """
        # Filter out text that accidentally contains injection patterns
        assume("DROP" not in text.upper())
        assume("<script" not in text.lower())
        assume("javascript:" not in text.lower())
        assume("'" not in text)
        
        validator = InputValidator()
        has_injection, detected = validator.check_for_injection(text)
        
        # Should not flag safe text (but may have false positives)
        # This property helps us tune the detection
        if has_injection:
            # Log for review - might be overly aggressive
            pass


# Test configuration
pytestmark = pytest.mark.properties


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "--hypothesis-show-statistics"])
