# AI Resume-Job Matcher

## Intelligent Resume Analysis & Job Compatibility Scoring

> **Status:** ENABLED - Module fully functional
> **Completion:** 100%
> **Last Updated:** 2026-01-25
> **Version:** 2.6.3

---

## 🎯 Overview

JobSentinel's AI Resume-Job Matcher automatically analyzes your resume, extracts technical and
soft skills, and calculates compatibility scores against job postings. Stop manually comparing
job requirements—let the AI do it for you!

### Key Features

- **📄 PDF Resume Parsing** - Extract text from PDF resumes automatically
- **🔍 Skill Extraction** - Identify 200+ technical skills across 6 categories
- **🎯 Smart Matching** - Calculate match scores between resume and jobs
- **📊 Gap Analysis** - See exactly which skills you're missing
- **💡 Recommendations** - Get actionable advice on whether to apply

### Screenshot

![Resume Matcher Interface](../images/resume-matcher.png)

---

## 🏗️ Architecture

### System Flow

```text
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Resume    │─────▶│ PDF Parser   │─────▶│   Skill     │
│  (PDF)      │      │   Service    │      │ Extractor   │
└─────────────┘      └──────────────┘      └─────────────┘
                              │                     │
                              ▼                     ▼
                     ┌──────────────┐      ┌─────────────┐
                     │ Text Content │      │ Skills List │
                     └──────────────┘      └─────────────┘
                              │                     │
                              └─────────┬───────────┘
                                        ▼
                              ┌──────────────────┐
                              │  Keyword Match   │
                              │    vs Job Desc   │
                              └──────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │   Gap Analysis   │
                              │  + Match Score   │
                              └──────────────────┘
```

### Database Schema

```sql
-- Resume metadata
resumes
├── id (PRIMARY KEY)
├── name
├── file_path
├── parsed_text
├── is_active (boolean)
├── created_at
└── updated_at

-- Extracted skills from resume
user_skills
├── id (PRIMARY KEY)
├── resume_id (FOREIGN KEY)
├── skill_name
├── skill_category (programming_language, framework, tool, etc.)
├── confidence_score (0.0-1.0)
├── years_experience
├── proficiency_level (beginner, intermediate, expert)
└── source (resume, user_input, inferred)

-- Job skill requirements
job_skills
├── id (PRIMARY KEY)
├── job_hash (FOREIGN KEY)
├── skill_name
├── is_required (boolean)
└── skill_category

-- Match results
resume_job_matches
├── id (PRIMARY KEY)
├── resume_id (FOREIGN KEY)
├── job_hash (FOREIGN KEY)
├── overall_match_score (0.0-1.0)
├── skills_match_score
├── missing_skills (JSON array)
├── matching_skills (JSON array)
└── gap_analysis (text)
```

---

## 🚀 Usage Guide

### 1. Upload Resume

```rust
use jobsentinel::core::resume::ResumeMatcher;

let matcher = ResumeMatcher::new(db_pool);

// Upload PDF resume
let resume_id = matcher.upload_resume(
    "John Doe - Software Engineer.pdf",
    "/path/to/resume.pdf"
).await?;

// Automatically extracts text and skills
```

**What happens:**

1. PDF is parsed to extract text content
2. Skills are automatically detected (200+ known skills)
3. Resume is stored in database with `is_active = true`

### 2. View Extracted Skills

```rust
// Get all skills from resume
let skills = matcher.get_user_skills(resume_id).await?;

for skill in skills {
    println!(
        "{} ({}) - Confidence: {:.0}%",
        skill.skill_name,
        skill.skill_category.unwrap_or_default(),
        skill.confidence_score * 100.0
    );
}
```

**Example output:**

```text
Python (programming_language) - Confidence: 85%
React (framework) - Confidence: 80%
Docker (tool) - Confidence: 75%
PostgreSQL (database) - Confidence: 70%
AWS (cloud_platform) - Confidence: 65%
```

### 3. Match Resume Against Job

