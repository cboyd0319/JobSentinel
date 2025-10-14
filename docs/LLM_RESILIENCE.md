# LLM Resilience & Cost Management

**Version:** 0.6.0  
**Last Updated:** October 2025  
**Purpose:** Guide to using JobSentinel's resilient LLM client with automatic failover and cost controls

---

## Overview

JobSentinel includes a production-ready LLM client with:
- **Automatic Failover**: Seamlessly switches between providers if one fails
- **Retry Logic**: Exponential backoff with jitter for transient errors
- **Cost Controls**: Budget limits to prevent surprise bills
- **Response Caching**: Reduces costs by caching repeated queries
- **Offline Detection**: Gracefully handles disconnected environments

---

## Quick Start

### Basic Usage

```python
from domains.llm.resilient_client import create_default_resilient_client

# Create client with sensible defaults
client = create_default_resilient_client()

# Generate text (will try Ollama first, then fallback to OpenAI/Anthropic)
response = await client.generate(
    prompt="Write a cover letter for a Senior Python Developer position",
    system_prompt="You are a professional career advisor",
)

print(response.content)
print(f"Provider: {response.provider}")
print(f"Cost: ${response.cost_usd:.4f}")
print(f"Cached: {response.cached}")
```

### Advanced Configuration

```python
from domains.llm.client import LLMConfig, LLMProvider
from domains.llm.resilient_client import ResilientLLMClient, BudgetConfig

# Configure primary and fallback providers
primary = LLMConfig(
    provider=LLMProvider.OLLAMA,
    model="llama3.1:8b",
    temperature=0.7,
    max_tokens=2000,
)

fallbacks = [
    LLMConfig(
        provider=LLMProvider.OPENAI,
        model="gpt-4o-mini",
        temperature=0.7,
    ),
    LLMConfig(
        provider=LLMProvider.ANTHROPIC,
        model="claude-3-haiku-20240307",
        temperature=0.7,
    ),
]

# Configure budget limits
budget = BudgetConfig(
    max_cost_per_request=0.10,  # Max $0.10 per request
    max_cost_per_day=5.00,       # Max $5/day
    max_cost_per_month=50.00,    # Max $50/month
    warn_threshold=0.80,          # Warn at 80% of budget
)

# Create client
client = ResilientLLMClient(
    primary_config=primary,
    fallback_configs=fallbacks,
    enable_cache=True,
    cache_ttl=3600,  # 1 hour
    budget_config=budget,
)

# Generate with automatic failover
response = await client.generate(
    prompt="Analyze this job description...",
    bypass_cache=False,  # Use cache if available
)
```

---

## Features

### 1. Automatic Provider Failover

The client automatically tries providers in order:
1. **Ollama** (local, free, private) - tried first
2. **OpenAI** (if API key available) - fallback #1
3. **Anthropic** (if API key available) - fallback #2

If a provider is unavailable or fails, the next one is tried automatically.

**Example:**
```python
# Ollama is down, client will automatically try OpenAI
response = await client.generate("Write a cover letter...")
# -> Tries Ollama (fails) -> Tries OpenAI (succeeds)
```

**Logs:**
```
[WARNING] Provider not available, trying next provider=ollama is_primary=True
[INFO] Generating with LLM provider provider=openai model=gpt-4o-mini estimated_cost=0.002 is_primary=False
[INFO] Successfully generated response provider=openai model=gpt-4o-mini tokens=450 cost=0.0023
```

### 2. Retry Logic with Exponential Backoff

Transient errors (network issues, timeouts) are automatically retried:
- **Max Attempts**: 3
- **Backoff**: Exponential with jitter (1s, 2s, 4s, 8s, 10s max)
- **Retry Errors**: ConnectionError, TimeoutError

**Example:**
```python
# Temporary network issue, client will retry
response = await client.generate("Analyze this resume...")
# -> Attempt 1 (fails) -> Wait 1s -> Attempt 2 (fails) -> Wait 2s -> Attempt 3 (succeeds)
```

### 3. Response Caching

Identical prompts return cached responses to save time and money:
- **Cache Duration**: 1 hour (configurable)
- **Cache Key**: SHA256 hash of prompt
- **Cache Invalidation**: Automatic after TTL expires
- **Bypass**: Use `bypass_cache=True` to skip cache

