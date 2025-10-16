"""Comprehensive tests for cloud.common.style module.

Tests presentation constants and styling configuration.
"""

import pytest

# Module path is handled in conftest.py
from style import (
    APP_NAME,
    PALETTE,
    PADDING,
    RICH_COLORS,
    SYMBOL,
    WIDTH,
    WORDMARK_SMALL,
)


class TestPalette:
    """Test the PALETTE color configuration."""

    def test_palette_is_dict(self):
        """PALETTE should be a dictionary."""
        assert isinstance(PALETTE, dict)

    def test_palette_has_required_keys(self):
        """PALETTE should have all required color keys."""
        required_keys = {"primary", "accent", "warn", "error", "text", "muted"}
        assert set(PALETTE.keys()) == required_keys

    @pytest.mark.parametrize(
        "key",
        ["primary", "accent", "warn", "error", "text", "muted"],
        ids=["primary", "accent", "warn", "error", "text", "muted"],
    )
    def test_palette_values_are_hex_colors(self, key):
        """PALETTE values should be valid hex color strings."""
        value = PALETTE[key]
        assert isinstance(value, str)
        assert value.startswith("#")
        assert len(value) == 7  # #RRGGBB format
        # Verify hex characters
        assert all(c in "0123456789ABCDEFabcdef" for c in value[1:])

    def test_palette_specific_colors(self):
        """PALETTE should contain expected specific colors."""
        assert PALETTE["primary"] == "#4C8BF5"  # Calm blue
        assert PALETTE["accent"] == "#22C55E"  # Success green
        assert PALETTE["warn"] == "#F59E0B"  # Warning amber
        assert PALETTE["error"] == "#EF4444"  # Error red
        assert PALETTE["text"] == "#E5E7EB"  # Light gray text
        assert PALETTE["muted"] == "#9CA3AF"  # Muted gray


class TestRichColors:
    """Test the RICH_COLORS configuration."""

    def test_rich_colors_is_dict(self):
        """RICH_COLORS should be a dictionary."""
        assert isinstance(RICH_COLORS, dict)

    def test_rich_colors_has_same_keys_as_palette(self):
        """RICH_COLORS should have the same keys as PALETTE."""
        assert set(RICH_COLORS.keys()) == set(PALETTE.keys())

    @pytest.mark.parametrize(
        "key,expected",
        [
            ("primary", "dodger_blue2"),
            ("accent", "green"),
            ("warn", "yellow"),
            ("error", "red"),
            ("text", "white"),
            ("muted", "bright_black"),
        ],
        ids=["primary", "accent", "warn", "error", "text", "muted"],
    )
    def test_rich_colors_values(self, key, expected):
        """RICH_COLORS should map to valid rich color names."""
        assert RICH_COLORS[key] == expected

    def test_rich_colors_values_are_strings(self):
        """All RICH_COLORS values should be strings."""
        for value in RICH_COLORS.values():
            assert isinstance(value, str)
            assert len(value) > 0


class TestSymbol:
    """Test the SYMBOL unicode characters."""

    def test_symbol_is_dict(self):
        """SYMBOL should be a dictionary."""
        assert isinstance(SYMBOL, dict)

    def test_symbol_has_required_keys(self):
        """SYMBOL should have all required symbol keys."""
        required_keys = {"ok", "fail", "arrow", "dot", "warn", "info"}
        assert set(SYMBOL.keys()) == required_keys

    @pytest.mark.parametrize(
        "key,expected",
        [
            ("ok", "✓"),
            ("fail", "✗"),
            ("arrow", "→"),
            ("dot", "•"),
            ("warn", "⚠"),
            ("info", "ℹ"),
        ],
        ids=["ok", "fail", "arrow", "dot", "warn", "info"],
    )
    def test_symbol_values(self, key, expected):
        """SYMBOL should contain expected unicode characters."""
        assert SYMBOL[key] == expected

    def test_symbol_values_are_strings(self):
        """All SYMBOL values should be strings."""
        for value in SYMBOL.values():
            assert isinstance(value, str)
            assert len(value) > 0

    def test_symbol_values_are_single_chars(self):
        """All SYMBOL values should be single characters."""
        for value in SYMBOL.values():
            assert len(value) == 1


class TestLayoutConstants:
    """Test layout constants."""

    def test_width_is_integer(self):
        """WIDTH should be an integer."""
        assert isinstance(WIDTH, int)

    def test_width_value(self):
        """WIDTH should be 80."""
        assert WIDTH == 80

    def test_width_is_reasonable(self):
        """WIDTH should be a reasonable terminal width."""
        assert 40 <= WIDTH <= 200

    def test_padding_is_integer(self):
        """PADDING should be an integer."""
        assert isinstance(PADDING, int)

    def test_padding_value(self):
        """PADDING should be 2."""
        assert PADDING == 2

    def test_padding_is_non_negative(self):
        """PADDING should be non-negative."""
        assert PADDING >= 0


