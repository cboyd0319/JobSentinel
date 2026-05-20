# Test Fixtures

This directory is reserved for Playwright tests that need real files.

Current resume E2E coverage seeds mock backend state in
`resume-upload-matching.spec.ts` because the Resume page uses native Tauri file
pickers. Browser-only Playwright cannot prove PDF, DOCX, or OS dialog behavior
without a separate Tauri smoke test.

Add fixture files here only when a committed test reads them directly.