**Example:**
```python
# First request (cache miss)
response1 = await client.generate("Write a cover letter for Software Engineer")
# -> Calls LLM API, caches response

# Second request (cache hit)
response2 = await client.generate("Write a cover letter for Software Engineer")
# -> Returns cached response instantly (free!)
assert response2.cached == True
assert response2.cost_usd == 0.0
```

**Cache Statistics:**
```python
# Clear cache
client.cache.clear()
```

### 4. Budget Tracking & Limits

Prevent surprise bills with automatic budget enforcement:

**Budget Tiers:**
- **Per-Request Limit**: Max cost for a single request
- **Daily Limit**: Total spending per 24 hours
- **Monthly Limit**: Total spending per 30 days

**Default Limits:**
```python
BudgetConfig(
    max_cost_per_request=0.10,   # $0.10 per request
    max_cost_per_day=5.00,        # $5 per day
    max_cost_per_month=50.00,     # $50 per month
    warn_threshold=0.80,           # Warn at 80%
)
```

**Budget Enforcement:**
```python
# Will raise ValueError if budget exceeded
try:
    response = await client.generate("Very long prompt...")
except ValueError as e:
    print(f"Budget limit: {e}")
    # -> "Budget limit: Would exceed daily budget ($5.12 > $5.00)"
```

**Budget Warnings:**
```
[WARNING] Approaching daily budget limit current=4.15 limit=5.0
```

**Budget Reset:**
- Daily budget resets every 24 hours
- Monthly budget resets every 30 days
- Automatic, no manual intervention needed

### 5. Offline Mode Detection

Check if all providers are unavailable:

```python
if client.is_offline():
    print("⚠️  All LLM providers are offline")
    print("Please start Ollama or configure API keys")
else:
    response = await client.generate("...")
```

**Provider Status:**
```python
status = client.get_status()
# {
#   "primary": {"provider": "ollama", "available": False},
#   "fallback_0": {"provider": "openai", "available": True},
#   "fallback_1": {"provider": "anthropic", "available": False}
# }
```

---

## Provider Comparison

| Feature | Ollama | OpenAI | Anthropic |
|---------|--------|--------|-----------|
| **Privacy** | ✅ 100% local | ⚠️ Cloud API | ⚠️ Cloud API |
| **Cost** | ✅ FREE | ⚠️ $0.15-$30/1M tokens | ⚠️ $0.25-$15/1M tokens |
| **Speed** | ⚠️ Slower (CPU/GPU) | ✅ Fast | ✅ Fast |
| **Availability** | ⚠️ Local server required | ✅ 99.9% uptime | ✅ 99.9% uptime |
| **Models** | ✅ Llama, Mistral, etc. | ✅ GPT-4, GPT-3.5 | ✅ Claude 3 |
| **Setup** | ⚠️ Manual installation | ✅ API key only | ✅ API key only |

**Recommendations:**
- **Default**: Use Ollama for 100% privacy and $0 cost
- **Fallback**: Configure OpenAI/Anthropic for high availability
- **Production**: Use Ollama + OpenAI fallback for best balance

---

## Cost Estimates

### Ollama (Local)
- **Cost**: $0 (FREE)
- **Privacy**: 100% local, no data leaves your machine
- **Setup**: Install Ollama, download model (~4-8GB)

### OpenAI
- **GPT-4o-mini**: $0.15/1M input tokens, $0.60/1M output tokens
- **GPT-4o**: $2.50/1M input tokens, $10.00/1M output tokens
- **Example**: Cover letter (500 tokens) ≈ $0.002-0.005

### Anthropic
- **Claude 3 Haiku**: $0.25/1M input tokens, $1.25/1M output tokens
- **Claude 3 Sonnet**: $3.00/1M input tokens, $15.00/1M output tokens
- **Example**: Cover letter (500 tokens) ≈ $0.003-0.008

**Monthly Cost Examples:**
- **100 cover letters** (Ollama): $0
- **100 cover letters** (OpenAI GPT-4o-mini): ~$0.30
- **100 cover letters** (OpenAI GPT-4o): ~$2.50
- **1000 cover letters** (OpenAI GPT-4o-mini): ~$3.00

