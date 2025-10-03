"""
Resume Parser for Auto-Configuration

Extracts relevant information from resumes (PDF/DOCX) to automatically
populate user preferences for job matching.

Supports:
- PDF files (via pdfplumber)
- DOCX files (via python-docx)
- Extraction of: skills, titles, companies, experience, education
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Optional, Set
import logging

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


logger = logging.getLogger(__name__)


# Common tech skills/keywords to look for
COMMON_SKILLS = {
    # Programming Languages
    "python",
    "javascript",
    "java",
    "go",
    "golang",
    "rust",
    "c++",
    "c#",
    "ruby",
    "typescript",
    "php",
    "swift",
    "kotlin",
    "scala",
    "r",
    "shell",
    "bash",
    # Cloud & Infrastructure
    "aws",
    "azure",
    "gcp",
    "google cloud",
    "kubernetes",
    "k8s",
    "docker",
    "terraform",
    "ansible",
    "jenkins",
    "circleci",
    "github actions",
    "cloudformation",
    "helm",
    "istio",
    "prometheus",
    "grafana",
    # Security
    "security",
    "infosec",
    "appsec",
    "devsecops",
    "penetration testing",
    "vulnerability",
    "owasp",
    "siem",
    "soc",
    "iam",
    "zero trust",
    "encryption",
    "cryptography",
    "oauth",
    "saml",
    "ssl/tls",
    # Databases
    "postgresql",
    "postgres",
    "mysql",
    "mongodb",
    "redis",
    "elasticsearch",
    "dynamodb",
    "cassandra",
    "sql",
    "nosql",
    "database",
    # Web & API
    "rest",
    "api",
    "graphql",
    "http",
    "microservices",
    "grpc",
    "fastapi",
    "flask",
    "django",
    "react",
    "vue",
    "angular",
    "node.js",
    # DevOps & Tools
    "ci/cd",
    "git",
    "linux",
    "unix",
    "monitoring",
    "logging",
    "observability",
    "agile",
    "scrum",
    "jira",
    "confluence",
    # Data & ML
    "machine learning",
    "ml",
    "ai",
    "data science",
    "pandas",
    "numpy",
    "pytorch",
    "tensorflow",
    "scikit-learn",
    "spark",
    "hadoop",
}

# Common job title keywords
TITLE_KEYWORDS = {
    "engineer",
    "developer",
    "architect",
    "lead",
    "senior",
    "staff",
    "principal",
    "manager",
    "director",
    "devops",
    "sre",
    "security",
    "software",
    "backend",
    "frontend",
    "full stack",
    "fullstack",
    "data",
    "ml",
    "platform",
    "infrastructure",
    "cloud",
    "qa",
    "test",
}

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
        self.skills: Set[str] = set()
        self.titles: List[str] = []
        self.companies: List[str] = []
        self.education: List[str] = []
        self.years_experience: Optional[int] = None

    def parse_file(self, file_path: str | Path) -> Dict:
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
            with open(cache_file, "r") as f:
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
                f"Unsupported file type: {file_path.suffix}. "
                "Supported types: .pdf, .docx"
            )

        # Extract structured information
        self._extract_skills()
        self._extract_titles()
        self._extract_companies()
        self._extract_education()
        self._extract_experience()

        # Save to cache
        result = self.to_dict()
        with open(cache_file, "w") as f:
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
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
        except Exception as e:
            logger.error(f"Failed to parse PDF: {e}")
            raise ValueError(f"Failed to parse PDF: {e}")

        return "\n".join(text_parts)

    def _extract_docx(self, file_path: Path) -> str:
        """Extract text from DOCX file."""
        try:
            doc = Document(file_path)
            paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
            return "\n".join(paragraphs)
        except Exception as e:
            logger.error(f"Failed to parse DOCX: {e}")
            raise ValueError(f"Failed to parse DOCX: {e}")

try:
    import spacy
    # Download the model if it doesn't exist
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        print("Downloading spaCy model...")
        from spacy.cli import download
        download("en_core_web_sm")
        nlp = spacy.load("en_core_web_sm")
    HAS_SPACY = True
except ImportError:
    HAS_SPACY = False

def _extract_skills(self):
    """Extract technical skills from resume text using spaCy NER."""
    if not HAS_SPACY:
        logger.warning("spaCy not installed. Falling back to keyword-based skill extraction.")
        # Keep the old keyword-based extraction as a fallback
        text_lower = self.text.lower()
        for skill in COMMON_SKILLS:
            pattern = r"\b" + re.escape(skill.lower()) + r"\b"
            if re.search(pattern, text_lower):
                self.skills.add(skill.title() if len(skill) > 3 else skill.upper())
        return

    doc = nlp(self.text)
    # Using entity labels for skills, e.g., ORG, PRODUCT, and custom patterns
    for ent in doc.ents:
        if ent.label_ in ["ORG", "PRODUCT"]:
            self.skills.add(ent.text.strip())

    # Add custom patterns for skills that NER might miss
    # This is a placeholder for a more robust pattern matching system
    custom_skill_patterns = [r'[Pp]ython', r'[Jj]ava[Ss]cript', r'[Rr]eact', r'[Nn]ode.js', r'[Aa]ws', r'[Gg]cp', r'[Aa]zure', r'[Dd]ocker', r'[Kk]ubernetes']
    for pattern in custom_skill_patterns:
        matches = re.findall(pattern, self.text)
        for match in matches:
            self.skills.add(match.strip())

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
        # Look for patterns like "at Company" or "@ Company"
        company_patterns = [
            r"(?:at|@)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+[-•|]|\s*\n|,\s)",
            r"([A-Z][A-Za-z0-9\s&]+?)(?:\s+[-•|]\s+(?:"
            + "|".join(TITLE_KEYWORDS)
            + "))",
        ]

        for pattern in company_patterns:
            matches = re.findall(pattern, self.text)
            for match in matches:
                company = match.strip()
                # Filter out common false positives
                if (
                    len(company) > 2
                    and len(company) < 50
                    and company.lower() not in TITLE_KEYWORDS
                ):
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

    def to_dict(self) -> Dict:
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
        existing_prefs: Optional[Dict] = None,
        salary_floor: Optional[int] = None,
        add_skills: Optional[List[str]] = None,
        remove_skills: Optional[List[str]] = None,
    ) -> Dict:
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
            salary_floor = min(
                50000 + (self.years_experience * 20000), 300000  # Cap at $300k
            )

        if salary_floor:
            prefs["salary_floor_usd"] = salary_floor

        return prefs


def parse_resume(file_path: str | Path) -> Dict:
    """
    Convenience function to parse a resume file.

    Args:
        file_path: Path to resume file (PDF or DOCX)

    Returns:
        Dictionary with extracted information
    """
    parser = ResumeParser()
    return parser.parse_file(file_path)


def interactive_skill_editor(extracted_skills: List[str]) -> Tuple[List[str], List[str]]:
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

        if choice == 'a':
            skill_to_add = input("Enter the skill to add: ").strip()
            if skill_to_add:
                added_skills.append(skill_to_add)
                print(f"Added '{skill_to_add}'.")
        elif choice == 'r':
            skill_to_remove = input("Enter the skill to remove: ".strip())
            if skill_to_remove in extracted_skills:
                removed_skills.append(skill_to_remove)
                print(f"Removed '{skill_to_remove}'.")
            else:
                print(f"'{skill_to_remove}' not found in the list.")
        elif choice == 'd':
            break
        else:
            print("Invalid choice. Please try again.")

    return added_skills, removed_skills

def check_dependencies() -> tuple[bool, List[str]]:
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
