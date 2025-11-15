# JobSentinel Browser Extension

AI-powered job tracking extension for Chrome/Firefox. Get instant job scores, save to desktop app with one click, and never miss great opportunities.

## Quick Start

### Install (Developer Mode)

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `browser-extension/` directory

### Usage

1. Start the JobSentinel desktop app (`cargo run` in `src-tauri/`)
2. Browse to any job posting on supported sites
3. See instant job score overlay
4. Click "Save to JobSentinel" to add to your tracker

## Supported Platforms

- ✅ Greenhouse (`boards.greenhouse.io`)
- ✅ Lever (`*.lever.co`)
- ✅ Workday (`*.myworkdayjobs.com`)
- ✅ Indeed (`www.indeed.com`)
- ✅ LinkedIn (`linkedin.com/jobs`)
- ✅ iCIMS (`*.icims.com`)
- ✅ BambooHR (`*.bamboohr.com`)
- ✅ Ashby (`jobs.ashbyhq.com`)

## Features

- 🎯 **Instant Job Scoring** - See how well jobs match your preferences
- 💾 **One-Click Save** - Send jobs directly to desktop app
- 📊 **Match Breakdown** - Understand scoring factors (skills, salary, location)
- 🔍 **Duplicate Detection** - Know if you've already saved a job
- 🔄 **Real-Time Sync** - WebSocket connection to desktop app

## Documentation

For detailed documentation, see [BROWSER_EXTENSION.md](../docs/BROWSER_EXTENSION.md).

## License

MIT
