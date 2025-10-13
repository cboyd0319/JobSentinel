# Implementation Guide: Top 3 Missing Features

**Quick Reference for Developers**  
**Goal:** Add Job Tracker, Browser Extension, and REST API  
**Time:** 8-12 weeks with 1-2 developers  
**Impact:** 5-10x user adoption

---

## Feature 1: Job Tracker / CRM (Weeks 1-3)

### Architecture

```
src/jsa/tracker/
├── __init__.py
├── models.py           # SQLModel/Pydantic models
├── service.py          # Business logic layer
├── db.py               # Database operations
└── web/
    ├── __init__.py
    ├── blueprints/
    │   └── tracker.py  # Flask routes
    ├── templates/
    │   ├── board.html  # Kanban board
    │   └── detail.html # Job detail view
    └── static/
        ├── tracker.css
        └── tracker.js  # Alpine.js interactions
```

### Database Schema

```python
# src/jsa/tracker/models.py
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional
from enum import Enum

class JobStatus(str, Enum):
    BOOKMARKED = "bookmarked"
    APPLIED = "applied"
    INTERVIEWING = "interviewing"
    OFFER = "offer"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"

class TrackedJob(SQLModel, table=True):
    """Job in user's tracker"""
    __tablename__ = "tracked_jobs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="jobs.id")  # Links to existing jobs table
    status: JobStatus = Field(default=JobStatus.BOOKMARKED)
    priority: int = Field(default=0, ge=0, le=5)  # 0-5 stars
    notes: str = Field(default="")
    
    # Metadata
    added_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    applied_at: Optional[datetime] = None
    interview_at: Optional[datetime] = None
    
    # Relationships
    contacts: list["Contact"] = Relationship(back_populates="job")
    documents: list["Document"] = Relationship(back_populates="job")
    activities: list["Activity"] = Relationship(back_populates="job")

class Contact(SQLModel, table=True):
    """Recruiter, hiring manager, employee contact"""
    __tablename__ = "contacts"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="tracked_jobs.id")
    
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str = Field(default="recruiter")  # recruiter, hiring_manager, employee
    linkedin_url: Optional[str] = None
    notes: str = Field(default="")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    job: TrackedJob = Relationship(back_populates="contacts")

class Document(SQLModel, table=True):
    """Resume, cover letter, offer letter attachments"""
    __tablename__ = "documents"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="tracked_jobs.id")
    
    filename: str
    doc_type: str  # resume, cover_letter, offer, other
    file_path: str  # Relative path in user's data directory
    
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    
    job: TrackedJob = Relationship(back_populates="documents")

class Activity(SQLModel, table=True):
    """Timeline of actions (email sent, interview scheduled, etc.)"""
    __tablename__ = "activities"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="tracked_jobs.id")
    
    activity_type: str  # email_sent, interview_scheduled, offer_received, etc.
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    job: TrackedJob = Relationship(back_populates="activities")
```

### Service Layer

```python
# src/jsa/tracker/service.py
from typing import Optional
from sqlmodel import Session, select
from .models import TrackedJob, JobStatus, Contact, Document, Activity
from datetime import datetime

class TrackerService:
    """Business logic for job tracker"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def add_job(self, job_id: int, status: JobStatus = JobStatus.BOOKMARKED) -> TrackedJob:
        """Add job to tracker"""
        tracked_job = TrackedJob(job_id=job_id, status=status)
        self.session.add(tracked_job)
        self.session.commit()
        self.session.refresh(tracked_job)
        
        # Log activity
        self._add_activity(tracked_job.id, "job_added", f"Added to {status.value}")
        
        return tracked_job
    
    def update_status(self, tracked_job_id: int, new_status: JobStatus) -> TrackedJob:
        """Move job to new status"""
        job = self.session.get(TrackedJob, tracked_job_id)
        if not job:
            raise ValueError(f"Job {tracked_job_id} not found")
        
        old_status = job.status
        job.status = new_status
        job.updated_at = datetime.utcnow()
        
        # Update timestamps
        if new_status == JobStatus.APPLIED:
            job.applied_at = datetime.utcnow()
        elif new_status == JobStatus.INTERVIEWING:
            job.interview_at = datetime.utcnow()
        
        self.session.commit()
        self.session.refresh(job)
        
        # Log activity
        self._add_activity(job.id, "status_changed", 
                          f"Moved from {old_status.value} to {new_status.value}")
        
        return job
    
    def get_by_status(self, status: JobStatus) -> list[TrackedJob]:
        """Get all jobs with given status"""
        statement = select(TrackedJob).where(TrackedJob.status == status)
        return list(self.session.exec(statement))
    
    def add_contact(self, job_id: int, name: str, email: Optional[str] = None, 
                    role: str = "recruiter") -> Contact:
        """Add contact to job"""
        contact = Contact(job_id=job_id, name=name, email=email, role=role)
        self.session.add(contact)
        self.session.commit()
        
        self._add_activity(job_id, "contact_added", f"Added contact: {name} ({role})")
        
        return contact
    
    def _add_activity(self, job_id: int, activity_type: str, description: str):
        """Internal: log activity"""
        activity = Activity(job_id=job_id, activity_type=activity_type, 
                           description=description)
        self.session.add(activity)
        self.session.commit()
```

