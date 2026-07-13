# Undo And Redo Wiring

## Status

Completed on `main`.

## Scope

JobSentinel has an undo/redo context plus action wiring for the main workflows
that mutate user-visible state:

- Dashboard job hide, bookmark, notes, bulk hide, and bulk bookmark actions.
- Dashboard saved-search deletion.
- Application status and application notes.
- Cover letter template create, update, and delete actions.

## Current Surfaces

- `src/app/providers/UndoProvider.tsx` owns undo/redo stacks and keyboard shortcuts.
- `src/features/dashboard/hooks/useDashboardJobOps.ts` wires job actions.
- `src/features/dashboard/hooks/useDashboardSavedSearches.ts` wires saved-search deletion.
- `src/features/applications/ApplicationsPage.tsx` wires application mutations.
- `src/features/applications/CoverLetterTemplates.tsx` wires template mutations.
- `src/app/providers/UndoProvider.test.tsx` and
  `src/app/providers/UndoProvider.integration.test.tsx` cover provider behavior.

## Verification

Use fresh command output for current counts:

```bash
npm run test:run -- src/app/providers/UndoProvider.test.tsx src/app/providers/UndoProvider.integration.test.tsx
npm run test:run -- src/features/dashboard/hooks/useDashboardJobOps.test.ts
npm run test:run -- src/features/applications/CoverLetterTemplates.test.tsx
```

Broader frontend checks remain:

```bash
npm run lint
npm run test:run
npm run build
```

## Outcome

The old implementation note with hardcoded test counts was removed. Current
status now lives in this completed plan plus source and tests.
