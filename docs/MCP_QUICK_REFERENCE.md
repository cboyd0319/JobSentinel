# MCP Server Quick Reference

Fast decision guide for choosing the right MCP server for your needs.

---

## TL;DR - What Should I Use?

### Personal Job Search (Recommended)
```
✅ JobsWithGPT (already integrated) - 500k+ jobs, FREE, low risk
✅ Reed Jobs API (UK only) - Official API, FREE, low risk
⚠️ LinkedIn MCP (optional) - Use burner account, throttle heavily
```

### Enterprise/Production
```
✅ JobsWithGPT only
✅ ATS scrapers (Greenhouse, Lever, Ashby)
❌ Avoid LinkedIn MCP, JobSpy MCP
```

### Power User/Researcher
```
✅ JobsWithGPT (primary)
⚠️ LinkedIn MCP (burner account, accept risks)
⚠️ JobSpy MCP (multi-site, expect failures)
✅ ATS scrapers (fallback)
```

---

## Quick Comparison

| MCP Server | Coverage | Risk | Status | Best For |
|------------|----------|------|--------|----------|
| **JobsWithGPT** | 500k+ jobs | 🟢 LOW | ✅ Integrated | Everyone |
| **Reed Jobs** | UK jobs | 🟢 LOW | ✅ Integrated | UK job seekers |
| **JobSpy MCP** | Indeed, LinkedIn, ZipRecruiter, etc. | 🟡 MEDIUM-HIGH | ✅ Integrated | Wide-funnel searches |
| **LinkedIn MCP** | All LinkedIn | 🔴 HIGH | ⏸️ Not integrated | Power users with burner account |
| **Job Searchoor** | Targeted search | 🟡 MEDIUM | ⏸️ Not integrated | Simple filtering |
| **ATS Scrapers** | Company career sites | 🟢 LOW | ✅ Integrated | Compliance-focused |

---

## Installation Commands

### JobsWithGPT (✅ Integrated)
```bash
# Already installed in requirements.txt
pip install mcp==1.16.0 httpx-sse==0.4.1

# Usage:
from sources.job_scraper import search_jobs_by_keywords
jobs = await search_jobs_by_keywords(
    keywords=["python"],
    locations=[{"city": "Denver", "state": "CO"}]
)
```

### Reed Jobs (✅ Integrated)
```bash
# 1. Get free API key from https://www.reed.co.uk/developers
# 2. Set environment variable:
export REED_API_KEY=your_api_key_here

# 3. Usage:
from sources.job_scraper import search_reed_jobs
jobs = await search_reed_jobs(
    keywords="python developer",
    location="London",
    minimum_salary=50000
)
```

### JobSpy MCP (✅ Integrated)
```bash
# 1. Install JobSpy MCP server
git clone https://github.com/borgius/jobspy-mcp-server.git
cd jobspy-mcp-server
npm install

# 2. Usage:
from sources.job_scraper import search_multi_site_jobs
jobs = await search_multi_site_jobs(
    keywords=["python", "devops"],
    location="Denver, CO",
    sites=["indeed", "zip_recruiter"],  # Exclude LinkedIn to reduce risk
    results_per_site=25
)
```

### LinkedIn MCP (High Risk ⚠️)
```bash
# 1. Get LinkedIn cookie (li_at) from browser
# 2. Configure Claude Desktop:
{
  "mcpServers": {
    "linkedin": {
      "command": "docker",
      "args": ["run","--rm","-i","-e","LINKEDIN_COOKIE","stickerdaniel/linkedin-mcp-server:latest"],
      "env": { "LINKEDIN_COOKIE": "li_at=YOUR_COOKIE" }
    }
  }
}

# 3. Use burner account, throttle heavily (max 50 jobs/day)
```

### JobSpy MCP (Medium Risk ⚠️)
```bash
git clone https://github.com/borgius/jobspy-mcp-server.git
cd jobspy-mcp-server
npm install

# Configure Claude Desktop:
{
  "mcpServers": {
    "jobspy": {
      "command": "node",
      "args": ["/path/to/jobspy-mcp-server/src/index.js"]
    }
  }
}
```

### Job Searchoor (Minimal)
```bash
# One-liner via npx:
{
  "mcpServers": {
    "job-search": { "command": "npx", "args": ["-y","job-searchoor"] }
  }
}
```

### Reed Jobs (UK Only, Low Risk)
```bash
# 1. Get free API key from https://www.reed.co.uk/developers
# 2. Clone and configure:
git clone https://github.com/kld3v/reed_jobs_mcp.git
cd reed_jobs_mcp
npm install

# 3. Configure mcp.json with API key
{
  "reed_api_key": "YOUR_API_KEY"
}

# 4. Add to Claude Desktop config
```

---

## Risk Matrix

### 🟢 LOW RISK (Safe for Production)
- **JobsWithGPT**: Public API, no login required
- **Reed Jobs**: Official API with free tier
- **ATS Scrapers**: Public career pages (Greenhouse, Lever, Ashby)

**Why Safe:**
- Designed for programmatic access
- No ToS violations
- No account ban risk

### 🟡 MEDIUM RISK (Use with Caution)
- **JobSpy MCP**: Aggregates multiple scrapers
- **Job Searchoor**: Unknown underlying source

**Why Caution:**
- May violate some site ToS
- Scrapers are brittle (break on redesigns)
- Lower reliability

### 🔴 HIGH RISK (Personal Use Only, Accept Liability)
- **LinkedIn MCP**: Session cookie scraping

**Why High Risk:**
- Explicitly violates LinkedIn ToS
- Account ban risk (use burner account)
- Legal risk (LinkedIn has sued scraping companies)
- Requires aggressive throttling

---

