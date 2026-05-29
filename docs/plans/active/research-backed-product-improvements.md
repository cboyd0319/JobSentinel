# Research-backed product improvements

## Problem

JobSentinel already has search setup, scoring, resume matching, resume building,
ATS analysis, Application Assist, market intelligence, ghost detection, and
application tracking. The research notes in the six user-provided source files
show additional ways to make those features more useful, more honest, safer,
and easier for job seekers from many backgrounds.

This plan turns the research into a product improvement backlog and tracks
narrow implementation slices chosen from that backlog.

## Source files

- `/Users/c/Downloads/job_seeker_behavior_research_papers.md`
- Local ATS transparency and automated-resume-screening research notes from
  `/Users/c/Downloads/`
- `/Users/c/Downloads/ghost_job_detection_research_and_guidance.md`
- `/Users/c/Downloads/job_site_web_scraping_research_and_guidance.md`
- `/Users/c/Downloads/In Salary Negotiations, Women Do Ask - PON - Program on Negotiation at Harvard Law School.pdf`
- `/Users/c/Downloads/pay_equity_higher_pay_women_people_of_color.md`

Primary-source spot checks were also done on 2026-05-28 for high-impact claims
from arXiv, IZA, ScienceDirect, NBER, HBS, Upturn, CEUR-WS, MDPI, Springer,
Columbia Law Review Forum, FTC, ResumeBuilder.com, Clarify Capital, IETF RFC
9309, Greenhouse, Lever, Ashby, SmartRecruiters, LinkedIn, Indeed, Pew Research
Center, Harvard Gender Action Portal, HBR, UC Berkeley, NWLC, arXiv salary
history and AI-salary-advice papers, and the Harvard Program on Negotiation PDF.
The plan should still verify exact numbers again before implementation because
several sources are working papers, preprints, vendor surveys, news reports,
terms pages, legal summaries, or fast-changing policy references.

Second-pass coverage on 2026-05-28 found 52 unique URLs across the three source
files. Forty-five sources were downloaded or extracted with enough text for
local review. Seven sources were blocked by publisher or paywall responses
during direct download: ACM TIST fairness survey, MDPI Resume2Vec page, four
ScienceDirect pages, and the Wall Street Journal ghost-jobs article. The ACM
fairness survey was reviewed through an author-hosted PDF copy. Blocked sources
still need source-level verification before exact statistics or legal claims
are repeated in user-facing product copy.

The scraping guidance is scoped only to JobSentinel as a local-first application
for a single job seeker. It is not a full job-site scraper, public job board,
commercial aggregation API, or AI training data collector. That single-user
scope lowers scale and redistribution risk, but it does not remove source terms,
robots.txt, privacy, copyright, access-control, or jurisdiction-specific legal
constraints. Future implementation must treat terms, robots, and source
permission as product constraints, not as obstacles to route around.

The added scraping source contained 33 unique URLs. Spot checks were done
against RFC 9309, Greenhouse Job Board API, Lever Postings API, Ashby Job
Postings API, SmartRecruiters Posting API, LinkedIn prohibited-software
guidance, and Indeed terms. The salary-negotiation PDF was extracted locally
with `pypdf`; Poppler text tools were not installed in this environment.

The added pay-equity source contained 35 unique URLs. Spot checks were done
against Pew 2025 gender pay gap data, Harvard GAP negotiation-ambiguity
research, HBR and UC Berkeley summaries of women asking but receiving worse
outcomes, NWLC pay-range transparency guidance, and arXiv papers on salary
history bans and AI salary-advice bias. PubMed and APA direct pages for
`Bargaining while Black` were blocked by browser checks, so race-and-negotiation
claims need source-level re-verification before exact wording ships.

## Scope

In scope:

- Product, UX, privacy, security, accessibility, implementation planning, and
  focused implementation slices backed by research.
- Implementation areas across dashboard, setup, scoring, resume,
  application tracking, Application Assist, market intelligence, scrapers, and
  docs.
- Legitimate ATS-aware optimization: accurate machine readability, truthful
  alignment, and human-readable applications.
- Local-first behavior and explicit user control.
- Single-user, low-volume, local job-source monitoring for the user's saved
  searches, company watchlists, and imported job URLs.
- API-first and company-source-first collection where public ATS feeds or
  allowed employer pages support it.

Out of scope:

- Broad feature rewrites without a feature-specific change contract, focused
  tests, docs updates, and rollback notes.
- Deceptive resume tactics, fabricated experience, hidden text, white-text
  keywords, prompt injection, unreviewed application sending, or
  terms-of-service evasion.
- External AI, cloud sync, contact upload, or social features unless a later
  product decision explicitly accepts the privacy tradeoff.
- Employer-side hiring decisions, candidate ranking for employers, or automated
  employment decision tools.
- Public job-board operation, broad commercial aggregation, resale,
  redistribution, or AI training datasets.
- Candidate-profile, recruiter-profile, employee-list, social-graph,
  authenticated-content, or login-only data collection.
- Solving CAPTCHAs, crossing paywalls, ignoring blocks, ignoring rate limits,
  ignoring robots directives, or defeating other technical access controls.
- Proxy networks, IP rotation, session-cookie reuse, or any anti-bot evasion.
- Legal, financial, or compensation claims that have not been re-verified from
  current primary or authoritative sources before user-facing release.

## Success criteria

- A new active plan exists under `docs/plans/active/`.
- The plan incorporates all six research docs, not only the first job-seeker
  behavior document.
- The plan names concrete JobSentinel improvement paths across search,
  scoring, resume, ATS, ghost detection, applications, market intelligence,
  accessibility, privacy, and security.
- The plan flags unsafe or unethical ATS manipulation paths as non-goals.
- The plan includes file areas, verification commands, and change-contract
  requirements for implementation slices.
- Active implementation slices update user-facing docs and tests before they
  are committed.

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

## Product north star

JobSentinel should protect job seekers' time, dignity, money, and private data.
The product should help users avoid wasted effort, underpayment, opaque
channels, stale postings, and shame-based search loops. Tone should be
protective and factual, not motivational theater.

First-class product requirements:

- Ghost-job and stale-posting detection is central. Prioritize first-seen and
  last-seen tracking, company-site or ATS verification, repost detection,
  closure checks, source-quality labels, and "verify before tailoring" warnings
  so users do not spend an hour on low-trust postings.
- Pay equity is core product behavior. Prioritize salary floor filters, range
  quality scoring, pay transparency signals, salary-history guardrails,
  under-anchoring warnings, under-leveling checks, and negotiation prep that
  helps users avoid being underpaid.
