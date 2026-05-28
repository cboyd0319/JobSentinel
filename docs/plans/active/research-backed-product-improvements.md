# Research-backed product improvements

## Problem

JobSentinel already has search setup, scoring, resume matching, resume building,
ATS analysis, one-click apply, market intelligence, ghost detection, and
application tracking. The research notes in the three user-provided source files
show additional ways to make those features more useful, more honest, safer,
and easier for job seekers from many backgrounds.

This plan turns the research into a product improvement backlog. It is planning
only. No code changes are part of this goal.

## Source files

- `/Users/c/Downloads/job_seeker_behavior_research_papers.md`
- `/Users/c/Downloads/ats_bypass_automated_resume_screening_research.md`
- `/Users/c/Downloads/ghost_job_detection_research_and_guidance.md`

Primary-source spot checks were also done on 2026-05-28 for high-impact claims
from arXiv, IZA, ScienceDirect, NBER, HBS, Upturn, CEUR-WS, MDPI, Springer,
Columbia Law Review Forum, FTC, ResumeBuilder.com, and Clarify Capital. The
plan should still verify exact numbers again before implementation because
several sources are working papers, preprints, vendor surveys, or news reports.

## Scope

In scope:

- Product, UX, privacy, security, accessibility, and research-backed planning.
- Future implementation areas across dashboard, setup, scoring, resume,
  application tracking, one-click apply, market intelligence, scrapers, and
  docs.
- Legitimate ATS-aware optimization: accurate machine readability, truthful
  alignment, and human-readable applications.
- Local-first behavior and explicit user control.

Out of scope:

- Code changes during this research goal.
- Deceptive ATS bypass tactics, fabricated experience, hidden text, white-text
  keywords, prompt injection, CAPTCHA bypass, auto-submit, or terms-of-service
  evasion.
- External AI, cloud sync, contact upload, or social features unless a later
  product decision explicitly accepts the privacy tradeoff.
- Employer-side hiring decisions or automated employment decision tools.

## Success criteria

- A new active plan exists under `docs/plans/active/`.
- The plan incorporates all three research docs, not only the first job-seeker
  behavior document.
- The plan names concrete JobSentinel improvement paths across search,
  scoring, resume, ATS, ghost detection, applications, market intelligence,
  accessibility, privacy, and security.
- The plan flags unsafe or unethical "ATS bypass" paths as non-goals.
- The plan includes future file areas and verification commands.
- Current goal remains documentation and planning only.

## Audience and ease

- Primary user: any job seeker, including non-technical job seekers, career
  changers, disabled job seekers, employed job seekers, unemployed job seekers,
  and people applying outside software roles.
- Technical knowledge assumed: none in user-facing flows.
- Broad job-seeker fit: examples, defaults, and copy must cover healthcare,
  education, retail, operations, sales, finance, government, trades, creative
  work, technology, and service roles.
- Support or recovery path: every future feature should explain what changed,
  let users undo or edit it, and avoid presenting scores as objective truth.

## Research evidence map

