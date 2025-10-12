# Detection Systems Documentation

## Overview

JobSentinel includes world-class detection systems that analyze job postings, resumes, and career paths to provide intelligent recommendations and identify potential issues.

## Job Quality Detection

The `JobQualityDetector` analyzes job postings for quality, legitimacy, and alignment with candidate goals.

### Features

- **Scam Detection**: Identifies potential scams using FBI IC3 indicators
- **MLM/Pyramid Scheme Detection**: Detects multi-level marketing patterns
- **Salary Validation**: Verifies salary ranges against market expectations
- **Requirements Analysis**: Checks for reasonable vs. excessive requirements
- **Company Information Validation**: Assesses quality of company details

### Usage

```python
from domains.detection import JobQualityDetector

detector = JobQualityDetector()

result = detector.analyze(
    job_title="Senior Software Engineer",
    job_description="Full job description text...",
    company_name="TechCorp Inc",
    salary_range=(120000, 180000),
    location="San Francisco, CA"
)

print(f"Quality Score: {result.overall_score}/100")
print(f"Quality Level: {result.quality_level.value}")

# Check for red flags
for flag in result.red_flags:
    print(f"⚠️ {flag.description} (severity: {flag.severity}/10)")

# Get recommendations
for rec in result.recommendations:
    print(f"• {rec}")
```

### Scoring Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Legitimacy | 30% | Scam indicators, company info quality |
| Description Quality | 25% | Completeness, professionalism, structure |
| Salary Alignment | 20% | Market rate validation, range reasonableness |
| Requirements | 15% | Experience requirements, skill list length |
| Company Information | 10% | Company name presence, description quality |

### Red Flag Types

- **SCAM_INDICATOR** (severity 9): Guaranteed income, upfront fees, wire transfers
- **MLM_PATTERN** (severity 7): Unlimited earning, recruit others, downline
- **UNREALISTIC_SALARY** (severity 8): Suspiciously high or invalid ranges
- **EXCESSIVE_REQUIREMENTS** (severity 4-5): Unreasonable experience or skills
- **NO_COMPANY_INFO** (severity 6): Missing company identification

## Resume Quality Detection

The `ResumeQualityDetector` uses ML-based analysis to score resume content quality across multiple dimensions.

### Features

- **Content Depth Analysis**: Checks for specific, detailed accomplishments
- **Quantification Assessment**: Verifies use of metrics (targets 70%+ of achievements)
- **Action Verb Analysis**: Detects strong vs. weak verb usage
- **Keyword Density**: Optimizes for ATS compatibility
- **Formatting Checks**: Ensures consistency and ATS-friendliness
- **Length Optimization**: Validates word count (optimal: 400-800 words)

### Usage

```python
from domains.detection import ResumeQualityDetector

detector = ResumeQualityDetector()

result = detector.analyze(
    resume_text="Full resume text...",
    target_industry="software_engineering",
    target_role="Senior Software Engineer"
)

print(f"Overall Score: {result.overall_score}/100")
print(f"Improvement Potential: +{result.improvement_potential} points")

# Review dimension scores
for dimension, score in result.dimension_scores.items():
    print(f"{dimension}: {score}/100")

# Address issues
for issue in result.issues:
    print(f"Issue: {issue.description}")
    print(f"Fix: {issue.fix_suggestion}")
```

### Scoring Dimensions

| Dimension | Weight | Optimal Range | Description |
|-----------|--------|---------------|-------------|
| Content Depth | 25% | 80-100 | Specificity and detail level |
| Quantification | 20% | 85-95 | Metrics usage (70%+ bullets) |
| Action Verbs | 20% | 85-100 | Strong verb usage |
| Keyword Density | 15% | 75-85 | ATS optimization |
| Formatting | 10% | 80-100 | Consistency, ATS-friendliness |
| Length | 10% | 95 | Word count (400-800 optimal) |

### Strong Action Verbs

The detector recognizes 38+ strong action verbs:
- **Achievement**: achieved, delivered, exceeded, accomplished
- **Leadership**: led, directed, managed, spearheaded
- **Creation**: developed, created, designed, built, engineered
- **Improvement**: improved, enhanced, optimized, streamlined

## Skills Gap Analysis

The `SkillsGapAnalyzer` identifies skill gaps between current capabilities and target roles, providing career development recommendations.

### Features

- **Industry-Specific Skill Mapping**: Pre-defined skill sets for major industries
- **Priority-Based Gap Identification**: Critical, high, medium priority levels
- **Learning Resource Recommendations**: Curated learning paths
- **Career Path Suggestions**: With salary projections and timelines
- **Market Demand Tracking**: Skill demand scoring (0-100)

### Usage

