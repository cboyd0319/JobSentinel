# JobSentinel API Specification

**Version:** 0.5.0  
**Last Updated:** October 12, 2025

## Overview

JobSentinel provides a REST API for job search automation, resume analysis, and ATS compatibility checking. This specification follows REST architectural constraints per Fielding's dissertation and Apigee Web API Design best practices.

**Base URL:** `http://localhost:5000/api/v1`

**References:**
- Fielding REST | https://www.ics.uci.edu/~fielding/pubs/dissertation/ | High | REST constraints
- Apigee Web API Design | https://apigee.com | Medium | Pragmatic REST guidelines
- OpenAPI 3.0 | https://spec.openapis.org/oas/v3.0.3 | High | API specification standard

## Authentication

Currently, JobSentinel operates in single-user mode without authentication. For production deployments, implement API key authentication per OWASP ASVS 5.0 V2.2.

**Future:** API Key in `X-API-Key` header

```http
X-API-Key: your-api-key-here
```

## Rate Limiting

Rate limits per OWASP ASVS 5.0 V4.2.1:
- **Default:** 100 requests per minute per IP
- **Burst:** 20 requests per second

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1697123456
```

## Error Responses

Standard error format per Apigee guidelines:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Resume file is required",
    "details": [
      {
        "field": "resume_file",
        "issue": "missing_required_field"
      }
    ],
    "request_id": "req_abc123",
    "timestamp": "2025-10-12T11:16:55Z"
  }
}
```

**HTTP Status Codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid auth
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

## Endpoints

### Resume Analysis

#### Analyze Resume

Analyze resume for improvements and ATS compatibility.

```http
POST /api/v1/resume/analyze
Content-Type: application/json
```

**Request Body:**
```json
{
  "resume_text": "John Doe\nSoftware Engineer\n...",
  "target_industry": "software_engineering",
  "job_description": "We are seeking an experienced..."
}
```

**Parameters:**
- `resume_text` (string, required) - Resume content as plain text
- `target_industry` (string, optional) - Target industry key
- `job_description` (string, optional) - Job description for tailored analysis

**Response (200 OK):**
```json
{
  "current_score": 72.5,
  "potential_score": 88.3,
  "suggestions": [
    {
      "section": "experience",
      "suggestion_type": "improve",
      "content": "Add quantified achievements with metrics",
      "reason": "Quantified results improve ATS scores by 15%",
      "priority": 1,
      "impact_score": 15.0,
      "effort_level": 3
    }
  ],
  "missing_sections": ["certifications"],
  "weak_sections": ["summary", "skills"],
  "strong_sections": ["experience"],
  "industry_match": "software_engineering",
  "recommended_template": "technical",
  "word_count": 456,
  "estimated_pages": 1.2,
  "readability_score": 65.0
}
```

#### List Industry Profiles

Get available industry profiles.

```http
GET /api/v1/resume/industries
```

**Response (200 OK):**
```json
{
  "industries": [
    {
      "key": "software_engineering",
      "name": "Software Engineering",
      "required_sections": ["contact", "summary", "skills", "experience", "education", "projects"],
      "key_skills": ["python", "java", "javascript", "aws", "docker"],
      "recommended_length": [1, 2]
    },
    {
      "key": "healthcare",
      "name": "Healthcare",
      "required_sections": ["contact", "summary", "experience", "education", "certifications", "skills"],
      "key_skills": ["patient care", "emr/ehr systems", "hipaa compliance"],
      "recommended_length": [1, 2]
    }
  ],
  "total": 13
}
```

### ATS Analysis

#### Check ATS Compatibility

Analyze resume for ATS compatibility.

```http
POST /api/v1/ats/analyze
Content-Type: multipart/form-data
```

**Parameters:**
- `resume_file` (file, required) - Resume file (PDF, DOCX, or TXT)
- `job_keywords` (array[string], optional) - Job-specific keywords
- `ats_system` (string, optional) - Target ATS system (greenhouse, lever, workday, etc.)

**Response (200 OK):**
```json
{
  "overall_score": 85.0,
  "component_scores": {
    "formatting": 90.0,
    "readability": 82.0,
    "keyword_optimization": 88.0,
    "structure": 85.0
  },
  "issues": [
    {
      "level": "warning",
      "category": "formatting",
      "message": "Complex tables may not parse correctly",
      "suggestion": "Use simple bullet points instead"
    }
  ],
  "keyword_matches": [
    {
      "keyword": "python",
      "found": true,
      "frequency": 5,
      "relevance": 0.95
    }
  ],
  "ats_system_compatibility": {
    "greenhouse": 92.0,
    "lever": 88.0,
    "workday": 85.0
  }
}
```

### Job Scraping

#### Scrape Jobs

Scrape jobs from a career page.

