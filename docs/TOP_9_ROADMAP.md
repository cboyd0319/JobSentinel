# JobSentinel Top 9 Implementation Roadmap
## Detailed Technical Specifications & Implementation Plan

> **Last Updated:** 2025-11-15
> **Timeline:** 6-12 months (single developer)
> **Status:** Planning Phase

---

## 📋 Executive Summary

This document outlines the comprehensive implementation plan for the **Top 9 High-Impact Features** that will transform JobSentinel from a powerful job scraping tool into a complete AI-powered job search automation platform.

### The Top 9 Features

1. **AI Resume-Job Matcher** - Automatic skill matching and gap analysis
2. **One-Click Apply Automation** - Headless browser application submission
3. **Application Tracking System** - Full ATS with Kanban workflow
4. **LinkedIn/Indeed/Major Scrapers** - 10x job coverage expansion
5. **Multi-Channel Notifications** - Email, Discord, Telegram, SMS
6. **Salary Negotiation AI** - Data-driven compensation intelligence
7. **Job Market Intelligence Dashboard** - Analytics and trend visualization
8. **Browser Extension** - In-page job scoring on any career site
9. **Company Health Monitoring** - Reviews, funding, red flag detection

### Impact Metrics

| Metric | Current | After Top 9 |
|--------|---------|-------------|
| Job Coverage | ~50K (Greenhouse/Lever) | ~5M (all major boards) |
| Application Time | 15 min/job | 30 sec/job |
| Notification Channels | 1 (Slack) | 8+ (Email, Discord, etc.) |
| Data Insights | None | Market trends, salary data |
| Success Rate | Baseline | +40% (referrals, timing) |

---

## 🎯 FEATURE #1: AI Resume-Job Matcher

### Priority: P0 (Critical)
### Estimated Effort: 4-6 weeks
### Complexity: MEDIUM

### Problem Statement
Users manually compare their skills against job requirements, missing nuances and spending hours on low-match jobs.

### Solution Overview
Automatically parse user resumes, extract skills/experience, and use semantic matching to show skill gaps and compatibility scores.

---

### Technical Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Resume    │─────▶│ PDF Parser   │─────▶│   Skill     │
│  (PDF/DOCX) │      │   Service    │      │ Extractor   │
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
                              │  Embedding Model │
                              │   (BERT/GPT)     │
                              └──────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  Semantic Match  │
                              │    vs Job Desc   │
                              └──────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │   Gap Analysis   │
                              │  + UI Dashboard  │
                              └──────────────────┘
```

---

### Database Schema

```sql
-- Resume storage and versioning
CREATE TABLE resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    parsed_text TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extracted skills from resume
CREATE TABLE user_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    skill_name TEXT NOT NULL,
    skill_category TEXT, -- e.g., 'programming_language', 'framework', 'tool'
    confidence_score REAL DEFAULT 1.0, -- 0.0 to 1.0
    years_experience REAL,
    proficiency_level TEXT, -- 'beginner', 'intermediate', 'expert'
    source TEXT DEFAULT 'resume', -- 'resume', 'user_input', 'inferred'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
    UNIQUE(resume_id, skill_name)
);

-- Job skill requirements extracted from descriptions
CREATE TABLE job_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_hash TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    skill_category TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_hash) REFERENCES jobs(hash) ON DELETE CASCADE,
    UNIQUE(job_hash, skill_name)
);

-- Resume-job match analysis
CREATE TABLE resume_job_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    job_hash TEXT NOT NULL,
    overall_match_score REAL NOT NULL, -- 0.0 to 1.0
    skills_match_score REAL,
    experience_match_score REAL,
    education_match_score REAL,
    missing_skills JSON, -- ["TypeScript", "Docker"]
    matching_skills JSON, -- ["Python", "React"]
    gap_analysis TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
    FOREIGN KEY (job_hash) REFERENCES jobs(hash) ON DELETE CASCADE,
    UNIQUE(resume_id, job_hash)
);

-- User education history
CREATE TABLE user_education (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    degree TEXT,
    field_of_study TEXT,
    institution TEXT,
    graduation_year INTEGER,
    gpa REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);

-- User work experience
CREATE TABLE user_experience (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    company TEXT,
    title TEXT,
    start_date DATE,
    end_date DATE,
    description TEXT,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);
```

---

### Implementation Phases

#### Phase 1: PDF/DOCX Parsing (Week 1-2)

**Rust Dependencies:**
```toml
[dependencies]
# PDF parsing
pdf-extract = "0.7"
lopdf = "0.32"

# DOCX parsing
docx-rs = "0.4"

# Text processing
regex = "1.10"
unicode-segmentation = "1.11"
```

**Core Parsing Module:**
```rust
// src-tauri/src/core/resume/parser.rs

use anyhow::{Context, Result};
use pdf_extract::extract_text;
use std::path::Path;

pub struct ResumeParser;

impl ResumeParser {
    /// Parse resume from file (PDF or DOCX)
    pub async fn parse_file(file_path: &Path) -> Result<ParsedResume> {
        let extension = file_path
            .extension()
            .and_then(|s| s.to_str())
            .context("Invalid file extension")?;

        match extension.to_lowercase().as_str() {
            "pdf" => Self::parse_pdf(file_path).await,
            "docx" => Self::parse_docx(file_path).await,
            _ => Err(anyhow::anyhow!("Unsupported file format: {}", extension)),
        }
    }

    async fn parse_pdf(file_path: &Path) -> Result<ParsedResume> {
        let text = extract_text(file_path)
            .context("Failed to extract text from PDF")?;

        Self::parse_text(&text).await
    }

    async fn parse_docx(file_path: &Path) -> Result<ParsedResume> {
        // DOCX parsing implementation
        todo!("Implement DOCX parsing")
    }

    async fn parse_text(text: &str) -> Result<ParsedResume> {
        Ok(ParsedResume {
            raw_text: text.to_string(),
            skills: Self::extract_skills(text),
            experience: Self::extract_experience(text),
            education: Self::extract_education(text),
            contact_info: Self::extract_contact(text),
        })
    }

    fn extract_skills(text: &str) -> Vec<Skill> {
        // Keyword matching against known skill database
        // TODO: Replace with ML-based extraction in Phase 2
        vec![]
    }

    fn extract_experience(text: &str) -> Vec<Experience> {
        // Regex-based extraction of work history
        vec![]
    }

    fn extract_education(text: &str) -> Vec<Education> {
        // Regex-based extraction of degrees
        vec![]
    }

    fn extract_contact(text: &str) -> ContactInfo {
        // Extract email, phone, LinkedIn
        ContactInfo::default()
    }
}

#[derive(Debug, Clone)]
pub struct ParsedResume {
    pub raw_text: String,
    pub skills: Vec<Skill>,
    pub experience: Vec<Experience>,
    pub education: Vec<Education>,
    pub contact_info: ContactInfo,
}

#[derive(Debug, Clone)]
pub struct Skill {
    pub name: String,
    pub category: Option<String>,
    pub years_experience: Option<f64>,
}

#[derive(Debug, Clone)]
pub struct Experience {
    pub company: String,
    pub title: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub description: String,
}

#[derive(Debug, Clone)]
pub struct Education {
    pub degree: String,
    pub field: String,
    pub institution: String,
    pub graduation_year: Option<i32>,
}

#[derive(Debug, Clone, Default)]
pub struct ContactInfo {
    pub email: Option<String>,
    pub phone: Option<String>,
    pub linkedin: Option<String>,
}
```

**Testing Strategy:**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_parse_pdf_resume() {
        let path = Path::new("tests/fixtures/sample_resume.pdf");
        let result = ResumeParser::parse_file(path).await;
        assert!(result.is_ok());

        let resume = result.unwrap();
        assert!(!resume.skills.is_empty());
        assert!(!resume.experience.is_empty());
    }

    #[test]
    fn test_skill_extraction() {
        let text = "Proficient in Python, React, and Docker with 5 years experience";
        let skills = ResumeParser::extract_skills(text);
        assert!(skills.iter().any(|s| s.name == "Python"));
        assert!(skills.iter().any(|s| s.name == "React"));
    }
}
```

---

#### Phase 2: Skill Extraction with ML (Week 2-3)

**Options for ML Integration:**

**Option A: Local BERT Model (Privacy-First)**
```toml
[dependencies]
rust-bert = "0.21"
tch = "0.15" # PyTorch bindings
```

**Pros:**
- Fully offline, no API costs
- Complete privacy
- Fast after initial model load

**Cons:**
- Large model size (~400MB for BERT)
- Slower startup time
- More complex setup

**Option B: OpenAI API (Quick Implementation)**
```toml
[dependencies]
async-openai = "0.20"
```

**Pros:**
- Easy to implement
- State-of-the-art accuracy
- No model management

**Cons:**
- API costs ($0.01-0.05 per resume)
- Requires internet connection
- Privacy concerns (data sent to OpenAI)

**Recommendation:** Start with **Option B (OpenAI API)** for MVP, add **Option A (local BERT)** as a privacy-focused alternative in v2.1.

