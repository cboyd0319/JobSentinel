# Resume Alignment Scoring

This note locks in product guidance from
`/Users/c/Downloads/ats_scoring_algorithm.md`, reviewed on 2026-06-02.

Use this as an internal, transparent candidate-side rubric for application
readability and role fit. Do not present it as a universal employer algorithm,
an interview predictor, or a way to manipulate screening systems.

## Boundaries

- Scores are local diagnostics. They are not hiring decisions.
- A score should explain what was read, what matched, what was missing, and
  what evidence supports each finding.
- Resume quality and role fit must stay separate. A polished resume can be a
  weak fit for a role; a plausible fit can still need readability fixes.
- Hard constraints should not be papered over by formatting advice.
- Missing legal, licensing, credential, location, authorization, or safety
  requirements should produce review prompts, caps, or skip guidance.
- All suggested wording must be truthful, defensible, and based on resume
  evidence or user-confirmed facts.

## Recommended Rubric Shape

Future scoring should expose component signals instead of one opaque number:

- parseability and readable formatting;
- required qualification match;
- keyword and terminology alignment;
- evidence strength;
- experience and seniority alignment;
- completeness and recruiter usability.

The product may use weights internally, but user-facing copy should emphasize
plain reasons and actions over percentages.

## Parseability

Parseability checks should look for:

- single-column readable structure;
- top contact details in the document body;
- standard headings;
- selectable text;
- clear dates, employers, titles, and bullet grouping;
- no important content hidden in images, tables, sidebars, columns, text boxes,
  graphics, icons, skill bars, headers, or footers;
- no hidden text, prompt-injection-like content, or keyword stuffing.

Severe parse failures should cap confidence even when keyword overlap looks
high.

## Required Qualification Match

Job-post parsing should classify:

- required qualifications;
- preferred qualifications;
- responsibilities;
- tools and platforms;
- certifications, licenses, education, clearance, authorization, and location;
- seniority indicators;
- domain terms and soft skills.

Each required item needs a match state:

- direct: exact requirement with context;
- strong: clearly equivalent evidence;
- partial: related but incomplete evidence;
- implied: weak exposure signal;
- missing: no clear evidence.

JobSentinel should not let a pile of preferred terms hide a missing hard
requirement.

## Keyword Alignment

Keywords are useful when they make real evidence findable. They are harmful
when they become unrelated piles.

Prefer:

- required terms where truthful;
- preferred terms when space allows;
- acronyms and full terms when useful;
- keywords in experience bullets, not only skills lists;
- synonyms and adjacent terms that are genuinely equivalent or clearly related;
- anti-stuffing checks for repeated or unnatural keyword clusters.

Do not over-credit weak synonyms. Adjacent exposure is not the same thing as
direct ownership.

## Evidence Strength

Evidence should outrank bare keyword presence. Strong evidence names:

- action;
- scope;
- tool or method;
- outcome;
- metric, scale, risk, time, quality, customer, revenue, or operational impact
  when the user can defend it.

Evidence levels should distinguish metric-backed accomplishments,
scope-backed accomplishments, clear responsibility with tools, duty-only
statements, bare keywords, and missing evidence.

## Seniority Alignment

Seniority review should compare demonstrated scope to role expectations:

- early career: projects, internships, foundation, learning velocity;
- mid-level: independent execution and repeatable delivery;
- senior: ownership, systems delivered, mentorship, judgment, outcomes;
- staff or principal: architecture, standards, multi-team influence, strategy;
- manager or director: people, program, budget, planning, and organizational
  outcomes.

The review should flag both under-leveling risk and mismatch risk without
shaming the user.

## Completeness And Usability

Recruiter usability checks should ask whether a person can quickly see:

- target role;
- current or recent role;
- relevant tools, domains, and scope;
- operating level;
- outcomes;
- mandatory credentials;
- chronology and gaps;
- plausible job fit.

This is a readability aid, not a judgment of the user's worth.

## Hard Penalties And Caps

Rubric logic should reduce confidence or cap the final signal for:

- unmet work authorization or location constraints;
- mandatory license, certification, degree, or clearance missing;
- severe parsing failure;
- likely false credentials or unsupported inflated claims;
- unreadable employment history;
- hidden text, prompt-injection-like content, or keyword stuffing;
- generic untailored resumes for specialized roles.

These caps should be explained in human language and tied to user-controllable
next steps.

## Output Format

