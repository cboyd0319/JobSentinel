# JobSentinel: Zero-Friction UX Implementation Plan

**Goal:** Make JobSentinel usable by people with ZERO technical knowledge.

**Current State:** Setup requires knowing exact job titles, understanding webhooks, SMTP servers, and browser cookies. Estimated 60% setup completion rate.

**Target State:** Setup in under 2 minutes by picking a career path. 85%+ completion rate.

---

## Phase 1: Career Profile Onboarding (Sprint 1)

**Impact:** Highest - eliminates the #1 barrier to entry

### New Step 0: Career Profile Picker

```
┌─────────────────────────────────────────────────────────────┐
│  What kind of work are you looking for?                     │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ 💻      │  │ 📊      │  │ 📱      │  │ 📈      │        │
│  │Software │  │  Data   │  │Product &│  │Marketing│        │
│  │ & Tech  │  │Analytics│  │ Design  │  │  & SEO  │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ 💼      │  │ 👥      │  │ 💰      │  │ 📋      │        │
│  │ Sales & │  │   HR &  │  │Finance &│  │  Ops &  │        │
│  │Business │  │ People  │  │Accounting│ │  PM     │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐         │
│  │ ✏️      │  │ 🔒      │  │ ⚙️ Custom Setup     │         │
│  │Content &│  │Security │  │ I'll enter my own   │         │
│  │Writing  │  │         │  │ titles and skills   │         │
│  └─────────┘  └─────────┘  └─────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Simplified Wizard Flow

**Before (5 steps, all manual):**
1. Job Titles (manual entry)
2. Skills (manual entry)
3. Location
4. Salary (manual entry)
5. Notifications

**After (4 steps, mostly auto-populated):**
1. **Career Path** (NEW) → Select from 11 profiles
2. **Review & Customize** → Pre-filled titles/skills, allow edits
3. **Location & Salary** → Slider with career-appropriate range
4. **Notifications** → Optional, simplified

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/CareerProfileSelector.tsx` | Grid of career cards with icons |
| `src/components/ProfilePreview.tsx` | Shows "You'll see jobs like..." preview |
| `src/utils/profiles.ts` | Load/parse profile JSON data |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/SetupWizard.tsx` | Add step 0, auto-population logic, consolidate steps |
| `src/App.tsx` | Pass profile data to wizard |

### Backend (Optional Enhancement)

Embed profiles in Tauri binary for faster loading:
- `src-tauri/src/commands/profile.rs` - `list_profiles()`, `load_profile(name)`

---

## Phase 2: Plain English Everywhere (Sprint 2)

**Impact:** High - eliminates confusion for 90% of users

### Jargon Replacement Table

| Technical | Plain English | Help Text |
|-----------|---------------|-----------|
| `Slack Webhook URL` | Slack Notification Link | "Get this from Slack settings" |
| `SMTP Server` | Email Provider | "Gmail, Outlook, etc." |
| `smtp_port` | (hidden) | Auto-detect from provider |
| `li_at cookie` | LinkedIn Connection | Step-by-step guide |
| `title_allowlist` | Job Titles I Want | - |
| `keywords_boost` | My Skills | - |
| `keywords_exclude` | Dealbreakers | - |
| `salary_floor_usd` | Minimum Salary | - |
| `0.85 score` | ⭐⭐⭐⭐ Great Match | - |
| `Scraping...` | Checking for new jobs... | - |

### Contextual Help System

New component for consistent help across app:

```tsx
// src/components/HelpIcon.tsx
<HelpIcon
  content="Get this from Slack → Settings → Webhooks"
  learnMoreUrl="/help/slack-setup"
/>
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/HelpIcon.tsx` | Reusable "?" tooltip component |
| `src/utils/errorMessages.ts` | Human-readable error messages |
| `src/components/SettingsSection.tsx` | Collapsible section with help |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Replace all jargon, add HelpIcons, reorganize into sections |
| `src/components/ScoreDisplay.tsx` | Add star rating + text labels |
| `src/components/NotificationPreferences.tsx` | Simplify labels |

---

## Phase 3: One-Click Notifications (Sprint 3)

**Impact:** Medium-High - notification setup success from ~30% to 75%+

### Card-Based Notification Setup

```
┌──────────────────────────────────────────────────────────────┐
│  How should we notify you about great matches?               │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ 💬 Slack     │  │ 🎮 Discord   │  │ 📧 Email     │       │
│  │              │  │              │  │              │       │
│  │ [Connect]    │  │ [Connect]    │  │ [Set Up]     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🔔 Desktop Notifications                    [ON]    │    │
│  │ Get alerts right on your computer                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ○ Skip - I'll check the app directly                        │
│    (100% private, no external connections needed)            │
└──────────────────────────────────────────────────────────────┘
```

### Test Notification Feature

- "Send Test" button appears after entering webhook/email
- Sends "JobSentinel Test - It works!" message
- Shows success/failure with specific error explanation

### Email Provider Presets

```typescript
// src/utils/emailPresets.ts
const PRESETS = {
  gmail: { server: "smtp.gmail.com", port: 587, help: "Use App Password" },
  outlook: { server: "smtp.office365.com", port: 587 },
  yahoo: { server: "smtp.mail.yahoo.com", port: 587 },
};
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/NotificationSetup.tsx` | Card-based notification picker |
| `src/components/notifications/SlackConnectModal.tsx` | Step-by-step Slack guide |
| `src/components/notifications/EmailSetupModal.tsx` | Email with provider presets |
| `src/utils/emailPresets.ts` | SMTP presets for common providers |
| `src-tauri/src/commands/notifications.rs` | `test_slack()`, `test_email()` |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/SetupWizard.tsx` | Replace step 5 with NotificationSetup |
| `src/pages/Settings.tsx` | Replace notification section |
| `src-tauri/src/commands/mod.rs` | Register test notification commands |