**OpenAI Integration Example:**
```rust
// src-tauri/src/core/resume/skill_extractor.rs

use async_openai::{types::CreateChatCompletionRequestArgs, Client};
use anyhow::Result;
use serde::{Deserialize, Serialize};

pub struct SkillExtractor {
    client: Client,
}

impl SkillExtractor {
    pub fn new(api_key: String) -> Self {
        let client = Client::new().with_api_key(api_key);
        Self { client }
    }

    pub async fn extract_skills(&self, resume_text: &str) -> Result<Vec<ExtractedSkill>> {
        let prompt = format!(
            r#"Extract all technical skills, programming languages, frameworks, and tools from this resume.
Return a JSON array of skills with the following format:
[
  {{"name": "Python", "category": "programming_language", "years": 5}},
  {{"name": "React", "category": "framework", "years": 3}}
]

Resume:
{}

Respond with ONLY the JSON array, no explanation."#,
            resume_text
        );

        let request = CreateChatCompletionRequestArgs::default()
            .model("gpt-4o-mini") // Cheaper model for skill extraction
            .messages(vec![
                ChatCompletionRequestMessage::System(
                    ChatCompletionRequestSystemMessageArgs::default()
                        .content("You are a resume parsing expert.")
                        .build()?
                ),
                ChatCompletionRequestMessage::User(
                    ChatCompletionRequestUserMessageArgs::default()
                        .content(prompt)
                        .build()?
                ),
            ])
            .temperature(0.1) // Low temp for consistent extraction
            .build()?;

        let response = self.client.chat().create(request).await?;

        let skills_json = response
            .choices
            .first()
            .and_then(|c| c.message.content.as_ref())
            .context("No response from OpenAI")?;

        let skills: Vec<ExtractedSkill> = serde_json::from_str(skills_json)?;
        Ok(skills)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractedSkill {
    pub name: String,
    pub category: String,
    pub years: Option<f64>,
}
```

---

#### Phase 3: Semantic Matching (Week 3-4)

**Embedding-Based Similarity:**
```rust
// src-tauri/src/core/resume/matcher.rs

use anyhow::Result;

pub struct ResumeMatcher {
    embedder: Box<dyn EmbeddingProvider>,
}

impl ResumeMatcher {
    /// Calculate match score between resume and job
    pub async fn calculate_match(
        &self,
        resume: &ParsedResume,
        job: &Job,
    ) -> Result<MatchResult> {
        // 1. Extract skills from job description
        let job_skills = self.extract_job_skills(&job.description).await?;

        // 2. Compare resume skills vs job skills
        let skills_match = self.compare_skills(&resume.skills, &job_skills);

        // 3. Semantic similarity between resume and job description
        let resume_embedding = self.embedder.embed(&resume.raw_text).await?;
        let job_embedding = self.embedder.embed(&job.description).await?;
        let semantic_similarity = cosine_similarity(&resume_embedding, &job_embedding);

        // 4. Experience level matching
        let experience_match = self.compare_experience(resume, job);

        // 5. Aggregate scores
        let overall_score =
            skills_match * 0.6 +
            semantic_similarity * 0.3 +
            experience_match * 0.1;

        Ok(MatchResult {
            overall_score,
            skills_match_score: skills_match,
            semantic_similarity,
            experience_match_score: experience_match,
            missing_skills: self.find_missing_skills(&resume.skills, &job_skills),
            matching_skills: self.find_matching_skills(&resume.skills, &job_skills),
        })
    }

    fn compare_skills(&self, resume_skills: &[Skill], job_skills: &[Skill]) -> f64 {
        if job_skills.is_empty() {
            return 1.0;
        }

        let matches = job_skills
            .iter()
            .filter(|js| {
                resume_skills.iter().any(|rs| {
                    // Exact match or fuzzy match
                    rs.name.eq_ignore_ascii_case(&js.name) ||
                    self.fuzzy_match(&rs.name, &js.name) > 0.8
                })
            })
            .count();

        matches as f64 / job_skills.len() as f64
    }

    fn fuzzy_match(&self, a: &str, b: &str) -> f64 {
        // Levenshtein distance-based fuzzy matching
        let distance = strsim::levenshtein(a, b);
        let max_len = a.len().max(b.len());
        1.0 - (distance as f64 / max_len as f64)
    }

    fn find_missing_skills(&self, resume_skills: &[Skill], job_skills: &[Skill]) -> Vec<String> {
        job_skills
            .iter()
            .filter(|js| {
                !resume_skills.iter().any(|rs| rs.name.eq_ignore_ascii_case(&js.name))
            })
            .map(|s| s.name.clone())
            .collect()
    }

    fn find_matching_skills(&self, resume_skills: &[Skill], job_skills: &[Skill]) -> Vec<String> {
        job_skills
            .iter()
            .filter(|js| {
                resume_skills.iter().any(|rs| rs.name.eq_ignore_ascii_case(&js.name))
            })
            .map(|s| s.name.clone())
            .collect()
    }
}

#[derive(Debug)]
pub struct MatchResult {
    pub overall_score: f64,
    pub skills_match_score: f64,
    pub semantic_similarity: f64,
    pub experience_match_score: f64,
    pub missing_skills: Vec<String>,
    pub matching_skills: Vec<String>,
}

fn cosine_similarity(a: &[f64], b: &[f64]) -> f64 {
    let dot_product: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let magnitude_a: f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let magnitude_b: f64 = b.iter().map(|x| x * x).sum::<f64>().sqrt();

    if magnitude_a == 0.0 || magnitude_b == 0.0 {
        return 0.0;
    }

    dot_product / (magnitude_a * magnitude_b)
}
```

---

#### Phase 4: UI Dashboard (Week 4-6)

**React Components:**

```typescript
// src/components/ResumeUpload.tsx

import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export const ResumeUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        await invoke('upload_resume', {
          fileName: file.name,
          fileContent: base64,
        });

        alert('Resume uploaded successfully!');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="resume-upload">
      <h2>Upload Your Resume</h2>
      <input
        type="file"
        accept=".pdf,.docx"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload Resume'}
      </button>
    </div>
  );
};
```

```typescript
// src/components/SkillsGapAnalysis.tsx

import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SkillGap {
  jobTitle: string;
  company: string;
  matchScore: number;
  missingSkills: string[];
  matchingSkills: string[];
}

export const SkillsGapAnalysis: React.FC<{ jobHash: string }> = ({ jobHash }) => {
  const [gap, setGap] = useState<SkillGap | null>(null);

  useEffect(() => {
    invoke<SkillGap>('get_skill_gap', { jobHash })
      .then(setGap)
      .catch(console.error);
  }, [jobHash]);

  if (!gap) return <div>Loading...</div>;

  return (
    <div className="skill-gap-analysis">
      <h3>Skill Match Analysis</h3>

      <div className="match-score">
        <div
          className="progress-bar"
          style={{ width: `${gap.matchScore * 100}%` }}
        >
          {(gap.matchScore * 100).toFixed(0)}% Match
        </div>
      </div>

      <div className="matching-skills">
        <h4>✅ You Have These Skills:</h4>
        <ul>
          {gap.matchingSkills.map((skill) => (
            <li key={skill} className="skill-match">{skill}</li>
          ))}
        </ul>
      </div>

      <div className="missing-skills">
        <h4>⚠️ Missing Skills:</h4>
        <ul>
          {gap.missingSkills.map((skill) => (
            <li key={skill} className="skill-gap">{skill}</li>
          ))}
        </ul>
      </div>

      <div className="recommendations">
        <h4>💡 Recommendations:</h4>
        {gap.missingSkills.length > 0 ? (
          <p>
            Consider learning: <strong>{gap.missingSkills.slice(0, 3).join(', ')}</strong>
          </p>
        ) : (
          <p>You meet all the skill requirements! 🎉</p>
        )}
      </div>
    </div>
  );
};
```

---

### Tauri Commands

```rust
// src-tauri/src/commands/resume.rs

use crate::core::resume::{parser::ResumeParser, matcher::ResumeMatcher};
use anyhow::Result;
use tauri::State;

#[tauri::command]
pub async fn upload_resume(
    file_name: String,
    file_content: String, // base64 encoded
    app_state: State<'_, AppState>,
) -> Result<String, String> {
    // Decode base64
    let file_bytes = base64::decode(&file_content)
        .map_err(|e| format!("Failed to decode file: {}", e))?;

    // Save to disk
    let app_dir = app_state.config_dir();
    let resume_path = app_dir.join("resumes").join(&file_name);
    std::fs::create_dir_all(resume_path.parent().unwrap())
        .map_err(|e| format!("Failed to create directory: {}", e))?;
    std::fs::write(&resume_path, file_bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    // Parse resume
    let parsed = ResumeParser::parse_file(&resume_path)
        .await
        .map_err(|e| format!("Failed to parse resume: {}", e))?;

    // Store in database
    let db = &app_state.db;
    sqlx::query!(
        "INSERT INTO resumes (name, file_path, parsed_text, is_active) VALUES (?, ?, ?, ?)",
        file_name,
        resume_path.to_str().unwrap(),
        parsed.raw_text,
        true
    )
    .execute(db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    // Store extracted skills
    for skill in parsed.skills {
        sqlx::query!(
            "INSERT INTO user_skills (resume_id, skill_name, skill_category, years_experience)
             VALUES (last_insert_rowid(), ?, ?, ?)",
            skill.name,
            skill.category,
            skill.years_experience
        )
        .execute(db)
        .await
        .map_err(|e| format!("Failed to store skills: {}", e))?;
    }

    Ok("Resume uploaded successfully".to_string())
}

#[tauri::command]
pub async fn get_skill_gap(
    job_hash: String,
    app_state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let matcher = ResumeMatcher::new();

    // Get active resume
    let resume = get_active_resume(&app_state.db)
        .await
        .map_err(|e| format!("Failed to get resume: {}", e))?;

    // Get job
    let job = get_job_by_hash(&app_state.db, &job_hash)
        .await
        .map_err(|e| format!("Failed to get job: {}", e))?;

    // Calculate match
    let match_result = matcher.calculate_match(&resume, &job)
        .await
        .map_err(|e| format!("Match calculation failed: {}", e))?;

    Ok(serde_json::json!({
        "jobTitle": job.title,
        "company": job.company,
        "matchScore": match_result.overall_score,
        "missingSkills": match_result.missing_skills,
        "matchingSkills": match_result.matching_skills,
    }))
}
```

---

### Success Metrics

- ✅ Parse PDF/DOCX resumes with 95%+ accuracy
- ✅ Extract 80%+ of skills from typical resume
- ✅ Match score correlates with user's subjective assessment (test with 20+ users)
- ✅ UI loads in <500ms, skill gap analysis completes in <2s

---

### Future Enhancements (Post-MVP)

