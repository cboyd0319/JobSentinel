# Adding New Deep Link Sites

Quick guide for adding support for new sites to Job Site Search Links.

## Overview

Adding a new site requires changes to 3 files:

1. `crates/jobsentinel-core/src/core/deeplinks/sites.rs` - Add site metadata
2. `crates/jobsentinel-core/src/core/deeplinks/generator.rs` - Add URL generator
3. Update tests

**Estimated time:** 10-15 minutes per site

## Step 1: Research the Site

Before adding a site, you need to understand its URL structure.

### Manual Testing

1. Visit the job site
2. Perform a manual search (e.g., "Customer Support" in "Chicago, IL")
3. Look at the URL in the address bar
4. Try different searches and note the URL patterns

### Example Research

**Indeed:**

```text
Search: "Customer Support" in "Chicago, IL"
URL: https://www.indeed.com/jobs?q=Customer+Support&l=Chicago%2C+IL

Parameters:
- q = query (job title/keywords)
- l = location
- jt = job type (fulltime, parttime, contract)
- remotejob = remote filter (UUID for remote jobs)
```

**LinkedIn:**

```text
Search: "Project Coordinator" in "Chicago, IL"
URL: https://www.linkedin.com/jobs/search/?keywords=Project+Coordinator&location=Chicago%2C+IL

Parameters:
- keywords = query
- location = location
- f_JT = job type (F=full-time, P=part-time, C=contract)
- f_WT = work type (1=onsite, 2=remote, 3=hybrid)
```

### What to Document

- Base URL
- Query parameter name (e.g., `q`, `keywords`, `search`)
- Location parameter name (e.g., `l`, `location`, `where`)
- Job type parameter (if supported)
- Remote filter parameter (if supported)
- Any required parameters
- Special encoding requirements

## Step 2: Add Site Metadata

**File:** `crates/jobsentinel-core/src/core/deeplinks/sites.rs`

Add a new `SiteInfo` entry to the `get_all_sites()` function:

```rust
pub fn get_all_sites() -> Vec<SiteInfo> {
    vec![
        // ... existing sites ...

        // Add your site here
        SiteInfo {
            id: "newsite".to_string(),              // Unique identifier (lowercase, no spaces)
            name: "NewSite Jobs".to_string(),       // Display name
            category: SiteCategory::General,        // Category (see below)
            requires_login: false,                  // Does it require login?
            logo_url: None,
            notes: Some("Brief description of what makes this site unique".to_string()),
        },
    ]
}
```

### Site Categories

Choose the most appropriate category:

- `SiteCategory::General` - Large general job boards
- `SiteCategory::Tech` - Developer/IT-focused boards
- `SiteCategory::Government` - Government job boards
- `SiteCategory::Remote` - Remote work specialists
- `SiteCategory::Startups` - Startup/early-stage company jobs
- `SiteCategory::Cleared` - Security clearance required
- `SiteCategory::Professional` - Professional networking sites

### Finding the Logo URL

1. Visit the site
2. Right-click and choose "View Page Source"
3. Do not add remote favicon or logo URLs. The UI uses local initials so the
   search-link panel does not contact job boards until the user opens a link.

## Step 3: Add URL Generator

**File:** `crates/jobsentinel-core/src/core/deeplinks/generator.rs`

### 3.1: Add Function Call to Router

Find the `generate_url_for_site()` function and add your site:

```rust
fn generate_url_for_site(site_id: &str, criteria: &SearchCriteria) -> Result<String> {
    match site_id {
        "indeed" => generate_indeed_url(criteria),
        "linkedin" => generate_linkedin_url(criteria),
        // ... existing sites ...
        "newsite" => generate_newsite_url(criteria),  // Add this line
        _ => anyhow::bail!("Unsupported site: {}", site_id),
    }
}
```

### 3.2: Implement Generator Function

Add the generator function at the end of the file:

```rust
fn generate_newsite_url(criteria: &SearchCriteria) -> Result<String> {
    // Start with base URL and query parameter
    let mut url = format!(
        "https://www.newsite.com/jobs?q={}",
        encode(&criteria.query)
    );

    // Add location (if provided and supported)
    if let Some(location) = &criteria.location {
        url.push_str(&format!("&location={}", encode(location)));
    }

    // Add job type filter (if supported)
    if let Some(job_type) = criteria.job_type {
        let jt = match job_type {
            JobType::FullTime => "full-time",
            JobType::PartTime => "part-time",
            JobType::Contract => "contract",
            JobType::Temporary => "temporary",
            JobType::Internship => "internship",
            _ => "",
        };
        if !jt.is_empty() {
            url.push_str(&format!("&type={}", jt));
        }
    }

    // Add remote filter (if supported)
    if criteria.remote_type == Some(RemoteType::Remote) {
        url.push_str("&remote=true");
    }

    Ok(url)
}
```

### URL Building Patterns

**Simple (query only):**

```rust
fn generate_simple_url(criteria: &SearchCriteria) -> Result<String> {
    Ok(format!(
        "https://example.com/search?q={}",
        encode(&criteria.query)
    ))
}
```

**With optional location:**

```rust
fn generate_with_location_url(criteria: &SearchCriteria) -> Result<String> {
    let mut url = format!(
        "https://example.com/jobs?query={}",
        encode(&criteria.query)
    );

    if let Some(location) = &criteria.location {
        url.push_str(&format!("&loc={}", encode(location)));
    }

    Ok(url)
}
```

