---
name: networking-outreach
description: Draft truthful recruiter, referral, alumni, community, and warm-contact outreach for a job search. Use when asking for introductions, following up on conversations, replying to recruiters, requesting role context, or writing concise networking messages without spam or exaggeration.
license: MIT
metadata:
  jobsentinel_version_target: "2.9.0"
---

# Networking Outreach

Use this skill to turn a job seeker’s real background and target role into
short, respectful outreach messages the user can review and send manually.

## Inputs

Use the target role, company, relationship to the contact, relevant resume
evidence, shared context, preferred channel, and the user’s boundaries.

## Workflow

1. Identify the outreach goal: referral request, role context, recruiter reply,
   alumni note, community follow-up, informational chat, or thank-you.
2. Separate confirmed facts from assumptions.
3. Pick the channel: email, LinkedIn message, text, recruiter reply, referral
   ask, community DM, or follow-up. Match length and tone to the channel.
4. Pick one clear ask, such as a brief call, a role-context question, a referral
   path, or permission to share a resume.
5. Draft a message with:
   - a specific reason for contacting this person;
   - one sentence of truthful fit evidence;
   - a low-pressure ask;
   - an easy opt-out.
6. Keep follow-ups spaced and useful. If there is no new reason to follow up,
   recommend pausing instead of sending another note.
7. Avoid over-polished AI phrasing such as generic excitement, vague flattery,
   or unsupported "unique fit" claims.
8. End with a send-review checklist: recipient, channel, role URL, factual
   claims, attachments, links, salary/location/visa/timing details, and
   confidential information.

## Load References

- Load `references/channel-patterns.md` for email, LinkedIn, text, recruiter
  reply, referral ask, and follow-up variants.

## Output

Produce:

- Outreach goal and contact context.
- Message draft.
- Optional shorter version.
- Follow-up timing.
- Questions or facts the user must confirm before sending.
- Send-review checklist.

Use `assets/outreach-note-template.md` for reusable message notes.

## Handoff

- Use `$application-tracking` after a message is sent, paused, answered, or
  converted to an application, referral, screen, or interview.
- Use `$resume-tailoring` before attaching or sharing a resume for a specific
  role.
- Use `$interview-prep` after a recruiter or contact schedules a screen,
  interview, panel, or work sample.
- Use `$offer-pay-review` if outreach turns into compensation, deadline, or
  competing-offer discussion.

## Guardrails

- Do not invent referrals, relationships, endorsements, achievements, metrics,
  credentials, interviews, offers, or employer interest.
- Do not imply a closer relationship than the user actually has.
- Do not send messages automatically.
- Do not scrape contact lists, collect session cookies, or automate account
  activity on LinkedIn or other restricted platforms.
- Do not pressure contacts or hide the job-search purpose.
- Keep private salary floors, personal circumstances, and application history
  out of outreach unless the user explicitly chooses to include them.
