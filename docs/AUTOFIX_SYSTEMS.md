# Auto-Fix Systems Documentation

## Overview

JobSentinel's auto-fix systems automatically correct and enhance resume content for maximum ATS compatibility and impact. These systems apply intelligent transformations while maintaining natural language flow.

## Resume Auto-Fixer

The `ResumeAutoFixer` is a comprehensive system that automatically applies multiple types of fixes to improve resume quality.

### Features

- **Spelling Correction**: Fixes 10+ common misspellings
- **ATS-Friendly Formatting**: Removes tabs, normalizes spacing
- **Action Verb Enhancement**: Upgrades weak phrases to strong verbs
- **Quantification Suggestions**: Adds metric placeholders
- **Keyword Injection**: Strategically adds missing keywords
- **Section Reordering**: Recommends optimal section order

### Usage

```python
from domains.autofix import ResumeAutoFixer

fixer = ResumeAutoFixer()

result = fixer.auto_fix(
    resume_text="Your resume content...",
    target_keywords=["Python", "AWS", "Kubernetes"],
    aggressive=True  # Apply more substantial changes
)

print(f"Improvement: +{result.improvement_score}%")
print(f"Fixes Applied: {len(result.fixes_applied)}")

# Review each fix
for fix in result.fixes_applied:
    print(f"{fix.fix_type.value}: {fix.explanation}")
    print(f"  Confidence: {fix.confidence*100}%")

# Use the fixed text
with open("resume_fixed.txt", "w") as f:
    f.write(result.fixed_text)
```

### Fix Types

| Fix Type | Confidence | Impact | Description |
|----------|-----------|--------|-------------|
| SPELLING | 95% | 5 pts | Corrects common misspellings |
| GRAMMAR | 90% | 5 pts | Fixes grammar issues |
| FORMATTING | 100% | 3 pts | ATS-friendly formatting |
| ACTION_VERB | 85% | 4 pts | Upgrades weak verbs |
| QUANTIFICATION | 70% | 8 pts | Adds metric suggestions |
| KEYWORD_INJECTION | 75% | 7 pts | Adds missing keywords |
| SECTION_REORDER | 80% | 6 pts | Reorders sections |

### Common Spelling Fixes

- achived → achieved
- recieved → received
- developement → development
- managment → management
- sucessful → successful
- experiance → experience

### Action Verb Upgrades

| Weak Phrase | Strong Replacement |
|-------------|-------------------|
| worked on | developed |
| helped | facilitated |
| responsible for | led |
| did | executed |
| made | created |
| got | achieved |
| used | leveraged |

### Modes

**Normal Mode** (`aggressive=False`):
- Spelling and grammar fixes
- Basic formatting cleanup
- Conservative action verb upgrades

**Aggressive Mode** (`aggressive=True`):
- All normal mode fixes
- Quantification suggestions
- Keyword injection
- Section reordering recommendations

## Bullet Point Enhancer

The `BulletEnhancer` transforms weak bullet points into powerful achievement statements using STAR/CAR format principles.

### Features

- **Action Verb Upgrades**: Replaces weak verbs with power words
- **Quantification Detection**: Identifies missing metrics
- **Context Addition**: Adds technical or methodological context
- **Impact Emphasis**: Highlights results and outcomes

### Usage

```python
from domains.autofix import BulletEnhancer

enhancer = BulletEnhancer()

# Single bullet
result = enhancer.enhance("Worked on backend development")

print(f"Before: {result.original}")
print(f"After:  {result.enhanced}")
print(f"Improvement: +{result.improvement_score}%")

# Batch enhancement
bullets = [
    "Worked on backend API development",
    "Helped improve system performance",
    "Responsible for database management"
]

enhanced = enhancer.enhance_batch(bullets)

for result in enhanced:
    print(f"✓ {result.enhancement}\n")
```

### Enhancement Types

| Type | Score Impact | Example |
|------|-------------|---------|
| ACTION_VERB_UPGRADE | +15% | "Worked" → "Developed" |
| QUANTIFICATION_ADDED | +30% | Added "[ADD: by X%]" |
| CONTEXT_ADDED | +20% | Added "using [TECHNOLOGY]" |
| IMPACT_EMPHASIZED | +25% | Added outcome statement |

### Power Word Categories

**Leadership Verbs** (9 words):
- led, directed, managed, coordinated, spearheaded
- championed, orchestrated, supervised, mentored

**Creation Verbs** (9 words):
- developed, created, designed, built, engineered
- architected, established, launched, implemented

**Improvement Verbs** (9 words):
- improved, enhanced, optimized, streamlined, accelerated
- increased, boosted, elevated, strengthened

**Achievement Verbs** (8 words):
- achieved, delivered, exceeded, accomplished
- attained, secured, generated, produced

### STAR/CAR Format

The enhancer follows these principles:

**STAR Format:**
- **S**ituation: Context provided
- **T**ask: Challenge described
- **A**ction: What you did
- **R**esult: Quantifiable outcome

**CAR Format:**
- **C**hallenge: Problem faced
- **A**ction: Solution implemented
- **R**esult: Impact achieved

### Best Practices

1. **Start with action verbs**: Every bullet should begin with a power word
2. **Add quantification**: 70%+ of bullets should have metrics
3. **Include context**: Mention technologies, methodologies, scale
4. **Emphasize results**: Always show the positive impact
5. **Be specific**: Avoid vague terms like "various" or "multiple"

