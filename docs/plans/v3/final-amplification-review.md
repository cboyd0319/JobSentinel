# Final Amplification Review

This is the final v3 "think bigger" pass before v3 ideas are converted into
implementation plans. It asks whether each major idea is still too small, then
records the larger version that should be considered.

## Amplification Principles

- Make JobSentinel the candidate-side operating layer, not a better tracker.
- Turn hidden complexity into plain next actions for nontechnical users.
- Prefer local, durable, inspectable systems over opaque hosted intelligence.
- Keep Rust as the trusted runtime and local policy boundary.
- Treat regional expansion as a schema, taxonomy, source, and UX problem, not a
  translation-only problem.
- Treat downloadable packs as software supply chain artifacts.
- Make every powerful feature explain itself through evidence, provenance, and
  a safe fallback.

## Biggest Bets

| Area | Existing idea | Bigger v3 direction |
| --- | --- | --- |
| Product shape | Job case files | Candidate-side operating system with case files, source graph, event ledger, evidence wallet, strategy simulator, and campaign cockpit. |
| Matching | Qwen3 semantic matching | Local evidence engine using Qwen3 retrieval, Qwen3 reranking, exact skill graphs, blockers, hard negatives, calibration, and "why not matched" diagnostics. |
| User effort | Browser import | User-visible browser companion plus native quick capture, drag-and-drop, OCR-assisted visible import, and one-click case-file logging. |
| Sources | More adapters | Global source graph with policy classes, regional packs, public source automation, restricted-source visible workbench, parser drift tests, and source-health receipts. |
| Agents | Downloadable skills | Signed pack ecosystem with agents, skills, workflows, source packs, role packs, regional packs, eval packs, and local scoped MCP tools. |
| Security | Warnings and consent | Hiring firewall with plain-language risk labels, prompt-injection detection, scam response workflows, pack quarantine, privacy receipts, and repair-first recovery. |
| Installation | Easier packages | Edition-aware installer, Essentials package, portable/shared-computer mode, model-free first-run path, and device diagnostics. |
| OS integration | Native conveniences | Native assistant surface using App Intents, Shortcuts, Spotlight, notifications, OCR, local AI APIs, deep links, file associations, and local repair. |
| Compatibility | v3 rollback | Stable event, database, pack, source, model, browser, and export contracts with compatibility tests and unsupported-newer-data handling. |
| Regions | U.S. first | UK, EU, and India framework with source packs, occupational taxonomies, CV formats, currency and pay-period normalization, and region policy labels. |

## Ideas That Needed To Get Bigger

### Qwen3 Matching

The plan should not stop at "embed and compare." The larger version is a local
evidence engine:

- query-specific instruction profiles
- exact model and artifact lockfiles
- chunker, normalizer, tokenizer, and vector provenance
- requirement-to-evidence retrieval
- reranker calibration by query type
- evidence class scoring
- blockers and disqualifiers
- hard-negative mining from false positives
- eval fixtures for each role family and region
- debug UI that shows dense, lexical, skill, blocker, and reranker signals

The release bar should prove that Qwen3 reduces plausible-but-wrong matches,
not only that it produces vectors.

### On-Device OS Models

macOS 26+ and modern Windows local AI APIs are useful, but they should not own
JobSentinel's main intelligence. The bigger idea is an OS-native micro-assist
layer:

- Use Apple Foundation Models, Windows AI APIs, or other OS-local models only
  for bounded tasks such as short summaries, field extraction, copy cleanup,
  command suggestions, and accessibility-friendly explanations.
- Keep Qwen3 and deterministic logic as the governed matching and evidence
  path.
- Keep all OS model calls behind the same privacy labels, provenance, evals,
  and fallback behavior as other model backends.
- Treat OS-local model availability as an optimization, not a requirement.

### Regional Expansion

The small version is "add more job boards." The bigger v3 version is a regional
readiness framework:

- Region manifests define currencies, pay periods, location formats, work modes,
  CV norms, public-sector pathways, source classes, and legal warning copy.
- Taxonomy bridges map O*NET, UK SOC, ESCO, India NCO, and local role titles into
  JobSentinel role and skill graphs.
- Regional packs can add sources, forms, resume or CV formats, interview norms,
  and apprenticeship or public-sector workflows without touching core code.
- V3 should ship a framework and starter coverage for the UK, EU, and India,
  then leave deeper region completeness to future releases.

### Downloadable Packs

The small version is "more skills." The bigger version is a local marketplace
for candidate-side capabilities:

