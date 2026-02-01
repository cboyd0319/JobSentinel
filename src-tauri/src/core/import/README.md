# Universal Job Importer

Import jobs from any website URL by parsing Schema.org/JobPosting structured data.

## Overview

The Universal Job Importer allows users to manually import individual jobs from any job posting URL. It works by:

1. Fetching the HTML from a user-provided URL (single page, user-initiated)
2. Parsing Schema.org/JobPosting JSON-LD structured data from the page
3. Extracting job details (title, company, location, salary, description, etc.)
4. Inserting the job into the JobSentinel database

## Legal Compliance

This implementation is designed for legal compliance:

- **User-initiated**: User manually provides the URL
- **Single-page fetch**: Only fetches one specific job page
- **Public data**: Only reads publicly available data
- **Schema.org standard**: Uses machine-readable data format designed for this purpose
- **No scraping**: Does not crawl or scrape multiple pages

## Architecture

```
src/core/import/
├── mod.rs           - Module entry point
├── types.rs         - Import-specific types (errors, preview, Schema.org structs)
├── fetcher.rs       - HTTP fetcher for single job pages
├── schema_org.rs    - Schema.org/JobPosting parser
└── tests.rs         - Unit tests
```

## Usage

### Backend (Rust)

```rust
use crate::core::import::{fetch_job_page, parse_schema_org_job_posting, create_preview};

// Fetch job page
let html = fetch_job_page("https://example.com/jobs/123").await?;

// Parse Schema.org data
let postings = parse_schema_org_job_posting(&html)?;

// Create preview
let preview = create_preview(&postings[0], url.clone(), already_exists)?;
```

### Frontend (TypeScript)

```typescript
import { invoke } from "@tauri-apps/api/core";

// Preview import
const preview = await invoke("preview_job_import", {
  url: "https://example.com/jobs/123"
});

// Import job
const job = await invoke("import_job_from_url", {
  url: "https://example.com/jobs/123"
});
```

## Schema.org JobPosting Support

The importer supports the following Schema.org JobPosting fields:

### Required Fields
- `title` (or `name`)
- `hiringOrganization.name`

### Optional Fields
- `description` - Job description (HTML or plain text)
- `jobLocation` - Location (single or array)
- `baseSalary` - Salary information (string or object)
- `datePosted` - ISO 8601 date
- `validThrough` - Expiry date
- `employmentType` - Full-time, part-time, contract, etc.
- `jobLocationType` - "TELECOMMUTE" indicates remote
- `url` - Direct apply URL

## Error Handling

The importer handles various error cases:

- **No Schema.org data**: Returns `ImportError::NoSchemaOrgData`
- **Multiple job postings**: Returns `ImportError::MultipleJobPostings`
- **Missing required fields**: Preview shows missing fields
- **Already exists**: Preview indicates duplicate
- **HTTP errors**: Returns `ImportError::HttpError`
- **Timeout**: Returns `ImportError::Timeout`

## Testing

Run tests with:

```bash
cargo test import
```

## Examples

### Indeed Job
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "Software Engineer",
  "hiringOrganization": {
    "name": "Example Corp"
  },
  "jobLocation": {
    "address": {
      "addressLocality": "San Francisco",
      "addressRegion": "CA"
    }
  }
}
</script>
```

### LinkedIn Job
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "name": "Senior Engineer",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Tech Company"
  },
  "baseSalary": {
    "currency": "USD",
    "value": {
      "minValue": 150000,
      "maxValue": 200000
    }
  }
}
</script>
```

## Limitations

- Requires Schema.org/JobPosting data to be present on the page
- Only extracts data from the first JobPosting if multiple are found
- Limited to single-page imports (no bulk import)
- Requires valid HTTP/HTTPS URLs

## Future Enhancements

- Support for multiple job postings selection
- Batch import from clipboard (multiple URLs)
- Browser extension for one-click import
- Import from screenshots (OCR)
- Import history and duplicate detection
