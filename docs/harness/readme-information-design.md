# README Information Design

Research date: 2026-05-29.

This standard keeps the root README useful as a public front door, grant-review
artifact, product brief, and contributor map. The README should help a visitor
answer four questions quickly:

- What is JobSentinel?
- Who does it help?
- Why should I trust it?
- Where do I go next?

## Source Pool

The source pool combines README guidance, content-design guidance, and mature
open-source project README patterns. Any major README redesign must check at
least 10 sources, including at least six mature project READMEs and at least
two neutral documentation or content-design guides. The 2026-05-29 front-door
correction checked GitHub Docs, Google README guidance, Google documentation
best practices, Diataxis, GOV.UK content design, Kubernetes, AlphaFold,
TensorFlow, PyTorch, scikit-learn, Visual Studio Code, and Rust.

| Source | Pattern observed | JobSentinel adoption |
| ------ | ---------------- | -------------------- |
| [GitHub Docs, About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes) | README should say what the project does, why it is useful, how to start, where to get help, and who maintains it. | Keep those five questions visible in the first screen and route deeper detail to docs. |
| [Google README guide](https://google.github.io/styleguide/docguide/READMEs.html) | README is a short directory-level summary with status, usage, contacts, and links to deeper docs. | Treat README as map, not full manual. |
| [Google documentation best practices](https://google.github.io/styleguide/docguide/best_practices.html) | README should orient new users, point to deeper guides, and avoid duplicating common docs. | Keep root README as orientation and proof map, not a duplicated manual. |
| [Diataxis](https://diataxis.fr/) | Separate tutorial, how-to, reference, and explanation needs instead of mixing them into one scroll. | Use README as explanation plus routing; keep how-to depth in `docs/user/` and reference depth in `docs/developer/`. |
| [GOV.UK content design](https://www.gov.uk/guidance/content-design/what-is-content-design) | Start with user needs and make content quick to find, understand, and act on. | Use audience routes for job seekers, reviewers, and contributors. |
| [GOV.UK user needs](https://www.gov.uk/guidance/content-design/user-needs) | Every content unit should meet a valid user need and help complete a task. | Remove vanity sections unless they answer a likely visitor question. |
| [GOV.UK heading guidance](https://design-system.service.gov.uk/styles/headings/) | Headings should create consistent structure and aid navigation. | Use direct H2 labels and avoid nested novelty headings. |
| [Digital.gov heading guidance](https://digital.gov/guides/plain-language/design/headings) | Question and statement headings help readers scan for known needs; vague topic headings slow action. | Use direct section names such as "Project Thesis", "Reader Map", and "Download and first run". |
| [DHS plain language guidance](https://www.dhs.gov/digital-experience/plain-language) | Organize logically, make content easy to scan, and use headings. | Prefer short tables, task labels, and plain-language summaries. |
| [Kubernetes README](https://github.com/kubernetes/kubernetes) | Short project identity, clear start paths, support, governance, and roadmap links. | Keep high-level governance and roadmap links near top. |
| [AlphaFold README](https://github.com/google-deepmind/alphafold) | Research projects state package scope, citation/use expectations, install limits, and first-run path. | Make research boundaries and limitations explicit, not buried. |
| [TensorFlow README](https://github.com/tensorflow/tensorflow) | Strong opening definition, badges, install path, first program, docs, community, and support. | Pair status signals with concrete next actions. |
| [PyTorch README](https://github.com/pytorch/pytorch) | Clear feature bullets, health signal link, installation, getting started, resources, communication, and license. | Use capabilities as proof, not marketing adjectives. |
| [scikit-learn README](https://github.com/scikit-learn/scikit-learn) | Brief identity, maintenance status, install path, important links, source, testing, and contribution path. | Surface maintenance, release, and contribution routes plainly. |
| [DuckDB README](https://github.com/duckdb/duckdb) | Compact statement of value, install pointer, reference docs, development, and support. | Keep top-level text tight and avoid restating every doc. |
| [OpenTelemetry Collector README](https://github.com/open-telemetry/opentelemetry-collector) | Header links, project objectives, community, stability, and extension points. | Make objectives and boundaries scannable. |
| [Rust README](https://github.com/rust-lang/rust) | Front-door navigation, concise purpose, why section, quick start, help, contribution, and license. | Keep license/free commitment and help paths visible. |
| [Apache Spark README](https://github.com/apache/spark) | Short project scope, official docs, build status, build commands, and contribution links. | Use README to point to official docs and verification instead of duplicating them. |
| [Apache Airflow README](https://github.com/apache/airflow) | Mature project README combines a strong identity, supported integrations, community routes, and release signals. | Keep capability proof tied to maintained docs and support paths. |
| [Hugging Face Transformers README](https://github.com/huggingface/transformers) | Large project README uses a clear promise, quick install, examples, model scope, and community pathways. | Keep JobSentinel's front door outcome-led, then route implementation depth elsewhere. |
| [Ray README](https://github.com/ray-project/ray) | Complex technical project presents product scope, ecosystem map, docs links, and contribution paths without burying the opening definition. | Keep architecture and verification visible but secondary to user value and trust. |
| [Electron README](https://github.com/electron/electron) | Desktop framework README quickly establishes product identity, install path, platform purpose, docs, community, and contribution links. | Keep desktop-app identity and install paths clear before deep implementation detail. |
| [Visual Studio Code README](https://github.com/microsoft/vscode) | Mature desktop-product README pairs a strong product definition with first-run instructions, development links, community, license, and support. | Make JobSentinel credible for non-engineer users and technical contributors without mixing their tasks. |

## Information Design Model

Use a proof ladder:

1. **Identity:** one sentence says what JobSentinel is.
2. **Promise:** local-first, privacy-first, free forever, broad-audience.
3. **Problem:** ghost jobs, pay opacity, opaque screening, long searches.
4. **Product answer:** official-source monitoring, ghost-job detection, ATS
   transparency, salary transparency, pay-equity support, local tracking.
5. **Trust proof:** Rule 0, no telemetry, optional external AI gateway, research
   sources, tests, harness, license.
6. **Next action:** download, read quick start, review research, contribute, or
   open a safe issue report.

## README Design System

Use this question-answer-proof-path pattern for each major section:

| Section role | Reader question | Required answer | Proof or path |
| ------------ | --------------- | --------------- | ------------- |
| Identity | What is this? | Open-source, local-first job-search assistant for real, relevant, fairly compensated work | Product definition, badges, license |
| Audience | Is this for me? | Technical and non-technical job seekers, plus reviewers and contributors | Reader map table |
| Stakes | Why does it matter? | Ghost jobs, pay opacity, opaque screening, long searches, and privacy risk are product requirements | Research brief and source index |
| Capabilities | What does it do today? | Monitoring, posting-risk review, pay protection, ATS transparency, application tracking, safe support reports | Capability map and screenshots |
| Trust | Why should I believe it? | Rule 0, no telemetry, local-first storage, optional external AI, review gates | Privacy docs, AI gateway, harness checks |
| Limits | What will it not do? | No employer-side decisions, no deceptive resume help, no source-boundary evasion, no hidden data sharing | Responsible AI, privacy, scope table |
| Contribution | How do I help? | Build, verify, report, discuss, fork, or reuse | Commands, docs, issue routes, MIT license |

## Current README Audit

The root README should avoid these failure modes:

- **Research wall before product proof.** A reader should understand the
  desktop product, see a real screen, and find a next action before parsing a
  full research agenda.
- **Primary action latency.** Download, quick start, privacy, research, roadmap,
  and issue routes must appear before the first H2.
- **Hero-shot burial.** Desktop software needs immediate visual proof; keep the
  dashboard screenshot near the top.
- **Duplicate trust loops.** Privacy, AI, Rule 0, free-forever licensing, and
  research claims should appear once in the front-door path, then route to
  maintained docs.
- **Low-signal status facts.** Stack details belong in architecture and
  developer sections, not in the first-screen value proposition.
- **Badge noise.** Badges should signal project state and hard commitments, not
  replace readable governing text.
- **Marketing tone.** Claims should be grounded in current product surfaces,
  evidence, boundaries, and verification, not adjectives.
- **Reference sprawl above the footer.** The root README must keep the complete
  source index at the bottom by project decision, but all narrative sections
  should route to it instead of duplicating citations inline.

The current correction treats "what do I do next?" as a first-screen
requirement and "why should I trust it?" as a front-door proof requirement. A
serious project README needs immediate routes for job seekers, reviewers,
privacy/security readers, contributors, and people reporting problems before it
asks them to parse release notes or developer commands.

## Applied Redesign

The root README uses professional research-project front matter without burying
the product:

1. Required product definition and restrained trust badges.
2. First-screen routes for download, quick start, privacy, research, roadmap,
   and issue reporting.
3. Dashboard screenshot before dense research tables.
4. Abstract with audience, research thesis, local-first posture, Rule 0,
   optional external-AI boundary, and free-forever MIT commitment.
5. At-a-glance table for audience, optimization target, local data, external
   paths, AI requirement, license, and release.
6. Reader map for job seekers, grant or research reviewers, privacy or security
   reviewers, contributors, and people reporting problems.
7. Product response table mapping job-seeker problems to inspectable evidence
   or boundaries.
8. Download and first-run path before deep architecture or source coverage.
9. Safety model for privacy, external channels, external AI, candidate-side
   framing, protective tone, and license posture.
10. Research model for the six design pillars and synthetic-data-first
    evaluation.
11. Architecture, screenshots, data boundaries, source coverage, limitations,
    build, verification, release notes, FAQ, support, and complete references.

## Front-Door Structure

The README front door must read like a professional research project brief
and usable desktop-product entrypoint before it reads like a developer manual:

1. Required product definition.
2. Trust badges.
3. Start-here route line.
4. Dashboard screenshot.
5. Abstract for broad-audience readers.
6. Local-first and optional external-AI boundary.
7. Rule 0 privacy and security commitment.
8. Free-forever MIT license and reuse invitation.
9. At-a-glance table.
10. Audience route table.
11. Product response and evidence table.
12. Download and first-run path.
13. Safety model.
14. Research model and evaluation questions.
15. System design and maintenance map.

## README Structure Standard

The root README should keep this order:

1. Project name, required product definition, and core trust badges.
2. First-screen route line for the main visitor tasks.
3. Dashboard screenshot.
4. Abstract: who it helps, what outcome it targets, what stays local, what AI
   cannot do silently, and why Rule 0 governs the repo.
5. At-a-glance table.
6. Reader route table.
7. Product response and evidence table.
8. Download and first-run path.
9. Safety model, privacy, security, and responsible-AI boundaries.
10. Research model and evaluation questions.
11. Architecture and maintenance map.
12. Interface overview and data boundaries.
13. Source coverage.
14. Scope, limitations, build, keyboard shortcuts, development, release notes,
    FAQ, support, and references.

## Section Budget

Keep the first screen crisp and proof-bearing:

| Zone | Budget | Required job |
| ---- | ------ | ------------ |
| Title and badges | 10 lines | Establish status, release, license, Rule 0, local-first posture, no telemetry, optional AI, and research backing. |
| Route line | 4 links plus issue route | Give each high-probability visitor an immediate next step. |
| Dashboard screenshot | 1 image | Prove this is a real desktop product before research detail. |
| Abstract | 6 short paragraphs or fewer | Say who JobSentinel helps, what it does, what stays local, why privacy is release-blocking, how external AI works, and why the code stays free. |
| At-a-glance table | 7 rows or fewer | Answer fit, purpose, local data, external data, AI requirement, license, and release. |
| Reader map | 5 rows | Route job seekers, reviewers, privacy/security readers, contributors, and support requests. |
| Product table | 6 rows or fewer | Tie job-seeker harms to product responses and proof paths. |

## Badge Policy

Badges should prove current trust signals without creating visual noise. Keep
badges for CI, docs harness, release, MIT license, Rule 0, local-first privacy,
no telemetry, optional external AI, and research backing. The release badge
should use the current GitHub release signal rather than a static version
string. Put free-forever and Rule 0 commitments in the abstract where they can
be read as governing text, not only as badges. Move stack details such as React,
Rust, Tauri, and TypeScript into architecture or developer tables where they are
easier to read and update.

## Quality Bar

- First 120 lines answer what JobSentinel is, who it helps, what it looks like,
  how privacy works, and where to go next.
- Headings are direct and task-oriented.
- No section exists only because similar projects have one.
- Details use progressive disclosure with links or `<details>` blocks.
- Grant-facing research claims point to research docs or source index.
- User-facing claims avoid hiring-system manipulation framing.
- Free-forever MIT license commitment is visible without scrolling far.
- Rule 0 is visible and framed as release-blocking.
- External AI remains optional, disabled by default, and gateway-bound.
- Reference index remains complete when new external sources enter maintained
  docs.
