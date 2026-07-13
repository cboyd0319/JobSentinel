import { STEPS } from "./resumeBuilderData";

interface ResumeBuilderHeaderProps {
  currentStep: number;
  onBack: () => void;
}

export function ResumeBuilderHeader({ currentStep, onBack }: ResumeBuilderHeaderProps) {
  return (
    <header className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <svg className="w-5 h-5 text-surface-600 dark:text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white">
              Resume Builder
            </h1>
            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.name ?? "Unknown"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
