# Resume compatibility notes

I ran a quick experiment with an SEO Manager resume to make sure the scraper’s schema and matchers still lined up with real-world data. Here’s the short version of what I observed.

## What worked

- All the core resume fields (title, skills, location, seniority) mapped cleanly into the parser
- The scoring logic surfaced three Job Board samples between 75–88% match using the stock filters
- Salary ranges from the sample posts were captured without any extra tweaks

## Sample matches

1. Senior Digital Marketing Manager (Greenhouse) — 75% match, hybrid, senior level
2. E-Commerce Marketing Director (Microsoft API) — 88% match, remote, promotion potential
3. SEO Platform Manager (SpaceX API) — 88% match, on-site, senior track

## Follow-up ideas

- Expand the skills list in `matchers/skills.py` to cover more marketing tools as I encounter them
- Keep an eye on seniority mapping so “Manager” titles don’t get lumped with junior roles
- Add more fixture data for non-technical resumes once the test suite grows

If you try a different resume and spot gaps, jot down the fields that were missed and open an issue so I can adjust the parser.