```http
POST /api/v1/jobs/scrape
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://jobs.company.com/careers",
  "fetch_descriptions": true,
  "max_jobs": 50
}
```

**Response (200 OK):**
```json
{
  "jobs": [
    {
      "id": "job_abc123",
      "title": "Senior Software Engineer",
      "company": "TechCorp",
      "location": "Remote",
      "salary_min": 120000,
      "salary_max": 180000,
      "description": "We are seeking...",
      "url": "https://jobs.company.com/careers/senior-software-engineer",
      "posted_date": "2025-10-10",
      "scraped_at": "2025-10-12T11:16:55Z"
    }
  ],
  "total_scraped": 42,
  "scraper_used": "greenhouse",
  "duration_ms": 2340.5
}
```

#### Multi-Site Job Search

Search across multiple job boards.

```http
POST /api/v1/jobs/search
Content-Type: application/json
```

**Request Body:**
```json
{
  "keywords": ["python", "backend", "api"],
  "location": "Remote",
  "sites": ["indeed", "glassdoor", "linkedin"],
  "results_per_site": 50,
  "hours_old": 72
}
```

**Response (200 OK):**
```json
{
  "jobs": [...],
  "total_found": 142,
  "sites_searched": ["indeed", "glassdoor", "linkedin"],
  "search_duration_ms": 8450.2,
  "results_by_site": {
    "indeed": 58,
    "glassdoor": 42,
    "linkedin": 42
  }
}
```

### Health & Metrics

#### Health Check

Check system health and scraper status.

```http
GET /api/v1/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "version": "0.5.0",
  "uptime_seconds": 3600,
  "scrapers": [
    {
      "name": "greenhouse",
      "status": "healthy",
      "success_rate": 0.95,
      "avg_latency_ms": 1250.5,
      "last_success": "2025-10-12T11:15:00Z",
      "consecutive_failures": 0
    }
  ],
  "slo_status": [
    {
      "name": "job_scraping_success",
      "target": 95.0,
      "current": 96.2,
      "status": "meeting"
    }
  ]
}
```

#### Metrics

Get system metrics.

```http
GET /api/v1/metrics
```

**Response (200 OK):**
```json
{
  "metrics": [
    {
      "name": "jobs.scraped.total",
      "value": 1542,
      "type": "counter",
      "labels": {"source": "all"}
    },
    {
      "name": "resume.analysis.duration_ms",
      "value": 2340.5,
      "type": "histogram",
      "labels": {"success": "true"}
    }
  ],
  "summary": {
    "total_jobs_scraped": 1542,
    "total_resumes_analyzed": 87,
    "average_analysis_time_ms": 3200.5,
    "scraper_success_rate": 0.962
  }
}
```

## Webhooks

JobSentinel supports webhooks for real-time notifications.

### Configure Webhook

```http
POST /api/v1/webhooks
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["job.found", "resume.analyzed"],
  "secret": "your-webhook-secret"
}
```

**Webhook Payload Example:**
```json
{
  "event": "job.found",
  "timestamp": "2025-10-12T11:16:55Z",
  "data": {
    "job_id": "job_abc123",
    "title": "Senior Software Engineer",
    "score": 92.5
  },
  "signature": "sha256=abc123..."
}
```

## Pagination

Large result sets use cursor-based pagination per Apigee guidelines:

```http
GET /api/v1/jobs?limit=50&cursor=eyJpZCI6MTIzfQ
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTczfQ",
    "has_more": true,
    "total": 500
  }
}
```

## Versioning

API versions follow semantic versioning. Breaking changes increment the major version.

- Current: `v1`
- Access via path: `/api/v1/...`
- Deprecation notice: 6 months before removal

## SLOs & Performance Targets

Per Google SRE principles:

| Endpoint | Target Latency (p95) | Target Success Rate |
|----------|---------------------|-------------------|
| Resume Analysis | < 5s | 95% |
| ATS Analysis | < 8s | 95% |
| Job Scraping | < 10s | 95% |
| Multi-Site Search | < 30s | 90% |
| Health Check | < 100ms | 99.9% |

## Security

Security controls per OWASP ASVS 5.0:

- **V2.2.1:** API key authentication (future)
- **V4.2.1:** Rate limiting (100 req/min)
- **V5.1.1:** Input validation on all endpoints
- **V5.3.4:** SQL injection prevention
- **V8.1.1:** Sensitive data masking in logs
- **V9.1.1:** HTTPS only in production

## Client Libraries

Coming soon:
- Python SDK
- JavaScript/TypeScript SDK
- CLI tool enhancements

## Support

- Issues: https://github.com/cboyd0319/JobSentinel/issues
- Docs: https://github.com/cboyd0319/JobSentinel/docs
- Email: noreply@users.noreply.github.com