### Flask Routes

```python
# src/jsa/tracker/web/blueprints/tracker.py
from flask import Blueprint, render_template, request, redirect, url_for, jsonify
from jsa.db import get_session
from jsa.tracker.service import TrackerService
from jsa.tracker.models import JobStatus

tracker_bp = Blueprint('tracker', __name__, url_prefix='/tracker')

@tracker_bp.route('/')
def board():
    """Kanban board view"""
    session = get_session()
    service = TrackerService(session)
    
    # Group jobs by status
    jobs_by_status = {
        status: service.get_by_status(status) 
        for status in JobStatus
    }
    
    return render_template('tracker/board.html', jobs_by_status=jobs_by_status)

@tracker_bp.route('/job/<int:job_id>')
def job_detail(job_id: int):
    """Job detail view"""
    session = get_session()
    tracked_job = session.get(TrackedJob, job_id)
    if not tracked_job:
        return "Job not found", 404
    
    return render_template('tracker/detail.html', job=tracked_job)

@tracker_bp.route('/api/job/<int:job_id>/status', methods=['PATCH'])
def update_status(job_id: int):
    """Update job status (drag-and-drop)"""
    new_status = request.json.get('status')
    if not new_status:
        return jsonify({"error": "status required"}), 400
    
    try:
        session = get_session()
        service = TrackerService(session)
        job = service.update_status(job_id, JobStatus(new_status))
        return jsonify({"id": job.id, "status": job.status.value})
    except Exception as e:
        return jsonify({"error": str(e)}), 400
```

### Frontend (Kanban Board)

```html
<!-- src/jsa/tracker/web/templates/tracker/board.html -->
{% extends "base.html" %}

{% block content %}
<div class="kanban-board" x-data="kanbanBoard()">
  {% for status in ['bookmarked', 'applied', 'interviewing', 'offer'] %}
  <div class="kanban-column" data-status="{{ status }}">
    <h3>{{ status.title() }} ({{ jobs_by_status[status]|length }})</h3>
    
    <div class="kanban-cards" 
         @drop.prevent="dropJob($event, '{{ status }}')"
         @dragover.prevent>
      
      {% for job in jobs_by_status[status] %}
      <div class="kanban-card" 
           draggable="true"
           data-job-id="{{ job.id }}"
           @dragstart="dragStart($event)">
        
        <h4>{{ job.job.title }}</h4>
        <p>{{ job.job.company }}</p>
        <div class="card-meta">
          <span>⭐ {{ job.priority }}/5</span>
          <span>{{ job.added_at.strftime('%b %d') }}</span>
        </div>
        
        <a href="{{ url_for('tracker.job_detail', job_id=job.id) }}">
          View Details →
        </a>
      </div>
      {% endfor %}
      
    </div>
  </div>
  {% endfor %}
</div>

<script>
function kanbanBoard() {
  return {
    draggedJobId: null,
    
    dragStart(event) {
      this.draggedJobId = event.target.dataset.jobId;
    },
    
    async dropJob(event, newStatus) {
      if (!this.draggedJobId) return;
      
      // Update status via API
      const response = await fetch(`/tracker/api/job/${this.draggedJobId}/status`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({status: newStatus})
      });
      
      if (response.ok) {
        // Reload page (or update DOM directly for smoothness)
        location.reload();
      } else {
        alert('Failed to update job status');
      }
      
      this.draggedJobId = null;
    }
  }
}
</script>
{% endblock %}
```

