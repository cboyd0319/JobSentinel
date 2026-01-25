# API Error Handling Standardization

## Overview

JobSentinel now has a standardized error handling pattern for all Tauri `invoke` calls.
This ensures consistent user experience, proper error logging, and user-friendly error
messages across the entire application.

## Core Utilities

### Location: `src/utils/api.ts`

Three main functions for Tauri API calls:

1. **`safeInvoke<T>(cmd, args?, options?)`**
   - Safe wrapper around Tauri invoke
   - Automatically logs errors with context
   - Enhances errors with user-friendly messages from `errorMessages.ts`
   - Use for background operations or when you need manual error handling
   - Options:
     - `logContext`: Custom context string for logging (e.g., "Delete job")
     - `silent`: Skip logging (for expected failures like optional features)

2. **`safeInvokeWithToast<T>(cmd, args, toast, options?)`**
   - Same as `safeInvoke` but automatically shows error toasts
   - Best for user-initiated actions where errors should be immediately visible
   - Displays user-friendly error title and message via toast
   - Options include all `safeInvoke` options plus:
     - `errorTitle`: Custom error title for toast
     - `showTechnical`: Show technical details in dev mode

3. **`cachedInvoke<T>(cmd, args?, ttl?)`**
   - Caches responses with TTL (default 30s)
   - Deduplicates concurrent requests
   - Use for read-only operations that can be cached
   - Still uses standard `invoke` under the hood

## User-Friendly Error Messages

### Location: `src/utils/errorMessages.ts`

All errors are automatically translated to user-friendly messages using pattern matching:

- **Network errors**: Connection issues, timeouts, SSL problems
- **Database errors**: Locks, constraints, corruption
- **Validation errors**: Missing fields, invalid formats
- **Scraper errors**: Website changes, no results, bot detection
- **Config errors**: Missing/invalid configuration
- **Notification errors**: Webhook failures
- **ATS errors**: Application tracking issues
- **AI errors**: Resume parsing, token limits

Function: `getUserFriendlyError(error) -> { title, message, action, technical }`

## Migration Pattern

### Before

```typescript
try {
  await invoke("delete_job", { id: 123 });
  toast.success("Job deleted");
} catch (error) {
  logError("Failed to delete job:", error);
  toast.error("Delete failed", "Could not delete the job");
}
```

### After (with toast)

```typescript
try {
  await safeInvokeWithToast("delete_job", { id: 123 }, toast, {
    logContext: "Delete job"
  });
  toast.success("Job deleted");
} catch {
  // Error already logged and shown to user
}
```

### After (without toast)

```typescript
try {
  const result = await safeInvoke<Job[]>("get_jobs", { limit: 10 });
  // Use result...
} catch (error) {
  const enhanced = error as Error & { userFriendly?: {...} };
  toast.error(
    enhanced.userFriendly?.title || "Operation Failed",
    enhanced.userFriendly?.message
  );
}
```

### Silent mode (for optional features)

```typescript
try {
  const atsInfo = await safeInvoke<AtsInfo>("detect_ats", { url }, {
    silent: true  // Don't log if ATS detection fails (optional feature)
  });
} catch {
  // Silently fail - ATS detection is optional
}
```

## Files Updated

### Core utilities

- ✅ `src/utils/api.ts` - New safe invoke wrappers
- ✅ `src/utils/errorMessages.ts` - Already had user-friendly messages
- ✅ `src/utils/errorUtils.ts` - Already had logError and getErrorMessage

### Pages

- ✅ `src/pages/Dashboard.tsx` - Manual search, job operations
- ✅ `src/pages/Applications.tsx` - Status updates, notes, reminders, ghost detection
- ⏳ `src/pages/Settings.tsx` - Already using getUserFriendlyError (good!)
- ⏳ `src/pages/Resume.tsx` - Needs review
- ⏳ `src/pages/ResumeBuilder.tsx` - Needs review
- ⏳ `src/pages/Market.tsx` - Needs review
- ⏳ `src/pages/SetupWizard.tsx` - Needs review

### Hooks

- ✅ `src/pages/hooks/useDashboardJobOps.ts` - Hide, bookmark, notes, bulk ops, duplicates
- ⏳ `src/pages/hooks/useDashboardSavedSearches.ts` - Needs review
- ⏳ `src/pages/hooks/useDashboardAutoRefresh.ts` - Needs review

### Components

- ✅ `src/components/automation/ApplyButton.tsx` - ATS detection, form filling, browser control
- ⏳ `src/components/automation/ProfileForm.tsx` - Needs review
- ⏳ `src/components/automation/ScreeningAnswersForm.tsx` - Needs review
- ⏳ `src/components/InterviewScheduler.tsx` - Needs review
- ⏳ `src/components/NotificationPreferences.tsx` - Needs review
- ⏳ `src/components/ScraperHealthDashboard.tsx` - Needs review
- ⏳ `src/components/GhostIndicator.tsx` - Needs review
- ⏳ `src/components/AsyncButton.tsx` - Needs review

## Benefits

1. **Consistent UX**: All errors shown to users in plain English
2. **Better logging**: All errors logged with context for debugging
3. **Type safety**: TypeScript errors enhanced with user-friendly messages
4. **Maintainability**: Single source of truth for error messages
5. **DRY**: No more repetitive try/catch blocks with custom messages
6. **Actionable**: Error messages include "What to do" guidance

## Best Practices

1. **Always provide logContext**: Makes debugging easier

   ```typescript
   safeInvoke("complex_operation", args, { logContext: "User action: Export jobs" })
   ```

2. **Use safeInvokeWithToast for user actions**: Automatic error feedback

   ```typescript
   await safeInvokeWithToast("save_settings", settings, toast)
   ```

3. **Use silent mode sparingly**: Only for truly optional features

   ```typescript
   // Good: Optional ATS detection
   safeInvoke("detect_ats", { url }, { silent: true })

   // Bad: Critical operation
   safeInvoke("save_user_data", data, { silent: true }) // ❌
   ```

4. **Keep error handlers minimal**: safeInvoke does the heavy lifting

   ```typescript
   try {
     await safeInvokeWithToast("action", args, toast);
     // Success path
   } catch {
     // Error already handled - only add rollback logic if needed
   }
   ```

## Testing Error Messages

Test that errors are user-friendly:

```typescript
// Simulate network error
const error = new Error("ECONNREFUSED");
const friendly = getUserFriendlyError(error);
console.log(friendly.title);    // "Connection Problem"
console.log(friendly.message);  // "We couldn't connect to..."
console.log(friendly.action);   // "Check your internet connection..."
```

## Next Steps

1. Complete migration of remaining files (marked with ⏳)
2. Test error paths in development
3. Add integration tests for error handling
4. Update error messages based on user feedback
