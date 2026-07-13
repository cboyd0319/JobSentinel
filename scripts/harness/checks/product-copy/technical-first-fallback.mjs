import { technicalFirstInputAndRecoveryPatterns } from "./technical-first-fallback-input-and-recovery.mjs";
import { technicalFirstWorkflowPatterns } from "./technical-first-fallback-workflows.mjs";

export function hasTechnicalFirstFallbackCopy(text) {
  return (
    technicalFirstInputAndRecoveryPatterns.some((pattern) => pattern.test(text)) ||
    technicalFirstWorkflowPatterns.some((pattern) => pattern.test(text))
  );
}
