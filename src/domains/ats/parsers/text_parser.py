"""
Text Resume Parser

Handles parsing and analysis of plain text resumes.
"""

import logging
import re
from typing import List, Optional

logger = logging.getLogger(__name__)


class TextParser:
    """Handles text resume parsing and structural analysis."""

    # Common resume section headers
    SECTION_PATTERNS = {
        "contact": r"(?i)(contact|personal|information)",
        "summary": r"(?i)(summary|objective|profile|about)",
        "experience": r"(?i)(experience|work|employment|career|professional)",
        "education": r"(?i)(education|academic|school|university|degree)",
        "skills": r"(?i)(skills|technical|competencies|abilities)",
        "projects": r"(?i)(projects|portfolio)",
        "certifications": r"(?i)(certifications|certificates|licenses)",
        "awards": r"(?i)(awards|honors|achievements)",
        "references": r"(?i)(references)",
    }

    def can_parse(self, file_path: str) -> bool:
        """Check if this parser can handle the given file."""
        return file_path.lower().endswith((".txt", ".text"))

    def extract_text(self, file_path: str) -> Optional[str]:
        """Extract text content from text file."""
        if not self.can_parse(file_path):
            return None

        try:
            with open(file_path, "r", encoding="utf-8") as file:
                return file.read()
        except UnicodeDecodeError:
            # Try with different encodings
            for encoding in ["latin1", "cp1252"]:
                try:
                    with open(file_path, "r", encoding=encoding) as file:
                        return file.read()
                except UnicodeDecodeError:
                    continue
            logger.error(f"Failed to decode text file {file_path}")
            return None
        except Exception as e:
            logger.error(f"Failed to read text file {file_path}: {e}")
            return None

    def identify_sections(self, text: str) -> List[str]:
        """Identify resume sections in the text."""
        sections_found = []

        for section_name, pattern in self.SECTION_PATTERNS.items():
            if re.search(pattern, text):
                sections_found.append(section_name)

        return sections_found

    def extract_contact_info(self, text: str) -> dict:
        """Extract contact information from resume text."""
        contact_info = {}

        # Email pattern
        email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
        emails = re.findall(email_pattern, text)
        if emails:
            contact_info["email"] = emails[0]

        # Phone pattern
        phone_pattern = r"(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})"
        phones = re.findall(phone_pattern, text)
        if phones:
            contact_info["phone"] = "".join(phones[0])

        # LinkedIn pattern
        linkedin_pattern = r"linkedin\.com/in/[\w-]+"
        linkedin_matches = re.findall(linkedin_pattern, text.lower())
        if linkedin_matches:
            contact_info["linkedin"] = linkedin_matches[0]

        return contact_info

    def count_words(self, text: str) -> int:
        """Count words in the resume text."""
        # Remove extra whitespace and split
        words = re.findall(r"\b\w+\b", text)
        return len(words)

    def extract_metadata(self, file_path: str) -> dict:
        """Extract metadata from text file."""
        try:
            text = self.extract_text(file_path)
            if not text:
                return {"format": "text"}

            return {
                "word_count": self.count_words(text),
                "sections": self.identify_sections(text),
                "contact_info": self.extract_contact_info(text),
                "format": "text",
            }
        except Exception as e:
            logger.error(f"Failed to extract metadata from text file {file_path}: {e}")
            return {"format": "text"}