User-facing results should show:

- top strengths;
- top risks;
- missing required items;
- evidence that supports each match;
- specific recommended changes;
- "add only if truthful" warnings for unsupported terms;
- clear uncertainty when the job post or resume text is too thin.

Avoid dumping only a final number. The useful part is the explanation.

## Profession-Specific Weighting

Future weighting should vary by role family:

- security: domain match, tools, risk reduction, incident/control scope,
  engineering collaboration, certifications;
- software: languages, frameworks, systems shipped, performance, reliability,
  architecture, ownership;
- marketing: channels, campaigns, audience, budget, conversion, pipeline,
  revenue, portfolio;
- product: scope, roadmap, launch outcomes, discovery, cross-functional
  leadership, adoption, retention, revenue;
- sales: quota, revenue, pipeline, deal size, sales cycle, segment, awards;
- federal: specialized experience, announcement match, dates, hours, grade or
  series where applicable, required qualification proof.

Additional role families from the 2026 formatting note should use the same
evidence-first pattern.

## Implementation Notes

Future implementation should improve:

- structured text extraction with bullets attached to the right role;
- job-post parsing by requirement type and importance;
- synonym handling with conservative equivalence rules;
- recency weighting that values current evidence more without discarding older
  rare or still-current expertise;
- section weighting, where recent experience evidence is stronger than a skills
  list alone;
- transparent match classification for each major requirement.

## Already Started

- Local readable-text review flags missing top contact details, missing
  standard headings, table-like extracted text, hidden instructions,
  prompt-injection-like content, and obvious keyword stuffing.
- Resume/job fit keeps required and preferred job-post language separate.
- Resume/job fit now returns requirement-review rows for recognized local
  job-post keywords with direct, strong, partial, implied, or missing states,
  evidence sections, hard-requirement markers, and plain next steps.
- Hard-requirement risk actions now use category-specific honesty guidance
  instead of generic verify-first copy.
- Resume/job fit now caps the local fit label when recognized required hard
  constraints such as authorization, location, license, certification, degree,
  or clearance are missing.
- Resume/job fit now treats explicit degree-or-equivalent-experience wording
  as an experience-compatible requirement instead of an exact-degree hard cap.
- Resume/job fit now treats the conservative `CRM` and `customer relationship
  management` pair as equivalent local evidence without broad fuzzy matching.
  The acronym and expansion do not count as separate evidence when they appear
  on the same line.
- Resume/job fit now treats `customer service`, `customer support`,
  `client service`, `client services`, and `client support` as equivalent
  local evidence without broad fuzzy matching.
- Resume/job fit now treats `data entry` and `data-entry` as equivalent local
  evidence without broad fuzzy matching.
- Resume/job fit now treats `onsite`, `on-site`, and `on site` as equivalent
  local location evidence for required location constraints.
- Resume/job fit now treats `relocation`, `relocate`, and
  `willing to relocate` as equivalent local location evidence for required
  relocation constraints.
- Resume/job fit now treats `reliable transportation` and `own transportation`
  as equivalent local location evidence for required commute or transportation
  constraints.
- Resume/job fit now treats `night shift`, `overnight shift`, `third shift`,
  and `3rd shift` as equivalent local schedule evidence for required
  night-shift constraints.
- Resume/job fit now treats `weekend availability`, `weekend shift`, and
  `weekend shifts` as equivalent local schedule evidence for required weekend
  constraints.
- Resume/job fit now treats `evening shift`, `second shift`, and `2nd shift`
  as equivalent local schedule evidence for required evening-shift constraints.
- Resume/job fit now treats `day shift`, `first shift`, and `1st shift` as
  equivalent local schedule evidence for required day-shift constraints.
- Resume/job fit now treats `availability` and `available` as equivalent local
  schedule evidence for required availability constraints.
- Resume/job fit now treats lift-weight wording with the same number, such as
  `lift 50 lbs` and `lift 50 pounds`, as equivalent local physical-demand
  evidence.
- Resume/job fit now treats `stand for long periods` and
  `standing for long periods` as equivalent local physical-demand evidence.
- Resume/job fit now treats clear credential equivalents such as `BLS` and
  `Basic Life Support` as the same evidence, while keeping unrelated
  credentials separate.
- Resume/job fit now treats `driver's license`, `drivers license`, and
  `driver license` as equivalent local license evidence.
