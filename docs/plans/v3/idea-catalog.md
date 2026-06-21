# V3 Idea Catalog

This catalog is intentionally broad. Some ideas are near-term product work.
Others are moonshots that may need dedicated research, prototypes, or a later
major release. Keep ideas here until they are either cut, moved to an exec
plan, or converted into a maintained feature doc.

## Daily Command Center

- First-run "get me to value" flow that creates a useful search, imports or
  builds one resume path, and shows the first review queue without expert setup.
- Daily mission board that turns the job search into three to seven concrete
  actions: review new roles, follow up, tailor one resume, practice interview
  story, or update a source lane.
- Weekly review that shows source yield, application quality, interview rate,
  follow-up health, stale roles, and pay floor misses.
- Fatigue-aware pacing that helps users avoid low-value mass applying when
  tracker evidence shows poor returns.
- Campaign simulator that compares "apply fewer stronger matches," "broaden
  title," "change region," "lower commute burden," and "shift sources" before
  the user spends another week on a weak lane.
- Search lane health with stop rules for weak sources, weak titles, poor
  geography, low pay, or high ghost-job rates.
- Application runway view that shows how many strong, medium, and weak
  opportunities are in flight.
- "What changed since yesterday" summary across saved searches, tracked jobs,
  source failures, interviews, offers, and reminders.
- Smart inbox for job-search tasks, not email. Every task has source, evidence,
  due date, confidence, and next action.
- Low-pressure mode for users who are overwhelmed, with fewer choices and more
  defaults.

## Opportunity Case Files

- One case file per job with posting details, company facts, source history,
  risk, fit, resume evidence, application state, contacts, notes, follow-ups,
  interviews, offer details, and outcome.
- Timeline of every local event: discovered, viewed, saved, imported, applied,
  followed up, interview, offer, rejected, closed, stale, withdrawn.
- Evidence wall that links requirements to resume bullets, projects, skills,
  certifications, and gaps.
- Decision summary that says apply, maybe, skip, or research more, with reasons.
- "Why not this job?" panel for blockers such as salary, location, clearance,
  seniority mismatch, weak posting, source risk, or missing evidence.
- Duplicate and repost lineage that shows whether a role is new, reposted,
  relabeled, merged, or stale.
- Company relationship view showing previous applications, contacts, interviews,
  outcomes, source reliability, and role families.

## Job Discovery And Source Coverage

- Source graph covering official APIs, ATS tenants, employer career pages,
  public boards, regional boards, public-sector portals, professional
  associations, staffing sites, and user-opened pages.
- Employer-career crawler that classifies a company careers URL before choosing
  a safe source path.
- ATS tenant discovery for Greenhouse, Lever, Ashby, SmartRecruiters, Workday,
  iCIMS, Jobvite, Phenom, Oracle, Taleo, SAP SuccessFactors, Radancy, and
  long-tail platforms.
- Public structured-data reader for schema.org JobPosting, JSON-LD, microdata,
  RSS, Atom, sitemap, and public search result pages where allowed.
- Regional source packs for the United States, Canada, United Kingdom, India,
  European Union, Australia, remote-first boards, public sector, healthcare,
  trades, nonprofits, and universities.
- Role-family source packs for security, software, content, marketing, sales,
  operations, finance, healthcare, education, public sector, trades, and retail.
- Source coverage map that shows what JobSentinel can check natively, what
  needs Browser Import, and what is still under review.
- Source reliability score based on last successful run, parse confidence,
  rate-limit behavior, duplicates, stale postings, salary coverage, and user
  outcomes.
- Company watchlists that monitor official careers pages and ATS boards for
  target employers.
- Regional readiness framework for UK, EU, and India starter packs, including
  source manifests, pay formats, location formats, occupation taxonomies, and
  CV profiles.
- Source simulator that replays fixtures, parser drift, risk warnings, and
  review queues before a source or regional pack can ship.

## Browser Companion And Capture

- Browser extension or companion side panel with Save, Import visible jobs, Log
  applied, Track, Not interested, Reminder, Note, Compare resume, and Check risk.
