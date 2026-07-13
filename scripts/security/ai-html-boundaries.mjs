import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const externalAiGatewayChecks = [
  {
    label: "reviewed outgoing text prompt-injection guard",
    phrases: [
      "external_ai_prompt_injection_blocked",
      "hasPromptLikeExternalAiContent(outgoingPayload)",
      "Details selected for outside AI include instructions aimed at AI tools",
    ],
  },
];

const externalAiGatewayBoundaryPaths = [
  "src/shared/externalAi/internal/aiGateway.ts",
  "src/shared/externalAi/externalAiPayloadPolicy.ts",
  "src/shared/externalAi/internal/promptInspection.ts",
  "src/shared/externalAi/externalAiTypes.ts",
  "src/shared/externalAi/internal/requestValidation.ts",
];

function repoPath(root, path) {
  return join(root, path);
}

function readIfExists(root, path, violations) {
  const fullPath = repoPath(root, path);

  if (!existsSync(fullPath)) {
    violations.push(`missing file required for security sensor check: ${path}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function includesAll(text, phrases) {
  return phrases.every((phrase) => text.includes(phrase));
}

export function checkExternalAiGatewayBoundary(root, violations) {
  const gateway = externalAiGatewayBoundaryPaths
    .map((path) => readIfExists(root, path, violations))
    .join("\n");

  for (const check of externalAiGatewayChecks) {
    if (!includesAll(gateway, check.phrases)) {
      violations.push(`external AI gateway is missing security gate: ${check.label}`);
    }
  }

  for (const staleMarker of [
    "jobPostingPromptTextKeys",
    "hasPromptLikeJobPostingContent",
    "job_posting_prompt_injection_blocked",
  ]) {
    if (gateway.includes(staleMarker)) {
      violations.push(
        `external AI gateway prompt-injection guard must not be scoped to job-posting-only marker: ${staleMarker}`,
      );
    }
  }

  const docs = readIfExists(root, "docs/architecture/privacy-first-ai-gateway.md", violations);
  if (
    !includesAll(docs, [
      "Reviewed outgoing text with obvious prompt-like instructions",
      "Prompt-like, hidden, encoded, and typo-obfuscated reviewed outgoing text",
    ])
  ) {
    violations.push(
      "external AI gateway docs must describe reviewed outgoing text prompt-injection blocking",
    );
  }
}

export function checkResumeHtmlSinkBoundary(root, violations) {
  const preview = readIfExists(root, "src/features/resumes/builder/ResumeBuilderPreviewStep.tsx", violations);
  if (
    !includesAll(preview, [
      'sandbox=""',
      'referrerPolicy="no-referrer"',
      "srcDoc={sanitizeResumeHtmlDocument(previewHtml)}",
    ])
  ) {
    violations.push(
      "Resume Builder preview iframe must stay sanitized, sandboxed, and no-referrer",
    );
  }

  const printExport = readIfExists(root, "src/features/resumes/builder/resumeBuilderExportDom.ts", violations);
  if (
    !includesAll(printExport, [
      'iframe.setAttribute("sandbox", "allow-modals")',
      'iframe.setAttribute("referrerpolicy", "no-referrer")',
      "const safeHtml = sanitizeResumeHtmlDocument(html)",
      "iframe.srcdoc = safeHtml",
    ])
  ) {
    violations.push(
      "Resume Builder print iframe must stay sanitized, sandboxed, no-referrer, and srcdoc-based",
    );
  }

  if (/\.write\s*\(\s*safeHtml\s*\)/.test(printExport)) {
    violations.push("Resume Builder print iframe must not write sanitized HTML with document.write");
  }

  const xssDocs = readIfExists(root, "docs/security/XSS_PREVENTION.md", violations);
  if (
    !includesAll(xssDocs, [
      "temporary print iframe",
      'iframe.setAttribute("sandbox", "allow-modals")',
      "iframe.srcdoc = sanitizeResumeHtmlDocument(html)",
    ])
  ) {
    violations.push("XSS docs must document the sandboxed resume print iframe sink");
  }
}
