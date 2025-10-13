# Job Tracker / CRM Guide

**Track your job applications from bookmark to offer with a visual Kanban board.**

---

## Overview

The Job Tracker is JobSentinel's CRM (Customer Relationship Management) system for managing job applications. Think of it as your personal job search dashboard - track applications, manage contacts, store documents, and review your timeline all in one place.

### Key Features

- 📋 **Kanban Board** - Visual workflow: Bookmarked → Applied → Interviewing → Offer
- ⭐ **Priority Levels** - Star jobs from 1-5 to focus on what matters
- 👥 **Contact Management** - Track recruiters, hiring managers, and employee connections
- 📄 **Document Storage** - Attach resumes, cover letters, and offer letters
- 📅 **Activity Timeline** - Automatic history of all changes and actions
- 🎨 **Drag & Drop** - Move jobs between stages with your mouse

---

## Getting Started

### 1. Access the Tracker

Start JobSentinel web UI:

```bash
python -m jsa.cli web
```

Navigate to: **http://localhost:5000/tracker/**

### 2. Add Your First Job

**From Web UI:**
1. Find a job in the Dashboard or Review Jobs page
2. Click "Add to Tracker"
3. Select initial status (usually "Bookmarked")
4. Set priority (1-5 stars)
5. Add optional notes
6. Click "Save"

**From Browser Extension:**
1. Install the browser extension (see `extension/README.md`)
2. Navigate to a job posting on LinkedIn, Indeed, Glassdoor, etc.
3. Click the JobSentinel extension icon
4. Review auto-filled details
5. Set status and priority
6. Click "Save Job"

**From API:**
```bash
curl -X POST http://localhost:5000/api/v1/tracker/jobs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "job_id": 123,
    "status": "bookmarked",
    "priority": 4,
    "notes": "Great match for my skills"
  }'
```

### 3. Organize Your Pipeline

The tracker uses a **Kanban workflow**:

```
📌 Bookmarked  →  ✉️ Applied  →  💼 Interviewing  →  🎉 Offer
```

**Move jobs between stages:**
- **Drag & Drop**: Click and drag a job card to a new column
- **API**: PATCH `/api/v1/tracker/jobs/{id}/status`
- **Web UI**: Click job → Change status dropdown

---

## Status Stages

### 📌 Bookmarked
**Purpose:** Jobs you're interested in but haven't applied yet  
**Actions:**
- Research the company
- Tailor your resume
- Prepare cover letter
- Connect with employees on LinkedIn

**Move to "Applied" when:** You submit your application

### ✉️ Applied
**Purpose:** Applications submitted, waiting for response  
**Actions:**
- Follow up after 1-2 weeks if no response
- Continue applying to other jobs
- Prepare for potential interviews

**Move to "Interviewing" when:** You receive an interview invitation

### 💼 Interviewing
**Purpose:** Active interview process  
**Actions:**
- Schedule interviews
- Research interviewers on LinkedIn
- Prepare questions and answers
- Send thank-you emails after each round

**Move to "Offer" when:** You receive a job offer

### 🎉 Offer
**Purpose:** Job offers received  
**Actions:**
- Evaluate compensation package
- Negotiate if appropriate
- Compare multiple offers
- Make decision by deadline

**Final outcomes:**
- Accept offer (archive or mark complete)
- Decline offer (mark as "Withdrawn")

### ❌ Rejected / Withdrawn
**Purpose:** Applications that didn't work out  
**Actions:**
- Review what you learned
- Request feedback if possible
- Keep contact information for future opportunities

---

## Priority System

Use **stars (⭐)** to prioritize jobs:

| Priority | Meaning | Use For |
|----------|---------|---------|
| 5 stars ⭐⭐⭐⭐⭐ | **Dream Job** | Perfect match, top companies, urgent deadlines |
| 4 stars ⭐⭐⭐⭐ | **High Priority** | Strong match, good companies, reasonable deadlines |
| 3 stars ⭐⭐⭐ | **Good Match** | Decent fit, might need tailoring |
| 2 stars ⭐⭐ | **Backup** | Acceptable but not ideal |
| 1 star ⭐ | **Low Interest** | Just exploring, might skip |

**Pro Tip:** Focus on 5-star and 4-star jobs first. Don't spread yourself too thin.

---

## Contact Management

Track people you interact with during the job search:

### Adding Contacts

```python
# Via API
POST /api/v1/tracker/jobs/{id}/contacts
{
  "name": "Jane Smith",
  "email": "jane.smith@company.com",
  "role": "recruiter",
  "phone": "+1-555-123-4567",
  "linkedin_url": "https://linkedin.com/in/janesmith",
  "notes": "Initial contact, very responsive"
}
```

### Contact Roles

- **recruiter** - External or internal recruiter
- **hiring_manager** - Person who would be your boss
- **employee** - Current employee (referral, informational interview)
- **other** - Anyone else relevant

