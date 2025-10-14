import json
import logging
import re
from pathlib import Path
from typing import Any

# Optional dependencies - will check at runtime
try:
    import pdfplumber

    HAS_PDF = True
except ImportError:
    HAS_PDF = False

try:
    from docx import Document

    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

try:  # Defer heavy model load until explicitly requested
    import spacy  # type: ignore
    from spacy.cli import download  # type: ignore

    HAS_SPACY = True
except ImportError:  # pragma: no cover - environment without optional dep
    spacy = None  # type: ignore
    download = None  # type: ignore
    HAS_SPACY = False

_NLP = None  # Lazy-loaded model singleton


def ensure_spacy_model(interactive: bool = True) -> Any:
    """Ensure spaCy English model is available (with user consent).

    Args:
        interactive: if True, prompt before downloading model.

    Returns:
        The spaCy NLP model instance.
    """
    global _NLP
    if _NLP is not None:
        return _NLP
    if not HAS_SPACY:
        raise RuntimeError(
            "spaCy not installed. Install optional resume extras: pip install '.[resume]'"
        )
    try:
        _NLP = spacy.load("en_core_web_sm")  # type: ignore
        return _NLP
    except OSError:
        if interactive:
            consent = (
                input("spaCy language model 'en_core_web_sm' not found. Download (~15MB)? [y/N]: ")
                .strip()
                .lower()
            )
            if consent != "y":
                raise RuntimeError("spaCy model required for advanced resume analysis.") from None
        if download is None:  # Should not happen if HAS_SPACY True
            raise RuntimeError("spaCy download utilities unavailable.") from None
        print("Downloading spaCy model 'en_core_web_sm' ...")
        download("en_core_web_sm")  # type: ignore
        _NLP = spacy.load("en_core_web_sm")  # type: ignore
        return _NLP


logger = logging.getLogger(__name__)


with open(
    Path(__file__).parent.parent / "config" / "resume_parser.json",
    encoding="utf-8",
) as f:
    config = json.load(f)
    COMMON_SKILLS = set(config["common_skills"])
    TITLE_KEYWORDS = set(config["title_keywords"])

# Pre-build reusable regex fragments so complex patterns stay readable and
# syntactically correct when combining many keywords.
TITLE_KEYWORD_PATTERN = "|".join(
    re.escape(keyword) for keyword in sorted(TITLE_KEYWORDS) if keyword
)

# Seniority blocklist terms
SENIORITY_BLOCKLIST = {
    "intern",
    "internship",
    "junior",
    "entry level",
    "contract",
    "contractor",
    "consultant",
    "temporary",
    "temp",
    "part time",
    "part-time",
    "freelance",
}