- Long-term unemployment needs explicit support. Add pacing, weekly progress
  summaries, fresh-role queues, quiet-period prompts, reactivation strategies,
  callback-rate context, and resume framing for gaps without shame.
- Bias-aware application strategy matters. Help users spend more time on
  verifiable routes: referrals, recruiter contact, hiring-manager signals,
  direct company or ATS postings, warm paths, and roles with clear evidence of
  active hiring.
- Protective tone wins over cheerleading. Prefer copy like "This posting may
  be stale", "This salary is below your floor", "This company has low response
  history", "This role conflicts with your constraints", or "This one is
  worth tailoring" over generic encouragement.
- Privacy-first is ethical infrastructure. Keep job history, salary floors,
  resume versions, application notes, contacts, and search constraints local by
  default; require explicit user choice before any external channel or service.

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
| Measuring Validity in LLM-based Resume Screening | Some LLM screeners did not reliably select more qualified resumes or abstain on ties. | Avoid claiming a screening score predicts hiring success. Treat scores as rough preparation checks. |
| Resume prompt-injection research | Resume-borne instructions can manipulate LLM-based screeners; some attack types had high success rates. | Treat resumes and job descriptions as hostile input. Detect hidden text, anomalous instructions, and prompt-injection-like content. |
| Hidden Workers and Help Wanted | Automated hiring can exclude qualified workers through blunt filters, proxies, and automated rejections. | Warn users about brittle filters while helping them represent real skills clearly and truthfully. |
| Application Flows | Many applications arrive soon after posting, open periods can be short, and staffing or intermediary firms can dominate platform flow. | Add fresh-post urgency, source-type labels, and channel analytics so users can spend effort where it is likelier to matter. |
| The Cyclicality of On-the-Job Search | Employed job seekers behave differently from unemployed job seekers and may search for ladder moves rather than emergency replacement. | Add confidential employed-search mode and avoid unemployed-only assumptions in pacing, alerts, and copy. |
| Minimum Wage Laws and Low-Skilled Job Search | Search behavior for low-wage and low-skilled work can move differently from higher-wage markets. | Keep non-degree, hourly, service, retail, trades, and entry-level workflows first-class, not edge cases. |
| JobHop | Large-scale resume trajectories can support career-transition, career-break, and role-stability analysis. | Build career-transition suggestions around observed paths and gaps, not title matching alone. |
| Fairness and Bias in Algorithmic Hiring | Bias can enter sourcing, screening, interview, and selection through proxies, data gaps, automation bias, accessibility barriers, and job-description wording. | Avoid importing protected proxies, expose uncertainty, and audit user-facing scoring language across the full workflow. |
| Local Law 144 audit research | Required audit metrics can miss distributional or practical bias issues. | Do not imply legal compliance from simple score checks; keep an evidence register and jurisdiction-aware disclosure tracker. |
| PopResume and VLM fairness research | Visual and demographic proxy cues can affect resume screening fairness. | Warn against photo-heavy or image-only resumes and keep resume analysis text-first and provenance-backed. |
| Ghost Jobs, Columbia Law Review Forum | Ghost jobs can be real-company postings for roles that do not exist, are already filled, are paused, or have no present intent to hire; this differs from scam jobs. | Separate "ghost/stale risk" from "potential scam" and use cautious labels instead of accusing employers. |
| Why is it so hard to find a job now? Enter Ghost Jobs | A Glassdoor and LLM-BERT study estimates that up to 21% of ads may be ghost jobs, with stronger prevalence in specialized industries and larger firms. | Treat ghost detection as a major job-search friction signal, but verify before making user-facing statistical claims. |
| ResumeBuilder.com and Clarify Capital ghost-job surveys | Vendor surveys report employer-side fake or inactive posting behavior, long-open postings, pipeline collection, and seeker distrust. | Use as market-signal evidence only; build explainable heuristics and source labels rather than a hard classifier. |
| Business Insider and Revelio ghost-job reporting | Fill-rate and job-removal patterns can worsen during slow hiring, freezes, or uncertainty, not only deliberate deception. | Distinguish "likely stale", "slow hiring", "hiring freeze", and "no present intent" when evidence allows. |
| FTC job-scam guidance | Scams seek money or personal information and can look like ordinary online job ads. | Add scam-risk warnings for money requests, early sensitive data requests, fake checks, suspicious domains, and unrealistic pay. |
| Job-site scraping guidance and RFC 9309 | Responsible collection should be API-first, low-volume, provenance-rich, and respectful of robots.txt, terms, privacy, and access controls. | Scope collection to one local job seeker; build a source registry, polite scheduler, stop list, and no-evasion rules. |
| Greenhouse, Lever, Ashby, and SmartRecruiters docs | Public ATS posting APIs expose published jobs in structured formats intended for careers pages or public postings. | Prefer public ATS APIs and canonical company sources over rendered HTML scraping or aggregator scraping. |
| LinkedIn and Indeed public terms or help pages | Large aggregators and social/job platforms restrict automated access, scraping, bots, or data extraction. | Avoid direct scraping of high-risk job boards unless a later source-specific review confirms permission and low risk. |
| In Salary Negotiations, Women Do Ask | Recent PON summary says women in studied MBA samples negotiated as often or more often than men, while pay gaps persisted due to career paths, promotion opportunities, caregiving, inflexible roles, and bias. | Build salary and negotiation support without implying job seekers can solve structural pay gaps by asking better. |
| Pay-equity and higher-pay research | Pay gaps are shaped by salary opacity, past-pay anchoring, negotiation ambiguity, bias, occupational segregation, unequal access to referrals or sponsors, discretionary pay setting, weak enforcement, and unclear promotion criteria. | Combine individual negotiation prep with structural transparency signals, not "just ask harder" advice. |
| Pew, NWLC, salary-history-ban, and pay-transparency sources | Pay transparency and salary-history bans can reduce information asymmetry and reduce prior-pay anchoring, but laws and data change by jurisdiction and date. | Add range-quality scoring, salary-history guardrails, jurisdiction-aware reminders, and volatile-source revalidation. |
| Bargaining-while-Black and related race-negotiation sources | Race can affect salary-negotiation expectations and backlash; Black job seekers may face penalties when violating biased expectations. | Use market, level, scope, and written evidence framing without stereotyping users or requiring identity disclosure. |
| AI salary-advice bias research | AI salary advice can vary by protected attributes and model version in tasks with no single ground truth. | Keep negotiation suggestions evidence-backed, inspectable, local where possible, and never personalized through inferred protected-class traits. |

