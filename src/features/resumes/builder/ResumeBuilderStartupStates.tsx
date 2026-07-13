import { Button } from "../../../ui/Button";
import { Card } from "../../../ui/Card";
import { LoadingSpinner } from "../../../ui/LoadingSpinner";

export function ResumeBuilderLoadingState() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-surface-600 dark:text-surface-400">Initializing resume builder...</p>
      </div>
    </div>
  );
}

interface ResumeBuilderInitializationErrorProps {
  loading: boolean;
  onBack: () => void;
  onRetry: () => void;
}

export function ResumeBuilderInitializationError({
  loading,
  onBack,
  onRetry,
}: ResumeBuilderInitializationErrorProps) {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center dark:bg-surface-800">
        <h1 className="font-display text-display-md text-surface-900 dark:text-white mb-2">
          Resume Builder did not start
        </h1>
        <p className="text-sm text-surface-600 dark:text-surface-400 mb-6">
          Your resume was not changed. Try again, or copy a safe support report
          if this keeps happening.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={onRetry} loading={loading}>
            Try Again
          </Button>
          <Button variant="secondary" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}
