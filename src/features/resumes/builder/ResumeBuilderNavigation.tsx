import { Button } from "../../../ui/Button";
import { STEPS } from "./resumeBuilderData";

interface ResumeBuilderNavigationProps {
  currentStep: number;
  exporting: boolean;
  saving: boolean;
  onExport: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function ResumeBuilderNavigation({
  currentStep,
  exporting,
  saving,
  onExport,
  onNext,
  onPrevious,
}: ResumeBuilderNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-6 mt-6 border-t border-surface-200 dark:border-surface-700">
      <Button
        variant="secondary"
        onClick={onPrevious}
        disabled={currentStep === 1}
      >
        Previous
      </Button>
      <div className="text-sm text-surface-500 dark:text-surface-400">
        {saving && "Saving..."}
      </div>
      {currentStep < STEPS.length ? (
        <Button onClick={onNext} loading={saving}>
          Next
        </Button>
      ) : (
        <Button onClick={onExport} loading={exporting}>
          Export Resume
        </Button>
      )}
    </div>
  );
}