class ResumeParser:
    """Parse resumes and extract structured information."""

    def __init__(self, cache_dir: str = "data/cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.text: str = ""
        self.skills: set[str] = set()
        self.titles: list[str] = []
        self.companies: list[str] = []
        self.education: list[str] = []
        self.years_experience: int | None = None

    def parse_file(self, file_path: str | Path) -> dict:
        """
        Parse a resume file and extract information.

        Args:
            file_path: Path to PDF or DOCX resume

        Returns:
            Dictionary with extracted information

        Raises:
            ValueError: If file type not supported or dependencies missing
            FileNotFoundError: If file doesn't exist
        """
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"Resume file not found: {file_path}")

        # Check cache first
        file_hash = self._get_file_hash(file_path)
        cache_file = self.cache_dir / f"{file_hash}.json"
        if cache_file.exists():
            logger.info(f"Loading parsed resume from cache: {cache_file}")
            with open(cache_file, encoding="utf-8") as f:
                return json.load(f)

        # Extract text based on file type
        if file_path.suffix.lower() == ".pdf":
            if not HAS_PDF:
                raise ValueError(
                    "PDF support requires pdfplumber. Install with: pip install pdfplumber"
                )
            self.text = self._extract_pdf(file_path)
        elif file_path.suffix.lower() in [".docx", ".doc"]:
            if not HAS_DOCX:
                raise ValueError(
                    "DOCX support requires python-docx. Install with: pip install python-docx"
                )
            self.text = self._extract_docx(file_path)
        else:
            raise ValueError(
                f"Unsupported file type: {file_path.suffix}. " "Supported types: .pdf, .docx"
            )

        # Extract structured information
        self._extract_skills()
        self._extract_titles()
        self._extract_companies()
        self._extract_education()
        self._extract_experience()

        # Save to cache
        result = self.to_dict()
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(result, f)

        return result

    def _get_file_hash(self, file_path: Path) -> str:
        """Get SHA256 hash of a file."""
        import hashlib

        h = hashlib.sha256()
        with open(file_path, "rb") as f:
            while True:
                chunk = f.read(8192)
                if not chunk:
                    break
                h.update(chunk)
        return h.hexdigest()

    def _extract_pdf(self, file_path: Path) -> str:
        """Extract text from PDF file."""
        text_parts = []

        try:
            with pdfplumber.open(file_path) as pdf:
                if not pdf.pages:
                    raise ValueError("PDF file has no pages")

                for page in pdf.pages:
                    try:
                        page_text = page.extract_text()
                        if page_text and page_text.strip():
                            text_parts.append(page_text)
                    except Exception as page_error:
                        logger.warning(f"Failed to extract text from page: {page_error}")
                        continue

                if not text_parts:
                    raise ValueError(
                        "No text could be extracted from PDF. It may be image-based or corrupted."
                    )

        except Exception as e:
            logger.error(f"Failed to parse PDF: {e}")
            raise ValueError(f"Failed to parse PDF: {e}") from e

        return "\n".join(text_parts)

    def _extract_docx(self, file_path: Path) -> str:
        """Extract text from DOCX file."""
        try:
            doc = Document(file_path)
            paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]

            if not paragraphs:
                raise ValueError(
                    "No text could be extracted from DOCX file. It may be empty or corrupted."
                )

            return "\n".join(paragraphs)
        except Exception as e:
            logger.error(f"Failed to parse DOCX: {e}")
            raise ValueError(f"Failed to parse DOCX: {e}") from e

    def _extract_skills(self):
        """Extract technical skills from resume text using spaCy NER and pattern matching."""
        if not self.text or not self.text.strip():
            logger.warning("Resume text is empty, cannot extract skills")
            return

        # Always use keyword-based extraction as it's more reliable for technical skills
        text_lower = self.text.lower()
        for skill in COMMON_SKILLS:
            if not skill or len(skill) < 2:
                continue
            pattern = r"\b" + re.escape(skill.lower()) + r"\b"
            if re.search(pattern, text_lower):
                # Preserve original casing for acronyms, title case for others
                self.skills.add(skill.title() if len(skill) > 3 else skill.upper())

        # Optionally enhance with spaCy NER if available
        if HAS_SPACY:
            try:
                nlp_model = ensure_spacy_model(interactive=False)
                # Limit text length for spaCy processing (to avoid memory issues)
                text_to_process = self.text[:100000] if len(self.text) > 100000 else self.text
                doc = nlp_model(text_to_process)
                for ent in doc.ents:
                    if ent.label_ in ["ORG", "PRODUCT"] and len(ent.text.strip()) > 2:
                        if ent.text.strip().lower() in text_lower:
                            self.skills.add(ent.text.strip())
            except Exception as e:  # noqa: BLE001
                logger.warning(
                    "spaCy NER failed (will continue with keyword-only extraction): %s",
                    e,
                )

        # Remove any empty strings or None values
        self.skills = {s for s in self.skills if s and s.strip()}

    def _extract_titles(self):
        """Extract job titles from resume text."""
        # Look for common title patterns
        # Pattern: (Title) at (Company) or (Title) - (Company)
        title_patterns = [
            (
                r"(?i)(senior|staff|principal|lead)?\s*"
                r"(software|security|devops|platform|backend|frontend|data|ml)\s*"
                r"(engineer|developer|architect)"
            ),
            r"(?i)(senior|staff|principal|lead)?\s*(site reliability engineer|sre)",
            r"(?i)(technical lead|tech lead|team lead)",
        ]

        for pattern in title_patterns:
            matches = re.findall(pattern, self.text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    title = " ".join(filter(None, match)).strip()
                else:
                    title = match.strip()

                if title and len(title) > 5:  # Filter out too-short matches
                    self.titles.append(title.title())

        # Deduplicate while preserving order
        seen = set()
        self.titles = [t for t in self.titles if not (t in seen or seen.add(t))]

    def _extract_companies(self):
        """Extract company names from resume text."""
        # Look for patterns like "at Company" or "Company - Role"
        company_patterns = [
            r"(?:at|@)\s+([A-Z][A-Za-z0-9\s&/-]+?)(?=\s+(?:[-•|]|$)|\s*\n|,\s)",
        ]

        if TITLE_KEYWORD_PATTERN:
            company_patterns.append(
                rf"([A-Z][A-Za-z0-9\s&/-]+?)(?=\s+[-•|]\s+(?:{TITLE_KEYWORD_PATTERN}))"
            )

        for pattern in company_patterns:
            matches = re.findall(pattern, self.text)
            for match in matches:
                company = match.strip()
                # Filter out common false positives
                if len(company) > 2 and len(company) < 50 and company.lower() not in TITLE_KEYWORDS:
                    self.companies.append(company)

        # Deduplicate
        seen = set()
        self.companies = [c for c in self.companies if not (c in seen or seen.add(c))]

    def _extract_education(self):
        """Extract education information."""
        # Look for degree keywords
        degree_patterns = [
            r"(?i)(bachelor|b\.s\.|bs|ba|b\.a\.)\s+(?:of\s+)?(?:science\s+)?(?:in\s+)?([A-Za-z\s]+)",
            r"(?i)(master|m\.s\.|ms|ma|m\.a\.|mba)\s+(?:of\s+)?(?:science\s+)?(?:in\s+)?([A-Za-z\s]+)",
            r"(?i)(phd|ph\.d\.|doctorate)\s+(?:in\s+)?([A-Za-z\s]+)",
        ]

        for pattern in degree_patterns:
            matches = re.findall(pattern, self.text)
            for match in matches:
                if isinstance(match, tuple):
                    degree = " ".join(match).strip()
                else:
                    degree = match.strip()

                if degree:
                    self.education.append(degree.title())

        # Deduplicate
        self.education = list(dict.fromkeys(self.education))

    def _extract_experience(self):
        """Estimate years of experience from dates."""
        # Look for date ranges (e.g., "2020 - 2023", "Jan 2020 - Present")
        date_patterns = [
            r"(19|20)\d{2}\s*[-–—]\s*(?:(19|20)\d{2}|present|current)",
        ]

        years = set()
        for pattern in date_patterns:
            matches = re.findall(pattern, self.text, re.IGNORECASE)
            for match in matches:
                start_year = int(match[0] + match[1][:2]) if match[0] else None
                if start_year:
                    years.add(start_year)

        if years:
            # Rough estimate: current year - earliest year
            import datetime

            current_year = datetime.datetime.now().year
            self.years_experience = current_year - min(years)

    def to_dict(self) -> dict:
        """Convert extracted information to dictionary."""
        return {
            "skills": sorted(list(self.skills)),
            "titles": self.titles[:5],  # Top 5 most relevant
            "companies": self.companies[:10],  # Top 10
            "education": self.education,
            "years_experience": self.years_experience,
            "raw_text_length": len(self.text),
        }

    def to_user_prefs(
        self,
        existing_prefs: dict | None = None,
        salary_floor: int | None = None,
        add_skills: list[str] | None = None,
        remove_skills: list[str] | None = None,
    ) -> dict:
        """
        Convert extracted info to user_prefs.json format.

        Args:
            existing_prefs: Existing preferences to merge with
            salary_floor: Override salary floor (calculated from experience if None)
            add_skills: List of skills to add to the extracted skills
            remove_skills: List of skills to remove from the extracted skills

        Returns:
            Dictionary in user_prefs.json format
        """
        # Start with existing prefs or defaults
        prefs = (
            existing_prefs.copy()
            if existing_prefs
            else {
                "companies": [],
                "title_allowlist": [],
                "title_blocklist": [],
                "keywords_boost": [],
                "keywords_exclude": [],
                "location_constraints": ["Remote", "US", "United States"],
                "immediate_alert_threshold": 0.9,
                "digest_min_score": 0.7,
                "max_companies_per_run": 15,
                "fetch_descriptions": True,
                "use_llm": False,
                "llm_weight": 0.5,
            }
        )

        # Add extracted titles to allowlist
        if self.titles:
            existing_titles = set(prefs.get("title_allowlist", []))
            for title in self.titles:
                # Skip if contains blocklist terms
                if not any(block in title.lower() for block in SENIORITY_BLOCKLIST):
                    existing_titles.add(title)
            prefs["title_allowlist"] = sorted(list(existing_titles))

        # Add common seniority blocklist
        prefs["title_blocklist"] = sorted(
            list(
                set(
                    prefs.get("title_blocklist", [])
                    + ["Intern", "Junior", "Manager", "Director", "VP", "Contract"]
                )
            )
        )

        # Add extracted skills to boost keywords
        if self.skills:
            existing_keywords = set(self.skills)
            if add_skills:
                existing_keywords.update(add_skills)
            if remove_skills:
                existing_keywords.difference_update(remove_skills)
            prefs["keywords_boost"] = sorted(list(existing_keywords))

        # Calculate salary floor from experience
        if salary_floor is None and self.years_experience:
            # Rough estimate: $50k base + $20k per year experience
            # Capped at reasonable ranges
            salary_floor = min(50000 + (self.years_experience * 20000), 300000)  # Cap at $300k

        if salary_floor:
            prefs["salary_floor_usd"] = salary_floor

        return prefs


def parse_resume(file_path: str | Path) -> dict:
    """
    Convenience function to parse a resume file.

    Args:
        file_path: Path to resume file (PDF or DOCX)

    Returns:
        Dictionary with extracted information
    """
    parser = ResumeParser()
    return parser.parse_file(file_path)


def interactive_skill_editor(extracted_skills: list[str]) -> tuple[list[str], list[str]]:
    """
    A simple command-line interface for editing a list of skills.

    Args:
        extracted_skills: A list of skills extracted from the resume.

    Returns:
        A tuple containing two lists: added_skills and removed_skills.
    """
    print("\n--- Skill Editor ---")
    print("The following skills were extracted from your resume:")
    print(", ".join(extracted_skills))

    added_skills = []
    removed_skills = []

    while True:
        print("\nOptions:")
        print("  (a)dd a skill")
        print("  (r)emove a skill")
        print("  (d)one")
        choice = input("Enter your choice: ").lower()

        if choice == "a":
            skill_to_add = input("Enter the skill to add: ").strip()
            if skill_to_add:
                added_skills.append(skill_to_add)
                print(f"Added '{skill_to_add}'.")
        elif choice == "r":
            skill_to_remove = input("Enter the skill to remove: ").strip()
            if skill_to_remove in extracted_skills:
                removed_skills.append(skill_to_remove)
                print(f"Removed '{skill_to_remove}'.")
            else:
                print(f"'{skill_to_remove}' not found in the list.")
        elif choice == "d":
            break
        else:
            print("Invalid choice. Please try again.")

    return added_skills, removed_skills


def check_dependencies() -> tuple[bool, list[str]]:
    """
    Check if required dependencies are installed.

    Returns:
        Tuple of (all_installed, missing_packages)
    """
    missing = []

    if not HAS_PDF:
        missing.append("pdfplumber")

    if not HAS_DOCX:
        missing.append("python-docx")

    return (len(missing) == 0, missing)


def get_ats_analyzer(resume_path: str) -> Any:
    """
    Get an ATS analyzer service for a resume.

    This is a convenience wrapper around the new ATSAnalysisService.
    For full ATS analysis, use: python -m src.domains.ats.cli

    Args:
        resume_path: Path to resume file

    Returns:
        ATSAnalysisService instance

    Example:
        >>> from utils.resume_parser import get_ats_analyzer
        >>> service = get_ats_analyzer("my_resume.pdf")
        >>> score = service.analyze_resume("my_resume.pdf")
        >>> print(f"ATS Score: {score.overall_score}/100")
    """
    try:
        from domains.ats import ATSAnalysisService

        return ATSAnalysisService()
    except ImportError as e:
        raise ImportError(
            "ATS analyzer requires additional dependencies. "
            "Install with: pip install pdfminer.six python-docx Pillow"
        ) from e


# Legacy compatibility alias (deprecated)
def get_ats_scanner(resume_path: str) -> Any:
    """DEPRECATED: Use get_ats_analyzer() instead."""
    import warnings

    warnings.warn(
        "get_ats_scanner() is deprecated. Use get_ats_analyzer() instead.",
        DeprecationWarning,
        stacklevel=2,
    )
    return get_ats_analyzer(resume_path)