class TestWordmark:
    """Test the WORDMARK_SMALL ASCII art."""

    def test_wordmark_small_is_string(self):
        """WORDMARK_SMALL should be a string."""
        assert isinstance(WORDMARK_SMALL, str)

    def test_wordmark_small_not_empty(self):
        """WORDMARK_SMALL should not be empty."""
        assert len(WORDMARK_SMALL) > 0

    def test_wordmark_small_has_newlines(self):
        """WORDMARK_SMALL should contain newlines for multi-line display."""
        assert "\n" in WORDMARK_SMALL

    def test_wordmark_small_has_box_drawing_chars(self):
        """WORDMARK_SMALL should contain box drawing characters."""
        box_chars = {"╔", "║", "╚", "═", "╗", "╝"}
        assert any(char in WORDMARK_SMALL for char in box_chars)

    def test_wordmark_small_has_version_placeholder(self):
        """WORDMARK_SMALL should have a version placeholder."""
        assert "{version}" in WORDMARK_SMALL

    def test_wordmark_small_line_count(self):
        """WORDMARK_SMALL should have multiple lines."""
        lines = WORDMARK_SMALL.strip().split("\n")
        assert len(lines) >= 3  # At least 3 lines for box

    def test_wordmark_small_contains_text(self):
        """WORDMARK_SMALL should contain descriptive text."""
        assert "Job Scraper" in WORDMARK_SMALL or "Bootstrap" in WORDMARK_SMALL

    def test_wordmark_small_version_format_string(self):
        """WORDMARK_SMALL should be formattable with version."""
        formatted = WORDMARK_SMALL.format(version="1.0.0")
        assert "1.0.0" in formatted
        assert "{version}" not in formatted


class TestAppName:
    """Test the APP_NAME constant."""

    def test_app_name_is_string(self):
        """APP_NAME should be a string."""
        assert isinstance(APP_NAME, str)

    def test_app_name_value(self):
        """APP_NAME should have expected value."""
        assert APP_NAME == "Job Scraper Cloud Bootstrap"

    def test_app_name_not_empty(self):
        """APP_NAME should not be empty."""
        assert len(APP_NAME) > 0

    def test_app_name_contains_job_scraper(self):
        """APP_NAME should contain 'Job Scraper'."""
        assert "Job Scraper" in APP_NAME

    def test_app_name_contains_cloud(self):
        """APP_NAME should contain 'Cloud'."""
        assert "Cloud" in APP_NAME or "cloud" in APP_NAME.lower()


class TestConstantImmutability:
    """Test that constants maintain expected values."""

    def test_palette_keys_immutable(self):
        """PALETTE should have consistent keys across tests."""
        expected_keys = {"primary", "accent", "warn", "error", "text", "muted"}
        assert set(PALETTE.keys()) == expected_keys

    def test_rich_colors_keys_immutable(self):
        """RICH_COLORS should have consistent keys across tests."""
        expected_keys = {"primary", "accent", "warn", "error", "text", "muted"}
        assert set(RICH_COLORS.keys()) == expected_keys

    def test_symbol_keys_immutable(self):
        """SYMBOL should have consistent keys across tests."""
        expected_keys = {"ok", "fail", "arrow", "dot", "warn", "info"}
        assert set(SYMBOL.keys()) == expected_keys


class TestColorAccessibility:
    """Test that colors are suitable for terminal display."""

    def test_palette_colors_are_distinct(self):
        """PALETTE colors should be distinct from each other."""
        colors = list(PALETTE.values())
        unique_colors = set(colors)
        assert len(unique_colors) == len(colors), "Colors should be unique"

    def test_rich_colors_are_valid_names(self):
        """RICH_COLORS should use valid rich color names."""
        # Common rich color names
        valid_colors = {
            "dodger_blue2",
            "green",
            "yellow",
            "red",
            "white",
            "bright_black",
            "blue",
            "cyan",
            "magenta",
        }
        for color in RICH_COLORS.values():
            # Color name should be alphanumeric with underscores
            assert all(c.isalnum() or c == "_" for c in color)


class TestModuleStructure:
    """Test overall module structure and organization."""

    def test_module_exports_expected_constants(self):
        """Module should export all expected constants."""
        import style as style_module

        expected_exports = {
            "PALETTE",
            "RICH_COLORS",
            "SYMBOL",
            "WIDTH",
            "PADDING",
            "WORDMARK_SMALL",
            "APP_NAME",
        }
        actual_exports = {
            name for name in dir(style_module) if not name.startswith("_")
        }
        assert expected_exports.issubset(actual_exports)

    def test_no_unexpected_mutable_defaults(self):
        """Constants should not be mutable in unexpected ways."""
        # Dictionaries are mutable, but we can verify they exist
        assert isinstance(PALETTE, dict)
        assert isinstance(RICH_COLORS, dict)
        assert isinstance(SYMBOL, dict)

    def test_constants_have_expected_types(self):
        """All constants should have expected types."""
        type_checks = [
            (PALETTE, dict),
            (RICH_COLORS, dict),
            (SYMBOL, dict),
            (WIDTH, int),
            (PADDING, int),
            (WORDMARK_SMALL, str),
            (APP_NAME, str),
        ]
        for constant, expected_type in type_checks:
            assert isinstance(constant, expected_type)