1. **Multiple Resume Versions**
   - "Frontend Resume" vs. "Backend Resume"
   - Auto-select best resume per job

2. **Resume Optimization Suggestions**
   - "Add 'TypeScript' to your resume to match 40% more jobs"
   - ATS keyword optimization

3. **Experience Level Matching**
   - Junior/Mid/Senior detection
   - Years of experience requirement matching

4. **Education Requirement Matching**
   - Degree requirements (BS/MS/PhD)
   - Field of study matching

---

## 🖱️ FEATURE #2: One-Click Apply Automation

### Priority: P0 (Critical)
### Estimated Effort: 8-10 weeks
### Complexity: VERY HIGH

### Problem Statement
Applying to jobs is repetitive, time-consuming (15 min/application), and error-prone. Users spend 80% of job search time on form-filling instead of preparation.

### Solution Overview
Automate application submission via headless browser, supporting major ATS platforms (Greenhouse, Lever, Workday, Taleo, iCIMS).

---

### Ethical & Legal Considerations

⚠️ **IMPORTANT:** This feature operates in a grey area.

**Arguments FOR:**
- Levels the playing field (recruiters use automation too)
- Saves user time for interview prep
- Similar to browser autofill, just more sophisticated
- Competitors exist: LazyApply ($250/mo), Simplify (free), Sonara ($80/mo)

**Arguments AGAINST:**
- Some companies explicitly prohibit bots in ToS
- May violate CFAA (Computer Fraud and Abuse Act) if bypassing CAPTCHAs
- Could flood recruiters with low-quality applications
- Ethical concerns about authenticity

**Our Approach:**
1. **Transparency:** Users explicitly enable feature
2. **Quality over quantity:** Only apply to 80%+ match jobs
3. **Human-in-the-loop:** User reviews applications before submission (Phase 1)
4. **Respectful rate limiting:** Max 10 applications/day by default
5. **CAPTCHA handling:** Never bypass - prompt user to solve
6. **Opt-out respect:** If company says "no bots", we don't apply

---

### Technical Architecture

```
┌──────────────┐      ┌───────────────┐      ┌──────────────┐
│  High-Match  │─────▶│  Application  │─────▶│   Headless   │
│     Job      │      │   Automator   │      │   Browser    │
└──────────────┘      └───────────────┘      └──────────────┘
                              │                      │
                              │                      ▼
                              │             ┌──────────────┐
                              │             │  DOM Parser  │
                              │             │   (detect    │
                              │             │  form type)  │
                              │             └──────────────┘
                              │                      │
                              ▼                      ▼
                     ┌──────────────┐      ┌──────────────┐
                     │ User Profile │      │  Form Filler │
                     │   (name,     │─────▶│   (inject    │
                     │  resume,     │      │    data)     │
                     │  answers)    │      └──────────────┘
                     └──────────────┘               │
                                                    ▼
                                          ┌──────────────┐
                                          │   Submit     │
                                          │  (with user  │
                                          │  approval)   │
                                          └──────────────┘
                                                    │
                                                    ▼
                                          ┌──────────────┐
                                          │ Screenshot + │
                                          │ Confirmation │
                                          └──────────────┘
```

---

### Database Schema

```sql
-- User application profile
CREATE TABLE application_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    portfolio_url TEXT,
    default_resume_id INTEGER,
    default_cover_letter_template TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (default_resume_id) REFERENCES resumes(id)
);

-- Screening question answers (pre-configured)
CREATE TABLE screening_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_pattern TEXT NOT NULL, -- Regex pattern to match questions
    answer TEXT NOT NULL,
    answer_type TEXT, -- 'text', 'boolean', 'multiple_choice'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Examples of screening_answers:
-- question_pattern: "(?i)authorized.*work.*us"
-- answer: "Yes"
-- answer_type: "boolean"

-- question_pattern: "(?i)require.*sponsorship"
-- answer: "No"
-- answer_type: "boolean"

-- question_pattern: "(?i)years.*experience"
-- answer: "5"
-- answer_type: "text"

-- Application automation log
CREATE TABLE application_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_hash TEXT NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'in_progress', 'submitted', 'failed'
    ats_platform TEXT, -- 'greenhouse', 'lever', 'workday', 'taleo', 'icims'
    error_message TEXT,
    screenshot_path TEXT,
    confirmation_screenshot_path TEXT,
    automation_duration_ms INTEGER,
    user_approved BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_hash) REFERENCES jobs(hash) ON DELETE CASCADE
);

-- CAPTCHA challenges encountered
CREATE TABLE captcha_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_attempt_id INTEGER NOT NULL,
    challenge_type TEXT, -- 'recaptcha_v2', 'recaptcha_v3', 'hcaptcha', 'funcaptcha'
    challenge_url TEXT,
    solved BOOLEAN DEFAULT FALSE,
    solved_at TIMESTAMP,
    FOREIGN KEY (application_attempt_id) REFERENCES application_attempts(id)
);
```

---

### Implementation Phases

#### Phase 1: Headless Browser Setup (Week 1-2)

**Rust Dependencies:**
```toml
[dependencies]
fantoccini = "0.21" # WebDriver client
tokio = { version = "1.42", features = ["full"] }
serde_json = "1.0"

# Or alternative:
headless_chrome = "1.0" # Direct Chrome DevTools Protocol
```

**Browser Automation Module:**
```rust
// src-tauri/src/core/automation/browser.rs

use fantoccini::{Client, ClientBuilder, Locator};
use anyhow::{Context, Result};
use std::time::Duration;
use tokio::time::sleep;

pub struct BrowserAutomation {
    client: Client,
}

impl BrowserAutomation {
    /// Initialize headless Chrome instance
    pub async fn new() -> Result<Self> {
        // Requires ChromeDriver running on port 4444
        // Or use headless_chrome for embedded solution
        let client = ClientBuilder::native()
            .capabilities(serde_json::json!({
                "goog:chromeOptions": {
                    "args": [
                        "--headless",
                        "--disable-gpu",
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
                        "--window-size=1920,1080"
                    ]
                }
            }))
            .connect("http://localhost:4444")
            .await
            .context("Failed to connect to WebDriver")?;

        Ok(Self { client })
    }

    /// Navigate to job application URL
    pub async fn navigate(&self, url: &str) -> Result<()> {
        self.client.goto(url).await?;
        sleep(Duration::from_secs(2)).await; // Wait for page load
        Ok(())
    }

    /// Detect ATS platform from URL and DOM
    pub async fn detect_ats_platform(&self) -> Result<AtsPlatform> {
        let url = self.client.current_url().await?;
        let url_str = url.as_str();

        if url_str.contains("greenhouse.io") || url_str.contains("boards.greenhouse") {
            return Ok(AtsPlatform::Greenhouse);
        }
        if url_str.contains("lever.co") {
            return Ok(AtsPlatform::Lever);
        }
        if url_str.contains("myworkday") || url_str.contains("workday") {
            return Ok(AtsPlatform::Workday);
        }
        if url_str.contains("taleo.net") {
            return Ok(AtsPlatform::Taleo);
        }
        if url_str.contains("icims.com") {
            return Ok(AtsPlatform::Icims);
        }

        // Fallback: DOM-based detection
        self.detect_ats_from_dom().await
    }

    async fn detect_ats_from_dom(&self) -> Result<AtsPlatform> {
        // Check for Greenhouse-specific elements
        if self.client.find(Locator::Css("[data-gh-job-board]")).await.is_ok() {
            return Ok(AtsPlatform::Greenhouse);
        }

        // Check for Lever-specific elements
        if self.client.find(Locator::Css(".application-form.lever-application")).await.is_ok() {
            return Ok(AtsPlatform::Lever);
        }

        Ok(AtsPlatform::Unknown)
    }

    /// Fill form field
    pub async fn fill_field(&self, selector: &str, value: &str) -> Result<()> {
        let element = self.client
            .find(Locator::Css(selector))
            .await
            .context(format!("Field not found: {}", selector))?;

        element.send_keys(value).await?;
        Ok(())
    }

    /// Upload file
    pub async fn upload_file(&self, selector: &str, file_path: &str) -> Result<()> {
        let element = self.client
            .find(Locator::Css(selector))
            .await
            .context(format!("Upload field not found: {}", selector))?;

        element.send_keys(file_path).await?;
        Ok(())
    }

    /// Click button
    pub async fn click(&self, selector: &str) -> Result<()> {
        let element = self.client
            .find(Locator::Css(selector))
            .await
            .context(format!("Button not found: {}", selector))?;

        element.click().await?;
        Ok(())
    }

    /// Take screenshot
    pub async fn screenshot(&self, path: &str) -> Result<()> {
        let screenshot = self.client.screenshot().await?;
        std::fs::write(path, screenshot)?;
        Ok(())
    }

    /// Close browser
    pub async fn close(self) -> Result<()> {
        self.client.close().await?;
        Ok(())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AtsPlatform {
    Greenhouse,
    Lever,
    Workday,
    Taleo,
    Icims,
    Unknown,
}
```

---

#### Phase 2: ATS-Specific Form Handlers (Week 3-6)

Each ATS platform has unique form structures. We need platform-specific handlers.

