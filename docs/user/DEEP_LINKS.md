# Job Site Search Links

Create ready-to-use searches for sites JobSentinel does not monitor directly.

## Overview

JobSentinel creates search links for 18 job sites with your search already
filled in. Click any link to open the search in your browser. JobSentinel does
not log in for you, read the results page in the background, or get around site
rules.

**Benefits:**

- Your browser opens the site, the same as a manual search
- Useful for sites that are better searched directly in your browser
- Clear boundary: you open the site and decide what to save
- Quick way to search multiple sites at once

## Job Sites With Search Links (18)

### General Job Boards (5)

- **Indeed** - Largest job board with millions of listings
- **Monster** - Established job board with career resources
- **CareerBuilder** - General job listings
- **SimplyHired** - Job aggregator with salary estimates
- **ZipRecruiter** - Fast-growing job board with Application Assist

### Professional Networking (2)

- **LinkedIn** - Professional network (requires login)
- **Glassdoor** - Jobs with company reviews and salaries (requires login)

### Tech-Specific (1)

- **Dice** - Tech-focused job board for IT professionals

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
3. Optionally enter a location, such as "Chicago, IL" or "Remote"
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
Job Title: Public Health Advisor
Location: Washington, DC
```

Filter by "Government" category to see only USAJobs, GovernmentJobs, etc.

### Category Filters

After generating links, use the category filters to narrow down results:

- **All** - Show all sites (18)
- **General** - Large job boards (5)
- **Tech** - Technology and IT-focused (1)
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

## Privacy And What JobSentinel Does

**Privacy:**

- Search links are created locally in your app.
- JobSentinel does not send data to JobSentinel servers.
- JobSentinel does not collect analytics.
- Opened job sites may receive search terms and apply their own privacy rules.

**Source boundaries:**

- JobSentinel only creates a browser search link for these sites
- You decide whether to open the site and log in there
- JobSentinel does not collect your signed-in website session for these sites
- JobSentinel does not get around human checks, sign-in pages, or site limits

## FAQ

### Why does JobSentinel use browser-opened links for these sites?

Some sites limit automatic checking or require you to view results in your
own browser:

- Limits on repeated searches
- Human checks
- Login requirements
- Terms or policy restrictions

Search links keep that boundary clear. JobSentinel creates the search, your
browser opens it, and you decide what to save.

### Can I save my searches?

Saved search-link favorites are not implemented yet. For now, you can:

1. Bookmark the Job Site Search Links page
2. Generate links on-demand
3. Open multiple sites at once in tabs

### Can I customize which sites appear?

Not currently. For now, use the category filters to narrow results.

### What if a site changes how search links work?

We'll update the search-link rules in new releases. If you notice a broken
link, open **Settings**, choose **Send Feedback**, and save a safe support
report. Share the report only if you want help.

GitHub is optional for maintainers and contributors:
<https://github.com/cboyd0319/JobSentinel/issues>

### Can I add more sites?

Yes. The easiest path is to send feedback from JobSentinel and ask for the
site. Include the site name and, if you are comfortable sharing it, an example
public search page.

Contributors can also add sites in code. See the
[contributor guide](../developer/ADDING_DEEP_LINK_SITES.md) for that path.

## Comparison With Job Sources

| Feature | Search Links | Job sources checked by JobSentinel |
|---------|--------------|-------------------|
| **Who opens the site** | You, in your browser | JobSentinel, where allowed |
| **Login and human checks** | Handled by you on the site | Not worked around |
| **Page changes** | You still see the site directly | Source rules may need updates |
| **Saving jobs** | You choose what to save | Saved locally when a job source returns a job |
| **Best for** | Sites with login, human checks, or policy limits | Official or public sources that allow local checks |

**Use JobSentinel job sources for:** Official or public sources that allow local
checks.
**Use search links for:** Sites that are best opened by you in your browser.

## Troubleshooting

### Link doesn't work

1. Check whether the site changed its search page
2. Try opening the site manually and searching there
3. Save a safe support report and include the site name if you want help

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

- **Job sources** - Local checks for supported official or public sources
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
- More filters, such as salary and experience level
- Search history
- Quick search from system tray
