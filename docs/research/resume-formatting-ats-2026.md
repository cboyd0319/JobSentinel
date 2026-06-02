# Resume Formatting And Application Readability, 2026

This note locks in product guidance from
`/Users/c/Downloads/updated_resume_formatting_ats_guidance_2026(2).md`,
reviewed on 2026-06-02.

JobSentinel should use this guidance as candidate-side application readability
support. It should not frame resume help as a way to manipulate employer
screening systems, guarantee responses, or turn unsupported claims into
qualifications.

## Product Rules

- Treat resume help as local, sensitive, user-controlled work by default.
- Optimize for readable, truthful applications, not employer-system games.
- Keep core resume workflows local without requiring external AI.
- Show what JobSentinel can read before those details influence user-facing
  fit notes.
- Explain uncertainty. No public scanner, score, or local rubric can prove how
  every employer system will parse or evaluate a resume.
- Separate document quality from role fit. A clear resume can still be a poor
  fit for a specific role, and a strong role fit can still need format cleanup.
- Use plain-language checks that make sense to non-technical job seekers.

## Formatting Guidance To Enforce

- Prefer simple, single-column, reverse-chronological structure for most U.S.
  private-sector roles.
- Keep name and contact details in the document body near the top, not only in
  a header, footer, image, or design container.
- Use standard headings such as Summary, Skills, Professional Experience,
  Education, Certifications, Projects, and Licenses.
- Avoid important content in tables, sidebars, text boxes, columns, icons,
  graphics, photos, skill bars, or image-only exports.
- Prefer selectable text and clean reading order over decorative templates.
- Follow the employer-requested file type first. When no file type is named,
  use a clean DOCX or selectable-text PDF.
- Keep resume files small enough for common application portals. Source-specific
  size limits should be labeled and rechecked before release copy repeats them.
- For federal or government roles, preserve announcement-specific details such
  as month/year dates, hours per week, grade or series where applicable, and
  required qualification evidence. Recheck live USAJOBS and OPM guidance before
  shipping exact page-limit copy.

## Local Checks To Prefer

- Plain-text preview: name, contact details, headings, jobs, employers, dates,
  bullets, links, and skills should remain readable in order.
- Portal auto-fill review: when a user applies outside JobSentinel, parsed
  fields should be checked before submission if the portal exposes them.
- PDF selectability check: users should be able to select and copy meaningful
  text, not only a full-page image.
- File-size awareness: unusually large resume files can signal embedded images
  or bloated exports.
- Different-parser humility: one local result is a useful diagnostic, not a
  universal employer-system guarantee.

## Requirement Mapping

For serious applications, JobSentinel should help users build a small
requirement inventory from the job post:

- must-have terms: required tools, credentials, licenses, authorization,
  location, degree requirements, and hard requirements;
- high-value terms: repeated responsibilities, core platforms, seniority
  signals, and domain language;
- supporting terms: nice-to-have tools, adjacent methods, and soft skills with
  evidence;
- do-not-force terms: requirements the user cannot honestly support.

Required and preferred wording should be made visible only when it is truthful.
Keywords should appear in skills and experience with evidence, not as a pile of
unrelated terms. Acronyms and full phrases can both appear when space allows
and the claim is true. Target-role language may appear in a headline when it is
truthful, but official past titles should not be rewritten into titles the user
did not hold.

## Knockout Question Consistency

Applications often filter on structured form questions. Resume help must
support consistency between the resume and user answers for:

- work authorization;
- location, remote, relocation, shift, or travel constraints;
- required licenses, certifications, clearances, or degrees;
- years of relevant experience;
- required tools or domain experience;
- salary range or availability when the user chooses to answer.

JobSentinel should never suggest format tricks for requirements the user does
not meet. It should help users make true evidence visible, ask clarifying
questions, or skip roles that fail hard constraints.

## Ethical Confidence

Many qualified job seekers understate real experience. JobSentinel should help
users express real work more clearly without inventing anything.

Safe guidance:

- Ask what the user actually did, what tools or methods were used, who was
  affected, and what changed afterward.
- Prefer action, scope, method, and outcome in bullets.
- Use real metrics when the user can defend them. When metrics are unavailable,
  use credible scope or qualitative outcomes only when supported by source
  facts.
