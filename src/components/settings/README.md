# Settings UI Components

Reusable components extracted from Settings.tsx to reduce file size and improve maintainability.

## FilterListInput

A reusable component for the input + add button + badge list pattern used throughout Settings.

**Pattern it replaces:** Input field → Add button → Badge list with remove buttons

**Used for:**

- Job titles (allowlist/blocklist)
- Skills (keywords_boost)
- Keywords to avoid (keywords_exclude)
- Company whitelist/blacklist
- Location cities
- Email recipients
- RemoteOK tags

### Usage Example

Before (repetitive code ~40 lines):

```tsx
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

After (clean, ~10 lines):

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

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | required | Section heading text |
| `helpText` | `string` | optional | Help text shown in HelpIcon tooltip |
| `placeholder` | `string` | `"Add an item..."` | Input placeholder text |
| `items` | `string[]` | required | Array of current items |
| `onAdd` | `(item: string) => void` | required | Called when user adds an item |
| `onRemove` | `(item: string) => void` | required | Called when user removes an item |
| `badgeVariant` | `"sentinel" \| "alert" \| "surface" \| "success" \| "danger"` | `"sentinel"` | Badge color variant |
| `emptyMessage` | `string` | `"No items added"` | Message shown when items array is empty |
| `testId` | `string` | optional | Test ID for the section element |

### Badge Variant Guide

- **`sentinel`** (blue) - Positive filters (job titles, skills, preferred companies)
- **`alert`** (yellow) - Boost/highlight items (keywords_boost)
- **`danger`** (red) - Negative filters (blocked titles, excluded keywords, blacklisted companies)
- **`success`** (green) - Confirmations, successful states
- **`surface`** (gray) - Neutral items

---

## SecureCredentialInput

A reusable component for credential input fields with platform-specific security badge.

**Pattern it replaces:** Label with SecurityBadge + password Input

**Used for:**

- Slack webhook URL
- Discord webhook URL
- Microsoft Teams webhook URL
- Telegram bot token
- SMTP password
- LinkedIn session cookie
- USAJobs API key

### Usage Example

Before (repetitive code ~15 lines):

```tsx
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
```

After (clean, ~8 lines):

```tsx
<SecureCredentialInput
  label="Webhook URL"
  helpText="Server Settings → Integrations → Webhooks → New Webhook → Copy URL"
  stored={credentialStatus.discord_webhook}
  value={credentials.discord_webhook}
  onChange={(value) => setCredentials((prev) => ({ ...prev, discord_webhook: value }))}
  type="password"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | required | Label text (e.g., "Webhook URL", "Bot Token") |
| `helpText` | `string` | optional | Hint text shown below input |
| `stored` | `boolean` | required | Whether credential exists in keyring |
| `value` | `string` | required | Current input value |
| `onChange` | `(value: string) => void` | required | Called when input changes |
| `placeholder` | `string` | auto-generated | Custom placeholder (auto-generated based on `stored` if not provided) |
| `type` | `"text" \| "password"` | `"password"` | Input type |
| `testId` | `string` | optional | Test ID for the wrapper div |

### Security Badge Behavior

- **Stored (green)**: Shows "Stored in [macOS Keychain/Windows Credential Manager/System Keyring]"
- **Not stored (gray)**: Shows "Will store in [macOS Keychain/Windows Credential Manager/System Keyring]"

Platform detection is automatic based on `navigator.platform`.

---

## File Size Impact

**Before extraction:**

- Settings.tsx: ~2869 lines

**After using these components:**

- Estimated reduction: ~500-700 lines (replacing 8-10 FilterListInput instances, 7+ SecureCredentialInput instances)
- Each FilterListInput replaces ~40 lines of repetitive code
- Each SecureCredentialInput replaces ~15 lines of repetitive code

## Next Steps for Refactoring Settings.tsx

1. Import the components:

   ```tsx
   import { FilterListInput, SecureCredentialInput } from "../components/settings";
   ```

2. Replace job titles section (~40 lines → ~10 lines)
3. Replace blocked titles section (~40 lines → ~10 lines)
4. Replace skills section (~40 lines → ~10 lines)
5. Replace keywords exclude section (~40 lines → ~10 lines)
6. Replace company whitelist section (~40 lines → ~10 lines)
7. Replace company blacklist section (~40 lines → ~10 lines)
8. Replace location cities section (~40 lines → ~10 lines)
9. Replace all credential inputs (Slack, Discord, Teams, Telegram, SMTP, LinkedIn, USAJobs)
10. Remove local state variables that are now handled internally (titleInput, skillInput, etc.)
11. Remove SecurityBadge component definition (now in SecureCredentialInput)

**Total potential reduction: ~600+ lines**
