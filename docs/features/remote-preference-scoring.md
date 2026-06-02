# Remote And Work-Mode Matching

JobSentinel uses remote, hybrid, and on-site preferences as guidance instead of
treating every mismatch as an automatic rejection.

This matters because work mode is often a real constraint. Commute, disability,
caregiving, schedule, transportation, privacy, and local labor-market options
can all change whether a job is worth reviewing.

## What Users Control

Users choose which work modes are acceptable:

- Remote.
- Hybrid.
- On-site.

Choosing more than one mode keeps more jobs visible. Choosing only one mode
makes JobSentinel treat that mode as a stronger preference.

## What JobSentinel Looks At

JobSentinel reads work-mode signals from:

- A clear remote, hybrid, or on-site label from the job source, when one exists.
- The location line, such as "Remote", "Hybrid", or a city and state.
- The job title, when it clearly names remote work.
- The posting text, when it clearly describes work from home, hybrid days, an
  office requirement, travel, or a required location.

If a posting does not clearly say how work is handled, JobSentinel keeps it
visible and marks the work mode as uncertain instead of pretending it knows.

## How Matching Behaves

| User choice | Job posting says | JobSentinel behavior |
| ----------- | ---------------- | -------------------- |
| Remote only | Remote | Treats as a strong location fit |
| Remote only | Hybrid or on-site | Keeps visible but lowers location fit |
| Remote preferred | Remote | Treats as strongest location fit |
| Remote preferred | Hybrid | Keeps visible as a possible fit |
| Hybrid preferred | Hybrid | Treats as strongest location fit |
| On-site preferred | On-site | Treats as strongest location fit |
| Flexible | Remote, hybrid, or on-site | Treats each mode as acceptable |
| Any choice | Not stated | Keeps visible and shows uncertainty |

The goal is to reduce false negatives. A job seeker should not lose a useful
role only because a posting uses vague wording, but a hard constraint should
still be visible when a role conflicts with it.

## Protective Copy Rules

Remote and work-mode copy should:

- Say what the posting appears to state.
- Separate "not stated" from "not allowed."
- Avoid shaming users for commute, schedule, disability, caregiving, or
  transportation constraints.
- Avoid implying JobSentinel knows more than the posting says.
- Keep uncertainty visible when the text is thin or contradictory.

Examples:

- "Remote fit is strong."
- "Hybrid may work, but check commute and required office days."
- "Work mode is not clear. Verify before tailoring."
- "On-site conflicts with your saved preference."

## Settings

Users can change work-mode preferences in setup or Settings. These preferences
affect match strength and explanations. They do not send data outside the
device and they do not require external AI.