**Greenhouse Handler:**
```rust
// src-tauri/src/core/automation/platforms/greenhouse.rs

use super::super::browser::{BrowserAutomation, AtsPlatform};
use crate::core::automation::ApplicationProfile;
use anyhow::{Context, Result};
use tokio::time::{sleep, Duration};

pub struct GreenhouseHandler;

impl GreenhouseHandler {
    pub async fn fill_application(
        browser: &BrowserAutomation,
        profile: &ApplicationProfile,
    ) -> Result<()> {
        // Step 1: Fill basic info
        browser.fill_field("input[name='first_name']", &profile.first_name).await?;
        browser.fill_field("input[name='last_name']", &profile.last_name).await?;
        browser.fill_field("input[name='email']", &profile.email).await?;
        browser.fill_field("input[name='phone']", &profile.phone).await?;

        // Step 2: Upload resume
        if let Some(resume_path) = &profile.resume_path {
            browser.upload_file("input[type='file'][name='resume']", resume_path).await?;
            sleep(Duration::from_secs(2)).await; // Wait for upload
        }

        // Step 3: Fill LinkedIn/social fields
        if let Some(linkedin) = &profile.linkedin_url {
            browser.fill_field("input[name='urls[LinkedIn]']", linkedin).await.ok();
        }

        if let Some(github) = &profile.github_url {
            browser.fill_field("input[name='urls[GitHub]']", github).await.ok();
        }

        // Step 4: Handle screening questions
        Self::handle_screening_questions(browser, profile).await?;

        Ok(())
    }

    async fn handle_screening_questions(
        browser: &BrowserAutomation,
        profile: &ApplicationProfile,
    ) -> Result<()> {
        // Greenhouse uses <div class="field"> for each question
        // Try to find all screening questions

        // Example question patterns:
        // "Are you authorized to work in the US?"
        // "Will you require visa sponsorship?"
        // "How many years of experience do you have with Python?"

        // For MVP: Skip complex question handling, prompt user

        Ok(())
    }

    pub async fn submit(browser: &BrowserAutomation, dry_run: bool) -> Result<()> {
        if dry_run {
            // Don't actually submit, just screenshot
            browser.screenshot("application_preview.png").await?;
            return Ok(());
        }

        // Find submit button
        browser.click("input[type='submit'][value='Submit Application']").await
            .or_else(|_| async {
                browser.click("button[type='submit']").await
            }.await)
            .context("Failed to find submit button")?;

        // Wait for confirmation
        sleep(Duration::from_secs(3)).await;

        // Screenshot confirmation page
        browser.screenshot("application_confirmation.png").await?;

        Ok(())
    }
}
```

**Lever Handler:**
```rust
// src-tauri/src/core/automation/platforms/lever.rs

pub struct LeverHandler;

impl LeverHandler {
    pub async fn fill_application(
        browser: &BrowserAutomation,
        profile: &ApplicationProfile,
    ) -> Result<()> {
        // Lever's form structure is different
        browser.fill_field("input[name='name']", &format!("{} {}", profile.first_name, profile.last_name)).await?;
        browser.fill_field("input[name='email']", &profile.email).await?;
        browser.fill_field("input[name='phone']", &profile.phone).await?;

        // Lever uses different resume upload selector
        if let Some(resume_path) = &profile.resume_path {
            browser.upload_file("input.resume-upload-input", resume_path).await?;
        }

        Ok(())
    }

    pub async fn submit(browser: &BrowserAutomation, dry_run: bool) -> Result<()> {
        if dry_run {
            browser.screenshot("lever_application_preview.png").await?;
            return Ok(());
        }

        browser.click("button.template-btn-submit").await?;
        sleep(Duration::from_secs(3)).await;
        browser.screenshot("lever_confirmation.png").await?;

        Ok(())
    }
}
```

**(Continue with Workday, Taleo, iCIMS handlers... each 200-300 lines)**

---

#### Phase 3: User Approval Workflow (Week 7)

```rust
// src-tauri/src/core/automation/coordinator.rs

pub struct ApplicationCoordinator {
    browser: BrowserAutomation,
}

impl ApplicationCoordinator {
    pub async fn apply_to_job(
        &mut self,
        job: &Job,
        profile: &ApplicationProfile,
        require_approval: bool,
    ) -> Result<ApplicationResult> {
        // Navigate to job URL
        self.browser.navigate(&job.url).await?;

        // Detect ATS platform
        let ats_platform = self.browser.detect_ats_platform().await?;

        // Fill application based on platform
        match ats_platform {
            AtsPlatform::Greenhouse => {
                GreenhouseHandler::fill_application(&self.browser, profile).await?;
            }
            AtsPlatform::Lever => {
                LeverHandler::fill_application(&self.browser, profile).await?;
            }
            _ => {
                return Err(anyhow::anyhow!("Unsupported ATS platform: {:?}", ats_platform));
            }
        }

        // Take screenshot for user review
        let preview_path = format!("previews/job_{}_preview.png", job.hash);
        self.browser.screenshot(&preview_path).await?;

        // If approval required, pause and wait for user
        if require_approval {
            // Emit event to frontend with screenshot
            // User clicks "Approve" or "Reject" in UI
            let approved = self.wait_for_user_approval(&preview_path).await?;

            if !approved {
                return Ok(ApplicationResult::UserRejected);
            }
        }

        // Submit application
        match ats_platform {
            AtsPlatform::Greenhouse => {
                GreenhouseHandler::submit(&self.browser, false).await?;
            }
            AtsPlatform::Lever => {
                LeverHandler::submit(&self.browser, false).await?;
            }
            _ => unreachable!(),
        }

        Ok(ApplicationResult::Submitted)
    }

    async fn wait_for_user_approval(&self, screenshot_path: &str) -> Result<bool> {
        // TODO: Implement approval mechanism
        // Option 1: WebSocket event to frontend
        // Option 2: Polling database for approval flag
        // Option 3: Desktop notification with approve/reject buttons

        todo!("Implement user approval workflow")
    }
}

#[derive(Debug)]
pub enum ApplicationResult {
    Submitted,
    UserRejected,
    Failed(String),
}
```

---

#### Phase 4: CAPTCHA Detection (Week 8)

```rust
// src-tauri/src/core/automation/captcha.rs

use crate::core::automation::browser::BrowserAutomation;
use anyhow::Result;

pub struct CaptchaDetector;

impl CaptchaDetector {
    /// Detect if CAPTCHA is present on page
    pub async fn detect(browser: &BrowserAutomation) -> Result<Option<CaptchaType>> {
        // Check for reCAPTCHA v2
        if browser.client.find(Locator::Css(".g-recaptcha")).await.is_ok() {
            return Ok(Some(CaptchaType::ReCaptchaV2));
        }

        // Check for reCAPTCHA v3 (harder to detect, usually invisible)
        if browser.client.find(Locator::Css(".grecaptcha-badge")).await.is_ok() {
            return Ok(Some(CaptchaType::ReCaptchaV3));
        }

        // Check for hCaptcha
        if browser.client.find(Locator::Css(".h-captcha")).await.is_ok() {
            return Ok(Some(CaptchaType::HCaptcha));
        }

        Ok(None)
    }

    /// Handle CAPTCHA challenge
    pub async fn handle(
        browser: &BrowserAutomation,
        captcha_type: CaptchaType,
    ) -> Result<()> {
        match captcha_type {
            CaptchaType::ReCaptchaV2 | CaptchaType::HCaptcha => {
                // NEVER auto-solve - this is unethical and illegal
                // Instead: notify user to solve manually

                // Take screenshot showing CAPTCHA
                browser.screenshot("captcha_challenge.png").await?;

                // Emit event to frontend
                // User solves CAPTCHA in the browser window
                // We wait for solve_captcha_event signal

                Self::wait_for_user_solve().await?;
            }
            CaptchaType::ReCaptchaV3 => {
                // v3 is invisible, browser handles automatically
                // Just wait a bit longer
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        }

        Ok(())
    }

    async fn wait_for_user_solve() -> Result<()> {
        // TODO: Implement waiting mechanism
        // Show browser window to user (switch from headless to headed)
        // User solves CAPTCHA
        // Detect when solved (e.g., button becomes enabled)

        todo!("Implement user CAPTCHA solving")
    }
}

#[derive(Debug, Clone, Copy)]
pub enum CaptchaType {
    ReCaptchaV2,
    ReCaptchaV3,
    HCaptcha,
}
```

---

### UI Components

```typescript
// src/pages/ApplicationAutomation.tsx

import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export const ApplicationAutomation: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [automating, setAutomating] = useState(false);

  const handleAutoApply = async () => {
    setAutomating(true);

    // Get all high-match jobs (80%+)
    const highMatchJobs = await invoke<Job[]>('get_high_match_jobs', {
      threshold: 0.8,
    });

    setJobs(highMatchJobs);

    // Apply to each job (with user approval)
    for (const job of highMatchJobs) {
      try {
        const result = await invoke('auto_apply_to_job', {
          jobHash: job.hash,
          requireApproval: true,
        });

        console.log(`Application result for ${job.title}:`, result);
      } catch (error) {
        console.error(`Failed to apply to ${job.title}:`, error);
      }
    }

    setAutomating(false);
  };

  return (
    <div className="auto-apply">
      <h2>Auto-Apply to Jobs</h2>
      <button onClick={handleAutoApply} disabled={automating}>
        {automating ? 'Applying...' : 'Start Auto-Apply'}
      </button>

      <div className="jobs-queue">
        <h3>Application Queue ({jobs.length} jobs)</h3>
        {jobs.map((job) => (
          <div key={job.hash} className="job-item">
            <h4>{job.title} at {job.company}</h4>
            <p>Match: {(job.score * 100).toFixed(0)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

### Success Metrics

- ✅ Successfully submit application to Greenhouse jobs (90%+ success rate)
- ✅ Successfully submit application to Lever jobs (90%+ success rate)
- ✅ Detect and handle CAPTCHAs without bypassing (100%)
- ✅ Average application time < 60 seconds
- ✅ User approval workflow functional
- ✅ Zero false submissions (applications not intended by user)

---

### Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Legal action from ATS providers | LOW | HIGH | Clear ToS, user assumes responsibility |
| Account bans from job sites | MEDIUM | MEDIUM | Rate limiting, respectful automation |
| Poor application quality perception | MEDIUM | MEDIUM | Only high-match jobs, user approval |
| CAPTCHA blocking | HIGH | MEDIUM | Never bypass, user solves manually |
| ATS UI changes breaking automation | HIGH | HIGH | Automated tests, community reports, graceful degradation |

---

### Future Enhancements

1. **Workday, Taleo, iCIMS Support** (Post-MVP)
2. **Answer Screening Questions Automatically** (using AI)
3. **A/B Test Cover Letters** (track which versions get responses)
4. **Application Success Tracking** (did we get interview?)

---

## FEATURE #3: Application Tracking System (ATS)

> **STATUS: IMPLEMENTED** - This feature is now available in v1.0.0-alpha.
> See [Application Tracking System](APPLICATION_TRACKING_SYSTEM.md) for current documentation.

### Priority: P0 (Critical)
### Estimated Effort: 3-4 weeks
### Complexity: MEDIUM

### Problem Statement
Users lose track of where they applied, when, and what the status is. No centralized view of job search pipeline.

### Solution Overview
Full-featured ATS with Kanban board, status tracking, automated reminders, and analytics.

---

### Database Schema

```sql
-- Applications (already partially defined above)
CREATE TABLE applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_hash TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN (
        'to_apply',
        'applied',
        'screening_call',
        'phone_interview',
        'technical_interview',
        'onsite_interview',
        'offer_received',
        'offer_accepted',
        'offer_rejected',
        'rejected',
        'ghosted',
        'withdrawn'
    )),
    applied_at TIMESTAMP,
    last_contact TIMESTAMP,
    next_followup TIMESTAMP,
    notes TEXT,
    resume_version_id INTEGER,
    cover_letter_text TEXT,
    recruiter_name TEXT,
    recruiter_email TEXT,
    recruiter_phone TEXT,
    salary_expectation INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_hash) REFERENCES jobs(hash) ON DELETE CASCADE,
    FOREIGN KEY (resume_version_id) REFERENCES resumes(id),
    UNIQUE(job_hash) -- Can't apply to same job twice
);