- Signed, content-addressed packs.
- Pack manifests with privacy labels, permissions, source policy, fixture tests,
  region support, and compatibility ranges.
- Pack quarantine and self-test before activation.
- Pack playground for developers to test parser drift, prompts, evals, and
  source fixtures without touching private user data.
- Exportable pack receipts so users can see what was installed and what it can
  do.

### Browser And Source Workflows

The small version is "extension import." The bigger version is source-aware
capture:

- Public source automation for official APIs and unauthenticated public pages.
- User-visible browser companion for pages the user is actively viewing.
- Restricted-source workbench for authenticated sources with no stored session
  material and no hidden refresh.
- OCR-assisted visible import for rendered content when DOM extraction is not
  reliable, only from user-selected visible surfaces.
- A source simulator that replays fixtures, parser drift, warnings, and review
  queues before a source pack can ship.

### Security With Less Friction

The small version is more prompts. The bigger version is secure-by-default
flow design:

- Consent is remembered per source, action, version, and risk class.
- Security Doctor repairs issues instead of asking users to debug them.
- Privacy receipts explain what happened after the fact in plain language.
- Prompt-injection and hidden-text defenses run before any posting text reaches
  model, agent, or external provider workflows.
- Dynamic adapter execution, if accepted, runs with no ambient filesystem,
  network, shell, credential, or database authority.

### Native OS Integration

The small version is platform polish. The bigger version is ambient local help:

- App Intents and Shortcuts on macOS for quick logging, reminders, and packet
  prep.
- Spotlight and Windows Search integration for local case files and resumes
  without exposing private content outside OS-approved indexes.
- Local OCR through Apple Vision or Windows OCR APIs for user-selected images
  and screenshots.
- OS-native notifications with action buttons for follow-up, interview prep,
  and stalled applications.
- Repair tools that can fix permissions, vault, browser companion pairing,
  model cache, source packs, and backup paths.

## Research-Driven Upgrades

The cutting-edge research pass points to these v3 upgrades:

- Hybrid matching: embeddings plus skill knowledge graph plus BM25 plus
  interpretable reranking.
- Listwise and multi-pass reranking as research prototypes for better
  person-job fit ordering.
- Hard-negative mining from false positives as the highest-return model
  improvement loop.
- Multilingual embeddings and regional taxonomy mapping for UK, EU, and India
  starter support.
- Prompt-injection and data-poisoning tests for job postings, resumes, source
  packs, and agent workflows.
- Local vector storage evaluation with SQLite-compatible extensions before
  adopting a separate vector database.
- Capability-based plugin execution using declarative packs first, and
  WebAssembly or tightly sandboxed script runtimes only after proof.

## Trust Boundary

V3 should keep these boundaries explicit:

- Frontend and browser content are untrusted.
- Source packs, agent packs, and regional packs are untrusted until verified.
- Job postings, resumes, and copied page text are untrusted model inputs.
- OS-local model outputs are suggestions, not authoritative data.
- Rust owns policy, storage, model governance, source classification, pack
  verification, and privileged operations.
- Users approve durable records, external sends, final applications, exports,
  and restricted-source workflows.

## V3 Scope Decision

V3 should not try to finish the whole future. It should lock the primitives:

- case files
- event ledger
- source graph
- regional manifests
- pack runtime
- model governance
- Qwen3 evidence engine
- browser companion protocol
- privacy receipts
- compatibility line
- Essentials and standard package split

Those primitives make the larger v3 and v4 ideas possible without repainting
the architecture again.

## References

- [Qwen3 Embedding 0.6B](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B)
- [Qwen3 Reranker 0.6B](https://huggingface.co/Qwen/Qwen3-Reranker-0.6B)
- [ConFit v3](https://arxiv.org/abs/2605.09760)
- [JobMatchAI](https://arxiv.org/abs/2603.14558)
- [Apple Foundation Models](https://developer.apple.com/documentation/foundationmodels)
- [Windows AI APIs](https://learn.microsoft.com/en-us/windows/ai/apis/)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [W3C Cognitive Accessibility](https://www.w3.org/WAI/cognitive/)
- [ESCO API](https://esco.ec.europa.eu/en/use-esco/use-esco-services-api/esco-web-service-api)
- [UK SOC 2020](https://www.ons.gov.uk/methodology/classificationsandstandards/standardoccupationalclassificationsoc/soc2020)
- [India NCO 2015](https://www.ncs.gov.in/documents/national%20classification%20of%20occupations%20_vol%20i-%202015.pdf)