| Source | Research signal | JobSentinel implication |
| ------ | --------------- | ----------------------- |
| Why Don't Jobseekers Search More? | Reducing the default effort needed to start applications raised applications sharply on a job platform; small search-cost reductions can matter. | Keep setup short, preserve skip paths, show first useful matches quickly, and reduce repeated effort in application workflows. |
| Duration Dependence and Job Search over the Spell | Activity-report data show search effort and callbacks change over time; callbacks decline over unemployment spells and effort can drop near key transitions. | Add weekly check-ins, fatigue-aware queues, refresh prompts, and "widen or narrow search" suggestions after quiet periods. |
| The Potential of Recommender Systems for Directing Job Search | The primary-source abstract supports a small job-finding effect and much higher application efficiency for recommended firms; recommendations still depend on user action. | Treat recommendations as invitations with next-step guidance, not hidden automation. Measure whether users act on recommendations. |
| The Accuracy of Job Seekers' Wage Expectations | Optimistic wage expectations can be linked to higher perceived but lower actual job-finding rates. | Make salary floors revisable, show missing-pay behavior clearly, and add non-judgmental market context. |
| Job Search with Commuting and Unemployment Insurance | Some job seekers accept lower wages over time and may search more locally rather than broaden commute distance. | Model commute, remote, schedule, and pay as separate tradeoffs. Do not assume users will accept longer commutes. |
| Jobseekers' Skills and Job Search Behaviour | Skill gaps and skill overlap shape search breadth, intensity, and outcomes. | Ask about adjacent roles, transferable skills, and skill gaps separately; avoid binary "qualified" labels. |
| Words Matter | Removing optional and superfluous qualifications increased applications by about 7%, but applicant composition changed in complex ways. | Split required, preferred, and nice-to-have qualifications; explain that missing preferred items should not automatically block applying. |
| Competitive Job Seekers | Competition can reduce peer sharing and referral information flow. | Track application channel quality, warm contacts, and referral opportunities without pressuring users to share private data. |
| Feedback, Confidence and Job Search Behavior | Feedback can affect search effort, especially for underconfident job seekers. | Show confidence-calibrating feedback that says what evidence supports a suggestion and what remains uncertain. |
| Online Buddies for Job Seekers | A digital buddy platform improved outcomes for some unemployed job seekers, especially long-term unemployed users. | Consider local accountability, reflection prompts, and shareable summaries before any networked peer feature. |
| Navigating Automated Hiring | Referrals and household income correlated with hiring success; keyword additions did not show the same outcome effect in the studied sample. | Do not oversell keyword tweaking. Add referral, recruiter, and application-channel tracking. |
| AI-Mediated Hiring and BLV Job Search | Blind and low-vision job seekers reported identity misrepresentation, dehumanizing automation, peer AI literacy, and strategic refusal. | Make resume and match assumptions editable, accessible, and explainable; support users who choose not to use some automated systems. |
| Let's Get You Hired | Job seekers valued actionable and trustworthy hiring explanations in a user-centered AI prototype. | Put plain "why this match" and "what to do next" explanations beside scores. |
| Resume2Vec, Smart-Hiring, JobMatchAI | Modern matching is moving toward semantic matching, embeddings, structured extraction, knowledge graphs, and explainable reranking. | Move beyond keyword counts, but keep explanations local, inspectable, and grounded in visible evidence. |
| AI Self-preferencing in Algorithmic Hiring | LLM evaluators may prefer resumes generated by the same model, creating a new unfair advantage. | Permit truthful AI-assisted editing only with guardrails; do not optimize for one hidden model or encourage model gaming. |
| Measuring Validity in LLM-based Resume Screening | Some LLM screeners did not reliably select more qualified resumes or abstain on ties. | Avoid claiming an ATS score predicts hiring success. Treat scores as rough preparation checks. |
| Resume prompt-injection research | Resume-borne instructions can manipulate LLM-based screeners; some attack types had high success rates. | Treat resumes and job descriptions as hostile input. Detect hidden text, anomalous instructions, and prompt-injection-like content. |
| Hidden Workers and Help Wanted | Automated hiring can exclude qualified workers through blunt filters, proxies, and automated rejections. | Warn users about brittle filters while helping them represent real skills clearly and truthfully. |
| Ghost Jobs, Columbia Law Review Forum | Ghost jobs can be real-company postings for roles that do not exist, are already filled, are paused, or have no present intent to hire; this differs from scam jobs. | Separate "ghost/stale risk" from "potential scam" and use cautious labels instead of accusing employers. |
| Why is it so hard to find a job now? Enter Ghost Jobs | A Glassdoor and LLM-BERT study estimates that up to 21% of ads may be ghost jobs, with stronger prevalence in specialized industries and larger firms. | Treat ghost detection as a major job-search friction signal, but verify before making user-facing statistical claims. |
| ResumeBuilder.com and Clarify Capital ghost-job surveys | Vendor surveys report employer-side fake or inactive posting behavior, long-open postings, pipeline collection, and seeker distrust. | Use as market-signal evidence only; build explainable heuristics and source labels rather than a hard classifier. |
| FTC job-scam guidance | Scams seek money or personal information and can look like ordinary online job ads. | Add scam-risk warnings for money requests, early sensitive data requests, fake checks, suspicious domains, and unrealistic pay. |

