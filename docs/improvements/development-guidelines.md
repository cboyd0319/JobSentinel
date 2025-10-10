# Development Guidelines & Common Anti-Patterns to Avoid

**Date Created:** October 9, 2025
**Purpose:** Quick reference guide based on analysis of existing codebase issues
**Target Audience:** All developers working on JobSentinel

## 🚨 CRITICAL ANTI-PATTERNS (Never Do These)

### 1. **Event Loop Conflicts**
❌ **NEVER DO:**
```python
def some_function():
    # This creates a new event loop inside an existing async context
    result = asyncio.run(async_function())
```

✅ **DO INSTEAD:**
```python
async def some_function():
    # Use await in async context
    result = await async_function()

# Or use asyncio.create_task() for fire-and-forget
task = asyncio.create_task(async_function())
```

### 2. **Pipe-to-Bash Downloads**
❌ **NEVER DO:**
```bash
curl -fsSL https://some-site.com/install.sh | bash
```
**Why:** Executes arbitrary code without verification. Massive security vulnerability.

✅ **DO INSTEAD:**
```bash
curl -fsSL https://some-site.com/install.sh -o install.sh
# Verify checksum/signature
sha256sum -c install.sh.sha256
# Review the script
less install.sh
# Then run
bash install.sh
```

### 3. **Hardcoded Configuration in Source**
❌ **NEVER DO:**
```python
# 120+ hardcoded skills in source code
SKILLS = ["Python", "JavaScript", "Java", "Go", "Rust", ...]
```

✅ **DO INSTEAD:**
```python
# External configuration file
with open("config/skills.json") as f:
    skills = json.load(f)
```

### 4. **Browser Instance Waste**
❌ **NEVER DO:**
```python
async def fetch_job_description(url):
    # New browser for every request!
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # ... use browser once and close
```

✅ **DO INSTEAD:**
```python
# Browser pool/singleton pattern
class BrowserPool:
    def __init__(self):
        self._browser = None

    async def get_browser(self):
        if not self._browser:
            p = await async_playwright().start()
            self._browser = await p.chromium.launch()
        return self._browser
```

### 5. **Overly Broad Exception Handling**
❌ **NEVER DO:**
```python
try:
    complex_operation()
except Exception as e:  # Catches EVERYTHING including system errors
    logger.debug(f"Error: {e}")  # And just logs it
```

✅ **DO INSTEAD:**
```python
try:
    complex_operation()
except SpecificError as e:
    # Handle specific known errors
    logger.error(f"Expected error: {e}")
    raise
except (ConnectionError, TimeoutError) as e:
    # Handle network errors specifically
    logger.warning(f"Network error: {e}")
    return retry_operation()
# Let unknown errors bubble up
```

## 🟡 DESIGN ANTI-PATTERNS (Avoid These)

### 6. **Wrong Concurrency Patterns**
❌ **WRONG:**
```python
# Using processes for I/O-bound web scraping
with ProcessPoolExecutor() as executor:
    futures = [executor.submit(web_scrape, url) for url in urls]
```

✅ **CORRECT:**
```python
# Use async for I/O-bound operations
async def scrape_all(urls):
    semaphore = asyncio.Semaphore(50)  # Limit concurrency
    tasks = [limited_scrape(semaphore, url) for url in urls]
    return await asyncio.gather(*tasks)
```

### 7. **Security Theater**
❌ **FAKE SECURITY:**
```bash
read -p "Have you set up billing alerts? [y/N]: " -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please set up billing alerts first"
    exit 1
fi
# User can just type 'y' - no actual verification!
```

✅ **REAL SECURITY:**
```bash
# Actually verify billing alerts exist
if ! gcloud billing budgets list --billing-account=$ACCOUNT | grep -q "JobScraper"; then
    echo "ERROR: No billing alerts found"
    exit 1
fi
```

### 8. **Copy-Paste Programming**
❌ **WRONG:**
```
# Having identical files:
deploy/linux/install.sh
deploy/macos/install.sh
# ^ These are byte-for-byte identical!
```

✅ **CORRECT:**
```
# Platform-specific implementations:
deploy/common/shared_functions.sh
deploy/linux/install.sh    # Linux-specific logic
deploy/macos/install.sh    # macOS-specific logic
```

### 9. **Configuration Scatter**
❌ **SCATTERED:**
```
config.json          # Some config
.env                 # More config
settings.yaml        # Even more config
hardcoded_values.py  # Config in code
```

