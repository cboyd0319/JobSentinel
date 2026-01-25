# Settings.tsx Migration Guide

Step-by-step guide to refactor Settings.tsx using the new reusable components.

## Step 1: Add Import

At the top of `/Users/c/Documents/GitHub/JobSentinel/src/pages/Settings.tsx`, add:

```tsx
import { FilterListInput, SecureCredentialInput } from "../components/settings";
```

## Step 2: Remove Local State Variables

These state variables are now handled internally by FilterListInput:

**REMOVE:**

```tsx
const [titleInput, setTitleInput] = useState("");
const [blockedTitleInput, setBlockedTitleInput] = useState("");
const [skillInput, setSkillInput] = useState("");
const [excludeKeywordInput, setExcludeKeywordInput] = useState("");
const [cityInput, setCityInput] = useState("");
const [companyWhitelistInput, setCompanyWhitelistInput] = useState("");
const [companyBlacklistInput, setCompanyBlacklistInput] = useState("");
// ... and any other similar input state
```

## Step 3: Simplify Handler Functions

**BEFORE (verbose):**

```tsx
const handleAddTitle = () => {
  const title = titleInput.trim();
  if (title && !config.title_allowlist.includes(title)) {
    setConfig({
      ...config,
      title_allowlist: [...config.title_allowlist, title],
    });
    setTitleInput("");
  }
};

const handleRemoveTitle = (title: string) => {
  setConfig({
    ...config,
    title_allowlist: config.title_allowlist.filter(t => t !== title),
  });
};
```

**AFTER (inline in component):**

```tsx
// No separate handlers needed - inline them in FilterListInput props
```

## Step 4: Replace Filter List Sections

### Example 1: Job Titles

**BEFORE (~40 lines):**

```tsx
<section className="mb-6">
  <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
    Job Titles You Want
    <HelpIcon text="Jobs with these titles will appear in your feed. Add titles like 'Marketing Manager' or 'SEO Specialist'." />
  </h3>
  <div className="flex gap-2 mb-3">
    <Input
      placeholder="Add a job title..."
      value={titleInput}
      onChange={(e) => setTitleInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleAddTitle();
        }
      }}
    />
    <Button onClick={handleAddTitle} disabled={!titleInput.trim()}>
      Add
    </Button>
  </div>
  <div className="flex flex-wrap gap-2">
    {config.title_allowlist.map((title) => (
      <Badge key={title} variant="sentinel" removable onRemove={() => handleRemoveTitle(title)}>
        {title}
      </Badge>
    ))}
    {config.title_allowlist.length === 0 && (
      <p className="text-sm text-surface-400">No job titles added</p>
    )}
  </div>
</section>
```

**AFTER (~12 lines):**

```tsx
<FilterListInput
  label="Job Titles You Want"
  helpText="Jobs with these titles will appear in your feed. Add titles like 'Marketing Manager' or 'SEO Specialist'."
  placeholder="Add a job title..."
  items={config.title_allowlist}
  onAdd={(title) => setConfig({
    ...config,
    title_allowlist: [...config.title_allowlist, title]
  })}
  onRemove={(title) => setConfig({
    ...config,
    title_allowlist: config.title_allowlist.filter(t => t !== title)
  })}
  badgeVariant="sentinel"
  emptyMessage="No job titles added"
/>
```

### Example 2: Blocked Titles

**AFTER (~12 lines):**

```tsx
<FilterListInput
  label="Job Titles to Avoid"
  helpText="Jobs with these titles will be filtered out. Use this for titles like 'Intern' or 'Entry Level' if you're looking for senior roles."
  placeholder="Add a title to block..."
  items={config.title_blocklist}
  onAdd={(title) => setConfig({
    ...config,
    title_blocklist: [...config.title_blocklist, title]
  })}
  onRemove={(title) => setConfig({
    ...config,
    title_blocklist: config.title_blocklist.filter(t => t !== title)
  })}
  badgeVariant="danger"
  emptyMessage="No blocked titles"
/>
```

### Example 3: Skills (keywords_boost)

**AFTER (~12 lines):**

```tsx
<FilterListInput
  label="Your Skills"
  helpText="Jobs that mention these skills will rank higher. Add skills from your resume like 'Python' or 'Project Management'."
  placeholder="Add a skill..."
  items={config.keywords_boost}
  onAdd={(skill) => setConfig({
    ...config,
    keywords_boost: [...config.keywords_boost, skill]
  })}
  onRemove={(skill) => setConfig({
    ...config,
    keywords_boost: config.keywords_boost.filter(s => s !== skill)
  })}
  badgeVariant="alert"
  emptyMessage="No skills added"
/>
```