## Product improvement backlog

### 1. Guided setup and search intent

- Add a guided search intake that asks one short question at a time.
- Keep current custom-search path for users who know exact titles and terms.
- Let users mark answers as "must have", "prefer", or "avoid".
- Add "not sure" options for salary, title, location, commute, schedule, and
  adjacent roles.
- Add review-volume preference: few high-confidence jobs, balanced list, or
  broad discovery.
- Ask whether to show adjacent roles separately instead of mixing them into the
  main list.
- Let users import a resume for suggestions, but show extracted skills before
  they influence search.
- Add a plain summary before scanning starts: look for, show more, rank lower,
  do not hide unless, and alerts.
- Add periodic check-ins after quiet weeks: widen search, lower strictness,
  refresh sources, pause alerts, or keep current settings.

Likely files later:

- `src/pages/SetupWizard.tsx`
- `src/pages/SetupWizard.test.tsx`
- `src/hooks/useOnboarding.ts`
- `src-tauri/src/commands/config.rs`
- `src-tauri/src/core/config/types.rs`
- `docs/plans/active/guided-job-search-intake.md`
- `docs/style-guide/WRITING-FOR-JOB-SEEKERS.md`

### 2. Match scoring and explanations

- Split match explanation into visible factors: skills, title, pay, location,
  schedule, freshness, company preference, ghost risk, and user must-haves.
- Show what user input affected each factor.
- Add confidence labels such as "clear", "mixed", or "not enough information"
  instead of only a numeric score.
- Show "why apply anyway" when a job misses preferred items but meets
  must-haves.
- Show "why skip" when hard constraints fail or ghost risk is high.
- Keep hard filters separate from soft ranking so users can recover hidden
  jobs.
- Add ghost-adjusted ranking mode that lowers priority for suspicious jobs
  without deleting them.
- Add freshness urgency: flag jobs likely to close quickly based on posting age
  and source behavior.
- Add duplicate and repost explanation so users know whether they have seen the
  role before.
- Store explanation provenance so tests can prove no hidden score factor exists.

Likely files later:

- `src/components/ScoreBreakdownModal.tsx`
- `src/components/ScoreDisplay.tsx`
- `src/components/JobCard.tsx`
- `src/components/GhostIndicator.tsx`
- `src-tauri/src/core/scoring/mod.rs`
- `src-tauri/src/core/scoring/config.rs`
- `src-tauri/src/core/ghost/mod.rs`
- `src-tauri/src/core/db/types.rs`
- `docs/features/smart-scoring.md`
- `docs/features/ghost-detection.md`

### 3. Ghost job detection, source trust, and scam separation

- Reframe ghost detection as risk and freshness guidance, not a claim that
  JobSentinel knows employer intent.
- Distinguish these labels: fresh active posting, unverified third-party
  posting, possibly stale, likely evergreen or pipeline role, likely closed,
  high ghost risk, and potential scam.
- Track first seen, last seen, posted date, reposted date, date text changed,
  disappearance and return, and whether the same role exists on the company
  site.
- Add cross-source consistency checks across job boards, ATS sources, company
  career pages, recruiter listings, and cached or search-index traces where
  available.
- Prefer canonical employer or ATS pages over aggregator listings when sources
  conflict.
- Add a closed-role checker for saved jobs that revisits URLs and detects 404,
  removed, closed, expired, or "no longer accepting applications" pages.
- Add canonical job fingerprinting from normalized title, company, location,
  seniority, salary range, URL host, and description shingles.
- Detect reposts with highly similar content even when URLs change.
- Add description similarity through MinHash, shingles, or local embeddings
  before any heavier model choice.
- Track employer behavior locally: average posting age, repost frequency,
  percentage removed within 30/60/90 days, user-observed response rate,
  interview-to-application ratio, and vague evergreen-role share.
- Add job-content quality checks for vague responsibilities, missing team or
  reporting line, boilerplate-heavy text, talent-community language, unclear
  location, contradictory remote rules, and missing salary where expected.
- Add user verification workflow: check company page, review age and repost
  pattern, search exact title plus company, look for recent layoffs or freezes,
  find human signal, and message before deep tailoring.
