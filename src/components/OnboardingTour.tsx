import { memo, useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";

interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
}

interface OnboardingContextType {
  isActive: boolean;
  currentStep: number;
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  hasCompletedTour: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}

const TOUR_STORAGE_KEY = "jobsentinel-tour-completed";

interface OnboardingProviderProps {
  children: ReactNode;
  steps: TourStep[];
}

export function OnboardingProvider({ children, steps }: OnboardingProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  // Use lazy initialization to avoid setState in effect
  const [hasCompletedTour, setHasCompletedTour] = useState(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    return completed === "true";
  });

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTour = useCallback(() => {
    setIsActive(false);
    setHasCompletedTour(true);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      endTour();
    }
  }, [currentStep, steps.length, endTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStep,
        startTour,
        endTour,
        nextStep,
        prevStep,
        hasCompletedTour,
      }}
    >
      {children}
      {isActive && <TourOverlay steps={steps} />}
    </OnboardingContext.Provider>
  );
}

interface TourOverlayProps {
  steps: TourStep[];
}

// Position calculators for each placement (better performance than switch)
const PLACEMENT_CALCULATORS: Record<NonNullable<TourStep["placement"]>, (rect: DOMRect, padding: number) => { top: number; left: number }> = {
  top: (rect, padding) => ({
    top: rect.top - padding - 150,
    left: rect.left + rect.width / 2,
  }),
  bottom: (rect, padding) => ({
    top: rect.bottom + padding,
    left: rect.left + rect.width / 2,
  }),
  left: (rect, padding) => ({
    top: rect.top + rect.height / 2,
    left: rect.left - padding - 300,
  }),
  right: (rect, padding) => ({
    top: rect.top + rect.height / 2,
    left: rect.right + padding,
  }),
};

const TourOverlay = memo(function TourOverlay({ steps }: TourOverlayProps) {
  const { currentStep, nextStep, prevStep, endTour } = useOnboarding();
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];

  useEffect(() => {
    if (!step) return;

    const updatePosition = () => {
      const target = document.querySelector(step.target);
      if (!target) return;

      const rect = target.getBoundingClientRect();
      setTargetRect(rect);

      const placement = step.placement || "bottom";
      const padding = 12;

      const calculator = PLACEMENT_CALCULATORS[placement];
      setTooltipPosition(calculator(rect, padding));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [step]);

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop with spotlight effect */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 4}
                y={targetRect.top - 4}
                width={targetRect.width + 8}
                height={targetRect.height + 8}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.5)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Target highlight */}
      {targetRect && (
        <div
          className="absolute border-2 border-sentinel-400 rounded-lg pointer-events-none animate-pulse"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute z-10 w-72 bg-white dark:bg-surface-800 rounded-xl shadow-2xl border border-surface-200 dark:border-surface-700 p-4 transform -translate-x-1/2"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        {/* Arrow - simplified, just shows placement */}
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-semibold text-surface-900 dark:text-white">
            {step.title}
          </h4>
          <button
            onClick={endTour}
            className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
            aria-label="Close tour"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-surface-600 dark:text-surface-300 mb-4">
          {step.content}
        </p>

        {/* Progress and navigation */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep
                    ? "bg-sentinel-500"
                    : index < currentStep
                      ? "bg-sentinel-300"
                      : "bg-surface-300 dark:bg-surface-600"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="px-3 py-1.5 text-sm text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-3 py-1.5 text-sm bg-sentinel-500 hover:bg-sentinel-600 text-white rounded-lg transition-colors"
            >
              {currentStep < steps.length - 1 ? "Next" : "Finish"}
            </button>
          </div>
        </div>
      </div>

      {/* Click overlay to prevent interaction */}
      <div
        className="absolute inset-0"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    </div>
  );
});

// Export a simple help button that triggers the tour
export const TourHelpButton = memo(function TourHelpButton() {
  const { startTour, hasCompletedTour } = useOnboarding();

  return (
    <button
      onClick={startTour}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
        hasCompletedTour
          ? "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
          : "text-sentinel-600 bg-sentinel-50 dark:bg-sentinel-900/30 hover:bg-sentinel-100 dark:hover:bg-sentinel-900/50"
      }`}
      title="Take a tour"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {!hasCompletedTour && <span>Tour</span>}
    </button>
  );
});
