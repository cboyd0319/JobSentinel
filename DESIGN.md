---
version: "alpha"
name: "JobSentinel Quiet Shield"
description: "Design system for a calm, local-first job-search assistant that protects user time, privacy, and pay leverage."
colors:
  bg: "#0B1020"
  surface-1: "#111827"
  surface-2: "#1F2937"
  surface-3: "#273449"
  border: "#334155"
  border-strong: "#475569"
  text-primary: "#F8FAFC"
  text-secondary: "#CBD5E1"
  text-muted: "#94A3B8"
  primary: "#2DD4BF"
  brand: "#2DD4BF"
  brand-hover: "#5EEAD4"
  brand-soft: "#0F3F3A"
  success: "#22C55E"
  warning: "#FBBF24"
  danger: "#F87171"
  info: "#38BDF8"
  purple: "#A78BFA"
  light-bg: "#F6F8F7"
  light-surface-1: "#FFFFFF"
  light-surface-2: "#EEF3F1"
  light-border: "#D6E0DC"
  light-text-primary: "#111827"
  light-text-secondary: "#374151"
  light-text-muted: "#6B7280"
  light-brand: "#0F766E"
  light-brand-hover: "#0D9488"
  light-brand-soft: "#CCFBF1"
typography:
  h1:
    fontFamily: "Inter, IBM Plex Sans, Source Sans 3, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: "700"
    lineHeight: "1.15"
    letterSpacing: "0px"
  h2:
    fontFamily: "Inter, IBM Plex Sans, Source Sans 3, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: "650"
    lineHeight: "1.2"
    letterSpacing: "0px"
  h3:
    fontFamily: "Inter, IBM Plex Sans, Source Sans 3, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: "650"
    lineHeight: "1.3"
    letterSpacing: "0px"
  body:
    fontFamily: "Inter, IBM Plex Sans, Source Sans 3, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: "400"
    lineHeight: "1.5"
    letterSpacing: "0px"
  body-sm:
    fontFamily: "Inter, IBM Plex Sans, Source Sans 3, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "1.45"
    letterSpacing: "0px"
  label:
    fontFamily: "Inter, IBM Plex Sans, Source Sans 3, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: "650"
    lineHeight: "1.3"
    letterSpacing: "0px"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  overlay: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
  "3xl": "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-caution:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.bg}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.bg}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.xl}"
  chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
  modal:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.overlay}"
    padding: "{spacing.xl}"
  app-shell:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text-primary}"
  page-header:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text-secondary}"
  quiet-divider:
    backgroundColor: "{colors.border}"
    height: "1px"
  strong-divider:
    backgroundColor: "{colors.border-strong}"
    height: "1px"
  muted-help-text:
    textColor: "{colors.text-muted}"
  focus-ring:
    backgroundColor: "{colors.brand-hover}"
  privacy-badge:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand}"
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.bg}"
  info-callout:
    backgroundColor: "{colors.info}"
    textColor: "{colors.bg}"
  application-chip:
    backgroundColor: "{colors.purple}"
    textColor: "{colors.bg}"
  light-shell:
    backgroundColor: "{colors.light-bg}"
    textColor: "{colors.light-text-primary}"
  light-card:
    backgroundColor: "{colors.light-surface-1}"
    textColor: "{colors.light-text-secondary}"
  light-divider:
    backgroundColor: "{colors.light-border}"
    height: "1px"
  light-muted-row:
    backgroundColor: "{colors.light-surface-2}"
  light-muted-text:
    textColor: "{colors.light-text-muted}"
  light-primary-button:
    backgroundColor: "{colors.light-brand}"
    textColor: "{colors.light-surface-1}"
  light-focus-ring:
    backgroundColor: "{colors.light-brand-hover}"
  light-privacy-badge:
    backgroundColor: "{colors.light-brand-soft}"
    textColor: "{colors.light-brand}"
---

## Overview

JobSentinel should feel like a quiet shield: a calm, private, protective
workspace for navigating a difficult job market. It is serious without being
cold, warm without cheerleading, and useful without becoming a productivity
game.

The design exists to protect user time, privacy, attention, and pay leverage.
It should help job seekers answer practical questions:

- Is this role real?
- Is it worth applying?
- Is it fresh?
- Does it meet my pay floor?
- Does my resume support this role?
- Should I verify before tailoring?

Avoid generic job-board polish, resume keyword-grinder fear tactics, mass-apply
funnels, and celebratory dashboards. Someone deep in a job search needs signal,
control, and clear next actions.

## Colors

Protective Navy is the target dark theme. Navy carries the privacy and
protection tone; teal marks primary action and source confidence. Slate creates
layering. Amber is reserved for caution, ambiguity, stale postings, and ghost
risk. Red is reserved for destructive actions, scams, dangerous risk, and true
failure states.

- **Background** `{colors.bg}` anchors the app in a calm, non-terminal dark
  workspace.
- **Surfaces** `{colors.surface-1}`, `{colors.surface-2}`, and
  `{colors.surface-3}` create hierarchy through contrast, not glow.
- **Brand teal** `{colors.brand}` is for main actions, privacy-positive cues,
  source confidence, and high-match states.
- **Amber** `{colors.warning}` never means high match. It means verify,
  caution, stale, missing evidence, or ambiguity.
- **Red** `{colors.danger}` means destructive, unsafe, scam-like, or failed.
- **Info blue** `{colors.info}` supports neutral explanatory states, source
  metadata, and secondary evidence.
