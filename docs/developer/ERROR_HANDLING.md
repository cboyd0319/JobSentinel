# Error Handling Guide

**Comprehensive error handling strategy for JobSentinel**

---

## Table of Contents

- [Philosophy](#philosophy)
- [Error Types](#error-types)
- [When to Use What](#when-to-use-what)
- [Error Patterns](ERROR_HANDLING_PATTERNS.md)
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

### 1. Domain-Specific Errors with Controlled Display

**Use for**: Module-specific errors with rich context, user-friendly messages,
and safe display output for logs or stored health rows.

**ScraperError Example:**

```rust
use crate::core::url_security::sanitize_url_for_logging;
use std::fmt;

#[derive(Debug)]
pub enum ScraperError {
    HttpRequest {
        url: String,
        source: reqwest::Error,
    },

    HttpStatus {
        status: u16,
        url: String,
        message: String,
    },

    RateLimit { scraper: String, message: String },

    ParseError {
        format: String, // "HTML", "JSON", "XML"
        url: String,
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    CaptchaDetected { url: String },
}

impl fmt::Display for ScraperError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::HttpRequest { url, source } => {
                write!(
                    f,
                    "HTTP request failed for {}: {}",
                    Self::sanitize_url(url),
                    source
                )
            }
            Self::HttpStatus { status, url, message } => {
                write!(f, "HTTP {status} from {}: {message}", Self::sanitize_url(url))
            }
            Self::RateLimit { scraper, message } => {
                write!(f, "Rate limit exceeded for {scraper}: {message}")
            }
            Self::ParseError { format, url, source } => {
                write!(
                    f,
                    "Failed to parse {} from {}: {}",
                    format,
                    Self::sanitize_url(url),
                    source
                )
            }
            Self::CaptchaDetected { url } => {
                write!(
                    f,
                    "CAPTCHA detected on {} - manual intervention required",
                    Self::sanitize_url(url)
                )
            }
        }
    }
}

impl std::error::Error for ScraperError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::HttpRequest { source, .. } => Some(source),
            Self::ParseError { source, .. } => Some(source.as_ref()),
            _ => None,
        }
    }
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

    /// Sanitize URL for display (remove sensitive URL parts)
    fn sanitize_url(url: &str) -> String {
        sanitize_url_for_logging(url)
    }
}
```

**Benefits:**

- Type-safe error handling with rich context
- Explicit display and source chaining where sensitive fields need sanitizing
- User-friendly messages with `.user_message()`
- Retryability detection with `.is_retryable()`
- URL sanitization to prevent information leakage
- Pattern matching support

**Other Domain-Specific Errors:**

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

### 4. `Box<dyn std::error::Error>` - FFI/Dynamic Errors

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
| Library with specific errors | Domain-specific error enum | `ScraperError`, `AutomationError` |
| Application logic | `anyhow` | Scheduler, command handlers |
| Public API boundaries | `Box<dyn Error>` | Config loading, Tauri commands |
| Cannot fail | Return value directly | Pure computation |

### Decision Tree

Use this sequence:

1. Library code that others will use: define a domain-specific error enum.
2. Domain error enum: include context fields, controlled `Display` output,
   `.user_message()` for user-facing text, `.is_retryable()` when relevant, and URL or
   sensitive-data sanitization.
3. Application code: use `anyhow::Result` with `.context()`.
4. Public API boundary: use `Box<dyn Error>` only where the caller needs a generic
   error type.

---

## Error Patterns

Detailed validation, network, degradation, cleanup, and context-chain examples live in [Error Handling Patterns](ERROR_HANDLING_PATTERNS.md).

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
use tracing::{error, info};

// Good: structured fields
info!(
    company = %company.name,
    jobs_count = jobs.len(),
    duration_ms = start.elapsed().as_millis(),
    "Scraping complete"
);

// Bad: string interpolation only
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
            } else {
                "JobSentinel ran into a problem. Please try again.".to_string()
            };

            Err(user_msg)
        }
    }
}
```

**Security Considerations:**

- URL sanitization removes credentials, query parameters, and fragments before
  error display or logging
- Error messages never expose internal paths or secrets
- Stack traces logged but not shown to users
- `.user_message()` provides safe, user-friendly text

### Error Message Guidelines

**Do:**

- Explain what happened
- Suggest next steps
- Be specific when possible
- Use plain language

**Do not:**

- Show stack traces to users
- Use technical jargon
- Blame the user
- Be vague ("An error occurred")

**Examples:**

| Bad | Good |
| --- | ---- |
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

### Do

- Use appropriate error types (domain-specific `thiserror` vs `anyhow`)
- Add context to errors (`.context()` or structured fields)
- Provide `.user_message()` methods for user-facing errors
- Implement `.is_retryable()` for network errors
- Sanitize URLs and sensitive data in error messages and logs
- Log errors with structured fields
- Provide user-friendly error messages
- Test error paths
- Clean up resources automatically (RAII)
- Fail fast on programmer errors (assertions)
- Degrade gracefully on external errors

### Do Not

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