### Best Practices

1. **Always get names and emails** during interviews
2. **Connect on LinkedIn** after first contact
3. **Send thank-you notes** within 24 hours
4. **Log all interactions** in activity timeline
5. **Keep notes professional** - they're part of your record

---

## Document Management

Attach files to jobs (resumes, cover letters, offers):

### Supported Document Types

- **resume** - Your tailored resume for this application
- **cover_letter** - Cover letter for this application
- **offer** - Job offer letter (PDF)
- **other** - Any other relevant documents

### Adding Documents

```python
# Via API
POST /api/v1/tracker/jobs/{id}/documents
{
  "filename": "resume_software_engineer_acme.pdf",
  "doc_type": "resume",
  "file_path": "data/documents/resume_software_engineer_acme.pdf"
}
```

### Best Practices

1. **Name files clearly**: `resume_[role]_[company].pdf`
2. **Version your resumes**: Track which version you sent where
3. **Keep originals**: Don't delete old versions
4. **Back up offers**: Save all offer letters for future reference

---

## Activity Timeline

Every action is automatically logged:

- **Job added** - When you first bookmark a job
- **Status changed** - When you move to new stage
- **Priority changed** - When you adjust stars
- **Contact added** - When you add a new person
- **Document uploaded** - When you attach files
- **Notes updated** - When you modify notes

### Viewing Timeline

Access via:
- **Web UI**: Click job → "Activity" tab
- **API**: GET `/api/v1/tracker/jobs/{id}/activities`

---

## Export & Backup

### CSV Export

```bash
# Coming soon
python -m jsa.cli tracker export --format csv --output jobs.csv
```

### JSON Export

```bash
# Coming soon
python -m jsa.cli tracker export --format json --output jobs.json
```

### Database Backup

```bash
# Full database backup
cp data/jobs.db data/jobs_backup_$(date +%Y%m%d).db
```

---

## Pro Tips

### 1. Daily Routine

Start each day by:
1. Review "Bookmarked" - Pick 3-5 to apply today
2. Check "Applied" - Follow up on old applications
3. Prepare for "Interviewing" - Research today's interviews

### 2. Weekly Review

Every Sunday:
1. **Archive old jobs** (rejected, >30 days no response)
2. **Add new bookmarks** from job boards
3. **Update priorities** based on deadlines
4. **Review what worked** - which jobs got responses?

### 3. Batch Processing

- **Research Day** (Monday): Research 10-15 companies, bookmark best jobs
- **Application Day** (Tuesday/Wednesday): Apply to 3-5 priority jobs
- **Follow-up Day** (Thursday): Email follow-ups for applied jobs
- **Interview Prep** (Friday): Prepare for next week's interviews

### 4. Stay Organized

- ✅ **Update immediately** after any action (call, email, interview)
- ✅ **Use consistent naming** for documents
- ✅ **Set reminders** for follow-ups (use external calendar)
- ✅ **Keep notes brief** but informative
- ✅ **Archive regularly** to keep board clean

### 5. Avoid Common Mistakes

- ❌ Don't let jobs sit in "Applied" forever - follow up or archive
- ❌ Don't apply to jobs you wouldn't actually take
- ❌ Don't forget to add contacts - they're valuable for future networking
- ❌ Don't skip notes - "Why did I apply here?" is a good question later
- ❌ Don't neglect priority updates - priorities change as you learn more

---

## Troubleshooting

### Job not showing in tracker?
- Check if it was added to tracker (vs just saved to database)
- Refresh the page
- Check browser console for errors

### Drag & drop not working?
- Make sure JavaScript is enabled
- Try refreshing the page
- Check if you're on a supported browser (Chrome, Firefox, Edge, Safari)

### Lost data?
- Check `data/jobs.db` - it should be there
- Restore from backup if you have one
- Contact support with details

---

## API Reference

### Tracker Endpoints

```
GET    /api/v1/tracker/jobs              # List all tracked jobs
POST   /api/v1/tracker/jobs              # Add job to tracker
GET    /api/v1/tracker/jobs/{id}         # Get tracked job
PATCH  /api/v1/tracker/jobs/{id}/status  # Update status
PATCH  /api/v1/tracker/jobs/{id}/priority # Update priority
PATCH  /api/v1/tracker/jobs/{id}/notes   # Update notes
POST   /api/v1/tracker/jobs/{id}/contacts # Add contact
POST   /api/v1/tracker/jobs/{id}/documents # Add document
GET    /api/v1/tracker/jobs/{id}/activities # Get timeline
```

See full API documentation: `docs/API_SPECIFICATION.md`

---

## Next Steps

- **Set up browser extension** - `extension/README.md`
- **Explore analytics** - Track conversion rates (coming soon)
- **Integrate calendar** - Sync interviews to Google Calendar (coming soon)

---

**Questions?** Open an issue on GitHub or check the main documentation.
