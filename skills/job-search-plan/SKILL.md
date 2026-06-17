---
name: job-search-plan
description: Build a focused job-search plan, weekly search loop, target-role list, source mix, outreach plan, and application pacing. Use when a user needs urgent job-search structure, search strategy, source selection, daily tasks, or a plan that works for technical and non-technical roles.
license: MIT
metadata:
  jobsentinel_version_target: "2.9.0"
---

# Job Search Plan

Use this skill to turn vague job-search urgency into a concrete, reviewable
plan. Keep the plan practical, privacy-first, and broad enough for technical
and non-technical roles.

## Inputs

Ask only for missing details that change the plan:

- Target roles or job families.
- Location, remote, hybrid, onsite, schedule, and travel constraints.
- Salary floor or minimum acceptable range, if the user wants to share it.
- Must-have constraints such as authorization, commute, hours, certifications,
  physical requirements, or caregiving schedule.
- Existing resume, LinkedIn profile, portfolio, work samples, or saved jobs.
- Urgency window and realistic daily time budget.

## Workflow

1. Separate must-haves from preferences.
2. Pick 2-4 target role lanes, not an unlimited title list.
3. Create a source mix:
   - official employer or application-platform pages first;
   - trusted job boards and saved searches second;
   - user-opened LinkedIn searches or user-provided LinkedIn job pages only;
   - recruiter, referral, alumni, community, and local-network routes where
     relevant.
4. Define a daily loop with time boxes for search, posting review, tailoring,
   applications, follow-up, and interview prep.
5. Set a quality bar before tailoring: role fit, pay evidence, source strength,
   commute/schedule, and hard requirements.
6. Define stop rules for weak lanes or sources:
   - pause lanes with low evidence fit after one weekly review;
   - retire sources that produce stale, duplicate, low-pay, or weak-source roles;
   - switch effort toward referrals, employer pages, or adjacent titles when
     response rate or fit quality stays poor.
7. Replan from the tracker weekly: compare applications, responses, interviews,
   skips, no-response items, and source quality before changing pace.
8. Make the output actionable for the next 7 days.

## Load References

- Load `references/weekly-review-rubric.md` when the user asks for a weekly
  review, replan, source audit, or tracker-based search adjustment.

## Output

Produce:

- Search lanes.
- Must-have filters.
- Source plan.
- Daily operating loop.
- Application pacing guidance.
- Follow-up and review cadence.
- Next 10 actions.

Use `assets/search-plan-template.md` when the user wants a reusable plan.

## Handoff

- Use `$job-posting-risk-review` before tailoring a saved role.
- Use `$resume-tailoring` only after the role passes the must-have and risk
  review.
- Use `$application-tracking` after each save, skip, apply, follow-up, or weekly
  review.
- Use `$networking-outreach` when a warm path, recruiter reply, or referral ask
  is the better next action than another cold application.

## Guardrails

- Do not recommend application volume as the main strategy.
- Do not tell the user to hide, invent, or exaggerate experience.
- Do not automate restricted job-site access or account activity.
- Do not send resumes, salary floors, private notes, or application history to
  outside services without explicit user approval.
- Treat the plan as a working document. Revise it when evidence changes.
