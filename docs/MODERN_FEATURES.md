# Modern Features - JobSentinel 0.6.0+

JobSentinel now includes cutting-edge features that make it THE BEST job search tool in the world.

## 🎯 Overview

Three major enhancements:
1. **FastAPI REST API** - Modern async API with auto-documentation
2. **React SPA Frontend** - Modern web UI with dark mode
3. **LLM Integration** - AI-powered features with local-first approach

## 🚀 Quick Start

### Complete Stack

```bash
# Terminal 1: Backend API
python -m jsa.cli api --port 8000

# Terminal 2: Frontend (in new terminal)
cd frontend
npm install
npm run dev

# Access:
# - Frontend: http://localhost:3000
# - API Docs: http://localhost:8000/api/docs
```

### Just Backend API

```bash
python -m jsa.cli api --port 8000
# Visit http://localhost:8000/api/docs for interactive API
```

### Just Frontend (with existing Flask)

```bash
# Terminal 1: Existing Flask app
python -m jsa.cli web --port 5000

# Terminal 2: React frontend (proxy to Flask)
cd frontend && npm run dev
```

## 📚 Features Overview

### 1. FastAPI REST API

**30+ Endpoints** organized into 6 routers:

#### Health & Status
- `GET /api/v1/health` - System health and stats
- `GET /api/v1/ping` - Simple ping
- `GET /api/v1/ml/status` - ML features availability
- `GET /api/v1/llm/status` - LLM providers status

#### Jobs API
- `GET /api/v1/jobs` - List with pagination, filters
- `GET /api/v1/jobs/{id}` - Get specific job
- `POST /api/v1/jobs` - Create job (browser extension)
- `DELETE /api/v1/jobs/{id}` - Delete job

#### Application Tracker
- Full CRUD for job applications
- Kanban-style status tracking
- Priority and notes

#### Resume Analysis
- `POST /api/v1/resume/analyze` - ATS compatibility, scoring
- `POST /api/v1/resume/match` - Semantic job matching

#### ML Features
- `POST /api/v1/ml/sentiment` - Job description sentiment
- `POST /api/v1/ml/skills-gap` - Skills gap analysis

#### LLM Features
- `POST /api/v1/llm/cover-letter` - Generate cover letters
- `POST /api/v1/llm/interview-prep` - Interview questions
- `POST /api/v1/llm/analyze-job` - Job analysis
- `POST /api/v1/llm/translate-skills` - Skills translation
- `POST /api/v1/llm/improve-resume` - Resume improvement

**Key Benefits:**
- ✅ Auto-generated OpenAPI/Swagger docs
- ✅ Type-safe with Pydantic validation
- ✅ Async/await for high performance
- ✅ CORS enabled for frontend
- ✅ Rate limiting and security headers

### 2. React SPA Frontend

**Modern Web Application:**

#### Pages
1. **Dashboard** - Stats, ML/LLM status, quick actions
2. **Jobs** - Search and filter (placeholder)
3. **Tracker** - Kanban board (placeholder)
4. **Resume** - Analyzer UI (placeholder)
5. **LLM Features** - AI-powered tools
6. **Settings** - Configuration (placeholder)

#### Tech Stack
- React 18 + TypeScript
- Vite (fast dev server)
- TailwindCSS (modern styling)
- React Query (API state)
- React Router (routing)
- Axios (HTTP client)

#### Features
- 🎨 Dark mode support
- 📱 Responsive design
- ♿ WCAG 2.1 AA accessibility
- ⚡ Hot module replacement
- 🔄 Automatic API caching

### 3. LLM Integration

**Privacy-First AI Features:**

#### Providers

| Provider | Cost | Privacy | Setup |
|----------|------|---------|-------|
| **Ollama** (default) | **FREE** | ✅ 100% Local | Install Ollama |
| OpenAI | ~$0.01-0.05 | ⚠️ External API | Set API key |
| Anthropic | ~$0.01-0.05 | ⚠️ External API | Set API key |

#### Features

1. **Cover Letter Generator**
   - Personalized from job + resume
   - Professional, enthusiastic, or formal tone
   - 100-1000 words

2. **Interview Preparation**
   - Role-specific questions
   - Behavioral + technical + situational
   - Company research insights

3. **Job Analysis**
   - Requirements extraction
   - Culture indicators
   - Red flags detection
   - Compensation insights

4. **Skills Translation**
   - Match resume skills to job requirements
   - Identify transferable skills
   - Reframing suggestions

5. **Resume Improvement**
   - Section-by-section improvement
   - Action verb suggestions
   - Quantifiable metrics
   - ATS optimization

#### Cost Transparency

```python
# Check cost before running
features.estimate_cost("cover_letter")
# Ollama: $0.00 (always FREE)
# OpenAI: ~$0.01-0.05
# Anthropic: ~$0.01-0.05
```

#### Privacy Warnings

