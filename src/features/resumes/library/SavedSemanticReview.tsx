/** Runs a fresh source-bound local assessment for a saved resume and job. */
import { useState } from "react";
import { invoke } from "../../../platform/tauri";
import { Button } from "../../../ui/Button";
import type { SemanticAssessment } from "../shared/atsAnalysisContracts";
import { SemanticAssessmentPanel } from "../shared/SemanticAssessmentPanel";
import { useResumeReviewRequest } from "../shared/useResumeReviewRequest";

interface SavedSemanticReviewProps { resumeId: number; jobHash: string; resumeRevision?: string }

export function SavedSemanticReview(props: SavedSemanticReviewProps) {
  return <SavedSemanticReviewContent key={`${props.resumeId}:${props.jobHash}:${props.resumeRevision ?? ""}`} {...props} />;
}

function SavedSemanticReviewContent({ resumeId, jobHash }: SavedSemanticReviewProps) {
  const [assessment, setAssessment] = useState<SemanticAssessment | null>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const { begin, cancel, isCurrent, finish } = useResumeReviewRequest();

  const review = async () => {
    const requestId = begin();
    setPending(true);
    setCancelled(false);
    setAssessment(undefined);
    setError(false);
    try {
      const result = await invoke<SemanticAssessment | null>("match_resume_semantic", { resumeId, jobHash, requestId });
      if (isCurrent(requestId)) setAssessment(result);
    } catch {
      if (isCurrent(requestId)) setError(true);
    } finally {
      if (isCurrent(requestId)) setPending(false);
      finish(requestId);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      <Button variant="secondary" loading={pending} onClick={review}>Review local evidence</Button>
      {pending && <Button variant="ghost" onClick={() => { cancel(); setPending(false); setCancelled(true); }}>Cancel evidence review</Button>}
      {cancelled && <p role="status">Review dismissed. Local processing may take a moment to stop.</p>}
      {error && <p role="alert">Local evidence review could not run. The saved match remains available. Review the resume and job requirements before trying again.</p>}
      {assessment === null && <p>This build uses basic matching. The saved match above remains available; no additional semantic assessment was run.</p>}
      {assessment && <SemanticAssessmentPanel assessment={assessment} />}
    </div>
  );
}