---

## Phase 4: Guided Experience (Sprint 4)

**Impact:** Medium - increases feature discovery by 80%+

### Connect Onboarding Tour

The tour system already exists (`src/components/OnboardingTour.tsx`) but isn't connected!

**Fix:** Add `OnboardingProvider` to app and auto-start after setup.

```tsx
// src/App.tsx
<OnboardingProvider steps={DASHBOARD_TOUR_STEPS}>
  <Dashboard onTourStart={...} />
</OnboardingProvider>
```

### Tour Steps

| Step | Target | Content |
|------|--------|---------|
| 1 | Search button | "Click here to find jobs matching your profile" |
| 2 | Job cards | "These are jobs we found for you. Click to see details" |
| 3 | Filters | "Filter by score, location, or source" |
| 4 | Applications | "Track your applications here" |
| 5 | Settings | "Adjust your job search preferences anytime" |

### Auto-Start Logic

```tsx
// After wizard completes
localStorage.setItem('setupJustCompleted', 'true');

// On Dashboard mount
if (localStorage.getItem('setupJustCompleted')) {
  localStorage.removeItem('setupJustCompleted');
  startTour();
}
```

### Enhanced Empty States

When no jobs found:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    🔍                                       │
│                                                             │
│           No jobs found yet                                 │
│                                                             │
│   We haven't searched for jobs matching your profile yet.   │
│                                                             │
│              [ 🚀 Search Now ]                              │
│                                                             │
│   Not sure what to do? [Take a quick tour]                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/config/tourSteps.ts` | Tour step definitions |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add OnboardingProvider, auto-start logic |
| `src/pages/Dashboard.tsx` | Add TourHelpButton, check setupJustCompleted |
| `src/components/EmptyState.tsx` | Enhanced guidance + tour trigger |

---

## Phase 5: Smart Features (Sprint 5 - Polish)

**Impact:** Medium - makes app feel intelligent

### Human-Readable Scores

| Score | Display |
|-------|---------|
| 90-100% | ⭐⭐⭐⭐⭐ Perfect Match |
| 80-89% | ⭐⭐⭐⭐ Excellent Match |
| 70-79% | ⭐⭐⭐ Great Match |
| 60-69% | ⭐⭐ Good Match |
| <60% | ⭐ Possible Match |

### Company Autocomplete

Replace raw URL inputs with company name search:
- Type "Stripe" → suggests "Stripe" with logo
- We auto-generate Greenhouse/Lever URL

### Salary Slider with Context

```
Minimum Salary: $95,000
├──────────●────────────────┤
$50k                    $200k

💡 Most SEO Managers earn $70k-$150k
```

### Real-Time Scraping Progress

```
🔍 Finding jobs...

✓ LinkedIn (12 jobs)
✓ Indeed (8 jobs)
◐ Greenhouse boards... (3/10)
○ Lever boards

Found 23 jobs so far...
```

### Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/components/CompanyAutocomplete.tsx` | Company search with logos |
| `src/components/SalarySlider.tsx` | Visual salary picker |
| `src/components/ScrapingProgress.tsx` | Real-time progress display |
| `src/utils/smartDefaults.ts` | Career-appropriate defaults |

---

## Implementation Order

| Sprint | Phase | Deliverable | Success Metric |
|--------|-------|-------------|----------------|
| 1 | Phase 1 | Career profile picker | Setup time <2min |
| 2 | Phase 2 | Plain English UI | 0 jargon complaints |
| 3 | Phase 3 | One-click notifications | 75% notification success |
| 4 | Phase 4 | Guided tour | 80% feature discovery |
| 5 | Phase 5 | Smart features | "Feels smart" feedback |

---

## Verification Plan

### Manual Testing
1. **Fresh install test:** Delete config, run app, complete setup as non-technical user
2. **Profile selection:** Verify all 11 profiles load and pre-populate correctly
3. **Notification test:** Verify Slack/Discord/Email test buttons work
4. **Tour test:** Verify tour auto-starts and highlights correct elements

### Automated Testing
- Unit tests for profile loading
- E2E test: Select profile → verify pre-population → complete setup
- Component tests for new UI components

### Usability Testing
- Recruit 3-5 non-technical users
- Measure: time to complete, confusion points, success rate
- Target: 80%+ complete without assistance

---

## Critical Files Summary

**Must understand before implementing:**
1. `src/pages/SetupWizard.tsx` - Current onboarding flow
2. `src/components/OnboardingTour.tsx` - Existing tour system (disconnected)
3. `src/pages/Settings.tsx` - All settings UI (needs jargon removal)
4. `profiles/*.json` - Profile data to integrate
5. `src/App.tsx` - App structure, provider tree

**New files to create:**
- `src/components/CareerProfileSelector.tsx`
- `src/components/HelpIcon.tsx`
- `src/components/NotificationSetup.tsx`
- `src/config/tourSteps.ts`
- `src/utils/profiles.ts`
- `src/utils/errorMessages.ts`