## Product improvement backlog

### 1. Guided setup and search intent

- Add a guided search intake that asks one short question at a time.
- Keep current custom-search path for users who know exact titles and terms.
- Let users mark answers as "must have", "prefer", or "avoid".
- Add "not sure" options for salary, title, location, commute, schedule, and
  adjacent roles.
- Review-volume preference now exists in setup: smaller list, balanced list, or
  broad discovery. It maps to existing local source limits and alert strength.
- Ask whether to show adjacent roles separately instead of mixing them into the
  main list.
- Let users import a resume for suggestions, but show extracted skills before
  they influence search.
- Add a plain summary before scanning starts: look for, show more, rank lower,
  do not hide unless, and alerts.
- Add periodic check-ins after quiet weeks: widen search, lower strictness,
  refresh sources, pause alerts, or keep current settings.
- Add confidential employed-search mode with quieter notifications, neutral
  wording, and no assumption that the user can apply during work hours.
- Add non-degree and hourly-work paths that emphasize schedule, commute,
  required credentials, physical demands, and immediate availability.

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
- Add a "new and worth quick review" queue for jobs seen in the first 48 hours,
  while still letting users save older postings that match strongly.
- Add duplicate and repost explanation so users know whether they have seen the
  role before.
- Store explanation provenance so tests can prove no hidden score factor exists.
- Add "not enough evidence" or "mixed evidence" states when job text, salary,
  source freshness, or resume extraction is too thin for a confident score.

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
- Treat company-site presence as stronger evidence, not proof. The
  ResumeBuilder.com survey claims fake or inactive postings can also appear on
  company websites, so JobSentinel should still inspect age, reposting, closure,
  and user-observed response patterns.
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
- Track public active-hiring context when available: hiring freeze signals,
  recent layoff news, large requisition drops, and role fill or removal timing.
  Keep this as weak evidence unless source quality is high.
- Add job-content quality checks for vague responsibilities, missing team or
  reporting line, boilerplate-heavy text, talent-community language, unclear
  location, contradictory remote rules, and missing salary where expected.
- Add user verification workflow: check company page, review age and repost
  pattern, search exact title plus company, look for recent layoffs or freezes,
  find human signal, and message before deep tailoring.
- Add warning copy such as "Verify before spending serious time" for high-risk
  postings.
- Add regulatory-disclosure fields when available: active vacancy, expected
  hiring timeline, posting expiration date, filled or closed date, and
  future-opportunity disclosure.
- Use source collection only for single-user monitoring and verification:
  saved jobs, company watchlists, user-imported URLs, and focused searches. Do
  not fan out into broad job-board scraping.
- Prefer public ATS feeds and official company pages for freshness and closure
  checks. Treat aggregator copies as weaker evidence unless direct collection
  is allowed and low risk.
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
- Add local salary expectation calibration that compares target pay against
  visible postings, estimated ranges, role seniority, schedule, commute, and
  user-selected flexibility without presenting the target as wrong.
- Add negotiation preparation for salary, benefits, schedule, title, scope,
  promotion criteria, review timing, and flexibility.
- Avoid copy that frames gender pay gaps or lower outcomes as a failure to ask.
  Treat negotiation as one useful action, not a fix for structural inequity.
- Add prompts for structural offer factors: promotion path, pay transparency,
  flexible work, caregiving compatibility, travel load, expected hours, and
  manager support.
- Add jurisdiction-aware reminders for salary-history questions and
  compensation transparency only after current law is verified for the user's
  location.
- Add salary-range quality scoring: listed vs missing, narrow vs extremely
  broad, midpoint above or below user floor, placement criteria present, and
  whether "competitive" or "DOE" hides useful information.
- Add negotiability detection for postings and recruiter notes: negotiable,
  based on experience, fixed range, broad range, budgeted range, and missing
  compensation.
- Add market-anchor helper that combines posted range, local market estimate,
  level, scope, location, skills, scarcity, competing offers, total
  compensation, and user walkaway point.
- Add under-anchoring warnings when a user target is below a posted midpoint or
  below credible market evidence, without shaming or forcing a counteroffer.
- Add past-salary guardrails: explain why current or prior compensation can
  preserve inequity, give neutral scripts to refocus on role range and value,
  and avoid legal advice unless jurisdiction is verified.
- Add leveling checker that asks whether title, level, scope, decision rights,
  team size, budget ownership, and promotion path match the offer.
- Add employer transparency score for range clarity, range width, salary-history
  questions, written offer detail, level criteria, promotion cycles, and pay
  equity review claims.
- Add review-cycle and promotion-evidence tracker so users can capture wins,
  scope growth, metrics, peer feedback, and promotion criteria before budget
  cycles close.
- Add pay-equity-safe scripts grounded in role scope, market data, and user
  evidence. Do not tailor script tone from inferred race, gender, accent, name,
  disability, or class signals.

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
- Add photo, image-only, and visual-layout warnings because VLM and visual
  resume screeners can pick up proxy cues and because image-heavy resumes are
  less accessible.
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
- Add "unknown" states for dates, titles, education, certifications, and gaps
  instead of forcing possibly false parser guesses into scoring.
- Add employment-gap and career-break support that helps users present true
  context without treating gaps as defects.
- Add exact-credential versus transferable-evidence review so users can decide
  whether to apply when they lack a listed degree, certification, or exact
  title but have relevant proof.
- Add model-agnostic resume writing guidance: clear structure, truthful
  evidence, and human readability rather than optimization for a guessed LLM.
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
- Track whether the posting was reviewed in the first 48 hours, whether the
  application was acknowledged, and whether the application route showed a real
  requisition ID or generic talent-pool flow.
- Record whether a submitted application came from a posting later marked
  stale, closed, evergreen, high ghost risk, or potential scam.
- Track offer and negotiation status locally: initial offer, counter, deadline,
  benefits questions, schedule requests, promotion criteria, follow-up date, and
  final decision.
- Track total compensation details: base, signing bonus, annual bonus, equity,
  PTO, remote or hybrid flexibility, commute, relocation, training budget,
  certification support, severance, review timeline, and promotion date.