```rust
// Match resume to a specific job
let match_result = matcher.match_resume_to_job(resume_id, "job_hash_123").await?;

println!("Overall Match: {:.0}%", match_result.overall_match_score * 100.0);
println!("Matching Skills: {:?}", match_result.matching_skills);
println!("Missing Skills: {:?}", match_result.missing_skills);
println!("\n{}", match_result.gap_analysis.unwrap_or_default());
```

**Example output:**

```text
Overall Match: 75%
Matching Skills: ["Python", "React", "Docker", "PostgreSQL"]
Missing Skills: ["TypeScript", "Kubernetes"]

Match: 75%

✓ Matching Skills (4):
  • Python
  • React
  • Docker
  • PostgreSQL

✗ Missing Skills (2):
  • TypeScript
  • Kubernetes

💡 Good match. Consider highlighting transferable skills in your application.
```

### 4. Manage Multiple Resumes

```rust
// Get active resume (most recent)
let active_resume = matcher.get_active_resume().await?;

// Switch to different resume
matcher.set_active_resume(other_resume_id).await?;
```

---

## 🔍 Skill Categories

The skill extractor recognizes **200+ skills** across 6 categories:

### Programming Languages (21)

Python, JavaScript, TypeScript, Java, C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala, R,
MATLAB, SQL, HTML, CSS, Shell, Bash, PowerShell

### Frameworks (24)

React, Angular, Vue, Next.js, Svelte, Django, Flask, FastAPI, Express, Node.js, Spring,
Spring Boot, ASP.NET, .NET, Rails, Laravel, React Native, Flutter, SwiftUI, TensorFlow,
PyTorch, Keras, scikit-learn

### Tools (24)

Git, GitHub, GitLab, Bitbucket, Jenkins, CircleCI, Travis CI, GitHub Actions, Docker,
Kubernetes, Helm, Webpack, Vite, Maven, Gradle, Jest, Pytest, JUnit, Selenium, Cypress,
Grafana, Prometheus, Datadog, New Relic

### Databases (11)

PostgreSQL, MySQL, SQLite, Microsoft SQL Server, Oracle, MongoDB, Redis, Cassandra,
DynamoDB, Elasticsearch, Neo4j

### Cloud Platforms (8)

AWS, Azure, Google Cloud, GCP, Heroku, Vercel, Netlify, DigitalOcean

### Soft Skills (10)

Leadership, Communication, Team Collaboration, Problem Solving, Critical Thinking,
Project Management, Agile, Scrum, Mentoring, Public Speaking

---

## 📊 Matching Algorithm

### Current Implementation (v2.3.0)

**Multi-Factor Matching:**

The resume matcher now uses a weighted formula combining three factors:

```text
overall_score = (skills × 0.5) + (experience × 0.3) + (education × 0.2)
```

#### Skills Matching (50%)

1. Extract skills from resume using keyword + ML extraction
2. Extract skills from job description
3. Calculate intersection (matching skills)
4. Calculate difference (missing skills)
5. Compute skills match score:

   ```text
   skills_match_score = matching_skills / total_job_skills
   ```

#### Experience Matching (30%)

1. Extract experience requirements from job description using regex
2. Patterns detected: "5+ years Python", "3-5 years experience", "Senior (7+ years)"
3. Compare against user's years of experience per skill
4. Scoring:
   - `user_years >= required_years` → 1.0 (full credit)
   - `user_years < required_years` → `user_years / required_years` (partial credit)

#### Education Matching (20%)

1. Extract degree requirements: "Bachelor's required", "Master's preferred", "PhD in CS"
2. `DegreeLevel` hierarchy: None(0) < HighSchool(1) < Associate(2) < Bachelor(3) < Master(4) < PhD(5)
3. Scoring:
   - `user_level >= required_level` → 1.0 (full credit)
   - `user_level < required_level` → `user_level / required_level` (partial credit)
   - No requirement specified → 1.0

### Confidence Scoring

Skills are assigned confidence scores (0.0-1.0) based on:

- **Frequency** (50%): How many times the skill is mentioned
- **Context** (30%): Appears in "Skills" section vs. elsewhere
- **Base** (20%): Default confidence for any detected skill

