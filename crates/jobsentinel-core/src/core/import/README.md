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
- **No redirect following**: Redirect responses are blocked so the fetch does not cross to another trust boundary
- **Public data**: Only reads publicly available data
- **Schema.org standard**: Uses machine-readable data format designed for this purpose
- **No scraping**: Does not crawl or scrape multiple pages

## Architecture

```text
src/core/import/
├── mod.rs           - Module entry point
├── types.rs         - Import-specific types (errors, preview, Schema.org structs)
├── fetcher.rs       - HTTP fetcher for single job pages
├── pending.rs       - Bounded, expiring in-memory review queue
├── salary.rs        - Shared salary parsing for preview and storage
├── schema_org.rs    - Schema.org/JobPosting parser
├── service.rs       - Preview and reviewed-save orchestration
└── tests.rs         - Unit tests
```

## Usage

### Backend (Rust)

```rust
use jobsentinel_core::import::{
    confirm_job_import, preview_job_import, PendingUrlImports,
};

let pending = PendingUrlImports::default();
let preview = preview_job_import(
    &database,
    &pending,
    "https://example.com/jobs/123",
).await?;

// Save only after the user confirms the exact staged preview.
let saved = confirm_job_import(
    &database,
    &pending,
    preview.import_id.as_deref().unwrap(),
).await?;
```

### Frontend (TypeScript)

```typescript
import { invoke } from "@tauri-apps/api/core";

// Preview import
const preview = await invoke("preview_job_import", {
  url: "https://example.com/jobs/123"
});

// Import job; returns only the saved job id
const result = await invoke("confirm_job_import", {
  importId: preview.import_id
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
- **Redirects**: Returns `ImportError::RedirectBlocked`
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
  "title": "Customer Support Lead",
  "hiringOrganization": {
    "name": "Example Services"
  },
  "jobLocation": {
    "address": {
      "addressLocality": "Chicago",
      "addressRegion": "IL"
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
  "name": "Customer Support Lead",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Example Services"
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
- Requires a page with exactly one JobPosting record
- Limited to single-page imports (no bulk import)
- Requires valid HTTPS URLs for fetched job-page imports
