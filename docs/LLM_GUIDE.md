# LLM Integration Guide

JobSentinel includes powerful LLM features while maintaining 100% privacy by default.

## Quick Start

### Using Local Ollama (Recommended - FREE & Private)

1. **Install Ollama**
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.com/install.sh | sh
   
   # Or visit https://ollama.com/download
   ```

2. **Pull a model**
   ```bash
   ollama pull llama3.1:8b
   ```

3. **Start Ollama** (usually runs automatically)
   ```bash
   ollama serve
   ```

4. **Use LLM features** (all requests go to local Ollama)
   ```python
   from domains.llm import LLMFeatures, LLMConfig, LLMProvider
   
   # Default to Ollama (local, FREE)
   features = LLMFeatures()
   
   result = await features.generate_cover_letter(request)
   # Cost: $0.00 (local processing)
   # Privacy: 100% local, no data sent anywhere
   ```

### Using External APIs (Optional)

Only if you need specific models or don't want to run locally:

```bash
# OpenAI
export OPENAI_API_KEY=your_key_here

# Anthropic
export ANTHROPIC_API_KEY=your_key_here
```

```python
from domains.llm import LLMFeatures, LLMConfig, LLMProvider

# OpenAI
config = LLMConfig(provider=LLMProvider.OPENAI, model="gpt-4o-mini")
features = LLMFeatures(config)

# Anthropic
config = LLMConfig(provider=LLMProvider.ANTHROPIC, model="claude-3-5-sonnet-20241022")
features = LLMFeatures(config)
```

## Features

### 1. Cover Letter Generation

Generate personalized cover letters from job descriptions and resumes.

```python
from domains.llm.features import CoverLetterRequest

request = CoverLetterRequest(
    job_title="Senior Python Developer",
    company_name="Example Corp",
    job_description="We are seeking an experienced Python developer...",
    resume_text="Experienced Python developer with 5 years...",
    tone="professional",  # or "enthusiastic", "formal"
    max_length=500
)

result = await features.generate_cover_letter(request)
print(result.content)
print(f"Cost: ${result.cost_usd:.4f}")
print(f"Privacy: {result.provider.value}")
```

**API Endpoint:**
```bash
POST /api/v1/llm/cover-letter
```

### 2. Interview Preparation

Generate likely interview questions for specific roles.

```python
from domains.llm.features import InterviewPrepRequest

request = InterviewPrepRequest(
    job_title="Senior Python Developer",
    company_name="Example Corp",
    job_description="We are seeking...",
    resume_text="Experienced Python developer...",
    num_questions=10
)

result = await features.prepare_interview_questions(request)
```

**API Endpoint:**
```bash
POST /api/v1/llm/interview-prep
```

### 3. Job Description Analysis

Analyze job descriptions for insights, culture indicators, and red flags.

```python
from domains.llm.features import JobAnalysisRequest

request = JobAnalysisRequest(
    job_description="We are seeking...",
    analyze_culture=True,
    analyze_requirements=True,
    analyze_compensation=True
)

result = await features.analyze_job_description(request)
```

**API Endpoint:**
```bash
POST /api/v1/llm/analyze-job
```

### 4. Skills Translation

Translate resume skills to job requirements language.

```python
result = await features.translate_skills(
    resume_skills=["Python", "Django", "PostgreSQL"],
    job_requirements=["Backend development", "API design", "Database optimization"]
)
```

**API Endpoint:**
```bash
POST /api/v1/llm/translate-skills
```

### 5. Resume Improvement

Improve specific resume sections for target jobs.

```python
result = await features.improve_resume_section(
    section_text="Built web applications using Python and Flask...",
    job_description="We need a senior backend engineer..."
)
```

**API Endpoint:**
```bash
POST /api/v1/llm/improve-resume
```

## LLM Providers

### Ollama (Local - Recommended)

**Pros:**
- ✅ **FREE** - No API costs
- ✅ **100% Private** - Data never leaves your machine
- ✅ **Fast** - No network latency
- ✅ **No Rate Limits** - Use as much as you want
- ✅ **Offline** - Works without internet

**Cons:**
- ⚠️ Requires local installation
- ⚠️ Uses CPU/GPU resources
- ⚠️ Models less capable than GPT-4

**Supported Models:**
- `llama3.1:8b` (default) - Good balance of quality and speed
- `llama3.1:70b` - Better quality, needs more resources
- `codellama:13b` - Optimized for code
- `mistral:7b` - Fast and efficient

### OpenAI

**Pros:**
- ✅ State-of-the-art models (GPT-4o, GPT-4-turbo)
- ✅ No local setup required
- ✅ Consistent quality

**Cons:**
- ⚠️ Costs money (~$0.01-0.05 per request)
- ⚠️ Data sent to OpenAI
- ⚠️ Requires API key
- ⚠️ Rate limits apply

**Models:**
- `gpt-4o-mini` (recommended) - $0.00015/$0.0006 per 1K tokens
- `gpt-4o` - $0.005/$0.015 per 1K tokens
- `gpt-4-turbo` - $0.01/$0.03 per 1K tokens

### Anthropic Claude

**Pros:**
- ✅ High-quality models
- ✅ Large context windows
- ✅ Strong at writing/analysis

**Cons:**
- ⚠️ Costs money (~$0.01-0.05 per request)
- ⚠️ Data sent to Anthropic
- ⚠️ Requires API key
- ⚠️ Rate limits apply

**Models:**
- `claude-3-5-sonnet-20241022` (recommended) - $0.003/$0.015 per 1K tokens
- `claude-3-5-haiku` - $0.00025/$0.00125 per 1K tokens
- `claude-3-opus` - $0.015/$0.075 per 1K tokens

## Cost Estimation

```python
# Check estimated cost before making request
config = LLMConfig(provider=LLMProvider.OPENAI)
features = LLMFeatures(config)

