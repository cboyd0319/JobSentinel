"""
PDF Resume Parser

Handles extraction and parsing of PDF resumes using pdfplumber.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Optional dependency with graceful degradation
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False
    logger.warning("pdfplumber not available. PDF parsing will be disabled.")


class PDFParser:
    """Handles PDF resume parsing and text extraction."""
    
    def can_parse(self, file_path: str) -> bool:
        """Check if this parser can handle the given file."""
        return HAS_PDFPLUMBER and file_path.lower().endswith('.pdf')
    
    def extract_text(self, file_path: str) -> Optional[str]:
        """Extract text content from PDF resume."""
        if not self.can_parse(file_path):
            return None
            
        try:
            with pdfplumber.open(file_path) as pdf:
                text_content = []
                for page in pdf.pages:
                    if page_text := page.extract_text():
                        text_content.append(page_text)
                
                return "\n".join(text_content) if text_content else None
                
        except Exception as e:
            logger.error(f"Failed to extract text from PDF {file_path}: {e}")
            return None
    
    def extract_metadata(self, file_path: str) -> dict:
        """Extract metadata from PDF resume."""
        if not self.can_parse(file_path):
            return {}
            
        try:
            with pdfplumber.open(file_path) as pdf:
                return {
                    "page_count": len(pdf.pages),
                    "metadata": pdf.metadata or {},
                    "format": "pdf"
                }
        except Exception as e:
            logger.error(f"Failed to extract metadata from PDF {file_path}: {e}")
            return {}