---

## Best Practices

### 1. Use Ollama as Primary
```python
# ✅ GOOD: Free, private, no API keys needed
client = create_default_resilient_client()
```

### 2. Enable Caching
```python
# ✅ GOOD: Saves money and time
client = ResilientLLMClient(
    primary_config=config,
    enable_cache=True,  # Default
    cache_ttl=3600,     # 1 hour
)
```

### 3. Set Budget Limits
```python
# ✅ GOOD: Prevents surprise bills
budget = BudgetConfig(
    max_cost_per_day=5.00,     # Reasonable daily limit
    max_cost_per_month=50.00,  # Monthly cap
)
```

### 4. Monitor Costs
```python
# ✅ GOOD: Track spending
response = await client.generate("...")
print(f"Cost: ${response.cost_usd:.4f}")
print(f"Provider: {response.provider}")
```

### 5. Handle Budget Errors
```python
# ✅ GOOD: Graceful degradation
try:
    response = await client.generate("...")
except ValueError as e:
    if "budget" in str(e).lower():
        print("⚠️  Budget limit reached")
        # Fall back to manual workflow
```

---

## Troubleshooting

### Problem: All providers fail

**Symptoms:**
```
Exception: All LLM providers failed. Last error: ...
```

**Solutions:**
1. Check Ollama is running: `curl http://localhost:11434/api/tags`
2. Verify API keys: `echo $OPENAI_API_KEY`
3. Check internet connectivity
4. Review logs for specific errors

### Problem: Budget limit exceeded

**Symptoms:**
```
ValueError: Budget limit: Would exceed daily budget ($5.12 > $5.00)
```

**Solutions:**
1. Wait for budget reset (next day/month)
2. Increase budget limits in BudgetConfig
3. Use Ollama (FREE) instead of cloud APIs
4. Clear cache to reuse previous responses

### Problem: Cached responses are stale

**Symptoms:**
```
# Response is outdated but served from cache
```

**Solutions:**
1. Use `bypass_cache=True` to skip cache
2. Reduce `cache_ttl` (e.g., 600 seconds = 10 minutes)
3. Clear cache manually: `client.cache.clear()`

### Problem: Ollama not available

**Symptoms:**
```
[WARNING] Provider not available, trying next provider=ollama
```

**Solutions:**
1. Install Ollama: https://ollama.ai/download
2. Start Ollama: `ollama serve`
3. Download model: `ollama pull llama3.1:8b`
4. Verify: `curl http://localhost:11434/api/tags`

---

## API Reference

### ResilientLLMClient

```python
class ResilientLLMClient:
    def __init__(
        self,
        primary_config: LLMConfig,
        fallback_configs: list[LLMConfig] | None = None,
        enable_cache: bool = True,
        cache_ttl: int = 3600,
        budget_config: BudgetConfig | None = None,
    )

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        bypass_cache: bool = False,
    ) -> LLMResponse

    def is_offline(self) -> bool

    def get_status(self) -> dict[str, bool]
```

### BudgetConfig

```python
@dataclass
class BudgetConfig:
    max_cost_per_request: float = 0.10   # Max $0.10 per request
    max_cost_per_day: float = 5.00       # Max $5/day
    max_cost_per_month: float = 50.00    # Max $50/month
    warn_threshold: float = 0.80         # Warn at 80%
```

### ResponseCache

```python
class ResponseCache:
    def __init__(self, ttl_seconds: int = 3600)

    def get(self, prompt: str) -> LLMResponse | None

    def set(self, prompt: str, response: LLMResponse) -> None

    def clear(self) -> None
```

---

## Examples

### Example 1: Cover Letter Generation