## Usage Patterns

### Pattern 1: JobsWithGPT Primary (Recommended)
```python
# Start with JobsWithGPT (500k+ jobs, low risk)
jobs = await search_jobs_by_keywords(
    keywords=["python", "engineer"],
    locations=[{"city": "Denver", "state": "CO"}]
)

# Fallback to ATS scrapers for specific companies
for company in config.get_companies():
    company_jobs = await scrape_jobs(company.url)
    jobs.extend(company_jobs)

# Deduplicate and return
return deduplicate_jobs(jobs)
```

### Pattern 2: Multi-Source Aggregation (Power User)
```python
all_jobs = []

# 1. JobsWithGPT (broad coverage)
all_jobs.extend(await search_jobs_by_keywords(...))

# 2. LinkedIn MCP (high value, throttled)
if user_opted_in_to_high_risk:
    await asyncio.sleep(10)  # Throttle
    all_jobs.extend(await search_linkedin_jobs(...))

# 3. JobSpy MCP (fill gaps)
all_jobs.extend(await search_multi_site_jobs(...))

# 4. ATS scrapers (fallback)
all_jobs.extend(await scrape_traditional_ats(...))

return deduplicate_jobs(all_jobs)
```

### Pattern 3: Conservative (Enterprise)
```python
# JobsWithGPT only
jobs = await search_jobs_by_keywords(
    keywords=user_prefs["keywords"],
    locations=user_prefs["locations"]
)

# Optionally add manual company list
for company_url in user_approved_companies:
    jobs.extend(await scrape_jobs(company_url))

return jobs
```

---

## ToS Compliance Checklist

Before using any MCP server, verify:

- [ ] **Read the ToS** of the target platform
- [ ] **Understand the risks** (account ban, legal action)
- [ ] **Use burner accounts** for high-risk sources (LinkedIn)
- [ ] **Implement rate limiting** (don't hammer servers)
- [ ] **Respect robots.txt** for ATS scrapers
- [ ] **User opt-in** for high-risk sources
- [ ] **Monitor for failures** and fallback gracefully
- [ ] **Personal use only** (not commercial data harvesting)

---

## Decision Tree

```
Need job data?
├─ 500k+ jobs acceptable?
│  ├─ YES → Use JobsWithGPT (already integrated) ✅
│  └─ NO → Continue
│
├─ Need LinkedIn-specific jobs?
│  ├─ YES → Risk tolerance?
│  │  ├─ HIGH (burner account) → LinkedIn MCP ⚠️
│  │  └─ LOW → Stick with JobsWithGPT ✅
│  └─ NO → Continue
│
├─ Need multi-site aggregation?
│  ├─ YES → JobSpy MCP (accept fragility) ⚠️
│  └─ NO → Continue
│
├─ UK job seeker?
│  ├─ YES → Reed Jobs API ✅
│  └─ NO → Continue
│
└─ Compliance-critical?
   ├─ YES → JobsWithGPT + ATS scrapers only ✅
   └─ NO → Use pattern based on risk tolerance
```

---

## FAQs

### Q: Which MCP server gives the most jobs?
**A:** JobsWithGPT (500k+), followed by LinkedIn MCP (all LinkedIn jobs), then JobSpy MCP (multi-site aggregation).

### Q: Which is safest to use?
**A:** JobsWithGPT and Reed Jobs API (both designed for programmatic access, no ToS violations).

### Q: Can I use LinkedIn MCP without getting banned?
**A:** Use a burner account, throttle heavily (max 1 request per 10 seconds, 50 jobs/day), and accept the risk. No guarantees.

### Q: Should I integrate all MCP servers?
**A:** No. Start with JobsWithGPT (already integrated). Add others only if JobsWithGPT doesn't meet your needs.

### Q: What if JobsWithGPT goes down?
**A:** Fallback to existing ATS scrapers (Greenhouse, Lever, etc.). They're already integrated.

### Q: How do I know if a job is from JobsWithGPT vs LinkedIn MCP?
**A:** Check the `source` field in the job object. Example: `job["source"] == "jobswithgpt"` or `job["source"] == "linkedin_mcp"`.

---

## Next Steps

1. **Test JobsWithGPT integration** (already installed):
   ```bash
   python examples/test_jobswithgpt.py
   ```

2. **Decide on additional MCP servers** based on your risk tolerance:
   - Conservative: Stop here, JobsWithGPT is enough
   - Balanced: Add Reed Jobs API if UK-focused
   - Aggressive: Add LinkedIn MCP (burner account) + JobSpy MCP

3. **Read full documentation**:
   - `docs/JOBSWITHGPT_INTEGRATION.md` - Complete JobsWithGPT guide
   - `docs/AI_ENHANCEMENTS.md` - All MCP server options
   - `docs/MCP_INTEGRATION_GUIDE.md` - Practical integration examples

4. **Configure user preferences** (`config/user_prefs.json`):
   ```json
   {
     "mcp_servers": {
       "linkedin_enabled": false,
       "jobspy_enabled": false,
       "reed_enabled": false
     }
   }
   ```

---

## Support & Resources

- **JobsWithGPT**: https://github.com/jobswithgpt/mcp
- **LinkedIn MCP**: https://github.com/stickerdaniel/linkedin-mcp-server
- **JobSpy MCP**: https://github.com/borgius/jobspy-mcp-server
- **Job Searchoor**: https://github.com/0xDAEF0F/job-searchoor
- **Reed Jobs**: https://github.com/kld3v/reed_jobs_mcp
- **MCP Protocol**: https://modelcontextprotocol.io/

---

*Document created: 2025-10-03*
*Last updated: 2025-10-03*
*Owner: Chad Boyd (@cboyd0319)*