-- Application timeline events
CREATE TABLE application_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN (
        'status_change',
        'email_received',
        'email_sent',
        'phone_call',
        'interview_scheduled',
        'note_added',
        'reminder_set'
    )),
    event_data JSON, -- Flexible schema for different event types
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Example event_data structures:
-- status_change: {"from": "applied", "to": "phone_interview"}
-- email_received: {"subject": "Interview invitation", "from": "recruiter@company.com"}
-- interview_scheduled: {"date": "2025-12-01T14:00:00Z", "type": "phone", "duration_minutes": 30}

-- Reminders and follow-ups
CREATE TABLE application_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    reminder_type TEXT NOT NULL, -- 'follow_up', 'interview_prep', 'custom'
    reminder_time TIMESTAMP NOT NULL,
    message TEXT,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Interview details
CREATE TABLE interviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    interview_type TEXT CHECK(interview_type IN (
        'screening_call',
        'phone_interview',
        'technical_interview',
        'system_design',
        'behavioral',
        'onsite',
        'final_round'
    )),
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER,
    interviewer_names TEXT,
    location TEXT, -- Physical address or "Zoom", "Google Meet", etc.
    meeting_link TEXT,
    preparation_notes TEXT,
    feedback_notes TEXT, -- User's notes after interview
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Offers received
CREATE TABLE offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    base_salary INTEGER,
    currency TEXT DEFAULT 'USD',
    equity_shares INTEGER,
    equity_percentage REAL,
    signing_bonus INTEGER,
    annual_bonus INTEGER,
    benefits_summary TEXT,
    start_date DATE,
    offer_received_at TIMESTAMP,
    offer_expires_at TIMESTAMP,
    accepted BOOLEAN,
    decision_made_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    UNIQUE(application_id) -- One offer per application
);
```

---

### Implementation

```rust
// src-tauri/src/core/ats/manager.rs

use sqlx::SqlitePool;
use anyhow::Result;
use chrono::{DateTime, Utc};

pub struct AtsManager {
    db: SqlitePool,
}

impl AtsManager {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Create new application
    pub async fn create_application(&self, job_hash: &str) -> Result<i64> {
        let result = sqlx::query!(
            "INSERT INTO applications (job_hash, status) VALUES (?, 'to_apply')",
            job_hash
        )
        .execute(&self.db)
        .await?;

        Ok(result.last_insert_rowid())
    }

    /// Update application status
    pub async fn update_status(
        &self,
        application_id: i64,
        new_status: ApplicationStatus,
    ) -> Result<()> {
        // Get current status for event log
        let current_status = self.get_status(application_id).await?;

        // Update status
        sqlx::query!(
            "UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            new_status.to_string(),
            application_id
        )
        .execute(&self.db)
        .await?;

        // Log status change event
        self.log_event(
            application_id,
            "status_change",
            serde_json::json!({
                "from": current_status.to_string(),
                "to": new_status.to_string()
            }),
        )
        .await?;

        // Auto-set reminders based on new status
        self.auto_set_reminders(application_id, new_status).await?;

        Ok(())
    }

    async fn get_status(&self, application_id: i64) -> Result<ApplicationStatus> {
        let row = sqlx::query!("SELECT status FROM applications WHERE id = ?", application_id)
            .fetch_one(&self.db)
            .await?;

        Ok(ApplicationStatus::from_str(&row.status)?)
    }

    async fn log_event(
        &self,
        application_id: i64,
        event_type: &str,
        event_data: serde_json::Value,
    ) -> Result<()> {
        sqlx::query!(
            "INSERT INTO application_events (application_id, event_type, event_data) VALUES (?, ?, ?)",
            application_id,
            event_type,
            event_data.to_string()
        )
        .execute(&self.db)
        .await?;

        Ok(())
    }

    async fn auto_set_reminders(
        &self,
        application_id: i64,
        status: ApplicationStatus,
    ) -> Result<()> {
        match status {
            ApplicationStatus::Applied => {
                // Set reminder to follow up in 1 week if no response
                let followup_time = Utc::now() + chrono::Duration::days(7);
                self.set_reminder(
                    application_id,
                    "follow_up",
                    followup_time,
                    "Follow up on application if no response",
                )
                .await?;
            }
            ApplicationStatus::PhoneInterview => {
                // Set reminder to send thank-you email after interview
                let thank_you_time = Utc::now() + chrono::Duration::hours(24);
                self.set_reminder(
                    application_id,
                    "follow_up",
                    thank_you_time,
                    "Send thank-you email after phone interview",
                )
                .await?;
            }
            ApplicationStatus::OfferReceived => {
                // No auto-reminder, user decides
            }
            _ => {}
        }

        Ok(())
    }

    async fn set_reminder(
        &self,
        application_id: i64,
        reminder_type: &str,
        reminder_time: DateTime<Utc>,
        message: &str,
    ) -> Result<()> {
        sqlx::query!(
            "INSERT INTO application_reminders (application_id, reminder_type, reminder_time, message)
             VALUES (?, ?, ?, ?)",
            application_id,
            reminder_type,
            reminder_time.to_rfc3339(),
            message
        )
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Get all applications grouped by status (for Kanban board)
    pub async fn get_applications_by_status(&self) -> Result<ApplicationsByStatus> {
        let apps = sqlx::query_as!(
            ApplicationRow,
            r#"
            SELECT
                a.id,
                a.job_hash,
                a.status,
                a.applied_at,
                a.last_contact,
                a.notes,
                j.title as job_title,
                j.company,
                j.score
            FROM applications a
            JOIN jobs j ON a.job_hash = j.hash
            ORDER BY a.updated_at DESC
            "#
        )
        .fetch_all(&self.db)
        .await?;

        let mut result = ApplicationsByStatus::default();

        for app in apps {
            let status = ApplicationStatus::from_str(&app.status)?;
            match status {
                ApplicationStatus::ToApply => result.to_apply.push(app),
                ApplicationStatus::Applied => result.applied.push(app),
                ApplicationStatus::ScreeningCall => result.screening_call.push(app),
                ApplicationStatus::PhoneInterview => result.phone_interview.push(app),
                ApplicationStatus::TechnicalInterview => result.technical_interview.push(app),
                ApplicationStatus::OnsiteInterview => result.onsite_interview.push(app),
                ApplicationStatus::OfferReceived => result.offer_received.push(app),
                ApplicationStatus::OfferAccepted => result.offer_accepted.push(app),
                ApplicationStatus::OfferRejected => result.offer_rejected.push(app),
                ApplicationStatus::Rejected => result.rejected.push(app),
                ApplicationStatus::Ghosted => result.ghosted.push(app),
                ApplicationStatus::Withdrawn => result.withdrawn.push(app),
            }
        }

        Ok(result)
    }

    /// Mark application as ghosted if no contact in 2+ weeks
    pub async fn auto_detect_ghosted(&self) -> Result<usize> {
        let two_weeks_ago = Utc::now() - chrono::Duration::days(14);

        let result = sqlx::query!(
            r#"
            UPDATE applications
            SET status = 'ghosted', updated_at = CURRENT_TIMESTAMP
            WHERE status IN ('applied', 'phone_interview', 'technical_interview', 'onsite_interview')
              AND (last_contact IS NULL OR last_contact < ?)
            "#,
            two_weeks_ago.to_rfc3339()
        )
        .execute(&self.db)
        .await?;

        Ok(result.rows_affected() as usize)
    }
}

#[derive(Debug, Clone, Copy)]
pub enum ApplicationStatus {
    ToApply,
    Applied,
    ScreeningCall,
    PhoneInterview,
    TechnicalInterview,
    OnsiteInterview,
    OfferReceived,
    OfferAccepted,
    OfferRejected,
    Rejected,
    Ghosted,
    Withdrawn,
}

impl ApplicationStatus {
    fn to_string(&self) -> String {
        match self {
            Self::ToApply => "to_apply",
            Self::Applied => "applied",
            Self::ScreeningCall => "screening_call",
            Self::PhoneInterview => "phone_interview",
            Self::TechnicalInterview => "technical_interview",
            Self::OnsiteInterview => "onsite_interview",
            Self::OfferReceived => "offer_received",
            Self::OfferAccepted => "offer_accepted",
            Self::OfferRejected => "offer_rejected",
            Self::Rejected => "rejected",
            Self::Ghosted => "ghosted",
            Self::Withdrawn => "withdrawn",
        }
        .to_string()
    }

