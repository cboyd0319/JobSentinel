# Undo/Redo System Implementation

**Status:** ✅ Fully Implemented and Tested
**Version:** JobSentinel 2.6.3
**Test Coverage:** 30 passing tests (18 core + 12 integration)

## Overview

JobSentinel has a complete undo/redo system that allows users to reverse and replay actions across the application. The system uses a command pattern with dual stacks (undo/redo) and integrates with keyboard shortcuts and toast notifications.

## Architecture

### Core Components

#### UndoContext (`src/contexts/UndoContext.tsx`)

- **Stack Management:** Maintains undo/redo stacks with max 50 items
- **Action Interface:** `UndoableAction` with `undo()` and `redo()` callbacks
- **Toast Integration:** Shows undo button in success toasts
- **Keyboard Shortcuts:** Built-in Cmd/Ctrl+Z (undo), Cmd/Ctrl+Shift+Z or Ctrl+Y (redo)

```typescript
interface UndoableAction {
  id: string;
  type: "hide" | "bookmark" | "notes" | "status";
  description: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  timestamp: number;
}
```

### Hook API

```typescript
const { pushAction, undo, redo, canUndo, canRedo, lastAction } = useUndo();

// Push an undoable action
pushAction({
  type: "bookmark",
  description: "Bookmarked: Senior Engineer at Google",
  undo: async () => {
    await invoke("toggle_bookmark", { id: jobId });
    // Update local state...
  },
  redo: async () => {
    await invoke("toggle_bookmark", { id: jobId });
    // Update local state...
  },
});
```

## Supported Actions

| Action | Type | Location | Description |
|--------|------|----------|-------------|
| **Job Hide** | `hide` | Dashboard | Hide/unhide single job |
| **Job Bookmark** | `bookmark` | Dashboard | Toggle bookmark on/off |
| **Job Notes** | `notes` | Dashboard | Add/edit/delete job notes |
| **Bulk Hide** | `hide` | Dashboard | Hide multiple jobs at once |
| **Bulk Bookmark** | `bookmark` | Dashboard | Bookmark/unbookmark multiple jobs |
| **Application Status** | `status` | Applications | Drag-and-drop status changes (Applied → Phone Screen, etc.) |
| **Application Notes** | `notes` | Applications | Add/edit application notes |
| **Saved Search Delete** | `bookmark` | Dashboard | Delete saved search filter |
| **Template Create** | `notes` | Templates | Create new cover letter template |
| **Template Update** | `notes` | Templates | Edit existing template |
| **Template Delete** | `notes` | Templates | Delete template |

## Keyboard Shortcuts

| Platform | Undo | Redo |
|----------|------|------|
| **macOS** | `⌘Z` | `⌘⇧Z` |
| **Windows/Linux** | `Ctrl+Z` | `Ctrl+Y` or `Ctrl+Shift+Z` |

Shortcuts are:

- Platform-aware (detects macOS vs Windows)
- Disabled in text inputs (except Escape)
- Globally registered via `UndoContext`
- Documented in help panel (`?` key)

## Implementation Pattern

### Standard Pattern (Job Operations)

```typescript
const handleToggleBookmark = useCallback(async (id: number) => {
  const job = jobs.find(j => j.id === id);
  if (!job) return;

  const previousState = job.bookmarked;

  try {
    const newState = await invoke<boolean>("toggle_bookmark", { id });

    // Update local state optimistically
    setJobs(jobs.map(j =>
      j.id === id ? { ...j, bookmarked: newState } : j
    ));

    // Push undoable action
    pushAction({
      type: "bookmark",
      description: newState
        ? `Bookmarked: ${job.title}`
        : `Unbookmarked: ${job.title}`,
      undo: async () => {
        await invoke<boolean>("toggle_bookmark", { id });
        setJobs(prev => prev.map(j =>
          j.id === id ? { ...j, bookmarked: previousState } : j
        ));
      },
      redo: async () => {
        await invoke<boolean>("toggle_bookmark", { id });
        setJobs(prev => prev.map(j =>
          j.id === id ? { ...j, bookmarked: newState } : j
        ));
      },
    });
  } catch {
    // Error handling...
  }
}, [jobs, pushAction]);
```

### Key Principles

1. **Capture state before mutation** - Store `previousState` for undo
2. **Perform action first** - Only push to undo stack after success
3. **Local state sync** - Update React state in both undo/redo
4. **Backend sync** - Call Tauri commands to persist changes
5. **Cache invalidation** - Clear relevant caches after mutations

### Application Status Changes (Drag & Drop)

```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  const activeId = active.id as number;
  const newColumn = findColumnForApp(activeId);
  const oldColumn = /* find original column */;

  const app = applications[oldColumn].find(a => a.id === activeId);

  try {
    await invoke("update_application_status", {
      applicationId: activeId,
      status: newColumn
    });

    pushAction({
      type: "status",
      description: `Moved ${app.job_title} to ${newLabel}`,
      undo: async () => {
        await invoke("update_application_status", {
          applicationId: activeId,
          status: oldColumn
        });
        invalidateCacheByCommand("get_applications_kanban");
        fetchData();
      },
      redo: async () => {
        await invoke("update_application_status", {
          applicationId: activeId,
          status: newColumn
        });
        invalidateCacheByCommand("get_applications_kanban");
        fetchData();
      },
    });
  } catch {
    // Error handling...
  }
};
```

### Template Operations (Create/Update/Delete)

