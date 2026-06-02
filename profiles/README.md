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

For custom profiles, start in JobSentinel setup or Settings and change job
titles, skills, pay, location, and sources there.

- Job titles you are targeting
- Skills and tools that fit your search
- The lowest pay you would consider
- Locations and work styles that fit your life
- Official company pages you choose to check

Broad starter profiles leave company source lists empty by default. JobSentinel
should not choose a narrow tech or SaaS employer list for someone looking for
product, design, marketing, writing, operations, finance, HR, sales, education,
healthcare, legal, creative, or customer support work.

### Source-Code Contributor File Use

This section is only for source-code contributors testing local profile files.
Normal users should use setup or Settings inside JobSentinel.

```bash
# macOS/Linux
cp profiles/seo-digital-marketing.json ~/.config/jobsentinel/config.json

# Windows
copy profiles\seo-digital-marketing.json %LOCALAPPDATA%\JobSentinel\config.json
```

## How Profiles Shape Results

Profiles help JobSentinel start with reasonable defaults. Review and edit them
inside setup or Settings before saving.

| Setting | Why it matters |
| ------- | -------------- |
| Target job titles | Keeps the search close to roles you want |
| Avoided job titles | Hides roles that are not worth your time |
| Helpful skills and tools | Gives a stronger fit signal when job posts match your real background |
| Lowest pay you would consider | Flags jobs below your floor instead of hiding pay concerns |
| Location and work style | Matches remote, hybrid, onsite, and city preferences |
| Favorite and avoided companies | Helps you focus on employers that fit your search |

## Common Settings Changes

### Senior Roles

Add junior, entry-level, associate, and similar titles to avoided job titles.

### Remote-Only Searches

Choose remote-only in setup or Settings.

### Specific Cities

Add the cities and states you would actually consider. Keep remote and hybrid
on only if they fit your life.

## Contributing

Have a career profile that's not covered? Submit a PR with:

1. A new JSON file in this folder
2. Update this README with the new profile
3. Include realistic salary ranges and common job titles