```python
from domains.detection import SkillsGapAnalyzer

analyzer = SkillsGapAnalyzer()

result = analyzer.analyze(
    current_skills=["Python", "Django", "SQL", "Git"],
    target_role="Senior Software Engineer",
    target_industry="software_engineering",
    years_experience=3.0
)

print(f"Overall Match: {result.overall_match_score}%")

# Review strengths
for skill in result.strengths:
    print(f"✓ {skill.name} ({skill.level.value})")

# Address gaps
for gap in result.gaps:
    print(f"• {gap.skill_name} - Priority: {gap.priority.value}")
    print(f"  Learning time: {gap.estimated_learning_time}")
    print(f"  Resources: {', '.join(gap.learning_resources)}")

# Explore career paths
for path in result.career_paths:
    print(f"→ {path.path_name}: {path.timeline}")
    print(f"  Salary increase: {path.potential_salary_increase}")
```

### Supported Industries

| Industry | Critical Skills | Total Skills Mapped |
|----------|----------------|---------------------|
| Software Engineering | Python, JavaScript, AWS, Docker, Kubernetes | 20+ |
| Data Science | Python, R, TensorFlow, Statistics | 15+ |
| DevOps | Kubernetes, Terraform, CI/CD, Monitoring | 18+ |

### Skill Priority Levels

- **CRITICAL**: Required for role success (learn in 1-3 months)
- **HIGH**: Strongly recommended (learn in 2-4 months)
- **MEDIUM**: Nice to have (learn in 3-6 months)
- **LOW**: Optional enhancement

### Career Path Examples

**Software Engineering Paths:**
- Senior Software Engineer (12-18 months, +20-30% salary)
- Technical Lead (18-24 months, +30-40% salary)
- Cloud Architect (12-24 months, +25-35% salary)

**Data Science Paths:**
- Senior Data Scientist (18-24 months, +25-35% salary)
- ML Engineer (12-18 months, +20-30% salary)

## Best Practices

### Job Quality Detection

1. **Always analyze before applying**: Run detection on every job posting
2. **Heed critical red flags**: Don't apply to jobs with severity 8+ flags
3. **Research suspicious postings**: Verify companies on Glassdoor, BBB
4. **Trust the algorithm**: 70%+ quality score indicates legitimate opportunity

### Resume Quality Detection

1. **Run before every application**: Each job may require adjustments
2. **Target 80+ score**: Aim for "good" or "excellent" quality level
3. **Fix high-severity issues first**: Address severity 6+ issues immediately
4. **Quantify achievements**: Add metrics to 70%+ of bullet points
5. **Use strong action verbs**: Replace weak phrases with power words

### Skills Gap Analysis

1. **Regular assessment**: Re-analyze every 6 months
2. **Focus on critical gaps**: Prioritize critical and high-priority skills
3. **Follow learning resources**: Use recommended platforms and courses
4. **Track progress**: Update current_skills as you learn
5. **Explore career paths**: Plan 12-24 month development trajectory

## API Reference

### JobQualityDetector

```python
class JobQualityDetector:
    def analyze(
        self,
        job_title: str,
        job_description: str,
        company_name: str = "",
        salary_range: tuple[int, int] | None = None,
        location: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> JobQualityScore
```

### ResumeQualityDetector

```python
class ResumeQualityDetector:
    def analyze(
        self,
        resume_text: str,
        target_industry: str | None = None,
        target_role: str | None = None,
    ) -> ResumeQualityScore
```

### SkillsGapAnalyzer

```python
class SkillsGapAnalyzer:
    def analyze(
        self,
        current_skills: list[str],
        target_role: str,
        target_industry: str = "software_engineering",
        years_experience: float = 0.0,
    ) -> SkillsGap
```

## Performance

- **Job Quality Detection**: <100ms per analysis
- **Resume Quality Detection**: <200ms per analysis
- **Skills Gap Analysis**: <150ms per analysis

All detectors are optimized for real-time use in production environments.

## Security

All detection systems follow OWASP ASVS 5.0 guidelines:
- Input validation per V5.1.1
- Text sanitization (max 50KB per input)
- No external API calls (privacy-first)
- No data persistence (memory only)

## References

1. **FBI IC3 Reports** | https://www.ic3.gov | High | Scam indicator patterns
2. **Bureau of Labor Statistics** | https://www.bls.gov | High | Salary and market data
3. **LinkedIn Skills Taxonomy** | https://business.linkedin.com | Medium | Industry skill mapping
4. **SWEBOK v4.0a** | https://computer.org/swebok | High | Software engineering practices
5. **OWASP ASVS 5.0** | https://owasp.org/ASVS | High | Security verification standards
