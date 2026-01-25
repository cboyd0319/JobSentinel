# Resume Builder & ATS Optimizer

**Create resumes that actually get past the robots.**

Most companies use software called "ATS" (Applicant Tracking Systems) to filter resumes
before a human ever sees them. JobSentinel helps you create resumes that pass these
filters and land on a recruiter's desk.

| Resume Builder | ATS Optimizer |
|----------------|---------------|
| ![Resume Builder](../images/resume-builder.png) | ![ATS Optimizer](../images/ats-optimizer.png) |

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

List your technical and soft skills:

- **Technical:** Python, AWS, Kubernetes, SQL, etc.
- **Soft skills:** Leadership, communication, project management
- Include proficiency levels if you want (expert, intermediate, etc.)

### Step 6: Preview

Choose from 5 ATS-friendly templates:

| Template | Best For |
|----------|----------|
| **Classic** | General use - works for any industry |
| **Modern** | Tech companies - clean and minimal |
| **Technical** | Engineering roles - skills first |
| **Executive** | Senior positions - leadership focus |
| **Military** | Veterans - civilian-friendly language |

All templates are designed to pass ATS filters:

- Single column (no tables that confuse robots)
- Standard fonts (no fancy stuff)
- Clear section headers
- No graphics or icons

### Step 7: Export

Download your resume as a Word document (.docx), ready to upload to any job application.

---

## ATS Optimizer

Already have a resume? Use the optimizer to see how it scores against a specific job.

### How It Works

1. Paste the job description
2. Enter your resume info
3. Click **Analyze**
4. Get instant feedback

### What You'll See

**Overall Score** - Your combined ATS compatibility (aim for 80+)

**Keyword Match** - How many job description keywords appear in your resume.
ATS systems look for specific terms - if they're not in your resume, you might
get filtered out.

**Format Score** - Is your resume ATS-friendly? Single column? Standard fonts?
Clear sections?

**Completeness** - Are all important sections filled in?

### Color Coding

- 🟢 **80-100** - Excellent! You're likely to pass ATS filters
- 🟡 **60-79** - Good, but could be better
- 🟠 **40-59** - Needs work - you might get filtered
- 🔴 **0-39** - Major issues - probably won't pass

---

## Keyword Matching

The optimizer extracts three types of keywords from job descriptions:

**Required Keywords** - Skills and qualifications explicitly mentioned as required.
These are must-haves - make sure they're in your resume.

**Preferred Keywords** - Nice-to-haves that give you bonus points.
Include if you have them.

**Industry Keywords** - Common terms in your field.
Shows you speak the language.

---

## Bullet Point Improver

Weak bullet points hurt your resume. The improver helps you write stronger ones.

**Before:**
> "Responsible for managing the security team"

**After:**
> "Led 12-person security team, reducing incident response time by 35%"

### Power Words

The optimizer suggests 45+ action verbs proven to improve resumes:

- **Leadership:** Led, Managed, Directed, Coordinated
- **Achievement:** Achieved, Delivered, Exceeded, Reduced
- **Technical:** Developed, Engineered, Architected, Implemented
- **Analysis:** Analyzed, Assessed, Evaluated, Identified

---

## Tips for Better Scores

1. **Mirror the job description** - Use the same words they use. If they say
   "Python", say "Python" (not "python programming language").

2. **Include numbers** - "Increased sales by 25%" beats "Increased sales."

3. **Use standard section headers** - "Experience" not "Professional Journey."

4. **Skip the graphics** - ATS can't read images, logos, or fancy formatting.

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

**ATS Analysis:**

- `analyze_resume_for_job`, `analyze_resume_format`
- `extract_job_keywords`, `get_ats_power_words`, `improve_bullet_point`

### Backend Files

- `builder.rs` - Resume data model and CRUD
- `templates.rs` - HTML template rendering
- `export.rs` - DOCX generation
- `ats_analyzer.rs` - Keyword extraction and scoring

</details>

---

**Version:** 2.6.3 | **Last Updated:** January 25, 2026
