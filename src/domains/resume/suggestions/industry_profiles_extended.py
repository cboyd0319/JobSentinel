"""
Extended Industry Profiles for Resume Optimization

Comprehensive industry-specific profiles based on market research and ATS best practices.
Follows SWEBOK v4.0 principles for requirements engineering and OWASP ASVS 5.0 for validation.

References:
- SWEBOK v4.0a | https://computer.org/swebok | High | Software engineering lifecycle guidance
- LinkedIn Talent Solutions | https://business.linkedin.com | Medium | Industry hiring trends
- Indeed Hiring Lab | https://www.hiringlab.org | Medium | Job market analytics
"""

from ..models import IndustryProfile, SectionType

# Extended industry profiles with comprehensive coverage
EXTENDED_INDUSTRY_PROFILES = {
    "healthcare": IndustryProfile(
        name="Healthcare",
        required_sections=[
            SectionType.CONTACT,
            SectionType.SUMMARY,
            SectionType.EXPERIENCE,
            SectionType.EDUCATION,
            SectionType.CERTIFICATIONS,
            SectionType.SKILLS,
        ],
        optional_sections=[
            SectionType.PUBLICATIONS,
            SectionType.AWARDS,
            SectionType.VOLUNTEER,
        ],
        key_skills=[
            "patient care",
            "clinical assessment",
            "emr/ehr systems",
            "hipaa compliance",
            "medical terminology",
            "care coordination",
            "emergency response",
            "regulatory compliance",
        ],
        experience_format="clinical_outcomes",
        recommended_length=(1, 2),
        emphasis=["patient outcomes", "compliance", "certifications"],
        common_keywords=[
            "healthcare",
            "patient",
            "clinical",
            "medical",
            "ehr",
            "emr",
            "epic",
            "cerner",
            "hipaa",
            "compliance",
            "nursing",
            "treatment",
            "diagnosis",
            "care",
        ],
        ats_considerations=[
            "List all active licenses and certifications with expiration dates",
            "Include specific EMR/EHR systems experience",
            "Quantify patient load and outcomes",
            "Emphasize compliance and safety records",
        ],
    ),
    "finance": IndustryProfile(
        name="Finance",
        required_sections=[
            SectionType.CONTACT,
            SectionType.SUMMARY,
            SectionType.EXPERIENCE,
            SectionType.EDUCATION,
            SectionType.CERTIFICATIONS,
            SectionType.SKILLS,
        ],
        optional_sections=[
            SectionType.PUBLICATIONS,
            SectionType.AWARDS,
        ],
        key_skills=[
            "financial analysis",
            "risk management",
            "financial modeling",
            "compliance",
            "portfolio management",
            "excel",
            "bloomberg terminal",
            "regulatory reporting",
        ],
        experience_format="quantified_results",
        recommended_length=(1, 2),
        emphasis=["quantitative results", "regulatory knowledge", "certifications"],
        common_keywords=[
            "finance",
            "accounting",
            "investment",
            "portfolio",
            "risk",
            "compliance",
            "audit",
            "gaap",
            "sox",
            "cpa",
            "cfa",
            "financial analysis",
            "modeling",
            "valuation",
        ],
        ats_considerations=[
            "Include professional certifications (CPA, CFA, etc.)",
            "Quantify financial impact (revenue, cost savings, ROI)",
            "List specific financial systems and tools",
            "Emphasize regulatory compliance experience",
        ],
    ),
    "legal": IndustryProfile(
        name="Legal",
        required_sections=[
            SectionType.CONTACT,
            SectionType.SUMMARY,
            SectionType.EXPERIENCE,
            SectionType.EDUCATION,
            SectionType.CERTIFICATIONS,
        ],
        optional_sections=[
            SectionType.PUBLICATIONS,
            SectionType.AWARDS,
            SectionType.SKILLS,
        ],
        key_skills=[
            "legal research",
            "contract negotiation",
            "litigation",
            "regulatory compliance",
            "legal writing",
            "case management",
            "westlaw",
            "lexisnexis",
        ],
        experience_format="case_based",
        recommended_length=(2, 3),
        emphasis=["bar admissions", "case outcomes", "practice areas"],
        common_keywords=[
            "legal",
            "attorney",
            "lawyer",
            "litigation",
            "contract",
            "compliance",
            "regulatory",
            "bar",
            "juris doctor",
            "negotiation",
            "intellectual property",
            "corporate law",
            "trial",
            "discovery",
        ],
        ats_considerations=[
            "List bar admissions prominently",
            "Include practice area specializations",
            "Quantify case outcomes and settlements",
            "Emphasize significant publications or cases",
        ],
    ),
    "education": IndustryProfile(
        name="Education",
        required_sections=[
            SectionType.CONTACT,
            SectionType.SUMMARY,
            SectionType.EXPERIENCE,
            SectionType.EDUCATION,
            SectionType.CERTIFICATIONS,
        ],
        optional_sections=[
            SectionType.SKILLS,
            SectionType.AWARDS,
            SectionType.PUBLICATIONS,
            SectionType.VOLUNTEER,
        ],
        key_skills=[
            "curriculum development",
            "classroom management",
            "student assessment",
            "educational technology",
            "differentiated instruction",
            "learning management systems",
            "special education",
            "parent communication",
        ],
        experience_format="impact_focused",
        recommended_length=(1, 2),
        emphasis=["teaching certifications", "student outcomes", "curriculum"],
        common_keywords=[
            "education",
            "teaching",
            "instruction",
            "curriculum",
            "assessment",
            "classroom",
            "student",
            "learning",
            "pedagogy",
            "differentiation",
            "special education",
            "iep",
            "standards",
            "technology integration",
        ],
        ats_considerations=[
            "List all teaching certifications and endorsements",
            "Include grade levels and subject areas",
            "Quantify student achievement improvements",
            "Emphasize technology integration and modern pedagogy",
        ],
    ),
    "sales": IndustryProfile(
        name="Sales",
        required_sections=[
            SectionType.CONTACT,
            SectionType.SUMMARY,
            SectionType.EXPERIENCE,
            SectionType.SKILLS,
        ],
        optional_sections=[
            SectionType.EDUCATION,
            SectionType.CERTIFICATIONS,
            SectionType.AWARDS,
        ],
        key_skills=[
            "consultative selling",
            "account management",
            "crm software",
            "lead generation",
            "negotiation",
            "pipeline management",
            "sales presentations",
            "relationship building",
        ],
        experience_format="quota_achievement",
        recommended_length=(1, 2),
        emphasis=["quota attainment", "revenue growth", "client relationships"],
        common_keywords=[
            "sales",
            "revenue",
            "quota",
            "account",
            "client",
            "crm",
            "salesforce",
            "pipeline",
            "prospecting",
            "closing",
            "negotiation",
            "b2b",
            "b2c",
            "saas",
        ],
        ats_considerations=[
            "Quantify quota achievement percentages",
            "Include revenue figures and deal sizes",
            "List specific CRM and sales tools",
            "Emphasize award recognition (President's Club, etc.)",
        ],
    ),
    "product_management": IndustryProfile(
        name="Product Management",
        required_sections=[
            SectionType.CONTACT,
            SectionType.SUMMARY,
            SectionType.EXPERIENCE,
            SectionType.EDUCATION,
            SectionType.SKILLS,
        ],
        optional_sections=[
            SectionType.CERTIFICATIONS,
            SectionType.PROJECTS,
            SectionType.AWARDS,
        ],
        key_skills=[
            "product strategy",
            "roadmap planning",
            "user research",
            "data analysis",
            "agile methodologies",
            "stakeholder management",
            "a/b testing",
            "product analytics",
        ],
        experience_format="product_outcomes",
        recommended_length=(1, 2),
        emphasis=["product launches", "user impact", "business metrics"],
        common_keywords=[
            "product management",
            "product strategy",
            "roadmap",
            "user experience",
            "metrics",
            "kpi",
            "agile",
            "scrum",
            "jira",
            "analytics",
            "product launch",
            "stakeholder",
            "prioritization",
            "product-market fit",
        ],
        ats_considerations=[
            "Quantify product impact (users, revenue, engagement)",
            "Include specific methodologies (Agile, Lean, etc.)",
            "List analytics and project management tools",
            "Emphasize cross-functional leadership",
        ],
    ),
    "cybersecurity": IndustryProfile(
        name="Cybersecurity",
        required_sections=[
            SectionType.CONTACT,
            SectionType.SUMMARY,
            SectionType.EXPERIENCE,
            SectionType.EDUCATION,
            SectionType.CERTIFICATIONS,
            SectionType.SKILLS,
        ],
        optional_sections=[
            SectionType.PROJECTS,
            SectionType.PUBLICATIONS,
            SectionType.AWARDS,
        ],
        key_skills=[
            "threat analysis",
            "penetration testing",
            "security frameworks",
            "incident response",
            "vulnerability assessment",
            "siem",
            "network security",
            "cloud security",
        ],
        experience_format="security_outcomes",
        recommended_length=(1, 2),
        emphasis=["certifications", "security incidents", "compliance frameworks"],
        common_keywords=[
            "cybersecurity",
            "security",
            "cissp",
            "ceh",
            "penetration testing",
            "vulnerability",
            "threat",
            "incident response",
            "siem",
            "firewall",
            "encryption",
            "compliance",
            "nist",
            "iso 27001",
        ],
        ats_considerations=[
            "List all security certifications prominently",
            "Include specific security tools and platforms",
            "Quantify security improvements (reduced incidents, etc.)",
            "Emphasize compliance framework experience",
        ],
    ),
    "devops": IndustryProfile(
        name="DevOps Engineering",
        required_sections=[
            SectionType.CONTACT,
            SectionType.SUMMARY,
            SectionType.EXPERIENCE,
            SectionType.EDUCATION,
            SectionType.SKILLS,
            SectionType.PROJECTS,
        ],
        optional_sections=[
            SectionType.CERTIFICATIONS,
            SectionType.PUBLICATIONS,
        ],
        key_skills=[
            "ci/cd pipelines",
            "infrastructure as code",
            "containerization",
            "cloud platforms",
            "monitoring",
            "automation",
            "kubernetes",
            "terraform",
        ],
        experience_format="technical_impact",
        recommended_length=(1, 2),
        emphasis=["automation", "reliability metrics", "cloud infrastructure"],
        common_keywords=[
            "devops",
            "ci/cd",
            "kubernetes",
            "docker",
            "terraform",
            "ansible",
            "aws",
            "azure",
            "gcp",
            "jenkins",
            "gitlab",
            "monitoring",
            "prometheus",
            "grafana",
        ],
        ats_considerations=[
            "Include specific tools and platforms",
            "Quantify reliability improvements (uptime, deployment frequency)",
            "List cloud certifications",
            "Emphasize automation impact",
        ],
    ),
    "design": IndustryProfile(
        name="Design (UX/UI)",
        required_sections=[
            SectionType.CONTACT,
            SectionType.SUMMARY,
            SectionType.EXPERIENCE,
            SectionType.SKILLS,
            SectionType.PROJECTS,
        ],
        optional_sections=[
            SectionType.EDUCATION,
            SectionType.CERTIFICATIONS,
            SectionType.AWARDS,
        ],
        key_skills=[
            "user research",
            "wireframing",
            "prototyping",
            "figma",
            "sketch",
            "adobe creative suite",
            "usability testing",
            "design systems",
        ],
        experience_format="portfolio_focused",
        recommended_length=(1, 2),
        emphasis=["portfolio link", "design process", "user impact"],
        common_keywords=[
            "ux",
            "ui",
            "design",
            "user experience",
            "user interface",
            "figma",
            "sketch",
            "prototyping",
            "wireframe",
            "usability",
            "user research",
            "design system",
            "visual design",
            "interaction design",
        ],
        ats_considerations=[
            "Include portfolio link prominently",
            "Quantify user impact metrics",
            "List specific design tools",
            "Emphasize design thinking methodology",
        ],
    ),
    "executive": IndustryProfile(
        name="Executive Leadership",
        required_sections=[
            SectionType.CONTACT,
            SectionType.SUMMARY,
            SectionType.EXPERIENCE,
            SectionType.EDUCATION,
        ],
        optional_sections=[
            SectionType.CERTIFICATIONS,
            SectionType.AWARDS,
            SectionType.PUBLICATIONS,
            SectionType.SKILLS,
        ],
        key_skills=[
            "strategic planning",
            "p&l management",
            "organizational leadership",
            "change management",
            "board relations",
            "mergers & acquisitions",
            "stakeholder management",
            "talent development",
        ],
        experience_format="strategic_impact",
        recommended_length=(2, 3),
        emphasis=["strategic achievements", "organizational impact", "p&l responsibility"],
        common_keywords=[
            "ceo",
            "cto",
            "cfo",
            "executive",
            "leadership",
            "strategic",
            "p&l",
            "revenue",
            "growth",
            "transformation",
            "board",
            "stakeholder",
            "vision",
            "organizational",
        ],
        ats_considerations=[
            "Emphasize P&L and scope of responsibility",
            "Quantify organizational impact (revenue, team size, etc.)",
            "Include board memberships and advisory roles",
            "Highlight strategic achievements and transformations",
        ],
    ),
}


