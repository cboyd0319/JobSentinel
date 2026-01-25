# One-Click Apply

**Fill out job applications in seconds, not minutes.**

Tired of typing your name, email, and work history into every single application?
JobSentinel can fill in those forms for you automatically. You just review everything
and click Submit.

![One-Click Apply Settings](../images/one-click-apply.png)

---

## How It Works

1. **You set up your profile once** - Name, email, phone, LinkedIn, etc.
2. **You find a job you like** in JobSentinel
3. **Click "Quick Apply"** - JobSentinel opens the browser and fills the form
4. **You review everything** - Make sure it looks right
5. **You click Submit** - JobSentinel never submits without you

**Important:** You're always in control. JobSentinel fills out forms, but YOU click Submit.
This is intentional - we never apply to jobs without your explicit approval.

---

## Supported Application Systems

JobSentinel works with these popular hiring platforms:

| Platform | Where You'll See It |
|----------|---------------------|
| **Greenhouse** | Most tech companies |
| **Lever** | Startups, mid-size tech |
| **Workday** | Enterprise companies |
| **Taleo** | Large corporations |
| **iCIMS** | Various industries |
| **BambooHR** | Small to medium companies |
| **Ashby** | Modern tech companies |

Don't see your platform? JobSentinel tries generic form filling on unknown sites -
it often works!

---

## Setting Up Your Profile

Before using One-Click Apply, fill in your information:

1. Click **One-Click Apply Settings** in the sidebar
2. Fill out your profile

### What to Fill In

**Contact Info (Required)**

- Full Name (as it appears on your resume)
- Email
- Phone (include country code: +1 for US)

**Links (Recommended)**

- LinkedIn URL
- GitHub URL (for tech roles)
- Portfolio/Website

**Work Authorization**

- Are you authorized to work in the US?
- Do you need visa sponsorship?

These questions appear on almost every application. Setting them once saves a ton of time.

### Automation Settings

- **Max applications per day** - Limits how many forms you can fill (default: 10)
- **Require manual approval** - Shows a preview before filling (recommended: ON)

---

## Screening Questions

Many applications have screening questions beyond basic info:

- "How many years of experience do you have?"
- "What is your expected salary?"
- "Are you willing to relocate?"

You can pre-configure answers for common questions:

1. Go to **Screening Questions** tab in One-Click Apply Settings
2. Click **Add Answer**
3. Enter a pattern and your answer

### Example Patterns

| Pattern | Matches Questions Like... |
|---------|---------------------------|
| `years.*experience` | "How many years of experience..." |
| `salary\|compensation` | "What is your expected salary..." |
| `notice.*period` | "What is your notice period..." |
| `willing.*relocate` | "Are you willing to relocate..." |

The patterns are flexible (regex), so they'll match variations of the same question.

---

## Using Quick Apply

### Step by Step

1. **Find a job** on your dashboard
2. **Look for the ATS badge** (e.g., "Greenhouse", "Lever")
3. **Click "Quick Apply"**
4. **Review the preview** showing what will be filled
5. **Click "Fill Form"** to open the browser
6. **Watch** as fields fill automatically
7. **Complete any manual steps:**
   - Upload your resume
   - Solve CAPTCHAs if they appear
   - Answer any questions that weren't pre-configured
8. **Review everything** one last time
9. **Click Submit** yourself

---

## What Gets Filled vs. What You Do

### JobSentinel Fills

- First name, last name
- Email, phone
- LinkedIn, GitHub, portfolio URLs
- Work authorization (yes/no)
- Sponsorship requirements (yes/no)
- Pre-configured screening answers

### You Complete

- **Resume upload** - Select your file
- **Cover letter** - Paste or upload
- **CAPTCHAs** - Complete human verification
- **Non-standard questions** - Anything not pre-configured
- **Submit button** - Always your click

---

## CAPTCHAs

Some sites show CAPTCHAs to verify you're human. When JobSentinel detects one:

1. The browser pauses
2. You complete the CAPTCHA manually
3. Continue with the rest of the form

This is normal and expected - JobSentinel intentionally doesn't bypass human verification.

---

## Safety Features

### Rate Limiting

By default, you can only fill 10 applications per day. This prevents accidentally
mass-applying to jobs you don't want.

Change this in Settings if you need more.

### Manual Review

When enabled (default), you see a preview before filling ANY form. This shows exactly
what will be entered so you can cancel if something looks wrong.

### No Auto-Submit

JobSentinel **never** clicks the Submit button. This is by design:

- You review all data before submitting
- You catch any errors
- You maintain full control
- Companies can't claim automated submission

---

## Troubleshooting

### Browser doesn't open

1. Make sure Chrome is installed
2. Close any existing Chrome browser instances with debugging enabled
3. Try again

### Fields not filling

1. Check that your profile is saved
2. Wait a few seconds - some forms load dynamically
3. Try clicking into the form first
4. Some sites have unusual forms that don't work well

### Wrong data filled

1. Check your profile for typos
2. Some forms expect different formats (e.g., phone without dashes)
3. Update your profile and try again

### CAPTCHA keeps appearing

Some sites show CAPTCHAs for all automated browsers. Just complete them manually -
that's normal.

---

## Privacy & Ethics

### What We Don't Do

- Never bypass CAPTCHAs or security measures
- Never auto-submit applications
- Never scrape or store your application data
- Never share your profile information

### Your Responsibilities

- Only apply to jobs you actually want
- Review each application before submitting
- Respect company Terms of Service
- Keep your profile information accurate

---

## Technical Details

<details>
<summary><strong>For developers and the curious</strong></summary>

### How It Works

JobSentinel uses Chrome DevTools Protocol (via `chromiumoxide`) to control a visible
Chrome browser. The browser window is intentionally visible so you can watch what's
happening.

### Field Detection

For each ATS platform, we try multiple CSS selectors:

```text
// Example: Greenhouse first name
1. #first_name
2. input[name='first_name']
3. [data-field='first_name']
```

The first selector that finds an element is used.

### Tauri Commands (18 total)

**Profile Management:**

- `upsert_application_profile`
- `get_application_profile`

**Screening Answers:**

- `upsert_screening_answer`
- `get_screening_answers`
- `find_answer_for_question`

**Automation Attempts:**

- `create_automation_attempt`
- `get_automation_attempt`
- `approve_automation_attempt`
- `cancel_automation_attempt`
- `get_pending_attempts`
- `get_automation_stats`

**ATS Detection:**

- `detect_ats_platform`
- `detect_ats_from_html`

**Browser Control:**

- `launch_automation_browser`
- `close_automation_browser`
- `is_browser_running`
- `fill_application_form`

### Database Tables

- `application_profiles` - Your saved profile data
- `screening_answers` - Pre-configured question answers
- `application_attempts` - History of form filling attempts

</details>

---

**Version:** 2.6.3 | **Last Updated:** January 25, 2026
