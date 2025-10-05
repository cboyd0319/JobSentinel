"""
Resume Content Analyzer

Analyzes resume content for quality, readability, and effectiveness.
"""

import logging
import re
from collections import Counter
from typing import Dict, List

from ..models import ResumeContent, SectionType

logger = logging.getLogger(__name__)

# Optional dependency with graceful degradation
try:
    from textstat import flesch_reading_ease, flesch_kincaid_grade
    HAS_TEXTSTAT = True
except ImportError:
    HAS_TEXTSTAT = False
    logger.warning("textstat not available. Readability analysis will be simplified.")


class ContentAnalyzer:
    """Analyzes resume content for quality and effectiveness."""
    
    # Strong action verbs for resume writing
    STRONG_ACTION_VERBS = {
        "achieved", "accomplished", "analyzed", "built", "created", "designed",
        "developed", "enhanced", "executed", "generated", "implemented", "improved",
        "increased", "launched", "led", "managed", "optimized", "organized",
        "produced", "reduced", "streamlined", "transformed", "delivered", "directed"
    }
    
    # Weak phrases to avoid
    WEAK_PHRASES = {
        "responsible for", "duties included", "worked on", "helped with",
        "assisted in", "participated in", "involved in", "familiar with"
    }
    
    # Industry keywords for different sectors
    INDUSTRY_KEYWORDS = {
        "technology": {
            "programming", "software", "development", "engineering", "coding",
            "algorithms", "systems", "database", "cloud", "api", "framework"
        },
        "business": {
            "strategy", "analysis", "planning", "management", "leadership",
            "operations", "process", "optimization", "efficiency", "growth"
        },
        "marketing": {
            "campaign", "brand", "digital", "social media", "content",
            "advertising", "promotion", "engagement", "conversion", "analytics"
        }
    }
    
    def analyze_content(self, resume_content: ResumeContent) -> Dict:
        """Perform comprehensive content analysis."""
        
        logger.info("Starting content analysis")
        
        # Get all text content
        all_text = self._get_all_text(resume_content)
        
        analysis = {
            "word_count": len(all_text.split()),
            "character_count": len(all_text),
            "readability_score": self._calculate_readability(all_text),
            "action_verb_score": self._analyze_action_verbs(all_text),
            "keyword_density": self._calculate_keyword_density(all_text),
            "section_analysis": self._analyze_sections(resume_content),
            "formatting_score": self._analyze_formatting(resume_content),
            "quantification_score": self._analyze_quantification(all_text),
            "weakness_indicators": self._find_weakness_indicators(all_text)
        }
        
        logger.info(f"Content analysis complete. Readability: {analysis['readability_score']}")
        return analysis
    
    def _get_all_text(self, resume_content: ResumeContent) -> str:
        """Extract all text content from resume."""
        all_content = []
        
        for section in resume_content.sections.values():
            all_content.extend(section.content)
        
        return " ".join(all_content)
    
    def _calculate_readability(self, text: str) -> float:
        """Calculate readability score."""
        if not HAS_TEXTSTAT or not text.strip():
            return self._simple_readability(text)
        
        try:
            # Flesch Reading Ease: 0-100 scale (higher is more readable)
            flesch_score = flesch_reading_ease(text)
            # Convert to 0-100 scale where 100 is optimal for resumes
            # Optimal range for resumes is 60-70 Flesch score
            if 60 <= flesch_score <= 70:
                return 100.0
            elif 50 <= flesch_score < 80:
                return 80.0
            elif 40 <= flesch_score < 90:
                return 60.0
            else:
                return 40.0
                
        except Exception as e:
            logger.warning(f"Textstat analysis failed: {e}")
            return self._simple_readability(text)
    
    def _simple_readability(self, text: str) -> float:
        """Simple readability calculation when textstat is not available."""
        if not text.strip():
            return 0.0
        
        words = text.split()
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return 50.0
        
        avg_words_per_sentence = len(words) / len(sentences)
        
        # Optimal range for resume readability: 15-20 words per sentence
        if 15 <= avg_words_per_sentence <= 20:
            return 100.0
        elif 10 <= avg_words_per_sentence <= 25:
            return 80.0
        elif 8 <= avg_words_per_sentence <= 30:
            return 60.0
        else:
            return 40.0
    
    def _analyze_action_verbs(self, text: str) -> float:
        """Analyze use of strong action verbs."""
        words = re.findall(r'\b\w+\b', text.lower())
        total_words = len(words)
        
        if total_words == 0:
            return 0.0
        
        # Count strong action verbs
        strong_verb_count = sum(1 for word in words if word in self.STRONG_ACTION_VERBS)
        
        # Count weak phrases
        text_lower = text.lower()
        weak_phrase_count = sum(1 for phrase in self.WEAK_PHRASES if phrase in text_lower)
        
        # Calculate score
        strong_ratio = strong_verb_count / total_words * 100
        weak_penalty = weak_phrase_count * 5  # Penalty for weak phrases
        
        score = max(0, min(100, strong_ratio * 10 - weak_penalty))
        return round(score, 1)
    
    def _calculate_keyword_density(self, text: str) -> Dict[str, float]:
        """Calculate keyword density for different industries."""
        words = re.findall(r'\b\w+\b', text.lower())
        total_words = len(words)
        
        if total_words == 0:
            return {}
        
        keyword_density = {}
        
        for industry, keywords in self.INDUSTRY_KEYWORDS.items():
            keyword_count = sum(1 for word in words if word in keywords)
            density = (keyword_count / total_words) * 100
            keyword_density[industry] = round(density, 2)
        
        return keyword_density
    
    def _analyze_sections(self, resume_content: ResumeContent) -> Dict:
        """Analyze individual sections."""
        section_analysis = {}
        
        for section_type, section in resume_content.sections.items():
            section_text = " ".join(section.content)
            
            analysis = {
                "word_count": len(section_text.split()),
                "line_count": len(section.content),
                "completeness": self._assess_section_completeness(section_type, section_text),
                "quality_score": self._assess_section_quality(section_type, section_text)
            }
            
            section_analysis[section_type.value] = analysis
        
        return section_analysis
    
    def _assess_section_completeness(self, section_type: SectionType, text: str) -> float:
        """Assess completeness of a specific section."""
        word_count = len(text.split())
        
        # Expected word counts for different sections
        expected_counts = {
            SectionType.CONTACT: (5, 15),
            SectionType.SUMMARY: (20, 50),
            SectionType.EXPERIENCE: (100, 300),
            SectionType.EDUCATION: (10, 30),
            SectionType.SKILLS: (15, 40),
            SectionType.PROJECTS: (30, 100)
        }
        
        if section_type not in expected_counts:
            return 80.0  # Default for other sections
        
        min_words, max_words = expected_counts[section_type]
        
        if min_words <= word_count <= max_words:
            return 100.0
        elif word_count < min_words:
            return max(20.0, (word_count / min_words) * 100)
        else:
            # Penalty for being too long
            excess_ratio = (word_count - max_words) / max_words
            penalty = min(50, excess_ratio * 30)
            return max(50.0, 100 - penalty)
    
    def _assess_section_quality(self, section_type: SectionType, text: str) -> float:
        """Assess quality of a specific section."""
        if not text.strip():
            return 0.0
        
        score = 50.0  # Base score
        
        # Section-specific quality checks
        if section_type == SectionType.EXPERIENCE:
            score += self._assess_experience_quality(text)
        elif section_type == SectionType.SUMMARY:
            score += self._assess_summary_quality(text)
        elif section_type == SectionType.SKILLS:
            score += self._assess_skills_quality(text)
        
        return min(100.0, score)
    
    def _assess_experience_quality(self, text: str) -> float:
        """Assess quality of experience section."""
        quality_score = 0.0
        
        # Check for quantification
        has_numbers = bool(re.search(r'\d+', text))
        if has_numbers:
            quality_score += 20
        
        # Check for action verbs
        text_lower = text.lower()
        action_verbs_found = sum(1 for verb in self.STRONG_ACTION_VERBS if verb in text_lower)
        quality_score += min(20, action_verbs_found * 3)
        
        # Check against weak phrases
        weak_phrases_found = sum(1 for phrase in self.WEAK_PHRASES if phrase in text_lower)
        quality_score -= weak_phrases_found * 5
        
        return quality_score
    
    def _assess_summary_quality(self, text: str) -> float:
        """Assess quality of professional summary."""
        quality_score = 0.0
        text_lower = text.lower()
        
        # Check for experience mention
        if any(word in text_lower for word in ["experience", "years", "professional"]):
            quality_score += 15
        
        # Check for skills mention
        if any(word in text_lower for word in ["skills", "expertise", "specialized"]):
            quality_score += 10
        
        # Check for value proposition
        if any(word in text_lower for word in ["achieve", "deliver", "result", "improve"]):
            quality_score += 15
        
        return quality_score
    
    def _assess_skills_quality(self, text: str) -> float:
        """Assess quality of skills section."""
        quality_score = 0.0
        
        # Count distinct skills (separated by commas or line breaks)
        skills = re.split(r'[,\n\r•·]', text)
        skills = [skill.strip() for skill in skills if skill.strip()]
        
        skill_count = len(skills)
        
        if skill_count >= 10:
            quality_score += 25
        elif skill_count >= 5:
            quality_score += 15
        else:
            quality_score += skill_count * 2
        
        return quality_score
    
    def _analyze_formatting(self, resume_content: ResumeContent) -> float:
        """Analyze formatting consistency and structure."""
        formatting_score = 80.0  # Base score
        
        # Check section order
        sections = list(resume_content.sections.keys())
        expected_order = [
            SectionType.CONTACT, SectionType.SUMMARY, SectionType.EXPERIENCE,
            SectionType.EDUCATION, SectionType.SKILLS
        ]
        
        # Simple order check
        found_order = [s for s in expected_order if s in sections]
        if found_order == expected_order[:len(found_order)]:
            formatting_score += 10
        
        # Check for consistency in content length
        section_lengths = [len(section.content) for section in resume_content.sections.values()]
        if section_lengths and max(section_lengths) / min(section_lengths) < 10:
            formatting_score += 10  # Reasonable balance between sections
        
        return min(100.0, formatting_score)
    
    def _analyze_quantification(self, text: str) -> float:
        """Analyze use of quantification and metrics."""
        
        # Look for numbers, percentages, and quantifiers
        number_patterns = [
            r'\d+%',  # Percentages
            r'\$\d+',  # Dollar amounts
            r'\d+\+',  # Numbers with plus
            r'\d+k\b',  # Thousands (5k, 10k, etc.)
            r'\d+m\b',  # Millions
            r'\d+\s*(years?|months?|weeks?)',  # Time periods
            r'\d+\s*(people|team|members|employees)',  # Team sizes
            r'\d+\s*(projects?|clients?|customers?)',  # Quantities
        ]
        
        quantification_count = 0
        for pattern in number_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            quantification_count += len(matches)
        
        # Score based on quantification density
        words = text.split()
        if len(words) == 0:
            return 0.0
        
        density = quantification_count / len(words) * 1000  # Per 1000 words
        
        # Optimal range: 20-50 quantifications per 1000 words
        if 20 <= density <= 50:
            return 100.0
        elif 10 <= density <= 70:
            return 80.0
        elif density > 0:
            return 60.0
        else:
            return 20.0
    
    def _find_weakness_indicators(self, text: str) -> List[str]:
        """Find indicators of weak resume content."""
        indicators = []
        text_lower = text.lower()
        
        # Check for weak phrases
        for phrase in self.WEAK_PHRASES:
            if phrase in text_lower:
                indicators.append(f"Contains weak phrase: '{phrase}'")
        
        # Check for passive voice indicators
        passive_indicators = ["was", "were", "been", "being"]
        passive_count = sum(1 for word in passive_indicators if f" {word} " in text_lower)
        if passive_count > 3:
            indicators.append("Excessive use of passive voice")
        
        # Check for lack of action verbs
        action_verb_count = sum(1 for verb in self.STRONG_ACTION_VERBS if verb in text_lower)
        word_count = len(text.split())
        if word_count > 100 and action_verb_count < 3:
            indicators.append("Insufficient use of strong action verbs")
        
        return indicators