## Keyword Optimizer

The `KeywordOptimizer` analyzes and optimizes resume keywords for ATS compatibility and job description matching.

### Features

- **Keyword Extraction**: Automatically extracts keywords from job descriptions
- **Match Analysis**: Identifies matched, missing, and over-optimized keywords
- **Density Calculation**: Ensures optimal keyword density (2-3%)
- **Importance Scoring**: Weights keywords by context and frequency
- **Strategic Recommendations**: Provides actionable optimization advice

### Usage

```python
from domains.autofix import KeywordOptimizer

optimizer = KeywordOptimizer()

result = optimizer.optimize(
    resume_text="Your resume...",
    job_description="Target job description...",
    target_keywords=["Python", "AWS", "Kubernetes"]  # Optional
)

print(f"Optimization Score: {result.optimization_score}%")

# Review matched keywords
for match in result.matched_keywords:
    print(f"✓ {match.keyword}: count={match.count}, importance={match.importance}")

# Add missing keywords
for keyword in result.missing_keywords[:5]:
    print(f"• Add: {keyword}")

# Follow recommendations
for rec in result.recommendations:
    print(f"→ {rec}")
```

### Keyword Density

| Density | Status | Action |
|---------|--------|--------|
| < 1.5% | Too low | Add more keywords |
| 1.5-3% | Optimal | Maintain current level |
| > 3% | Too high | Reduce repetition |

### Importance Scoring

Keywords are scored 0-1 based on:
- **Context**: Requirements section = 1.0, general = 0.7
- **Frequency**: More mentions = higher score (max 1.0)
- **Position**: Earlier mentions weighted higher

### Optimization Recommendations

The optimizer generates up to 5 recommendations:

1. **Add missing keywords**: Top 5 missing critical keywords
2. **Reduce over-optimization**: Keywords appearing too frequently
3. **Add Skills section**: If missing and keywords are absent
4. **Use variations**: For better natural language flow
5. **Focus on requirements**: Prioritize keywords from requirements section

### Best Practices

1. **Target 2-3% density**: Sweet spot for ATS systems
2. **Prioritize job description keywords**: Extract from actual postings
3. **Use natural placement**: Don't stuff keywords awkwardly
4. **Add Skills section**: Dedicated section for keyword concentration
5. **Include variations**: Use synonyms and related terms

## Integration Example

Combining all auto-fix systems for maximum impact:

```python
from domains.autofix import ResumeAutoFixer, BulletEnhancer, KeywordOptimizer

# Step 1: Auto-fix basic issues
fixer = ResumeAutoFixer()
fixed_result = fixer.auto_fix(
    resume_text=original_resume,
    aggressive=True
)

# Step 2: Enhance bullet points
enhancer = BulletEnhancer()
bullets = extract_bullets(fixed_result.fixed_text)
enhanced_bullets = enhancer.enhance_batch(bullets)

# Step 3: Optimize keywords
optimizer = KeywordOptimizer()
optimized_result = optimizer.optimize(
    resume_text=fixed_result.fixed_text,
    job_description=target_job_description
)

# Combine results
final_resume = apply_enhancements(
    base=fixed_result.fixed_text,
    bullets=enhanced_bullets,
    keywords=optimized_result.missing_keywords[:5]
)

print(f"Total Improvement: +{fixed_result.improvement_score}%")
```

## Performance

- **ResumeAutoFixer**: <150ms for typical resume (500 words)
- **BulletEnhancer**: <10ms per bullet point
- **KeywordOptimizer**: <200ms for resume + job description

All systems are optimized for real-time use.

## Confidence Scoring

Every fix includes a confidence score (0-1):

- **1.0**: Certain fix (formatting, obvious spelling)
- **0.9-0.95**: High confidence (common corrections)
- **0.8-0.89**: Good confidence (action verb upgrades)
- **0.7-0.79**: Moderate confidence (quantification suggestions)
- **< 0.7**: Lower confidence (aggressive enhancements)

Use confidence scores to decide which fixes to apply automatically vs. manually review.

## Safety & Validation

All auto-fix systems follow OWASP ASVS 5.0 guidelines:

- **Input Validation**: Text sanitized per V5.1.1
- **Length Limits**: Max 50KB per input
- **No External Calls**: All processing local
- **No Data Storage**: Fixes applied in memory
- **Reversible**: Original text always preserved

## Limitations

1. **Context Understanding**: Systems use pattern matching, not deep NLP
2. **Industry Specificity**: Best for tech/business roles
3. **Manual Review**: High-impact changes should be reviewed
4. **Placeholder Values**: Quantification adds placeholders requiring manual completion

## Future Enhancements

Planned improvements:
- Deep NLP integration for better context understanding
- Industry-specific fix patterns
- A/B testing of fix effectiveness
- ML-based enhancement learning
- Integration with ATS scoring APIs

## References

1. **SWEBOK v4.0a** | https://computer.org/swebok | High | Quality improvement processes
2. **OWASP ASVS 5.0** | https://owasp.org/ASVS | High | Input validation standards
3. **LinkedIn Career Advice** | https://business.linkedin.com | Medium | Resume best practices
4. **Apigee Web API Design** | https://apigee.com | Medium | Best practices