- Add warning copy such as "Verify before spending serious time" for high-risk
  postings.
- Keep scam warnings separate from ghost risk. Scam signals should include
  requests for money, early sensitive data, suspicious domains, fake checks,
  unrealistic pay, or non-company communication.
- Preserve user feedback: mark real, stale, likely closed, evergreen, scam, or
  unsure, with undo.

Likely files later:

- `src/components/GhostIndicator.tsx`
- `src/components/JobCard.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Applications.tsx`
- `src-tauri/src/core/ghost/mod.rs`
- `src-tauri/src/core/db/ghost.rs`
- `src-tauri/src/core/db/types.rs`
- `src-tauri/src/core/scrapers/url_utils.rs`
- `src-tauri/src/core/import/fetcher.rs`
- `src-tauri/src/core/url_security.rs`
- `docs/features/ghost-detection.md`
- `docs/features/scraper-health.md`
- `docs/features/scrapers.md`

### 4. Salary, commute, location, and tradeoffs

- Replace one-way salary floor behavior with revisable pay preferences:
  minimum, target, "not sure", and "show jobs with missing pay".
- Explain when salary is listed, estimated, missing, or below target.
- Add commute and schedule constraints as separate fields from location.
- Add tradeoff review: lower pay but shorter commute, higher pay but longer
  commute, remote but lower confidence, or missing schedule.
- Add market-context prompts when many good jobs fail a pay or location rule.
- Avoid shaming language when a user's expectations may be above current local
  market signals.
- Add offer comparison prompts that include commute, schedule, benefits, and
  risk, not salary alone.

Likely files later:

- `src/pages/Salary.tsx`
- `src/pages/Settings.tsx`
- `src-tauri/src/core/salary/mod.rs`
- `src-tauri/src/core/salary/analyzer.rs`
- `src-tauri/src/core/salary/predictor.rs`
- `src-tauri/src/core/geo/mod.rs`
- `docs/features/salary-ai.md`
- `docs/features/remote-preference-scoring.md`

### 5. Resume and ATS-aware preparation

- Add parse-preview mode that shows what JobSentinel extracts from a resume:
  name, contact, titles, employers, dates, skills, education, certifications,
  gaps, and unknown fields.
- Add copyable plain-text export and parsed-text preview to verify that PDF or
  DOCX content is readable.
- Add format linting for tables, columns, graphics, icons, unusual headings,
  hidden text, empty text layers, and scan-only PDFs.
- Add warning when exported resume text differs meaningfully from preview.
- Add job-family resume variants so users can keep truthful tailored versions
  for different role types.
- Add evidence-backed edit suggestions: each suggested term must map to resume
  evidence or user-confirmed experience.
- Add required/preferred/nice-to-have grouping for job keywords.
- Add semantic-fit checks for synonyms and transferable skills, not only exact
  keyword matches.
- Add keyword-stuffing and hidden-text detection with plain warnings.
- Add "human read" review that catches machine-optimized but awkward bullets.
- Add bullet suggestions that preserve user facts and ask for confirmation
  before changing claims.
- Add "confidence in extraction" for skills and dates.
- Add support for non-technical skill taxonomies across healthcare, education,
  operations, sales, finance, legal, service, trades, creative, and government.

Likely files later:

- `src/pages/Resume.tsx`
- `src/pages/ResumeBuilder.tsx`
- `src/pages/ResumeOptimizer.tsx`
- `src/components/resume-builder/steps/*`
- `src/components/ResumeMatchScoreBreakdown.tsx`
- `src-tauri/src/core/resume/parser.rs`
- `src-tauri/src/core/resume/ats_analyzer.rs`
- `src-tauri/src/core/resume/export.rs`
- `src-tauri/src/core/resume/matcher.rs`
- `src-tauri/src/core/resume/skills.rs`
- `docs/features/resume-builder.md`
- `docs/features/resume-matcher.md`
- `docs/security/COMMAND_EXECUTION.md`

### 6. Application tracking, referrals, and channel quality

- Track application channel: cold apply, company site, referral, recruiter,
  hiring manager, staffing agency, career fair, internal transfer, or other.
