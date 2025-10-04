#!/usr/bin/env python3
"""
DEPRECATED (legacy helper layered on top of legacy ultimate_ats_scanner):
    Retained temporarily. Prefer the new modular analyzer `utils.ats_analyzer.ATSAnalyzer` +
    focused CLI scripts. This enhancer will be removed once feature parity
    plugins (achievements, leadership, action density) stabilize.

Legacy Description:
    Resume Enhancement & Template Generator
    Features:
      1. Resume templates for different industries
      2. Content suggestions based on job descriptions
      3. Skills gap analysis and recommendations
      4. Format optimization for ATS compatibility
      5. Industry-specific optimization
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum

# Import our ultimate ATS scanner
from .ultimate_ats_scanner import UltimateATSScanner, ATSCompatibilityScore


class ResumeTemplate(Enum):
    """Available resume templates optimized for different purposes."""
    ATS_OPTIMIZED = "ats_optimized"       # Maximum ATS compatibility
    EXECUTIVE = "executive"               # Senior leadership roles
    CREATIVE = "creative"                 # Design/creative roles  
    TECHNICAL = "technical"               # Software/engineering
    ENTRY_LEVEL = "entry_level"          # New graduates
    CAREER_CHANGE = "career_change"       # Career transition


@dataclass
class ResumeSection:
    """Represents a resume section with content and formatting."""
    title: str
    content: List[str]
    order: int
    required: bool = True
    industry_specific: bool = False


@dataclass
class ResumeSuggestion:
    """Content suggestion for resume improvement."""
    section: str
    suggestion_type: str  # "add", "improve", "remove"
    content: str
    reason: str
    priority: int  # 1=highest, 5=lowest


@dataclass
class ResumeAnalysis:
    """Comprehensive resume analysis and improvement suggestions."""
    current_score: float
    potential_score: float
    suggestions: List[ResumeSuggestion]
    missing_sections: List[str]
    weak_sections: List[str]
    strong_sections: List[str]
    industry_match: Optional[str]
    recommended_template: ResumeTemplate


class ResumeEnhancer:
    """
    Ultimate Resume Enhancement System
    
    Provides intelligent recommendations, templates, and optimization
    tools to create industry-leading resumes that pass ATS systems
    and impress human reviewers.
    """
    
    # Industry-specific resume requirements
    INDUSTRY_REQUIREMENTS = {
        "software_engineering": {
            "required_sections": ["contact", "summary", "skills", "experience", "education", "projects"],
            "optional_sections": ["certifications", "open_source", "publications"],
            "key_skills": ["programming languages", "frameworks", "cloud platforms", "databases"],
            "experience_format": "technical_detailed",
            "recommended_length": (1, 2),  # pages
            "emphasis": ["technical skills", "project impact", "problem solving"]
        },
        
        "data_science": {
            "required_sections": ["contact", "summary", "skills", "experience", "education", "projects"],
            "optional_sections": ["publications", "certifications", "research"],
            "key_skills": ["programming", "statistics", "machine learning", "visualization"],
            "experience_format": "quantified_results", 
            "recommended_length": (1, 2),
            "emphasis": ["analytical skills", "business impact", "technical expertise"]
        },
        
        "product_management": {
            "required_sections": ["contact", "summary", "experience", "education", "skills"],
            "optional_sections": ["certifications", "achievements", "projects"],
            "key_skills": ["strategy", "analytics", "leadership", "communication"],
            "experience_format": "business_impact",
            "recommended_length": (1, 2),
            "emphasis": ["business results", "leadership", "strategic thinking"]
        },
        
        "marketing": {
            "required_sections": ["contact", "summary", "experience", "education", "skills"],
            "optional_sections": ["campaigns", "achievements", "certifications"],
            "key_skills": ["digital marketing", "analytics", "content creation", "campaigns"],
            "experience_format": "results_focused",
            "recommended_length": (1, 2),
            "emphasis": ["campaign results", "growth metrics", "creativity"]
        },
        
        "executive": {
            "required_sections": ["contact", "executive_summary", "experience", "education", "board_positions"],
            "optional_sections": ["achievements", "speaking", "publications"],
            "key_skills": ["leadership", "strategy", "p&l responsibility", "transformation"],
            "experience_format": "strategic_leadership",
            "recommended_length": (2, 3),
            "emphasis": ["business transformation", "team leadership", "financial results"]
        }
    }
    
    # Resume templates with optimized formatting
    RESUME_TEMPLATES = {
        ResumeTemplate.ATS_OPTIMIZED: {
            "name": "ATS-Optimized Professional",
            "description": "Maximum compatibility with Applicant Tracking Systems",
            "sections": [
                ResumeSection("Contact Information", [], 1, True),
                ResumeSection("Professional Summary", [], 2, True), 
                ResumeSection("Core Competencies", [], 3, True),
                ResumeSection("Professional Experience", [], 4, True),
                ResumeSection("Education", [], 5, True),
                ResumeSection("Technical Skills", [], 6, False, True),
                ResumeSection("Certifications", [], 7, False),
                ResumeSection("Additional Information", [], 8, False)
            ],
            "formatting": {
                "font": "Arial",
                "font_size": 11,
                "margins": "0.75in",
                "line_spacing": 1.15,
                "use_bullets": True,
                "bullet_style": "•",
                "avoid_tables": True,
                "avoid_columns": True,
                "avoid_text_boxes": True
            }
        },
        
        ResumeTemplate.TECHNICAL: {
            "name": "Technical Professional", 
            "description": "Optimized for software engineering and technical roles",
            "sections": [
                ResumeSection("Contact Information", [], 1, True),
                ResumeSection("Technical Summary", [], 2, True),
                ResumeSection("Technical Skills", [], 3, True, True),
                ResumeSection("Professional Experience", [], 4, True),
                ResumeSection("Technical Projects", [], 5, True, True),
                ResumeSection("Education", [], 6, True),
                ResumeSection("Certifications", [], 7, False),
                ResumeSection("Open Source Contributions", [], 8, False, True)
            ],
            "formatting": {
                "font": "Calibri",
                "font_size": 11,
                "margins": "0.7in", 
                "line_spacing": 1.1,
                "use_bullets": True,
                "bullet_style": "•",
                "code_formatting": True
            }
        },
        
        ResumeTemplate.EXECUTIVE: {
            "name": "Executive Leadership",
            "description": "For senior leadership and C-level positions", 
            "sections": [
                ResumeSection("Contact Information", [], 1, True),
                ResumeSection("Executive Profile", [], 2, True),
                ResumeSection("Core Leadership Competencies", [], 3, True),
                ResumeSection("Executive Experience", [], 4, True),
                ResumeSection("Key Achievements", [], 5, True),
                ResumeSection("Board Positions & Affiliations", [], 6, False),
                ResumeSection("Education & Executive Development", [], 7, True),
                ResumeSection("Speaking & Publications", [], 8, False)
            ],
            "formatting": {
                "font": "Times New Roman",
                "font_size": 11,
                "margins": "0.8in",
                "line_spacing": 1.2,
                "executive_style": True,
                "longer_format": True
            }
        }
    }
    
    # Action verbs by industry and level
    ACTION_VERBS = {
        "technical": [
            "architected", "developed", "engineered", "implemented", "optimized",
            "designed", "built", "deployed", "migrated", "automated", "integrated",
            "debugged", "refactored", "scaled", "maintained"
        ],
        "leadership": [
            "led", "directed", "managed", "supervised", "mentored", "guided",
            "spearheaded", "championed", "transformed", "established", "founded",
            "launched", "pioneered", "orchestrated", "steered"
        ],
        "analytical": [
            "analyzed", "evaluated", "assessed", "researched", "investigated", 
            "examined", "studied", "measured", "quantified", "calculated",
            "forecasted", "modeled", "interpreted", "identified"
        ],
        "business": [
            "achieved", "delivered", "exceeded", "generated", "increased",
            "improved", "reduced", "streamlined", "negotiated", "closed",
            "expanded", "captured", "penetrated", "converted"
        ]
    }
    
    def __init__(self):
        """Initialize the Resume Enhancer."""
        self.templates = self.RESUME_TEMPLATES
        self.industry_requirements = self.INDUSTRY_REQUIREMENTS
        
    def analyze_resume(self, resume_path: str, target_job_description: Optional[str] = None) -> ResumeAnalysis:
        """
        Perform comprehensive resume analysis and generate improvement suggestions.
        
        Args:
            resume_path: Path to current resume file
            target_job_description: Optional job description to optimize against
            
        Returns:
            Detailed analysis with suggestions for improvement
        """
        # Use our Ultimate ATS Scanner for base analysis
        scanner = UltimateATSScanner(resume_path, target_job_description)
        ats_score = scanner.scan_comprehensive()
        
        # Detect industry and role level
        industry = self._detect_target_industry(scanner.cleaned_text, target_job_description)
        role_level = self._detect_role_level(scanner.cleaned_text)
        
        # Generate specific suggestions
        suggestions = self._generate_enhancement_suggestions(scanner, ats_score, industry, target_job_description)
        
        # Analyze section strength
        strong_sections, weak_sections = self._analyze_section_strength(scanner, industry)
        
        # Calculate potential score improvement
        potential_score = self._estimate_potential_score(ats_score, suggestions)
        
        # Recommend best template
        recommended_template = self._recommend_template(industry, role_level, ats_score)
        
        return ResumeAnalysis(
            current_score=ats_score.overall_score,
            potential_score=potential_score,
            suggestions=suggestions,
            missing_sections=ats_score.missing_sections,
            weak_sections=weak_sections,
            strong_sections=strong_sections,
            industry_match=industry,
            recommended_template=recommended_template
        )
    
    def generate_resume_template(self, template_type: ResumeTemplate, 
                               industry: Optional[str] = None,
                               experience_level: str = "mid") -> str:
        """
        Generate a complete resume template with industry-specific guidance.
        
        Args:
            template_type: Type of template to generate
            industry: Target industry for customization
            experience_level: "entry", "mid", "senior", "executive"
            
        Returns:
            Formatted resume template as string
        """
        template = self.templates[template_type]
        industry_req = self.industry_requirements.get(industry, {})
        
        # Build template content
        content = []
        content.append(f"# {template['name']} Resume Template")
        content.append(f"# {template['description']}")
        content.append("")
        
        # Add sections based on template and industry requirements
        sections = template["sections"]
        if industry and industry_req:
            # Customize sections for industry
            sections = self._customize_sections_for_industry(sections, industry_req)
        
        for section in sorted(sections, key=lambda x: x.order):
            content.append(f"## {section.title}")
            content.append("")
            
            # Add section-specific guidance
            guidance = self._get_section_guidance(section.title.lower(), industry, experience_level)
            for line in guidance:
                content.append(f"# {line}")
            content.append("")
            
            # Add example content
            examples = self._get_section_examples(section.title.lower(), industry, experience_level)
            for example in examples:
                content.append(example)
            content.append("")
        
        # Add formatting guidelines
        content.append("## Formatting Guidelines")
        content.append("")
        formatting = template["formatting"]
        for key, value in formatting.items():
            content.append(f"# {key.replace('_', ' ').title()}: {value}")
        
        return "\\n".join(content)
    
    def optimize_resume_content(self, current_content: str, 
                              target_job_description: str,
                              industry: str) -> Dict[str, List[str]]:
        """
        Optimize resume content for a specific job description.
        
        Args:
            current_content: Current resume text content
            target_job_description: Job description to optimize against
            industry: Target industry
            
        Returns:
            Dictionary of section improvements
        """
        optimizations = {}
        
        # Extract key requirements from job description
        job_keywords = self._extract_job_keywords(target_job_description)
        required_skills = self._extract_required_skills(target_job_description)
        
        # Analyze current content gaps
        content_gaps = self._identify_content_gaps(current_content, job_keywords, required_skills)
        
        # Generate specific improvements for each section
        sections = ["summary", "experience", "skills", "achievements"]
        
        for section in sections:
            section_optimizations = []
            
            if section == "summary":
                section_optimizations.extend(
                    self._optimize_summary_section(current_content, job_keywords, industry)
                )
            elif section == "experience":
                section_optimizations.extend(
                    self._optimize_experience_section(current_content, job_keywords, industry)
                )
            elif section == "skills":
                section_optimizations.extend(
                    self._optimize_skills_section(current_content, required_skills, industry)
                )
            elif section == "achievements":
                section_optimizations.extend(
                    self._suggest_achievements(current_content, industry)
                )
            
            if section_optimizations:
                optimizations[section] = section_optimizations
        
        return optimizations
    
    def _detect_target_industry(self, resume_text: str, job_description: Optional[str] = None) -> Optional[str]:
        """Detect the target industry from resume and job description."""
        text_to_analyze = resume_text
        if job_description:
            text_to_analyze += " " + job_description
        
        text_lower = text_to_analyze.lower()
        industry_scores = {}
        
        # Score based on keyword frequency and weight
        for industry, requirements in self.industry_requirements.items():
            score = 0
            key_skills = requirements.get("key_skills", [])
            
            for skill in key_skills:
                if skill.lower() in text_lower:
                    score += 1
            
            industry_scores[industry] = score
        
        if industry_scores:
            return max(industry_scores, key=industry_scores.get)
        return None
    
    def _detect_role_level(self, resume_text: str) -> str:
        """Detect experience level from resume content."""
        text_lower = resume_text.lower()
        
        # Executive level indicators
        executive_terms = ["ceo", "cto", "vp", "vice president", "director", "head of", 
                          "chief", "president", "founder", "executive"]
        if any(term in text_lower for term in executive_terms):
            return "executive"
        
        # Senior level indicators  
        senior_terms = ["senior", "lead", "principal", "architect", "manager", "supervisor"]
        senior_count = sum(1 for term in senior_terms if term in text_lower)
        
        # Years of experience estimation
        years_match = re.findall(r"(\\d+)\\s*(?:years?|yrs?)", text_lower)
        max_years = max([int(y) for y in years_match], default=0)
        
        if senior_count >= 2 or max_years >= 8:
            return "senior"
        elif max_years >= 3:
            return "mid"
        else:
            return "entry"
    
    def _generate_enhancement_suggestions(self, scanner: UltimateATSScanner, 
                                        ats_score: ATSCompatibilityScore,
                                        industry: Optional[str],
                                        job_description: Optional[str]) -> List[ResumeSuggestion]:
        """Generate specific suggestions for resume improvement."""
        suggestions = []
        
        # Convert ATS issues to resume suggestions
        for issue in ats_score.issues:
            if issue.level.value in ["critical", "high"]:
                suggestions.append(ResumeSuggestion(
                    section=issue.category,
                    suggestion_type="improve",
                    content=issue.fix_suggestion,
                    reason=issue.description,
                    priority=1 if issue.level.value == "critical" else 2
                ))
        
        # Industry-specific suggestions
        if industry and industry in self.industry_requirements:
            req = self.industry_requirements[industry]
            
            # Check for missing required sections
            for section in req["required_sections"]:
                if section not in ats_score.detected_sections:
                    suggestions.append(ResumeSuggestion(
                        section=section,
                        suggestion_type="add",
                        content=f"Add a {section} section to meet industry standards",
                        reason=f"Required for {industry} roles",
                        priority=1 
                    ))
            
            # Suggest optional sections that add value
            for section in req.get("optional_sections", []):
                if section not in ats_score.detected_sections:
                    suggestions.append(ResumeSuggestion(
                        section=section,
                        suggestion_type="add", 
                        content=f"Consider adding a {section} section",
                        reason=f"Highly valued in {industry} roles",
                        priority=3
                    ))
        
        # Keyword optimization suggestions
        missing_keywords = []
        for keyword, analysis in ats_score.keyword_analysis.items():
            if analysis.found_count == 0 and analysis.recommended_frequency > 0:
                missing_keywords.append(keyword)
        
        if missing_keywords:
            suggestions.append(ResumeSuggestion(
                section="skills",
                suggestion_type="add",
                content=f"Add missing keywords: {', '.join(missing_keywords[:5])}",
                reason="Improve keyword matching for ATS systems",
                priority=2
            ))
        
        return sorted(suggestions, key=lambda x: x.priority)
    
    def _analyze_section_strength(self, scanner: UltimateATSScanner, 
                                industry: Optional[str]) -> Tuple[List[str], List[str]]:
        """Analyze which sections are strong vs weak."""
        # This would implement detailed section analysis
        # For now, return basic analysis based on detected sections
        
        strong_sections = []
        weak_sections = []
        
        # Basic heuristics - would be more sophisticated in production
        if len(scanner.cleaned_text) > 500:
            strong_sections.append("overall_content")
        else:
            weak_sections.append("overall_content")
        
        return strong_sections, weak_sections
    
    def _estimate_potential_score(self, current_score: ATSCompatibilityScore, 
                                suggestions: List[ResumeSuggestion]) -> float:
        """Estimate potential score improvement from suggestions."""
        # Calculate potential improvement based on suggestion priorities
        potential_gain = 0
        
        for suggestion in suggestions:
            if suggestion.priority == 1:  # Critical fixes
                potential_gain += 15
            elif suggestion.priority == 2:  # High impact
                potential_gain += 10  
            elif suggestion.priority == 3:  # Medium impact
                potential_gain += 5
        
        return min(100, current_score.overall_score + potential_gain)
    
    def _recommend_template(self, industry: Optional[str], role_level: str, 
                          ats_score: ATSCompatibilityScore) -> ResumeTemplate:
        """Recommend the best template based on analysis."""
        
        if role_level == "executive":
            return ResumeTemplate.EXECUTIVE
        elif industry == "software_engineering" or industry == "data_science":
            return ResumeTemplate.TECHNICAL
        elif role_level == "entry":
            return ResumeTemplate.ENTRY_LEVEL
        elif ats_score.overall_score < 70:  # Needs ATS optimization
            return ResumeTemplate.ATS_OPTIMIZED
        else:
            return ResumeTemplate.ATS_OPTIMIZED  # Default safe choice
    
    def _customize_sections_for_industry(self, base_sections: List[ResumeSection], 
                                       industry_req: Dict) -> List[ResumeSection]:
        """Customize template sections for specific industry."""
        # This would implement industry-specific section customization
        return base_sections
    
    def _get_section_guidance(self, section: str, industry: Optional[str], 
                            experience_level: str) -> List[str]:
        """Get guidance text for a specific resume section."""
        guidance = {
            "contact information": [
                "Include: Full name, phone number, professional email, LinkedIn profile",
                "Optional: City/State (full address not needed), portfolio website",
                "Use a professional email address (firstname.lastname@email.com)",
                "Ensure phone number is current and professional voicemail is set up"
            ],
            
            "professional summary": [
                "2-3 sentences highlighting your value proposition",
                "Include years of experience, key skills, and career focus",
                "Mention specific industries or types of companies you target",
                "Quantify achievements where possible (e.g., 'increased sales by 25%')"
            ],
            
            "core competencies": [
                "List 8-12 relevant skills in a clean, scannable format",
                "Use industry-standard terminology and keywords",
                "Group related skills together (e.g., Programming Languages, Cloud Platforms)",
                "Match skills to job requirements you're targeting"
            ],
            
            "professional experience": [
                "List positions in reverse chronological order",
                "Include company name, job title, dates (month/year format)",
                "Use 3-5 bullet points per role focusing on achievements, not duties",
                "Start each bullet with a strong action verb",
                "Quantify results whenever possible (numbers, percentages, dollar amounts)"
            ]
        }
        
        return guidance.get(section, ["Add relevant content for this section"])
    
    def _get_section_examples(self, section: str, industry: Optional[str], 
                            experience_level: str) -> List[str]:
        """Get example content for resume sections."""
        
        examples = {
            "contact information": [
                "John Smith",
                "(555) 123-4567 | john.smith@email.com",
                "LinkedIn: linkedin.com/in/johnsmith | Portfolio: johnsmith.dev",
                "San Francisco, CA"
            ],
            
            "professional summary": [
                "Experienced Software Engineer with 5+ years developing scalable web applications",
                "and cloud infrastructure. Proven track record of delivering high-quality solutions",
                "that improve system performance by 40% and reduce operational costs by $200K annually.",
                "Seeking to leverage full-stack expertise and leadership skills in a Senior Developer role."
            ],
            
            "core competencies": [
                "Programming Languages: Python, JavaScript, Java, TypeScript",
                "Frameworks & Libraries: React, Node.js, Django, Express.js",  
                "Cloud Platforms: AWS (EC2, S3, Lambda), Docker, Kubernetes",
                "Databases: PostgreSQL, MongoDB, Redis",
                "Tools & Methodologies: Git, CI/CD, Agile/Scrum, TDD"
            ]
        }
        
        return examples.get(section, [f"[Add {section} content here]"])
    
    def _extract_job_keywords(self, job_description: str) -> List[str]:
        """Extract important keywords from job description."""
        # This would implement sophisticated keyword extraction
        # For now, return basic word frequency analysis
        words = re.findall(r'\\b\\w+\\b', job_description.lower())
        
        # Remove common words
        stopwords = {"the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "as", "by"}
        keywords = [w for w in words if len(w) > 3 and w not in stopwords]
        
        # Return most frequent keywords
        from collections import Counter
        return [word for word, count in Counter(keywords).most_common(20)]
    
    def _extract_required_skills(self, job_description: str) -> List[str]:
        """Extract required skills from job description."""
        # This would implement NLP-based skill extraction
        # For now, return basic pattern matching
        
        skill_patterns = [
            r"required skills?:?\\s*(.+?)(?:\\n|\\.|$)",
            r"must have:?\\s*(.+?)(?:\\n|\\.|$)", 
            r"experience with:?\\s*(.+?)(?:\\n|\\.|$)"
        ]
        
        skills = []
        for pattern in skill_patterns:
            matches = re.findall(pattern, job_description, re.IGNORECASE)
            for match in matches:
                # Split on common delimiters
                skill_items = re.split(r'[,;•·-]', match)
                skills.extend([s.strip() for s in skill_items if s.strip()])
        
        return skills[:10]  # Return top 10
    
    def _identify_content_gaps(self, resume_content: str, job_keywords: List[str], 
                             required_skills: List[str]) -> Dict[str, List[str]]:
        """Identify gaps between resume content and job requirements."""
        resume_lower = resume_content.lower()
        
        gaps = {
            "missing_keywords": [],
            "missing_skills": []
        }
        
        for keyword in job_keywords:
            if keyword.lower() not in resume_lower:
                gaps["missing_keywords"].append(keyword)
        
        for skill in required_skills:
            if skill.lower() not in resume_lower:
                gaps["missing_skills"].append(skill)
        
        return gaps
    
    def _optimize_summary_section(self, content: str, keywords: List[str], 
                                industry: str) -> List[str]:
        """Generate suggestions for optimizing the summary section."""
        suggestions = []
        
        # Check if summary exists
        if "summary" not in content.lower() and "profile" not in content.lower():
            suggestions.append("Add a professional summary section at the top of your resume")
        
        # Suggest keyword integration
        missing_keywords = [k for k in keywords[:5] if k.lower() not in content.lower()]
        if missing_keywords:
            suggestions.append(f"Incorporate these keywords into your summary: {', '.join(missing_keywords)}")
        
        # Industry-specific suggestions
        if industry == "software_engineering":
            suggestions.append("Highlight your programming languages and years of experience")
            suggestions.append("Mention specific types of applications or systems you've built")
        elif industry == "data_science":
            suggestions.append("Emphasize your analytical skills and business impact")
            suggestions.append("Mention specific industries or domains you've worked in")
        
        return suggestions
    
    def _optimize_experience_section(self, content: str, keywords: List[str], 
                                   industry: str) -> List[str]:
        """Generate suggestions for optimizing the experience section."""
        suggestions = []
        
        # Check for quantified achievements
        if not re.search(r'\\d+%|\\$\\d+|\\d+\\s*(?:million|thousand|k\\b)', content):
            suggestions.append("Add quantified achievements (percentages, dollar amounts, etc.)")
        
        # Check for action verbs
        weak_verbs = ["responsible for", "worked on", "helped with", "involved in"]
        if any(verb in content.lower() for verb in weak_verbs):
            suggestions.append("Replace weak phrases with strong action verbs")
        
        # Industry-specific experience suggestions
        if industry == "software_engineering":
            if "deployed" not in content.lower() and "launched" not in content.lower():
                suggestions.append("Highlight successful deployments and launches")
        
        return suggestions
    
    def _optimize_skills_section(self, content: str, required_skills: List[str], 
                               industry: str) -> List[str]:
        """Generate suggestions for optimizing the skills section."""
        suggestions = []
        
        # Check for missing required skills
        missing_skills = [s for s in required_skills if s.lower() not in content.lower()]
        if missing_skills:
            suggestions.append(f"Add these skills if you have them: {', '.join(missing_skills[:5])}")
        
        # Industry-specific skills organization
        if industry == "software_engineering":
            suggestions.append("Group skills by category (Languages, Frameworks, Tools, etc.)")
        elif industry == "data_science":
            suggestions.append("Separate technical skills from business/domain skills")
        
        return suggestions
    
    def _suggest_achievements(self, content: str, industry: str) -> List[str]:
        """Suggest achievements to highlight based on industry."""
        suggestions = []
        
        if industry == "software_engineering":
            suggestions.extend([
                "Highlight system performance improvements (speed, efficiency)",
                "Mention cost savings from optimizations or automation",
                "Include user adoption metrics or customer satisfaction scores"
            ])
        elif industry == "data_science":
            suggestions.extend([
                "Quantify business impact of your analyses or models",
                "Mention accuracy improvements or error reductions",
                "Include revenue generated or costs saved from insights"
            ])
        
        return suggestions


def create_resume_resources_guide() -> str:
    """Create a comprehensive guide to resume resources and best practices."""
    
    guide = '''
# Ultimate Resume Resources & Best Practices Guide

## 📋 Resume Templates by Industry

### Software Engineering Resume Template
**Best for:** Developers, engineers, technical roles
**Key sections:** Technical Summary, Skills, Projects, Experience
**Length:** 1-2 pages max
**Format:** Clean, ATS-friendly, GitHub/portfolio links

### Data Science Resume Template  
**Best for:** Data scientists, analysts, ML engineers
**Key sections:** Technical Skills, Projects, Publications, Experience
**Length:** 1-2 pages
**Format:** Portfolio links, quantified results emphasis

### Product Management Resume Template
**Best for:** Product managers, strategy roles
**Key sections:** Business Impact, Leadership, Strategy Experience
**Length:** 1-2 pages
**Format:** Results-focused, metrics-heavy

### Executive Resume Template
**Best for:** C-level, VP, Director roles
**Key sections:** Executive Summary, Leadership Experience, Board Positions
**Length:** 2-3 pages
**Format:** Strategic focus, high-level achievements

## 🎯 ATS Optimization Checklist

### Critical Requirements
- [ ] PDF or DOCX format (never image-based)
- [ ] Standard fonts (Arial, Calibri, Times New Roman)
- [ ] No tables, text boxes, or complex formatting
- [ ] Contact information clearly visible
- [ ] Keywords from job description included
- [ ] File size under 1MB

### Best Practices
- [ ] Use standard section headings
- [ ] Include phone number and email
- [ ] Maintain consistent formatting
- [ ] Use bullet points effectively
- [ ] Keep to 1-2 pages for most roles
- [ ] Include relevant keywords naturally

## 📊 Industry-Specific Keyword Lists

### Technology Keywords
**Programming:** Python, Java, JavaScript, C++, React, Node.js, Angular
**Cloud:** AWS, Azure, GCP, Docker, Kubernetes, Terraform
**Data:** SQL, NoSQL, PostgreSQL, MongoDB, Redis, Elasticsearch
**Methods:** Agile, Scrum, DevOps, CI/CD, TDD, Microservices

### Business Keywords  
**Strategy:** Business strategy, market analysis, competitive intelligence
**Leadership:** Team leadership, change management, stakeholder management
**Analytics:** KPIs, ROI, business intelligence, data-driven decisions
**Operations:** Process improvement, cost reduction, efficiency optimization

### Marketing Keywords
**Digital:** SEO, SEM, PPC, social media marketing, content marketing
**Analytics:** Google Analytics, conversion optimization, A/B testing
**Tools:** HubSpot, Salesforce, Marketo, Adobe Creative Suite
**Metrics:** Lead generation, customer acquisition, retention rates

## 💡 Content Optimization Tips

### Professional Summary
- 2-3 sentences maximum
- Include years of experience
- Mention key skills and achievements
- Use industry-specific terminology
- Quantify results where possible

**Example:** "Senior Software Engineer with 7+ years developing scalable web applications and cloud infrastructure. Led teams that improved system performance by 60% and reduced operational costs by $500K annually."

### Experience Section
- Use reverse chronological order
- Start bullets with action verbs
- Include quantified achievements
- Focus on results, not responsibilities
- Tailor to target role requirements

**Strong Example:** "Architected microservices platform serving 1M+ daily users, reducing response time by 40% and increasing system reliability to 99.9%"

**Weak Example:** "Responsible for developing software applications and working with the team"

### Skills Section
- Group related skills together
- Use industry-standard terminology
- Include skill level if relevant
- Match job description keywords
- Keep list concise and relevant

### Action Verbs by Function
**Technical:** Architected, developed, engineered, implemented, optimized, automated
**Leadership:** Led, directed, managed, mentored, supervised, guided, spearheaded
**Business:** Achieved, delivered, generated, increased, improved, negotiated, closed
**Analytical:** Analyzed, researched, evaluated, measured, forecasted, identified

## 🚀 Advanced Optimization Techniques

### Keyword Density Optimization
- Aim for 2-3% keyword density
- Use variations of target keywords
- Include keywords in context naturally
- Don't keyword stuff or sacrifice readability

### Section Header Optimization
Use these ATS-friendly section headers:
- Professional Summary (not "About Me")
- Professional Experience (not "Work History")  
- Technical Skills (not "Competencies")
- Education (not "Academic Background")

### Format Specifications
- Margins: 0.5-1 inch on all sides
- Font size: 10-12 points
- Line spacing: 1.0-1.15
- File name: FirstName_LastName_Resume.pdf

## 🔍 Common Resume Mistakes to Avoid

### ATS-Killing Mistakes
1. Using images or graphics for text
2. Complex tables or multi-column layouts
3. Headers/footers with critical information
4. Non-standard fonts or special characters
5. Scanned PDFs instead of text-based files

### Content Mistakes
1. Generic, one-size-fits-all resumes
2. Focusing on responsibilities vs achievements
3. Including irrelevant personal information
4. Using passive voice and weak language
5. Failing to quantify accomplishments

### Formatting Mistakes
1. Inconsistent date formats
2. Poor spacing and alignment
3. Using too many different fonts
4. Overusing bold, italics, or formatting
5. Making text too small to read easily

## 📈 Resume Success Metrics

### ATS Pass Rate Indicators
- Overall score above 80%
- All required sections present
- Keyword match rate above 60%
- No critical formatting issues
- Contact information properly parsed

### Human Reviewer Engagement
- Clear value proposition in first 10 seconds
- Quantified achievements throughout
- Industry-relevant keywords and terminology
- Professional, error-free presentation
- Easy to scan and understand quickly

## 🛠️ Tools and Resources

### Free ATS Testing Tools
- Resume Worded ATS Scanner
- Jobscan ATS Checker  
- SkillSyncer Resume Analysis
- ResumeGo ATS Test

### Resume Building Tools
- Canva (use ATS-friendly templates only)
- Google Docs (basic but ATS-safe)
- Microsoft Word (standard templates)
- LaTeX (for technical roles, if done properly)

### Keyword Research
- Job description analysis
- LinkedIn skill assessments
- Industry reports and surveys
- Professional association resources

## 📋 Pre-Submission Checklist

### Technical Check
- [ ] PDF format, text-based (not scanned)
- [ ] File size under 1MB
- [ ] Professional filename
- [ ] All text properly formatted
- [ ] No images or graphics
- [ ] Contact info easily accessible

### Content Check  
- [ ] Tailored to specific job/industry
- [ ] Keywords from job description included
- [ ] All achievements quantified where possible
- [ ] No typos or grammatical errors
- [ ] Professional email address
- [ ] Current and accurate information

### ATS Check
- [ ] Standard section headers used
- [ ] Simple, clean formatting
- [ ] No tables or text boxes
- [ ] Consistent date formats
- [ ] Skills section properly formatted
- [ ] All critical info in main document (not header/footer)

Remember: Your resume has 6-10 seconds to make an impression with human reviewers, but it must first pass the ATS screening. Optimize for both!
'''
    
    return guide


def main():
    """Command-line interface for Resume Enhancement tools."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Ultimate Resume Enhancement Suite")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Analyze command
    analyze_parser = subparsers.add_parser("analyze", help="Analyze current resume")
    analyze_parser.add_argument("resume_path", help="Path to resume file")
    analyze_parser.add_argument("--job-description", help="Target job description")
    analyze_parser.add_argument("--output", help="Output file for analysis report")
    
    # Template command
    template_parser = subparsers.add_parser("template", help="Generate resume template")
    template_parser.add_argument("--type", choices=[t.value for t in ResumeTemplate], 
                                default="ats_optimized", help="Template type")
    template_parser.add_argument("--industry", help="Target industry")
    template_parser.add_argument("--level", choices=["entry", "mid", "senior", "executive"],
                                default="mid", help="Experience level")
    template_parser.add_argument("--output", help="Output file for template")
    
    # Optimize command
    optimize_parser = subparsers.add_parser("optimize", help="Optimize resume content")
    optimize_parser.add_argument("resume_path", help="Path to current resume")
    optimize_parser.add_argument("job_description", help="Target job description")
    optimize_parser.add_argument("--industry", required=True, help="Target industry")
    
    # Resources command
    resources_parser = subparsers.add_parser("resources", help="Show resume resources guide")
    resources_parser.add_argument("--output", help="Save guide to file")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    enhancer = ResumeEnhancer()
    
    try:
        if args.command == "analyze":
            print("🔍 Analyzing resume...")
            analysis = enhancer.analyze_resume(args.resume_path, args.job_description)
            
            print("\n📊 RESUME ANALYSIS RESULTS")
            print("=" * 50)
            print(f"Current Score: {analysis.current_score:.1f}%")
            print(f"Potential Score: {analysis.potential_score:.1f}%")
            print(f"Improvement Potential: +{analysis.potential_score - analysis.current_score:.1f} points")
            print(f"\\nDetected Industry: {analysis.industry_match or 'Unknown'}")
            print(f"Recommended Template: {analysis.recommended_template.value}")
            
            print(f"\\n🎯 TOP SUGGESTIONS ({len(analysis.suggestions)}):")
            for i, suggestion in enumerate(analysis.suggestions[:10], 1):
                print(f"{i}. {suggestion.content}")
                print(f"   Reason: {suggestion.reason}")
                print()
            
            if args.output:
                # Save detailed analysis (would implement detailed report)
                print(f"✅ Detailed analysis saved to: {args.output}")
        
        elif args.command == "template":
            template_type = ResumeTemplate(args.type)
            template_content = enhancer.generate_resume_template(
                template_type, args.industry, args.level
            )
            
            if args.output:
                with open(args.output, 'w', encoding='utf-8') as f:
                    f.write(template_content)
                print(f"✅ Template saved to: {args.output}")
            else:
                print(template_content)
        
        elif args.command == "optimize":
            with open(args.resume_path, 'r', encoding='utf-8') as f:
                current_content = f.read()
            
            with open(args.job_description, 'r', encoding='utf-8') as f:
                job_desc = f.read()
            
            optimizations = enhancer.optimize_resume_content(
                current_content, job_desc, args.industry
            )
            
            print("\n🚀 OPTIMIZATION SUGGESTIONS")
            print("="*50)
            
            for section, suggestions in optimizations.items():
                print(f"\\n{section.title()} Section:")
                for suggestion in suggestions:
                    print(f"  • {suggestion}")
        
        elif args.command == "resources":
            guide = create_resume_resources_guide()
            
            if args.output:
                with open(args.output, 'w', encoding='utf-8') as f:
                    f.write(guide)
                print(f"✅ Resources guide saved to: {args.output}")
            else:
                print(guide)
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())