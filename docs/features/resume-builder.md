# Resume Builder & Resume Match

**Create readable, job-aligned resumes without giving up control.**

JobSentinel helps you create clear resumes and compare them with specific job posts.
It highlights where your evidence is strong, where important qualifications are
unclear, and where truthful edits could improve readability.

| Resume Builder                                  | Resume Match                                  |
| ----------------------------------------------- | --------------------------------------------- |
| ![Resume Builder](../images/resume-builder.png) | ![Resume Match](../images/ats-optimizer.png) |

---

## Resume Builder

Build a professional resume in 7 easy steps:

### Step 1: Contact Info

Enter your basics:

- Name, email, phone, location
- LinkedIn URL (highly recommended)
- GitHub, portfolio, or personal website (optional)

### Step 2: Professional Summary

Write 2-3 sentences about who you are professionally. Think of it as your elevator pitch.

**Good example:**

> "Security engineer with 8 years of experience protecting financial services
> infrastructure. Led incident response for a $50B+ organization and reduced
> security incidents by 40%."

### Step 3: Work Experience

Add your jobs, starting with the most recent. For each position:

- Job title
- Company name
- Start and end dates
- 3-5 bullet points highlighting achievements (not just duties)

**Pro tip:** Start each bullet with an action verb and include numbers when possible.

### Step 4: Education

Add your degrees:

- Degree name and field of study
- Institution name
- Graduation date
- GPA and honors (optional)

### Step 5: Skills

List skills that match the jobs you want:

- **Role-specific:** Content Strategy, Patient Care, Contract Negotiation, SQL
- **Workplace:** Leadership, communication, project management
- Include proficiency levels if you want (expert, intermediate, etc.)

### Step 6: Preview

Choose from 5 readable templates:

| Template           | Best For                              |
| ------------------ | ------------------------------------- |
| **Classic**        | General use - works for any industry  |
| **Modern**         | Clean and minimal presentation        |
| **Skills-First**   | Roles where skills matter most        |
| **Executive**      | Senior positions - leadership focus   |
| **Military**       | Veterans - civilian-friendly language |

All templates are designed for application readability:

- Single column for consistent upload previews
- Standard fonts
- Clear section headers
- No graphics or icons that distract from the content

### Step 7: Export

Download your resume as a Word document (.docx), ready to upload to any job application.

---

## Resume Match

Already have a resume? Use Resume Match to see how clearly it aligns with a
specific job post.

### How It Works

1. Paste the job description
2. Enter your resume info
3. Click **Analyze**
4. Get instant feedback

### What You'll See

**Overall Score** - Combined application readability and job-post alignment.

**Job-Post Language** - Which important role terms and evidence are clear in
your resume, and which ones need truthful support.

**Readability Score** - Single column, standard fonts, and clear sections.

**Completeness** - Are all important sections filled in?

### Color Coding

- **80-100** - Strong alignment
- **60-79** - Useful match with places to improve
- **40-59** - Several gaps worth reviewing
- **0-39** - Poor fit for your current resume

---

## Job-Post Evidence Matching

Resume Match groups important job-post language into three buckets:

**Required Qualifications** - Skills and qualifications explicitly listed as required.
Add them only when they are true for your background.

**Preferred Qualifications** - Nice-to-haves that can strengthen fit.
Include them when you have real evidence.

**Role Language** - Common terms for the role or field.
Use familiar wording when it accurately describes your experience.

---

## Bullet Point Improver

Weak bullet points hurt your resume. The improver helps you write stronger ones.

**Before:**

> "Responsible for managing the security team"

**After:**

> "Led 12-person security team, reducing incident response time by 35%"

### Action Words

JobSentinel suggests 45+ action verbs that can make resume bullets clearer:

- **Leadership:** Led, Managed, Directed, Coordinated
- **Achievement:** Achieved, Delivered, Exceeded, Reduced
- **Creation:** Developed, Built, Designed, Implemented
- **Analysis:** Analyzed, Assessed, Evaluated, Identified

---

## Tips for Better Alignment

1. **Use employer language truthfully** - If they say "Python" and you have
   Python experience, use "Python" instead of a vague phrase.

2. **Include numbers** - "Increased sales by 25%" beats "Increased sales."

3. **Use standard section headers** - "Experience" not "Professional Journey."

4. **Skip the graphics** - Some upload previews and review tools cannot read
   images, logos, or fancy formatting.

5. **Keep it simple** - One column, standard fonts, clear hierarchy.

---

## Technical Details

<details>
<summary><strong>For developers and the curious</strong></summary>

### Database

Resumes are stored as JSON in the `resume_drafts` table, auto-saved after each step.

### Tauri Commands (22 total)

**Builder:**

- `create_resume_draft`, `get_resume_draft`, `delete_resume_draft`
- `update_resume_contact`, `update_resume_summary`
- `add_resume_experience`, `delete_resume_experience`
- `add_resume_education`, `delete_resume_education`
- `set_resume_skills`

**Templates:**

- `list_resume_templates`, `render_resume_html`, `render_resume_text`

**Export:**

- `export_resume_docx`, `export_resume_text`

**Resume Analysis:**

- `analyze_resume_for_job`, `analyze_resume_format`
- `extract_job_keywords`, `get_ats_power_words`, `improve_bullet_point`

### Backend Files

- `builder.rs` - Resume data model and CRUD
- `templates.rs` - HTML template rendering
- `export.rs` - DOCX generation
- `ats_analyzer.rs` - Keyword extraction and scoring

</details>