- Track range and offer provenance: posted range, recruiter-stated range,
  written offer, user-entered market data, date collected, and confidence.
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
- Add intermediary share and source mix so users can see whether their market is
  mostly employer-direct, staffing, recruiter, aggregator, or uncertain.
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
- Add employer fill or removal timing at 30, 60, 90, and 180 days when local
  evidence exists, with weak-signal labeling for scraped or incomplete data.
- Add volatile trend alerts, such as rising AI-related title demand, only when
  source date, geography, and role family are visible.
- Base market intelligence on local observed source data, saved searches, user
  watchlists, and allowed APIs. Do not imply JobSentinel has full-market
  coverage.
- Add pay-transparency market view: share of postings with ranges, range width,
  median listed pay by role family, missing-pay rates, employer range quality,
  and likely transparency-theater patterns.
- Add employer pay-equity signals as evidence tags, not verdicts: clear salary
  bands, written leveling criteria, regular compensation review cycles,
  salary-history avoidance, and documented pay-equity review claims.

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
  Application Assist.
- Avoid identity-flattening language such as "ATS says you are weak" or
  "unqualified".
- Add "what JobSentinel knows" and "what JobSentinel is guessing" sections for
  recommendations.
- Add local share summary for coaches, friends, workforce counselors, or peer
  support without exposing raw resume text by default.
- Add collaboration notes for users working with counselors, friends, peers, or
  family, with per-note privacy flags and no contact upload requirement.
- Add accommodation and assessment notes so users can track platform barriers,
  requested accommodations, assessment refusals, and follow-up outcomes.
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
- Keep source collection local, bounded, and user-directed. No public
  redistribution of collected job data without a separate product, legal, and
  privacy decision.
- Do not scrape or store recruiter personal contact data unless the user enters
  it for their own application tracking.
- Do not use direct aggregator scraping for LinkedIn, Indeed, Glassdoor,
  ZipRecruiter, Monster, CareerBuilder, or similar sources unless source terms
  and robots status are reviewed and the allowed use is documented.
- Do not import or infer protected-class data, photos, social profiles, commute
  proxies, school prestige, or neighborhood signals for ranking. If future
  fairness research needs sensitive attributes, require a separate governance
  decision.
- Do not ask users to disclose race, ethnicity, gender, disability, immigration
  status, caregiver status, or other protected traits to receive pay guidance.
  If a future opt-in equity feature needs sensitive data, it requires separate
  governance, local-only defaults, clear user benefit, and deletion controls.
- Do not make "diversity adjustment", "identity premium", or protected-class
  compensation recommendations. Use role, level, market, scope, and user
  evidence.
- Label AI-assisted salary advice as uncertain and evidence-based. Require
  user review before using generated scripts.
- Add score uncertainty and abstention behavior for thin evidence, conflicting
  parser output, adversarial content, or criteria that cannot be checked from
  local data.
- Add tests with malformed, adversarial, scan-only, and over-designed resumes.
- Keep human-in-the-loop submission for applications. JobSentinel must not click Submit.
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

### 10. Local source collection and scraper governance

This section is only for a local-first, single-job-seeker JobSentinel
installation. It is not a plan for a full job-site crawler, public job board,
commercial job-data product, or AI training dataset.

- Add a source registry with `source_name`, `source_type`, `base_url`,
  `robots_reviewed_at`, `terms_reviewed_at`, `allowed_use`,
  `rate_limit_per_host`, `requires_auth`, `supports_last_modified`, and
  `risk_tier`.
- Use this source priority: user-provided saved searches and company
  watchlists, company-owned careers pages, public ATS APIs, search discovery
  that points back to canonical company pages, manual user-imported URLs,
  licensed feeds, then aggregator scraping only if allowed and low risk.
- Prefer Greenhouse, Lever, Ashby, SmartRecruiters, and other public ATS
  posting APIs when available. Use Workable or similar APIs only where
  authorized. Treat Workday and employer career pages carefully because
  behavior varies by employer.
- Implement source-aware cadence for watched sources only: public ATS feeds
  every 6 to 24 hours, employer pages every 12 to 48 hours, small company pages
  every 1 to 3 days, and saved closed jobs before the user spends time
  applying.
- Add polite crawler behavior: clear user-agent, low per-host limits, jitter,
  caching, conditional requests, retry backoff, stop list, and hard stops on
  403, 429, CAPTCHAs, blocks, or explicit removal requests.
- Store provenance for every fetched listing: source URL, apply URL, fetch
  timestamp, HTTP status, redirect chain, content hash, extractor version,
  parser confidence, field-level provenance, robots status, and terms review
  date.
- Minimize collected data to job-posting fields: title, company, location,
  salary range, employment type, posted date, first seen, last seen, apply URL,
  source URL, ATS provider, job ID, and cleaned description where allowed.
- Avoid collecting recruiter personal emails, recruiter phone numbers,
  candidate profiles, employee lists, social graph data, login-only data,
  sensitive demographic data, and anything behind access controls.
- Add a source-risk badge for users: official company source, public ATS API,
  allowed employer page, manual import, licensed feed, aggregator copy, or
  unknown.
- Add internal robots and terms notes, but do not expose legal conclusions to
  users. Use plain user-facing labels such as "official source", "copied
  source", "uncertain source", or "manual import".
- Add tests for robots parsing, per-host rate limits, caching, backoff, stop
  list behavior, duplicate detection, source provenance, and no-evasion
  behavior.

Likely files later:

- `src-tauri/src/core/scrapers/*`
- `src-tauri/src/core/scrapers/url_utils.rs`
- `src-tauri/src/core/import/fetcher.rs`
- `src-tauri/src/core/url_security.rs`
- `src-tauri/src/core/db/types.rs`
- `src-tauri/src/core/db/ghost.rs`
- `src/components/JobCard.tsx`
- `src/components/GhostIndicator.tsx`
- `docs/features/scrapers.md`
- `docs/features/scraper-health.md`
- `docs/features/ghost-detection.md`
- `docs/security/URL_VALIDATION.md`

### 11. Research and measurement harness

- Add an evidence register for product claims, separating peer-reviewed papers,
  working papers, preprints, vendor reports, and local observation.
- Add acceptance criteria for recommendation changes: explanation quality,
  user actionability, false-confidence avoidance, privacy, and accessibility.
- Add test fixtures for broad job families, not only software engineering.
- Add bloat sensors for unsafe ATS manipulation language such as hidden keywords,
  white text, fake credentials, prompt injection, and CAPTCHA bypass.
- Add bloat sensors for overconfident ghost-job copy such as "fake", "certain",
  or "scam" when the evidence only supports stale or unverified.
