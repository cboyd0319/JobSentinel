# Research Agenda

V3 should be research-driven where research can materially improve the product.
The goal is not to chase papers. The goal is to identify ideas that help a real
job seeker find better opportunities with less wasted effort and clearer
evidence.

## Research Threads To Mine

### Resume And Job Matching

Use the current semantic matching note as the baseline:

- ConFit and ConFit v2 for contrastive learning and hard-negative mining.
- ConFit v3 for LLM-based reranking and noisy-sample filtering.
- Person-job fit and ability-aware matching for requirement-level evidence.
- Feature-fusion person-job fit for blending semantic, lexical, skill, salary,
  location, seniority, and preference features.
- Career-path-aware matching for role transitions and seniority trajectory.
- Bias and fairness evaluations for counterfactual ranking stability.

V3 product question:

- Can JobSentinel produce better candidate-side recommendations than generic
  job-board matching by combining Qwen3 retrieval, reranking, skill graphs,
  blockers, and local outcome feedback?
- How far can Qwen3-Embedding-0.6B plus Qwen3-Reranker-0.6B go when used as a
  full evidence engine with hard negatives, query-specific calibration,
  diagnostics, and future reranker fine-tuning?

### Agentic Workflows

Research and prototype:

- planning and approval-gated agent workflows
- tool permission models
- prompt-injection resistance for untrusted job postings
- local agent memory boundaries
- skill package execution
- MCP server and client permission models

V3 product question:

- Can JobSentinel run job-search skills locally with enough structure that a
  nontechnical user gets useful help without trusting an unbounded agent?

### Source Discovery

Research and prototype:

- ATS fingerprinting
- company careers page classification
- public structured data extraction
- source reliability scoring
- parser drift detection
- source-pack fixture validation
- regional source discovery

V3 product question:

- Can JobSentinel help users discover jobs across company pages and regional
  markets without turning source access into hidden scraping?

### Regional Readiness

Research and prototype:

- UK source, CV, pay, location, and right-to-work vocabulary.
- EU source, ESCO taxonomy, Europass CV, multilingual fixture, and currency
  handling.
- India source, NCO, NSQF, CTC/LPA/monthly pay parsing, and regional location
  handling.
- Taxonomy bridge quality between O*NET, UK SOC, ESCO, India NCO, and
  JobSentinel canonical role families.
- Region-pack schema and incomplete-coverage UX.

V3 product question:

- Can JobSentinel ship a framework and starter UK, EU, and India packs that are
  genuinely helpful while clearly labeling incomplete regional coverage?

### Browser Companion

Research and prototype:

- browser extension side panels
- visible-page extraction
- secure loopback pairing
- page-origin-bound commands
- user-approved import review
- cross-browser packaging
- extension permission UX

V3 product question:

- Can the browser companion remove most copy and paste friction while keeping
  restricted-source activity user-visible and local?

### Local And On-Device Models

Research and prototype:

- Qwen3 embedding and reranker performance across CPU, Metal, and Windows
  acceleration paths.
- Local small language models for summarization, extraction, and drafting.
- Apple Foundation Models for macOS-local workflows where available.
- Windows AI APIs, ONNX Runtime DirectML, and other platform-local helpers for
  bounded extraction, short summaries, and accessibility-friendly explanations.
- External local runtimes such as Ollama, LM Studio, llama.cpp, and vLLM-style
  local services.
- Model pack manifests, hashes, licensing, and cache integrity.

V3 product question:

- Which local model stack gives users the best quality without making setup
  brittle or hiding multi-gigabyte downloads?
- What should the Essentials profile use for matching, extraction, and ranking
  when no large model files are installed?
- Which bounded tasks are good enough for OS-native local models, and which must
  stay on Qwen3 or deterministic logic?

### Pack Runtime And Sandboxing

Research and prototype:

- Signed, content-addressed pack distribution.
- Pack quarantine and self-test.
- Declarative source packs before executable packs.
- WebAssembly Component Model and WASI for sandboxed transforms.
- QuickJS or Deno Core only if runtime isolation, resource limits, and no
  ambient network or filesystem access are proven.
- Pack playground using synthetic data and fixtures only.

V3 product question:

- Can JobSentinel let community packs expand the product without creating an
  unrestricted local plugin host?

### Job-Search Behavior And Outcomes

Research and prototype:

- job-search fatigue and search intensity
- feedback and confidence effects
- long-term unemployment support
- application quality versus application volume
- pay expectations and salary floor accuracy
- source yield and follow-up timing

V3 product question:

- Can JobSentinel guide users toward better effort allocation without becoming
  paternalistic or overconfident?

### Commercial Product Benchmarking

Research and prototype:

- job tracker workflows in Teal, Huntr, Jobscan, and similar products.
- resume scanner workflows in Jobscan, Rezi, Resume Worded, and similar tools.
- browser copilot and autofill workflows in Simplify and similar extensions.
- auto-apply workflows in LoopCV, Sonara-style tools, and similar products.
- user pain points around lock-in, privacy, opaque scoring, copy/paste burden,
  and recovery.

V3 product question:

- Can JobSentinel become better than commercially similar tools in almost every
  user-meaningful way while refusing hidden scraping, fake claims, and final
  submission without the user?

## Prototype Tracks

