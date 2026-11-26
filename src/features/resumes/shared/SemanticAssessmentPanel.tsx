/** Shows runtime provenance and cited advisory matches without changing eligibility. */
import type { SemanticAssessment } from "./atsAnalysisContracts";
import { evidenceLocation } from "./atsAnalysisLabels";

const runtimeLabels = {
  qwen3_reranked: "Stronger local matching (Qwen3)",
  minilm: "Local matching (MiniLM fallback)",
  deterministic_exact: "Built-in exact matching — no model used",
};

export function SemanticAssessmentPanel({ assessment }: { assessment: SemanticAssessment }) {
  return (
    <section aria-label="Local evidence assessment" className="space-y-3 rounded-lg border border-surface-300 p-4 text-sm dark:border-surface-600">
      <h3 className="font-semibold">Local evidence assessment</h3>
      <p>{runtimeLabels[assessment.runtime_profile]}</p>
      <p>Related wording is a review aid. It does not verify credentials or eligibility, remove hard requirements, or change the readability score.</p>
      {assessment.matched_skills.length > 0 ? (
        <ul className="space-y-3">
          {assessment.matched_skills.map((match, index) => {
            const citation = assessment.match_evidence[index];
            return (
              <li key={`${match.job_skill}:${index}`} className="break-words">
                <p><strong>{match.job_skill}</strong>: {match.user_skill}</p>
                <p className="text-xs text-surface-600 dark:text-surface-300">
                  {citation ? `Resume evidence: ${evidenceLocation(citation.field_path)}` : "No source citation available; verify this wording."}
                </p>
              </li>
            );
          })}
        </ul>
      ) : <p>No related evidence was accepted for these requirements.</p>}
      {assessment.unmatched_requirements.length > 0 && (
        <p className="break-words">Still needs review: {assessment.unmatched_requirements.join(", ")}.</p>
      )}
    </section>
  );
}