- Add docs checks that prevent score language from claiming hiring guarantees.
- Add manual review checklist for user-facing AI and ATS copy.
- Add a source inventory with extraction status, blocked-source notes, source
  class, publication date, and evidence strength.
- Revalidate volatile sources before implementation: laws, vendor surveys,
  news reports, platform behavior, salary transparency rules, and employer
  posting practices.
- Add a source-governance checklist for scrapers: official API first, terms
  reviewed, robots checked, public data only, no authentication, low bounded
  cadence, caching, backoff, stop list, provenance, no redistribution, and no
  evasion.
- Add docs checks that prevent "scrape all jobs", "bypass bot detection",
  "ignore robots", "use proxies", or "scrape profiles" guidance.
- Add docs checks that prevent "women just need to ask", "confidence fixes pay
  gaps", "protected-class-based script", or "guaranteed raise" language.
- Add fixture coverage for pay guidance across hourly, salaried, union,
  commission, contract, nonprofit, public-sector, and executive roles.

Likely files later:

- `docs/harness/sources.md`
- `docs/harness/verification-matrix.md`
- `docs/style-guide/GLOSSARY.md`
- `scripts/*`
- `tests/e2e/playwright/*`

## Prioritization

Do first:

- Ghost-job and stale-posting protection: stale labels, source verification,
  company-site or ATS checks, repost tracking, closure checks, and "verify
  before tailoring" warnings.
- Pay-equity protection: salary floor filters, range-quality scoring,
  salary-history guardrails, under-anchoring warnings, under-leveling checks,
  and negotiation prep grounded in role scope and market evidence.
- Long-term-unemployment support: pacing, weekly progress summaries,
  fresh-role filters, quiet-period prompts, reactivation strategies, and
  gap-framing support without shame.
- Bias-aware application strategy: referrals, recruiter contact, hiring-manager
  signals, direct company postings, route verification, and source/channel
  outcome tracking.
- Protective tone audit across job cards, score explanations, salary guidance,
  ghost warnings, and application tracking.
- Guided setup strictness: must-have, prefer, avoid, not sure.
- Score explanations that show source inputs and uncertainty.
- Resume parse preview and format linting.
- Application channel tracking and duplicate-application guard.
- Anti-gaming guardrails for hidden text, stuffing, and prompt injection.
- Accessibility checks for setup, resume, and score explanations.
- Fresh-post and source-type labels for first-48-hour review, staffing firms,
  aggregators, company-direct postings, and uncertain routes.
- Hidden-worker resume support for employment gaps, exact-credential filters,
  transferable evidence, and non-degree paths.
- Single-user source registry, public ATS API preference, source risk badges,
  crawler stop list, and no-evasion scraper guardrails.
- Local-first privacy coverage for salary floors, resume versions, job history,
  application notes, contacts, and debug reports.

Do next:

- Weekly search check-ins and fatigue-aware queues.
- Salary, commute, schedule, and missing-pay tradeoff review beyond the first
  pay-equity protection slice.
- Semantic matching improvements with visible evidence.
- Employer hiring velocity, trust trends, and source-quality badges.
- Local share summary for counselors or peer support.
- Confidential employed-search mode and collaboration notes.
- Regulatory-disclosure tracking for ghost-job and automated-hiring signals.
- Salary and offer negotiation support that covers benefits, flexibility,
  promotion path, review timing, and structural risk factors.
- Expanded pay-equity compensation intelligence: review-cycle tracker, employer
  transparency score, total-compensation comparison, and promotion-evidence
  support.

Research before building:

- Networked peer-support features, because they can create privacy and safety
  risks.
- External AI rewriting, because resumes contain PII and model-specific
  optimization can be unfair or brittle.
- Any ranking change that hides jobs automatically, because false negatives can
  harm users.
- Company-site verification across protected or anti-bot sites, because
  scraping must respect rate limits, terms awareness, and user trust.
- Any new source connector, because terms, robots, authorization, and allowed
  use must be reviewed source by source.
- Any jurisdiction-specific salary-history, pay-transparency, or equal-pay
  guidance, because laws and enforcement details change by state, city, country,
  date, employer size, and role type.
- Any fairness or demographic-proxy analysis, because JobSentinel should not
  ask for protected-class data without a clear user benefit and governance.
- Any use of photos, visual resume cues, social profiles, school prestige, or
  neighborhood proxies in ranking, because these can encode demographic signals.
- Any protected-class-personalized negotiation guidance, because pay support
  should use role, level, market, scope, and user evidence unless a separate
  opt-in governed feature is approved.

Do not build:

- Hidden keyword insertion.
- White-text or tiny-text keyword stuffing.
- Fabricated skills, employers, titles, dates, education, or credentials.
- Resume prompt injection.
- CAPTCHA bypass.
- Login-wall, paywall, block, or rate-limit bypass.
- Proxy rotation, residential proxies, account automation, stolen/session
  cookies, or anti-bot evasion.
- Broad scraping of LinkedIn, Indeed, Glassdoor, ZipRecruiter, Monster,
  CareerBuilder, Google Jobs, or similar aggregators without documented
  permission.
- Scraping candidate profiles, recruiter profiles, social graph data, employee
  lists, or authenticated surfaces.
- Public job-board operation, data resale, bulk redistribution, or AI training
  data collection.
- Application submission without user review and final click.
- Opaque ATS scoring that implies guaranteed hiring outcomes.
- Definitive "this employer is fake" labels from weak or indirect signals.
- User-facing pay-equity claims that are not dated, sourced, and scoped.
- Protected-class inference for salary guidance.
- Pay advice that implies marginalized workers caused pay gaps by negotiating
  poorly.
- AI-generated negotiation scripts that invent market data, legal rights,
  competing offers, skills, credentials, or user accomplishments.

## Milestones

- [x] Review repo planning rules and docs-only verification requirements.
- [x] Review `/Users/c/Downloads/job_seeker_behavior_research_papers.md`.
- [x] Review the local ATS transparency and automated-resume-screening research notes.
- [x] Review `/Users/c/Downloads/ghost_job_detection_research_and_guidance.md`.
- [x] Review `/Users/c/Downloads/job_site_web_scraping_research_and_guidance.md`.
- [x] Review `/Users/c/Downloads/In Salary Negotiations, Women Do Ask - PON - Program on Negotiation at Harvard Law School.pdf`.
- [x] Review `/Users/c/Downloads/pay_equity_higher_pay_women_people_of_color.md`.
- [x] Spot-check primary sources for high-impact claims.
- [x] Inventory 52 source URLs across all three research docs and extract 45
  accessible sources for a second-pass review.
