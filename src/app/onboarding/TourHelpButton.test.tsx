import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { OnboardingProvider, TourHelpButton } from "./OnboardingProvider";
import {
  localStorageMock,
  resetOnboardingTest,
  testSteps,
} from "./onboardingTestSupport";
import { useOnboarding } from "./useOnboarding";

describe("TourHelpButton", () => {
  beforeEach(resetOnboardingTest);

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