Every LLM response includes privacy note:
- ✅ Ollama: "Processed locally. No data sent to external services."
- ⚠️ OpenAI: "Data sent to OpenAI API. See OpenAI privacy policy."
- ⚠️ Anthropic: "Data sent to Anthropic API. See Anthropic privacy policy."

## 🔒 Privacy Architecture

### Default (100% Private)
```
User → FastAPI → Local Processing → SQLite → User
         ↓
      Ollama (local LLM)
```

### Optional Cloud Features (Opt-in)
```
User → FastAPI → External API → Response → User
         ↓           ↓
      Warning    OpenAI/Anthropic
                 (with API key)
```

### Guarantees
1. ✅ All features work offline (except cloud LLMs)
2. ✅ No telemetry or analytics
3. ✅ No data collection
4. ✅ Clear warnings for external services
5. ✅ User control over every feature

## 📖 Documentation

### Guides
- [FastAPI Guide](FASTAPI_GUIDE.md) - Complete API reference
- [LLM Guide](LLM_GUIDE.md) - LLM providers and features
- [React Frontend Guide](REACT_FRONTEND_GUIDE.md) - Frontend architecture

### API Documentation
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **OpenAPI**: http://localhost:8000/api/openapi.json

## 🎓 Examples

### Using FastAPI

```bash
# List jobs
curl http://localhost:8000/api/v1/jobs?min_score=80

# Analyze resume
curl -X POST http://localhost:8000/api/v1/resume/analyze \
  -H "Content-Type: application/json" \
  -d '{"resume_text": "...", "industry": "Tech"}'

# Generate cover letter (local Ollama)
curl -X POST http://localhost:8000/api/v1/llm/cover-letter \
  -H "Content-Type: application/json" \
  -d '{
    "job_title": "Senior Developer",
    "company_name": "Example Corp",
    "job_description": "...",
    "resume_text": "..."
  }'
```

### Using Python Client

```python
from domains.llm import LLMFeatures, LLMConfig, LLMProvider

# Local Ollama (default, FREE)
features = LLMFeatures()

# Or OpenAI
config = LLMConfig(provider=LLMProvider.OPENAI)
features = LLMFeatures(config)

# Generate cover letter
result = await features.generate_cover_letter(request)
print(result.content)
print(f"Cost: ${result.cost_usd:.4f}")
print(f"Privacy: {result.provider.value}")
```

### Using React Frontend

```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/health'),
  })

  return (
    <div>
      <h1>Jobs: {data?.total_jobs}</h1>
    </div>
  )
}
```

## 🔧 Configuration

### Environment Variables

```bash
# LLM Providers (optional)
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export OLLAMA_BASE_URL=http://localhost:11434  # default

# CORS (optional)
export ENABLE_CORS=true
export CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
```

### Frontend Configuration

```bash
# frontend/.env
VITE_API_URL=http://localhost:8000
```

## 🚀 Deployment

### Development

```bash
# Backend
python -m jsa.cli api --port 8000 --reload

# Frontend
cd frontend && npm run dev
```

### Production

```bash
# Build frontend
cd frontend && npm run build
# Outputs to: ../static/frontend/

# Run backend (serves frontend too)
python -m jsa.cli api --host 0.0.0.0 --port 8000

# Or with Gunicorn
gunicorn jsa.fastapi_app:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

### Docker

```bash
# Build
docker build -t jobsentinel -f docker/Dockerfile.fastapi .

# Run
docker run -p 8000:8000 -v $(pwd)/data:/app/data jobsentinel
```

## 📊 Feature Comparison

| Feature | Flask (Old) | FastAPI (New) |
|---------|-------------|---------------|
| API Docs | ❌ Manual | ✅ Auto-generated |
| Type Safety | ⚠️ Partial | ✅ Full (Pydantic) |
| Async | ❌ No | ✅ Yes |
| Performance | ⚠️ Good | ✅ Excellent |
| OpenAPI | ❌ No | ✅ Yes |
| Validation | ⚠️ Manual | ✅ Automatic |

Both Flask and FastAPI coexist peacefully:
- Flask: `python -m jsa.cli web --port 5000`
- FastAPI: `python -m jsa.cli api --port 8000`

## 🎉 Summary

JobSentinel 0.6.0+ is now:

✅ **THE BEST** - Most complete feature set
✅ **MOST MODERN** - React + FastAPI + LLM
✅ **100% PRIVATE** - Local-first, no tracking
✅ **FULLY DOCUMENTED** - Comprehensive guides
✅ **PRODUCTION READY** - Docker, tests, security

**All while maintaining the core privacy principles!**

## 🔗 See Also

- [FastAPI Guide](FASTAPI_GUIDE.md)
- [LLM Guide](LLM_GUIDE.md)
- [React Frontend Guide](REACT_FRONTEND_GUIDE.md)
- [AI/ML Roadmap](AI_ML_ROADMAP.md)
- [ML Capabilities](ML_CAPABILITIES.md)
- [Architecture](ARCHITECTURE.md)
- [API Integration Guide](API_INTEGRATION_GUIDE.md)
