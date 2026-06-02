# JobSentinel Roadmap

JobSentinel is an open-source, local-first job-search assistant for finding real,
relevant, fairly compensated work while keeping sensitive job-search data under
user control.

This roadmap tracks the six design pillars that guide product work.

## 1. Ghost-job and stale-posting detection

Planned:

- Company-site and hiring-platform verification before deep tailoring.
- Repost and duplicate tracking across sources.
- Closure checks for saved jobs and imported job links.
- Source-quality labels for employer pages, hiring-platform pages, recruiters, staffing
  firms, aggregators, and uncertain sources.

In progress:

- Stale and low-trust posting guidance in dashboard copy.
- Ghost-risk scoring, visible reasons, and user feedback states.
- Official-source job monitoring posture in docs and source guidance.

Evaluation ideas:

- Measure how often high-risk jobs later disappear, close, or repost.
- Compare time spent tailoring before and after verify-before-tailoring warnings.
- Track user corrections: active, stale, closed, evergreen, scam, or unsure.

## 2. Pay equity and salary-floor protection

Planned:

- Salary-floor filters with below-floor warnings.
- Pay transparency scoring for listed ranges, range width, missing criteria, and
  salary-history questions.
- Lower-title or lower-pay checks based on scope, decision rights, team size,
  budget, and promotion path.
- Negotiation notes grounded in role scope, written ranges, market evidence, and
  user-confirmed facts.

In progress:

- Salary and pay-equity requirements in active plans.
- Salary benchmark UI work toward pay-floor and below-floor guidance.
- Documentation language moving away from "ask harder" advice.

Evaluation ideas:

- Track how often users hide jobs below their floor or missing pay.
- Review whether salary guidance avoids blame and false certainty.
- Test pay guidance across hourly, salaried, union, commission, nonprofit,
  public-sector, contract, and executive roles.

## 3. Long-term unemployment support

Planned:

- Weekly progress summaries that show action, response, and quiet-period context.
- Fresh-role queues for newly seen jobs.
- Pacing controls to reduce fatigue.
- Resume-gap framing support without shame.
- Reactivation suggestions for stalled searches.

In progress:

- Active product rules for protective tone and broad job-seeker support.
- Setup intake that asks what work to avoid and lets users review answers before
  scanning.
- Local progress and application tracking surfaces.

Evaluation ideas:

- Measure whether weekly summaries reduce repeated review of stale postings.
- Compare callback and response tracking by channel and posting age.
- User-test language with long-term unemployed job seekers for shame, pressure,
  and clarity.

## 4. Bias-aware application strategy

Planned:

- Application channel tracking: cold apply, company site, referral, recruiter,
  hiring manager, staffing agency, career fair, internal transfer, or other.
- Warm-path prompts when a saved contact, recruiter, or direct company route is
  available.
- Company and source response-history summaries kept local to the user.
- Local hiring-manager and recruiter context summaries without contact upload.

In progress:

- Bias-aware route selection in active product plans.
- Existing application tracking, notes, reminders, and source details.
- Research guidance that treats black-hole applications as a product risk.

Evaluation ideas:

- Compare response rates by channel, source, posting age, and verification state.
- Measure whether direct-source and warm-path prompts change user action.
- Audit explanations for protected-class inference, stereotyping, and hidden
  proxies.

## 5. Protective, non-cheerleader UX

Planned:

- Plain risk statements such as "verify before tailoring", "below your floor",
  "low response history", and "conflicts with your constraints".
- Recovery paths for every warning: edit, verify, save anyway, hide, or undo.
- Copy review checklist for scores, warnings, salary guidance, and AI-assisted
  notes.

In progress:

- Broad copy cleanup away from hollow motivation and engineer-only defaults.
- One-click safe support report flow for issue reports.
- Setup and dashboard language tuned for users with zero technical knowledge.

Evaluation ideas:

- Run comprehension tests with non-technical job seekers.
- Check whether warnings change behavior without creating fear or shame.
- Track safe support report usefulness and whether users can create reports without
  technical help.

## 6. Privacy-first local control

Planned:

- Clear per-feature data-flow labels.
- Local export, delete, and recovery workflows for sensitive job-search data.
- Reviewable permissions for every external channel.
- Continued source-specific security review before new integrations.

In progress:

- Local SQLite storage for search data, saved jobs, applications, notes, and
  settings.
- OS credential-store usage for secrets.
- No telemetry by default.
- Safe support reports and privacy-preserving feedback paths.

Evaluation ideas:

- Test that sensitive data stays local unless a user explicitly configures an
  external channel.
- Verify support reports redact names, emails, secrets, local paths, and raw
  resume/application content.
- Review new features against `PRIVACY.md`, `RESPONSIBLE_AI.md`, and the harness
  verification matrix.