**With remote filter:**

```rust
if criteria.remote_type == Some(RemoteType::Remote) {
    url.push_str("&remote=1");
}
```

**With job type mapping:**

```rust
if let Some(job_type) = criteria.job_type {
    let type_param = match job_type {
        JobType::FullTime => "ft",
        JobType::PartTime => "pt",
        JobType::Contract => "ct",
        _ => "",
    };
    if !type_param.is_empty() {
        url.push_str(&format!("&type={}", type_param));
    }
}
```

## Step 4: Add Tests

**File:** `crates/jobsentinel-core/src/core/deeplinks/generator.rs`

Add a test for your new site in the `#[cfg(test)]` mod tests section:

```rust
#[test]
fn test_generate_newsite_url() {
    let criteria = SearchCriteria {
        query: "Customer Support".to_string(),
        location: Some("Chicago, IL".to_string()),
        experience_level: None,
        job_type: None,
        remote_type: None,
    };

    let url = generate_newsite_url(&criteria).unwrap();
    assert!(url.contains("newsite.com"));
    assert!(url.contains("Customer%20Support"));
    assert!(url.contains("Chicago"));
}

#[test]
fn test_generate_newsite_url_with_remote() {
    let mut criteria = create_basic_criteria();
    criteria.remote_type = Some(RemoteType::Remote);

    let url = generate_newsite_url(&criteria).unwrap();
    assert!(url.contains("remote=true"));
}
```

## Step 5: Verify

### Run Tests

```bash
cd src-tauri
cargo test --lib deeplinks
```

All tests should pass, including your new ones.

### Manual Testing

1. Build and run the app
2. Go to the Search Links page
3. Enter a search query
4. Click "Create Search Links"
5. Find your new site in the results
6. Click "Open Search"
7. Verify the URL is correct and the search works

## Common Issues

### Issue: URL encoding is wrong

**Problem:** Special characters not encoded properly
**Solution:** Use `encode()` from `urlencoding` crate:

```rust
format!("?q={}", encode(&criteria.query))
```

### Issue: Site doesn't appear

**Problem:** Forgot to add to router
**Solution:** Add site to `generate_url_for_site()` match statement

### Issue: Logo doesn't show

**Problem:** CORS or invalid URL
**Solution:** Test logo URL in browser first, use full HTTPS URL

### Issue: Remote filter doesn't work

**Problem:** Site uses different parameter
**Solution:** Research site's actual remote parameter (try variations like `remote=1`, `isRemote=true`, `workType=remote`)

## Examples

### Example 1: Simple Site (Query Only)

```rust
// Site info
SiteInfo {
    id: "jobboard".to_string(),
    name: "JobBoard.com".to_string(),
    category: SiteCategory::General,
    requires_login: false,
    logo_url: None,
    notes: None,
}

// Generator
fn generate_jobboard_url(criteria: &SearchCriteria) -> Result<String> {
    Ok(format!(
        "https://jobboard.com/search?keywords={}",
        encode(&criteria.query)
    ))
}
```

### Example 2: Site with All Parameters

```rust
// Site info
SiteInfo {
    id: "techjobs".to_string(),
    name: "TechJobs".to_string(),
    category: SiteCategory::Tech,
    requires_login: true,
    logo_url: None,
    notes: Some("Requires login for full results".to_string()),
}

// Generator
fn generate_techjobs_url(criteria: &SearchCriteria) -> Result<String> {
    let mut url = format!(
        "https://techjobs.io/search?q={}",
        encode(&criteria.query)
    );

    if let Some(location) = &criteria.location {
        url.push_str(&format!("&loc={}", encode(location)));
    }

    if let Some(job_type) = criteria.job_type {
        let jt = match job_type {
            JobType::FullTime => "fulltime",
            JobType::Contract => "contract",
            _ => "",
        };
        if !jt.is_empty() {
            url.push_str(&format!("&employment={}", jt));
        }
    }

    if criteria.remote_type == Some(RemoteType::Remote) {
        url.push_str("&remote=yes");
    }

    Ok(url)
}
```

## Checklist

Before submitting:

- [ ] Site info added to `sites.rs`
- [ ] Logo URL tested and working
- [ ] Category selected appropriately
- [ ] URL generator function implemented
- [ ] Function added to router match statement
- [ ] At least 2 tests added (basic + one filter)
- [ ] All tests pass (`cargo test --lib deeplinks`)
- [ ] Manual testing completed
- [ ] Documentation updated (if needed)

## Pull Request Template

When submitting a PR to add a new site:

```markdown
## Add [Site Name] to Search Links

**Site:** [Site Name]
**URL:** https://example.com
**Category:** [General/Tech/Government/Remote/Startups/Cleared/Professional]

### URL Parameters Supported

- [x] Query
- [x] Location
- [ ] Job Type
- [x] Remote Filter

### Testing

- [x] Tests pass
- [x] Manual testing completed
- [x] Logo displays correctly

### Example URL

https://example.com/jobs?q=Customer%20Support&location=Chicago%2C%20IL&remote=true
```

## Questions?

- Check existing implementations in `generator.rs`
- Look at tests for examples
- Ask in GitHub Discussions: <https://github.com/cboyd0319/JobSentinel/discussions>
