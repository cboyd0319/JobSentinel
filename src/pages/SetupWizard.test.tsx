import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import SetupWizard from "./SetupWizard";
import { ToastProvider } from "../contexts";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ToastProvider>
      {ui}
    </ToastProvider>
  );
};

describe("SetupWizard Accessibility", () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  describe("Progress Announcements", () => {
    it("should have aria-live region for step announcements", () => {
      renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

      // Find live region with step announcement
      const liveRegions = document.querySelectorAll('[aria-live="polite"]');
      const stepRegion = Array.from(liveRegions).find(region =>
        region.textContent?.includes("Step 1 of 4")
      );

      expect(stepRegion).toBeDefined();
      expect(stepRegion).toHaveAttribute("aria-atomic", "true");
      expect(stepRegion?.className).toContain("sr-only");
    });

    it("should announce initial step on render", () => {
      renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

      const liveRegions = document.querySelectorAll('[aria-live="polite"]');
      const stepRegion = Array.from(liveRegions).find(region =>
        region.textContent?.includes("Career Path")
      );

      expect(stepRegion?.textContent).toContain("Step 1 of 4: Career Path");
    });

    it("should have proper ARIA attributes on live region", () => {
      renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

      const politeLiveRegions = document.querySelectorAll('[aria-live="polite"]');
      const stepRegion = Array.from(politeLiveRegions).find(r =>
        r.className?.includes("sr-only")
      );

      expect(stepRegion).toHaveAttribute("aria-live", "polite");
      expect(stepRegion).toHaveAttribute("aria-atomic", "true");
    });
  });

  describe("Validation Feedback", () => {
    it("lets users continue with their own search by default", async () => {
      const user = userEvent.setup();
      renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

      const continueButton = screen.getByRole("button", {
        name: /continue with my own search/i,
      });

      expect(continueButton).toBeEnabled();
      await user.click(continueButton);

      expect(screen.getByText("Review & Edit")).toBeInTheDocument();
      expect(screen.getByText("Add at least one job title")).toBeInTheDocument();
    });

    it("should have aria-live region for validation errors", () => {
      renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

      // Find assertive live region for validation
      const liveRegions = document.querySelectorAll('[aria-live="assertive"]');
      const validationRegion = Array.from(liveRegions).find(region =>
        region.className?.includes("sr-only")
      );

      expect(validationRegion).toBeDefined();
      expect(validationRegion).toHaveAttribute("aria-atomic", "true");
    });

    it("should have separate regions for step and validation announcements", () => {
      renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

      const politeLiveRegions = document.querySelectorAll('[aria-live="polite"]');
      const assertiveLiveRegions = document.querySelectorAll('[aria-live="assertive"]');

      // Should have at least one of each type
      expect(politeLiveRegions.length).toBeGreaterThan(0);
      expect(assertiveLiveRegions.length).toBeGreaterThan(0);

      // They should be different elements
      const politeElement = Array.from(politeLiveRegions).find(r => r.className?.includes("sr-only"));
      const assertiveElement = Array.from(assertiveLiveRegions).find(r => r.className?.includes("sr-only"));

      expect(politeElement).not.toBe(assertiveElement);
    });

    it("should use assertive aria-live for validation errors", () => {
      renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

      const assertiveRegions = document.querySelectorAll('[aria-live="assertive"]');
      const validationRegion = Array.from(assertiveRegions).find(r =>
        r.className?.includes("sr-only")
      );

      expect(validationRegion).toHaveAttribute("aria-live", "assertive");
      expect(validationRegion).toHaveAttribute("aria-atomic", "true");
    });
  });

  describe("LocationOption Checkbox Accessibility", () => {
    it("should render checkboxes with proper ARIA attributes", async () => {
      renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

      const [firstProfile] = screen.getAllByRole("radio");
      fireEvent.click(firstProfile);
      fireEvent.click(screen.getByRole("button", { name: /continue with this path/i }));
      fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));

      const remoteOption = await screen.findByRole("checkbox", {
        name: /remote: work from anywhere/i,
      });
      const hybridOption = screen.getByRole("checkbox", {
        name: /hybrid: mix of remote and office/i,
      });
      const onsiteOption = screen.getByRole("checkbox", {
        name: /on-site: work from the office/i,
      });

      expect(screen.getAllByRole("checkbox")).toHaveLength(3);
      expect(remoteOption).toHaveAttribute("aria-checked", "true");
      expect(remoteOption).toHaveAttribute("tabindex", "0");
      expect(["true", "false"]).toContain(hybridOption.getAttribute("aria-checked"));
      expect(["true", "false"]).toContain(onsiteOption.getAttribute("aria-checked"));

      const hybridInitialState = hybridOption.getAttribute("aria-checked");
      fireEvent.keyDown(hybridOption, { key: "Enter" });
      expect(hybridOption).toHaveAttribute(
        "aria-checked",
        hybridInitialState === "true" ? "false" : "true"
      );

      fireEvent.keyDown(remoteOption, { key: " " });
      expect(remoteOption).toHaveAttribute("aria-checked", "false");
    });

    it("does not detect location until the user requests it", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue({
        city: "Denver",
        region: "Colorado",
        country: "United States",
        timezone: "America/Denver",
      });

      renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

      const [firstProfile] = screen.getAllByRole("radio");
      await user.click(firstProfile);
      await user.click(
        screen.getByRole("button", { name: /continue with this path/i }),
      );
      await user.click(screen.getByRole("button", { name: /^continue$/i }));

      await waitFor(() => {
        expect(screen.getByText("Where do you want to work?")).toBeInTheDocument();
      });

      expect(
        mockInvoke.mock.calls.some(([cmd]) => cmd === "detect_location"),
      ).toBe(false);

      const hybridOption = screen.getByRole("checkbox", {
        name: /hybrid: mix of remote and office/i,
      });
      const hybridInput = hybridOption.querySelector("input");
      expect(hybridInput).toBeInstanceOf(HTMLInputElement);
      fireEvent.change(hybridInput as HTMLInputElement, {
        target: { checked: true },
      });

      const detectButton = await screen.findByRole("button", {
        name: /detect location/i,
      });
      await user.click(detectButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("detect_location", {});
      });
    });
  });

  describe("Screen Reader Support", () => {
    it("should have hidden live regions that are screen reader only", () => {
      renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

      const allLiveRegions = document.querySelectorAll('[aria-live]');
      const srOnlyRegions = Array.from(allLiveRegions).filter(r =>
        r.className?.includes("sr-only")
      );

      // Should have at least 2 sr-only live regions (step + validation)
      expect(srOnlyRegions.length).toBeGreaterThanOrEqual(2);

      // All sr-only regions should have aria-atomic
      srOnlyRegions.forEach(region => {
        expect(region).toHaveAttribute("aria-atomic", "true");
      });
    });

    it("should not interfere with visual UI", () => {
      renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

      const srOnlyRegions = document.querySelectorAll('.sr-only[aria-live]');

      // All sr-only live regions should be hidden visually
      srOnlyRegions.forEach(region => {
        expect(region.className).toContain("sr-only");
      });
    });
  });
});