```rust
// Example confidence calculation
// "Python" mentioned 3 times in Skills section:
frequency_score = min(3 * 0.1, 0.5) = 0.3
context_score = 0.3    // In Skills section
base_score = 0.2

total_confidence = 0.3 + 0.3 + 0.2 = 0.8 (80%)
```

### Match Recommendations

| Score Range | Recommendation |
|------|--------|
| 80-100% | Strong match! Apply. |
| 60-79% | Good match. Highlight transferable skills. |
| 40-59% | Moderate match. Study missing skills. |
| 0-39% | Low match. Consider upskilling first. |

---

## 🧪 Testing

### Unit Tests Included

```bash
cargo test --lib resume

# Test coverage:
# ✅ PDF parsing and text extraction
# ✅ Text cleaning and section extraction
# ✅ Skill extraction by category
# ✅ Confidence scoring
# ✅ No duplicate skills
# ✅ Word boundary matching
# ✅ Job skill extraction
# ✅ Match score calculation
# ✅ Gap analysis generation
# ✅ Resume activation
```

**Test Statistics:**

- **Parser:** 4 tests
- **Skill Extractor:** 6 tests
- **Matcher:** 4 tests
- **Main Module:** 2 tests
- **Total:** 16 unit tests

---

## 🎯 Scoring Engine Integration

The Resume Matcher integrates directly with JobSentinel's Smart Scoring engine for automated job matching.

### How It Works

When **Resume-Based Scoring** is enabled in Settings:

1. **Job Fetch**: New jobs are fetched from job boards
2. **Async Scoring**: `ScoringEngine::score_async()` is called
3. **Resume Match**: Active resume skills are matched against job requirements
4. **Score Composition**:
   - **70%** - Resume match score (skills you have vs. skills required)
   - **30%** - Keyword boost ratio (traditional keyword matching)
5. **Fallback**: If no resume is uploaded, falls back to keyword-only scoring

### Enabling Resume-Based Scoring

1. **Upload your resume** in the **Resume** tab
2. Go to **Settings** → **Resume-Based Scoring**
3. Toggle **"Use Resume for Scoring"** ON

### Score Breakdown

When viewing job scores, you'll see:

