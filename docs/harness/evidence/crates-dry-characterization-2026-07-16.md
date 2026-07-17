# Crate DRY Characterization

Base revision: `62f7b82d8bba9a11788017abc5adc73bee9e410c`

These contracts were recorded before crate source refactoring. Existing behavior
is preserved unless the correction column names an intentional result.

| Family | Behavior to preserve | Intentional correction | Existing sensors |
| ------ | -------------------- | ---------------------- | ---------------- |
| Job URL handling | Public HTTPS job URLs remain valid. Embedded credentials, local or private targets, fragments, and sensitive or nested query values do not reach storage, logs, or hashes. Non-sensitive identity parameters remain available. | Security owns sensitive query policy. Domain canonicalization adds only job identity rules, and all import paths use it. | Security URL tests, domain normalization tests, storage upsert tests, bookmarklet tests |
| Webhook validation | Webhook URLs require HTTPS, no user information, approved host and path shapes, and no unsafe port or suffix bypass. Current Teams connector and workflow targets remain accepted; base and lookalike hosts remain rejected. | Credentials and notifications consume one security-owned Teams target policy. | Credential validation tests and notification channel webhook tests |
| Title and location normalization | Canonical normalization remains case-insensitive, trims known noise, recognizes remote locations, and preserves already normalized values without allocation where supported. | Salary and market grouping become named analytics buckets instead of competing domain normalizers. | Domain normalization tests, zero-copy application tests, storage salary and market tests |
| Remote inference | Explicit remote evidence is checked before text indicators. Hybrid indicators win over generic remote wording, then remote, onsite, and unspecified remain distinct. | Structured source fields are authoritative. Shared text inference runs only when the source has no structured answer. | Application remote scoring tests and source-specific remote parsing tests |
| SQLite datetime parsing | RFC3339, SQLite UTC timestamps, and ISO timestamps without a zone parse as UTC. Invalid required values return an error; invalid optional values remain absent. | All storage row mappers use one private parser and optional adapter. | Storage application tracking and answer-learning datetime tests |
| HTML text encoding | Ampersand, angle brackets, double quote, and apostrophe encode as `&amp;`, `&lt;`, `&gt;`, `&quot;`, and `&#39;` before untrusted text enters HTML. | Email and document renderers consume one security-owned text encoder. | Notification email rendering tests and document template escaping tests |
| Resume serialization | Existing field names, optional fields, evidence sections, template identifiers, JSON import, HTML, text, and DOCX output remain stable. Persistence identifiers and analysis results remain wrapper metadata. | Documents owns one `StructuredResume` and one complete `TemplateId`; temporary adapters are deleted in the next milestone. | Document export and template tests, storage resume builder and import tests |
| Scraper lifecycle | Successful jobs accumulate, one source failure does not discard other results, timeouts and failures are recorded without raw details, and missing credentials or acknowledgements prevent the request. | Scheduler, browser, federal, and JobsWithGPT workers share one lifecycle runner while source setup and policy checks stay explicit. | Application scheduler and pipeline tests, source parser and failure tests |

## Pre-refactor Commands

All passed on 2026-07-16:

```text
cargo test -p jobsentinel-security -p jobsentinel-credentials -p jobsentinel-notifications
cargo test -p jobsentinel-domain -p jobsentinel-sources -p jobsentinel-application
cargo test -p jobsentinel-storage
cargo test -p jobsentinel-documents
```