### Example 4: Keywords to Avoid

**AFTER (~12 lines):**

```tsx
<FilterListInput
  label="Keywords to Avoid"
  helpText="Jobs mentioning these keywords will rank lower. Use this for things you don't want like 'Sales' or 'Travel Required'."
  placeholder="Add a keyword to avoid..."
  items={config.keywords_exclude}
  onAdd={(keyword) => setConfig({
    ...config,
    keywords_exclude: [...config.keywords_exclude, keyword]
  })}
  onRemove={(keyword) => setConfig({
    ...config,
    keywords_exclude: config.keywords_exclude.filter(k => k !== keyword)
  })}
  badgeVariant="danger"
  emptyMessage="No excluded keywords"
/>
```

### Example 5: Company Whitelist

**AFTER (~12 lines):**

```tsx
<FilterListInput
  label="Preferred Companies"
  helpText="Jobs from these companies will rank higher in your feed."
  placeholder="Add a company..."
  items={config.company_whitelist}
  onAdd={(company) => setConfig({
    ...config,
    company_whitelist: [...config.company_whitelist, company]
  })}
  onRemove={(company) => setConfig({
    ...config,
    company_whitelist: config.company_whitelist.filter(c => c !== company)
  })}
  badgeVariant="sentinel"
  emptyMessage="No preferred companies"
/>
```

### Example 6: Company Blacklist

**AFTER (~12 lines):**

```tsx
<FilterListInput
  label="Companies to Avoid"
  helpText="Jobs from these companies will be filtered out of your feed."
  placeholder="Add a company to block..."
  items={config.company_blacklist}
  onAdd={(company) => setConfig({
    ...config,
    company_blacklist: [...config.company_blacklist, company]
  })}
  onRemove={(company) => setConfig({
    ...config,
    company_blacklist: config.company_blacklist.filter(c => c !== company)
  })}
  badgeVariant="danger"
  emptyMessage="No blocked companies"
/>
```

## Step 5: Replace Credential Input Sections

### Example 1: Slack Webhook

**BEFORE (~15 lines):**

```tsx
{config.alerts.slack?.enabled && (
  <div className="mt-3 space-y-2">
    <div className="flex items-center gap-2">
      <span className="text-sm text-surface-600 dark:text-surface-400">Webhook URL</span>
      <SecurityBadge stored={credentialStatus.slack_webhook} />
    </div>
    <Input
      type="password"
      value={credentials.slack_webhook}
      onChange={(e) => setCredentials((prev) => ({ ...prev, slack_webhook: e.target.value }))}
      placeholder={credentialStatus.slack_webhook ? "Enter new webhook to update" : "Paste your Slack webhook URL"}
      hint="Workspace Settings → Incoming Webhooks → Add to Slack"
    />
  </div>
)}
```

**AFTER (~9 lines):**

```tsx
{config.alerts.slack?.enabled && (
  <SecureCredentialInput
    label="Webhook URL"
    helpText="Workspace Settings → Incoming Webhooks → Add to Slack"
    stored={credentialStatus.slack_webhook}
    value={credentials.slack_webhook}
    onChange={(value) => setCredentials((prev) => ({ ...prev, slack_webhook: value }))}
  />
)}
```

### Example 2: Discord Webhook

**AFTER (~9 lines):**

```tsx
{config.alerts.discord?.enabled && (
  <SecureCredentialInput
    label="Webhook URL"
    helpText="Server Settings → Integrations → Webhooks → New Webhook → Copy URL"
    stored={credentialStatus.discord_webhook}
    value={credentials.discord_webhook}
    onChange={(value) => setCredentials((prev) => ({ ...prev, discord_webhook: value }))}
  />
)}
```

### Example 3: Microsoft Teams Webhook

**AFTER (~9 lines):**

```tsx
{config.alerts.teams?.enabled && (
  <SecureCredentialInput
    label="Webhook URL"
    helpText="Channel → Connectors → Incoming Webhook → Configure → Copy URL"
    stored={credentialStatus.teams_webhook}
    value={credentials.teams_webhook}
    onChange={(value) => setCredentials((prev) => ({ ...prev, teams_webhook: value }))}
  />
)}
```

### Example 4: Telegram Bot Token

**AFTER (~9 lines):**

