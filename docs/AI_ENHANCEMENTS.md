# AI Enhancement Opportunities for Job Scraper

This document outlines cost-effective AI integrations to enhance job matching, resume analysis, and scraping capabilities while keeping cloud costs minimal.

---

## 🎯 Executive Summary

**Goal:** Enhance job matching precision and user experience without increasing cloud costs.

**Strategy:**
1. Run AI locally (Ollama) or use free-tier services
2. Integrate MCP servers for data access
3. Use open-source models for privacy and cost savings

---

## 1. MCP Server Integrations (FREE)

### 1.1 Job Board MCP Servers

**Greenhouse MCP Server**
- **Source:** [Greenhouse Job Board MCP](https://mcp.pipedream.com/app/greenhouse_job_board_api)
- **Use Case:** Structured access to Greenhouse job postings
- **Integration:** Add to Claude Desktop config, use for scraping enhancement
- **Cost:** FREE
- **Benefits:**
  - Native JSON API access
  - No HTML parsing needed
  - Automatic schema validation

**Lever.co Scraper MCP**
- **Source:** [Apify Lever MCP](https://apify.com/lexis-solutions/lever-co-scraper/api/mcp)
- **Use Case:** Extract job data from Lever-hosted career sites
- **Cost:** FREE tier available
- **Benefits:**
  - Automated extraction of titles, locations, departments, dates
  - No custom scraper maintenance needed

**Career Site Job Listing API MCP**
- **Source:** [mcpservers.org](https://mcpservers.org/servers/fantastic-jobs/career-site-job-listing-api)
- **Use Case:** Multi-platform job aggregation
- **Coverage:** 105k+ company career sites across 35 ATS platforms
- **Cost:** FREE tier
- **Benefits:**
  - Single API for Workday, Greenhouse, Ashby, Lever, etc.
  - Massive coverage increase without custom scrapers

### 1.2 Job Search MCP Servers ✨ **HIGH VALUE**

**JobsWithGPT MCP Server** 🌟 **RECOMMENDED**
- **Source:** [GitHub](https://github.com/jobswithgpt/mcp)
- **Coverage:** 500,000+ public job listings (continuously refreshed)
- **Use Case:** Real-time job search aggregation across multiple boards
- **Cost:** FREE (public access)
- **API Endpoint:** `https://jobswithgpt.com/mcp/`
- **Integration:** Can be used as MCP server or direct API
- **Benefits:**
  - Massive job coverage (500k+ jobs)
  - Continuously refreshed data
  - No manual scraper maintenance needed
  - Works with Claude Desktop and OpenAI Responses API
- **Example Usage:**
  ```python
  # Via MCP client
  client.responses.create(
      model="gpt-4.1-mini",
      tools=[{
          "type": "mcp",
          "server_label": "jobswithgpt",
          "server_url": "https://jobswithgpt.com/mcp/"
      }],
      input="find jobs for python devs in sf"
  )
  ```

**Reed Jobs MCP Server** (UK-focused)
- **Source:** [GitHub](https://github.com/kld3v/reed_jobs_mcp)
- **API:** Reed.co.uk Jobs API (UK's #1 job site)
- **Cost:** FREE API key required (from Reed Developer Portal)
- **Use Case:** UK job market, advanced filtering
- **Language:** TypeScript/Node.js
- **Features:**
  - Search with keywords, location, salary, contract type
  - Detailed job information retrieval
  - Remote work filtering
  - Location-based searches
- **Functions:**
  - `mcp_reed_jobs_search_jobs()`: Search with filters
  - `mcp_reed_jobs_get_job_details()`: Get job details by ID
- **Requirements:**
  - Node.js v16+
  - Reed API key (free registration)
  - Configuration in `mcp.json`

### 1.3 Resume Analysis MCP Servers

**Resume Analysis MCP (@sms03/resume-mcp)**
- **Source:** [GitHub](https://github.com/sms03/resume-mcp)
- **Use Case:** Analyze user resumes, extract skills/experience
- **Cost:** FREE (open-source)
- **Integration:** Use during onboarding to auto-configure preferences
- **Benefits:**
  - Automatic skill extraction
  - Experience level detection
  - Job title normalization

**JSON Resume MCP**
- **Source:** [GitHub](https://github.com/jsonresume/mcp)
- **Use Case:** Maintain structured resume data
- **Cost:** FREE (open-source)
- **Benefits:**
  - Standardized resume format
  - Easy updates as user applies to jobs
  - Version tracking

---

## 2. Local LLM with Ollama (FREE)

### 2.1 Why Ollama?

- **Zero API costs:** Runs entirely on user's local machine
- **Privacy-first:** No data leaves user's device
- **Fast:** Optimized for CPU/GPU inference
- **Easy setup:** One-command install on macOS/Linux/Windows

### 2.2 Recommended Models

**DeepSeek-R1 (7B distilled)**
- **Size:** ~4GB
- **Use Case:** Job description analysis, resume matching
- **Speed:** ~20-30 tokens/sec on MacBook Pro M1
- **Quality:** 85-90% accuracy for matching tasks

**Llama 3.2 (3B)**
- **Size:** ~2GB
- **Use Case:** Keyword extraction, ghost job detection
- **Speed:** ~40-50 tokens/sec
- **Quality:** Good for classification tasks

**Qwen2.5 (7B)**
- **Size:** ~4GB
- **Use Case:** Semantic similarity, skill gap analysis
- **Speed:** ~25-35 tokens/sec
- **Quality:** Excellent for NLP tasks

### 2.3 Integration Strategy

**Phase 1: Resume Analysis (Onboarding)**
```python
# Use Ollama to parse uploaded resume
from ollama import Client

client = Client(host='http://localhost:11434')

response = client.chat(model='deepseek-r1:7b', messages=[
  {
    'role': 'user',
    'content': f'''Extract skills, job titles, and experience level from this resume:

    {resume_text}

    Return JSON: {{"skills": [], "titles": [], "seniority": ""}}'''
  }
])

# Auto-populate user_prefs.json
```

**Phase 2: Job Description Enhancement**
```python
# Enhance ghost job detection with LLM
response = client.chat(model='llama3.2:3b', messages=[
  {
    'role': 'user',
    'content': f'''Analyze this job description for red flags:

    {job_description}

    Check for: evergreen language, vague requirements, unrealistic expectations.
    Return confidence score 0-1 that this is a real, active job.'''
  }
])
```

**Phase 3: Semantic Matching**
```python
# Compare resume to job description semantically
response = client.chat(model='qwen2.5:7b', messages=[
  {
    'role': 'user',
    'content': f'''Compare this resume to the job description.

    Resume: {user_resume}
    Job: {job_description}

    Score 0-100 for match quality. Explain gaps and strengths.'''
  }
])
```

### 2.4 Open-Source Projects to Integrate

**ollama_resume_analyser**
- **Source:** [GitHub](https://github.com/Akhil-Pratyush-Tadanki/ollama_resume_analyser)
- **Function:** Extract keywords from job descriptions, compare with resume
- **Integration:** Fork and integrate into `utils/llm.py`

**Ollama-IQ (Mock Interview Bot)**
- **Source:** [GitHub](https://github.com/loki-0405/-Ollama-IQ/)
- **Function:** AI interview practice based on job description
- **Integration:** Optional feature for premium users
- **Value-add:** Help users prepare for jobs they're applying to

**JobHuntr.fyi Logic**
- **Concept:** Skip jobs that don't match custom filters
- **Integration:** Use Ollama to pre-filter jobs before scoring
- **Benefit:** Reduce noise, improve precision

---

## 3. HuggingFace Free Tier (LIMITED FREE)

### 3.1 Available Models

**LlamaFactoryAI/cv-job-description-matching**
- **Source:** [HuggingFace](https://huggingface.co/LlamaFactoryAI/cv-job-description-matching)
- **Use Case:** AI talent matchmaker
- **Cost:** FREE inference (rate-limited)
- **Limitation:** Not deployed on Inference Provider (would need self-hosting)

**Sentence Transformers (all-MiniLM-L6-v2)**
- **Size:** ~23MB
- **Use Case:** Semantic similarity for job-resume matching
- **Cost:** FREE
- **Speed:** Very fast (can run locally or via HF API)
- **Integration:**
  ```python
  from sentence_transformers import SentenceTransformer, util

  model = SentenceTransformer('all-MiniLM-L6-v2')

  resume_embedding = model.encode(resume_text)
  job_embedding = model.encode(job_description)

  similarity = util.cos_sim(resume_embedding, job_embedding)
  # Score: 0.0 - 1.0
  ```

### 3.2 Datasets for Training/Fine-tuning

**InferencePrince555/Resume-Dataset**
- **Source:** [HuggingFace](https://huggingface.co/datasets/InferencePrince555/Resume-Dataset)
- **Use Case:** Train custom resume parsers
- **Size:** 2,484 resumes

**jacob-hugging-face/job-descriptions**
- **Source:** [HuggingFace](https://huggingface.co/datasets/jacob-hugging-face/job-descriptions)
- **Use Case:** Train ghost job detectors
- **Integration:** Fine-tune a classifier to detect evergreen/vague postings

---

## 4. Implementation Roadmap

### Phase 0: JobsWithGPT Integration (Week 0) 🌟 **HIGHEST PRIORITY**
**Effort:** Very Low
**Impact:** Extreme
**Cost:** $0

JobsWithGPT provides **500,000+ jobs** with zero scraper maintenance!

- [ ] Integrate JobsWithGPT MCP server client
- [ ] Create adapter to convert JobsWithGPT results to our schema
- [ ] Test job coverage vs current scrapers
- [ ] **If coverage is good, deprecate 90% of custom scrapers!**

**Expected Outcome:**
- Replace dozens of custom scrapers with one API call
- 500k+ job coverage vs current ~1-2k
- Zero maintenance burden
- Real-time job updates

### Phase 1: MCP Server Integration (Week 1)
**Effort:** Low
**Impact:** High (if JobsWithGPT doesn't cover everything)
**Cost:** $0

- [ ] Add Career Site Job Listing API MCP to config (if needed as backup)
- [ ] Keep Greenhouse/Lever scrapers as fallback
- [ ] Test coverage increase (target: 105k+ companies)
- [ ] Measure scraping reliability improvement

### Phase 2: Local Resume Parser with Ollama (Week 2)
**Effort:** Medium
**Impact:** High
**Cost:** $0 (runs locally)

- [ ] Add Ollama integration to `utils/llm.py`
- [ ] Implement resume parsing on onboarding
- [ ] Auto-populate user preferences from resume
- [ ] Add skill gap analysis feature

### Phase 3: Ghost Job Detection Enhancement (Week 3)
**Effort:** Medium
**Impact:** Medium
**Cost:** $0

- [ ] Train/fine-tune classifier on job description dataset
- [ ] Integrate Ollama for semantic analysis
- [ ] Add "confidence score" to ghost job penalties
- [ ] A/B test against current rule-based system

### Phase 4: Semantic Matching (Week 4)
**Effort:** High
**Impact:** Very High
**Cost:** $0

- [ ] Integrate sentence-transformers for embeddings
- [ ] Implement hybrid scoring (rules 40% + semantic 60%)
- [ ] Add "why this match?" explanations using LLM
- [ ] Measure precision/recall improvement

### Phase 5: Optional Premium Features (Future)
**Effort:** High
**Impact:** Medium (monetization)
**Cost:** User-pays for cloud hosting

- [ ] AI interview practice (Ollama-IQ style)
- [ ] Cover letter generator
- [ ] Application tracking with AI insights
- [ ] Referral network analysis

---

## 5. Cost Analysis

### Current State
- **Cloud costs:** ~$20-35/month (GCP)
- **AI costs:** $0 (rule-based only)
- **Total:** ~$20-35/month

### With Ollama Integration
- **Cloud costs:** ~$20-35/month (unchanged)
- **AI costs:** $0 (runs on user's local machine)
- **User requirements:** 4GB+ RAM, ~10GB disk space
- **Total:** ~$20-35/month

### With MCP Servers
- **Cloud costs:** ~$15-25/month (less scraping overhead)
- **AI costs:** $0 (free tier APIs)
- **Total:** ~$15-25/month (**SAVINGS of $5-10/month**)

### If User Opts for Cloud-Hosted LLM (Optional)
- **Claude API:** $3-5/month (with smart gating)
- **OpenAI API:** $5-10/month
- **Recommended:** Keep LLM local by default, cloud opt-in

---

## 6. Privacy & Security Considerations

### Local-First AI (Ollama)
✅ **Pros:**
- No data leaves user's device
- No API keys needed
- GDPR/CCPA compliant by design
- Unlimited usage

❌ **Cons:**
- Requires local compute resources
- Slightly slower than cloud APIs
- Model quality varies

### MCP Servers
✅ **Pros:**
- Structured APIs (no HTML scraping)
- Rate limiting handled by provider
- No sensitive data sent (just job IDs)

⚠️ **Caution:**
- Resume data should NEVER be sent to MCP servers
- Use MCP for job data only, Ollama for resume analysis

---

## 7. Recommended Next Steps

1. **Immediate (This Week):**
   - Install Ollama on dev machine
   - Test resume parsing with DeepSeek-R1
   - Benchmark speed/quality vs. current system

2. **Short-term (Next 2 Weeks):**
   - Integrate Career Site Job Listing API MCP
   - Implement resume analysis on onboarding
   - Add semantic matching with sentence-transformers

3. **Medium-term (Next Month):**
   - A/B test enhanced scoring vs. rule-based
   - Measure precision/recall improvements
   - Document new AI features in user guide

4. **Long-term (3-6 Months):**
   - Fine-tune custom models on user feedback
   - Explore premium AI features (interview prep)
   - Consider federated learning for privacy-preserving improvements

---

## 8. Success Metrics

Track these KPIs to measure AI enhancement impact:

- **Precision:** % of alerted jobs that user applies to (target: >90%)
- **Recall:** % of good jobs found vs. manual search (target: >95%)
- **User satisfaction:** NPS score (target: >50)
- **Time saved:** Hours saved per week (target: 5+ hours)
- **Application success rate:** % of applications → interviews (target: 10%+)

---

## 9. Resources & References

**Documentation:**
- [Ollama Documentation](https://ollama.com/docs)
- [MCP Protocol Spec](https://modelcontextprotocol.io/)
- [HuggingFace Inference API](https://huggingface.co/inference-api)
- [Sentence Transformers Guide](https://www.sbert.net/)

**Open-Source Projects:**
- [Resume Matcher](https://resumematcher.fyi/)
- [ollama_resume_analyser](https://github.com/Akhil-Pratyush-Tadanki/ollama_resume_analyser)
- [Ollama-IQ](https://github.com/loki-0405/-Ollama-IQ/)

**MCP Servers:**
- [Career Site Job Listing API](https://mcpservers.org/servers/fantastic-jobs/career-site-job-listing-api)
- [Greenhouse MCP](https://mcp.pipedream.com/app/greenhouse_job_board_api)
- [Resume Analysis MCP](https://github.com/sms03/resume-mcp)

---

## 10. Conclusion

**Key Takeaway:** We can dramatically improve job matching quality using entirely free, local-first AI tools without increasing cloud costs.

**Recommended Approach:**
1. Start with MCP servers for better data access (saves money)
2. Add Ollama for local AI (zero cost, privacy-first)
3. Use sentence-transformers for semantic matching (free, fast)
4. Keep cloud AI optional (user choice, user pays)

**Expected Outcomes:**
- 20-30% improvement in match precision
- 10-15% reduction in cloud costs
- Zero AI API costs (local-first)
- Better user privacy and data control

---

*Document created: 2025-10-03*
*Last updated: 2025-10-03*
*Owner: Chad Boyd (@cboyd0319)*
