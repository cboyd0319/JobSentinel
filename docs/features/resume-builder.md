# Resume Builder & ATS Optimizer

**Added in v2.0.0**

JobSentinel includes a full-featured resume builder and ATS (Applicant Tracking System) optimizer
to help you create professional, ATS-compatible resumes.

## Features Overview

### Resume Builder

A 7-step wizard that guides you through creating a professional resume:

1. **Contact Information** - Name, email, phone, location, LinkedIn, GitHub, website
2. **Professional Summary** - 2-3 sentence career overview
3. **Work Experience** - Add/edit/delete job entries with achievements
4. **Education** - Degrees, institutions, GPA, honors
5. **Skills** - Technical and soft skills with proficiency levels
6. **Preview & Template Selection** - Choose from 5 ATS-optimized templates
7. **Export** - Download as DOCX or view HTML preview

### ATS Templates

Five professionally designed templates optimized for ATS parsing:

| Template | Best For | Key Features |
|----------|----------|--------------|
| **Classic** | General use | Traditional chronological format |
| **Modern** | Tech companies | Clean design, subtle styling |
| **Technical** | Engineering roles | Skills-first layout |
| **Executive** | Senior positions | Summary-focused, leadership emphasis |
| **Military** | Veterans | Clearance section, civilian-friendly terms |

All templates follow ATS best practices:

- Single-column layout
- Standard fonts (Arial, Calibri, Times New Roman)
- No tables, graphics, or icons
- Clear section headers with proper hierarchy
- Machine-readable formatting

### ATS Optimizer

Analyze your resume against job descriptions for maximum ATS compatibility:

- **Keyword Analysis** - Extracts Required, Preferred, and Industry keywords from job descriptions
- **Format Scoring** - Checks for ATS compatibility issues
- **Completeness Scoring** - Ensures all important sections are filled
- **Suggestions** - Actionable recommendations to improve your resume
- **Bullet Point Improver** - Enhances achievement statements with power words

## Usage

### Creating a Resume

1. Navigate to **Resume Builder** from the sidebar
2. Follow the 7-step wizard, filling in each section
3. Your progress auto-saves after each step
4. In Step 6, preview your resume with different templates
5. In Step 7, export as DOCX for applications

### Optimizing for a Job

1. Navigate to **Resume Optimizer** from the sidebar
2. Paste the job description in the left panel
3. Enter your resume data (or use JSON format)
4. Click **Analyze** to get your ATS scores
5. Review keyword matches, missing keywords, and suggestions
6. Use the bullet improver to enhance achievement statements

## Scores Explained

The ATS Optimizer provides four scores:

| Score | Description | Good Range |
|-------|-------------|------------|
| **Overall** | Combined ATS compatibility | 80-100 |
| **Keywords** | Job description keyword matches | 70-100 |
| **Format** | ATS-safe formatting compliance | 90-100 |
| **Completeness** | All important sections present | 80-100 |

Color coding:

- 🟢 **Green (80-100)**: Excellent
- 🟡 **Yellow (60-79)**: Good
- 🟠 **Orange (40-59)**: Needs Work
- 🔴 **Red (0-39)**: Poor

## Power Words

The ATS Optimizer includes 45+ action verbs proven to improve resume impact:

**Leadership:** Led, Managed, Directed, Coordinated, Supervised

**Achievement:** Achieved, Delivered, Exceeded, Increased, Reduced

**Technical:** Developed, Engineered, Architected, Implemented, Optimized

**Analysis:** Analyzed, Assessed, Evaluated, Identified, Researched

**Communication:** Presented, Negotiated, Collaborated, Mentored, Facilitated

## Technical Details

### Backend Modules

- `builder.rs` - Resume data model and CRUD operations
- `templates.rs` - HTML template rendering
- `export.rs` - DOCX generation using docx-rs
- `ats_analyzer.rs` - Keyword extraction and scoring

### Frontend Components

- `ResumeBuilder.tsx` - 7-step wizard page
- `ResumeOptimizer.tsx` - ATS analysis page

### Database

Resumes are stored as JSON in the `resume_drafts` table:

```sql
CREATE TABLE resume_drafts (
    id INTEGER PRIMARY KEY,
    data TEXT NOT NULL,  -- JSON serialized ResumeData
    created_at TEXT,
    updated_at TEXT
);
```

### Tauri Commands

**Builder:**

- `create_resume_draft` - Create new empty draft
- `get_resume_draft` - Retrieve draft by ID
- `update_resume_contact` - Update contact info
- `update_resume_summary` - Update professional summary
- `add_resume_experience` - Add work experience
- `delete_resume_experience` - Remove work experience
- `add_resume_education` - Add education entry
- `delete_resume_education` - Remove education entry
- `set_resume_skills` - Set skills list
- `delete_resume_draft` - Delete draft

**Templates:**

- `list_resume_templates` - Get available templates
- `render_resume_html` - Render to HTML
- `render_resume_text` - Render to plain text

**Export:**

- `export_resume_docx` - Export to DOCX format
- `export_resume_text` - Export to plain text

**ATS Analysis:**

- `analyze_resume_for_job` - Analyze against job description
- `analyze_resume_format` - Check format compliance
- `extract_job_keywords` - Extract keywords from job description
- `get_ats_power_words` - Get list of action verbs
- `improve_bullet_point` - Enhance achievement statement

## Future Enhancements

- PDF export (currently stubbed)
- AI-powered content suggestions
- Resume version history
- Template customization
- Direct job application integration
