import { CheckIcon } from "./SetupWizardIcons";
import { SETUP_STEPS } from "./setupWizardSteps";

export function SetupWizardProgress({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex w-full items-center">
        {SETUP_STEPS.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center ${index < SETUP_STEPS.length - 1 ? "flex-1" : "shrink-0"}`}
          >
            <div
              className={`
                h-9 w-9 shrink-0 rounded-full flex items-center justify-center font-semibold text-sm sm:h-10 sm:w-10
                transition-all duration-300
                ${step > item.id
                  ? "bg-sentinel-500 text-white"
                  : step === item.id
                    ? "bg-sentinel-500 text-white ring-4 ring-sentinel-500/30"
                    : "bg-surface-700 text-surface-400"
                }
              `}
            >
              {step > item.id ? <CheckIcon className="w-5 h-5" /> : index + 1}
            </div>
            {index < SETUP_STEPS.length - 1 && (
              <div
                className={`
                  mx-1 h-0.5 flex-1 transition-colors duration-300 sm:mx-2
                  ${step > item.id ? "bg-sentinel-500" : "bg-surface-700"}
                `}
              />
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="text-surface-400 text-sm">
          Step {step + 1} of {SETUP_STEPS.length}
        </p>
      </div>
    </div>
  );
}
