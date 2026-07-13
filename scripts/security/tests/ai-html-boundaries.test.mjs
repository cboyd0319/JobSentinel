import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  checkExternalAiGatewayBoundary,
  checkResumeHtmlSinkBoundary,
} from "../ai-html-boundaries.mjs";

function mkdtempRoot(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeAiGatewayFixture(root, source) {
  mkdirSync(join(root, "src/shared/externalAi/internal"), { recursive: true });
  mkdirSync(join(root, "docs/architecture"), { recursive: true });
  for (const path of [
    "src/shared/externalAi/internal/aiGateway.ts",
    "src/shared/externalAi/externalAiPayloadPolicy.ts",
    "src/shared/externalAi/internal/promptInspection.ts",
    "src/shared/externalAi/externalAiTypes.ts",
    "src/shared/externalAi/internal/requestValidation.ts",
  ]) {
    writeFileSync(join(root, path), source);
  }
  writeFileSync(
    join(root, "docs/architecture/privacy-first-ai-gateway.md"),
    [
      "Reviewed outgoing text with obvious prompt-like instructions",
      "Prompt-like, hidden, encoded, and typo-obfuscated reviewed outgoing text",
    ].join("\n"),
  );
}

function writeResumeHtmlFixture(root, source) {
  mkdirSync(join(root, "src/features/resumes/builder"), { recursive: true });
  mkdirSync(join(root, "docs/security"), { recursive: true });
  writeFileSync(
    join(root, "src/features/resumes/builder/ResumeBuilderPreviewStep.tsx"),
    [
      '<iframe sandbox="" referrerPolicy="no-referrer"',
      "  srcDoc={sanitizeResumeHtmlDocument(previewHtml)} />",
    ].join("\n"),
  );
  writeFileSync(join(root, "src/features/resumes/builder/resumeBuilderExportDom.ts"), source);
  writeFileSync(
    join(root, "docs/security/XSS_PREVENTION.md"),
    [
      "temporary print iframe",
      'iframe.setAttribute("sandbox", "allow-modals")',
      "iframe.srcdoc = sanitizeResumeHtmlDocument(html)",
    ].join("\n"),
  );
}

test("external AI boundary rejects job-posting-only prompt guards", () => {
  const root = mkdtempRoot("jobsentinel-ai-boundary-");
  writeAiGatewayFixture(
    root,
    [
      "const jobPostingPromptTextKeys = new Set(['description']);",
      "function hasPromptLikeJobPostingContent() { return false; }",
      "const code = 'job_posting_prompt_injection_blocked';",
    ].join("\n"),
  );

  const violations = [];
  checkExternalAiGatewayBoundary(root, violations);

  assert(
    violations.includes(
      "external AI gateway prompt-injection guard must not be scoped to job-posting-only marker: jobPostingPromptTextKeys",
    ),
  );
  assert(
    violations.includes(
      "external AI gateway prompt-injection guard must not be scoped to job-posting-only marker: hasPromptLikeJobPostingContent",
    ),
  );
  assert(
    violations.includes(
      "external AI gateway prompt-injection guard must not be scoped to job-posting-only marker: job_posting_prompt_injection_blocked",
    ),
  );
});

test("resume HTML boundary rejects unsandboxed print iframe sinks", () => {
  const root = mkdtempRoot("jobsentinel-html-boundary-");
  writeResumeHtmlFixture(
    root,
    [
      "function openResumePrintDialog(html) {",
      "  const safeHtml = sanitizeResumeHtmlDocument(html);",
      "  const doc = iframe.contentWindow?.document;",
      "  doc.write(safeHtml);",
      "}",
    ].join("\n"),
  );

  const violations = [];
  checkResumeHtmlSinkBoundary(root, violations);

  assert(
    violations.includes(
      "Resume Builder print iframe must stay sanitized, sandboxed, no-referrer, and srcdoc-based",
    ),
  );
  assert(
    violations.includes(
      "Resume Builder print iframe must not write sanitized HTML with document.write",
    ),
  );
});
