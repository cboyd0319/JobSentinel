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

- `src/contexts/UndoContext.tsx` owns undo/redo stacks and keyboard shortcuts.
- `src/pages/hooks/useDashboardJobOps.ts` wires job actions.
- `src/pages/hooks/useDashboardSavedSearches.ts` wires saved-search deletion.
- `src/pages/Applications.tsx` wires application mutations.
- `src/components/CoverLetterTemplates.tsx` wires template mutations.
- `src/contexts/UndoContext.test.tsx` and
  `src/contexts/UndoIntegration.test.tsx` cover context behavior.

## Verification

Use fresh command output for current counts:

```bash
npm run test:run -- src/contexts/UndoContext.test.tsx src/contexts/UndoIntegration.test.tsx
npm run test:run -- src/pages/hooks/useDashboardJobOps.test.ts
npm run test:run -- src/components/CoverLetterTemplates.test.tsx
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
