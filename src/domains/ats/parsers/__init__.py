"""
Parser Factory and Coordination

Provides unified interface for all resume parsers.
"""

import logging
from pathlib import Path
from typing import Optional, Dict, Any

from .pdf_parser import PDFParser
from .docx_parser import DOCXParser
from .text_parser import TextParser

logger = logging.getLogger(__name__)


class ResumeParserFactory:
    """Factory for creating appropriate resume parsers."""
    
    def __init__(self):
        self.parsers = [
            PDFParser(),
            DOCXParser(), 
            TextParser()
        ]
    
    def get_parser(self, file_path: str):
        """Get the appropriate parser for the given file."""
        for parser in self.parsers:
            if parser.can_parse(file_path):
                return parser
        return None
    
    def parse_resume(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Parse resume and return extracted content and metadata."""
        parser = self.get_parser(file_path)
        if not parser:
            logger.error(f"No parser available for file: {file_path}")
            return None
        
        try:
            text = parser.extract_text(file_path)
            metadata = parser.extract_metadata(file_path)
            
            if not text:
                logger.warning(f"No text content extracted from: {file_path}")
                return None
            
            return {
                "text": text,
                "metadata": metadata,
                "file_path": str(Path(file_path).resolve()),
                "parser_type": parser.__class__.__name__
            }
            
        except Exception as e:
            logger.error(f"Failed to parse resume {file_path}: {e}")
            return None