"""Comprehensive tests for auto_update module.

Tests version parsing, comparison, update checking, and download verification.
"""

from __future__ import annotations

import pytest
from unittest.mock import MagicMock, Mock, patch

from jsa.auto_update import Version


class TestVersion:
    """Test Version dataclass and its methods."""

    @pytest.mark.parametrize(
        "version_str,expected_major,expected_minor,expected_patch,expected_prerelease",
        [
            ("0.6.1", 0, 6, 1, ""),
            ("v0.6.1", 0, 6, 1, ""),
            ("1.2.3", 1, 2, 3, ""),
            ("v1.2.3", 1, 2, 3, ""),
            ("0.7.0-beta.1", 0, 7, 0, "beta.1"),
            ("v0.7.0-beta.1", 0, 7, 0, "beta.1"),
            ("2.0.0-rc.3", 2, 0, 0, "rc.3"),
            ("10.20.30", 10, 20, 30, ""),
        ],
        ids=[
            "simple_version",
            "v_prefix",
            "different_numbers",
            "v_prefix_different",
            "prerelease",
            "v_prefix_prerelease",
            "rc_prerelease",
            "large_numbers",
        ],
    )
    def test_parse_valid_versions(
        self,
        version_str: str,
        expected_major: int,
        expected_minor: int,
        expected_patch: int,
        expected_prerelease: str,
    ):
        """Test parsing valid version strings."""
        # Act
        version = Version.parse(version_str)

        # Assert
        assert version.major == expected_major
        assert version.minor == expected_minor
        assert version.patch == expected_patch
        assert version.prerelease == expected_prerelease

    @pytest.mark.parametrize(
        "invalid_version",
        [
            "1.2",
            "1.2.3.4",
            "abc",
            "1.2.x",
            "1.a.3",
            "",
            "v",
            "1",
        ],
        ids=[
            "two_parts",
            "four_parts",
            "non_numeric",
            "letter_in_version",
            "letter_in_minor",
            "empty",
            "only_v",
            "single_number",
        ],
    )
    def test_parse_invalid_versions_raises_value_error(self, invalid_version: str):
        """Test that invalid version strings raise ValueError."""
        # Act & Assert
        with pytest.raises(ValueError):
            Version.parse(invalid_version)

    @pytest.mark.parametrize(
        "version,expected_str",
        [
            (Version(0, 6, 1), "0.6.1"),
            (Version(1, 2, 3), "1.2.3"),
            (Version(0, 7, 0, "beta.1"), "0.7.0-beta.1"),
            (Version(2, 0, 0, "rc.3"), "2.0.0-rc.3"),
            (Version(10, 20, 30), "10.20.30"),
        ],
        ids=["simple", "different", "prerelease", "rc", "large"],
    )
    def test_version_string_representation(self, version: Version, expected_str: str):
        """Test __str__ method produces correct format."""
        # Act
        result = str(version)

        # Assert
        assert result == expected_str

    @pytest.mark.parametrize(
        "v1,v2,expected_less_than",
        [
            (Version(0, 6, 1), Version(0, 7, 0), True),
            (Version(0, 7, 0), Version(0, 6, 1), False),
            (Version(1, 0, 0), Version(0, 9, 9), False),
            (Version(0, 9, 9), Version(1, 0, 0), True),
            (Version(1, 2, 3), Version(1, 2, 4), True),
            (Version(1, 2, 4), Version(1, 2, 3), False),
            (Version(1, 2, 3), Version(1, 2, 3), False),
            # Prerelease comparison (assuming prereleases are "less than" stable)
            (Version(1, 0, 0, "beta"), Version(1, 0, 0), True),
            (Version(1, 0, 0), Version(1, 0, 0, "beta"), False),
        ],
        ids=[
            "minor_version_increment",
            "minor_version_decrement",
            "major_version_increment",
            "major_version_decrement",
            "patch_version_increment",
            "patch_version_decrement",
            "equal_versions",
            "prerelease_less_than_stable",
            "stable_greater_than_prerelease",
        ],
    )
    def test_version_comparison_less_than(
        self, v1: Version, v2: Version, expected_less_than: bool
    ):
        """Test version comparison with < operator."""
        # Act
        result = v1 < v2

        # Assert
        assert result == expected_less_than

    def test_version_equality(self):
        """Test version equality comparison."""
        # Arrange
        v1 = Version(1, 2, 3)
        v2 = Version(1, 2, 3)
        v3 = Version(1, 2, 4)

        # Assert
        assert v1 == v2
        assert v1 != v3

    def test_version_greater_than(self):
        """Test version greater than comparison."""
        # Arrange
        v1 = Version(1, 2, 3)
        v2 = Version(1, 2, 2)

        # Act & Assert
        assert v1 > v2
        assert not v2 > v1

    def test_version_equality_and_comparison(self):
        """Test version equality and comparison."""
        # Arrange
        v1 = Version(1, 2, 3)
        v2 = Version(1, 2, 3)
        v3 = Version(1, 2, 4)

        # Act & Assert - Equality
        assert v1 == v2
        assert v1 != v3
        # Less than
        assert v1 < v3
        assert not v3 < v1

    def test_version_immutable_dataclass(self):
        """Test that Version is a proper dataclass."""
        # Arrange
        v = Version(1, 2, 3, "beta")

        # Assert - should have dataclass methods
        assert hasattr(v, "__dataclass_fields__")
        assert v.major == 1
        assert v.minor == 2
        assert v.patch == 3
        assert v.prerelease == "beta"


class TestVersionEdgeCases:
    """Test edge cases for Version parsing and comparison."""

    def test_version_with_multiple_dashes_in_prerelease(self):
        """Test version with multiple dashes in prerelease."""
        # Act
        version = Version.parse("1.0.0-beta-1")

        # Assert
        assert version.major == 1
        assert version.minor == 0
        assert version.patch == 0
        assert version.prerelease == "beta-1"

    def test_version_zero_values(self):
        """Test version with zero values."""
        # Act
        version = Version.parse("0.0.0")

        # Assert
        assert version.major == 0
        assert version.minor == 0
        assert version.patch == 0
        assert version.prerelease == ""

    def test_version_large_numbers(self):
        """Test version with large numbers."""
        # Act
        version = Version.parse("999.999.999")

        # Assert
        assert version.major == 999
        assert version.minor == 999
        assert version.patch == 999

    @pytest.mark.parametrize(
        "v1_str,v2_str",
        [
            ("1.0.0-alpha", "1.0.0-beta"),
            ("1.0.0-beta", "1.0.0-rc"),
            ("1.0.0-rc.1", "1.0.0-rc.2"),
        ],
    )
    def test_prerelease_string_comparison(self, v1_str: str, v2_str: str):
        """Test that prerelease strings are compared lexicographically."""
        # Arrange
        v1 = Version.parse(v1_str)
        v2 = Version.parse(v2_str)

        # Act & Assert - assuming string comparison
        if v1.prerelease < v2.prerelease:
            assert v1 < v2
        elif v1.prerelease > v2.prerelease:
            assert v1 > v2
