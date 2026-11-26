/** Shows source field locations without verifying resume claims. */
import { evidenceLocation, formatEvidenceSections } from "./atsAnalysisLabels";
import type { RequirementReview } from "./atsAnalysisContracts";

interface ResumeRequirementEvidenceProps {
  review: RequirementReview;
}

export function ResumeRequirementEvidence({
  review,
}: ResumeRequirementEvidenceProps) {
  const locations = [
    ...new Set(
      (review.evidence_citations ?? []).map((citation) =>
        evidenceLocation(citation.field_path),
      ),
    ),
  ];

  return (
    <div className="mt-2 space-y-2 text-xs text-surface-500 dark:text-surface-400">
      <p>
        {review.evidence_sections.length > 0
          ? `Found in: ${formatEvidenceSections(review.evidence_sections)}`
          : "No clear resume evidence found"}
      </p>
      {locations.length > 0 && (
        <>
          <ul
            aria-label={`Evidence locations for ${review.keyword}`}
            className="list-disc space-y-1 pl-5"
          >
            {locations.map((location) => (
              <li key={location}>{location}</li>
            ))}
          </ul>
          <p>These locations show matching wording, not verification of a claim.</p>
        </>
      )}
    </div>
  );
}
