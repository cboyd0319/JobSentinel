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

Build a readable resume in 7 steps:

### Step 1: Contact Info

Enter your basics:

- Name, email, phone, location
- Professional profile link, if you want to include one
- Portfolio, work samples, personal website, or credential page, if useful

### Step 2: Professional Summary

Write 2-3 sentences about who you are professionally. Think of it as your elevator pitch.

**Good example:**

> "Clinic operations coordinator with 8 years of experience managing patient
> scheduling, intake, and staff handoffs. Reduced missed appointments by 18%
> by improving reminder workflows across 6 locations."

### Step 3: Work Experience

Add your jobs, starting with the most recent. For each position:

- Job title
- Company name
- Start and end dates
- 3-5 bullet points highlighting achievements (not just duties)

Useful pattern: start each bullet with an action verb and include numbers when
possible.

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

1. Paste the job post
2. Add your resume details
3. Choose **Review Match**
4. Review job-post evidence, readability, and truthful edits

### What You'll See

**Overall Review** - Combined application readability and job-post alignment.

**Job-Post Language** - Which important role terms and evidence are clear in
your resume, and which ones need truthful support.

**Readability Score** - Single column, standard fonts, and clear sections.

**Completeness** - Are all important sections filled in?

### Review Labels

- **80-100** - Strong visible evidence
- **60-79** - Useful match with places to improve
- **40-59** - Several gaps worth reviewing
- **0-39** - Not enough evidence for careful tailoring yet

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

Vague bullet points make useful experience harder to see. The improver helps
you write clearer ones.

**Before:**

> "Responsible for handling appointment reminders"

**After:**

> "Coordinated daily appointment reminders for 300 patients, reducing missed
> visits by 18%"

### Action Words

JobSentinel suggests 45+ action verbs that can make resume bullets clearer:

- **Leadership:** Led, Managed, Directed, Coordinated
- **Achievement:** Achieved, Delivered, Exceeded, Reduced
- **Creation:** Created, Built, Designed, Launched
- **Analysis:** Analyzed, Assessed, Evaluated, Identified

---

## Tips for Better Alignment

1. **Use employer language truthfully** - If they say "customer intake" and you
   have that experience, use "customer intake" instead of a vague phrase.

2. **Include numbers** - "Increased sales by 25%" beats "Increased sales."

3. **Use standard section headers** - "Experience" not "Professional Journey."

4. **Skip the graphics** - Some upload previews and review tools cannot read
   images, logos, or fancy formatting.

5. **Keep it simple** - One column, standard fonts, clear hierarchy.

---

## Developer Details

<details>
<summary><strong>For developers and the curious</strong></summary>

### Local Storage Model

Resume drafts are saved locally in the `resume_drafts` table after each step.

### Tauri Commands

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

**Resume Review:**

- `analyze_resume_for_job`, `analyze_resume_format`
- `extract_job_keywords`, `get_ats_power_words`, `improve_bullet_point`

### Backend Files

- `builder.rs` - Resume data model and CRUD
- `templates.rs` - HTML template rendering
- `export.rs` - DOCX generation
- `ats_analyzer.rs` - Job-word extraction and readability scoring

</details>
