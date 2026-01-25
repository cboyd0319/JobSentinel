# Error Handling Migration Guide

Quick reference for updating files to use standardized error handling.

## Step 1: Import the utilities

```typescript
// Add to imports
import { safeInvoke, safeInvokeWithToast } from "../utils/api";
// or from "../../utils/api" depending on file location
```

## Step 2: Identify invoke patterns

### Pattern A: User action with error toast

**Before:**

```typescript
try {
  await invoke("command", { args });
  toast.success("Success message");
} catch (error) {
  logError("Context:", error);
  toast.error("Error title", "Error message");
}
```

**After:**

```typescript
try {
  await safeInvokeWithToast("command", { args }, toast, {
    logContext: "Action name"
  });
  toast.success("Success message");
} catch {
  // Error already logged and shown to user
}
```

### Pattern B: Background operation

**Before:**

```typescript
try {
  const result = await invoke<Type>("command", { args });
  // Use result
} catch (error) {
  logError("Context:", error);
  // Handle error
}
```

**After:**

```typescript
try {
  const result = await safeInvoke<Type>("command", { args }, {
    logContext: "Operation name"
  });
  // Use result
} catch (error) {
  const enhanced = error as Error & {
    userFriendly?: { title: string; message: string; action?: string }
  };
  toast.error(
    enhanced.userFriendly?.title || "Operation Failed",
    enhanced.userFriendly?.message
  );
}
```

### Pattern C: Optional/silent operation

**Before:**

```typescript
try {
  const result = await invoke<Type>("optional_feature", { args });
  // Use if available
} catch (error) {
  logError("Optional feature failed:", error);
  // Ignore or use defaults
}
```

**After:**

```typescript
try {
  const result = await safeInvoke<Type>("optional_feature", { args }, {
    silent: true  // Don't log failures
  });
  // Use if available
} catch {
  // Silently fail - feature is optional
}
```

### Pattern D: Bulk operations

**Before:**

```typescript
try {
  await Promise.all(items.map(item => invoke("action", { id: item.id })));
  toast.success("All items processed");
} catch (error) {
  logError("Bulk action failed:", error);
  toast.error("Bulk operation failed", "Some items may not have been processed");
}
```

**After:**

```typescript
try {
  await Promise.all(items.map(item =>
    safeInvoke("action", { id: item.id }, { logContext: "Bulk operation" })
  ));
  toast.success("All items processed");
} catch (error) {
  const enhanced = error as Error & { userFriendly?: { title: string; message: string } };
  toast.error(
    enhanced.userFriendly?.title || "Bulk Operation Failed",
    enhanced.userFriendly?.message || "Some items may not have been processed"
  );
}
```

## Common Mistakes to Avoid

❌ **Don't duplicate error logging**

```typescript
// BAD
try {
  await safeInvokeWithToast("action", args, toast);
} catch (error) {
  logError("Action failed:", error);  // Already logged!
  toast.error("Failed", "...");        // Already shown!
}
```

✅ **Just catch for cleanup or rollback**

```typescript
// GOOD
try {
  await safeInvokeWithToast("action", args, toast);
} catch {
  // Error already logged and shown
  // Only add cleanup logic here
  rollbackChanges();
}
```

❌ **Don't throw away user-friendly messages**

```typescript
// BAD
try {
  await safeInvoke("action", args);
} catch (error) {
  toast.error("Error", getErrorMessage(error));  // Loses title & action!
}
```

✅ **Use the enhanced error**

```typescript
// GOOD
try {
  await safeInvoke("action", args);
} catch (error) {
  const enhanced = error as Error & { userFriendly?: {...} };
  toast.error(
    enhanced.userFriendly?.title || "Failed",
    enhanced.userFriendly?.message
  );
}
```

❌ **Don't use silent mode for critical operations**

```typescript
// BAD - User data loss risk!
safeInvoke("save_critical_data", data, { silent: true })
```

✅ **Only use silent for truly optional features**

```typescript
// GOOD - Nice to have, not critical
safeInvoke("detect_optional_feature", args, { silent: true })
```

## Quick Checklist

For each file:

1. [ ] Add `safeInvoke` and/or `safeInvokeWithToast` imports
2. [ ] Find all `invoke(` calls
3. [ ] Replace with `safeInvoke` or `safeInvokeWithToast`
4. [ ] Add `logContext` for better debugging
5. [ ] Simplify catch blocks (error already handled)
6. [ ] Remove duplicate `logError` and `toast.error` calls
7. [ ] Use `silent: true` only for optional features
8. [ ] Test error paths still work

## Verification

After migration, verify:

```bash
# Check for any remaining raw invoke calls that need migration
grep -r "await invoke(" src/ --include="*.tsx" --include="*.ts"

# Check for duplicate error logging
grep -r "catch.*{.*logError.*toast.error" src/ --include="*.tsx" --include="*.ts"
```

## Examples from Completed Files

See these files for reference:

- `src/pages/Dashboard.tsx` - Manual search with error handling
- `src/pages/Applications.tsx` - Multiple operations with toasts
- `src/pages/hooks/useDashboardJobOps.ts` - Bulk operations
- `src/components/automation/ApplyButton.tsx` - Silent mode for optional features
