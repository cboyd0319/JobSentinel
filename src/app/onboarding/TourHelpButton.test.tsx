import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingProvider, TourHelpButton } from "./OnboardingProvider";
import { useOnboarding } from "./useOnboarding";

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

describe("TourHelpButton", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("renders button", () => {
    render(
      <OnboardingProvider steps={testSteps}>
        <TourHelpButton />
      </OnboardingProvider>,
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows 'Tour' text when tour not completed", () => {
    render(
      <OnboardingProvider steps={testSteps}>
        <TourHelpButton />
      </OnboardingProvider>,
    );

    expect(screen.getByText("Tour")).toBeInTheDocument();
  });

  it("hides 'Tour' text when tour completed", () => {
    localStorageMock.getItem.mockReturnValueOnce("true");

    render(
      <OnboardingProvider steps={testSteps}>
        <TourHelpButton />
      </OnboardingProvider>,
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
      </OnboardingProvider>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("has title attribute", () => {
    render(
      <OnboardingProvider steps={testSteps}>
        <TourHelpButton />
      </OnboardingProvider>,
    );

    expect(screen.getByRole("button")).toHaveAttribute("title", "Take a tour");
  });

  it("applies different styling when tour not completed", () => {
    render(
      <OnboardingProvider steps={testSteps}>
        <TourHelpButton />
      </OnboardingProvider>,
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
      </OnboardingProvider>,
    );

    const button = screen.getByRole("button");
    expect(button.className).toContain("text-surface-500");
  });
});
