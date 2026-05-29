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
open-source project README patterns.

| Source | Pattern observed | JobSentinel adoption |
| ------ | ---------------- | -------------------- |
| [GitHub Docs, About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes) | README should say what the project does, why it is useful, how to start, where to get help, and who maintains it. | Keep those five questions visible in the first screen and route deeper detail to docs. |
| [Google README guide](https://google.github.io/styleguide/docguide/READMEs.html) | README is a short directory-level summary with status, usage, contacts, and links to deeper docs. | Treat README as map, not full manual. |
| [Diataxis](https://diataxis.fr/) | Separate tutorial, how-to, reference, and explanation needs instead of mixing them into one scroll. | Use README as explanation plus routing; keep how-to depth in `docs/user/` and reference depth in `docs/developer/`. |
| [GOV.UK content design](https://www.gov.uk/guidance/content-design/what-is-content-design) | Start with user needs and make content quick to find, understand, and act on. | Use audience routes for job seekers, reviewers, and contributors. |
| [GOV.UK user needs](https://www.gov.uk/guidance/content-design/user-needs) | Every content unit should meet a valid user need and help complete a task. | Remove vanity sections unless they answer a likely visitor question. |
| [GOV.UK heading guidance](https://design-system.service.gov.uk/styles/headings/) | Headings should create consistent structure and aid navigation. | Use direct H2 labels and avoid nested novelty headings. |
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
| Audience | Is this for me? | Technical and non-technical job seekers, plus reviewers and contributors | Start-here routing table |
| Stakes | Why does it matter? | Ghost jobs, pay opacity, opaque screening, long searches, and privacy risk are product requirements | Research brief and source index |
| Capabilities | What does it do today? | Monitoring, posting-risk review, pay protection, ATS transparency, application tracking, safe reports | Capability map and screenshots |
| Trust | Why should I believe it? | Rule 0, no telemetry, local-first storage, optional external AI, review gates | Privacy docs, AI gateway, harness checks |
| Limits | What will it not do? | No employer-side decisions, no deceptive resume help, no source-boundary evasion, no hidden data sharing | Responsible AI, privacy, scope table |
| Contribution | How do I help? | Build, verify, report, discuss, fork, or reuse | Commands, docs, issue routes, MIT license |

## Current README Audit

The root README should avoid three failure modes:

- **Fact pileup before orientation.** A reader should understand the project
  before seeing deep implementation or release detail.
- **Duplicate proof loops.** Privacy, research, and capability claims should
  appear once in the front-door path, then route to maintained docs.
- **Marketing tone.** Claims should be grounded in current product surfaces,
  evidence, boundaries, and verification, not adjectives.

The corrected structure uses compact front-door sections, then moves deeper
detail into screenshots, privacy, sources, evaluation, download, development,
release notes, FAQ, support, and references.

## README Structure Standard

The root README should keep this order:

1. Project name, required product definition, and core trust badges.
2. One-sentence local-first and external-AI boundary.
3. Audience route table.
4. Research brief and user problem.
5. Current state and capability map tied to product evidence.
6. Trust model, privacy, security, and responsible-AI boundaries.
7. Download and first-run path.
8. Architecture and verification map.
9. Research, roadmap, and limitations.
10. Support, contribution, license, and fork/reuse invitation.
11. External references.

## Badge Policy

Badges should prove current trust signals. Keep badges for CI, docs harness,
version, license, free-forever status, local-first privacy, and no telemetry.
Move stack details such as React, Rust, Tauri, and TypeScript into tables where
they are easier to read and update.

## Quality Bar

- First 120 lines answer what JobSentinel is, who it helps, why it matters, how
  privacy works, and where to go next.
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