cost = features.estimate_cost("cover_letter")
print(f"Estimated cost: ${cost:.4f}")

# Ollama is always FREE
config_local = LLMConfig(provider=LLMProvider.OLLAMA)
features_local = LLMFeatures(config_local)
cost_local = features_local.estimate_cost("cover_letter")
print(f"Ollama cost: ${cost_local:.4f}")  # Always $0.00
```

## Privacy Guarantees

### Local Ollama (Default)
- ✅ **Data Location:** Your machine only
- ✅ **Network:** No outbound requests
- ✅ **Logs:** Stored locally only
- ✅ **Third Parties:** None

### External APIs (Opt-in)
- ⚠️ **Data Location:** Sent to API provider
- ⚠️ **Network:** HTTPS to provider
- ⚠️ **Logs:** Provider may log requests
- ⚠️ **Third Parties:** API provider (OpenAI, Anthropic)

**Every API response includes a privacy note:**
```json
{
  "content": "...",
  "privacy_note": "✅ Processed locally. No data sent to external services."
}
```

## Configuration

### Environment Variables

```bash
# Optional: Configure API keys for external providers
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...

# Optional: Ollama base URL (if not default)
export OLLAMA_BASE_URL=http://localhost:11434
```

### Per-Request Configuration

```python
# Override default config per request
config = LLMConfig(
    provider=LLMProvider.OPENAI,
    model="gpt-4o-mini",
    temperature=0.7,  # 0.0-2.0 (lower = more deterministic)
    max_tokens=2000,  # Maximum response length
    timeout=60  # Request timeout in seconds
)
```

## Best Practices

### 1. Start Local, Scale to Cloud

```python
# Development: Use Ollama
if os.getenv("ENV") == "development":
    config = LLMConfig(provider=LLMProvider.OLLAMA)
else:
    # Production: Use OpenAI for higher quality
    config = LLMConfig(provider=LLMProvider.OPENAI, model="gpt-4o-mini")
```

### 2. Provide Clear User Choice

```python
# Let users choose provider
provider = user_preference.get("llm_provider", "ollama")
config = LLMConfig(provider=LLMProvider(provider))

# Show privacy warning for external APIs
if provider != "ollama":
    print("⚠️  Using external API. Data will be sent to {provider}.")
```

### 3. Handle Errors Gracefully

```python
try:
    result = await features.generate_cover_letter(request)
except ValueError as e:
    # Configuration error (missing API key, etc.)
    print(f"Configuration error: {e}")
except Exception as e:
    # Network error, timeout, etc.
    print(f"Request failed: {e}")
```

### 4. Cache Results

```python
# Cache expensive LLM calls
from functools import lru_cache

@lru_cache(maxsize=100)
def generate_cover_letter_cached(job_id: str, resume_hash: str):
    return features.generate_cover_letter(request)
```

## Troubleshooting

### Ollama Not Available

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve

# Pull model if needed
ollama pull llama3.1:8b
```

### OpenAI API Errors

```bash
# Verify API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Common issues:
# - Invalid API key: Check key format (starts with sk-)
# - Rate limit: Wait and retry
# - Insufficient quota: Add payment method
```

### Anthropic API Errors

```bash
# Verify API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-3-5-sonnet-20241022","messages":[],"max_tokens":1}'

# Common issues:
# - Invalid API key: Check key format (starts with sk-ant-)
# - Rate limit: Wait and retry
```

## Examples

See `examples/llm_features.py` for complete examples of all LLM features.

## See Also

- [FastAPI Guide](FASTAPI_GUIDE.md)
- [ML Capabilities](ML_CAPABILITIES.md)
- [AI/ML Roadmap](AI_ML_ROADMAP.md)