def get_all_industry_profiles() -> dict[str, IndustryProfile]:
    """
    Get comprehensive dictionary of all industry profiles.
    
    Returns:
        Dictionary mapping industry keys to IndustryProfile objects
        
    Note:
        Profiles are research-based and regularly updated to reflect
        market trends and ATS requirements per SWEBOK v4.0 guidelines.
    """
    return EXTENDED_INDUSTRY_PROFILES.copy()


def get_industry_profile(industry_key: str) -> IndustryProfile | None:
    """
    Get a specific industry profile by key.
    
    Args:
        industry_key: Industry identifier (e.g., 'healthcare', 'finance')
        
    Returns:
        IndustryProfile if found, None otherwise
        
    Security:
        Input validation per OWASP ASVS 5.0 V5.1.1 - sanitized key lookup
    """
    if not isinstance(industry_key, str) or not industry_key:
        return None
    
    # Sanitize input - alphanumeric and underscore only
    sanitized_key = "".join(c for c in industry_key.lower() if c.isalnum() or c == "_")
    
    return EXTENDED_INDUSTRY_PROFILES.get(sanitized_key)


def list_available_industries() -> list[str]:
    """
    Get list of all available industry profile keys.
    
    Returns:
        Sorted list of industry identifiers
    """
    return sorted(EXTENDED_INDUSTRY_PROFILES.keys())
