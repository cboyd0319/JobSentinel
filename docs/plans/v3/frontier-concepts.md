# Frontier Concepts

This is the second-pass "think bigger" file. These concepts may be larger than
one app release. They are included because v3 is the first release where the
architecture can be reset, compatibility can be locked, and JobSentinel can
become more than a desktop tracker.

## Candidate-Side Infrastructure

JobSentinel could become the local infrastructure layer for a job seeker's side
of the hiring market:

- local career data standard
- opportunity case files
- application packet format
- source and policy manifests
- privacy receipts
- local event ledger
- portable backup and export
- browser companion protocol
- scoped local MCP tools

Why this is bigger:

- The app becomes one implementation of a durable candidate-side system.
- Users can take their data, evidence, and job-search history with them.
- Other tools can integrate without owning the user's private data.

## Personal Hiring Firewall

JobSentinel can act as a firewall between the user and the hiring web:

- block or warn on suspicious apply links
- identify ghost-job and stale-posting patterns
- detect hidden instructions and prompt-injection text
- flag pay mismatch, deadline pressure, and source risk
- strip token-like URL fields from imports
- explain restricted-source risks before user-approved flows
- keep final submission in the user's hands

Why this is bigger:

- The product is not just finding jobs. It is protecting users from low-quality
  hiring systems and unsafe workflows.

## Local Career Compiler

Treat the user's evidence and goals like inputs to a compiler:

Input:

- current resume evidence
- target roles
- constraints
- pay floor
- location and work mode
- source preferences
- outcome history

Output:

- search lanes
- source plan
- resume packet plan
- application cadence
- interview prep plan
- gap plan
- follow-up plan
- negotiation plan

Why this is bigger:

- The app stops asking users to manage dozens of disconnected decisions.
- The output is a reviewed campaign plan with traceable evidence.

## Open Candidate-Side Matching Benchmark

JobSentinel could publish a public benchmark for candidate-side matching:

- synthetic resumes
- synthetic and public-allowed job postings
- requirement-to-evidence labels
- hard negatives
- source-risk examples
- fairness counterfactuals
- adversarial postings
- scoring and explanation rubrics
- Qwen3 embedding and reranking baseline runs
- query-type threshold and calibration reports

Why this is bigger:

- Most matching systems optimize employer or platform outcomes. JobSentinel can
  define a benchmark for helping the candidate make better decisions.

## Local Evidence Engine

Treat Qwen3 embedding and reranking as a local evidence engine:

- retrieve direct evidence for each requirement
- rerank evidence against the exact requirement
- classify evidence strength
- explain missing hard requirements
- compare resume versions by requirement coverage
- recommend which evidence to make clearer
- keep provenance back to exact local text

Why this is bigger:

- JobSentinel moves from "semantic similarity" to "show me the proof."

## Privacy-Preserving Source Intelligence Mesh

Optional community intelligence could improve source quality without collecting
private job-search data:

- source outage reports
- parser drift reports
- source pack version health
- aggregate salary-range presence
- aggregate duplicate cluster hints
- stale posting signals
- source policy changes

Strict boundary:

- no resumes
- no notes
- no identities
- no application history
- no raw imported pages
- no restricted-source session data

Why this is bigger:

- Users benefit from a maintained source ecosystem while keeping private data
  private.

## Career Strategy Simulator

Build a local simulator that lets users compare search strategies:

- apply to fewer stronger matches
- broaden titles
- lower or raise pay floor
- switch sources
- increase follow-up cadence
- change resume version
- emphasize adjacent role family
- try regional or remote-first lanes

Output:

- likely workload
- likely source noise
- expected evidence gaps
- risk of low-pay roles
- estimated application volume
- confidence and uncertainty

Why this is bigger:

- Users can test strategy before spending emotional energy and time.

## Candidate Data Rights Toolkit

V3 could make user ownership concrete:

- full local export
- readable backup bundle
- deletion report
- provider request receipts
- browser companion receipts
- source acknowledgement history
- safe support report
- migration report
- rollback report

Why this is bigger:

- Privacy is not only "we do not upload." It becomes visible user control and
  evidence.

## Multi-Device Without Cloud Ownership

Explore ways to support multiple devices without making JobSentinel a hosted
service:

- encrypted local backup to user-chosen storage
- LAN transfer
- QR-code pairing
- removable-drive export
- conflict review
- device-specific vault keys
- read-only mobile companion

Why this is bigger:

- Users can recover and move between machines while JobSentinel stays
  local-first.

## Global Career Access Layer

V3 can expand beyond United States tech-centric defaults:

- country and region source packs
- currency and pay-period normalization
- visa and work-authorization guidance by region
- public-sector and union job flows
- trades, healthcare, education, and retail source packs
- local language support
- culturally different resume and CV formats

Why this is bigger:

- JobSentinel becomes useful to more people and more kinds of job searches.

## Evidence Credential Wallet

Explore a local wallet for job-search evidence:

- certifications
- work samples
- portfolio links
- references checklist
- transcripts
- licenses
- security clearances without exposing sensitive details
- project summaries
- achievement metrics

Boundary:

- Store proof locally.
- Do not claim verification that JobSentinel has not performed.
- Do not expose sensitive documents without explicit user action.

Why this is bigger:

- Application packets become evidence-based and reusable.

## Hiring Web Observatory

Build a local observatory over the hiring web:

- ATS families
- source health
- salary transparency by source
- posting age and repost behavior
- duplicate clusters
- company career page patterns
- regional board coverage

Why this is bigger:

- JobSentinel can explain the job market around the user instead of showing a
  flat list of roles.

## Full Campaign Operating Model

Treat a job search as a campaign:

- campaign goals
- target lanes
- source budget
- weekly review
- outreach plan
- resume experiments
- application quality gates
- interview prep
- offer strategy
- outcome learning

Why this is bigger:

- The app moves from recordkeeping to campaign management while staying
  personal, local, and user-controlled.

## Frontier Cut Lines

These concepts should still be cut if they require:

- hidden restricted-source access
- credential or session capture
- final application submission without the user
- cloud telemetry by default
- private resume upload by default
- unsupported claims about hiring probability
- deceptive resume tactics
- platform-control evasion