- Local overlay that marks visible job cards with fit, risk, pay, duplicate,
  already-seen, and source cues after user enables it.
- User-approved visible-page capture for job cards and job detail pages without
  reading cookies, browser storage, hidden page state, network traffic, or
  background tabs.
- Smart paste that turns copied job text, links, and screenshots selected by the
  user into reviewable local suggestions.
- OCR-assisted visible import for rendered job cards, screenshots, and PDFs the
  user explicitly selects, with source provenance and review before storage.
- "I just applied" capture that creates a draft application record with missing
  fields marked for later cleanup.
- Visible learning mode that records only JobSentinel-side actions and
  user-approved imports, then suggests preferences with an off switch and delete
  action.
- Cross-browser support strategy for Chrome, Edge, Firefox, Safari, and a
  fallback bookmarklet.
- Secure loopback pairing with local approval, rotating tokens, explicit
  extension permissions, and no broad local database access.

## Resume, Profile, And Application Packets

- Application packet builder that creates a reviewed bundle: target resume,
  cover note, screening answers, work samples, references checklist, salary
  floor, and questions to ask.
- Resume evidence graph that stores bullets, projects, achievements,
  certifications, tools, metrics, role context, dates, and source resume version.
- Requirement-by-requirement review that maps direct evidence, partial evidence,
  missing evidence, and unsupported keyword edits.
- ATS readability lab that previews how PDF, DOCX, Markdown, and JSON Resume
  versions parse across common ATS patterns.
- Regional CV profiles for U.S. resumes, UK CVs, Europass CVs, India-focused
  profiles, public-sector applications, academic CVs, apprenticeships, and
  trades.
- Resume variant manager that tracks which version was used for which job and
  what happened afterward.
- Bullet repair workspace that improves clarity, impact, and truthfulness
  without inventing claims.
- Screening answer bank with exact-question provenance, reviewed answers, and
  protected/voluntary question guidance.
- Application form rehearsal that fills a local mock form before opening the
  real site.
- Attachment checklist that verifies file names, formats, resume version, cover
  letter, portfolio links, and role-specific extras.

## Matching, Ranking, And Learning

- Requirement-level matching where every hard and preferred requirement has an
  evidence class, blocker state, and explanation.
- Qwen3 reranker fine-tuning path using user-labeled hard negatives and eval
  sets once enough labels exist.
- Learning-to-rank layer over dense score, reranker score, BM25, exact skill,
  salary, location, seniority, source, and user feedback features.
- Preference profiles for safe, stretch, pay-first, remote-first, commute-safe,
  mission-driven, and rapid-apply modes.
- "Why did this not match?" diagnosis for missing requirements and weak
  evidence.
- Counterfactual fairness tests for ranking stability when nonessential names,
  schools, dates, or gap phrasing change.
- Prompt-injection and adversarial posting detection before any local or
  external model sees job text.
- Model diagnostics that show cache status, model revision, backend, dimension,
  latency, fallback state, and scoring provenance.
- OS-native micro-assist for bounded tasks such as short summaries, extraction,
  accessibility-friendly explanations, and command suggestions when the
  platform provides local models.
- Regional matching tests so multilingual and local-market terminology does not
  collapse into U.S.-centric title and skill assumptions.

## Agentic Workflows

- Local skill runner for JobSentinel Agent Skills with explicit inputs,
  outputs, approvals, and privacy labels.
- Agent roles for planner, source analyst, resume evidence reviewer,
  application packet builder, interview coach, negotiation analyst, and privacy
  reviewer.
- Human-in-the-loop task plans where the agent proposes steps, the user approves
  each external action, and JobSentinel records a local audit trail.
- "Prepare this job" action that drafts a full case-file workup without sending
  private data outside the device.
- "Replan from tracker" action that changes search lanes based on actual
  outcomes.
- Local MCP server so approved tools can query limited JobSentinel data through
  scoped, revocable permissions.
- Provider routing that can use local models first, then optional external AI
  only after preview and approval.
- Agent failure mode view that explains missing inputs, low confidence, blocked
  actions, and what the user must decide.

## Interview And Offer Workflows

