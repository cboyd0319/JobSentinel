# FastAPI REST API Guide

JobSentinel now includes a modern FastAPI REST API with automatic OpenAPI documentation.

## Quick Start

```bash
# Start FastAPI server
python -m jsa.cli api --port 8000

# Visit interactive API docs
open http://localhost:8000/api/docs
```

## Features

- ✅ **30+ API Endpoints** - Comprehensive REST API
- 📚 **Auto-generated Documentation** - Swagger UI + ReDoc
- 🔒 **Type-safe** - Full Pydantic validation
- ⚡ **Async Support** - High performance with async/await
- 🌐 **CORS Enabled** - Ready for frontend integration
- 🔐 **Security** - Rate limiting, input validation, secure headers

## Endpoints

### Health & Status

- `GET /api/v1/health` - System health check
- `GET /api/v1/ping` - Simple ping endpoint
- `GET /api/v1/ml/status` - ML features availability
- `GET /api/v1/llm/status` - LLM providers availability

### Job Management

- `GET /api/v1/jobs` - List jobs with pagination and filters
- `GET /api/v1/jobs/{job_id}` - Get specific job
- `POST /api/v1/jobs` - Create new job (for browser extension)
- `DELETE /api/v1/jobs/{job_id}` - Delete job

**Query Parameters:**
- `page`: Page number (default: 1)
- `per_page`: Results per page (default: 50, max: 100)
- `source`: Filter by job source
- `min_score`: Filter by minimum score
- `remote`: Filter by remote jobs

### Application Tracker

- `GET /api/v1/tracker/applications` - List tracked applications
- `GET /api/v1/tracker/applications/{app_id}` - Get specific application
- `POST /api/v1/tracker/applications` - Track new application
- `PATCH /api/v1/tracker/applications/{app_id}` - Update application
- `DELETE /api/v1/tracker/applications/{app_id}` - Remove application

### Resume Analysis

- `POST /api/v1/resume/analyze` - Analyze resume quality and ATS compatibility
- `POST /api/v1/resume/match` - Match resume to job description

**Resume Analyzer Response:**
```json
{
  "overall_score": 85.5,
  "content_depth_score": 90.0,
  "quantification_score": 75.0,
  "action_verbs_score": 88.0,
  "keyword_density_score": 82.0,
  "format_score": 95.0,
  "length_score": 80.0,
  "strengths": ["Strong action verbs", "Quantified achievements"],
  "weaknesses": ["Missing keywords", "Could add more metrics"],
  "suggestions": ["Add specific numbers to achievements", "Include technical keywords"],
  "ats_compatibility": 87.0
}
```

### ML Features

- `POST /api/v1/ml/sentiment` - Analyze job description sentiment
- `POST /api/v1/ml/skills-gap` - Analyze skills gap for target role
- `GET /api/v1/ml/status` - Check ML features availability

### LLM Features

All LLM features support multiple providers (Ollama, OpenAI, Anthropic):

- `POST /api/v1/llm/cover-letter` - Generate personalized cover letter
- `POST /api/v1/llm/interview-prep` - Generate interview questions
- `POST /api/v1/llm/analyze-job` - Analyze job description
- `POST /api/v1/llm/translate-skills` - Translate skills to job requirements
- `POST /api/v1/llm/improve-resume` - Improve resume section
- `GET /api/v1/llm/status` - Check LLM providers availability

**Privacy Note:** All LLM features default to local Ollama (FREE, 100% private). Each response includes a privacy note indicating whether data was sent to external services.

## Example Requests

### List Jobs

```bash
curl http://localhost:8000/api/v1/jobs?page=1&per_page=10&min_score=80
```

### Analyze Resume

```bash
curl -X POST http://localhost:8000/api/v1/resume/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "resume_text": "Senior Python Developer with 5 years experience...",
    "industry": "Tech"
  }'
```

### Generate Cover Letter (Local Ollama)

```bash
curl -X POST http://localhost:8000/api/v1/llm/cover-letter \
  -H "Content-Type: application/json" \
  -d '{
    "job_title": "Senior Python Developer",
    "company_name": "Example Corp",
    "job_description": "We are seeking...",
    "resume_text": "Experienced Python developer...",
    "tone": "professional"
  }'
```

### Generate Cover Letter (OpenAI)

```bash
curl -X POST http://localhost:8000/api/v1/llm/cover-letter \
  -H "Content-Type: application/json" \
  -d '{
    "job_title": "Senior Python Developer",
    "company_name": "Example Corp",
    "job_description": "We are seeking...",
    "resume_text": "Experienced Python developer...",
    "tone": "professional",
    "llm_config": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "temperature": 0.7
    }
  }'
```

## API Documentation

### Interactive Swagger UI
http://localhost:8000/api/docs

Features:
- Try out endpoints interactively
- See request/response schemas
- Download OpenAPI spec

### ReDoc Documentation
http://localhost:8000/api/redoc

Alternative documentation view with:
- Clean, readable format
- Detailed schema documentation
- Example requests/responses

### OpenAPI Schema
http://localhost:8000/api/openapi.json

Raw OpenAPI 3.1 specification for:
- Code generation
- API clients
- Testing tools

## Configuration

### CORS

Control CORS settings with environment variables:

```bash
export ENABLE_CORS=true
export CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
```

### Rate Limiting

Basic rate limiting is enabled by default. Configure in `src/jsa/web/middleware.py`.

### API Keys

Future versions will support API key authentication. Currently, all endpoints are open for local development.

## Development

### Run with Auto-reload

```bash
python -m jsa.cli api --port 8000 --reload
```

Changes to code automatically restart the server.

### Run with Custom Log Level

```bash
python -m jsa.cli api --port 8000 --log-level DEBUG
```

## Production Deployment

### Using Uvicorn Directly

```bash
uvicorn jsa.fastapi_app:app --host 0.0.0.0 --port 8000 --workers 4
```

### Using Gunicorn + Uvicorn Workers

```bash
gunicorn jsa.fastapi_app:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

### Docker

```bash
docker build -t jobsentinel-api -f docker/Dockerfile.api .
docker run -p 8000:8000 jobsentinel-api
```

## Security

- ✅ Input validation via Pydantic
- ✅ SQL injection prevention (SQLModel ORM)
- ✅ CORS protection
- ✅ Rate limiting
- ✅ Secure headers (HSTS, CSP)
- ✅ No secrets in logs
- ✅ TLS recommended for production

## Privacy Guarantees

- ✅ All processing happens locally by default
- ✅ No telemetry or analytics
- ✅ User data never leaves machine (unless explicitly configured)
- ✅ Clear warnings when using external LLM APIs
- ✅ Local Ollama recommended for 100% privacy

## Troubleshooting

### Server won't start

```bash
# Check if port is in use
lsof -i :8000

# Try different port
python -m jsa.cli api --port 8001
```

### CORS errors in browser

```bash
# Enable CORS
export ENABLE_CORS=true
export CORS_ORIGINS="http://localhost:3000"
python -m jsa.cli api
```

### Import errors

```bash
# Reinstall dependencies
pip install -e .
```

## See Also

- [React Frontend Guide](REACT_FRONTEND_GUIDE.md)
- [LLM Integration Guide](LLM_GUIDE.md)
- [API Integration Guide](API_INTEGRATION_GUIDE.md)