- Track contact status without requiring network upload: contact name, role,
  permission to follow up, last outreach, next follow-up, and notes.
- Add "warm path available" prompt when user has a saved contact or previous
  company interaction.
- Add duplicate-application guard when the same company and role appears across
  job boards.
- Add source-quality badges for company site, aggregator, staffing agency,
  recruiter repost, and uncertain source.
- Record whether a submitted application came from a posting later marked
  stale, closed, evergreen, high ghost risk, or potential scam.
- Add follow-up templates that remain local and editable.
- Add application outcome analytics by source and channel so users can learn
  where effort pays off.
- Add fatigue-aware queues: apply today, research first, ask contact, revisit,
  or archive.
- Add "quiet period" prompts that help users decide whether to follow up,
  move on, or change search settings.

Likely files later:

- `src/pages/Applications.tsx`
- `src-tauri/src/core/ats/types.rs`
- `src-tauri/src/core/ats/tracker.rs`
- `src-tauri/src/core/ats/reminders.rs`
- `src/components/automation/ApplyButton.tsx`
- `src/components/automation/ApplicationPreview.tsx`
- `src-tauri/src/core/automation/mod.rs`
- `src-tauri/src/core/automation/form_filler.rs`
- `docs/features/application-tracking.md`
- `docs/features/one-click-apply.md`

### 7. Market intelligence and career transitions

- Add employer hiring velocity: roles posted, roles reposted, roles removed,
  age of postings, and likely active hiring signal.
- Add employer trust trend: posting freshness, company-site confirmation,
  response history, likely closed postings, and active-hiring confidence.
- Add staffing/intermediary visibility because some platforms route many
  applications through recruiters and staffing firms.
- Add adjacent-role explorer based on skill overlap, not only job title
  similarity.
- Add skill-gap paths with small next actions and local-only notes.
- Add career-transition suggestions that preserve user agency: "nearby role",
  "stretch role", "needs credential", or "different path".
- Add market warnings when a user's search is too narrow for current local
  posting volume.
- Add role-stability and demand trend views for users deciding whether to pivot.
- Add plain-language uncertainty when data is thin or scraped sources are biased
  toward some industries.

Likely files later:

- `src/pages/Market.tsx`
- `src/components/MarketSnapshotCard.tsx`
- `src/components/MarketAlertCard.tsx`
- `src-tauri/src/core/market_intelligence/*`
- `src-tauri/src/core/scrapers/*`
- `src-tauri/src/core/ml/*`
- `docs/features/market-intelligence.md`
- `docs/features/scrapers.md`

### 8. Accessibility, trust, and user control

- Make every score and recommendation inspectable, editable, and reversible.
- Add screen-reader and keyboard checks to every new guided flow.
- Support users who opt out of a resume upload, AI-assisted writing, or
  automated application filling.
- Avoid identity-flattening language such as "ATS says you are weak" or
  "unqualified".
- Add "what JobSentinel knows" and "what JobSentinel is guessing" sections for
  recommendations.
- Add local share summary for coaches, friends, workforce counselors, or peer
  support without exposing raw resume text by default.
- Add "strategic refusal" support: user can mark a company, platform, or
  assessment type as avoided and explain why for their own records.
- Add "verify first" paths for high ghost-risk postings so users can protect
  time without being told a job is fake.
- Add accessible resume-readability review in addition to ATS-readability
  review.

Likely files later:

- `src/components/*`
- `src/pages/*`
- `src/hooks/useAnnouncer.ts`
- `src/hooks/useKeyboardNavigation.ts`
- `docs/style-guide/README.md`
- `docs/style-guide/WRITING-FOR-JOB-SEEKERS.md`
- `docs/user/QUICK_START.md`

### 9. Privacy, safety, and anti-gaming guardrails

- Preserve local-first default for resumes, search settings, applications,
  contacts, notes, and extracted skills.
- Require explicit user configuration before any external AI, email, Slack,
  Discord, Teams, GitHub, Google Drive, or browser side effect.
- Treat resumes, cover letters, job descriptions, and imported job pages as
  untrusted input.
