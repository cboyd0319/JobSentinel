import { Progress } from "../../../ui/Progress";
import { STEPS } from "./resumeBuilderData";
import { CheckCircleIcon } from "./ResumeBuilderVisuals";

interface ResumeBuilderProgressProps {
  currentStep: number;
}

export function ResumeBuilderProgress({ currentStep }: ResumeBuilderProgressProps) {
  return (
    <div className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
      <div className="max-w-5xl mx-auto px-6 py-3">
        <Progress
          value={((currentStep - 1) / (STEPS.length - 1)) * 100}
          size="sm"
          variant="sentinel"
        />
        <div className="flex justify-between mt-3">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`text-xs text-center ${
                step.id === currentStep
                  ? "text-sentinel-600 dark:text-sentinel-400 font-semibold"
                  : step.id < currentStep
                    ? "text-surface-600 dark:text-surface-400"
                    : "text-surface-400 dark:text-surface-500"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-sm ${
                  step.id === currentStep
                    ? "bg-sentinel-500 text-white"
                    : step.id < currentStep
                      ? "bg-sentinel-100 dark:bg-sentinel-900/30 text-sentinel-600 dark:text-sentinel-400"
                      : "bg-surface-100 dark:bg-surface-700 text-surface-400"
                }`}
              >
                {step.id < currentStep ? (
                  <CheckCircleIcon className="w-4 h-4" />
                ) : (
                  step.id
                )}
              </div>
              <div className="hidden sm:block">{step.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