---

## Feature 2: Browser Extension (Weeks 4-6)

### Architecture

```
extension/
├── manifest.json
├── popup.html          # Quick-add UI
├── popup.js
├── content-script.js   # Scrape job pages
├── background.js       # API communication
├── styles.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Manifest (Chrome Extension v3)

```json
{
  "manifest_version": 3,
  "name": "JobSentinel Tracker",
  "version": "0.1.0",
  "description": "Save jobs to your JobSentinel tracker with one click",
  "permissions": ["activeTab", "storage"],
  "host_permissions": [
    "https://www.linkedin.com/*",
    "https://www.indeed.com/*",
    "https://www.glassdoor.com/*",
    "https://*.greenhouse.io/*",
    "https://*.lever.co/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": [
        "https://www.linkedin.com/jobs/*",
        "https://www.indeed.com/viewjob*",
        "https://www.glassdoor.com/job-listing/*"
      ],
      "js": ["content-script.js"]
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### Content Script (Job Page Scraping)

```javascript
// extension/content-script.js
/**
 * Scrape job data from current page
 */
function scrapeJobData() {
  const url = window.location.href;
  
  // LinkedIn
  if (url.includes('linkedin.com/jobs')) {
    return {
      source: 'linkedin',
      title: document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim(),
      company: document.querySelector('.job-details-jobs-unified-top-card__company-name')?.textContent?.trim(),
      location: document.querySelector('.job-details-jobs-unified-top-card__bullet')?.textContent?.trim(),
      description: document.querySelector('.jobs-description__content')?.innerText,
      url: url.split('?')[0]
    };
  }
  
  // Indeed
  if (url.includes('indeed.com/viewjob')) {
    return {
      source: 'indeed',
      title: document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]')?.textContent?.trim(),
      company: document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent?.trim(),
      location: document.querySelector('[data-testid="job-location"]')?.textContent?.trim(),
      description: document.querySelector('#jobDescriptionText')?.innerText,
      url: url
    };
  }
  
  // Glassdoor
  if (url.includes('glassdoor.com/job-listing')) {
    return {
      source: 'glassdoor',
      title: document.querySelector('[data-test="job-title"]')?.textContent?.trim(),
      company: document.querySelector('[data-test="employer-name"]')?.textContent?.trim(),
      location: document.querySelector('[data-test="location"]')?.textContent?.trim(),
      description: document.querySelector('.jobDescriptionContent')?.innerText,
      url: url
    };
  }
  
  return null;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeJob') {
    const jobData = scrapeJobData();
    sendResponse({success: !!jobData, data: jobData});
  }
});
```

### Popup UI

```html
<!-- extension/popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>JobSentinel Tracker</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <h2>Save Job to Tracker</h2>
    
    <div id="status" class="hidden"></div>
    
    <form id="quickAddForm">
      <label>Title:</label>
      <input type="text" id="title" required>
      
      <label>Company:</label>
      <input type="text" id="company" required>
      
      <label>Status:</label>
      <select id="status-select">
        <option value="bookmarked">Bookmarked</option>
        <option value="applied">Applied</option>
      </select>
      
      <label>Priority:</label>
      <select id="priority">
        <option value="3">⭐⭐⭐ (Medium)</option>
        <option value="5">⭐⭐⭐⭐⭐ (High)</option>
        <option value="1">⭐ (Low)</option>
      </select>
      
      <button type="submit">Save Job</button>
    </form>
    
    <div id="settings">
      <a href="#" id="open-tracker">Open Tracker →</a>
      <a href="#" id="configure">Settings</a>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// extension/popup.js
document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  
  // Scrape job data from page
  const response = await chrome.tabs.sendMessage(tab.id, {action: 'scrapeJob'});
  
  if (response?.success) {
    // Pre-fill form
    document.getElementById('title').value = response.data.title || '';
    document.getElementById('company').value = response.data.company || '';
  }
  
  // Form submission
  document.getElementById('quickAddForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const jobData = {
      title: document.getElementById('title').value,
      company: document.getElementById('company').value,
      status: document.getElementById('status-select').value,
      priority: parseInt(document.getElementById('priority').value),
      url: tab.url,
      description: response?.data?.description || ''
    };
    
    // Send to JobSentinel API
    const apiUrl = await getApiUrl();  // From storage
    const result = await fetch(`${apiUrl}/api/v1/tracker/jobs`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(jobData)
    });
    
    if (result.ok) {
      showStatus('✓ Job saved!', 'success');
      setTimeout(() => window.close(), 1000);
    } else {
      showStatus('Failed to save job', 'error');
    }
  });
});

async function getApiUrl() {
  const storage = await chrome.storage.sync.get('apiUrl');
  return storage.apiUrl || 'http://localhost:5000';
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
  status.classList.remove('hidden');
}
```

---

## Feature 3: REST API (Weeks 7-9)

### API Structure

```
src/jsa/web/blueprints/api/
├── __init__.py
├── v1/
│   ├── __init__.py
│   ├── jobs.py          # Job endpoints
│   ├── tracker.py       # Tracker endpoints
│   ├── scores.py        # Scoring endpoints
│   └── webhooks.py      # Webhook management
├── auth.py              # API key authentication
└── middleware.py        # Rate limiting, CORS
```

### API Authentication

```python
# src/jsa/web/blueprints/api/auth.py
from functools import wraps
from flask import request, jsonify
from sqlmodel import Session, select
from jsa.db import get_session
import secrets

class APIKey(SQLModel, table=True):
    """API key for authentication"""
    __tablename__ = "api_keys"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(unique=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used_at: Optional[datetime] = None
    is_active: bool = True

def generate_api_key() -> str:
    """Generate secure API key"""
    return f"jsa_{secrets.token_urlsafe(32)}"

def require_api_key(f):
    """Decorator to require valid API key"""
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return jsonify({"error": "API key required"}), 401
        
        session = get_session()
        statement = select(APIKey).where(
            APIKey.key == api_key,
            APIKey.is_active == True
        )
        key_obj = session.exec(statement).first()
        
        if not key_obj:
            return jsonify({"error": "Invalid API key"}), 401
        
        # Update last used
        key_obj.last_used_at = datetime.utcnow()
        session.commit()
        
        return f(*args, **kwargs)
    return decorated
```

### Job Endpoints

```python
# src/jsa/web/blueprints/api/v1/jobs.py
from flask import Blueprint, jsonify, request
from jsa.db import get_session
from jsa.web.blueprints.api.auth import require_api_key
from sqlmodel import select
from models.job import Job

jobs_api_bp = Blueprint('jobs_api', __name__, url_prefix='/api/v1/jobs')

@jobs_api_bp.route('/', methods=['GET'])
@require_api_key
def list_jobs():
    """GET /api/v1/jobs - List all jobs"""
    session = get_session()
    
    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    # Filters
    source = request.args.get('source')
    min_score = request.args.get('min_score', type=float)
    
    statement = select(Job)
    if source:
        statement = statement.where(Job.source == source)
    if min_score:
        statement = statement.where(Job.score >= min_score)
    
    statement = statement.limit(per_page).offset((page - 1) * per_page)
    
    jobs = session.exec(statement).all()
    
    return jsonify({
        "jobs": [job.dict() for job in jobs],
        "page": page,
        "per_page": per_page
    })

@jobs_api_bp.route('/<int:job_id>', methods=['GET'])
@require_api_key
def get_job(job_id: int):
    """GET /api/v1/jobs/:id - Get single job"""
    session = get_session()
    job = session.get(Job, job_id)
    
    if not job:
        return jsonify({"error": "Job not found"}), 404
    
    return jsonify(job.dict())

@jobs_api_bp.route('/', methods=['POST'])
@require_api_key
def create_job():
    """POST /api/v1/jobs - Create job (for extension)"""
    data = request.json
    
    session = get_session()
    job = Job(**data)
    session.add(job)
    session.commit()
    session.refresh(job)
    
    return jsonify(job.dict()), 201
```

---

## Testing Strategy

### Unit Tests

```python
# tests/unit_jsa/test_tracker_service.py
import pytest
from jsa.tracker.service import TrackerService
from jsa.tracker.models import JobStatus

def test_add_job(session):
    """Test adding job to tracker"""
    service = TrackerService(session)
    
    tracked_job = service.add_job(job_id=1)
    
    assert tracked_job.id is not None
    assert tracked_job.status == JobStatus.BOOKMARKED
    assert tracked_job.job_id == 1

def test_update_status(session):
    """Test moving job to new status"""
    service = TrackerService(session)
    
    tracked_job = service.add_job(job_id=1)
    updated = service.update_status(tracked_job.id, JobStatus.APPLIED)
    
    assert updated.status == JobStatus.APPLIED
    assert updated.applied_at is not None

def test_get_by_status(session):
    """Test filtering jobs by status"""
    service = TrackerService(session)
    
    service.add_job(job_id=1, status=JobStatus.BOOKMARKED)
    service.add_job(job_id=2, status=JobStatus.APPLIED)
    service.add_job(job_id=3, status=JobStatus.APPLIED)
    
    applied_jobs = service.get_by_status(JobStatus.APPLIED)
    
    assert len(applied_jobs) == 2
    assert all(j.status == JobStatus.APPLIED for j in applied_jobs)
```

### Integration Tests

```python
# tests/integration/test_tracker_api.py
import pytest
from flask import url_for

def test_kanban_board_loads(client):
    """Test Kanban board page loads"""
    response = client.get('/tracker/')
    assert response.status_code == 200
    assert b'Kanban' in response.data or b'bookmarked' in response.data

def test_update_status_api(client, tracked_job):
    """Test PATCH /tracker/api/job/:id/status"""
    response = client.patch(
        f'/tracker/api/job/{tracked_job.id}/status',
        json={'status': 'applied'}
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'applied'
```

---

## Deployment Checklist

**Phase 1: Job Tracker**
- [ ] Database migrations (tracked_jobs, contacts, documents, activities tables)
- [ ] Unit tests (≥85% coverage)
- [ ] Flask routes and templates
- [ ] Alpine.js drag-and-drop
- [ ] Documentation update
- [ ] User acceptance testing

**Phase 2: Browser Extension**
- [ ] Chrome extension manifest v3
- [ ] Content scripts for LinkedIn, Indeed, Glassdoor
- [ ] Popup UI
- [ ] Chrome Web Store listing
- [ ] Privacy policy update
- [ ] User guide

**Phase 3: REST API**
- [ ] API authentication (API keys)
- [ ] Rate limiting middleware
- [ ] OpenAPI/Swagger docs
- [ ] API versioning strategy
- [ ] Integration tests
- [ ] API user guide

---

## Documentation Updates

**Files to update:**
1. `README.md` - Add Job Tracker, Browser Extension, REST API to features
2. `docs/ARCHITECTURE.md` - Add tracker module to architecture diagram
3. `docs/API_SPECIFICATION.md` - Create/update with REST API docs
4. `docs/quickstart.md` - Add "Track your first job" section
5. `CHANGELOG.md` - Document v0.7.0 features

---

## Success Metrics

**Adoption:**
- 60%+ of users enable job tracker within first week
- 40%+ of users install browser extension
- 100+ jobs tracked per active user per month

**Technical:**
- API response time <200ms (p95)
- Extension <5MB memory footprint
- Zero data loss incidents

**User Feedback:**
- Net Promoter Score (NPS) ≥40
- GitHub issues for tracker <10% of total
- Chrome Web Store rating ≥4.5/5

---

**Questions?** Open a GitHub issue or see [DEEP_ANALYSIS_2025.md](DEEP_ANALYSIS_2025.md) for context.
