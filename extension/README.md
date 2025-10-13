# JobSentinel Browser Extension

Save jobs to your JobSentinel tracker with one click from LinkedIn, Indeed, Glassdoor, Greenhouse, and Lever.

## Features

- 🎯 **One-Click Save**: Save jobs directly from job board pages
- 📋 **Auto-Fill**: Automatically extracts job details (title, company, location)
- ⭐ **Priority Levels**: Set priority (1-5 stars) when saving
- 📝 **Notes**: Add notes to jobs as you save them
- 🔒 **Privacy-First**: All data stays on your local JobSentinel instance

## Installation

### Chrome / Edge / Brave

1. Clone this repository or download the `extension/` folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `extension/` folder
6. The JobSentinel icon should appear in your toolbar

### Firefox

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in the `extension/` folder (e.g., `manifest.json`)
4. The extension will be loaded temporarily (until browser restart)

## Setup

1. Start your JobSentinel server: `python -m jsa.cli web`
2. Generate an API key:
   ```bash
   python -c "
   from jsa.db import get_session_context
   from jsa.web.blueprints.api.auth import create_api_key
   with get_session_context() as session:
       key = create_api_key(session, 'Browser Extension')
       print(f'API Key: {key.key}')
   "
   ```
3. Click the JobSentinel extension icon
4. Click "Settings"
5. Enter your API URL (default: `http://localhost:5000`) and API key
6. Save settings

## Usage

1. Navigate to a job posting on LinkedIn, Indeed, Glassdoor, Greenhouse, or Lever
2. Click the JobSentinel extension icon
3. Review the auto-filled job details
4. Select status (Bookmarked, Applied, Interviewing)
5. Set priority (1-5 stars)
6. Add optional notes
7. Click "Save Job"

The job will be saved to your JobSentinel tracker!

## Supported Job Boards

- **LinkedIn** - Job postings at linkedin.com/jobs
- **Indeed** - Job postings at indeed.com/viewjob
- **Glassdoor** - Job postings at glassdoor.com/job-listing
- **Greenhouse** - Company career pages using Greenhouse ATS
- **Lever** - Company career pages using Lever ATS

More job boards coming soon!

## Permissions Explained

- **activeTab**: Access the current tab to scrape job details
- **storage**: Store your API URL and API key locally
- **host_permissions**: Access specific job board domains to extract job data

## Privacy

JobSentinel Browser Extension:
- ✅ Does NOT send your data to any third parties
- ✅ Only communicates with YOUR local JobSentinel instance
- ✅ Stores API credentials locally in your browser
- ✅ Open source - inspect the code yourself

## Troubleshooting

### Extension doesn't work on job pages
- Make sure you're on a supported job board
- Check that the URL matches the expected pattern
- Try refreshing the page

### "API key required" error
- Generate an API key (see Setup section)
- Configure the API key in extension settings
- Make sure your JobSentinel server is running

### Connection failed
- Verify JobSentinel server is running: `http://localhost:5000/tracker/`
- Check that API URL in settings matches your server
- Check firewall/network settings

## Development

### File Structure

```
extension/
├── manifest.json         # Extension configuration
├── popup.html           # Extension popup UI
├── popup.js             # Popup logic
├── content-script.js    # Job page scraping
├── background.js        # Background service worker
├── icons/              # Extension icons
└── README.md           # This file
```

### Adding a New Job Board

1. Update `manifest.json` host_permissions and content_scripts
2. Add scraping logic to `content-script.js`
3. Test on actual job postings

## License

MIT License - Same as JobSentinel main project

## Support

- GitHub Issues: https://github.com/cboyd0319/JobSentinel/issues
- Documentation: See main JobSentinel README
