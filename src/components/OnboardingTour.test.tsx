import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import { OnboardingProvider, useOnboarding, TourHelpButton } from "./OnboardingTour";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

const testSteps = [
  { target: "#step1", title: "Step 1", content: "First step content" },
  { target: "#step2", title: "Step 2", content: "Second step content" },
  { target: "#step3", title: "Step 3", content: "Third step content" },
];

describe("OnboardingProvider", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("context", () => {
    it("provides context to children", () => {
      const TestComponent = () => {
        const context = useOnboarding();
        return <div>{context.isActive ? "active" : "inactive"}</div>;
      };

      render(
        <OnboardingProvider steps={testSteps}>
          <TestComponent />
        </OnboardingProvider>
      );

      expect(screen.getByText("inactive")).toBeInTheDocument();
    });

    it("throws error when useOnboarding used outside provider", () => {
      const TestComponent = () => {
        useOnboarding();
        return null;
      };

      expect(() => render(<TestComponent />)).toThrow(
        "useOnboarding must be used within an OnboardingProvider"
      );
    });

    it("checks localStorage for completed tour on mount", () => {
      localStorageMock.getItem.mockReturnValueOnce("true");

      const TestComponent = () => {
        const { hasCompletedTour } = useOnboarding();
        return <div>{hasCompletedTour ? "completed" : "not completed"}</div>;
      };

      render(
        <OnboardingProvider steps={testSteps}>
          <TestComponent />
        </OnboardingProvider>
      );

      expect(screen.getByText("completed")).toBeInTheDocument();
    });
  });

  describe("startTour", () => {
    it("activates the tour", () => {
      const TestComponent = () => {
        const { isActive, startTour } = useOnboarding();
        return (
          <div>
            <span>{isActive ? "active" : "inactive"}</span>
            <button onClick={startTour}>Start Tour</button>
          </div>
        );
      };

      render(
        <OnboardingProvider steps={testSteps}>
          <TestComponent />
        </OnboardingProvider>
      );

      fireEvent.click(screen.getByRole("button", { name: "Start Tour" }));

      expect(screen.getByText("active")).toBeInTheDocument();
    });

    it("resets to step 0", () => {
      const TestComponent = () => {
        const { currentStep, startTour, nextStep } = useOnboarding();
        return (
          <div>
            <span data-testid="step-display">Step: {currentStep}</span>
            <button onClick={startTour}>Start Tour</button>
            <button onClick={nextStep}>Advance Step</button>
          </div>
        );
      };

      render(
        <OnboardingProvider steps={testSteps}>
          <TestComponent />
        </OnboardingProvider>
      );

      fireEvent.click(screen.getByRole("button", { name: "Start Tour" }));
      // Use the test component's button, not the tour overlay's
      fireEvent.click(screen.getByRole("button", { name: "Advance Step" }));
      expect(screen.getByTestId("step-display")).toHaveTextContent("Step: 1");

      // Start again should reset
      fireEvent.click(screen.getByRole("button", { name: "Start Tour" }));
      expect(screen.getByTestId("step-display")).toHaveTextContent("Step: 0");
    });
  });

  describe("endTour", () => {
    it("deactivates the tour", () => {
      const TestComponent = () => {
        const { isActive, startTour, endTour } = useOnboarding();
        return (
          <div>
            <span>{isActive ? "active" : "inactive"}</span>
            <button onClick={startTour}>Start Tour</button>
            <button onClick={endTour}>End Tour</button>
          </div>
        );
      };

      render(
        <OnboardingProvider steps={testSteps}>
          <TestComponent />
        </OnboardingProvider>
      );

      fireEvent.click(screen.getByRole("button", { name: "Start Tour" }));
      expect(screen.getByText("active")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "End Tour" }));
      expect(screen.getByText("inactive")).toBeInTheDocument();
    });

    it("marks tour as completed", () => {
      const TestComponent = () => {
        const { hasCompletedTour, startTour, endTour } = useOnboarding();
        return (
          <div>
            <span>{hasCompletedTour ? "completed" : "not completed"}</span>
            <button onClick={startTour}>Start Tour</button>
            <button onClick={endTour}>End Tour</button>
          </div>
        );
      };

      render(
        <OnboardingProvider steps={testSteps}>
          <TestComponent />
        </OnboardingProvider>
      );

      fireEvent.click(screen.getByRole("button", { name: "Start Tour" }));
      fireEvent.click(screen.getByRole("button", { name: "End Tour" }));

      expect(screen.getByText("completed")).toBeInTheDocument();
    });

    it("saves completion to localStorage", () => {
      const TestComponent = () => {
        const { startTour, endTour } = useOnboarding();
        return (
          <div>
            <button onClick={startTour}>Start Tour</button>
            <button onClick={endTour}>End Tour</button>
          </div>
        );
      };

      render(
        <OnboardingProvider steps={testSteps}>
          <TestComponent />
        </OnboardingProvider>
      );

      fireEvent.click(screen.getByRole("button", { name: "Start Tour" }));
      fireEvent.click(screen.getByRole("button", { name: "End Tour" }));

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "jobsentinel-tour-completed",
        "true"
      );
    });
  });

  describe("nextStep", () => {
    it("advances to next step", () => {
      const TestComponent = () => {
        const { currentStep, startTour, nextStep } = useOnboarding();
        return (
          <div>
            <span data-testid="step-display">Step: {currentStep}</span>
            <button onClick={startTour}>Start Tour</button>
            <button onClick={nextStep}>Advance Step</button>
          </div>
        );
      };

      render(
        <OnboardingProvider steps={testSteps}>
          <TestComponent />
        </OnboardingProvider>
      );

      fireEvent.click(screen.getByRole("button", { name: "Start Tour" }));
      expect(screen.getByTestId("step-display")).toHaveTextContent("Step: 0");

      fireEvent.click(screen.getByRole("button", { name: "Advance Step" }));
      expect(screen.getByTestId("step-display")).toHaveTextContent("Step: 1");
    });

    it("ends tour when on last step", () => {
      const TestComponent = () => {
        const { currentStep, isActive, startTour, nextStep } = useOnboarding();
        return (
          <div>
            <span data-testid="step-display">Step: {currentStep}</span>
            <span>{isActive ? "active" : "inactive"}</span>
            <button onClick={startTour}>Start Tour</button>
            <button onClick={nextStep}>Advance Step</button>
          </div>
        );
      };

      render(
        <OnboardingProvider steps={testSteps}>
          <TestComponent />
        </OnboardingProvider>
      );

      fireEvent.click(screen.getByRole("button", { name: "Start Tour" }));
      fireEvent.click(screen.getByRole("button", { name: "Advance Step" })); // 0 -> 1
      fireEvent.click(screen.getByRole("button", { name: "Advance Step" })); // 1 -> 2
      fireEvent.click(screen.getByRole("button", { name: "Advance Step" })); // 2 -> end

      expect(screen.getByText("inactive")).toBeInTheDocument();
    });
  });

  describe("prevStep", () => {
    it("goes to previous step", () => {
      const TestComponent = () => {
        const { currentStep, startTour, nextStep, prevStep } = useOnboarding();
        return (
          <div>
            <span data-testid="step-display">Step: {currentStep}</span>
            <button onClick={startTour}>Start Tour</button>
            <button onClick={nextStep}>Advance Step</button>
            <button onClick={prevStep}>Go Back</button>
          </div>
        );
      };

      render(
        <OnboardingProvider steps={testSteps}>
          <TestComponent />
        </OnboardingProvider>
      );

      fireEvent.click(screen.getByRole("button", { name: "Start Tour" }));
      fireEvent.click(screen.getByRole("button", { name: "Advance Step" }));
      expect(screen.getByTestId("step-display")).toHaveTextContent("Step: 1");

      fireEvent.click(screen.getByRole("button", { name: "Go Back" }));
      expect(screen.getByTestId("step-display")).toHaveTextContent("Step: 0");
    });

    it("does nothing when on first step", () => {
      const TestComponent = () => {
        const { currentStep, startTour, prevStep } = useOnboarding();
        return (
          <div>
            <span data-testid="step-display">Step: {currentStep}</span>
            <button onClick={startTour}>Start Tour</button>
            <button onClick={prevStep}>Go Back</button>
          </div>
        );
      };

      render(
        <OnboardingProvider steps={testSteps}>
          <TestComponent />
        </OnboardingProvider>
      );

      fireEvent.click(screen.getByRole("button", { name: "Start Tour" }));
      fireEvent.click(screen.getByRole("button", { name: "Go Back" }));

      expect(screen.getByTestId("step-display")).toHaveTextContent("Step: 0");
    });
  });
});

