# Test Fixtures

This directory contains recorded HTML/JSON samples from job board sources for deterministic scraper testing.

## Purpose

- Enable offline testing of scrapers without making real HTTP requests
- Provide reproducible test cases that don't break when external sites change
- Document the expected structure of responses from each source

## Structure

Each source has its own subdirectory with sample responses:

```
fixtures/
├── greenhouse/
│   ├── cloudflare_jobs.json       # Job listing API response
│   └── job_detail.html            # Individual job page HTML
├── lever/
│   ├── stripe_jobs.json           # Job listing API response
│   └── job_detail.html            # Individual job page HTML
├── reed/
│   └── search_response.json       # API search response
└── jobswithgpt/
    └── search_response.json       # Search results
```

## Usage

In tests, load fixtures like:

```python
import json
from pathlib import Path

def test_greenhouse_parser():
    fixture_path = Path(__file__).parent.parent / "examples/fixtures/greenhouse/cloudflare_jobs.json"
    with open(fixture_path) as f:
        data = json.load(f)
    
    # Test parser against fixture
    jobs = parse_greenhouse_response(data)
    assert len(jobs) > 0
```

## Creating New Fixtures

When adding support for a new job board:

1. Create a subdirectory for the source (e.g., `fixtures/workable/`)
2. Capture real responses (remove any PII/sensitive data)
3. Save as JSON for APIs or HTML for web pages
4. Keep fixtures small (1-3 jobs) to minimize repository size
5. Document the capture date in a comment at the top of the file

## Guidelines

- **Remove PII**: Strip out any personal information, email addresses, phone numbers
- **Anonymize**: Replace company-specific data with generic placeholders if needed
- **Keep small**: Include only enough data to test parsing logic (1-3 jobs per fixture)
- **Version control**: Commit fixtures to git for reproducible tests
- **Update cautiously**: Only update fixtures when format actually changes

## License Note

Fixtures are used solely for testing purposes under fair use. Do not include copyrighted content, logos, or proprietary data. Use generic job descriptions or create synthetic examples.
