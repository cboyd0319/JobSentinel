# Moonshots And Refactors

This file is the "think bigger" lane. These ideas may be too large for a minor
release and may require replacing major parts of the current app shape. They
belong in v3 planning because v3 is allowed to be a major refactor when the
payoff is large enough.

The refactor ceiling is high, but the foundation is not up for replacement:
Rust remains the base runtime and local trust boundary for JobSentinel.

## Full Refactor Options

### Case-File First App

Current risk:

- Screens can feel like separate tools: jobs, resumes, applications, salary,
  settings, source checks.

Refactor idea:

- Make the opportunity case file the primary app primitive.
- Every job, application, resume comparison, interview, offer, source event, and
  browser import attaches to a case file.
- The dashboard becomes a queue of case files and next actions.

Why it could be worth it:

- Users care about "What should I do with this opportunity?" more than which
  module owns the data.
- Agents can operate on one bounded case file.
- Privacy receipts and audit trails become easier to explain.

### Event-Sourced Job Search

Current risk:

- Tracking state can become hard to explain when many features write summaries.

Refactor idea:

- Store user-approved job-search events as the source of truth.
- Derive dashboard state, tracker state, source yield, learning features, and
  weekly review from the event ledger.

Why it could be worth it:

- Better auditability.
- Better local feedback learning.
- Better undo, import review, and support diagnostics.
- Easier outcome analysis across sources, resumes, and application strategies.

### Pack-Driven Platform

Current risk:

- Source, taxonomy, skill, and model knowledge can grow too large for core code.

Refactor idea:

- Move sources, role taxonomies, interview rubrics, resume rubrics, prompts,
  model profiles, and source fixtures into signed packs.
- Core JobSentinel becomes the secure local runtime and review shell.

Why it could be worth it:

- Community can expand careers and regions.
- JobSentinel can support many job markets without a giant monolith.
- Packs can be verified, disabled, updated, and audited independently.

### Local Runtime Kernel

Current risk:

- ML, browser import, external AI, application assist, source checks, and skills
  can evolve as separate orchestration paths.

Refactor idea:

- Create a local runtime kernel that executes typed jobs: source check, visible
  browser import, resume parse, match evaluation, agent skill, export, backup,
  provider call.
- Every job has privacy labels, inputs, outputs, progress, cancel, retries,
  audit trail, and diagnostics.
- Implement the kernel in Rust, with UI, browser companion, MCP, and external
  providers calling into typed Rust commands.

Why it could be worth it:

- One mental model for users and developers.
- Stronger privacy and security consistency.
- Better background work, progress display, and recovery.

### Graph-Native Storage

Current risk:

- Tables are good for records, but weak for explaining relationships between
  roles, skills, evidence, companies, sources, contacts, and outcomes.

Refactor idea:

- Keep SQLite as the local store, but add graph-shaped tables and query helpers.
- Store typed edges: job requires skill, resume proves skill, company uses ATS,
  source found job, application used resume, contact belongs to company, offer
  changed salary floor.

Why it could be worth it:

- Better explanation.
- Better recommendations.
- Better role transition planning.
- Better hard-negative mining.

## Research-Driven Product Moonshots

### Candidate-Side Matching Lab

Build JobSentinel around a local matching lab:

- ConFit-style hard-negative mining.
- Qwen3 embedding as the default local retrieval backbone.
- Qwen3 reranking as the bounded evidence judge for top candidates.
- Qwen3 reranker calibration and future fine-tuning by query type.
- Requirement-level evidence classes.
- Fairness counterfactuals.
- Prompt-injection and hidden-text defenses.
- Self-preference checks for model-edited resumes.
- Diagnostics that expose dense, lexical, skill, reranker, blocker, and
  provenance signals.

Outcome:

- JobSentinel becomes one of the few candidate-side products that can prove
  matching quality with local evals instead of vague percentages.

### Hiring-System Transparency Simulator

Create a synthetic hiring-system simulator for users:

- Run a resume through multiple parser and screening-style scenarios.
- Show which information is readable, missing, over-weighted, or risky.
- Test job-specific versions against adversarial and brittle parsers.
- Never claim to know a real employer's internal model.

