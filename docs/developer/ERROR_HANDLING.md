# Error Handling Guide

**Comprehensive error handling strategy for JobSentinel**

---

## Table of Contents

- [Philosophy](#philosophy)
- [Error Types](#error-types)
- [When to Use What](#when-to-use-what)
- [Error Patterns](#error-patterns)
- [Logging Strategy](#logging-strategy)
- [User-Facing Errors](#user-facing-errors)

---

## Philosophy

> **"Errors are not exceptional; they're part of normal operation."**

JobSentinel treats errors as first-class citizens:

1. **Errors are typed**: We use Rust's type system to distinguish error categories
2. **Errors carry context**: Every error explains what went wrong and where
3. **Errors are recoverable**: Graceful degradation over crashes
4. **Errors are logged**: All errors are traced for debugging

---

## Error Types

### 1. `thiserror` - Library Errors

**Use for**: Errors in library code that consumers need to handle

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ScraperError {
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),

    #[error("Failed to parse HTML")]
    ParseError,

    #[error("Rate limit exceeded: retry after {0}s")]
    RateLimited(u64),
}
```

**Benefits:**
- Type-safe error handling
- Automatic `From` implementations
- Good error messages
- Pattern matching support

### 2. `anyhow` - Application Errors

**Use for**: Errors in application code where you want context

```rust
use anyhow::{Context, Result};

pub async fn scrape_company(url: &str) -> Result<Vec<Job>> {
    let response = client.get(url)
        .send()
        .await
        .context("Failed to fetch company page")?;

    let html = response.text()
        .await
        .context("Failed to read response body")?;

    parse_jobs(&html)
        .context(format!("Failed to parse jobs from {}", url))
}
```

**Benefits:**
- Easy context addition
- Error chaining
- Less boilerplate
- Good for application code

### 3. `Box<dyn std::error::Error>` - FFI/Dynamic Errors

**Use for**: Public API boundaries (Tauri commands, config loading)

```rust
impl Config {
    pub fn load(path: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let config: Config = serde_json::from_str(&content)?;
        config.validate()?;
        Ok(config)
    }
}
```

**Benefits:**
- Works with any error type
- Simple to use
- Good for public APIs

---

## When to Use What

| Situation | Use | Example |
|-----------|-----|---------|
| Library with specific errors | `thiserror` | Scraper errors, DB errors |
| Application logic | `anyhow` | Scheduler, command handlers |
| Public API boundaries | `Box<dyn Error>` | Config loading, Tauri commands |
| Cannot fail | Return value directly | Pure computation |

### Decision Tree

```
Is this library code that others will use?
├─ Yes → Use thiserror
│  └─ Define custom error enum
│
└─ No → Is this application code?
   ├─ Yes → Use anyhow::Result
   │  └─ Add context with .context()
   │
   └─ Is this a public API?
      └─ Yes → Use Box<dyn Error>
```

---

## Error Patterns

### Pattern 1: Validation Errors

```rust
fn validate(&self) -> Result<(), Box<dyn std::error::Error>> {
    if self.salary_floor_usd < 0 {
        return Err("Salary floor cannot be negative".into());
    }

    if self.immediate_alert_threshold < 0.0 || self.immediate_alert_threshold > 1.0 {
        return Err("Immediate alert threshold must be between 0.0 and 1.0".into());
    }

    Ok(())
}
```

**Pattern:**
- Early returns for invalid states
- Clear error messages
- Return descriptive errors

### Pattern 2: Network Errors with Retry

```rust
use backoff::{ExponentialBackoff, Operation};

async fn scrape_with_retry(url: &str) -> Result<String> {
    let mut op = || async {
        client.get(url)
            .send()
            .await?
            .text()
            .await
            .map_err(backoff::Error::transient)
    };

    op.retry(ExponentialBackoff::default())
        .await
        .context("Failed to scrape after retries")
}
```

**Pattern:**
- Retry transient errors (network)
- Fail fast on permanent errors (404, 401)
- Log retry attempts

### Pattern 3: Graceful Degradation

```rust
pub async fn scrape(&self) -> ScraperResult {
    let mut all_jobs = Vec::new();

    for company in &self.companies {
        match self.scrape_company(company).await {
            Ok(jobs) => {
                all_jobs.extend(jobs);
            }
            Err(e) => {
                tracing::error!("Failed to scrape {}: {}", company.name, e);
                // Continue with other companies
            }
        }
    }

    Ok(all_jobs)
}
```

**Pattern:**
- Log errors but continue
- Return partial results
- Don't let one failure stop everything

### Pattern 4: Resource Cleanup

```rust
pub async fn run_scraping_cycle(&self) -> Result<ScrapingResult> {
    // Create resources
    let _guard = self.acquire_lock().await?;

    // Do work (errors here will auto-release lock via Drop)
    let jobs = self.scrape_all().await?;
    let results = self.process_jobs(jobs).await?;

    Ok(results)
    // Lock automatically released when _guard drops
}
```

**Pattern:**
- Use RAII for cleanup
- Leverage Rust's ownership
- Automatic cleanup on error

### Pattern 5: Error Context Chain

```rust
pub async fn save_config(&self, path: &Path) -> Result<()> {
    self.validate()
        .context("Config validation failed")?;

    let content = serde_json::to_string_pretty(self)
        .context("Failed to serialize config to JSON")?;

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .context(format!("Failed to create config directory: {:?}", parent))?;
    }

    std::fs::write(path, content)
        .context(format!("Failed to write config to {:?}", path))?;

    Ok(())
}
```

**Pattern:**
- Add context at each step
- Build error chain from bottom up
- Include relevant details in context

---

## Logging Strategy

### Log Levels

```rust
use tracing::{trace, debug, info, warn, error};

// trace: Very detailed, development only
trace!("Parsing HTML element: {:#?}", element);

// debug: Useful for debugging, not in production
debug!("Computed hash for job: {}", hash);

// info: Important state changes, normal operation
info!("Scraping complete: {} jobs found", count);

// warn: Recoverable errors, degraded operation
warn!("Failed to scrape company {}: {}. Continuing...", name, err);

// error: Unrecoverable errors, requires attention
error!("Database connection failed: {}", err);
```

### Structured Logging

```rust
use tracing::{info, error};

// Good ✅: Structured fields
info!(
    company = %company.name,
    jobs_count = jobs.len(),
    duration_ms = start.elapsed().as_millis(),
    "Scraping complete"
);

// Bad ❌: String interpolation only
info!("Scraping {} complete: {} jobs in {}ms",
    company.name, jobs.len(), start.elapsed().as_millis());
```

**Benefits of structured logging:**
- Queryable in log aggregators
- Better for monitoring/alerting
- Easier to parse programmatically

### Error Logging Pattern

```rust
match dangerous_operation().await {
    Ok(result) => {
        info!("Operation succeeded: {:?}", result);
        result
    }
    Err(e) => {
        error!(
            error = %e,
            context = "dangerous_operation",
            "Operation failed"
        );
        return Err(e);
    }
}
```

---

## User-Facing Errors

### Converting Technical Errors to User-Friendly Messages

```rust
#[tauri::command]
pub async fn search_jobs(state: State<'_, AppState>) -> Result<Value, String> {
    match scheduler.run_scraping_cycle().await {
        Ok(result) => {
            Ok(serde_json::json!({
                "success": true,
                "jobs_found": result.jobs_found,
            }))
        }
        Err(e) => {
            tracing::error!("Search failed: {}", e);

            // Convert technical error to user-friendly message
            let user_msg = match e.downcast_ref::<reqwest::Error>() {
                Some(_) => "Network error. Please check your internet connection.",
                None => "An unexpected error occurred. Please try again.",
            };

            Err(user_msg.to_string())
        }
    }
}
```

### Error Message Guidelines

**DO ✅:**
- Explain what happened
- Suggest next steps
- Be specific when possible
- Use plain language

**DON'T ❌:**
- Show stack traces to users
- Use technical jargon
- Blame the user
- Be vague ("An error occurred")

**Examples:**

| Bad ❌ | Good ✅ |
|-------|--------|
| "Error" | "Failed to save configuration. Please check file permissions." |
| "HTTP 404" | "Company page not found. This company may no longer be hiring." |
| "Validation failed" | "Salary must be between $0 and $10,000,000." |
| "Database error" | "Unable to save job. Please make sure the app has write permissions." |

---

## Error Recovery Strategies

### 1. Retry with Exponential Backoff

```rust
use backoff::{ExponentialBackoff, retry};

let result = retry(ExponentialBackoff::default(), || async {
    scrape_company(company)
        .await
        .map_err(|e| {
            if is_rate_limit_error(&e) {
                backoff::Error::transient(e) // Retry
            } else {
                backoff::Error::permanent(e) // Don't retry
            }
        })
}).await?;
```

### 2. Circuit Breaker

```rust
struct CircuitBreaker {
    failures: AtomicUsize,
    threshold: usize,
    open_until: Mutex<Option<Instant>>,
}

impl CircuitBreaker {
    async fn call<F, T>(&self, f: F) -> Result<T>
    where
        F: Future<Output = Result<T>>,
    {
        if self.is_open() {
            return Err(anyhow!("Circuit breaker is open"));
        }

        match f.await {
            Ok(v) => {
                self.on_success();
                Ok(v)
            }
            Err(e) => {
                self.on_failure();
                Err(e)
            }
        }
    }
}
```

### 3. Fallback Values

```rust
fn get_scraping_interval(&self) -> u64 {
    self.config
        .scraping_interval_hours
        .unwrap_or(2) // Fallback to 2 hours
}
```

### 4. Partial Success

```rust
pub struct ScrapingResult {
    pub jobs_found: usize,
    pub jobs_new: usize,
    pub errors: Vec<String>, // Collect errors, don't fail entirely
}
```

---

## Testing Error Paths

### Test Both Success and Failure

```rust
#[test]
fn test_negative_salary_floor_fails() {
    let mut config = create_valid_config();
    config.salary_floor_usd = -1000;

    let result = config.validate();
    assert!(result.is_err(), "Negative salary should fail");
    assert!(result.unwrap_err().to_string().contains("negative"));
}

#[test]
fn test_valid_salary_floor_passes() {
    let mut config = create_valid_config();
    config.salary_floor_usd = 150000;

    assert!(config.validate().is_ok());
}
```

### Test Error Messages

```rust
#[test]
fn test_error_message_quality() {
    let err = validate_webhook_url("http://evil.com");

    assert!(err.is_err());
    let msg = err.unwrap_err().to_string();

    // Verify error message quality
    assert!(msg.contains("HTTPS"), "Should mention HTTPS requirement");
    assert!(msg.contains("hooks.slack.com"), "Should mention correct domain");
}
```

---

## Best Practices Summary

### DO ✅

- Use appropriate error types (`thiserror` vs `anyhow`)
- Add context to errors (`.context()`)
- Log errors with structured fields
- Provide user-friendly error messages
- Test error paths
- Clean up resources automatically (RAII)
- Fail fast on programmer errors (assertions)
- Degrade gracefully on external errors

### DON'T ❌

- Use `.unwrap()` in production code
- Ignore errors silently
- Return generic error messages
- Mix error handling strategies
- Log sensitive data in errors
- Show stack traces to users
- Panic in library code
- Use error strings for control flow

---

## Resources

- [anyhow Documentation](https://docs.rs/anyhow/)
- [thiserror Documentation](https://docs.rs/thiserror/)
- [Rust Error Handling Book](https://doc.rust-lang.org/book/ch09-00-error-handling.html)
- [tracing Documentation](https://docs.rs/tracing/)

---

**Last Updated**: November 14, 2025
**Maintained By**: The Rust Mac Overlord 🦀