- Use a capability ladder: exposure, assisted, hands-on use, independent
  delivery, ownership, and expert or strategic work.
- Encourage users to apply when they meet meaningful core requirements and can
  truthfully explain gaps.

Unsafe guidance:

- Do not fabricate employers, titles, dates, degrees, credentials, clearances,
  metrics, tools, authorization status, salary, or ownership.
- Do not upgrade assisted work into ownership.
- Do not turn exposure into expertise.
- Do not advise hidden text, keyword stuffing, prompt-injection-like content,
  misleading metadata, or unrelated keyword piles.

## Scoring Boundaries

Resume scores must be transparent rubrics, not claims about a universal
employer algorithm.

Useful rubric areas:

- target fit and positioning;
- evidence and impact;
- readable format and parser safety;
- keyword and skill alignment;
- readability and skimmability;
- completeness and credibility;
- profession-specific expectations.

Role-fit reviews should weight required qualifications, responsibilities, tools
and domain language, relevant impact evidence, credentials, education, and
format issues. Missing required licenses, unsupported inflated claims, unreadable
formatting, hidden text, or keyword stuffing should reduce confidence and prompt
review.

## Profession-Specific Guidance

JobSentinel should not assume resumes are only for engineering roles. Future
resume help should adjust examples and evidence prompts for:

- security and cybersecurity: risks, controls, incidents, systems, scale, and
  remediation;
- software: shipped systems, technical scope, quality, reliability, users, and
  collaboration;
- data and machine learning: decisions supported, data sources, models,
  analyses, metrics, and business impact;
- product: discovery, roadmap, launches, adoption, customer evidence, and
  outcomes;
- marketing: channels, campaigns, audience, budget, conversion, pipeline, and
  revenue;
- sales: quota, pipeline, account size, segment, retention, and deal outcomes;
- operations and program management: process, coordination, cost, risk,
  timelines, reporting, and service quality;
- customer success and support: retention, response quality, documentation,
  escalation, training, and customer outcomes;
- design and UX: portfolio context, research, usability, product outcomes, and
  collaboration;
- executive roles: scope, strategy, people, budget, risk, board or stakeholder
  communication, and durable outcomes;
- federal roles: announcement-specific evidence and required federal resume
  details;
- academic or research roles: CV versus resume choice, publications, grants,
  teaching, and research impact;
- career changers: transferable evidence, adjacent tools, and truthful bridge
  language;
- early career: projects, internships, coursework, leadership, service, and
  skill evidence;
- healthcare, legal, compliance, and licensed work: credentials, scope of
  practice, safety, regulatory requirements, and accuracy.

## Implementation Already Started

- Resume matching stays local by default.
- Users can open a bounded readable-text preview.
- PDF, DOCX, TXT, and Markdown resume import are supported locally.
- Active saved resume can be used for local fit review without copying
  structured details into the page.
- Required, preferred, and other job-post language stay grouped in fit notes.
- Recognized local job-post requirements now show match states and evidence
  sections, and recognized missing hard requirements cap the fit label until
  the user verifies the requirement.
- Local readability checks now warn about missing top contact details, missing
  standard headings, table-like extracted text, hidden instructions, and
  prompt-injection-like content.

## Backlog To Lock Next

- Add a guided requirement-inventory workflow for serious applications.
- Add a plain-text preview checklist with pass, review, and unknown states.
- Add file-size and selectable-text checks where local file metadata and PDF
  parsing support them.
- Add a knockout-question consistency review in Application Assist.
- Add role-specific evidence prompts and examples across non-technical,
  technical, licensed, government, academic, early-career, and career-change
  paths.
- Add a resume-quality rubric that is clearly separate from role-fit review.
- Add an interview-defense prompt for any strengthened bullet.
- Add synthetic fixtures for tricky layouts, tables, columns, image-only PDFs,
  federal resumes, career-change resumes, and licensed-role resumes.

## Research And Evaluation

- Use synthetic resumes and public job postings by default.
- Do not commit real resume text, names, chronology, salary floors, private
  notes, or profile data.
- Evaluate whether non-technical users understand what was read, what is
  missing, what is uncertain, and what they can do next.
- Test copy for humility: no guarantee of hiring outcomes, no promise of
  employer-system behavior, and no pressure to apply when hard constraints fail.