```typescript
// Template Creation
const handleSaveTemplate = async (data) => {
  const newTemplate = await invoke('create_cover_letter_template', data);
  setTemplates(prev => [newTemplate, ...prev]);

  pushAction({
    type: "notes",
    description: `Created template: ${data.name}`,
    undo: async () => {
      await invoke('delete_cover_letter_template', { id: newTemplate.id });
      setTemplates(prev => prev.filter(t => t.id !== newTemplate.id));
    },
    redo: async () => {
      const recreated = await invoke('create_cover_letter_template', data);
      setTemplates(prev => [recreated, ...prev]);
    },
  });
};

// Template Deletion
const handleDeleteTemplate = async (id: string) => {
  const templateToDelete = templates.find(t => t.id === id);

  await invoke('delete_cover_letter_template', { id });
  setTemplates(prev => prev.filter(t => t.id !== id));

  pushAction({
    type: "notes",
    description: `Deleted template: ${templateToDelete.name}`,
    undo: async () => {
      const restored = await invoke('create_cover_letter_template', {
        name: templateToDelete.name,
        content: templateToDelete.content,
        category: templateToDelete.category,
      });
      setTemplates(prev => [restored, ...prev]);
    },
    redo: async () => {
      await invoke('delete_cover_letter_template', { id });
      setTemplates(prev => prev.filter(t => t.id !== id));
    },
  });
};
```

## Testing

### Test Coverage

**Core Tests** (`src/contexts/UndoContext.test.tsx` - 18 tests):

- Provider rendering
- Initial state
- Push action flow
- Undo/redo mechanics
- Keyboard shortcuts (Mac/Windows)
- Error handling
- Toast notifications

**Integration Tests** (`src/contexts/UndoIntegration.test.tsx` - 12 tests):

- Application status changes
- Saved search operations
- Template create/update/delete
- Stack size limit (50 items)

### Running Tests

```bash
# All undo tests
npm run test -- src/contexts/Undo --run

# Specific test file
npm run test -- src/contexts/UndoContext.test.tsx --run

# With coverage
npm run test:coverage -- src/contexts/Undo
```

### Test Patterns

```typescript
it("enables undo after action", async () => {
  render(
    <ToastProvider>
      <UndoProvider>
        <TestComponent />
      </UndoProvider>
    </ToastProvider>
  );

  expect(screen.getByTestId("can-undo")).toHaveTextContent("false");

  fireEvent.click(screen.getByTestId("perform-action"));

  await waitFor(() => {
    expect(screen.getByTestId("can-undo")).toHaveTextContent("true");
  });
});
```

## User Experience

### Toast Notifications

When an action is performed:

1. Success toast appears with description
2. Toast includes "Undo" button
3. Clicking toast undo button reverses action immediately
4. Secondary toast confirms undo

### Visual Feedback

- **Action performed:** "Bookmarked: Senior Engineer at Google" (with Undo button)
- **Undo triggered:** "Undone: Bookmarked: Senior Engineer at Google"
- **Redo triggered:** "Redone: Bookmarked: Senior Engineer at Google"

### Help Panel

Keyboard shortcuts are documented in the help panel (`?` key):

- **Global Section** shows Cmd+Z (undo) and Cmd+Shift+Z (redo)
- Platform-aware symbols (⌘ on Mac, Ctrl on Windows)

## Future Enhancements

Potential additions (not currently implemented):

1. **Persistent Undo History** - Save undo stack to local storage
2. **Undo History UI** - Visual timeline of actions
3. **Grouped Actions** - Batch multiple operations into one undo
4. **Action Expiration** - Auto-clear old actions after N days
5. **Conflict Resolution** - Handle concurrent changes from multiple tabs
6. **More Action Types** - Scraper settings, automation rules, etc.

## Files Modified

### Core Implementation

- `src/contexts/UndoContext.tsx` - Undo/redo context (existing)
- `src/contexts/UndoContext.test.tsx` - Core tests (existing)

### Integration (New/Modified)

- `src/pages/Applications.tsx` - Application status + notes undo
- `src/pages/hooks/useDashboardJobOps.ts` - Job operations undo (existing)
- `src/pages/hooks/useDashboardSavedSearches.ts` - Saved search undo
- `src/components/CoverLetterTemplates.tsx` - Template undo

### Tests (New)

- `src/contexts/UndoIntegration.test.tsx` - Integration tests

## Maintenance Notes

### Adding New Undoable Actions

1. Import `useUndo` hook
2. Extract `pushAction` from hook
3. Capture previous state before mutation
4. Perform action and wait for success
5. Push action with undo/redo callbacks
6. Update local state in both callbacks
7. Add test case to `UndoIntegration.test.tsx`

### Common Pitfalls

❌ **Don't push action before backend confirms:**

```typescript
pushAction({ ... }); // BAD - before backend call
await invoke("update_status", ...);
```

✅ **Push after success:**

```typescript
await invoke("update_status", ...);
pushAction({ ... }); // GOOD - after backend confirms
```

❌ **Don't forget to sync local state:**

```typescript
undo: async () => {
  await invoke("toggle_bookmark", { id });
  // Missing: setJobs(...) - state out of sync!
}
```

✅ **Always update React state:**

```typescript
undo: async () => {
  await invoke("toggle_bookmark", { id });
  setJobs(prev => prev.map(...)); // State synced
}
```

## Performance Considerations

- **Stack Size:** Limited to 50 items (configurable via `MAX_UNDO_STACK`)
- **Memory:** Each action stores two closures (undo/redo)
- **Toast Cleanup:** Toasts auto-dismiss after 5 seconds
- **No Persistence:** Stack clears on page refresh (intentional)

## Accessibility

- Keyboard shortcuts work globally (not just focused elements)
- Shortcuts disabled in text inputs (to allow normal text editing)
- Toast notifications are ARIA live regions
- Screen reader announces "Undone: [action description]"

---

**Last Updated:** 2026-01-30
**Maintainer:** JobSentinel Team
