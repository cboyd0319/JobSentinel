# Error Handling Patterns

Use these implementation patterns after choosing the error type and boundary described in [Error Handling Guide](ERROR_HANDLING.md).

## Patterns

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
    let jobs = self.fetch_jobs().await?;
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
        ensure_private_dir(parent)
            .context("Failed to create config directory")?;
    }

    let mut temp = tempfile::NamedTempFile::new_in(
        path.parent().context("Config path must have a parent directory")?,
    )
    .context("Failed to create temporary config file")?;
    temp.write_all(content.as_bytes())
        .context("Failed to write temporary config file")?;
    temp.as_file()
        .sync_all()
        .context("Failed to flush temporary config file")?;
    temp.into_temp_path()
        .persist(path)
        .map_err(|err| err.error)
        .context("Failed to replace config file")?;

    Ok(())
}
```

**Pattern:**

- Add context at each step
- Build error chain from bottom up
- Include relevant details in context, but do not include raw local paths or secrets

---