describe("TourHelpButton", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("renders button", () => {
    render(
      <OnboardingProvider steps={testSteps}>
        <TourHelpButton />
      </OnboardingProvider>
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows 'Tour' text when tour not completed", () => {
    render(
      <OnboardingProvider steps={testSteps}>
        <TourHelpButton />
      </OnboardingProvider>
    );

    expect(screen.getByText("Tour")).toBeInTheDocument();
  });

  it("hides 'Tour' text when tour completed", () => {
    localStorageMock.getItem.mockReturnValueOnce("true");

    render(
      <OnboardingProvider steps={testSteps}>
        <TourHelpButton />
      </OnboardingProvider>
    );

    expect(screen.queryByText("Tour")).not.toBeInTheDocument();
  });

  it("starts tour when clicked", () => {
    const TestComponent = () => {
      const { isActive } = useOnboarding();
      return <span>{isActive ? "active" : "inactive"}</span>;
    };

    render(
      <OnboardingProvider steps={testSteps}>
        <TourHelpButton />
        <TestComponent />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("has title attribute", () => {
    render(
      <OnboardingProvider steps={testSteps}>
        <TourHelpButton />
      </OnboardingProvider>
    );

    expect(screen.getByRole("button")).toHaveAttribute("title", "Take a tour");
  });

  it("applies different styling when tour not completed", () => {
    render(
      <OnboardingProvider steps={testSteps}>
        <TourHelpButton />
      </OnboardingProvider>
    );

    const button = screen.getByRole("button");
    expect(button.className).toContain("text-sentinel-600");
    expect(button.className).toContain("bg-sentinel-50");
  });

  it("applies muted styling when tour completed", () => {
    localStorageMock.getItem.mockReturnValueOnce("true");

    render(
      <OnboardingProvider steps={testSteps}>
        <TourHelpButton />
      </OnboardingProvider>
    );

    const button = screen.getByRole("button");
    expect(button.className).toContain("text-surface-500");
  });
});

describe("useOnboarding hook", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <OnboardingProvider steps={testSteps}>{children}</OnboardingProvider>
  );

  it("returns expected context shape", () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    expect(result.current).toEqual(
      expect.objectContaining({
        isActive: false,
        currentStep: 0,
        hasCompletedTour: false,
        startTour: expect.any(Function),
        endTour: expect.any(Function),
        nextStep: expect.any(Function),
        prevStep: expect.any(Function),
      })
    );
  });

  it("isActive toggles correctly", () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    expect(result.current.isActive).toBe(false);

    act(() => {
      result.current.startTour();
    });

    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.endTour();
    });

    expect(result.current.isActive).toBe(false);
  });
});