- Add prompt-injection-like text detection for resume and cover-letter content.
- Add hidden text, invisible Unicode, tiny text, white text, and metadata
  anomaly checks for documents.
- Separate extraction from evaluation: extracted facts should be structured and
  provenance-tagged before scoring.
- Never let candidate-provided text override scoring, parser, or assistant
  instructions.
- Add warnings against deceptive optimization when users paste suspicious
  content.
- Add potential-scam detection for imported jobs that request money, unusually
  early sensitive data, non-company communication, fake checks, suspicious
  domains, or unrealistic pay.
- Keep scam warnings conservative and actionable: verify the employer, do not
  pay, do not share sensitive information early, and report suspected scams
  through the appropriate channel.
- Add tests with malformed, adversarial, scan-only, and over-designed resumes.
- Keep human-in-the-loop submission for applications. Do not auto-submit.
- Preserve CAPTCHA pause and manual completion behavior.

Likely files later:

- `src-tauri/src/core/resume/parser.rs`
- `src-tauri/src/core/resume/ats_analyzer.rs`
- `src-tauri/src/core/automation/*`
- `src-tauri/src/core/url_security.rs`
- `src-tauri/src/commands/resume.rs`
- `src-tauri/src/commands/automation.rs`
- `docs/security/COMMAND_EXECUTION.md`
- `docs/security/URL_VALIDATION.md`
- `docs/features/one-click-apply.md`

### 10. Research and measurement harness

- Add an evidence register for product claims, separating peer-reviewed papers,
  working papers, preprints, vendor reports, and local observation.
- Add acceptance criteria for recommendation changes: explanation quality,
  user actionability, false-confidence avoidance, privacy, and accessibility.
- Add test fixtures for broad job families, not only software engineering.
- Add bloat sensors for unsafe ATS-bypass language such as hidden keywords,
  white text, fake credentials, prompt injection, and CAPTCHA bypass.
- Add bloat sensors for overconfident ghost-job copy such as "fake", "certain",
  or "scam" when the evidence only supports stale or unverified.
- Add docs checks that prevent score language from claiming hiring guarantees.
- Add manual review checklist for user-facing AI and ATS copy.

Likely files later:

- `docs/harness/sources.md`
- `docs/harness/verification-matrix.md`
- `docs/style-guide/GLOSSARY.md`
- `scripts/*`
- `tests/e2e/playwright/*`

## Prioritization

Do first:

- Guided setup strictness: must-have, prefer, avoid, not sure.
- Score explanations that show source inputs and uncertainty.
- Resume parse preview and format linting.
- Ghost detection labels, source verification, and scam separation.
- Application channel tracking and duplicate-application guard.
- Anti-gaming guardrails for hidden text, stuffing, and prompt injection.
- Accessibility checks for setup, resume, and score explanations.

Do next:

- Weekly search check-ins and fatigue-aware queues.
- Salary, commute, schedule, and missing-pay tradeoff review.
- Semantic matching improvements with visible evidence.
- Employer hiring velocity, trust trends, and source-quality badges.
- Local share summary for counselors or peer support.

Research before building:

- Networked peer-support features, because they can create privacy and safety
  risks.
- External AI rewriting, because resumes contain PII and model-specific
  optimization can be unfair or brittle.
- Any ranking change that hides jobs automatically, because false negatives can
  harm users.
- Company-site verification across protected or anti-bot sites, because
  scraping must respect rate limits, terms awareness, and user trust.
- Any fairness or demographic-proxy analysis, because JobSentinel should not
  ask for protected-class data without a clear user benefit and governance.

Do not build:

- Hidden keyword insertion.
- White-text or tiny-text keyword stuffing.
- Fabricated skills, employers, titles, dates, education, or credentials.
- Resume prompt injection.
- CAPTCHA bypass.
- Automated application submission.
- Opaque "beat the ATS" scoring that implies guaranteed hiring outcomes.
- Definitive "this employer is fake" labels from weak or indirect signals.

## Milestones

