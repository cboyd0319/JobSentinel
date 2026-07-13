import { lazy, Suspense } from "react";
import { ModalSkeleton } from "../../../ui/LoadingFallbacks";

const ScoreBreakdownModal = lazy(() =>
  import("./ScoreBreakdownModal").then((module) => ({
    default: module.ScoreBreakdownModal,
  })),
);

interface JobScoreModalProps {
  isOpen: boolean;
  jobTitle: string;
  onClose: () => void;
  score: number;
  scoreReasons?: string | null;
}

export function JobScoreModal({
  isOpen,
  jobTitle,
  onClose,
  score,
  scoreReasons,
}: JobScoreModalProps) {
  if (!isOpen) return null;

  return (
    <Suspense fallback={<ModalSkeleton />}>
      <ScoreBreakdownModal
        isOpen
        onClose={onClose}
        score={score}
        scoreReasons={scoreReasons}
        jobTitle={jobTitle}
      />
    </Suspense>
  );
}