```python
from domains.llm.resilient_client import create_default_resilient_client

async def generate_cover_letter(job_title: str, company: str, description: str, resume: str):
    client = create_default_resilient_client()

    prompt = f"""
    Write a professional cover letter for:
    - Job Title: {job_title}
    - Company: {company}
    - Job Description: {description}
    - My Resume: {resume}
    """

    try:
        response = await client.generate(
            prompt=prompt,
            system_prompt="You are a professional career advisor",
            temperature=0.7,
            max_tokens=500,
        )

        print(f"Cover letter generated by {response.provider}")
        print(f"Cost: ${response.cost_usd:.4f}")
        print(f"Cached: {response.cached}")
        print(f"\n{response.content}")

        return response.content

    except Exception as e:
        print(f"Error: {e}")
        return None
```

### Example 2: Batch Processing with Budget Control

```python
from domains.llm.resilient_client import create_default_resilient_client, BudgetConfig

async def batch_analyze_jobs(job_descriptions: list[str]):
    # Set strict budget for batch job
    budget = BudgetConfig(
        max_cost_per_request=0.05,   # $0.05 per job
        max_cost_per_day=10.00,      # $10 total
    )

    client = create_default_resilient_client(budget_config=budget)

    total_cost = 0.0
    results = []

    for i, description in enumerate(job_descriptions):
        try:
            response = await client.generate(
                prompt=f"Analyze this job:\n{description}",
                system_prompt="You are a job market analyst",
            )

            results.append(response.content)
            total_cost += response.cost_usd

            print(f"✓ Job {i+1}/{len(job_descriptions)} analyzed")
            print(f"  Cost: ${response.cost_usd:.4f} | Total: ${total_cost:.4f}")

        except ValueError as e:
            print(f"⚠️  Budget limit reached: {e}")
            break

    return results
```

### Example 3: Provider Status Check

```python
from domains.llm.resilient_client import create_default_resilient_client

def check_llm_providers():
    client = create_default_resilient_client()

    if client.is_offline():
        print("❌ All LLM providers are offline")
        print("\nSetup instructions:")
        print("1. Install Ollama: https://ollama.ai/download")
        print("2. Or set API keys: OPENAI_API_KEY, ANTHROPIC_API_KEY")
        return False

    status = client.get_status()
    print("LLM Provider Status:")
    for name, info in status.items():
        icon = "✅" if info["available"] else "❌"
        print(f"  {icon} {info['provider']}: {'Available' if info['available'] else 'Offline'}")

    return True
```

---

## Security & Privacy

### Data Flow
1. **Ollama** (default): All data stays on your machine
2. **OpenAI/Anthropic**: Data sent to external APIs via HTTPS

### Recommendations
- ✅ Use Ollama for sensitive data (resumes, job descriptions)
- ⚠️ Be cautious with cloud APIs for personal information
- ✅ Review provider privacy policies before use
- ✅ Disable fallback providers if privacy is critical

### API Key Security
```bash
# ✅ GOOD: Use environment variables
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."

# ❌ BAD: Never commit API keys to code
# config = LLMConfig(api_key="sk-hardcoded-key")  # DON'T DO THIS
```

---

## Monitoring & Logging

### Log Levels
- **INFO**: Normal operations (provider used, costs, cache hits)
- **WARNING**: Fallback attempts, budget warnings
- **ERROR**: All providers failed, budget exceeded

### Sample Logs
```
[INFO] Initialized resilient LLM client primary_provider=ollama fallback_count=2 cache_enabled=True
[INFO] Generating with LLM provider provider=ollama model=llama3.1:8b estimated_cost=0.0 is_primary=True
[INFO] Successfully generated response provider=ollama model=llama3.1:8b tokens=450 cost=0.0
[INFO] Cached LLM response cache_key=a3f2b1c ttl=3600
[WARNING] Approaching daily budget limit current=4.15 limit=5.0
[INFO] Using cached LLM response cache_key=a3f2b1c
[ERROR] All LLM providers failed last_error=Connection refused
```

---

## Related Documentation
- [LLM_GUIDE.md](LLM_GUIDE.md) - Complete LLM integration guide
- [API_SPECIFICATION.md](API_SPECIFICATION.md) - REST API for LLM features
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Production deployment
- [BEST_PRACTICES.md](BEST_PRACTICES.md) - Coding best practices

---

**Version History:**
- 0.6.0 (October 2025) - Initial resilient LLM client implementation

**Questions?** See [troubleshooting.md](troubleshooting.md) or open an issue on GitHub.