Outcome:

- Users can understand application readability and evidence strength without
  being misled into "beat the ATS" folklore.

### Local Career Digital Twin

Create a local model of the user's career evidence:

- roles
- skills
- proof
- achievements
- constraints
- preferences
- source outcomes
- application outcomes
- pay floor
- future role targets

Outcome:

- The app can explain what roles are realistic now, what roles are stretch
  targets, what evidence is missing, and which search lanes are worth trying.

### Outcome-Learning Engine

Use the user's local history to learn:

- which sources create interviews
- which resumes perform better
- which role titles are better targets
- which salary ranges are realistic
- which application styles waste time
- which follow-up cadences help

Outcome:

- JobSentinel improves from the user's own outcomes without central telemetry.

### Privacy-Preserving Community Intelligence

Explore optional community signals that never include resumes, notes,
identities, application history, or raw job-search text:

- source health
- broken parser reports
- duplicate posting clusters
- stale-source warnings
- salary-range availability
- source pack quality

Outcome:

- Users benefit from community maintenance without sacrificing private data.

### Job-Market Strategy Simulator

Let users test strategies before spending a week applying:

- source mix
- target titles
- remote/on-site range
- salary floor
- stretch versus safe roles
- resume version
- follow-up cadence

Outcome:

- The user can see likely workload and risk tradeoffs before committing time.

## Browser And Automation Moonshots

### Application Cockpit

Build a mode where the browser page, case file, resume evidence, form helper,
risk review, and tracker all sit in one workspace.

User sees:

- source page
- local case file
- application packet
- field suggestions
- pay and risk warnings
- "Log applied" and follow-up controls

JobSentinel does:

- capture visible user-approved information
- prepare local suggestions
- record local events
- never press final submit

### Universal Visible-Page Import

Build a robust importer for any page the user is viewing:

- text extraction
- schema.org and JSON-LD extraction
- visible card detection
- job detail detection
- duplicate detection
- token scrubbing
- review queue

The goal is to make unsupported sources still useful.

### User-Controlled Watch Mode

A visible mode that records only local JobSentinel actions and approved visible
imports while the user browses.

Rules:

- visibly on
- always local
- delete controls
- no hidden page reads
- no cookies or browser storage
- no network traffic
- no final submit

Outcome:

- JobSentinel learns intent and interest without becoming a hidden scraper.

## Platform Moonshots

### Local MCP Server

Expose scoped local tools for approved agent clients:

- create draft job
- inspect selected case file
- run a skill
- create reminder
- export safe report
- open JobSentinel view

The server is disabled by default, loopback only, paired, scoped, logged, and
revocable.

### JobSentinel CLI

Build a CLI for power users and automation tests:

- source doctor
- model doctor
- privacy doctor
- match debug
- import file
- export safe report
- run eval
- verify packs

The UI remains the main product for nontechnical users.

### Mobile Companion Without Cloud Lock-In

A small companion for reminders, quick notes, interview prep, and QR-code local
pairing. It should not require hosted sync by default.

### Signed Community Pack Registry

A registry for source packs, skill packs, role packs, and rubric packs:

- signed manifests
- checksums
- fixture results
- source policy notes
- privacy labels
- version compatibility
- local install review

## "Nothing Is Off The Table" Questions

- Should v3 split the app into a local runtime daemon plus UI shell?
- If v3 splits into a local runtime daemon plus UI shell, which Rust contracts
  become stable public interfaces?
- Should all source adapters move to signed packs?
- Should the browser companion become the primary import path?
- Should model downloads become part of onboarding for capable machines?
- Should the dashboard be rebuilt around mission cards and case files?
- Should the application tracker become event-derived instead of state-first?
- Should Qwen3 reranker fine-tuning become a first-class local advanced feature?
- Should JobSentinel publish a public eval benchmark for candidate-side job
  matching?
- Should v3 include a local MCP server and CLI as first-class product surfaces?
- Should docs, source manifests, privacy labels, and feature contracts generate
  user-facing help automatically?