- Overall resume match percentage
- List of matching skills (skills you have that the job wants)
- List of missing skills (skills the job wants that you don't have)
- Keyword boost contribution

### Configuration

```json
{
  "use_resume_matching": true
}
```

Or simply use the toggle in Settings (recommended for non-technical users).

---

## 🎨 UI Integration (v2.4.0)

### Resume Upload Component

```typescript
// src/pages/ResumeManager.tsx

import { invoke } from '@tauri-apps/api/core';

const uploadResume = async (file: File) => {
  const filePath = await save(file); // Save to local storage

  const resumeId = await invoke<number>('upload_resume', {
    name: file.name,
    filePath: filePath,
  });

  console.log('Resume uploaded! ID:', resumeId);
};
```

### Match Dashboard with Enhanced Skill Visualization

```typescript
// Display match results with confidence scores and category filtering
const MatchCard = ({ match }: { match: MatchResult }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const percentage = (match.overall_match_score * 100).toFixed(0);

  // Skills display with confidence scores and years of experience
  const filteredSkills = selectedCategory
    ? match.matching_skills.filter(skill => skill.category === selectedCategory)
    : match.matching_skills;

  return (
    <div className="match-card">
      <h3>{percentage}% Match</h3>

      {/* Score breakdown chart: skills/experience/education */}
      <ResumeMatchScoreBreakdown
        skillsScore={match.skills_score}
        experienceScore={match.experience_score}
        educationScore={match.education_score}
      />

      {/* Category filter dropdown for skills */}
      <SkillCategoryFilter
        categories={Array.from(new Set(match.matching_skills.map(s => s.category)))}
        selected={selectedCategory}
        onChange={setSelectedCategory}
      />

      <div className="matching-skills">
        <h4>✓ You Have ({filteredSkills.length})</h4>
        {filteredSkills.map(skill => (
          <div key={skill.name} className="skill-badge-container">
            <span className="skill-badge success">{skill.name}</span>
            <span className="confidence-score">{(skill.confidence * 100).toFixed(0)}%</span>
            {skill.years_experience && (
              <span className="experience-badge">{skill.years_experience}y</span>
            )}
          </div>
        ))}
      </div>

      {/* Styled gap analysis with color-coded list */}
      <div className="missing-skills">
        <h4>✗ Missing ({match.missing_skills.length})</h4>
        {match.missing_skills.map(skill => (
          <span key={skill} className="skill-badge error">{skill}</span>
        ))}
      </div>

      {/* Proficiency distribution chart */}
      <ProficiencyDistributionChart
        skills={filteredSkills}
      />

      <p className="recommendation">{match.gap_analysis}</p>
    </div>
  );
};
```

### ATS Optimizer with Job Comparison

```typescript
// Side-by-side job comparison view with keyword density heatmap
const AtsOptimizerView = ({ resumeDraft, selectedJob }: Props) => {
  return (
    <div className="ats-optimizer">
      {/* Side-by-side comparison */}
      <div className="comparison-panels">
        <div className="resume-panel">
          <h3>Your Resume</h3>
          {/* Resume preview with ATS score */}
          <ResumeDraftPreview draft={resumeDraft} />
          <ATSScorePreview score={resumeDraft.ats_score} />
        </div>

        <div className="job-panel">
          <h3>Job Requirements</h3>
          {/* Job description with keywords highlighted */}
          <JobRequirementsPanel job={selectedJob} />
        </div>
      </div>

      {/* Keyword density heatmap by importance */}
      <KeywordDensityHeatmap
        resumeKeywords={resumeDraft.keywords}
        jobKeywords={selectedJob.required_keywords}
      />

      {/* Tailor Resume workflow button */}
      <button
        onClick={() => navigateToBuilder(resumeDraft.id)}
        className="tailor-button"
      >
        📝 Tailor Resume for This Job
      </button>
    </div>
  );
};
```

### Resume Builder with Enhancements

```typescript
// 7-step wizard with template previews and ATS score preview
const ResumeBuilderWizard = () => {
  return (
    <div className="resume-builder">
      {/* Step 1-5: Contact, Summary, Experience, Education, Skills */}
      {currentStep <= 5 && <BuilderFormStep step={currentStep} />}

      {/* Step 6: Template Selection with Thumbnails */}
      {currentStep === 6 && (
        <div className="template-selection">
          <h3>Choose a Template</h3>
          <div className="template-grid">
            {TEMPLATES.map(template => (
              <div
                key={template.id}
                className="template-card"
                onClick={() => selectTemplate(template.id)}
              >
                {/* Thumbnail preview of template */}
                <TemplatePreview template={template} />
                <p>{template.name}</p>
              </div>
            ))}
          </div>

          {/* ATS Score Preview */}
          <div className="ats-preview">
            <h4>ATS Score Preview: {atsScore}/100</h4>
            <ScoreBreakdown breakdown={atsBreakdown} />
          </div>
        </div>
      )}

      {/* Step 7: Export/Download */}
      {currentStep === 7 && (
        <div className="export-options">
          <button onClick={() => exportPDF()}>📄 Export as PDF</button>
          <button onClick={() => exportDOCX()}>📝 Export as DOCX</button>
        </div>
      )}
    </div>
  );
};
```

### Import Skills from Resume

```typescript
// Button to import skills from uploaded resume into builder
const ImportSkillsButton = ({ resumeId }: { resumeId: number }) => {
  const handleImport = async () => {
    const skills = await invoke<UserSkill[]>('get_user_skills', { resume_id: resumeId });
    // Populate builder with imported skills
    populateBuilderSkills(skills);
  };

  return (
    <button onClick={handleImport} className="import-skills-btn">
      📥 Import Skills from Resume
    </button>
  );
};
```

### Auto-Match All Jobs

```typescript
// Match resume against all jobs
const autoMatchJobs = async () => {
  const jobs = await invoke<Job[]>('get_all_jobs');
  const activeResume = await invoke<Resume>('get_active_resume');

  for (const job of jobs) {
    const match = await invoke<MatchResult>('match_resume_to_job', {
      resumeId: activeResume.id,
      jobHash: job.hash,
    });

    // Store or display match
    console.log(`${job.title}: ${(match.overall_match_score * 100).toFixed(0)}%`);
  }
};
```

---

## 📈 Analytics Queries

### Top Matching Jobs

```sql
SELECT
  j.title,
  j.company,
  m.overall_match_score,
  m.matching_skills,
  m.missing_skills
FROM resume_job_matches m
JOIN jobs j ON m.job_hash = j.hash
WHERE m.resume_id = ?
ORDER BY m.overall_match_score DESC
LIMIT 10;
```

### Most In-Demand Skills

```sql
SELECT
  skill_name,
  COUNT(*) as job_count,
  SUM(CASE WHEN is_required = 1 THEN 1 ELSE 0 END) as required_count
FROM job_skills
GROUP BY skill_name
ORDER BY job_count DESC
LIMIT 20;
```

### Skills Gap Analysis

```sql
-- Skills appearing in jobs but missing from resume
SELECT
  js.skill_name,
  COUNT(*) as frequency
FROM job_skills js
WHERE js.skill_name NOT IN (
  SELECT skill_name FROM user_skills WHERE resume_id = ?
)
GROUP BY js.skill_name
ORDER BY frequency DESC
LIMIT 10;
```

---

## 🚀 Features & Enhancements

### Completed (v2.3.0)

- [x] **Skill Validation UI** - Edit, delete, and add extracted skills
- [x] **Resume Library** - Manage multiple resume versions
- [x] **Experience Matching** - Years of experience vs requirements
- [x] **Education Matching** - Degree level comparison
- [x] **PDF Export** - Browser print-to-PDF functionality
- [x] **OCR Support** - Scanned PDF parsing (optional `ocr` feature)
- [x] **Enhanced Skill Database** - 300+ skills across 10 categories

### OCR Support (Optional)

Enable with `cargo build --features ocr`. Requires system dependencies:

- **macOS**: `brew install tesseract poppler`
- **Windows**: Download Tesseract installer + poppler binaries
- **Linux**: `apt install tesseract-ocr poppler-utils`

When pdf-extract returns < 100 characters, OCR automatically kicks in:

1. Converts PDF pages to PNG images at 300 DPI using `pdftoppm`
2. Runs Tesseract on each page
3. Merges results with page break markers

### Self-Contained Skill Extraction

JobSentinel uses a fully self-contained skill extraction system:

1. **300+ recognized skills** across 10 categories
2. **Categories**: programming languages, frameworks, tools, databases, cloud platforms,
   soft skills, methodologies, certifications, security, data
3. **100% offline** - no external services or network calls required
4. **Deterministic** - same input always produces same output

### Future Enhancements

- [ ] **DOCX Support** - Parse Microsoft Word resumes
- [ ] **LinkedIn Import** - Import profile directly from LinkedIn
- [ ] **A/B Testing** - Track which resume versions perform best
- [ ] **Skill Trend Analysis** - See which skills are growing in demand
- [ ] **Resume Optimization** - Suggest keywords to add
- [ ] **Interview Prep** - Generate interview questions based on missing skills
- [ ] **Skill Verification** - Link to certifications and portfolios

---

## 🔧 API Reference

### ResumeMatcher

```rust
pub struct ResumeMatcher {
    db: SqlitePool,
}

impl ResumeMatcher {
    pub fn new(db: SqlitePool) -> Self;

    // Resume management
    pub async fn upload_resume(&self, name: &str,
                                file_path: &str) -> Result<i64>;
    pub async fn get_resume(&self, resume_id: i64) -> Result<Resume>;
    pub async fn get_active_resume(&self) -> Result<Option<Resume>>;
    pub async fn set_active_resume(&self, resume_id: i64) -> Result<()>;

    // Skill extraction
    pub async fn extract_skills(&self, resume_id: i64)
                                 -> Result<Vec<UserSkill>>;
    pub async fn get_user_skills(&self, resume_id: i64)
                                  -> Result<Vec<UserSkill>>;

    // Matching
    pub async fn match_resume_to_job(&self, resume_id: i64,
                                      job_hash: &str)
                                      -> Result<MatchResult>;
    pub async fn get_match_result(&self, resume_id: i64,
                                   job_hash: &str)
                                   -> Result<Option<MatchResult>>;
}
```

### Types

```rust
pub struct Resume {
    pub id: i64,
    pub name: String,
    pub file_path: String,
    pub parsed_text: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub struct UserSkill {
    pub id: i64,
    pub resume_id: i64,
    pub skill_name: String,
    pub skill_category: Option<String>,
    pub confidence_score: f64,
    pub years_experience: Option<f64>,
    pub proficiency_level: Option<String>,
    pub source: String,
}

pub struct MatchResult {
    pub id: i64,
    pub resume_id: i64,
    pub job_hash: String,
    pub overall_match_score: f64,
    pub skills_match_score: Option<f64>,
    pub missing_skills: Vec<String>,
    pub matching_skills: Vec<String>,
    pub gap_analysis: Option<String>,
    pub created_at: DateTime<Utc>,
}
```

---

## ✅ Implementation Status

### Completed ✅

- [x] Database schema (6 tables, 10 indexes)
- [x] PDF parsing with pdf-extract
- [x] Text cleaning and section extraction
- [x] Keyword-based skill extraction (300+ skills, 10 categories)
- [x] Resume-job matching algorithm
- [x] Gap analysis generation
- [x] Confidence scoring
- [x] Resume activation management
- [x] Comprehensive unit tests (145 tests)
- [x] Full documentation
- [x] **Scoring Engine Integration** (v2.2)
- [x] Settings UI toggle for resume-based scoring
- [x] **Skill Validation UI** (v2.3) - Edit/delete/add skills
- [x] **Resume Library** (v2.3) - Multiple resume management
- [x] **Experience Matching** (v2.3) - Years of experience extraction and scoring
- [x] **Education Matching** (v2.3) - Degree level comparison
- [x] **PDF Export** (v2.3) - Browser print-to-PDF
- [x] **OCR Support** (v2.3) - Scanned PDF parsing via tesseract
- [x] **Enhanced Skill Database** (v2.3) - 300+ skills across 10 categories

### Completed (v2.4.0)

- [x] **Resume.tsx UI Enhancements** - Skill confidence scores on badges
- [x] **Years of Experience Display** - Per-skill experience tracking
- [x] **Category Filtering** - Filter skills by category dropdown
- [x] **Visual Score Breakdown Chart** - Skills/experience/education visualization
- [x] **Styled Gap Analysis** - Color-coded missing skills list
- [x] **Proficiency Distribution Chart** - Skill proficiency level visualization
- [x] **ResumeOptimizer.tsx Enhancements** - Side-by-side job comparison
- [x] **Keyword Density Heatmap** - Keyword importance visualization
- [x] **Tailor Resume Workflow** - Button linking to resume builder
- [x] **Import Skills from Resume** - Populate builder with extracted skills
- [x] **ATS Score Preview** - Display score in builder step 6
- [x] **Template Thumbnail Previews** - Visual template selection
- [x] **New Components** - ResumeMatchScoreBreakdown, SkillCategoryFilter

### Future 🔜

- [ ] LinkedIn profile import
- [ ] A/B testing for resume versions
- [ ] Skill trend analysis
- [ ] Cover letter generation from resume
- [ ] Resume optimization suggestions with AI

---

**Last Updated:** 2026-01-25
**Version:** 2.6.3
**Maintained By:** JobSentinel Core Team
**Implementation Status:** ✅ v2.4.0 Complete (Enhanced UI + Resume Builder Integration)
**Tests:** 145+ passing (updated with v2.4.0 component tests)
