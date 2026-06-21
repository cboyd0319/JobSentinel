# Local Intelligence And Agents

V3 should turn JobSentinel's local Qwen3 and taxonomy foundation into a broader
local intelligence layer. The app should feel smarter because it has better
evidence, feedback, and workflow control, not because it sends everything to a
cloud model.

## Intelligence Principles

- Local-first by default.
- External AI optional and disabled until configured.
- Model identity, revisions, hashes, instructions, and thresholds owned by
  JobSentinel.
- Every score has provenance.
- Every model suggestion can be reviewed, edited, ignored, or deleted.
- Ranking behavior changes require eval coverage.
- Agents propose and prepare. Users approve external actions and final submits.

## Model Layer Direction

The current governed pair is the base:

- Qwen3-Embedding-0.6B for dense retrieval.
- Qwen3-Reranker-0.6B for bounded reranking.
- BM25 and exact skill matching for lexical grounding.
- Hybrid scorer for blocker, seniority, required-coverage, and provenance.
- MiniLM or deterministic fallback when governed models are unavailable.

V3 extensions:

- In-app model manager with model status, size, license, cache path, checksum,
  backend, device, and fallback state.
- Model profiles: fast, balanced, quality, Essentials, and offline-safe.
- Essentials profile with deterministic matching and no large model download by
  default.
- Better Windows acceleration evaluation alongside macOS Metal and CPU paths.
- OS-native micro-assist backend for bounded local tasks where available,
  including Apple Foundation Models, Windows AI APIs, or other platform-local
  services, without replacing governed Qwen3 matching.
- Clear first-run copy for model download size and why local models help.
- Stale-vector rebuild queue that explains why matching needs refresh.
- Model doctor that checks missing files, hash mismatch, wrong dimensions,
  tokenizer drift, instruction version drift, and stale indexes.

## Deeper Qwen3 Direction

V2.9 proves that governed Qwen3 embedding and reranking can exist in the app.
V3 should go much further. Qwen3 should become the local intelligence backbone
for evidence-based job search, not a narrow optional matcher.

Deeper v3 work:

- Requirement-level retrieval where every hard requirement retrieves the best
  resume, project, certification, and profile evidence.
- Multi-vector case files that embed job summaries, requirement chunks, resume
  bullets, company notes, application notes, interview notes, and outcome
  summaries with clear provenance.
- Reranker calibration by query type so resume evidence, job search, gap
  analysis, title matching, and source risk do not share one threshold.
- Hard-negative mining from false positives such as keyword-only matches,
  adjacent skills, seniority mismatch, and required-versus-preferred confusion.
- Qwen3 reranker fine-tuning path once labels justify it.
- Embedding fine-tuning only if correct evidence is not reaching top-K
  retrieval.
- Optional heavier Qwen3 model profiles for users who want better local quality
  and have the hardware to support it.
- Evaluation UI that shows dense, BM25, exact skill, reranker, blocker,
  seniority, salary, location, and source contributions.
- Stale-vector and stale-instruction diagnostics after model, prompt, taxonomy,
  chunker, or normalizer changes.
- Local match debugger for users and developers: "why this matched," "why this
  did not match," and "what evidence would improve this application."
- Regional query profiles for UK, EU, and India terminology, pay phrasing,
  occupational taxonomies, and multilingual matching where eval data supports
  it.

The product goal is not a single stronger match score. The goal is a local
reasoning layer that can explain fit, gaps, risk, and next action through
evidence.

## OS-Native Micro-Assist

Platform-provided local models can remove friction, but they should be treated
as bounded helpers.

Good v3 uses:

- summarize a selected visible job posting
- extract fields from a user-selected screenshot or PDF
- rewrite confusing app messages in plain language
- suggest a next action from local case-file state
- draft a reminder title or follow-up note for user review
- help screen-reader-friendly explanations stay concise

Boundaries:

- not the primary matching engine
- not the source of durable records without review
- not a substitute for Qwen3 evals
- not allowed to send private data to cloud services by default
- disabled or gracefully replaced by deterministic fallbacks when unavailable

Every OS-native model call needs a privacy label, provenance record, feature
flag, and fallback path.

## Eval-Driven Matching

Before changing ranking behavior, v3 should require eval fixtures for:

- job requirement to resume evidence
- resume profile to job match
- skill phrase to resume evidence
- title and seniority alignment
- hard requirement blockers
- gap analysis
- role-family expansion
- fairness counterfactuals
- adversarial postings
- self-preference checks for model-edited resumes