## Source References

- [MIT CAPD resume checklist](https://capd.mit.edu/resources/resume-checklist/)
- [MIT CAPD application readability guidance](https://capd.mit.edu/resources/make-your-resume-ats-friendly/)
- [MIT CAPD writing about skills](https://capd.mit.edu/resources/resumes-writing-about-your-skills/)
- [Harvard FAS resume and cover letter resources](https://careerservices.fas.harvard.edu/channels/create-a-resume-cv-or-cover-letter/)
- [Harvard FAS certifications guidance](https://careerservices.fas.harvard.edu/blog/2023/01/17/exactly-when-where-and-how-to-list-certifications-on-your-resume-because-youve-earned-them/)
- [Harvard FAS action verb guidance](https://careerservices.fas.harvard.edu/blog/2025/08/14/45-rare-action-verbs-for-your-resume-with-examples/)
- [Yale OCS resumes](https://ocs.yale.edu/channels/resumes/)
- [Yale OCS resume to CV conversion](https://ocs.yale.edu/resources/resume-to-cv-conversion/)
- [Yale OCS technical resume sample](https://ocs.yale.edu/resources/stemconnect-technical-resume-sample/)
- [Purdue OWL resumes and vitas](https://owl.purdue.edu/owl/job_search_writing/resumes_and_vitas/index.html)
- [Greenhouse unsuccessful resume parse guidance](https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse)
- [Lever resume parsing guidance](https://help.lever.co/s/article/Understanding-Resume-Parsing)
- [Workday ATS overview](https://www.workday.com/en-us/topics/hr/applicant-tracking-system.html)
- [iCIMS ATS glossary](https://www.icims.com/glossary/applicant-tracking-system-ats/)
- [Indeed ATS resume template guidance](https://www.indeed.com/career-advice/resumes-cover-letters/ats-resume-template)
- [Indeed application readability guidance](https://www.indeed.com/career-advice/resumes-cover-letters/how-to-beat-applicant-tracking-system)
- [Indeed scoring-system overview](https://ca.indeed.com/career-advice/career-development/scoring-system-for-resumes)
- [Indeed applying with less experience](https://www.indeed.com/career-advice/finding-a-job/applying-for-a-job-with-less-experience-than-required)
- [Indeed resume honesty guidance](https://www.indeed.com/career-advice/resumes-cover-letters/lying-on-resume)
- [SHRM tailoring guidance](https://www.shrm.org/topics-tools/news/organizational-employee-development/5-tips-to-tailor-hr-resume-ats-review)
- [SHRM keyword guidance](https://www.shrm.org/topics-tools/news/organizational-employee-development/leveraging-keywords-to-advance-career)
- [The Muse action verb guidance](https://www.themuse.com/advice/185-powerful-verbs-that-will-make-your-resume-awesome)
- [USAJOBS resume content guidance](https://help.usajobs.gov/faq/application/documents/resume/what-to-include)
- [OPM two-page federal resume guidance](https://www.opm.gov/policy-data-oversight/hiring-information/merit-hiring-plan-resources/applicant-guidance-on-the-two-page-resume-limit/)
- [University of Mary Washington resume evaluation guidance](https://adminfinance.umw.edu/hr/best-practices/screening-applicants/how-to-evaluate-resumes-and-cvs/)
- [UNC resume honesty guidance](https://universitypolicy.unc.edu/news/2024/06/28/the-truth-about-lying-on-resumes/)
- [Colorado State apply-with-gaps guidance](https://bizcareers.colostate.edu/resources/should-i-apply-if-i-dont-meet-the-qualifications/)
- [HBR 100 percent qualifications article](https://hbr.org/2014/08/why-women-dont-apply-for-jobs-unless-theyre-100-qualified)
- [Behavioural Insights Team follow-up on 100 percent qualifications](https://www.bi.team/blogs/women-only-apply-when-100-qualified-fact-or-fake-news/)
- [ResumeNet paper](https://arxiv.org/abs/1810.02832)
- [Measuring Validity in LLM-based Resume Screening](https://arxiv.org/abs/2602.18550)
- [AutoScreen-FW](https://arxiv.org/abs/2603.18390)
- [Hidden prompt-injection research](https://arxiv.org/abs/2605.28999)