- [x] Record blocked-source limits and add second-pass missed guidance to this
  plan.
- [x] Inventory 33 scraping-guidance URLs and spot-check core official sources:
  RFC 9309, public ATS APIs, LinkedIn guidance, and Indeed terms.
- [x] Add single-user local scraping boundary and salary-negotiation guidance
  from the final two source documents.
- [x] Inventory 35 pay-equity source URLs and spot-check core current sources:
  Pew, Harvard GAP, HBR, UC Berkeley, NWLC, salary-history-ban research, and AI
  salary-advice bias research.
- [x] Add pay-equity compensation-intelligence guidance and protected-class
  guardrails.
- [x] Promote ghost-job protection, pay-equity safeguards,
  long-term-unemployment support, bias-aware application routes, protective
  tone, and local-first privacy into first-class product requirements.
- [x] Create this active plan with a combined improvement backlog.
- [x] Re-run docs-only verification after the pay-equity source update.
- [x] For the next implementation goal, choose one prioritized slice and write
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

Resume, ATS, Application Assist, or external-side-effect slices need security review
against:

- `docs/security/COMMAND_EXECUTION.md`
- `docs/security/URL_VALIDATION.md`
- `docs/features/one-click-apply.md`
- Human-in-the-loop submit behavior.
- Local-first data handling.

## Progress

| Date | Status | Notes |
| ---- | ------ | ----- |
| 2026-05-29 | In progress | Implemented guided setup fresh-and-verified posting preference with plain choices mapped to local ghost-posting warning sensitivity, Settings parity, Quick Start guidance, and focused setup tests. |
| 2026-05-29 | In progress | Added guided setup review-volume preference with smaller list, balanced list, and broad discovery choices; mapped the answer to existing local source limits and alert strength, updated Quick Start, and added focused setup tests. |
| 2026-05-29 | In progress | Reframed user-data management as a sensitive local-control surface with safe debug reports, explicit external-channel setup, non-technical troubleshooting, and no default cloud or external AI dependency. |
| 2026-05-29 | In progress | Reframed market intelligence as local evidence review for source freshness, skill demand, company activity, salary transparency, location/work-mode constraints, and sample-bias caution instead of broad market prediction. |
| 2026-05-29 | In progress | Reframed resume matching as local, advisory, truthful fit review that supports broad careers without deceptive resume optimization, hidden keywords, ATS manipulation, or default external AI. |
| 2026-05-29 | In progress | Reframed application tracking as a local-first, sensitive workflow for pacing, follow-ups, quiet-period review, interview preparation, and pay/offer context, with broad status labels for technical and non-technical searches. |
| 2026-05-29 | In progress | Reframed remote and work-mode matching docs around user constraints, uncertainty, commute/schedule protection, and local-only preferences instead of score matrices. |
| 2026-05-29 | In progress | Replaced visible score-tooltip weight language with priority language so match factors stay explainable without exposing scoring-model jargon. |
| 2026-05-29 | In progress | Started job-card source labels so raw source IDs become plain source-check cues such as hiring page, job board, saved by you, or connected job source without changing stored source values. |
| 2026-05-29 | In progress | Added job-card pay-floor warnings using the saved salary floor so roles with listed pay below the user's floor are visible but flagged before tailoring. |
| 2026-05-29 | In progress | Added an optional setup pay-floor question so any job seeker can set below-floor warnings before first scan while keeping missing-pay jobs visible and marked. |
| 2026-05-29 | In progress | Reframed match-score copy from celebratory recommendations to protective evidence language: Strong Match, Some Match, source-check and must-have review guidance, plus bloat coverage against overconfident score copy. |
| 2026-05-28 | In progress | Chose Application Assist as the next implementation slice and reframed the visible flow around review-first form preparation, user-controlled Submit, and anti-volume guardrails. |
| 2026-05-28 | In progress | Promoted ghost-job protection, pay-equity safeguards, long-term-unemployment support, bias-aware application routes, protective tone, and local-first privacy from research notes into first-class product requirements and prioritization. |
| 2026-05-28 | Verified | Added pay-equity source. Added compensation intelligence, salary-history guardrails, market-anchor support, leveling checks, range-quality scoring, review-cycle tracking, employer transparency signals, protected-class guardrails, and re-ran docs-only checks. |
| 2026-05-28 | Verified | Added final scraping and salary-negotiation sources. Scoped scraping guidance to a local-first single-job-seeker app, added source-governance guardrails, added negotiation guidance that avoids blaming job seekers for structural pay gaps, and re-ran docs-only checks. |
| 2026-05-28 | Verified | Second pass inventoried 52 URLs, extracted 45 accessible sources, reviewed an alternate fairness-survey PDF, recorded blocked sources, added missed guidance around fresh-post urgency, intermediaries, hidden workers, fairness/proxy risks, company-site limits, and regulatory fields, then re-ran docs-only checks. |
| 2026-05-28 | Verified | Added plan to active repo docs and ran docs-only checks for the initial planning slice. |
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
- Deceptive ATS manipulation should be reframed as accurate machine readability and truthful
  application alignment. Trick-based tactics create ethics, security, and user
  trust risk.
- Several ATS/LLM screening sources are preprints or system papers. Treat them
  as useful signals, not settled evidence.
- Second-pass source extraction found 52 unique URLs across the three research
  docs. Forty-five extracted successfully enough for local text review. Seven
  direct downloads were blocked or paywalled: ACM TIST fairness survey, MDPI
  Resume2Vec, four ScienceDirect pages, and Wall Street Journal ghost-jobs
  coverage.
- The author-hosted fairness-survey PDF reinforces that bias can enter across
  sourcing, screening, interview, and selection through proxies, data gaps,
  accessibility barriers, automation bias, and job-description wording. It also
  cautions that single-system fairness metrics can miss broader workflow harm.
- Application-flow research adds product urgency: some postings receive many
  applications early and may remain open only briefly, while staffing or other
  intermediaries can dominate some platform flows.
- Hidden-worker research adds resume and search guidance beyond automated screening:
  exact credentials, employment gaps, and rigid filters can screen out capable
  workers before human review.
- Ghost jobs and scam jobs are different problems. A real employer can have a
  stale, paused, evergreen, or non-active posting; a scam posting is malicious
  and usually tries to obtain money, credentials, identity data, or labor.