✅ **CENTRALIZED:**
```
config/
  ├── base.yaml          # Base configuration
  ├── development.yaml   # Dev overrides
  ├── production.yaml    # Prod overrides
  └── schema.json        # Validation schema
```

### 10. **URL Validation Bypass**
❌ **VULNERABLE:**
```python
def _host_matches(url, expected_domain):
    hostname = urlparse(url).hostname.lower()
    return hostname.endswith(f".{expected}")
# evil-google.com passes for google.com!
```

✅ **SECURE:**
```python
def _host_matches(url, expected_domain):
    hostname = urlparse(url).hostname.lower()
    expected = expected_domain.lower()
    return hostname == expected or (
        hostname.endswith(f".{expected}") and
        is_valid_subdomain(hostname, expected)
    )
```

## 📋 BEST PRACTICES CHECKLIST

### Before Writing Code:
- [ ] Is this configuration that should be external?
- [ ] Am I handling errors specifically or just catching Everything?
- [ ] Will this work in an async context?
- [ ] Am I creating resources I should reuse?
- [ ] Is this secure against common attacks?

### Before Committing:
- [ ] Are there any hardcoded values that should be configurable?
- [ ] Did I add proper error handling for all failure modes?
- [ ] Are my async/await patterns correct?
- [ ] Did I add appropriate logging?
- [ ] Are there any security implications?

### Code Review Checklist:
- [ ] No `asyncio.run()` inside async contexts
- [ ] No hardcoded skills, domains, or other config
- [ ] Specific exception handling, not broad `except Exception`
- [ ] Proper resource cleanup (browsers, connections, files)
- [ ] Input validation and sanitization
- [ ] No security theater (fake validations)

## 🔧 COMMON FIXES

### Fix Event Loop Issues:
```python
# Instead of:
def sync_wrapper():
    return asyncio.run(async_func())

# Use:
async def async_wrapper():
    return await async_func()

# Or for existing sync contexts:
def sync_wrapper():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(async_func())
    finally:
        loop.close()
```

### Fix Browser Resource Management:
```python
# Singleton pattern for browser management
class BrowserManager:
    _instance = None
    _browser = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def get_page(self):
        if not self._browser:
            p = await async_playwright().start()
            self._browser = await p.chromium.launch()
        return await self._browser.new_page()
```

### Fix Configuration Management:
```python
from pathlib import Path
import yaml

class Config:
    def __init__(self, config_dir="config"):
        self.config_dir = Path(config_dir)
        self._config = {}
        self._load_config()

    def _load_config(self):
        # Load base config
        base_config = self.config_dir / "base.yaml"
        if base_config.exists():
            with open(base_config) as f:
                self._config = yaml.safe_load(f)

        # Override with environment-specific config
        env = os.getenv("ENVIRONMENT", "development")
        env_config = self.config_dir / f"{env}.yaml"
        if env_config.exists():
            with open(env_config) as f:
                env_overrides = yaml.safe_load(f)
                self._config.update(env_overrides)
```

## 🚨 RED FLAGS IN PULL REQUESTS

If you see any of these in a PR, **BLOCK IT**:
- `asyncio.run()` inside async functions
- `curl | bash` or similar pipe-to-execution
- Hardcoded lists of 50+ items in source code
- `except Exception:` without re-raising
- New browser/connection instances in loops
- Security checks that rely on user honesty
- Identical files with different names
- `# nosec` comments without explanation

## 🎯 PERFORMANCE RED FLAGS

Watch out for these performance killers:
- New browser instances per request
- Synchronous operations in async functions
- No connection pooling for HTTP requests
- Loading entire datasets into memory
- No caching for repeated operations
- Process pools for I/O-bound tasks
- Nested loops with network calls

## 📊 METRICS TO MONITOR

Always measure these in new code:
- **Memory usage** - Should be stable, not growing
- **Response times** - Should be consistent
- **Error rates** - Should be <1% for normal operations
- **Resource utilization** - CPU/memory should be reasonable
- **Concurrent performance** - Should scale linearly with reasonable limits

## 💡 QUICK WINS

Easy improvements that have big impact:
1. **Add connection pooling** - Massive performance improvement
2. **Externalize hardcoded values** - Much easier maintenance
3. **Implement circuit breakers** - Better reliability
4. **Add proper logging** - Much easier debugging
5. **Use specific exceptions** - Better error handling
6. **Add input validation** - Better security
7. **Implement caching** - Better performance and reduced load

---

**Remember:** It's much easier to do things right the first time than to fix them later. When in doubt, ask for a code review before implementing complex patterns.

**Last Updated:** October 9, 2025