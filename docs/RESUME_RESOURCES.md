# Resume Resources & Best Practices

This guide helps you create an ATS-optimized resume that maximizes your chances of getting past automated screening systems.

---

## ⚠️ Important: Update Your Resume First

Before using the resume scanner, make sure your resume is current and well-formatted. An outdated or poorly formatted resume will give you inaccurate results.

**If your resume is outdated:**
1. Review the resources below
2. Update your resume with your latest experience and skills
3. Then run the ATS scanner to optimize it

---

## Quick Start: Resume Scanner

Once your resume is ready, scan it for ATS compatibility:

```bash
# Basic scan
python -m utils.ats_scanner path/to/your/resume.pdf

# Scan against a job description
python -m utils.ats_scanner path/to/your/resume.pdf job_description.txt software_engineering

# Generate markdown report
python -m utils.ats_scanner path/to/your/resume.pdf job_description.txt software_engineering markdown
```

**Industries supported:**
- `software_engineering`
- `data_science`
- `cybersecurity`
- `cloud_engineering`

---

## Free Resume Templates

### ATS-Friendly Templates

These templates are specifically designed to pass ATS systems:

1. **Google Docs Templates** (Free, ATS-friendly)
   - [Google Docs Resume Gallery](https://docs.google.com/document/u/0/?ftv=1&tgif=d)
   - Look for "Simple" or "Professional" templates
   - **Why:** Clean formatting, no graphics, ATS-safe fonts

2. **Microsoft Word Templates** (Free, built-in)
   - Open Word → File → New → Search "Resume"
   - Choose "Simple" or "Basic" templates
   - **Why:** Standard formatting, widely compatible

3. **Canva Free Templates** (Free, but use carefully)
   - [Canva Resume Templates](https://www.canva.com/resumes/templates/)
   - **Important:** Export as PDF with text (not image)
   - Filter by "Simple" design
   - **Why:** Modern look, but avoid graphic-heavy designs

4. **Novoresume** (Free tier available)
   - [Novoresume](https://novoresume.com/)
   - ATS-optimized templates
   - **Why:** Specifically designed for ATS compatibility

5. **Resume.io** (Free version available)
   - [Resume.io](https://resume.io/)
   - Clean, professional templates
   - **Why:** Simple, effective, ATS-safe

### Template Selection Criteria

Choose a template that:
- ✅ Uses single-column layout (not multi-column)
- ✅ Uses standard fonts (Arial, Calibri, Times New Roman)
- ✅ Has clear section headers
- ✅ Uses simple bullet points (not graphics)
- ✅ Exports as text-based PDF (not image)

Avoid templates with:
- ❌ Tables or text boxes
- ❌ Images, graphics, or icons
- ❌ Headers and footers with critical info
- ❌ Multiple columns
- ❌ Fancy fonts or decorative elements

---

## Resume Writing Guides

### Comprehensive Guides

1. **Indeed Resume Guide**
   - [How to Write a Resume](https://www.indeed.com/career-advice/resumes-cover-letters/how-to-make-a-resume-with-examples)
   - Free, comprehensive, with examples
   - Covers all sections and best practices

2. **The Muse Resume Guide**
   - [Resume Tips](https://www.themuse.com/advice/the-ultimate-resume-guide)
   - Detailed advice for every section
   - Industry-specific tips

3. **Harvard Resume Guide** (PDF)
   - [Harvard Resume Guide](https://hwpi.harvard.edu/files/ocs/files/hes-resume-cover-letter-guide.pdf)
   - Academic and professional standards
   - Excellent for formatting guidance

4. **Google's Resume Tips**
   - [Google Career Certificates Resume Guide](https://grow.google/certificates/resume-tips/)
   - Tech-focused advice
   - Real examples from Google recruiters

### ATS-Specific Guides

1. **Jobscan Blog**
   - [ATS Resume Guide](https://www.jobscan.co/blog/ats-resume/)
   - Deep dive into ATS systems
   - How to optimize for scanning

2. **TopResume ATS Guide**
   - [Beat the ATS](https://www.topresume.com/career-advice/what-is-an-ats-resume)
   - ATS-friendly formatting tips
   - Common mistakes to avoid

---

## Resume Sections Guide

### Essential Sections (Must Have)

#### 1. Contact Information
**Location:** Top of resume

**Include:**
- Full name (larger font)
- Phone number (professional voicemail)
- Email address (professional, not cutesy)
- LinkedIn profile URL (optional but recommended)
- Portfolio/GitHub URL (for tech roles)

**Format:**
```
John Doe
john.doe@email.com | (555) 123-4567 | linkedin.com/in/johndoe
```

**ATS Tips:**
- Don't put contact info in header/footer (ATS may not read it)
- Use a professional email (firstname.lastname@email.com)
- Include area code in phone number

---

#### 2. Professional Summary (Optional but Recommended)

**Location:** Just below contact info

**Length:** 2-4 sentences or 3-5 bullet points

**Purpose:** Elevator pitch highlighting your key qualifications

**Format:**
```
PROFESSIONAL SUMMARY

Results-driven Software Engineer with 5+ years of experience building scalable
web applications using Python, React, and AWS. Proven track record of reducing
system latency by 40% and leading cross-functional teams. Seeking to leverage
cloud architecture expertise to drive innovation at [Company].
```

**ATS Tips:**
- Include keywords from the job description
- Use industry-standard titles
- Quantify achievements (numbers stand out)

---

#### 3. Work Experience (Most Important)

**Location:** After summary

**Format for each role:**
```
WORK EXPERIENCE

Software Engineer | Tech Company, Inc. | Jan 2020 - Present
• Led development of microservices architecture serving 2M+ users daily
• Reduced API response time by 45% through database optimization
• Mentored 3 junior developers on best practices and code review

Junior Developer | Startup Co. | Jun 2018 - Dec 2019
• Built RESTful APIs using Python/Flask for internal tools
• Improved test coverage from 30% to 85%
• Collaborated with UX team to implement responsive design
```

**Best Practices:**
- **Reverse chronological order** (most recent first)
- **Use action verbs:** Achieved, Led, Developed, Implemented, Improved
- **Quantify results:** "Increased sales by 30%" not "Increased sales"
- **Focus on achievements, not duties:** What did you accomplish?
- **Tailor to job description:** Match keywords and skills

**Action Verbs by Category:**

*Leadership:*
- Led, Managed, Directed, Coordinated, Supervised, Mentored

*Achievement:*
- Achieved, Exceeded, Delivered, Accomplished, Attained

*Improvement:*
- Improved, Enhanced, Optimized, Streamlined, Increased, Reduced

*Creation:*
- Developed, Created, Built, Designed, Engineered, Implemented

*Analysis:*
- Analyzed, Evaluated, Assessed, Investigated, Researched

**ATS Tips:**
- Use standard job titles (ATS searches for these)
- Include company names and dates
- Use bullet points (ATS-friendly)
- Spell out acronyms first time: "Continuous Integration/Continuous Deployment (CI/CD)"

---

#### 4. Education

**Location:** After work experience (unless recent graduate, then before)

**Format:**
```
EDUCATION

Bachelor of Science in Computer Science | 2018
University of California, Berkeley | GPA: 3.8/4.0

Relevant Coursework: Data Structures, Algorithms, Machine Learning, Databases
```

**Include:**
- Degree type and major
- University name
- Graduation year (or expected year)
- GPA (if 3.5+)
- Relevant coursework (if recent grad or changing careers)

**ATS Tips:**
- Spell out degree: "Bachelor of Science" not "B.S."
- Include graduation year (ATS looks for this)
- List most recent education first

---

#### 5. Skills

**Location:** After education or near top if highly relevant

**Format (preferred for ATS):**
```
TECHNICAL SKILLS

Languages: Python, JavaScript, Java, SQL, Bash
Frameworks: React, Node.js, Django, Flask, FastAPI
Cloud/DevOps: AWS (EC2, S3, Lambda), Docker, Kubernetes, Terraform, CI/CD
Databases: PostgreSQL, MySQL, MongoDB, Redis
Tools: Git, JIRA, Confluence, Datadog, Grafana
```

**ATS Tips:**
- **Use exact keywords** from job description
- **Don't rate skills** (e.g., "Python - Expert") - ATS can't interpret this
- **Group by category** for readability
- **Include both spelled-out and acronyms:** "Continuous Integration/Continuous Deployment (CI/CD)"
- **List skills in order of relevance** to job

**Common Skill Categories:**
- Programming Languages
- Frameworks & Libraries
- Cloud Platforms & DevOps
- Databases & Data Tools
- Methodologies (Agile, Scrum, etc.)
- Soft Skills (Communication, Leadership, etc.)

---

### Optional Sections (Add if Relevant)

#### 6. Certifications

**Format:**
```
CERTIFICATIONS

AWS Certified Solutions Architect - Associate | 2024
Certified Kubernetes Administrator (CKA) | 2023
Google Cloud Professional Cloud Architect | 2023
```

**ATS Tips:**
- Use official certification names
- Include issuing organization
- Include dates (shows currency)

---

#### 7. Projects (Great for Career Changers or Recent Grads)

**Format:**
```
PROJECTS

E-Commerce Platform | github.com/user/project
• Built full-stack application using React, Node.js, and PostgreSQL
• Implemented payment processing with Stripe API
• Deployed to AWS using Docker and ECS

Personal Portfolio Site | portfolio.com
• Designed and developed responsive portfolio using Next.js
• Achieved 95+ Lighthouse performance score
• Integrated headless CMS for blog content
```

**ATS Tips:**
- Include project name and link
- Describe your role and technologies used
- Highlight measurable outcomes

---

## ATS Optimization Checklist

Before submitting your resume, verify:

### Formatting
- [ ] **Single-column layout** (no tables or text boxes)
- [ ] **Standard fonts:** Arial, Calibri, Times New Roman, Georgia
- [ ] **Font size:** 10-12pt for body, 14-16pt for name
- [ ] **Standard section headers:** WORK EXPERIENCE, EDUCATION, SKILLS
- [ ] **File format:** PDF with selectable text (not image-based)
- [ ] **File name:** FirstName_LastName_Resume.pdf
- [ ] **Margins:** 0.5-1 inch on all sides
- [ ] **No headers/footers** with critical information
- [ ] **No images, graphics, or logos**

### Content
- [ ] **Contact info at top** (not in header)
- [ ] **Email and phone number** included
- [ ] **Keywords from job description** incorporated naturally
- [ ] **Action verbs** start each bullet point
- [ ] **Quantified achievements** with numbers and percentages
- [ ] **No typos or grammatical errors**
- [ ] **Consistent formatting** (dates, bullets, spacing)
- [ ] **Acronyms spelled out** on first use
- [ ] **Standard job titles** (avoid internal company jargon)

### Length
- [ ] **1 page** for < 10 years experience
- [ ] **2 pages max** for > 10 years experience
- [ ] **No more than 800 words** total

---

## Using the ATS Scanner

The ATS scanner in this project provides:

1. **Overall ATS Score** (0-100)
2. **Formatting Analysis** - Checks for ATS-problematic elements
3. **Keyword Optimization** - Compares to job description
4. **Section Detection** - Verifies all standard sections present
5. **Readability Score** - Ensures proper structure

### How to Use

1. **Prepare your resume:**
   - Update with latest experience
   - Format using ATS-safe template
   - Save as PDF (text-based, not image)

2. **Optional: Prepare job description:**
   - Copy job description to a text file
   - Include full JD with requirements and qualifications

3. **Run the scanner:**
   ```bash
   python -m utils.ats_scanner your_resume.pdf job_description.txt software_engineering
   ```

4. **Review the report:**
   - Check overall score (aim for 80+)
   - Fix CRITICAL issues immediately
   - Address WARNINGS if possible
   - Implement recommendations

5. **Iterate:**
   - Make suggested changes
   - Re-run scanner
   - Repeat until score is 80+

---

## Common ATS Mistakes to Avoid

### 1. Using Tables or Text Boxes
**Problem:** ATS can't parse them correctly
**Fix:** Use simple text formatting with bullet points

### 2. Fancy Fonts or Design Elements
**Problem:** ATS can't read decorative fonts
**Fix:** Stick to Arial, Calibri, Times New Roman

### 3. Images and Graphics
**Problem:** ATS sees them as blank space
**Fix:** Remove all images, icons, and graphics

### 4. Headers and Footers
**Problem:** ATS often skips them
**Fix:** Put all critical info in the main body

### 5. Using Acronyms Only
**Problem:** ATS searches for both acronym and full term
**Fix:** Spell out first use: "Search Engine Optimization (SEO)"

### 6. Creative Section Names
**Problem:** ATS looks for standard sections
**Fix:** Use "WORK EXPERIENCE" not "My Journey"

### 7. PDFs as Images
**Problem:** ATS can't extract text
**Fix:** Save as text-based PDF (test by trying to select text)

### 8. Keyword Stuffing
**Problem:** Makes resume unreadable for humans
**Fix:** Integrate keywords naturally in context

### 9. Missing Contact Information
**Problem:** Recruiter can't reach you
**Fix:** Include phone, email, LinkedIn at top

### 10. Inconsistent Formatting
**Problem:** Looks unprofessional and confuses ATS
**Fix:** Use same date format, bullet style, font size throughout

---

## Resume Improvement Workflow

1. **Assess current resume**
   - Run ATS scanner
   - Note score and issues

2. **Update content**
   - Add recent experience
   - Remove outdated info
   - Quantify achievements

3. **Fix critical issues**
   - Remove tables/text boxes
   - Fix formatting problems
   - Add missing sections

4. **Optimize keywords**
   - Review job description
   - Add relevant keywords naturally
   - Don't keyword stuff

5. **Re-scan**
   - Run ATS scanner again
   - Verify score improved
   - Check for new issues

6. **Get human feedback**
   - Ask friend/colleague to review
   - Check for clarity and readability
   - Ensure achievements are compelling

7. **Final polish**
   - Proofread for typos
   - Verify consistent formatting
   - Test PDF is text-selectable

---

## Additional Resources

### Free Tools

1. **Jobscan** (Limited free scans)
   - [jobscan.co](https://www.jobscan.co/)
   - Compare resume to job description
   - Get ATS score and recommendations

2. **Resume Worded** (Free tier)
   - [resumeworded.com](https://resumeworded.com/)
   - AI-powered feedback
   - Score and improvement suggestions

3. **Grammarly** (Free version)
   - [grammarly.com](https://www.grammarly.com/)
   - Check grammar and spelling
   - Improve clarity and conciseness

### Books & Guides

1. **"Modernize Your Resume" by Wendy Enelow & Louise Kursmark**
   - Comprehensive resume writing guide
   - ATS optimization strategies

2. **"The Resume Writing Guide" by Lisa McGrimmon**
   - Free online guide
   - [The Resume Writing Guide](https://www.thebalancecareers.com/)

### Video Tutorials

1. **Indeed Career Guide** (YouTube)
   - Resume writing tips
   - ATS optimization

2. **LinkedIn Learning** (Free trial)
   - Resume writing courses
   - Career development

---

## FAQ

### Q: How long should my resume be?

**A:**
- **< 10 years experience:** 1 page
- **10+ years experience:** 1-2 pages max
- **Academic/Research roles:** Can be longer (CV format)

### Q: Should I include my photo?

**A:** No (in the US). It can cause ATS parsing issues and introduces bias.

### Q: What file format should I use?

**A:** PDF with selectable text. Test by opening and trying to highlight text. If you can't select it, it's an image-based PDF (bad for ATS).

### Q: Should I include references?

**A:** No. "References available upon request" is outdated. Save space for achievements.

### Q: How do I handle employment gaps?

**A:** Be honest. If gap was for valid reasons (education, caregiving, health), you can briefly mention in cover letter. Focus on skills maintained during gap.

### Q: Should I customize my resume for each job?

**A:** Yes! At minimum:
- Adjust professional summary
- Reorder/emphasize relevant skills
- Highlight relevant experience
- Match keywords from job description

### Q: What if I'm changing careers?

**A:**
- Emphasize transferable skills
- Include relevant projects (even personal ones)
- Consider a skills-based or combination format
- Write a strong summary explaining transition

---

## Need Help?

If you need personalized resume help:

1. **Run the ATS scanner** (free, in this project)
2. **Career counseling** (many universities offer alumni services)
3. **Professional resume writers** (paid, but can be worth it)
4. **r/resumes on Reddit** (free community feedback)

---

**Remember:** The best resume is truthful, clear, and tailored to the job. ATS optimization helps you get past the bots, but compelling content gets you the interview!
