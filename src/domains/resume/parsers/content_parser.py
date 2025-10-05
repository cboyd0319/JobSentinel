"""
Resume Parser

Parses resume content into structured format for analysis and enhancement.
"""

import logging
import re
from typing import Dict, List, Optional

from .models import ResumeContent, ResumeSection, SectionType

logger = logging.getLogger(__name__)


class ResumeContentParser:
    """Parses resume text into structured content."""
    
    # Common section header patterns
    SECTION_PATTERNS = {
        SectionType.CONTACT: [
            r'(?i)^(contact|personal)\s*(information|info|details)?',
            r'(?i)^(name|email|phone|address)'
        ],
        SectionType.SUMMARY: [
            r'(?i)^(professional\s+)?(summary|profile|objective)',
            r'(?i)^(career\s+)?(summary|objective|profile)',
            r'(?i)^about(\s+me)?'
        ],
        SectionType.EXPERIENCE: [
            r'(?i)^(work\s+|professional\s+|employment\s+)?experience',
            r'(?i)^(career\s+|work\s+)?history',
            r'(?i)^employment'
        ],
        SectionType.EDUCATION: [
            r'(?i)^education(al\s+background)?',
            r'(?i)^academic(\s+background)?',
            r'(?i)^degrees?'
        ],
        SectionType.SKILLS: [
            r'(?i)^(technical\s+|core\s+|key\s+)?skills',
            r'(?i)^competencies',
            r'(?i)^expertise'
        ],
        SectionType.PROJECTS: [
            r'(?i)^projects?',
            r'(?i)^portfolio',
            r'(?i)^selected\s+projects'
        ],
        SectionType.CERTIFICATIONS: [
            r'(?i)^certifications?',
            r'(?i)^certificates?',
            r'(?i)^licenses?'
        ],
        SectionType.AWARDS: [
            r'(?i)^awards?',
            r'(?i)^achiev\w+',
            r'(?i)^honors?',
            r'(?i)^recognition'
        ],
        SectionType.PUBLICATIONS: [
            r'(?i)^publications?',
            r'(?i)^research',
            r'(?i)^papers?'
        ],
        SectionType.VOLUNTEER: [
            r'(?i)^volunteer',
            r'(?i)^community\s+service',
            r'(?i)^extracurricular'
        ]
    }
    
    def parse_resume_text(self, text: str) -> ResumeContent:
        """Parse resume text into structured content."""
        logger.info("Parsing resume text into structured format")
        
        # Split text into lines
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # Identify sections
        sections = self._identify_sections(lines)
        
        # Extract contact information
        contact_info = self._extract_contact_info(text)
        
        # Build structured content
        resume_content = ResumeContent()
        
        for section_type, section_lines in sections.items():
            content = [line for line in section_lines if line]
            if content:
                section = ResumeSection(
                    title=section_type.value.title(),
                    content=content,
                    section_type=section_type,
                    order=self._get_section_order(section_type),
                    estimated_lines=len(content)
                )
                resume_content.sections[section_type] = section
        
        # Add metadata
        resume_content.metadata = contact_info
        resume_content.format_info = {
            "total_lines": len(lines),
            "estimated_pages": len(lines) / 30,  # Rough estimate
            "sections_found": len(sections)
        }
        
        logger.info(f"Parsed resume with {len(sections)} sections")
        return resume_content
    
    def _identify_sections(self, lines: List[str]) -> Dict[SectionType, List[str]]:
        """Identify resume sections from lines."""
        sections = {}
        current_section = None
        current_content = []
        
        for line in lines:
            # Check if this line is a section header
            detected_section = self._detect_section_header(line)
            
            if detected_section:
                # Save previous section
                if current_section and current_content:
                    sections[current_section] = current_content.copy()
                
                # Start new section
                current_section = detected_section
                current_content = []
            else:
                # Add to current section
                if current_section:
                    current_content.append(line)
                else:
                    # Before any section is identified, assume it's contact info
                    if not sections.get(SectionType.CONTACT):
                        sections[SectionType.CONTACT] = []
                    sections[SectionType.CONTACT].append(line)
        
        # Save final section
        if current_section and current_content:
            sections[current_section] = current_content
        
        return sections
    
    def _detect_section_header(self, line: str) -> Optional[SectionType]:
        """Detect if a line is a section header."""
        line_clean = line.strip()
        
        # Skip very short lines or lines with special characters
        if len(line_clean) < 3 or not line_clean.replace(' ', '').isalnum():
            return None
        
        # Check against patterns
        for section_type, patterns in self.SECTION_PATTERNS.items():
            for pattern in patterns:
                if re.match(pattern, line_clean):
                    return section_type
        
        return None
    
    def _extract_contact_info(self, text: str) -> Dict[str, str]:
        """Extract contact information from resume text."""
        contact_info = {}
        
        # Email pattern
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        if emails:
            contact_info['email'] = emails[0]
        
        # Phone pattern (US format)
        phone_pattern = r'(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'
        phones = re.findall(phone_pattern, text)
        if phones:
            contact_info['phone'] = ''.join(phones[0])
        
        # LinkedIn pattern
        linkedin_pattern = r'linkedin\.com/in/[\w-]+'
        linkedin_matches = re.findall(linkedin_pattern, text.lower())
        if linkedin_matches:
            contact_info['linkedin'] = 'https://' + linkedin_matches[0]
        
        # GitHub pattern
        github_pattern = r'github\.com/[\w-]+'
        github_matches = re.findall(github_pattern, text.lower())
        if github_matches:
            contact_info['github'] = 'https://' + github_matches[0]
        
        # Extract name (first non-empty line that's not an email/phone)
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        for line in lines[:5]:  # Check first 5 lines
            if (not re.search(email_pattern, line) and 
                not re.search(phone_pattern, line) and
                len(line.split()) <= 4 and  # Names typically 2-4 words
                line.replace(' ', '').replace('.', '').isalpha()):
                contact_info['name'] = line
                break
        
        return contact_info
    
    def _get_section_order(self, section_type: SectionType) -> int:
        """Get the recommended order for sections."""
        order_map = {
            SectionType.CONTACT: 1,
            SectionType.SUMMARY: 2,
            SectionType.EXPERIENCE: 3,
            SectionType.SKILLS: 4,
            SectionType.EDUCATION: 5,
            SectionType.PROJECTS: 6,
            SectionType.CERTIFICATIONS: 7,
            SectionType.AWARDS: 8,
            SectionType.PUBLICATIONS: 9,
            SectionType.VOLUNTEER: 10,
            SectionType.REFERENCES: 11
        }
        return order_map.get(section_type, 99)