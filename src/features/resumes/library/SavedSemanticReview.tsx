/** Runs a fresh source-bound local assessment for a saved resume and job. */
import { useEffect, useRef, useState } from "react";
import { invoke } from "../../../platform/tauri";
import { Button } from "../../../ui/Button";
import type { SemanticAssessment } from "../shared/atsAnalysisContracts";
import { SemanticAssessmentPanel } from "../shared/SemanticAssessmentPanel";

interface SavedSemanticReviewProps { resumeId: number; jobHash: string; resumeRevision?: string }

export function SavedSemanticReview(props: SavedSemanticReviewProps) {
  return <SavedSemanticReviewContent key={`${props.resumeId}:${props.jobHash}:${props.resumeRevision ?? ""}`} {...props} />;
}

function SavedSemanticReviewContent({ resumeId, jobHash }: SavedSemanticReviewProps) {
  const [assessment, setAssessment] = useState<SemanticAssessment | null>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  useEffect(() => () => { generation.current += 1; }, [resumeId, jobHash]);

  const review = async () => {
    const request = ++generation.current;
    setPending(true);
    setAssessment(undefined);
    setError(false);
    try {
      const result = await invoke<SemanticAssessment | null>("match_resume_semantic", { resumeId, jobHash });
      if (request === generation.current) setAssessment(result);
    } catch {
      if (request === generation.current) setError(true);
    } finally {
      if (request === generation.current) setPending(false);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      <Button variant="secondary" loading={pending} onClick={review}>Review local evidence</Button>
      {error && <p role="alert">Local evidence review could not run. The saved match remains available. Review the resume and job requirements before trying again.</p>}
      {assessment === null && <p>This build uses basic matching. The saved match above remains available; no additional semantic assessment was run.</p>}
      {assessment && <SemanticAssessmentPanel assessment={assessment} />}
    </div>
  );
}
