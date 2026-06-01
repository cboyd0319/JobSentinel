# JobSentinel Career Profiles

Pre-configured job search profiles for different career paths.

Most users should choose a profile from JobSentinel setup. These files are
starter templates for advanced manual setup, testing, and contributors.

## Available Profiles

| Profile | File | Target Roles | Salary Range |
|---------|------|--------------|--------------|
| **SEO & Digital Marketing** | `seo-digital-marketing.json` | SEO Manager, E-Commerce, Growth | $70k - $150k |
| **Sales & Business Dev** | `sales-business-dev.json` | AE, BDR, Sales Manager | $60k - $200k+ |
| **Project & Ops** | `project-operations.json` | PM, Program Manager, Operations | $70k - $160k |
| **Finance & Accounting** | `finance-accounting.json` | FP&A, Controller, Accountant | $60k - $180k |
| **HR & Recruiting** | `hr-recruiting.json` | Recruiter, HRBP, People Ops | $60k - $150k |
| **Content & Copywriting** | `content-copywriting.json` | Content Writer, UX Writer, Editor | $55k - $130k |
| **Product Management** | `product-management.json` | PM, TPM, Product Owner | $100k - $200k |
| **UX/UI Design** | `ux-design.json` | Product Designer, UX Researcher | $80k - $180k |
| **Data Science** | `data-science.json` | Data Scientist, ML Engineer, Analyst | $90k - $220k |
| **Cybersecurity** | `cybersecurity.json` | Security Engineer, AppSec, Pentester | $100k - $250k |
| **Software Engineering** | `software-engineering.json` | SWE, Backend, Frontend, DevOps, SRE | $100k - $250k |

## How to Use

### Option 1: Choose a Profile in Setup

Open JobSentinel setup and choose the profile closest to your search. You can
edit job titles, skills, salary, work style, and locations before saving.

### Option 2: Use a Profile as a Starting Point

Open the profile closest to your search and copy the parts you want into your
own local settings. Keep salary floors, locations, and favorite companies
aligned with your real search constraints.

### Option 3: Create a Custom Profile

Start with `config/config.example.json` and fill in your own:

- `title_allowlist`: Job titles you're targeting
- `keywords_boost`: Your skills and tools
- `salary_floor_usd`: Your minimum salary
- `greenhouse_urls` / `lever_urls`: Official company pages you choose to monitor

Broad starter profiles leave company source lists empty by default. JobSentinel
should not choose a narrow tech or SaaS employer list for someone looking for
product, design, marketing, writing, operations, finance, HR, sales, education,
healthcare, legal, creative, or customer support work.

### Advanced Manual File Use

Only use manual file copying if you are comfortable editing local app settings
files.

```bash
# macOS/Linux
cp profiles/seo-digital-marketing.json ~/.config/jobsentinel/config.json

# Windows
copy profiles\seo-digital-marketing.json %LOCALAPPDATA%\JobSentinel\config.json
```

## Profile Fields Explained

| Field | Purpose |
|-------|---------|
| `title_allowlist` | Jobs MUST contain one of these titles to appear |
| `title_blocklist` | Jobs containing these titles are auto-rejected |
| `keywords_boost` | Jobs with these terms score higher (40% of score) |
| `keywords_exclude` | Jobs with these terms are auto-rejected |
| `salary_floor_usd` | Minimum salary (jobs below this score 0 on salary) |
| `location_preferences` | Remote/hybrid/onsite + specific cities |
| `greenhouse_urls` | Official Greenhouse company pages to monitor |
| `lever_urls` | Official Lever company pages to monitor |

## Scoring Algorithm

Jobs are scored 0-100% based on:

- **Skills Match (40%)**: Title + keyword matches
- **Salary (25%)**: Meets or exceeds your floor
- **Location (20%)**: Matches remote/hybrid/onsite preference
- **Company (10%)**: Favorite companies and companies you want to avoid
- **Recency (5%)**: Fresh jobs score higher

## Customization Tips

### For Senior Roles

Add to `title_blocklist`:

```json
"Junior", "Entry Level", "Associate", "I", "II"
```

### For Remote-Only

```json
"location_preferences": {
  "allow_remote": true,
  "allow_hybrid": false,
  "allow_onsite": false
}
```

### For Specific Cities

```json
"location_preferences": {
  "allow_remote": true,
  "allow_hybrid": true,
  "allow_onsite": true,
  "cities": ["Denver", "Boulder", "Colorado Springs"],
  "states": ["CO"]
}
```

## Contributing

Have a career profile that's not covered? Submit a PR with:

1. A new JSON file in this folder
2. Update this README with the new profile
3. Include realistic salary ranges and common job titles
