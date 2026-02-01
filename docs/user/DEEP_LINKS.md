# Deep Link Generator

Generate pre-filled job search URLs for sites we can't scrape.

## Overview

The Deep Link Generator creates URLs for 19+ job sites with your search criteria pre-filled. Click any link to open it in your browser with the search ready to go.

**Benefits:**
- 100% legal - we're just building URLs, your browser does the rest
- No rate limiting or ToS concerns
- Access sites that block automated scraping
- Quick way to search multiple sites at once

## Supported Sites (19)

### General Job Boards (5)
- **Indeed** - Largest job board with millions of listings
- **Monster** - Established job board with career resources
- **CareerBuilder** - General job listings
- **SimplyHired** - Job aggregator with salary estimates
- **ZipRecruiter** - Fast-growing job board with one-click apply

### Professional Networking (2)
- **LinkedIn** - Professional network (requires login)
- **Glassdoor** - Jobs with company reviews and salaries (requires login)

### Tech-Specific (2)
- **Dice** - Tech-focused job board for IT professionals
- **Stack Overflow Jobs** - Developer-focused jobs

### Government (4)
- **USAJobs** - Official federal government job board
- **GovernmentJobs** - State and local government positions
- **CalCareers** - California state government jobs
- **CAPPS** - Texas state government jobs

### Cleared/Security (1)
- **ClearanceJobs** - Jobs requiring security clearances

### Remote-Specific (3)
- **FlexJobs** - Curated remote and flexible jobs (requires subscription)
- **We Work Remotely** - Popular remote job board
- **Remote OK** - Remote jobs aggregator

### Startups (2)
- **Wellfound** (AngelList) - Startup jobs with equity info (requires login)
- **Y Combinator Jobs** - Jobs at Y Combinator companies

## How to Use

### Basic Search

1. Go to the Deep Links page
2. Enter your job title or keywords (e.g., "Software Engineer")
3. Optionally enter a location (e.g., "San Francisco, CA" or "Remote")
4. Click "Generate Deep Links"
5. Click any site to open the search in your browser

### Example Searches

**Software Engineer in San Francisco**
```
Job Title: Software Engineer
Location: San Francisco, CA
```

**Remote Product Manager**
```
Job Title: Product Manager
Location: Remote
```

**Federal Government Jobs**
```
Job Title: IT Specialist
Location: Washington, DC
```
Filter by "Government" category to see only USAJobs, GovernmentJobs, etc.

### Category Filters

After generating links, use the category filters to narrow down results:

- **All** - Show all sites (19)
- **General** - Large job boards (5)
- **Tech** - Developer and IT-focused (2)
- **Government** - Federal, state, local (4)
- **Remote** - Remote work specialists (3)
- **Startups** - Early-stage companies (2)
- **Cleared** - Security clearance required (1)
- **Professional** - Professional networking (2)

## Site Details

### Sites Requiring Login

Some sites require login to view full results:
- LinkedIn
- Glassdoor
- FlexJobs (also requires subscription)
- Wellfound (AngelList)

These are clearly marked with a 🔐 icon.

### URL Parameters

Deep links include:
- **Query** - Your job title/keywords (all sites)
- **Location** - City, state, or "remote" (most sites)
- **Job Type** - Full-time, part-time, contract (LinkedIn, Indeed)
- **Remote Filter** - Remote-only jobs (Indeed, LinkedIn, Dice, etc.)

Not all sites support all parameters - we use what's available.

## Privacy & Legal

**100% Private:**
- No data is sent to JobSentinel servers
- URLs are generated locally in your app
- Your browser makes the actual request to job sites
- No tracking or analytics

**100% Legal:**
- We only generate URLs - no scraping
- Respects site Terms of Service
- User's browser makes the request (same as manual search)
- No automation or bots involved

## FAQ

### Why can't you scrape these sites?

Many sites (LinkedIn, Glassdoor, Indeed, etc.) actively block automated scraping:
- Rate limiting
- CAPTCHA challenges
- IP bans
- Terms of Service prohibitions

Deep links let you search these sites legally without scraping.

### Can I save my searches?

Not yet, but this is planned for v2.7. For now, you can:
1. Bookmark the Deep Links page
2. Generate links on-demand
3. Open multiple sites at once in tabs

### Can I customize which sites appear?

Not yet, but planned for v2.7. For now, use the category filters to narrow results.

### What if a site changes its URL format?

We'll update the URL patterns in new releases. If you notice a broken link, please report it on GitHub:
https://github.com/cboyd0319/JobSentinel/issues

### Can I add more sites?

Yes! Deep links are easy to add. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details on adding new sites.

## Comparison with Scrapers

| Feature | Deep Links | Scrapers |
|---------|------------|----------|
| **Legal** | ✅ Always | ⚠️ Site-dependent |
| **Rate Limiting** | ✅ None | ❌ Common issue |
| **CAPTCHA** | ✅ No problem | ❌ Blocks scraping |
| **Up-to-date** | ✅ Always current | ⚠️ Breaks on changes |
| **Automation** | ❌ Manual | ✅ Fully automated |
| **Data Storage** | ❌ View only | ✅ Saved locally |

**Use scrapers for:** Sites that allow it (Greenhouse, Lever, USAJobs API)
**Use deep links for:** Everything else (LinkedIn, Indeed, Glassdoor, etc.)

## Troubleshooting

### Link doesn't work

1. Check if the site changed its URL format
2. Try opening the site manually and comparing URLs
3. Report the issue on GitHub with the site name

### Search results are wrong

Some sites have limited URL parameter support. Try:
1. Opening the link and refining the search on the site
2. Using a different site with better parameter support

### Link opens but requires login

Sites marked with 🔐 always require login:
- LinkedIn
- Glassdoor
- FlexJobs
- Wellfound

This is expected - log in to view results.

## Related Features

- **Scrapers** - Automated scraping for supported sites
- **Saved Searches** (coming in v2.7) - Save your favorite deep link searches
- **Job Tracker** - Track applications from manual searches

## Roadmap

### v2.7 (Planned)
- Save favorite deep link searches
- Custom site preferences
- Bulk open (open multiple sites at once)
- Browser extension integration

### v3.0 (Future)
- More sites (50+ total)
- Advanced filters (salary, experience level)
- Search history
- Quick search from system tray