    fn from_str(s: &str) -> Result<Self> {
        match s {
            "to_apply" => Ok(Self::ToApply),
            "applied" => Ok(Self::Applied),
            "screening_call" => Ok(Self::ScreeningCall),
            "phone_interview" => Ok(Self::PhoneInterview),
            "technical_interview" => Ok(Self::TechnicalInterview),
            "onsite_interview" => Ok(Self::OnsiteInterview),
            "offer_received" => Ok(Self::OfferReceived),
            "offer_accepted" => Ok(Self::OfferAccepted),
            "offer_rejected" => Ok(Self::OfferRejected),
            "rejected" => Ok(Self::Rejected),
            "ghosted" => Ok(Self::Ghosted),
            "withdrawn" => Ok(Self::Withdrawn),
            _ => Err(anyhow::anyhow!("Invalid status: {}", s)),
        }
    }
}

#[derive(Debug)]
pub struct ApplicationRow {
    pub id: i64,
    pub job_hash: String,
    pub status: String,
    pub applied_at: Option<String>,
    pub last_contact: Option<String>,
    pub notes: Option<String>,
    pub job_title: String,
    pub company: String,
    pub score: f64,
}

#[derive(Debug, Default)]
pub struct ApplicationsByStatus {
    pub to_apply: Vec<ApplicationRow>,
    pub applied: Vec<ApplicationRow>,
    pub screening_call: Vec<ApplicationRow>,
    pub phone_interview: Vec<ApplicationRow>,
    pub technical_interview: Vec<ApplicationRow>,
    pub onsite_interview: Vec<ApplicationRow>,
    pub offer_received: Vec<ApplicationRow>,
    pub offer_accepted: Vec<ApplicationRow>,
    pub offer_rejected: Vec<ApplicationRow>,
    pub rejected: Vec<ApplicationRow>,
    pub ghosted: Vec<ApplicationRow>,
    pub withdrawn: Vec<ApplicationRow>,
}
```

---

### UI: Kanban Board

```typescript
// src/components/KanbanBoard.tsx

import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { invoke } from '@tauri-apps/api/core';

interface Application {
  id: number;
  jobHash: string;
  status: string;
  jobTitle: string;
  company: string;
  score: number;
  appliedAt?: string;
}

const STATUS_COLUMNS = [
  { id: 'to_apply', title: 'To Apply' },
  { id: 'applied', title: 'Applied' },
  { id: 'phone_interview', title: 'Phone Screen' },
  { id: 'technical_interview', title: 'Technical' },
  { id: 'onsite_interview', title: 'Onsite' },
  { id: 'offer_received', title: 'Offer' },
  { id: 'rejected', title: 'Rejected' },
  { id: 'ghosted', title: 'Ghosted' },
];

export const KanbanBoard: React.FC = () => {
  const [applications, setApplications] = useState<Record<string, Application[]>>({});

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    const data = await invoke<Record<string, Application[]>>('get_applications_by_status');
    setApplications(data);
  };

  const handleDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    // Update status in backend
    await invoke('update_application_status', {
      applicationId: parseInt(draggableId),
      newStatus: destination.droppableId,
    });