- Resume/job fit now treats `CNA`, `Certified Nursing Assistant`, `Certified
  Nurse Assistant`, and `Certified Nurse Aide` as the same evidence, and drops
  the duplicate generic `certification` risk when the specific credential
  matched.
- Resume/job fit now treats `LPN`, `Licensed Practical Nurse`, `LVN`, and
  `Licensed Vocational Nurse` as the same local credential evidence, while the
  hard-requirement guidance still tells users to verify the license.
- Resume/job fit now treats `PMP`, `Project Management Professional`, PMP
  certification, and Project Management Professional certification as the same
  local credential evidence.
- Resume/job fit now treats `food safety`, `food safety certification`,
  `ServSafe`, and food-handler certificate, permit, or card wording as the same
  local credential evidence.
- Resume/job fit now treats first-aid certificate, certification, and certified
  wording as the same local credential evidence.
- Resume/job fit now treats forklift certificate, certification, certified,
  operator certification, and license wording as the same local credential
  evidence.
- Resume/job fit now treats OSHA 10, OSHA10, OSHA 10 certification, and OSHA
  10-hour wording as the same local credential evidence without treating OSHA
  30 as equivalent.
- Resume/job fit now treats OSHA 30, OSHA30, OSHA 30 certification, and OSHA
  30-hour wording as the same local credential evidence without treating OSHA
  10 as equivalent.
- Resume/job fit now treats `high school diploma`, `high school degree`,
  `GED`, `high school equivalency`, and `General Education Development` as the
  same local education evidence.
- Readable-text review now treats training, credentials, certificate, and
  license headings as credential evidence and standard readable structure
  instead of generic resume text.
- Resume readability review now warns when experience or project bullets read
  like keyword lists instead of plain work evidence.
- Resume readability review now warns when experience or project bullets are
  packed with generic filler phrases instead of specific work evidence.
- Resume readability review now warns when a bullet mixes ownership or expert
  wording with exposure-only or assisted-work signals so the user can choose
  the true capability level.
- Resume readability review now accepts career-break and caregiving headings
  as standard structure so truthful gap context is not treated as a formatting
  defect.
- Resume readability review now accepts volunteer, community, and military
  service headings as standard structure so nontraditional experience sections
  are not treated as formatting defects, and requirement evidence under those
  headings counts as experience evidence.
- Drafted alternative bullets now include an interview-defense reminder for
  the problem, user role, action, result, and evidence before using stronger
  wording.
- Requirement review now recognizes a wider set of healthcare, education,
  service, operations, and trades terms, reducing software-only matching bias.
- Requirement review now also recognizes legal, finance, and government or
  administrative terms such as document review, records management, and
  financial reconciliation.
- Structured resume review now marks matched requirements from a current role
  as current-experience evidence instead of hiding recency in a generic
  experience label.
- Readable-text resume review now marks matched Experience bullets after a
  present-date role marker as current-experience evidence and resets the label
  when a later past-role date range appears.
- Resume/job fit now treats work or project evidence with visible metrics such
  as percentages, counts, or dollar amounts as stronger local evidence than a
  bare keyword.
- Resume/job fit now treats work or project evidence with scope such as work
  across teams, departments, locations, sites, regions, markets, or service
  lines as stronger local evidence than a bare keyword.
- Resume/job fit now treats work or project evidence with ownership or
  management verbs tied to workflows, processes, programs, operations, intake,
  cases, systems, or tools as stronger local evidence than a bare keyword.
- Resume/job fit now treats recognized required seniority language such as
  senior-level experience as a local experience constraint, using visible role,
  leadership, or enough-years evidence before avoiding a hard-requirement cap.
- Resume analysis does not promise employer decisions or response outcomes.

## Backlog

- Expand requirement matrix coverage beyond recognized local keywords into
  richer requirement families and structured job-post parsing.
- Expand hard-constraint caps to safety-critical requirements, severe parsing
  failure, unreadable-history risk, false-claim risk, and generic-resume risk.
- Expand evidence-strength classification beyond current metric-backed,
  scope-backed, and responsibility-backed boosts into missing, bare keyword,
  and duty evidence.
- Expand conservative synonym and acronym matching where equivalence is clear.
- Expand broader recency weighting and section placement signals.
- Expand seniority alignment and add under-leveling warnings.
- Add profession-specific weighting for non-technical and technical roles.
- Keep score labels humble: "fit estimate", "readability check", "review
  priority", or equivalent user-control framing.