- **Purple** `{colors.purple}` may support application progress or secondary
  category marks, but should stay sparse.

Light theme uses quiet off-white surfaces and teal action colors. It should
feel like the same protective product in daylight, not a separate cheerful app.

## Typography

Use a clean, highly readable sans-serif: Inter first, then IBM Plex Sans,
Source Sans 3, and system UI fallbacks. Text must be functional and calm.

Use sentence case. Avoid all-caps except small labels like "Quick actions" or
section metadata. Do not scale font size with viewport width. Letter spacing
must stay `0`.

Headings should be proportional to the workspace. Dashboard and page titles may
use `{typography.h1}` or `{typography.h2}`. Cards, side panels, settings
groups, dialogs, and tool surfaces should use compact headings, usually
`{typography.h3}` or smaller.

Copy should explain evidence, not mystify scores. Prefer:

> Strong match because your resume overlaps with SEO, Google Analytics, and
> Shopify. Missing evidence: team leadership and paid search.

Avoid:

> This job is a 78% match.

## Layout

Core actions stay visible, but the interface should not become a command
center wall. Use progressive disclosure for advanced controls and keep repeated
workflows efficient for scanning, comparison, and review.

Spacing follows `{spacing.xs}` through `{spacing.3xl}`. Prefer dense but calm
operational layouts over marketing-style sections. Cards may present repeated
items, modal content, or genuinely framed tools. Do not place cards inside
cards.

Responsive layouts must never create horizontal page scroll. Fixed-format
controls like boards, rows, filters, chips, counters, and toolbars need stable
dimensions or wrapping behavior. Long job titles, company names, file names,
resume names, URLs, and saved-answer text must wrap without clipping.

Navigation should remain quiet and stable:

- Sidebar icons need accessible labels and visible active states.
- Larger layouts may show labels where space allows.
- Keyboard shortcuts help power users but must not be required.
- Back navigation should be obvious on secondary pages.

## Elevation & Depth

Depth is subtle. Separate layers with surface contrast, borders, spacing, and
restrained shadow. Avoid neon outlines, glass effects, heavy glow, bokeh,
gradient blobs, and decorative orbs.

Use shadow only when it clarifies modality or overlay depth. Content cards
should often rely on border plus surface contrast.

## Shapes

Cards use `{rounded.md}` by default. Small controls use `{rounded.sm}` or
`{rounded.md}`. Modals and major overlays may use `{rounded.overlay}` when
that matches existing UI. Avoid pill-heavy pages where every element has the
same roundness and color weight.

Shape should clarify function:

- Buttons are clear commands.
- Chips are metadata.
- Toggles are binary settings.
- Sliders and inputs are numeric or text controls.
- Tabs are view switches.
- Modals are focused interruptions.

## Components

Primary buttons use teal and should map to the main next action: Search Now,
Save Job, Review Match, Check Pay Range, or Use these skills to sort jobs.

Secondary buttons are supporting actions: Import, Export, Select, View Details,
See what JobSentinel read, Copy Safe Support Report.

Caution buttons and badges use amber only when a user should verify something:
stale posting, weak source evidence, missing salary, ghost risk, or ambiguous
screening detail.

Danger buttons use red only for destructive or high-risk actions: Delete,
Remove Resume, Clear All Data, or confirmed unsafe posting states.

Cards should have a clear title, secondary context, one main action, and
metadata rows only when they help decisions. Do not make every card visually
loud.

Chips and badges are metadata, not decoration. Useful chips include Remote,
Greenhouse, first seen, last seen, pay range, high match, possible stale,
salary missing, source verified, and needs review.

Tooltips must be practical. A tooltip should explain what the product reviewed
or what will happen next, not restate the label.

Empty states should be calm and useful:

> No resume uploaded. Add a resume to review fit locally.

Avoid motivational filler:

> Supercharge your job search!

## Do's and Don'ts

- **Do** design for technical and non-technical job seekers.
- **Do** make privacy, source evidence, pay floors, and user review visible.
- **Do** keep external AI optional, preview-gated, cancellable, and disabled by
  default.
- **Do** show evidence behind scores, risk labels, salary warnings, and fit
  estimates.
- **Do** keep alert, settings, and credential copy plain enough for users who
  do not debug software.
- **Do** test keyboard, focus order, accessible names, live regions, empty
  states, loading states, error states, and narrow widths for UI changes.
- **Don't** use yellow or amber for high match.
- **Don't** gamify rejection or application volume.
- **Don't** imply JobSentinel submits applications for the user.
- **Don't** encourage spam, deceptive resume optimization, hidden keyword
  stuffing, ATS manipulation, CAPTCHA bypass, or platform-control evasion.
- **Don't** use hero-scale typography inside compact panels or dashboards.
- **Don't** let long user data, file names, URLs, chips, or controls force
  horizontal scrolling.
- **Don't** introduce telemetry, cloud sync, hosted accounts, or external AI
  dependencies as design assumptions.

## Implementation Status

This document is the design source of truth for new UI and for future theme
work. The current app still contains older green-heavy surfaces while it moves
toward Protective Navy. Do not claim a full visual-theme migration until the
theme tokens, contrast checks, screenshots, and native Computer Use validation
prove it.

When this design conflicts with local implementation, prefer a small, verified
migration step over broad visual churn. Privacy, security, accessibility, and
clear user control take priority over decoration.
