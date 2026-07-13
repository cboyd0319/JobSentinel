import { getTechnicalFirstDocsFoundationResult } from "./technical-first-docs-foundation.mjs";
import { getTechnicalFirstGuidesResult } from "./technical-first-guides.mjs";
import { getTechnicalFirstWorkflowResult } from "./technical-first-workflows.mjs";

const technicalFirstChecks = [
  getTechnicalFirstDocsFoundationResult,
  getTechnicalFirstWorkflowResult,
  getTechnicalFirstGuidesResult,
];

export function getTechnicalFirstDocsResult(path, text) {
  for (const check of technicalFirstChecks) {
    const result = check(path, text);
    if (result !== undefined) {
      return result;
    }
  }

  return undefined;
}