- Interview room that turns the job, resume evidence, and company research into
  recruiter, hiring-manager, panel, work-sample, and behavioral prep modes.
- Story bank with situation, action, result, scope, leadership, evidence, and
  risk notes.
- Mock interview mode with local scoring, pause, retry, and concise coaching.
- Work-sample planner that extracts likely exercises and preparation checklists.
- Offer cockpit comparing written offer, verbal claims, bonus, equity, benefits,
  commute, relocation, visa constraints, deadline pressure, and pay floor.
- Negotiation packet with facts, target ask, fallback ask, questions, risk, and
  decline script.
- Post-interview debrief that records questions asked, concerns, promised next
  steps, follow-up deadline, and signal strength.

## Privacy, Security, And Trust

- Privacy receipt for every sensitive workflow: what data was used, what stayed
  local, what left the device, and why.
- Privacy doctor that checks telemetry off, external AI state, local model
  cache, browser companion permissions, vault status, backup status, and source
  warnings.
- Encrypted backup and restore with user-held recovery material and clear data
  loss warnings.
- Multi-profile vaults for separate users, separate job searches, or career
  transitions without cross-profile leakage.
- Safe support bundle that can reproduce settings and source health without
  private resume text, notes, secrets, or browser data.
- Extension security dashboard showing connected browser extensions, granted
  permissions, last activity, and revoke controls.
- Local policy ledger for source warnings, acknowledgement versions, source
  classes, rate limits, and restricted-domain rationale.

## Ecosystem And Distribution

- One clear download chooser that recommends the right package by platform and
  computer capability in plain language.
- One-click update, rollback, and repair flows where signing credentials and
  platform rules allow it.
- First-run doctor that checks vault, storage, permissions, browser companion,
  model state, and source connectivity without exposing private data.
- JobSentinel source-pack marketplace with signed community packs, fixtures,
  source policy metadata, and review status.
- Content-addressed pack registry with signed manifests, compatibility ranges,
  privacy labels, self-tests, quarantine, and safe uninstall.
- Role-pack marketplace with taxonomies, search lanes, resume rubrics,
  interview rubrics, and source recommendations for specific careers.
- Downloadable skill packs that stay compatible with the Agent Skills spec and
  JobSentinel privacy labels.
- Local API and CLI for power users, with safe defaults and explicit scope
  grants.
- Wiki-quality docs generated from feature contracts, source contracts, and
  privacy labels.
- Import bridges for JSON Resume, browser bookmarks, CSV trackers, calendars,
  email reminders, and local notes apps.
- Export package for moving away from JobSentinel without lock-in.
- JobSentinel Essentials package for modest hardware, with small install size,
  deterministic scoring, no large model download by default, and clear upgrade
  path to stronger local matching.
- Storage cleanup center for model packs, source caches, browser companion
  logs, old exports, and stale vectors.

## Accessibility, Global, And Nontechnical Modes

- Plain-language setup that starts with "What job are you trying to find?" not
  "Configure sources."
- Accessibility-first UI checks for keyboard, screen reader, contrast, reduced
  motion, zoom, and stress-friendly density.
- Regional work-mode vocabulary, currency, salary period, visa, relocation, and
  public-sector rules.
- Starter UK, EU, and India setup choices that clearly label incomplete region
  coverage while still improving pay parsing, source suggestions, CV profiles,
  and occupational terminology.
- Career-change mode that values adjacent evidence and explains stretch gaps.
- Returnship, caregiver, veteran, early-career, long-term unemployment,
  disability-aware, trades, and public-sector planning modes.
- Mobile companion for reminders, quick notes, and interview prep without moving
  the database to a cloud service by default.

## Hardware And Access Equity

- Essentials package that keeps job-search help useful on older laptops and
  lower-memory machines.
- Offline-first mode for users with unstable internet after source checks or
  imports are complete.
- Data-saver source mode that fetches fewer pages, runs fewer concurrent checks,
  and prioritizes official feeds.
- Battery-friendly mode for laptops.
- Shared-computer privacy mode with faster lock, minimal recent-file display,
  and clearer local-data location controls.
- Plain upgrade path from Essentials to stronger local ML without reinstalling.