| Track | Prototype |
| --- | --- |
| Matching Lab | Eval runner for requirement-to-evidence, resume-to-job, blockers, counterfactuals, and hard negatives. |
| Qwen3 Deep Match | Requirement-level Qwen3 retrieval, bounded reranking, query-specific thresholds, and explanation diagnostics. |
| Browser Companion | Minimal extension side panel paired to local Tauri, visible import only. |
| Source Graph | Machine-readable source records with policy, rate limit, fixtures, and health. |
| Regional Pack | UK, EU, and India starter manifests with pay, location, taxonomy, CV, and source fixtures. |
| Case Files | One job case file view that merges job, resume, tracker, source, notes, interview, and offer state. |
| Event Ledger | Append-only local events with derived dashboard and tracker state. |
| Agent Runtime | Run one Agent Skill inside JobSentinel with visible plan, approvals, and audit trail. |
| Model Doctor | UI and CLI diagnostics for model lock, cache integrity, backend, device, and fallback. |
| Privacy Receipt | Receipt object and UI for one external AI request, one browser import, and one source check. |
| Sandboxed Adapter | Run a dynamic parser against synthetic fixtures with no filesystem, shell, database, credential, or ambient network access. |
| OS Micro-Assist | Compare OS-local small-model extraction and summarization against deterministic and Qwen3 paths. |
| Commercial Benchmark | Run the v3 demo script against commercial tracker, resume, browser-copilot, auto-apply, and chatbot workflows. |

## Eval Data To Build

- Synthetic resumes across technical and nontechnical roles.
- Synthetic job postings with hard requirements, preferred requirements, vague
  text, salary ranges, and location constraints.
- Real public job postings where source terms allow fixture use.
- Resume/job evidence pairs labeled 0 to 4.
- Hard-negative pairs that share vocabulary but fail the actual requirement.
- Counterfactual resumes with same evidence and altered nonessential signals.
- Adversarial postings with hidden instructions and suspicious apply links.
- Source fixtures for list pages, detail pages, broken pages, and layout drift.
- Browser companion fixtures for visible cards and detail pages.
- Regional fixtures for UK, EU, and India pay, location, title, CV, and source
  patterns.
- OCR fixtures for user-selected screenshots and rendered postings.
- Pack quarantine fixtures for malicious manifests, oversized files, parser
  drift, and denied permissions.

## Research Intake Rules

- Prefer primary sources, official docs, papers, and maintained project docs.
- Record source date and why it matters.
- Do not copy long passages into the repo.
- Convert durable findings into source taxonomy, eval fixtures, feature docs, or
  model manifests instead of leaving them as notes.
- Keep speculation clearly labeled.
- Do not let research bypass Rule 0, user review, privacy labels, source policy,
  or platform boundaries.

## Candidate External References

- [Semantic Resume-Job Matching Research](../../research/semantic-resume-job-matching.md)
- [References And External Sources](../../references.md)
- [Agent Skills specification](https://agentskills.io/specification.md)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenAI Agents guide](https://platform.openai.com/docs/guides/agents)
- [Greenhouse job board API](https://developers.greenhouse.io/job-board.html)
- [Lever postings API](https://github.com/lever/postings-api)
- [Google JobPosting structured data](https://developers.google.com/search/docs/appearance/structured-data/job-posting)
- [Apple Foundation Models framework](https://developer.apple.com/documentation/foundationmodels)
- [Windows AI APIs](https://learn.microsoft.com/en-us/windows/ai/apis/)
- [ONNX Runtime DirectML execution provider](https://onnxruntime.ai/docs/execution-providers/DirectML-ExecutionProvider.html)
- [Chrome extension side panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [ESCO web-service API](https://esco.ec.europa.eu/en/use-esco/use-esco-services-api/esco-web-service-api)
- [Europass CV](https://europass.europa.eu/en/create-europass-cv)
- [UK SOC 2020](https://www.ons.gov.uk/methodology/classificationsandstandards/standardoccupationalclassificationsoc/soc2020)
- [National Career Service India](https://www.ncs.gov.in/)
- [WebAssembly Component Model](https://component-model.bytecodealliance.org/)
- [WASI](https://wasi.dev/)
- [sqlite-vec](https://alexgarcia.xyz/sqlite-vec/)
- [Teal job tracker](https://www.tealhq.com/tools/job-tracker)
- [Huntr job tracker](https://huntr.co/product/job-tracker)
- [Jobscan resume scanner](https://www.jobscan.co/resume-scanner)
- [Simplify Copilot](https://simplify.jobs/copilot)
- [LoopCV auto-apply](https://www.loopcv.pro/autoapply/)

## Decision Questions

- Should v3 require a new local event ledger before major workflow features?
- Should the first major refactor be case-file UI or source graph?
- Should Qwen3 model downloads move from developer feature to user-visible
  optional setup?
- Should Qwen3 reranker calibration and future fine-tuning become first-class v3
  product architecture rather than developer-only research?
- Should local LLM support use native runtimes, local HTTP providers, or both?
- Should source packs be read-only declarative data in v3.0, with script packs
  deferred until sandboxing is proven?
- Should Browser Companion replace the bookmarklet or ship beside it?
- Should JobSentinel publish a public candidate-side matching benchmark?
- Should UK, EU, and India starter packs be built into v3 or shipped as curated
  optional downloads?
- Should OS-native local models be enabled by default for bounded helper tasks,
  or should they require explicit opt-in until evals prove quality?
- Which commercial workflows should v3 beat in its first public demo, and which
  should remain explicit non-goals because they conflict with user control?
