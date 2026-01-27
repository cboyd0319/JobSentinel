import { memo } from "react";
import { Modal, ModalFooter } from "../Modal";
import { Button } from "../Button";
import { useFeedback } from "../../hooks/useFeedback";
import { CategorySelector } from "./CategorySelector";
import { DescriptionInput } from "./DescriptionInput";
import { DebugInfoPreview } from "./DebugInfoPreview";
import { SubmitOptions } from "./SubmitOptions";
import { SuccessScreen } from "./SuccessScreen";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal = memo(function FeedbackModal({
  isOpen,
  onClose,
}: FeedbackModalProps) {
  const feedback = useFeedback();

  const handleClose = () => {
    feedback.reset();
    onClose();
  };

  const canProceedFromCategory = feedback.category !== null;
  const canProceedFromDescription = feedback.description.trim().length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getTitle(feedback.step)}
      size="lg"
      closeOnOverlayClick={false}
    >
      {feedback.loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-6">
          {/* Step: Category Selection */}
          {feedback.step === "category" && (
            <>
              <CategorySelector
                selected={feedback.category}
                onSelect={feedback.setCategory}
              />

              <ModalFooter>
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={feedback.nextStep}
                  disabled={!canProceedFromCategory}
                >
                  Next
                </Button>
              </ModalFooter>
            </>
          )}

          {/* Step: Description */}
          {feedback.step === "description" && (
            <>
              <DescriptionInput
                category={feedback.category}
                value={feedback.description}
                onChange={feedback.setDescription}
              />

              <ModalFooter>
                <Button variant="ghost" onClick={feedback.prevStep}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={feedback.nextStep}
                  disabled={!canProceedFromDescription}
                >
                  Next
                </Button>
              </ModalFooter>
            </>
          )}

          {/* Step: Review (Debug Info) */}
          {feedback.step === "review" && (
            <>
              <DebugInfoPreview
                systemInfo={feedback.systemInfo}
                configSummary={feedback.configSummary}
                debugEvents={feedback.debugEvents}
                included={feedback.includeDebugInfo}
                onToggle={feedback.setIncludeDebugInfo}
              />

              {feedback.error && (
                <div className="p-3 bg-danger/10 dark:bg-danger/20 rounded-lg border border-danger/20 dark:border-danger/30">
                  <p className="text-sm text-danger">{feedback.error}</p>
                </div>
              )}

              <ModalFooter>
                <Button variant="ghost" onClick={feedback.prevStep}>
                  Back
                </Button>
                <Button variant="primary" onClick={feedback.nextStep}>
                  Continue to Submit
                </Button>
              </ModalFooter>
            </>
          )}

          {/* Step: Submit Options */}
          {feedback.step === "submit" && (
            <>
              <SubmitOptions
                onSubmitGitHub={feedback.submitViaGitHub}
                onSubmitDrive={feedback.submitViaDrive}
                submitting={feedback.submitting}
              />

              {feedback.error && (
                <div className="p-3 bg-danger/10 dark:bg-danger/20 rounded-lg border border-danger/20 dark:border-danger/30">
                  <p className="text-sm text-danger">{feedback.error}</p>
                </div>
              )}

              <ModalFooter>
                <Button
                  variant="ghost"
                  onClick={feedback.prevStep}
                  disabled={feedback.submitting}
                >
                  Back
                </Button>
              </ModalFooter>
            </>
          )}

          {/* Step: Success */}
          {feedback.step === "success" && feedback.submittedVia && (
            <SuccessScreen
              submittedVia={feedback.submittedVia}
              savedFilePath={feedback.savedFilePath}
              onRevealFile={feedback.revealSavedFile}
              onOpenDriveFolder={feedback.openDriveFolder}
              onClose={handleClose}
            />
          )}
        </div>
      )}
    </Modal>
  );
});

function getTitle(step: string): string {
  switch (step) {
    case "category":
      return "Send Feedback";
    case "description":
      return "Describe Your Feedback";
    case "review":
      return "Include Debug Information?";
    case "submit":
      return "Choose Submission Method";
    case "success":
      return "Feedback Submitted";
    default:
      return "Send Feedback";
  }
}

function LoadingState() {
  return (
    <div className="py-12 text-center">
      <div className="inline-block w-8 h-8 border-4 border-surface-200 dark:border-surface-700 border-t-sentinel-500 rounded-full motion-safe:animate-spin" />
      <p className="mt-4 text-sm text-surface-600 dark:text-surface-400">
        Loading system information...
      </p>
    </div>
  );
}