- Candidate-facing ghost detection has limited rigorous public research. The
  Hunter Ng paper is directly relevant but still a preprint; vendor surveys are
  useful market signals but should not be treated as peer-reviewed evidence.
- Company-site verification is useful but not definitive. Employer-side survey
  sources claim fake or inactive postings can appear on company websites too, so
  JobSentinel should combine canonical-source checks with age, closure, repost,
  and user-observed response patterns.
- Current `docs/features/ghost-detection.md` uses stronger copy such as "fake"
  and "real jobs only" than this research-backed plan recommends. Future
  implementation should soften labels toward stale, unverified, likely closed,
  evergreen, high risk, and potential scam.
- The scraping guidance document is useful only after narrowing it to
  JobSentinel's actual product: a local-first tool for one job seeker. Single
  user scope is not a permission slip; it still needs source-by-source terms,
  robots, rate-limit, privacy, and access-control checks.
- RFC 9309 confirms robots.txt is a crawler-governance protocol whose rules
  crawlers are requested to honor, not an authentication system. JobSentinel
  should still treat robots directives as product constraints.
- Public ATS APIs from Greenhouse, Lever, Ashby, and SmartRecruiters are better
  fit than rendered HTML scraping where available. Large aggregators are
  higher-risk sources and should default to manual import or canonical company
  links unless permission is documented.
- The salary-negotiation PDF argues against the stale narrative that women
  simply do not ask. JobSentinel should support negotiation while also surfacing
  structural factors such as promotion path, flexibility, caregiving
  compatibility, and pay transparency.
- Poppler was not available for PDF extraction in this environment, so the
  salary PDF was extracted with `pypdf`. The source is a short text article, so
  layout fidelity was not material for this planning update.
- The pay-equity source adds a broader compensation strategy: reduce salary
  ambiguity, avoid past-pay anchoring, use market-supported targets, negotiate
  level and total compensation, track promotion criteria early, and prefer
  transparent employers.
- Pay-equity product design must avoid flattening broad groups into one
  "diversity adjustment" box. Product copy should not imply that women, people
  of color, or women of color caused pay gaps by failing to ask.
- Salary-history and pay-transparency guidance is volatile. Future
  implementation must verify current jurisdiction rules before showing legal or
  compliance-oriented copy.
- Direct browser checks for PubMed and APA-hosted `Bargaining while Black`
  sources were blocked, so exact race-negotiation phrasing should be
  re-verified from accessible primary text before shipping.

## Decisions

- Use one combined active plan instead of separate behavior and ATS plans so
  implementation priorities can be compared in one backlog.
- Preserve local-first defaults and human-in-the-loop application submission as
  non-negotiable constraints.
- Treat scores as estimates with visible evidence, not verdicts.
- Treat ghost scores as source-confidence and freshness estimates, not claims
  that JobSentinel knows employer intent.
- Treat scraping as local, single-user source monitoring. Do not expand it into
  full-site scraping, public job-board aggregation, data resale, or AI training
  data collection without a separate product and legal decision.
- Prefer public ATS APIs and employer canonical sources. Default high-risk
  aggregators to manual import or canonical-link discovery unless allowed use is
  documented.
- Frame salary negotiation as one part of job-search support, not as the reason
  pay gaps exist or persist.
- Treat pay-equity support as structural transparency plus individual prep.
  Default to role, level, market, scope, and user evidence instead of identity
  inference.
- Do not require protected-class disclosure for compensation guidance.
- Use evidence-strength labels for research-backed product claims: peer
  reviewed, working paper, preprint, policy report, vendor survey, news report,
  or local observation.
- Re-check source dates and primary text before shipping volatile claims about
  laws, employer behavior, salary rules, platform behavior, or exact statistics.
- Prefer narrow future implementation slices with their own change contracts.
- Prioritize product behavior that protects time, dignity, compensation, and
  privacy over motivational copy or raw activity volume.

## Outcomes

- Combined product backlog exists for job-seeker behavior, ATS-aware resume
  preparation, ghost-job research, local source collection, and salary
  negotiation and pay-equity support.
- Product priorities now explicitly center ghost-job protection, pay-equity
  safeguards, long-term-unemployment support, bias-aware application routes,
  protective tone, and local-first privacy.
- First implementation slice: guided setup fresh-and-verified posting
  preference, backed by a feature-specific change contract.
- Second implementation slice: guided setup review-volume preference so users
  can choose a smaller list, balanced list, or broad discovery before first
  scan.

## Change contract: Resume Match framing

Problem:
Some maintained user-facing surfaces still frame resume help as "ATS
optimization" and keyword-count work. That framing is narrower and more
technical than JobSentinel's goal of candidate-side explainability,
application readability, and honest fit for any job seeker.

Scope:
Rename visible app and user-doc surfaces from old optimization wording to Resume Match
where the user is navigating or learning the feature. Keep internal route IDs,
stored keys, type names, and implementation fields stable unless a user-facing
label depends on them. Reword maintained user docs away from resume filtering
and keyword-count language toward readable, job-aligned resume evidence.

Out of scope:
Do not rewrite resume scoring internals, database fields, route IDs, test
fixtures that intentionally model backend field names, or developer-only API
docs in this slice.

Acceptance criteria:

- Main navigation and page error boundary show "Resume Match" instead of
  old optimization wording.
- Resume Builder guidance points users to Resume Match with non-technical
  wording.
- Quick Start, resume feature docs, release notes, and docs front doors describe
  resume templates and resume review as application readability and job-post
  evidence, not filtering tricks or keyword-count work.
- Regression tests cover visible label changes.
- Bloat sensor blocks recurrence of old optimization wording in user-facing frontend and
  maintained user-facing docs.

Audience and ease:

- Audience is any job seeker, including non-technical users and people applying
  outside software roles.
- Technical knowledge assumed: none.
- Users should understand the feature as help making their resume readable and
  relevant, not as a way to game hidden systems.

Source-of-truth docs:

- `docs/plans/active/research-backed-product-improvements.md`
- `docs/plans/active/repo-cleanup-and-quality-sweep.md`
- `docs/user/QUICK_START.md`
- `docs/features/resume-builder.md`
- `docs/README.md`
- `docs/ROADMAP.md`

Likely files:

- `src/components/Navigation.tsx`
- `src/App.tsx`
- `src/pages/ResumeBuilder.tsx`
- `src/contexts/KeyboardShortcutsContext.tsx`
- `src/pages/ResumeOptimizer.tsx`
- `src/mocks/handlers.ts`
- `docs/user/QUICK_START.md`
- `docs/features/resume-builder.md`
- `docs/features/resume-matcher.md`
- `docs/README.md`
- `docs/ROADMAP.md`
- `docs/releases/v2.0.md`
- `docs/releases/v2.4.md`
- `scripts/check-repo-bloat.mjs`
- `scripts/check-repo-bloat.test.mjs`

Risks:

- Route IDs and backend field names may still include `ats`; changing them
  would create avoidable churn, so this slice only changes visible copy.
- Some developer docs may still need later cleanup; this slice targets normal
  user-facing surfaces first.

Sensors:

- Focused component/page tests for changed labels.
- `npm run test:run -- <focused test files>`
- `npm run lint:bloat`
- `npm run lint:docs`
- `npx tsc --noEmit`

Rollback:
Restore visible labels and remove the new bloat rule if route or docs
compatibility requires the old name.

## Change contract: visible posting-risk guidance on job cards

Problem:
Posting-risk badges are useful, but a tiny badge is easy to miss when a job
seeker is tired, short on time, or reviewing many jobs. High-risk postings
should interrupt the card enough to protect tailoring time without making a
definitive claim about employer intent.

Scope:
Add plain, visible job-card guidance when a posting has elevated stale,
repost, or low-verification signals. Keep the existing score, badge, and
feedback controls. Do not add new collection, external checks, network calls,
database fields, or source-ranking models in this slice.

Acceptance criteria:

- Job cards with posting risk at or above 75% show "Verify before tailoring".
- Job cards with posting risk from 60% through 74% show a lighter review prompt.
- Job cards below the warning threshold stay visually quiet.
- Copy stays protective, practical, and cautious. It must not call an employer
  fake or claim JobSentinel knows intent.
- Screen-reader labels include the high-risk warning on affected cards.
- Existing bookmark, notes, hide, company research, and view actions still work.

Likely files:

- `src/components/JobCard.tsx`
- `src/components/JobCard.test.tsx`
- `docs/features/ghost-detection.md`

Risks:

- Extra guidance can make dense lists feel noisy. This slice limits visible
  guidance to elevated risk and keeps lower scores on the existing compact
  badge path.
- Current ghost scores are heuristics. Copy must frame them as warning signs,
  not proof.

Sensors:

- Focused component tests for high, medium, and quiet posting-risk cards.
- `npm run test:run -- src/components/JobCard.test.tsx`
- `npm run lint:docs`
- `npm run lint:bloat`
- `npx tsc --noEmit`

Rollback:
Remove the visible guidance block and keep the existing compact posting-risk
badge behavior.

## Change contract: missing-pay cue on job cards

Problem:
When a job omits pay, the current card can look like nothing is wrong because
the salary row disappears. For a job seeker trying to avoid underpayment or
wasted effort, missing pay should be visible as a transparency signal.

Scope:
Show a plain "Pay not listed" cue on job cards when neither minimum nor maximum
salary is available. Keep listed salary formatting unchanged. Do not infer pay,
compare against a user floor, add jurisdiction-specific law guidance, or call an
employer non-compliant in this slice.

Acceptance criteria:

- Jobs with a minimum, maximum, or range keep existing salary display.
- Jobs with no listed pay show "Pay not listed" in the metadata row.
- Screen-reader labels include the missing-pay signal.
- Copy stays non-judgmental and frames missing pay as transparency, not proof
  of bad intent or legal violation.
- No new network call, external AI call, or database field is introduced.

Likely files:

- `src/components/JobCard.tsx`
- `src/components/JobCard.test.tsx`
- `docs/features/salary-ai.md`

Risks:

- Some postings may disclose pay in the description but not parsed fields. This
  cue should say "not listed" only for structured display data and can be
  refined later with better extraction.

Sensors:

- Focused component tests for listed pay and missing-pay cards.
- `npm run test:run -- src/components/JobCard.test.tsx`
- `npm run lint:docs`
- `npm run lint:bloat`
- `npx tsc --noEmit`

Rollback:
Hide the missing-pay cue and return to omitting the salary row when structured
salary fields are empty.

## Change contract: plain source labels on job cards

Problem:
Job cards can expose raw source IDs such as `greenhouse`, `hn_hiring`, or
`jobswithgpt`. Those names are useful internally, but they do not help a tired
job seeker decide whether a posting came from a closer employer source, a job
board, or a manual save.

Scope:
Translate job-card source IDs into plain labels and source-check hints. Keep
the stored source values, filters, database fields, and scraper IDs unchanged.
Do not add new collection, verification, network calls, source-ranking models,
or legal conclusions in this slice.

Acceptance criteria:

- Job cards do not render raw lowercase or underscored source IDs directly.
- Employer-side sources such as Greenhouse, Lever, and USAJobs use plain labels
  that signal a closer hiring-page source.
- Job-board, community, imported, and unknown sources use readable labels.
- Screen-reader labels include the plain source label and the source-check hint.
- Copy stays cautious: a closer source is stronger evidence, not proof the role
  is active.

Likely files:

- `src/components/JobCard.tsx`
- `src/components/JobCard.test.tsx`
- `docs/features/ghost-detection.md`
- `scripts/check-repo-bloat.mjs`
- `scripts/check-repo-bloat.test.mjs`

Risks:

- Source IDs are still needed for filters, saved searches, and backend logic, so
  this slice must only change visible labels.
- Some sources have mixed quality. The hint should ask users to verify instead
  of treating any source as fully trusted.

Sensors:

- Focused component tests for employer-side, job-board, imported, connected, and
  unknown sources.
- `npm run test:run -- src/components/JobCard.test.tsx`
- `npm run test:scripts -- scripts/check-repo-bloat.test.mjs`
- `npm run lint:docs`
- `npm run lint:bloat`
- `npx tsc --noEmit`

Rollback:
Return job cards to the previous source display and remove the bloat guard if a
source-filter compatibility issue appears.

## Handoff

- Current state: plan updated with six source documents plus first-class
  protective product priorities from the latest goal guidance. The guided setup
  preference for fresh and verified postings is implemented and covered by
  focused tests. The visible posting-risk guidance and missing-pay cue slices
  are implemented and covered by focused tests.
- Evidence: source documents, selected primary sources, and local PDF text
  extraction reviewed on
  2026-05-28.
- Next step: choose the next narrow research-backed implementation slice.
- Open risks: exact source statistics need re-check before product copy or
  implementation claims; this plan does not prove feasibility of every listed
  feature.
