# Security With Less Friction

V3 should be more secure and easier to use at the same time. The goal is not to
add more warnings, prompts, and configuration. The goal is to make the safest
path the simplest path, reduce repeated decisions, and reserve interruption for
moments that genuinely affect privacy, money, credentials, account risk, data
loss, or external side effects.

## Principles

- Secure defaults should be the easy defaults.
- Warnings should be short, specific, and actionable.
- Repeat prompts should become scoped remembered decisions where safe.
- Risky actions need preview and rollback, not scary walls of text.
- Sensitive data should be protected automatically without making users manage
  security concepts.
- Recovery should be built in before a feature ships.
- Security state should be visible in plain language.

## Friction Audit

Before building v3, audit every point where the user is interrupted:

- install warnings
- first-run setup
- vault unlock
- source warnings
- restricted-source acknowledgement
- browser companion pairing
- external AI payload approval
- model download and verification
- backup and restore
- source pack install
- export
- support report
- update and rollback

For each prompt, decide:

- What risk is being reduced?
- Can the app avoid the risk automatically?
- Can the prompt be scoped to a source, pack, provider, or action?
- Can a local acknowledgement version reduce repeat friction?
- Can the copy be shorter?
- Can the app show a safer default and an advanced path?
- Can the action be reversible?

## Security Doctor

V3 should include a plain-language Security Doctor:

- vault status
- backup status
- external AI status
- sensitive-payload opt-in status
- browser companion pairings
- MCP client pairings
- source warnings and acknowledgement versions
- model cache integrity
- source pack signatures
- update and rollback status
- support report safety
- local data location

The doctor should say:

- "Looks good"
- "Needs attention"
- "Paused for your safety"
- "Optional improvement"
- "Repair"
- "Quarantined until verified"

Avoid developer-style output unless expert mode is enabled.

## Privacy Receipts

Every sensitive workflow should produce a receipt:

- what data was used
- where it was stored
- whether anything left the device
- what provider, source, browser, or local tool was involved
- what the user approved
- how to delete or revoke it

Receipts should reduce fear because the user can see what happened.

## Smart Consent

Consent should be scoped and versioned:

- source-specific acknowledgements
- browser companion pairing scopes
- MCP read and write scopes
- provider-specific external AI scopes
- source pack install scopes
- model pack license and download scopes
- export and backup scopes

Remember consent only when:

- behavior has not changed
- warning version has not changed
- source class has not changed
- data categories have not expanded
- destination has not changed
- user can revoke it

Reset consent when any of those change.

## Native Trust Without Lock-In

Use platform trust features to reduce repeated passwords and prompts:

- macOS LocalAuthentication for vault unlock and sensitive actions.
- Windows Hello for vault unlock and sensitive actions.
- Linux Secret Service when available.
- Passkey-style pairing concepts for browser companion and MCP clients.
- Device-bound trust records for local clients.

Fallback:

- passphrase mode
- one-time local pairing code
- recovery sheet
- safe support report

Do not require a specific OS trust feature for core workflows.

## Safer Imports With Less Work

V3 should reduce import friction while improving safety:

- automatic URL token scrubbing
- suspicious domain warnings
- hidden-text and prompt-injection detection
- duplicate detection
- source provenance labels
- one-click "review later" queue
- safe default fields
- quick delete for bad imports
- OCR import review when extraction came from a screenshot or rendered page
- adversarial-posting scan before model, agent, or external-provider use

The user should not have to inspect raw URLs or source internals.

## Prompt-Injection And Adversarial Posting Guard

Job postings, resumes, copied page text, and source fixtures are untrusted input.
V3 should add a guard that looks for:

- hidden text
- zero-size or off-screen text
- model-directed instructions
- encoded or obfuscated instructions
- suspicious links and redirect chains
- source-pack fixture poisoning
- resume prompt-injection patterns

The guard should not block useful workflows by default. It should label risk,
strip hidden or nonvisible content from model prompts when appropriate, route
high-risk text to review, and attach evidence to the case file.

## External AI With Fewer Repeated Prompts

Keep the gateway strict, but reduce needless friction:

- remember provider preference order
- remember public-data-only approval defaults per feature
- preview only changed fields on repeat workflows
- highlight sensitive fields instead of making users read entire payloads
- provide local fallback first
- allow "always require full preview" for cautious users
- allow "compact preview" for reviewed public-data-only features

Never skip approval for sensitive private data unless a future feature has a
specific reviewed sensitive-data contract and the user explicitly enables it.

## Source Security With Less Confusion

Source warnings should say:

- what source is being used
- whether login is involved
- whether JobSentinel stores session material
- what data will be imported
- what the user can do safely
- how to stop or revoke the path

Do not make users understand robots policy, ATS internals, or HTTP status codes.

## Recovery And Repair

Every security-sensitive feature should have a repair path:

- reset vault
- rotate browser companion pairing
- revoke MCP client
- remove source pack
- verify model cache
- delete model cache
- restore backup
- retry migration
- export safe support report
- clear external AI request history
- reset source acknowledgement

Recovery should be visible before users are stuck.

## Threats To Reduce In V3

- local data loss
- accidental private-data export
- credential leakage
- malicious source pack
- malicious or compromised pack registry entry
- malicious browser extension or paired client
- prompt-injection in job postings
- prompt-injection in resumes or pasted content
- hidden external AI payload expansion
- unsafe support reports
- model cache tampering
- source parser drift
- unrestricted shell or filesystem access
- broad Tauri permissions
- unsafe rollback or migration failure

## Friction Metrics

Track in manual tests:

- clicks to first useful workflow
- prompts before first useful workflow
- prompts per restricted-source session
- steps to import a visible job
- steps to log applied
- steps to recover from failed model download
- steps to revoke browser companion
- steps to produce safe support report
- time to restore backup

Security should improve these numbers where possible.

## Release Bar

V3 security is not ready until:

- risky workflows have scoped consent and revocation
- sensitive workflows have privacy receipts
- native trust features have fallbacks
- Security Doctor gives plain repair actions
- source warnings are short and specific
- support reports are safe by default
- model and source packs are verified
- dynamic adapter sandboxes prove no filesystem, shell, credential, database,
  or ambient network access
- adversarial posting tests run before model, agent, or source-pack changes
- migration and rollback protect user data
- every permission has a reason and platform fallback
