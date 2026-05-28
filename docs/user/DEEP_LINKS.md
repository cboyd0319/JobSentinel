# Job Site Search Links

Create ready-to-use job searches for sites JobSentinel cannot scan automatically.

## Overview

JobSentinel creates search links for 19+ job sites with your search already
filled in. Click any link to open the search in your browser.

**Benefits:**

- Your browser opens the site, the same as a manual search
- No job-board limits from automated scanning
- Access sites that block automated scans
- Quick way to search multiple sites at once

## Supported Sites (19)

### General Job Boards (5)

- **Indeed** - Largest job board with millions of listings
- **Monster** - Established job board with career resources
- **CareerBuilder** - General job listings
- **SimplyHired** - Job aggregator with salary estimates
- **ZipRecruiter** - Fast-growing job board with Application Assist

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

1. Go to the Job Site Search Links page
2. Enter your job title or work words (for example, "Marketing Manager")
3. Optionally enter a location (e.g., "San Francisco, CA" or "Remote")
4. Optionally choose a job type or work mode
5. Click "Create Search Links"
6. Click any site to open the search in your browser

### Example Searches

**Marketing Manager in Chicago**

```text
Job Title: Marketing Manager
Location: Chicago, IL
```

**Remote Product Manager**

```text
Job Title: Product Manager
Location: Remote
Work Mode: Remote
```

**Federal Government Jobs**

```text
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

These are clearly marked with a login-required badge.

### What JobSentinel Adds To Each Search

Search links can include:

- **Job title or work words** - What you want to search for
- **Location** - City, state, or "remote" (most sites)
- **Job Type** - Optional full-time, part-time, contract, temporary, or
  internship filters where sites support them
- **Work Mode** - Optional remote, hybrid, or onsite filters where sites
  support them

Not all sites support every filter. JobSentinel uses what each site supports.

## Privacy & Legal

**100% Private:**

- No data is sent to JobSentinel servers
- Search links are created locally in your app
- Your browser opens the job site
- No tracking or analytics

**100% Legal:**

- JobSentinel only creates a browser search link for these sites
- Respects site Terms of Service
- User's browser makes the request (same as manual search)
- No automation or bots involved

## FAQ

### Why can't JobSentinel scan these sites automatically?

Many sites (LinkedIn, Glassdoor, Indeed, etc.) actively block automated scans:

- Rate limiting
- CAPTCHA challenges
- IP bans
- Terms of Service prohibitions

Search links let you search these sites legally without automated scans.

### Can I save my searches?

Saved search-link favorites are not implemented yet. For now, you can:

1. Bookmark the Job Site Search Links page
2. Generate links on-demand
3. Open multiple sites at once in tabs

### Can I customize which sites appear?

Not currently. For now, use the category filters to narrow results.

### What if a site changes how search links work?

We'll update the search-link rules in new releases. If you notice a broken
link, please report it on GitHub:
<https://github.com/cboyd0319/JobSentinel/issues>

### Can I add more sites?

Yes. Search links are easy to add. See the [developer guide](../developer/ADDING_DEEP_LINK_SITES.md)
for details on adding new sites.

## Comparison with Scrapers

| Feature | Search Links | Scanners |
|---------|------------|----------|
| **Legal** | Always | Site-dependent |
| **Job-board limits** | Avoided | Common issue |
| **CAPTCHA** | No problem | Blocks automated scanning |
| **Up-to-date** | Always current | Breaks on changes |
| **Automation** | Manual | Fully automated |
| **Data Storage** | View only | Saved locally |

**Use scanners for:** Sites that allow it (Greenhouse, Lever, USAJobs)
**Use search links for:** Everything else (LinkedIn, Indeed, Glassdoor, etc.)

## Troubleshooting

### Link doesn't work

1. Check whether the site changed its search page
2. Try opening the site manually and searching there
3. Report the issue on GitHub with the site name

### Search results are wrong

Some sites support fewer filters than others. Try:

1. Opening the link and refining the search on the site
2. Using a different site with better filter support

### Link opens but requires login

Sites marked with the login-required badge always require login:

- LinkedIn
- Glassdoor
- FlexJobs
- Wellfound

This is expected - log in to view results.

## Related Features

- **Scanners** - Automatic searches for supported sites
- **Search-link favorites** (not yet implemented) - Save favorite search-link searches
- **Job Tracker** - Track applications from manual searches

## Roadmap

### Planned

- Save favorite search-link searches
- Custom site preferences
- Bulk open (open multiple sites at once)
- Browser extension integration

### Later

- More sites (50+ total)
- Advanced filters (salary, experience level)
- Search history
- Quick search from system tray
