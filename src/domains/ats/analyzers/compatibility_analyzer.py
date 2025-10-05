"""
ATS Compatibility Analyzer

Core analyzer for evaluating ATS compatibility of resumes.
"""

import logging
import re
from typing import List, Dict, Set
from collections import Counter

from ..models import ATSIssue, ATSIssueLevel, ATSSystem, KeywordMatch

logger = logging.getLogger(__name__)

# Optional dependency with graceful degradation
try:
    import spacy
    HAS_SPACY = True
    # Try to load the model
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        logger.info("Downloading spaCy English model...")
        spacy.cli.download("en_core_web_sm")
        nlp = spacy.load("en_core_web_sm")
except ImportError:
    HAS_SPACY = False
    logger.warning("spaCy not available. NLP-based analysis will be disabled.")


class CompatibilityAnalyzer:
    """Analyzes resume content for ATS compatibility issues."""
    
    # Problematic formatting patterns that ATS systems struggle with
    PROBLEMATIC_PATTERNS = {
        'tables': r'(?:\|[^|\n]*\||\t[^\t\n]*\t)',
        'special_chars': r'[★★☆●○◆▪▫■□✓✔●•]',
        'graphics': r'(?i)(chart|graph|image|picture|logo)',
        'columns': r'(?:\s{10,}|\t{2,})',  # Multiple spaces/tabs indicating columns
        'headers_footers': r'(?i)(page \d+|confidential|draft)',
    }
    
    # ATS-friendly section headers
    STANDARD_HEADERS = {
        'contact information', 'professional summary', 'work experience',
        'education', 'skills', 'certifications', 'projects', 'awards'
    }
    
    # Industry-standard skills database
    TECHNICAL_SKILLS = {
        'programming': [
            'python', 'java', 'javascript', 'c++', 'c#', 'go', 'rust', 'ruby',
            'php', 'swift', 'kotlin', 'typescript', 'scala', 'r', 'matlab'
        ],
        'frameworks': [
            'react', 'angular', 'vue', 'django', 'flask', 'spring', 'express',
            'laravel', 'rails', '.net', 'nodejs'
        ],
        'databases': [
            'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
            'oracle', 'sql server', 'sqlite', 'cassandra', 'dynamodb'
        ],
        'cloud': [
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
            'ansible', 'jenkins', 'github actions', 'gitlab ci'
        ],
        'tools': [
            'git', 'jira', 'confluence', 'slack', 'figma', 'adobe',
            'tableau', 'power bi', 'excel', 'powerpoint'
        ]
    }
    
    def __init__(self):
        self.all_skills = []
        for category_skills in self.TECHNICAL_SKILLS.values():
            self.all_skills.extend(category_skills)
    
    def analyze_formatting(self, text: str) -> List[ATSIssue]:
        """Analyze text for ATS-problematic formatting."""
        issues = []
        
        for issue_type, pattern in self.PROBLEMATIC_PATTERNS.items():
            matches = re.findall(pattern, text)
            if matches:
                severity = self._get_formatting_severity(issue_type, len(matches))
                
                issue = ATSIssue(
                    level=severity,
                    category="formatting",
                    description=f"Found {len(matches)} instances of {issue_type.replace('_', ' ')}",
                    location=f"Line containing: {matches[0][:50]}..." if matches else None,
                    affected_systems=self._get_affected_systems(issue_type),
                    recommendations=self._get_formatting_recommendations(issue_type),
                    impact_score=self._calculate_impact_score(severity, len(matches))
                )
                issues.append(issue)
        
        return issues
    
    def analyze_keywords(self, text: str, job_keywords: List[str] = None) -> List[KeywordMatch]:
        """Analyze keyword matches and relevance."""
        if not job_keywords:
            job_keywords = self.all_skills
        
        text_lower = text.lower()
        keyword_matches = []
        
        for keyword in job_keywords:
            # Count exact matches
            exact_matches = len(re.findall(r'\b' + re.escape(keyword.lower()) + r'\b', text_lower))
            
            if exact_matches > 0:
                # Calculate relevance score based on frequency and context
                relevance = min(1.0, exact_matches / 10.0)  # Cap at 1.0
                
                # Extract context around matches
                context = self._extract_keyword_context(text, keyword)
                
                match = KeywordMatch(
                    keyword=keyword,
                    matches=exact_matches,
                    relevance_score=relevance,
                    context=context,
                    is_skill=keyword in self.all_skills,
                    is_required=exact_matches >= 2  # Heuristic for required skills
                )
                keyword_matches.append(match)
        
        return sorted(keyword_matches, key=lambda x: x.relevance_score, reverse=True)
    
    def analyze_readability(self, text: str) -> List[ATSIssue]:
        """Analyze text readability for ATS systems."""
        issues = []
        
        # Check for overly complex sentences
        sentences = re.split(r'[.!?]+', text)
        long_sentences = [s for s in sentences if len(s.split()) > 25]
        
        if long_sentences:
            issues.append(ATSIssue(
                level=ATSIssueLevel.MEDIUM,
                category="readability",
                description=f"Found {len(long_sentences)} overly complex sentences",
                recommendations=[
                    "Break long sentences into shorter, clearer statements",
                    "Use bullet points for complex information",
                    "Aim for 15-20 words per sentence maximum"
                ],
                impact_score=len(long_sentences) * 5
            ))
        
        # Check for jargon and acronyms
        if HAS_SPACY:
            issues.extend(self._analyze_with_nlp(text))
        
        return issues
    
    def analyze_structure(self, text: str) -> List[ATSIssue]:
        """Analyze resume structure and organization."""
        issues = []
        
        # Check for standard section headers
        text_lower = text.lower()
        found_headers = []
        
        for header in self.STANDARD_HEADERS:
            if header in text_lower:
                found_headers.append(header)
        
        if len(found_headers) < 4:
            issues.append(ATSIssue(
                level=ATSIssueLevel.HIGH,
                category="structure",
                description="Missing standard resume sections",
                recommendations=[
                    "Include these standard sections: Contact Information, Professional Summary, Work Experience, Education, Skills",
                    "Use clear, standard section headers",
                    "Organize content in reverse chronological order"
                ],
                impact_score=50 - (len(found_headers) * 10)
            ))
        
        return issues
    
    def _get_formatting_severity(self, issue_type: str, count: int) -> ATSIssueLevel:
        """Determine severity level for formatting issues."""
        severity_map = {
            'tables': ATSIssueLevel.CRITICAL if count > 2 else ATSIssueLevel.HIGH,
            'special_chars': ATSIssueLevel.MEDIUM if count > 5 else ATSIssueLevel.LOW,
            'graphics': ATSIssueLevel.HIGH,
            'columns': ATSIssueLevel.MEDIUM,
            'headers_footers': ATSIssueLevel.LOW
        }
        return severity_map.get(issue_type, ATSIssueLevel.MEDIUM)
    
    def _get_affected_systems(self, issue_type: str) -> List[ATSSystem]:
        """Get ATS systems affected by specific formatting issues."""
        system_map = {
            'tables': [ATSSystem.TALEO, ATSSystem.ICIMS, ATSSystem.GENERIC],
            'special_chars': [ATSSystem.TALEO, ATSSystem.WORKDAY, ATSSystem.GENERIC],
            'graphics': list(ATSSystem),  # All systems
            'columns': [ATSSystem.TALEO, ATSSystem.ICIMS],
            'headers_footers': [ATSSystem.GENERIC]
        }
        return system_map.get(issue_type, [ATSSystem.GENERIC])
    
    def _get_formatting_recommendations(self, issue_type: str) -> List[str]:
        """Get recommendations for fixing formatting issues."""
        recommendations = {
            'tables': [
                "Convert tables to bullet points or plain text",
                "Use consistent formatting without table structures",
                "List information vertically rather than in columns"
            ],
            'special_chars': [
                "Replace special characters with standard bullets (-)",
                "Use plain text formatting only",
                "Avoid decorative fonts and symbols"
            ],
            'graphics': [
                "Remove all images, charts, and graphics",
                "Convert visual information to text descriptions",
                "Use text-based formatting only"
            ],
            'columns': [
                "Use single-column layout throughout",
                "List information vertically",
                "Avoid multiple columns or complex layouts"
            ],
            'headers_footers': [
                "Remove headers and footers",
                "Include all relevant information in main content",
                "Keep formatting simple and clean"
            ]
        }
        return recommendations.get(issue_type, ["Review and simplify formatting"])
    
    def _calculate_impact_score(self, severity: ATSIssueLevel, count: int) -> float:
        """Calculate impact score for an issue."""
        base_scores = {
            ATSIssueLevel.CRITICAL: 30,
            ATSIssueLevel.HIGH: 20,
            ATSIssueLevel.MEDIUM: 10,
            ATSIssueLevel.LOW: 5,
            ATSIssueLevel.INFO: 1
        }
        return min(100, base_scores[severity] * count)
    
    def _extract_keyword_context(self, text: str, keyword: str) -> List[str]:
        """Extract context around keyword matches."""
        contexts = []
        pattern = r'.{0,30}\b' + re.escape(keyword.lower()) + r'\b.{0,30}'
        
        matches = re.finditer(pattern, text.lower())
        for match in matches:
            context = match.group().strip()
            if context and context not in contexts:
                contexts.append(context)
        
        return contexts[:3]  # Limit to 3 contexts
    
    def _analyze_with_nlp(self, text: str) -> List[ATSIssue]:
        """Perform NLP-based analysis if spaCy is available."""
        if not HAS_SPACY:
            return []
        
        issues = []
        
        try:
            doc = nlp(text[:1000000])  # Limit text length for performance
            
            # Check for excessive jargon
            technical_terms = 0
            total_tokens = 0
            
            for token in doc:
                if token.is_alpha and len(token.text) > 3:
                    total_tokens += 1
                    if not token.is_stop and token.pos_ in ['NOUN', 'ADJ']:
                        # Simple heuristic for technical terms
                        if any(char.isupper() for char in token.text[1:]):
                            technical_terms += 1
            
            if total_tokens > 0 and technical_terms / total_tokens > 0.3:
                issues.append(ATSIssue(
                    level=ATSIssueLevel.LOW,
                    category="readability",
                    description="High ratio of technical jargon detected",
                    recommendations=[
                        "Define technical terms when first used",
                        "Balance technical language with clear explanations",
                        "Use industry-standard terminology"
                    ],
                    impact_score=15
                ))
        
        except Exception as e:
            logger.warning(f"NLP analysis failed: {e}")
        
        return issues