- [x] Review repo planning rules and docs-only verification requirements.
- [x] Review `/Users/c/Downloads/job_seeker_behavior_research_papers.md`.
- [x] Review `/Users/c/Downloads/ats_bypass_automated_resume_screening_research.md`.
- [x] Review `/Users/c/Downloads/ghost_job_detection_research_and_guidance.md`.
- [x] Spot-check primary sources for high-impact claims.
- [x] Create this active plan with a combined improvement backlog.
- [x] Run docs-only verification for this planning change.
- [ ] For the next implementation goal, choose one prioritized slice and write
  a feature-specific change contract before code edits.

## Verification

Current docs-only goal:

```bash
npm run harness:check
npm run lint:md
```

Future implementation slices should add targeted checks:

```bash
npm run lint
npm run test:run -- <focused test file>
npm run test:run
cd src-tauri && cargo fmt --all -- --check
cd src-tauri && cargo clippy -- -D warnings
cd src-tauri && cargo test --lib
```

UI slices also need keyboard, screen-reader, loading, empty, error, disabled,
and narrow-width review.

Resume, ATS, automation, or external-side-effect slices need security review
against:

- `docs/security/COMMAND_EXECUTION.md`
- `docs/security/URL_VALIDATION.md`
- `docs/features/one-click-apply.md`
- Human-in-the-loop submit behavior.
- Local-first data handling.

## Progress

| Date | Status | Notes |
| ---- | ------ | ----- |
| 2026-05-28 | Verified | Added plan to active repo docs and ran docs-only checks for the planning slice. |
| 2026-05-28 | Planned | Added ghost-job detection research and guidance: working definition, scam separation, source-verification workflow, freshness and repost signals, company-site mismatch, employer behavior, risk labels, and candidate-facing verification paths. |
| 2026-05-28 | Planned | Created combined research-backed product improvement plan from both user-provided research docs and primary-source spot checks. |

## Discoveries

- Existing `docs/plans/active/guided-job-search-intake.md` already captures a
  narrow setup-flow slice from the job-seeker behavior research. This plan
  keeps that work and expands scope across scoring, resume, ATS, applications,
  market intelligence, accessibility, and security.
- The local job-seeker research document says the recommender paper increased
  match likelihood by 18%. The primary-source abstract checked during this pass
  supports a 1% increase in short-term job finding and 2.7x higher application
  efficiency for recommended firms. Re-verify the 18% figure before repeating
  it in user-facing or decision docs.
- "ATS bypass" should be reframed as accurate machine readability and truthful
  application alignment. Trick-based tactics create ethics, security, and user
  trust risk.
- Several ATS/LLM screening sources are preprints or system papers. Treat them
  as useful signals, not settled evidence.
- Ghost jobs and scam jobs are different problems. A real employer can have a
  stale, paused, evergreen, or non-active posting; a scam posting is malicious
  and usually tries to obtain money, credentials, identity data, or labor.
- Candidate-facing ghost detection has limited rigorous public research. The
  Hunter Ng paper is directly relevant but still a preprint; vendor surveys are
  useful market signals but should not be treated as peer-reviewed evidence.
- Current `docs/features/ghost-detection.md` uses stronger copy such as "fake"
  and "real jobs only" than this research-backed plan recommends. Future
  implementation should soften labels toward stale, unverified, likely closed,
  evergreen, high risk, and potential scam.

## Decisions

- Use one combined active plan instead of separate behavior and ATS plans so
  implementation priorities can be compared in one backlog.
- Preserve local-first defaults and human-in-the-loop application submission as
  non-negotiable constraints.
- Treat scores as estimates with visible evidence, not verdicts.
- Treat ghost scores as source-confidence and freshness estimates, not claims
  that JobSentinel knows employer intent.
- Prefer narrow future implementation slices with their own change contracts.

## Outcomes

- Combined product backlog exists for job-seeker behavior, ATS-aware resume
  preparation, and ghost-job research.
- Docs-only verification is complete for this planning slice.

## Handoff

- Current state: plan updated with three source documents and verified as an
  active planning artifact.
- Evidence: source documents and selected primary sources reviewed on
  2026-05-28.
- Next step: choose a first implementation slice and write a feature-specific
  change contract before code edits.
- Open risks: exact source statistics need re-check before product copy or
  implementation claims; this plan does not prove feasibility of every listed
  feature.
