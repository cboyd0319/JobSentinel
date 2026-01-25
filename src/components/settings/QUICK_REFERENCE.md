# Quick Reference: Component Usage

## FilterListInput - Before & After

### Before (40 lines)

```tsx
const [titleInput, setTitleInput] = useState("");

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

// In JSX:
<section className="mb-6">
  <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
    Job Titles You Want
    <HelpIcon text="Jobs with these titles will appear in your feed..." />
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

### After (10 lines)

```tsx
<FilterListInput
  label="Job Titles You Want"
  helpText="Jobs with these titles will appear in your feed. Add titles like 'Marketing Manager' or 'SEO Specialist'."
  placeholder="Add a job title..."
  items={config.title_allowlist}
  onAdd={(title) => setConfig({ ...config, title_allowlist: [...config.title_allowlist, title] })}
  onRemove={(title) => setConfig({ ...config, title_allowlist: config.title_allowlist.filter(t => t !== title) })}
  badgeVariant="sentinel"
  emptyMessage="No job titles added"
/>
```

**Savings: 30 lines per instance**

---

## SecureCredentialInput - Before & After

### Before (15 lines)

```tsx
{config.alerts.discord?.enabled && (
  <div className="mt-3 space-y-2">
    <div className="flex items-center gap-2">
      <span className="text-sm text-surface-600 dark:text-surface-400">Webhook URL</span>
      <SecurityBadge stored={credentialStatus.discord_webhook} />
    </div>
    <Input
      type="password"
      value={credentials.discord_webhook}
      onChange={(e) => setCredentials((prev) => ({ ...prev, discord_webhook: e.target.value }))}
      placeholder={credentialStatus.discord_webhook ? "Enter new webhook to update" : "Paste your Discord webhook URL"}
      hint="Server Settings → Integrations → Webhooks → New Webhook → Copy URL"
    />
  </div>
)}
```

### After (8 lines)

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

**Savings: 7 lines per instance**

---

## Import Statement

Add this to the top of Settings.tsx:

```tsx
import { FilterListInput, SecureCredentialInput } from "../components/settings";
```

---

## All FilterListInput Variants

### Positive Filters (sentinel = blue)

```tsx
// Job titles, skills, companies
badgeVariant="sentinel"
```

### Boost/Alert (alert = yellow)

```tsx
// Keywords boost, skills
badgeVariant="alert"
```

### Negative Filters (danger = red)

```tsx
// Blocked titles, excluded keywords, blacklisted companies
badgeVariant="danger"
```

---

## State Cleanup

These can be removed from Settings.tsx:

```tsx
// DELETE THESE:
const [titleInput, setTitleInput] = useState("");
const [blockedTitleInput, setBlockedTitleInput] = useState("");
const [skillInput, setSkillInput] = useState("");
const [excludeKeywordInput, setExcludeKeywordInput] = useState("");
const [cityInput, setCityInput] = useState("");
const [companyWhitelistInput, setCompanyWhitelistInput] = useState("");
const [companyBlacklistInput, setCompanyBlacklistInput] = useState("");

// DELETE ALL handleAdd* and handleRemove* functions
// (now inline in FilterListInput props)
```

---

## Component Deletion

Remove the entire SecurityBadge component definition (~25 lines):

```tsx
// DELETE THIS ENTIRE COMPONENT:
const SecurityBadge = ({ stored }: { stored?: boolean }) => {
  // ... entire implementation
};
```

It's now part of SecureCredentialInput.

---

## Testing Checklist

After refactoring each section:

- [ ] Input accepts text
- [ ] Add button works
- [ ] Enter key adds item
- [ ] Items display as badges
- [ ] Remove button works
- [ ] Empty state shows correct message
- [ ] Help icon tooltip appears
- [ ] Badge color matches variant
- [ ] Duplicate items are prevented
- [ ] Security badge shows for credentials
- [ ] Platform-specific keyring name displays
- [ ] Credentials save correctly

---

## File Locations

**New components:**

- `/Users/c/Documents/GitHub/JobSentinel/src/components/settings/FilterListInput.tsx`
- `/Users/c/Documents/GitHub/JobSentinel/src/components/settings/SecureCredentialInput.tsx`
- `/Users/c/Documents/GitHub/JobSentinel/src/components/settings/index.ts`

**To refactor:**

- `/Users/c/Documents/GitHub/JobSentinel/src/pages/Settings.tsx`

---

## Search Patterns for Finding Instances

In Settings.tsx, search for:

**Filter lists to replace:**

```text
title_allowlist
title_blocklist
keywords_boost
keywords_exclude
location_preferences.cities
company_whitelist
company_blacklist
```

**Credentials to replace:**

```text
credentialStatus.slack_webhook
credentialStatus.discord_webhook
credentialStatus.teams_webhook
credentialStatus.telegram_bot_token
credentialStatus.smtp_password
credentialStatus.linkedin_cookie
credentialStatus.usajobs_api_key
```

Each occurrence is a candidate for component replacement.
