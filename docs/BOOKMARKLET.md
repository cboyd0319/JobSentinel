# Browser Bookmarklet Integration

**Version:** 2.6+
**Status:** Ready for testing

## Overview

The JobSentinel bookmarklet allows you to import jobs from **any website** directly into your local JobSentinel
database with a single click. No scraping, no API keys, completely legal - it runs in your browser using your
existing session.

## Supported Sites

The bookmarklet works on:

### Job Boards

- LinkedIn
- Indeed
- Glassdoor
- ZipRecruiter
- Dice
- Monster
- CareerBuilder
- SimplyHired
- We Work Remotely
- Remote OK
- FlexJobs
- AngelList/Wellfound

### Company Career Pages

- Google Careers
- Microsoft Careers
- Amazon Jobs
- Any company site using Schema.org JobPosting markup
- Most modern career pages with structured data

### How It Works

1. **Schema.org Detection** - First attempts to extract structured JobPosting data
2. **Smart DOM Parsing** - Falls back to intelligent HTML parsing if no structured data
3. **Local Import** - Sends data to your local JobSentinel instance via HTTP
4. **Deduplication** - Checks if job already exists before importing

## Installation

### 1. Start the Bookmarklet Server

1. Open JobSentinel Settings
2. Navigate to "Browser Integration"
3. Click "Start Server"
4. Default port is 4321 (change if needed)

### 2. Install the Bookmarklet

**Method 1: Drag and Drop (Recommended)**

1. Show your bookmarks bar (Cmd/Ctrl+Shift+B in most browsers)
2. Click "Copy Code" in the Browser Integration section
3. Create a new bookmark:
   - Right-click bookmarks bar → "Add page"
   - Name: "Import to JobSentinel"
   - URL: Paste the copied code
4. Save

**Method 2: Manual Creation**

1. Copy the bookmarklet code from Settings
2. Bookmark any page (Cmd/Ctrl+D)
3. Edit the bookmark:
   - Change name to "Import to JobSentinel"
   - Replace URL with copied code
4. Save and drag to bookmarks bar

## Usage

### Importing a Job

1. Browse to any job posting page
2. Click the "Import to JobSentinel" bookmark
3. Wait for confirmation message
4. Job appears in JobSentinel

### Troubleshooting

**"Cannot connect to JobSentinel"**

- Make sure JobSentinel is running
- Check that the bookmarklet server is started in Settings
- Verify the port matches (default 4321)
- Check firewall settings

**"Job already exists"**

- JobSentinel detected a duplicate (same company + title + URL hash)
- This prevents duplicate entries
- Check your existing jobs list

**"Failed to import job"**

- Page may not have structured job data
- Try a different URL (direct job page, not search results)
- Check browser console for details (F12)

**"Invalid job data"**

- Missing required fields (title, company, or URL)
- Page may be a job search results page (not individual job)
- Try navigating to the specific job posting

## Technical Details

### Architecture

```text
Browser Bookmarklet
    ↓ (HTTP POST)
Local HTTP Server (localhost:4321)
    ↓ (validates & dedupes)
SQLite Database
```

### Data Extraction Priority

1. **Schema.org JobPosting** - Structured data in `<script type="application/ld+json">`
2. **OpenGraph meta tags** - `og:title`, `og:description`, etc.
3. **DOM patterns** - Common CSS selectors for title, company, description
4. **User fallback** - Manual editing after import

### Security

- **Localhost only** - Server binds to 127.0.0.1, not accessible from network
- **CORS enabled** - Allows browser requests from any origin (safe for localhost)
- **No authentication** - Assumes local machine trust model
- **No data leakage** - All processing happens locally

### Extracted Fields

| Field | Schema.org | Fallback |
|-------|-----------|----------|
| Title | `title` | `<h1>` tag |
| Company | `hiringOrganization.name` | `[class*="company"]` |
| Description | `description` | `[class*="description"]` |
| Location | `jobLocation.address` | `[class*="location"]` |
| Salary | `baseSalary` | Not extracted |
| Remote | `jobLocationType: "TELECOMMUTE"` | Not extracted |
| URL | Current page URL | Current page URL |

### Bookmarklet Code Structure

The bookmarklet is a single JavaScript function:

```javascript
javascript:(function(){
  // 1. Extract Schema.org JobPosting
  var scripts = document.querySelectorAll('script[type="application/ld+json"]');
  var job = null;
  scripts.forEach(function(s){
    try {
      var data = JSON.parse(s.textContent);
      if(data['@type'] === 'JobPosting') job = data;
    } catch(e){}
  });

  // 2. Fallback to DOM parsing
  if(!job) {
    job = {
      title: document.querySelector('h1')?.textContent,
      company: document.querySelector('[class*="company"]')?.textContent,
      description: document.querySelector('[class*="description"]')?.textContent,
      url: window.location.href
    };
  } else {
    job.url = window.location.href;
  }

  // 3. Send to JobSentinel
  fetch('http://localhost:4321/api/bookmarklet/import', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(job)
  }).then(function(r){
    if(r.ok){
      alert('✓ Job imported to JobSentinel!');
    } else {
      alert('✗ Failed to import job. Is JobSentinel running?');
    }
  }).catch(function(e){
    alert('✗ Cannot connect to JobSentinel.');
  });
})();
```

## API Endpoint

### POST /api/bookmarklet/import

**Request:**

```json
{
  "title": "Software Engineer",
  "company": "Google",
  "description": "We are looking for...",
  "url": "https://careers.google.com/jobs/123",
  "location": "San Francisco, CA",
  "remote": false,
  "@type": "JobPosting",
  "hiringOrganization": {"name": "Google Inc."},
  "jobLocation": {"address": {"addressLocality": "San Francisco"}},
  "baseSalary": {"currency": "USD", "value": {"minValue": 100000, "maxValue": 150000}}
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Job imported successfully"
}
```

**Response (Error):**

```json
{
  "error": "Job already exists in database"
}
```

## Future Enhancements

- [ ] Browser extension (automatic detection)
- [ ] Bulk import from search results
- [ ] Chrome/Firefox native integration
- [ ] Mobile browser support
- [ ] Custom field mapping
- [ ] Import history tracking
- [ ] Quick edit imported jobs

## Development

### Testing the Bookmarklet

1. Start JobSentinel in dev mode: `npm run tauri:dev`
2. Enable bookmarklet server in Settings
3. Test on:
   - <https://careers.google.com> (Schema.org)
   - <https://www.linkedin.com/jobs/view/>... (Mixed)
   - <https://www.indeed.com/viewjob?jk=>... (DOM parsing)

### Adding New Site Support

To improve extraction for a specific site:

1. Inspect the page HTML
2. Identify Schema.org data or common CSS patterns
3. Update bookmarklet code with site-specific selectors
4. Test and verify

### Debugging

**Browser Console:**

```javascript
// Test Schema.org extraction
document.querySelectorAll('script[type="application/ld+json"]')

// Test DOM selectors
document.querySelector('h1')
document.querySelector('[class*="company"]')
```

**Server Logs:**

```bash
# Watch Rust logs
tail -f ~/.local/share/JobSentinel/logs/jobsentinel.log | grep bookmarklet
```

## Privacy & Legal

- **100% Legal** - Uses browser's existing session and user permissions
- **No Scraping** - Bookmarklet runs in user's browser, not automated
- **No Data Collection** - All data stays on local machine
- **Terms of Service** - User must comply with site ToS
- **No Automation** - Requires manual user action per job

## License

Same as JobSentinel (MIT License)
