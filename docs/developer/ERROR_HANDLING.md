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

### 1. Domain-Specific Errors with `thiserror`

**Use for**: Module-specific errors with rich context and user-friendly messages

**ScraperError Example:**

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ScraperError {
    #[error("HTTP request failed for {url}: {source}")]
    HttpRequest {
        url: String,
        #[source]
        source: reqwest::Error,
    },

    #[error("HTTP {status} from {url}: {message}")]
    HttpStatus {
        status: u16,
        url: String,
        message: String,
    },

    #[error("Rate limit exceeded for {scraper}: {message}")]
    RateLimit { scraper: String, message: String },

    #[error("Failed to parse {format} from {url}: {source}")]
    ParseError {
        format: String, // "HTML", "JSON", "XML"
        url: String,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    #[error("CAPTCHA detected on {url} - manual intervention required")]
    CaptchaDetected { url: String },
}

impl ScraperError {
    /// Create an HTTP request error with context
    pub fn http_request(url: impl Into<String>, source: reqwest::Error) -> Self {
        Self::HttpRequest {
            url: url.into(),
            source,
        }
    }

    /// Check if this is a transient error that can be retried
    #[must_use]
    pub fn is_retryable(&self) -> bool {
        match self {
            Self::HttpStatus { status, .. } => (*status >= 500 && *status < 600) || *status == 429,
            Self::Timeout { .. } | Self::Network { .. } => true,
            _ => false,
        }
    }

    /// Get a user-friendly error message (safe to show in UI)
    #[must_use]
    pub fn user_message(&self) -> String {
        match self {
            Self::HttpRequest { url, .. } => {
                format!("Failed to connect to {}", Self::sanitize_url(url))
            }
            Self::RateLimit { scraper, .. } => {
                format!("Rate limit reached for {}. Please try again later.", scraper)
            }
            Self::CaptchaDetected { .. } => {
                "CAPTCHA detected. Please complete the challenge in your browser.".to_string()
            }
            _ => self.to_string(),
        }
    }

    /// Sanitize URL for display (remove sensitive query params)
    fn sanitize_url(url: &str) -> String {
        if let Some(base) = url.split('?').next() {
            base.to_string()
        } else {
            url.to_string()
        }
    }
}
```

**Benefits:**

- Type-safe error handling with rich context
- Automatic `From` implementations
- User-friendly messages with `.user_message()`
- Retryability detection with `.is_retryable()`
- URL sanitization to prevent information leakage
- Pattern matching support

**Other Domain-Specific Errors:**

- `DatabaseError` - Database operations with query context
- `AutomationError` - Browser automation errors
- `ConfigError` - Configuration validation errors

### 2. `thiserror` - Library Errors (Legacy Pattern)

**Use for**: Simple library errors (being phased out in favor of domain-specific errors)

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

### 3. `anyhow` - Application Errors

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
| Library with specific errors | Domain-specific `thiserror` | `ScraperError`, `DatabaseError`, `AutomationError` |
| Application logic | `anyhow` | Scheduler, command handlers |
| Public API boundaries | `Box<dyn Error>` | Config loading, Tauri commands |
| Cannot fail | Return value directly | Pure computation |

### Decision Tree

```text
Is this library code that others will use?
├─ Yes → Use domain-specific thiserror error type
│  └─ Define custom error enum with context fields
│      - Add .user_message() for user-friendly errors
│      - Add .is_retryable() if relevant
│      - Sanitize URLs and sensitive data
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

### Pattern 2: Network Errors with Retry and Structured Errors

```rust
async fn scrape_company(&self, company: &Company) -> Result<Vec<Job>, ScraperError> {
    let url = &company.url;
    
    // Make HTTP request with structured error handling
    let response = self.client
        .get(url)
        .send()
        .await
        .map_err(|e| ScraperError::http_request(url, e))?;
    
    // Check status with structured error
    if !response.status().is_success() {
        return Err(ScraperError::http_status(
            response.status().as_u16(),
            url,
            "Failed to fetch jobs"
        ));
    }
    
    // Parse response with error context
    let html = response.text()
        .await
        .map_err(|e| ScraperError::http_request(url, e))?;
    
    // Parse jobs with structured errors
    parse_jobs(&html, url)
        .map_err(|e| ScraperError::parse("HTML", url, e))
}
```

**Pattern:**

- Use domain-specific errors with rich context
- Retry transient errors (`.is_retryable()`)
- Fail fast on permanent errors (404, 401)
- Sanitize URLs in error messages
- Log retry attempts

### Pattern 3: Graceful Degradation with Structured Errors

```rust
pub async fn scrape(&self) -> Result<Vec<Job>, ScraperError> {
    let mut all_jobs = Vec::new();
    let mut errors = Vec::new();

    for company in &self.companies {
        match self.scrape_company(company).await {
            Ok(jobs) => {
                tracing::info!(
                    company = %company.name,
                    jobs_count = jobs.len(),
                    "Successfully scraped company"
                );
                all_jobs.extend(jobs);
            }
            Err(e) => {
                tracing::warn!(
                    company = %company.name,
                    error = %e,
                    user_message = %e.user_message(),
                    retryable = e.is_retryable(),
                    "Failed to scrape company"
                );
                errors.push((company.name.clone(), e));
                // Continue with other companies
            }
        }
    }

    // Return partial results even if some scrapers failed
    if !all_jobs.is_empty() || errors.is_empty() {
        Ok(all_jobs)
    } else {
        // All scrapers failed - return first error
        Err(errors.into_iter().next().unwrap().1)
    }
}
```

**Pattern:**

- Log errors with structured fields
- Use `.user_message()` for user-friendly logging
- Check `.is_retryable()` for retry logic
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
            tracing::error!("Search failed: {:#}", e);

            // Use domain-specific error's user-friendly message
            let user_msg = if let Some(scraper_err) = e.downcast_ref::<ScraperError>() {
                scraper_err.user_message()
            } else if let Some(db_err) = e.downcast_ref::<DatabaseError>() {
                db_err.user_message()
            } else {
                "An unexpected error occurred. Please try again.".to_string()
            };

            Err(user_msg)
        }
    }
}
```

**Security Considerations:**

- URL sanitization removes query parameters (may contain tokens)
- Error messages never expose internal paths or secrets
- Stack traces logged but not shown to users
- `.user_message()` provides safe, user-friendly text

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

- Use appropriate error types (domain-specific `thiserror` vs `anyhow`)
- Add context to errors (`.context()` or structured fields)
- Provide `.user_message()` methods for user-facing errors
- Implement `.is_retryable()` for network errors
- Sanitize URLs and sensitive data in error messages
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

**Last Updated**: January 18, 2026
**Maintained By**: The Rust Mac Overlord 🦀