    // Reload applications
    loadApplications();
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        {STATUS_COLUMNS.map((column) => (
          <Droppable key={column.id} droppableId={column.id}>
            {(provided) => (
              <div
                className="kanban-column"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                <h3>{column.title}</h3>
                <div className="kanban-cards">
                  {(applications[column.id] || []).map((app, index) => (
                    <Draggable
                      key={app.id}
                      draggableId={app.id.toString()}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          className="kanban-card"
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <h4>{app.jobTitle}</h4>
                          <p>{app.company}</p>
                          <span className="match-score">
                            {(app.score * 100).toFixed(0)}% match
                          </span>
                          {app.appliedAt && (
                            <small>Applied: {new Date(app.appliedAt).toLocaleDateString()}</small>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
};
```

---

### Success Metrics

- ✅ Drag-and-drop between columns updates status
- ✅ Auto-detect ghosted applications (2 weeks no contact)
- ✅ Auto-set follow-up reminders
- ✅ Track application timeline (all status changes)
- ✅ UI loads <500ms with 100+ applications

---

(Due to length constraints, I'll summarize the remaining features. The full roadmap continues...)

---

## 🌐 FEATURE #4: LinkedIn/Indeed/Major Scrapers

**Key Implementation Points:**
- Use headless browser for LinkedIn (requires login session)
- Indeed has API (limited) + scraping fallback
- ZipRecruiter, Monster, Glassdoor similar approaches
- Challenge: CAPTCHA, rate limiting, IP blocks
- Solution: Rotating user-agents, respectful delays, CAPTCHA solving prompts

**Estimated Effort:** 6-8 weeks

---

## 🔔 FEATURE #5: Multi-Channel Notifications

**Channels to Implement:**
- Email via SMTP (`lettre` crate)
- Discord webhooks
- Telegram Bot API
- Twilio for SMS (optional, paid)
- Microsoft Teams webhooks
- Desktop notifications (Tauri plugin)

**Estimated Effort:** 2-3 weeks

---

## 💰 FEATURE #6: Salary Negotiation AI

**Data Sources:**
- Levels.fyi API or scraping
- H1B Salary Database (public DOL data)
- Glassdoor salary estimates
- Local database of scraped salaries

**Features:**
- Predict fair salary for role/location/experience
- Generate negotiation scripts
- Track offer history

**Estimated Effort:** 4-5 weeks

---

## 📊 FEATURE #7: Job Market Intelligence Dashboard

**Analytics to Build:**
- Time-series skill demand (React mentions over time)
- Salary trends by role/location
- Company hiring velocity
- Geographic job density heatmaps

**Tech:** Chart.js or Recharts for visualization

**Estimated Effort:** 3-4 weeks

---

## 🔌 FEATURE #8: Browser Extension

**Platforms:**
- Chrome (Manifest V3)
- Firefox (WebExtension)
- Safari (optional, for macOS users)

**Features:**
- In-page job scoring overlay
- "Save to JobSentinel" button
- Detect already-seen jobs
- Sync with desktop app via WebSocket

**Estimated Effort:** 5-6 weeks

---

## 🏥 FEATURE #9: Company Health Monitoring

**Data Sources:**
- Glassdoor reviews + rating
- Crunchbase API (funding data)
- Layoffs.fyi scraping
- LinkedIn headcount trends
- News sentiment analysis

**Features:**
- Company health score (A-F)
- Red flag warnings
- Green flag indicators

**Estimated Effort:** 4-5 weeks

---

## 🗄️ DATABASE ENHANCEMENT: SQLite Integrity & Reliability

### Priority: P0 (Foundation)
### Estimated Effort: 1-2 weeks
### Complexity: LOW-MEDIUM

### Problem Statement
Database corruption can cause catastrophic data loss. Users need confidence that their job search data is safe and recoverable.

### Solution Overview
Implement comprehensive integrity checking, automated backups, and corruption detection/recovery mechanisms.

---

### SQLite Integrity Features

#### 1. Built-in Integrity Checks

**Available Commands:**
```sql
-- Full database scan (slow but thorough)
PRAGMA integrity_check;

-- Faster lightweight check
PRAGMA quick_check;

-- Page checksum verification (requires compile-time flag)
PRAGMA checksum_verification=ON;

-- Foreign key constraint check
PRAGMA foreign_key_check;
```

---

### Implementation

```rust
// src-tauri/src/core/db/integrity.rs

use sqlx::{SqlitePool, Row};
use anyhow::{Context, Result};
use chrono::Utc;
use std::path::{Path, PathBuf};

pub struct DatabaseIntegrity {
    db: SqlitePool,
    backup_dir: PathBuf,
}

impl DatabaseIntegrity {
    pub fn new(db: SqlitePool, backup_dir: PathBuf) -> Self {
        std::fs::create_dir_all(&backup_dir).ok();
        Self { db, backup_dir }
    }

    /// Run full integrity check on startup
    pub async fn startup_check(&self) -> Result<IntegrityStatus> {
        tracing::info!("Running database integrity check...");

        // 1. Quick check first (fast)
        let quick_result = self.quick_check().await?;
        if !quick_result.is_ok {
            tracing::error!("Quick check failed: {}", quick_result.message);
            return Ok(IntegrityStatus::Corrupted(quick_result.message));
        }

        // 2. Foreign key check
        let fk_violations = self.foreign_key_check().await?;
        if !fk_violations.is_empty() {
            tracing::warn!("Foreign key violations detected: {} issues", fk_violations.len());
            return Ok(IntegrityStatus::ForeignKeyViolations(fk_violations));
        }

        // 3. Full integrity check (only if suspicious)
        if self.should_run_full_check().await? {
            let full_result = self.full_integrity_check().await?;
            if !full_result.is_ok {
                tracing::error!("Full integrity check failed: {}", full_result.message);
                return Ok(IntegrityStatus::Corrupted(full_result.message));
            }
        }

        tracing::info!("Database integrity check passed ✅");
        Ok(IntegrityStatus::Healthy)
    }

    /// Quick integrity check (fast, runs every startup)
    async fn quick_check(&self) -> Result<CheckResult> {
        let row = sqlx::query("PRAGMA quick_check")
            .fetch_one(&self.db)
            .await?;

        let result: String = row.try_get(0)?;

        Ok(CheckResult {
            is_ok: result == "ok",
            message: result,
        })
    }

    /// Full integrity check (slow, runs weekly or if suspicious)
    async fn full_integrity_check(&self) -> Result<CheckResult> {
        let row = sqlx::query("PRAGMA integrity_check")
            .fetch_one(&self.db)
            .await?;

        let result: String = row.try_get(0)?;

        Ok(CheckResult {
            is_ok: result == "ok",
            message: result,
        })
    }

    /// Check for foreign key violations
    async fn foreign_key_check(&self) -> Result<Vec<ForeignKeyViolation>> {
        let rows = sqlx::query("PRAGMA foreign_key_check")
            .fetch_all(&self.db)
            .await?;

        let mut violations = Vec::new();
        for row in rows {
            violations.push(ForeignKeyViolation {
                table: row.try_get(0)?,
                rowid: row.try_get(1)?,
                parent: row.try_get(2)?,
                fkid: row.try_get(3)?,
            });
        }

        Ok(violations)
    }

    /// Determine if full check is needed
    async fn should_run_full_check(&self) -> Result<bool> {
        // Check metadata table for last full check
        let last_check = sqlx::query_scalar::<_, Option<String>>(
            "SELECT value FROM app_metadata WHERE key = 'last_full_integrity_check'"
        )
        .fetch_optional(&self.db)
        .await?;

        if let Some(last_check_str) = last_check {
            let last_check_time = chrono::DateTime::parse_from_rfc3339(&last_check_str)?;
            let days_since = (Utc::now() - last_check_time).num_days();
            Ok(days_since >= 7) // Run weekly
        } else {
            Ok(true) // Never run before
        }
    }

    /// Create database backup
    pub async fn create_backup(&self, reason: &str) -> Result<PathBuf> {
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
        let backup_name = format!("jobsentinel_backup_{}_{}.db", timestamp, reason);
        let backup_path = self.backup_dir.join(&backup_name);

        tracing::info!("Creating database backup: {}", backup_path.display());

        // SQLite VACUUM INTO (creates compact copy)
        let backup_path_str = backup_path.to_str().context("Invalid backup path")?;
        sqlx::query(&format!("VACUUM INTO '{}'", backup_path_str))
            .execute(&self.db)
            .await
            .context("Failed to create backup via VACUUM INTO")?;

        // Update metadata
        sqlx::query(
            "INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('last_backup', ?)"
        )
        .bind(Utc::now().to_rfc3339())
        .execute(&self.db)
        .await?;

        tracing::info!("Backup created successfully: {}", backup_path.display());
        Ok(backup_path)
    }

    /// Auto-backup before risky operations
    pub async fn backup_before_operation(&self, operation: &str) -> Result<PathBuf> {
        self.create_backup(&format!("pre_{}", operation)).await
    }

    /// Restore from backup
    pub async fn restore_from_backup(&self, backup_path: &Path) -> Result<()> {
        tracing::warn!("Restoring database from backup: {}", backup_path.display());

        // Close current connection
        self.db.close().await;

        // Get current db path
        let current_db_path = self.get_database_path()?;

        // Backup corrupted database for forensics
        let corrupted_backup = current_db_path.with_extension("db.corrupted");
        std::fs::rename(&current_db_path, &corrupted_backup)?;

        // Copy backup to main database location
        std::fs::copy(backup_path, &current_db_path)?;

        tracing::info!("Database restored successfully");
        tracing::info!("Corrupted database saved to: {}", corrupted_backup.display());

        Ok(())
    }

    fn get_database_path(&self) -> Result<PathBuf> {
        // Extract from connection string
        // TODO: Implement based on actual config
        Ok(PathBuf::from("./data/jobsentinel.db"))
    }

    /// Optimize database (VACUUM, ANALYZE)
    pub async fn optimize(&self) -> Result<()> {
        tracing::info!("Optimizing database...");

        // VACUUM: Rebuild database file (compact, defragment)
        sqlx::query("VACUUM")
            .execute(&self.db)
            .await
            .context("VACUUM failed")?;

        // ANALYZE: Update query planner statistics
        sqlx::query("ANALYZE")
            .execute(&self.db)
            .await
            .context("ANALYZE failed")?;

        tracing::info!("Database optimized ✅");
        Ok(())
    }

    /// Recover from corruption using sqlite3_recover API
    /// (Requires SQLite 3.37+, available since 2021)
    pub async fn recover_from_corruption(&self) -> Result<PathBuf> {
        tracing::error!("Attempting database recovery from corruption...");

        let corrupted_path = self.get_database_path()?;
        let recovered_path = corrupted_path.with_extension("db.recovered");

        // Use sqlite3 CLI tool for recovery
        // Alternatively: use .dump and re-import
        let output = tokio::process::Command::new("sqlite3")
            .arg(&corrupted_path)
            .arg(".recover")
            .output()
            .await
            .context("Failed to run sqlite3 .recover command")?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("Recovery command failed: {}",
                String::from_utf8_lossy(&output.stderr)));
        }

        // Write recovered SQL to new database
        let recovered_sql = String::from_utf8(output.stdout)?;
        std::fs::write(&recovered_path.with_extension("sql"), &recovered_sql)?;

        // Create new database from recovered SQL
        let new_db = sqlx::SqlitePool::connect(&format!("sqlite://{}", recovered_path.display()))
            .await?;

        sqlx::query(&recovered_sql)
            .execute(&new_db)
            .await
            .context("Failed to import recovered data")?;

        new_db.close().await;

        tracing::info!("Database recovered to: {}", recovered_path.display());
        Ok(recovered_path)
    }

    /// Clean up old backups (keep last N backups)
    pub async fn cleanup_old_backups(&self, keep_count: usize) -> Result<()> {
        let mut backups: Vec<_> = std::fs::read_dir(&self.backup_dir)?
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path()
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s == "db")
                    .unwrap_or(false)
            })
            .collect();

        // Sort by modification time (newest first)
        backups.sort_by_key(|entry| {
            entry
                .metadata()
                .and_then(|m| m.modified())
                .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
        });
        backups.reverse();

        // Delete old backups beyond keep_count
        for old_backup in backups.iter().skip(keep_count) {
            std::fs::remove_file(old_backup.path())?;
            tracing::info!("Deleted old backup: {}", old_backup.path().display());
        }

        Ok(())
    }
}

#[derive(Debug)]
pub struct CheckResult {
    pub is_ok: bool,
    pub message: String,
}

#[derive(Debug)]
pub enum IntegrityStatus {
    Healthy,
    Corrupted(String),
    ForeignKeyViolations(Vec<ForeignKeyViolation>),
}

#[derive(Debug)]
pub struct ForeignKeyViolation {
    pub table: String,
    pub rowid: i64,
    pub parent: String,
    pub fkid: i64,
}
```

---

### WAL Mode Configuration

WAL (Write-Ahead Logging) mode provides better crash recovery and concurrent read/write access.

```rust
// src-tauri/src/core/db/mod.rs

use sqlx::SqlitePool;
use anyhow::Result;

pub async fn initialize_database(db_path: &str) -> Result<SqlitePool> {
    let pool = SqlitePool::connect(&format!("sqlite://{}?mode=rwc", db_path)).await?;

    // Enable WAL mode for better crash recovery
    sqlx::query("PRAGMA journal_mode = WAL")
        .execute(&pool)
        .await?;

    // Enable foreign keys
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await?;

    // Set synchronous mode (balance between safety and speed)
    // FULL = safest, NORMAL = good balance, OFF = fastest but risky
    sqlx::query("PRAGMA synchronous = NORMAL")
        .execute(&pool)
        .await?;

    // Set busy timeout (wait up to 5 seconds for lock)
    sqlx::query("PRAGMA busy_timeout = 5000")
        .execute(&pool)
        .await?;

    // Enable auto_vacuum for automatic space reclamation
    sqlx::query("PRAGMA auto_vacuum = INCREMENTAL")
        .execute(&pool)
        .await?;

    // Set cache size (negative = KB, positive = pages)
    sqlx::query("PRAGMA cache_size = -64000") // 64MB cache
        .execute(&pool)
        .await?;

    Ok(pool)
}
```

---

### Metadata Table for Tracking

```sql
-- App metadata table for storing integrity check history
CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track integrity check history
CREATE TABLE IF NOT EXISTS integrity_check_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    check_type TEXT NOT NULL, -- 'quick', 'full', 'foreign_key'
    status TEXT NOT NULL, -- 'passed', 'failed'
    details TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track backup history
CREATE TABLE IF NOT EXISTS backup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_path TEXT NOT NULL,
    reason TEXT,
    size_bytes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### Automatic Backup Schedule

```rust
// src-tauri/src/core/db/backup_scheduler.rs

use tokio::time::{interval, Duration};
use super::integrity::DatabaseIntegrity;

pub struct BackupScheduler {
    db_integrity: DatabaseIntegrity,
}

impl BackupScheduler {
    pub fn new(db_integrity: DatabaseIntegrity) -> Self {
        Self { db_integrity }
    }

    /// Start automatic backup scheduler (runs in background)
    pub async fn start(&self) {
        let mut daily_interval = interval(Duration::from_secs(86400)); // 24 hours

        loop {
            daily_interval.tick().await;

            tracing::info!("Running scheduled daily backup...");

            match self.db_integrity.create_backup("daily_scheduled").await {
                Ok(backup_path) => {
                    tracing::info!("Daily backup created: {}", backup_path.display());

                    // Cleanup old backups (keep last 7 days)
                    if let Err(e) = self.db_integrity.cleanup_old_backups(7).await {
                        tracing::error!("Failed to cleanup old backups: {}", e);
                    }
                }
                Err(e) => {
                    tracing::error!("Daily backup failed: {}", e);
                }
            }

            // Also run weekly optimization
            if chrono::Utc::now().weekday() == chrono::Weekday::Sun {
                if let Err(e) = self.db_integrity.optimize().await {
                    tracing::error!("Database optimization failed: {}", e);
                }
            }
        }
    }
}
```

---

### Integration with App Startup

```rust
// src-tauri/src/main.rs or lib.rs

use crate::core::db::{initialize_database, integrity::DatabaseIntegrity, backup_scheduler::BackupScheduler};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize database
    let db = initialize_database("./data/jobsentinel.db").await?;

    // Create backup directory
    let backup_dir = std::path::PathBuf::from("./data/backups");
    let db_integrity = DatabaseIntegrity::new(db.clone(), backup_dir);

    // Run startup integrity check
    match db_integrity.startup_check().await? {
        IntegrityStatus::Healthy => {
            tracing::info!("Database is healthy ✅");
        }
        IntegrityStatus::Corrupted(msg) => {
            tracing::error!("Database corruption detected: {}", msg);

            // Attempt recovery
            let recovered_path = db_integrity.recover_from_corruption().await?;
            tracing::info!("Database recovered to: {}", recovered_path.display());

            // Prompt user to restart with recovered database
            return Err(anyhow::anyhow!(
                "Database was corrupted and has been recovered. Please restart the application."
            ));
        }
        IntegrityStatus::ForeignKeyViolations(violations) => {
            tracing::warn!("Foreign key violations detected: {} issues", violations.len());
            // Log violations but continue (non-critical)
            for v in violations {
                tracing::warn!("FK violation in {}: rowid={}", v.table, v.rowid);
            }
        }
    }

    // Create initial backup
    db_integrity.backup_before_operation("app_startup").await?;

    // Start backup scheduler in background
    let backup_scheduler = BackupScheduler::new(db_integrity.clone());
    tokio::spawn(async move {
        backup_scheduler.start().await;
    });

    // Continue with rest of app initialization...

    Ok(())
}
```

---

### Tauri Commands for User-Triggered Actions

```rust
// src-tauri/src/commands/database.rs

use crate::core::db::integrity::DatabaseIntegrity;
use tauri::State;
use anyhow::Result;

#[tauri::command]
pub async fn run_database_integrity_check(
    db_integrity: State<'_, DatabaseIntegrity>,
) -> Result<String, String> {
    let status = db_integrity
        .startup_check()
        .await
        .map_err(|e| e.to_string())?;

    match status {
        IntegrityStatus::Healthy => Ok("Database is healthy ✅".to_string()),
        IntegrityStatus::Corrupted(msg) => Err(format!("Database is corrupted: {}", msg)),
        IntegrityStatus::ForeignKeyViolations(v) => {
            Ok(format!("Warning: {} foreign key violations detected", v.len()))
        }
    }
}

#[tauri::command]
pub async fn create_manual_backup(
    db_integrity: State<'_, DatabaseIntegrity>,
) -> Result<String, String> {
    let backup_path = db_integrity
        .create_backup("user_manual")
        .await
        .map_err(|e| e.to_string())?;

    Ok(format!(
        "Backup created: {}",
        backup_path.display()
    ))
}

#[tauri::command]
pub async fn optimize_database(
    db_integrity: State<'_, DatabaseIntegrity>,
) -> Result<String, String> {
    db_integrity
        .optimize()
        .await
        .map_err(|e| e.to_string())?;

    Ok("Database optimized successfully".to_string())
}
```

---

### UI Component for Database Health

```typescript
// src/components/DatabaseHealth.tsx

import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export const DatabaseHealth: React.FC = () => {
  const [status, setStatus] = useState<string>('Unknown');
  const [checking, setChecking] = useState(false);

  const checkIntegrity = async () => {
    setChecking(true);
    try {
      const result = await invoke<string>('run_database_integrity_check');
      setStatus(result);
    } catch (error) {
      setStatus(`Error: ${error}`);
    } finally {
      setChecking(false);
    }
  };

  const createBackup = async () => {
    try {
      const result = await invoke<string>('create_manual_backup');
      alert(result);
    } catch (error) {
      alert(`Backup failed: ${error}`);
    }
  };

  const optimizeDb = async () => {
    try {
      const result = await invoke<string>('optimize_database');
      alert(result);
    } catch (error) {
      alert(`Optimization failed: ${error}`);
    }
  };

  return (
    <div className="database-health">
      <h3>Database Health</h3>
      <div className="status">
        <p>Status: {status}</p>
        <button onClick={checkIntegrity} disabled={checking}>
          {checking ? 'Checking...' : 'Check Integrity'}
        </button>
      </div>

      <div className="actions">
        <button onClick={createBackup}>Create Backup</button>
        <button onClick={optimizeDb}>Optimize Database</button>
      </div>
    </div>
  );
};
```

---

### Configuration Options

```json
// config.json - Database settings

{
  "database": {
    "integrity_checks": {
      "startup": true,
      "quick_check": true,
      "full_check_interval_days": 7
    },
    "backups": {
      "enabled": true,
      "automatic": true,
      "interval_hours": 24,
      "keep_count": 7,
      "backup_before_operations": ["migration", "bulk_delete", "app_startup"]
    },
    "optimization": {
      "auto_vacuum": true,
      "analyze_interval_days": 7
    },
    "wal_mode": {
      "enabled": true,
      "checkpoint_interval_minutes": 60
    }
  }
}
```

---

### Recovery Workflow (User-Facing)

1. **Corruption Detected:**
   - App shows error: "Database corruption detected"
   - Options: "Attempt Recovery" or "Restore from Backup"

2. **Attempt Recovery:**
   - Run `sqlite3 .recover` command
   - Show progress to user
   - If successful: "Database recovered, please restart"

3. **Restore from Backup:**
   - Show list of available backups with timestamps
   - User selects backup
   - Restore and restart

4. **Worst Case (No Backups):**
   - Export what's salvageable to JSON
   - Recreate database from scratch
   - Re-import JSON data

---

### Testing Strategy

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_integrity_check_healthy_database() {
        let db = create_test_db().await;
        let integrity = DatabaseIntegrity::new(db, PathBuf::from("/tmp"));

        let status = integrity.startup_check().await.unwrap();
        assert!(matches!(status, IntegrityStatus::Healthy));
    }

    #[tokio::test]
    async fn test_backup_creation() {
        let db = create_test_db().await;
        let backup_dir = PathBuf::from("/tmp/test_backups");
        let integrity = DatabaseIntegrity::new(db, backup_dir.clone());

        let backup_path = integrity.create_backup("test").await.unwrap();
        assert!(backup_path.exists());

        // Cleanup
        std::fs::remove_file(backup_path).ok();
    }

    #[tokio::test]
    async fn test_foreign_key_violation_detection() {
        let db = create_test_db().await;

        // Insert invalid foreign key
        sqlx::query("INSERT INTO applications (job_hash) VALUES ('invalid_hash')")
            .execute(&db)
            .await
            .unwrap();

        let integrity = DatabaseIntegrity::new(db, PathBuf::from("/tmp"));
        let violations = integrity.foreign_key_check().await.unwrap();

        assert!(!violations.is_empty());
    }
}
```

---

### Documentation for Users

Add to user documentation:

**Database Maintenance:**
- Automatic daily backups (kept for 7 days)
- Weekly optimization (VACUUM + ANALYZE)
- Startup integrity checks
- Manual backup anytime via Settings → Database → Create Backup

**Recovery Procedures:**
- If corruption detected, app will attempt auto-recovery
- Backups stored in `~/.config/jobsentinel/backups/`
- To manually restore: Settings → Database → Restore from Backup

---

### Success Metrics

- ✅ Zero data loss incidents
- ✅ Corruption detection rate: 100%
- ✅ Successful recovery rate: 95%+
- ✅ Backup creation time: <2 seconds
- ✅ Startup integrity check: <500ms (quick check)

---

### Future Enhancements

1. **Cloud Backup Sync** (optional, encrypted)
   - Auto-upload backups to user's S3/Google Drive
   - End-to-end encryption with user-controlled keys

2. **Replication** (for paranoid users)
   - Real-time replication to secondary database
   - Instant failover if primary fails

3. **Database Analytics**
   - Show database size trends over time
   - Query performance monitoring
   - Slow query detection

---

## 📅 IMPLEMENTATION TIMELINE

### Phase 1: Foundation (Months 1-3)
- Week 1-6: AI Resume-Job Matcher
- Week 7-8: Multi-Channel Notifications
- Week 9-12: Application Tracking System

### Phase 2: Automation (Months 4-6)
- Week 13-22: One-Click Apply Automation
- Week 23-24: Company Health Monitoring

### Phase 3: Expansion (Months 7-9)
- Week 25-32: LinkedIn/Indeed/Major Scrapers
- Week 33-36: Salary Negotiation AI

### Phase 4: Intelligence (Months 10-12)
- Week 37-40: Job Market Intelligence Dashboard
- Week 41-46: Browser Extension
- Week 47-48: Testing, polish, documentation

---

## 🧪 TESTING STRATEGY

### Unit Tests
- Resume parsing accuracy (90%+ skill extraction)
- Skill matching algorithm validation
- Database CRUD operations

### Integration Tests
- End-to-end application submission flow
- Multi-scraper job fetching
- Notification delivery to all channels

### User Acceptance Testing
- Beta program with 20-50 users
- Feedback surveys after each feature launch
- A/B testing for UI variations

---

## 📊 SUCCESS METRICS (6-Month Check-in)

| Metric | Target |
|--------|--------|
| Total jobs scraped | 5M+ |
| Application time reduction | 90% (15 min → 90 sec) |
| User retention (DAU/MAU) | 40% |
| Average applications/user/week | 20+ |
| Interview-to-application rate | Track baseline → 2x improvement |
| User satisfaction (NPS) | 50+ |

---

## 🚀 LAUNCH PLAN

1. **Alpha (Month 3)**: Internal testing, invite 10 power users
2. **Beta (Month 6)**: Public beta, 100-500 users, gather feedback
3. **v2.0 Launch (Month 9)**: Public release with Top 6 features
4. **v2.1 (Month 12)**: Complete Top 9, add remaining features

---

## 💡 NEXT STEPS

1. **Review & approve this roadmap**
2. **Set up project tracking** (GitHub Projects, Linear, Jira)
3. **Begin Phase 1: AI Resume-Job Matcher**
4. **Weekly check-ins** to track progress
5. **User feedback loops** after each feature

---

**Questions? Let's discuss priorities and start building!** 🚀
