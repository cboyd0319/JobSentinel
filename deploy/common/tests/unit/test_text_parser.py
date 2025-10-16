"""Comprehensive tests for domains.ats.parsers.text_parser module.

Tests text resume parsing and analysis following pytest best practices.
Covers file parsing, section detection, contact extraction, and error handling.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from domains.ats.parsers.text_parser import TextParser


@pytest.fixture
def parser() -> TextParser:
    """Provide a TextParser instance."""
    return TextParser()


@pytest.fixture
def sample_resume_text() -> str:
    """Provide sample resume text."""
    return """
John Doe
john.doe@example.com
(555) 123-4567
linkedin.com/in/johndoe

PROFESSIONAL SUMMARY
Experienced software engineer with 5+ years in Python development.

WORK EXPERIENCE
Senior Software Engineer - Tech Corp (2020-2024)
- Developed microservices using Python and FastAPI
- Led team of 5 engineers

EDUCATION
Bachelor of Science in Computer Science
University of Technology, 2015-2019

TECHNICAL SKILLS
Python, FastAPI, PostgreSQL, Docker, AWS

CERTIFICATIONS
AWS Certified Solutions Architect
        """.strip()


class TestCanParse:
    """Test suite for can_parse method."""

    def test_can_parse_txt_file(self, parser: TextParser) -> None:
        """can_parse should return True for .txt files."""
        # Arrange & Act
        result = parser.can_parse("resume.txt")
        # Assert
        assert result is True

    def test_can_parse_text_extension(self, parser: TextParser) -> None:
        """can_parse should return True for .text files."""
        # Arrange & Act
        result = parser.can_parse("document.text")
        # Assert
        assert result is True

    @pytest.mark.parametrize(
        "filename",
        [
            "resume.TXT",  # Uppercase
            "Resume.Txt",  # Mixed case
            "my_resume.txt",  # Underscores
            "resume-2024.txt",  # Hyphens
            "/path/to/resume.txt",  # With path
        ],
        ids=["uppercase", "mixed_case", "underscores", "hyphens", "with_path"],
    )
    def test_can_parse_case_insensitive(self, parser: TextParser, filename: str) -> None:
        """can_parse should be case-insensitive."""
        # Act
        result = parser.can_parse(filename)
        # Assert
        assert result is True

    @pytest.mark.parametrize(
        "filename",
        [
            "resume.pdf",
            "resume.docx",
            "resume.doc",
            "resume.rtf",
            "resume.html",
            "resume",
            "",
        ],
        ids=["pdf", "docx", "doc", "rtf", "html", "no_extension", "empty"],
    )
    def test_can_parse_rejects_non_text_files(self, parser: TextParser, filename: str) -> None:
        """can_parse should return False for non-text files."""
        # Act
        result = parser.can_parse(filename)
        # Assert
        assert result is False


class TestExtractText:
    """Test suite for extract_text method."""

    def test_extract_text_reads_file_content(self, parser: TextParser, tmp_path: Path) -> None:
        """extract_text should read and return file content."""
        # Arrange
        test_file = tmp_path / "test.txt"
        content = "This is test content\nWith multiple lines"
        test_file.write_text(content, encoding="utf-8")
        # Act
        result = parser.extract_text(str(test_file))
        # Assert
        assert result == content

    def test_extract_text_returns_none_for_non_text_file(
        self, parser: TextParser, tmp_path: Path
    ) -> None:
        """extract_text should return None for non-text file extensions."""
        # Arrange
        test_file = tmp_path / "test.pdf"
        test_file.write_text("content")
        # Act
        result = parser.extract_text(str(test_file))
        # Assert
        assert result is None

    def test_extract_text_handles_utf8(self, parser: TextParser, tmp_path: Path) -> None:
        """extract_text should handle UTF-8 encoded files."""
        # Arrange
        test_file = tmp_path / "test.txt"
        content = "UTF-8 content: café, naïve, 日本語, émoji 🚀"
        test_file.write_text(content, encoding="utf-8")
        # Act
        result = parser.extract_text(str(test_file))
        # Assert
        assert result == content
        assert "café" in result
        assert "日本語" in result
        assert "🚀" in result

    def test_extract_text_fallback_to_latin1(self, parser: TextParser, tmp_path: Path) -> None:
        """extract_text should fallback to latin1 encoding if UTF-8 fails."""
        # Arrange
        test_file = tmp_path / "test.txt"
        # Write latin1 content that would fail UTF-8
        content_bytes = b"Special chars: \xe9\xe8\xe0"  # latin1 encoded
        test_file.write_bytes(content_bytes)
        # Act
        result = parser.extract_text(str(test_file))
        # Assert
        assert result is not None
        assert "Special chars" in result

    def test_extract_text_returns_none_for_nonexistent_file(
        self, parser: TextParser
    ) -> None:
        """extract_text should return None for nonexistent files."""
        # Act
        result = parser.extract_text("/nonexistent/file.txt")
        # Assert
        assert result is None

    def test_extract_text_empty_file(self, parser: TextParser, tmp_path: Path) -> None:
        """extract_text should handle empty files."""
        # Arrange
        test_file = tmp_path / "empty.txt"
        test_file.write_text("", encoding="utf-8")
        # Act
        result = parser.extract_text(str(test_file))
        # Assert
        assert result == ""

    def test_extract_text_large_file(self, parser: TextParser, tmp_path: Path) -> None:
        """extract_text should handle large files."""
        # Arrange
        test_file = tmp_path / "large.txt"
        # Create 10k lines, but string ends without newline so split gives 10k items
        lines = ["Line of text"] * 10000
        content = "\n".join(lines)
        test_file.write_text(content, encoding="utf-8")
        # Act
        result = parser.extract_text(str(test_file))
        # Assert
        assert result == content
        assert len(result.split("\n")) == 10000


class TestIdentifySections:
    """Test suite for identify_sections method."""

    def test_identify_sections_finds_all_sections(
        self, parser: TextParser, sample_resume_text: str
    ) -> None:
        """identify_sections should find all standard resume sections."""
        # Act
        sections = parser.identify_sections(sample_resume_text)
        # Assert
        assert "summary" in sections
        assert "experience" in sections
        assert "education" in sections
        assert "skills" in sections
        assert "certifications" in sections

    @pytest.mark.parametrize(
        "section_text,expected_section",
        [
            ("PROFESSIONAL SUMMARY\nContent", "summary"),
            ("OBJECTIVE\nSeeking position", "summary"),
            ("WORK EXPERIENCE\nCompany", "experience"),
            ("EMPLOYMENT HISTORY\nJob", "experience"),
            ("EDUCATION\nDegree", "education"),
            ("TECHNICAL SKILLS\nPython", "skills"),
            ("CERTIFICATIONS\nAWS Cert", "certifications"),
            ("PROJECTS\nProject 1", "projects"),
            ("AWARDS\nBest Employee", "awards"),
            ("REFERENCES\nAvailable", "references"),
        ],
        ids=[
            "summary",
            "objective",
            "experience",
            "employment",
            "education",
            "skills",
            "certifications",
            "projects",
            "awards",
            "references",
        ],
    )
    def test_identify_sections_detects_section_variants(
        self, parser: TextParser, section_text: str, expected_section: str
    ) -> None:
        """identify_sections should detect various section header formats."""
        # Act
        sections = parser.identify_sections(section_text)
        # Assert
        assert expected_section in sections

    def test_identify_sections_case_insensitive(self, parser: TextParser) -> None:
        """identify_sections should be case-insensitive."""
        # Arrange
        text = "work experience\nExperience at company\nWORK HISTORY"
        # Act
        sections = parser.identify_sections(text)
        # Assert
        assert "experience" in sections

    def test_identify_sections_empty_text(self, parser: TextParser) -> None:
        """identify_sections should return empty list for empty text."""
        # Act
        sections = parser.identify_sections("")
        # Assert
        assert sections == []

    def test_identify_sections_no_matches(self, parser: TextParser) -> None:
        """identify_sections should return empty list when no sections found."""
        # Arrange
        text = "Just some random text without any resume sections"
        # Act
        sections = parser.identify_sections(text)
        # Assert
        assert sections == []


class TestExtractContactInfo:
    """Test suite for extract_contact_info method."""

    def test_extract_contact_info_finds_email(self, parser: TextParser) -> None:
        """extract_contact_info should extract email addresses."""
        # Arrange
        text = "Contact: john.doe@example.com"
        # Act
        info = parser.extract_contact_info(text)
        # Assert
        assert "email" in info
        assert info["email"] == "john.doe@example.com"

    @pytest.mark.parametrize(
        "email",
        [
            "simple@example.com",
            "first.last@company.co.uk",
            "user+tag@domain.com",
            "test_user@sub.domain.com",
            "123@numbers.com",
        ],
        ids=["simple", "dots_tld", "plus_tag", "underscore_subdomain", "numbers"],
    )
    def test_extract_contact_info_various_email_formats(
        self, parser: TextParser, email: str
    ) -> None:
        """extract_contact_info should handle various valid email formats."""
        # Arrange
        text = f"Email: {email}"
        # Act
        info = parser.extract_contact_info(text)
        # Assert
        assert info["email"] == email

    @pytest.mark.parametrize(
        "phone,expected",
        [
            ("555-123-4567", "5551234567"),
            ("(555) 123-4567", "5551234567"),
            ("555.123.4567", "5551234567"),
            ("+1-555-123-4567", "5551234567"),  # The regex captures without formatting
            ("555 123 4567", "5551234567"),
        ],
        ids=["dashes", "parentheses", "dots", "plus_one", "spaces"],
    )
    def test_extract_contact_info_various_phone_formats(
        self, parser: TextParser, phone: str, expected: str
    ) -> None:
        """extract_contact_info should extract and normalize phone numbers."""
        # Arrange
        text = f"Phone: {phone}"
        # Act
        info = parser.extract_contact_info(text)
        # Assert
        assert "phone" in info
        # The phone field contains joined groups, check if expected digits are present
        assert expected in info["phone"].replace("-", "").replace(" ", "")

    def test_extract_contact_info_finds_linkedin(self, parser: TextParser) -> None:
        """extract_contact_info should extract LinkedIn URLs."""
        # Arrange
        text = "Profile: https://linkedin.com/in/johndoe"
        # Act
        info = parser.extract_contact_info(text)
        # Assert
        assert "linkedin" in info
        assert "linkedin.com/in/" in info["linkedin"]

    def test_extract_contact_info_first_email_only(self, parser: TextParser) -> None:
        """extract_contact_info should extract only the first email found."""
        # Arrange
        text = "Contact: first@example.com or second@example.com"
        # Act
        info = parser.extract_contact_info(text)
        # Assert
        assert info["email"] == "first@example.com"

    def test_extract_contact_info_empty_text(self, parser: TextParser) -> None:
        """extract_contact_info should return empty dict for text with no contact info."""
        # Arrange
        text = "No contact information here"
        # Act
        info = parser.extract_contact_info(text)
        # Assert
        assert info == {}

    def test_extract_contact_info_complete(
        self, parser: TextParser, sample_resume_text: str
    ) -> None:
        """extract_contact_info should extract all contact fields from complete resume."""
        # Act
        info = parser.extract_contact_info(sample_resume_text)
        # Assert
        assert "email" in info
        assert "phone" in info
        assert "linkedin" in info
        assert "example.com" in info["email"]


class TestCountWords:
    """Test suite for count_words method."""

    def test_count_words_simple_text(self, parser: TextParser) -> None:
        """count_words should count words correctly."""
        # Arrange
        text = "This is a simple test"
        # Act
        count = parser.count_words(text)
        # Assert
        assert count == 5

    def test_count_words_with_punctuation(self, parser: TextParser) -> None:
        """count_words should handle punctuation correctly."""
        # Arrange
        text = "Hello, world! This is a test."
        # Act
        count = parser.count_words(text)
        # Assert
        assert count == 6

    def test_count_words_with_newlines(self, parser: TextParser) -> None:
        """count_words should handle newlines and multiple spaces."""
        # Arrange
        text = "Line one\nLine two\n\nLine three"
        # Act
        count = parser.count_words(text)
        # Assert
        assert count == 6

    def test_count_words_empty_text(self, parser: TextParser) -> None:
        """count_words should return 0 for empty text."""
        # Act
        count = parser.count_words("")
        # Assert
        assert count == 0

    def test_count_words_only_whitespace(self, parser: TextParser) -> None:
        """count_words should return 0 for whitespace-only text."""
        # Arrange
        text = "   \n\t\r\n   "
        # Act
        count = parser.count_words(text)
        # Assert
        assert count == 0

    def test_count_words_with_numbers(self, parser: TextParser) -> None:
        """count_words should count numbers as words."""
        # Arrange
        text = "I have 5 apples and 10 oranges"
        # Act
        count = parser.count_words(text)
        # Assert
        assert count == 7

    def test_count_words_hyphenated(self, parser: TextParser) -> None:
        """count_words should handle hyphenated words."""
        # Arrange
        text = "This is a well-known fact"
        # Act
        count = parser.count_words(text)
        # Assert
        # Hyphenated words are typically counted as separate words by \w+
        assert count >= 5


class TestExtractMetadata:
    """Test suite for extract_metadata method."""

    def test_extract_metadata_complete_resume(
        self, parser: TextParser, tmp_path: Path, sample_resume_text: str
    ) -> None:
        """extract_metadata should extract all metadata from complete resume."""
        # Arrange
        test_file = tmp_path / "resume.txt"
        test_file.write_text(sample_resume_text, encoding="utf-8")
        # Act
        metadata = parser.extract_metadata(str(test_file))
        # Assert
        assert metadata["format"] == "text"
        assert "word_count" in metadata
        assert metadata["word_count"] > 0
        assert "sections" in metadata
        assert len(metadata["sections"]) > 0
        assert "contact_info" in metadata
        assert len(metadata["contact_info"]) > 0

    def test_extract_metadata_invalid_file(self, parser: TextParser) -> None:
        """extract_metadata should return minimal metadata for invalid files."""
        # Act
        metadata = parser.extract_metadata("/nonexistent/file.txt")
        # Assert
        assert metadata["format"] == "text"
        assert "word_count" not in metadata or metadata.get("word_count") is None

    def test_extract_metadata_non_text_file(
        self, parser: TextParser, tmp_path: Path
    ) -> None:
        """extract_metadata should return minimal metadata for non-text files."""
        # Arrange
        test_file = tmp_path / "test.pdf"
        test_file.write_text("content")
        # Act
        metadata = parser.extract_metadata(str(test_file))
        # Assert
        assert metadata["format"] == "text"

    def test_extract_metadata_empty_file(self, parser: TextParser, tmp_path: Path) -> None:
        """extract_metadata should handle empty files."""
        # Arrange
        test_file = tmp_path / "empty.txt"
        test_file.write_text("", encoding="utf-8")
        # Act
        metadata = parser.extract_metadata(str(test_file))
        # Assert
        # Empty text returns early with just format
        assert metadata["format"] == "text"
        # Other fields are not present for empty files
        assert "word_count" not in metadata
        assert "sections" not in metadata
        assert "contact_info" not in metadata


class TestSectionPatterns:
    """Test suite for SECTION_PATTERNS class attribute."""

    def test_section_patterns_defined(self, parser: TextParser) -> None:
        """SECTION_PATTERNS should be defined and contain expected sections."""
        # Assert
        assert hasattr(parser, "SECTION_PATTERNS")
        assert isinstance(parser.SECTION_PATTERNS, dict)
        assert len(parser.SECTION_PATTERNS) > 0

    @pytest.mark.parametrize(
        "section",
        ["contact", "summary", "experience", "education", "skills", "projects", "certifications"],
        ids=["contact", "summary", "experience", "education", "skills", "projects", "certifications"],
    )
    def test_section_patterns_contains_key(self, parser: TextParser, section: str) -> None:
        """SECTION_PATTERNS should contain all standard resume sections."""
        # Assert
        assert section in parser.SECTION_PATTERNS

    def test_section_patterns_are_regex(self, parser: TextParser) -> None:
        """SECTION_PATTERNS values should be valid regex patterns."""
        # Arrange
        import re
        
        # Act & Assert - each pattern should compile without error
        for pattern in parser.SECTION_PATTERNS.values():
            compiled = re.compile(pattern)
            assert compiled is not None