```tsx
{config.alerts.telegram?.enabled && (
  <SecureCredentialInput
    label="Bot Token"
    helpText="Message @BotFather → /newbot → Copy the token"
    stored={credentialStatus.telegram_bot_token}
    value={credentials.telegram_bot_token}
    onChange={(value) => setCredentials((prev) => ({ ...prev, telegram_bot_token: value }))}
  />
)}
```

### Example 5: SMTP Password

**AFTER (~9 lines):**

```tsx
{config.alerts.email?.enabled && (
  <SecureCredentialInput
    label="SMTP Password"
    helpText="Your email account password or app-specific password"
    stored={credentialStatus.smtp_password}
    value={credentials.smtp_password}
    onChange={(value) => setCredentials((prev) => ({ ...prev, smtp_password: value }))}
  />
)}
```

### Example 6: LinkedIn Session Cookie

**AFTER (~9 lines):**

```tsx
{config.linkedin?.enabled && (
  <SecureCredentialInput
    label="Session Cookie"
    helpText="LinkedIn → DevTools → Application → Cookies → li_at value"
    stored={credentialStatus.linkedin_cookie}
    value={credentials.linkedin_cookie}
    onChange={(value) => setCredentials((prev) => ({ ...prev, linkedin_cookie: value }))}
  />
)}
```

### Example 7: USAJobs API Key

**AFTER (~9 lines):**

```tsx
{config.usajobs?.enabled && (
  <SecureCredentialInput
    label="API Key"
    helpText="Get your API key from https://developer.usajobs.gov/APIRequest/Index"
    stored={credentialStatus.usajobs_api_key}
    value={credentials.usajobs_api_key}
    onChange={(value) => setCredentials((prev) => ({ ...prev, usajobs_api_key: value }))}
    type="text"
  />
)}
```

## Step 6: Remove SecurityBadge Component

**REMOVE this entire component definition (~25 lines):**

```tsx
const SecurityBadge = ({ stored }: { stored?: boolean }) => {
  const platform = navigator.platform.toLowerCase();
  const keychain = platform.includes("mac") ? "macOS Keychain"
    : platform.includes("win") ? "Windows Credential Manager"
    : "System Keyring";

  if (stored) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        Stored in {keychain}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
      Will store in {keychain}
    </span>
  );
};
```

It's now part of `SecureCredentialInput`.

## Expected Results

### Line Count Reduction

| Section | Before | After | Savings |
|---------|--------|-------|---------|
| Job Titles | ~40 lines | ~12 lines | ~28 lines |
| Blocked Titles | ~40 lines | ~12 lines | ~28 lines |
| Skills | ~40 lines | ~12 lines | ~28 lines |
| Keywords Exclude | ~40 lines | ~12 lines | ~28 lines |
| Company Whitelist | ~40 lines | ~12 lines | ~28 lines |
| Company Blacklist | ~40 lines | ~12 lines | ~28 lines |
| Cities | ~40 lines | ~12 lines | ~28 lines |
| Slack Credential | ~15 lines | ~9 lines | ~6 lines |
| Discord Credential | ~15 lines | ~9 lines | ~6 lines |
| Teams Credential | ~15 lines | ~9 lines | ~6 lines |
| Telegram Credential | ~15 lines | ~9 lines | ~6 lines |
| SMTP Credential | ~15 lines | ~9 lines | ~6 lines |
| LinkedIn Credential | ~15 lines | ~9 lines | ~6 lines |
| USAJobs Credential | ~15 lines | ~9 lines | ~6 lines |
| SecurityBadge Removal | ~25 lines | 0 lines | ~25 lines |
| State Variables | ~15 lines | 0 lines | ~15 lines |
| **TOTAL** | **~450 lines** | **~130 lines** | **~320 lines** |

### Additional sections to refactor

Search Settings.tsx for these patterns:

1. Any section with: Input + Button + map over array with Badge
2. Any section with: SecurityBadge + Input type="password"

**Estimated total reduction: 500-700 lines** (from 2869 lines to ~2200 lines)

## Testing After Migration

1. Verify all filter list inputs still work (add/remove items)
2. Verify Enter key still adds items
3. Verify credential inputs show correct security badge
4. Verify credentials save correctly to keyring
5. Verify empty states display correctly
6. Verify all help tooltips appear correctly
7. Check console for any TypeScript errors
8. Test keyboard navigation (Tab, Enter)
9. Test with screen reader for accessibility

## Rollback Plan

If issues arise, the components are isolated in `/src/components/settings/`. Simply:

1. Remove the import: `import { FilterListInput, SecureCredentialInput } from "../components/settings";`
2. Revert to the previous commit
3. Report issues for fixing

The original patterns remain valid and can be restored.