Metrics:

- Recall@10 and Recall@50 for retrieval
- nDCG@10 for ranking
- MRR where one best evidence item is expected
- hard-blocker false positives
- source-specific parse confidence
- latency and memory
- explanation provenance coverage

Do not assert exact floating-point scores across backends. Assert ordering,
evidence class, blockers, score bands, and user-visible explanations.

## Learning Path

Best improvement order:

1. Capture explicit local labels and feedback.
2. Mine hard negatives from plausible false positives.
3. Fine-tune or calibrate the reranker first.
4. Add learning-to-rank over explainable features.
5. Fine-tune embeddings only if retrieval recall is poor.
6. Explore contextual bandits only after enough real local feedback exists.

Feedback examples:

- saved job
- hidden job
- applied
- not interested
- marked ghost job
- marked bad match
- accepted resume suggestion
- rejected keyword suggestion
- interview received
- offer received

Feedback must stay local unless the user explicitly exports it.

## Agent Runtime

V3 agents should be workflow agents inside JobSentinel, not unrestricted desktop
automation. Candidate agents:

- Search Planner: builds lanes, sources, stop rules, and weekly review.
- Source Analyst: checks source health, duplicates, salary coverage, and source
  policy state.
- Posting Reviewer: evaluates ghost-job, scam, stale, and weak-source signals.
- Resume Evidence Reviewer: maps requirements to real local evidence.
- Application Packet Builder: prepares reviewed resume, notes, screening
  answers, attachment checklist, and questions.
- Browser Companion Assistant: suggests local actions beside the page the user
  is viewing.
- Interview Coach: builds role-specific question sets and story practice.
- Negotiation Analyst: reviews written offer, verbal claims, total comp, costs,
  deadlines, and counter scripts.
- Privacy Reviewer: explains data use before exports, browser companion
  pairing, external AI calls, or source pack installs.

Required agent controls:

- visible task plan
- clear inputs
- data boundary label
- cancel button
- approval gates
- local audit trail
- no final submit
- no hidden browser reads
- no unrestricted shell or file access
- deterministic fallback where possible

## External AI Gateway Evolution

External AI can become more useful in v3 without weakening defaults:

- Provider task routing across OpenAI, Anthropic, Google Gemini, GitHub Copilot,
  custom HTTPS, and local endpoints.
- Per-feature privacy labels and payload minimization.
- Side-by-side local and external draft comparison where useful.
- Sensitive-payload opt-in per task, not global surprise behavior.
- Payload preview with highlighted private fields.
- Redaction templates for resumes, salary, names, locations, and notes.
- Metadata-only history with clear delete controls.
- Privacy receipts attached to every provider request.

Private resume, salary, notes, and application history should remain local
unless a user chooses a feature that has been specifically reviewed for
sensitive external AI use.

## Local MCP And Skills

V3 can expose JobSentinel capabilities to other tools through a local MCP server
only if permissions are narrow and visible.

Potential MCP tools:

- list local saved searches without private notes
- create a draft job from explicit user input
- ask for fit summary for a selected case file
- create a follow-up reminder
- export a safe support report
- run a specific Agent Skill on a selected case file
- open JobSentinel to a case file

MCP boundaries:

- disabled by default
- loopback only
- user-paired clients
- scoped tokens
- read/write scopes separated
- no raw database dump
- no vault access
- no credential or session exposure
- local audit log and revoke controls

Agent Skills should remain static, packaged, and spec-compliant. The v3 runtime
can make them executable through controlled workflows rather than treating them
as free-form prompts.

## Bigger Intelligence Ideas

- Personal career graph that learns which evidence, roles, sources, companies,
  and work modes produce outcomes for the user.
- Local knowledge base over every imported job, resume version, application,
  interview, offer, and follow-up.
- Role transition planner that builds a practical path from current evidence to
  target role.
- Regional role transition planner that maps local role titles, occupational
  classifications, and CV expectations instead of assuming U.S. job-market
  language.
- Resume and job adversarial lab for prompt injection, hidden text, brittle
  parsing, and self-preference.
- Explanation debugger that shows dense, BM25, exact skill, reranker, blocker,
  source, salary, and location contributions.
- User-owned training pack export for people who want to fine-tune their own
  local models outside JobSentinel.
- Optional privacy-preserving aggregate learning for source health only, with no
  resumes, notes, identities, or application history.
