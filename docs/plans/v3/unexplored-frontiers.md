# Unexplored Frontiers

This file captures areas that deserve deeper v3 exploration before scope is
frozen. The existing v3 package already covers major refactors, source/browser
strategy, local intelligence, editions, compatibility, and release bars. These
frontiers are additional lanes that could materially change the product.

## Accessibility As Architecture

V3 should treat accessibility as a release architecture requirement, not UI
polish.

Explore:

- WCAG 2.2 mapped to JobSentinel workflows.
- Keyboard-only operation for every core workflow.
- Screen reader-first labels for dashboard, case files, forms, browser
  companion, model setup, source warnings, and tracker actions.
- High zoom and narrow-width layouts for every screen.
- Reduced motion and low-distraction modes.
- Cognitive load review for stressed users.
- Plain-language recovery when a source, model, browser companion, vault, or
  update fails.
- "I'm overwhelmed" mode that cuts the dashboard to the smallest useful next
  actions.

Why it matters:

- Job search is already stressful. V3 should not require perfect attention,
  eyesight, motor control, or technical confidence.

## AI Governance And Employment-Risk Posture

Even though JobSentinel is candidate-side, it still touches hiring workflows.
V3 should map product behavior against current AI and employment-risk guidance.

Explore:

- NIST AI Risk Management Framework mapping for local matching, external AI,
  and agent workflows.
- EU AI Act employment and recruitment risk concepts as a design review lens.
- Clear distinction between candidate-side decision support and employer
  screening.
- Evidence-based explanations instead of hiring probability claims.
- Bias and fairness counterfactual tests for matching and recommendations.
- Human review for every sensitive or external side effect.
- Public docs that explain what JobSentinel does not do.

Why it matters:

- A privacy-first candidate tool should be able to explain its safeguards before
  people or reviewers ask.

## Verifiable Evidence Wallet

The evidence wallet idea needs its own exploration track.

Explore:

- Local storage for certifications, licenses, transcripts, work samples,
  reference checklists, portfolios, and project proof.
- W3C Verifiable Credentials-compatible import and export where relevant.
- Expiration dates, issuer, verification status, and confidence labels.
- Sensitive-document handling for clearances, identity documents, and
  background-check-related material.
- Application packet integration without over-sharing proof.
- Portable export so users are not locked in.

Why it matters:

- Resume claims become stronger when JobSentinel can connect them to local
  evidence without exposing that evidence by default.

## Local-First Multi-Device Sync

V3 needs a better answer than "single machine forever" without becoming a
hosted service.

Explore:

- Encrypted backup to user-chosen storage.
- LAN transfer between trusted devices.
- QR-code pairing.
- Removable-drive export and import.
- Read-only mobile companion.
- Conflict review for job events, notes, reminders, and source packs.
- Device-specific vault keys.
- CRDT or append-only event sync for the local event ledger.

Why it matters:

- Users change computers, use shared machines, and need recovery. Local-first
  should not mean fragile.

## Passkeys And Device Trust

V3 should explore passkey-style trust models for local pairing and sensitive
actions.

Explore:

- WebAuthn/passkey concepts for browser companion pairing.
- Windows Hello and platform authenticators for unlock and sensitive exports.
- macOS LocalAuthentication and Keychain-backed approval for sensitive actions.
- Device-bound trust records for browser extensions, MCP clients, and companion
  devices.
- Step-up confirmation for exports, backup restore, source pack install,
  external AI sensitive sends, and MCP write scopes.

Why it matters:

- Local apps still need strong trust boundaries when multiple local tools,
  browser extensions, and companion devices can connect.

## Mobile Companion Strategy

V3 should decide whether mobile is a first-class extension of the local product.

Explore:

- Tauri mobile feasibility.
- Native read-only companion apps.
- QR-code local pairing.
- Reminder and interview prep flows.
- Quick notes and post-interview debrief.
- No hosted sync by default.
- Clear fallback for users who only want desktop.

Why it matters:

- Job-search reminders and interviews happen away from the desktop, but the
  database should still remain user-owned.

## Referral And Networking Graph

Networking is underexplored compared with sources and resumes.

Explore:

- Local contact graph with recruiter, referral, alumni, coworker, friend,
  hiring-manager, and company relationships.
- Warm-path detection from user-entered contacts and company history.
- Outreach cadence and follow-up reminders.
- Referral ask templates with provenance and context.
- Contact privacy labels and export controls.
- Relationship history attached to opportunity case files.

Why it matters:

- Many strong jobs come from people, not boards. JobSentinel should help without
  uploading a user's network.

## Scam Response Workflows

Detecting scam-like postings is useful. V3 can go further.

Explore:

- Evidence capture for suspicious postings.
- Local blocklist and allowlist.
- Domain reputation notes.
- User-safe reporting links for relevant agencies or platforms.
- Common scam pattern education in plain language.
- Warnings for payment, equipment, identity, check, crypto, and messaging-app
  red flags.

Why it matters:

- Some users need more than a warning. They need a safe next step.

## Financial Runway Planning

This must be optional and sensitive, but it could be very helpful.

Explore:

- Local-only runway calculator.
- Pay floor, benefits, commute, relocation, and deadline pressure integration.
- Search pace recommendations.
- Offer urgency review.
- "Can I accept this?" scenario modeling.
- No financial advice claims.

Why it matters:

- Job decisions are often constrained by money and time. Ignoring that can make
  the product less useful.

## Shared-Computer And Community Access

JobSentinel should serve users in public libraries, workforce centers, schools,
nonprofits, and shared family machines.

Explore:

- Portable/no-admin install.
- Fast local lock.
- Clear local data location and delete controls.
- Session cleanup mode.
- Coach-assisted export and safe report.
- Essentials package as the default shared-computer recommendation.
- No cloud account requirement.

Why it matters:

- The people who need job-search help most may not have a dedicated high-end
  computer.

## Public-Sector, Trades, Healthcare, And Education Modes

V3 should not stay tech/SaaS-centered.

Explore:

- Public-sector application timelines and requirements.
- Union and apprenticeship source packs.
- Licensure and certification-heavy workflows.
- Healthcare shift, credential, and location constraints.
- Education, school district, and university job boards.
- Federal, state, county, city, and agency application forms.

Why it matters:

- Different job markets have different evidence, sources, and application
  workflows.

## Competitive Benchmark

V3 should be tested against what users actually use today.

Explore:

- Spreadsheet baseline.
- Huntr, Teal, Simplify, Jobscan, browser extensions, and public job scrapers.
- Time-to-first-use.
- Manual data-entry burden.
- Resume evidence quality.
- Source coverage.
- Privacy posture.
- Recovery from failure.
- Nontechnical user success.

Why it matters:

- "Better" should be measurable against real alternatives, not only against
  previous JobSentinel versions.

## References

- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [EU AI Act overview](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
- [W3C Verifiable Credentials Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [W3C WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/)
- [Ink and Switch local-first software](https://www.inkandswitch.com/local-first-software/)
- [Tauri mobile documentation](https://v2.tauri.app/start/prerequisites/#mobile)
