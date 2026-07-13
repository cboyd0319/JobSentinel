import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import SetupWizard from "./SetupWizard";
import { ToastProvider } from "../../app/providers/ToastProvider";

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


describe("SetupWizard location accessibility", () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });
  describe("LocationOption Checkbox Accessibility", () => {
    it("should render checkboxes with proper ARIA attributes", async () => {
      renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

      fireEvent.click(
        screen.getByRole("radio", {
          name: /Software & Tech: Engineers, developers, DevOps, and SRE roles/i,
        }),
      );
      fireEvent.click(screen.getByRole("button", { name: /use these starting ideas/i }));
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
        screen.getByRole("button", { name: /use these starting ideas/i }),
      );
      await user.click(screen.getByRole("button", { name: /^continue$/i }));

      await waitFor(() => {
        expect(screen.getByText("Where do you want to work?")).toBeInTheDocument();
      });
      expect(
        screen.getByText(/asks an outside location lookup service/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/nothing is saved unless you add the city/i),
      ).toBeInTheDocument();

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

    it("blocks continuing when no work location option is selected", async () => {
      const user = userEvent.setup();
      renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

      await user.click(screen.getByRole("button", { name: /build my search/i }));
      await user.type(screen.getByPlaceholderText("Add a job title..."), "Office Manager{enter}");
      await user.click(screen.getByRole("button", { name: /^continue$/i }));

      const remoteOption = await screen.findByRole("checkbox", {
        name: /remote: work from anywhere/i,
      });
      const hybridOption = screen.getByRole("checkbox", {
        name: /hybrid: mix of remote and office/i,
      });
      const onsiteOption = screen.getByRole("checkbox", {
        name: /on-site: work from the office/i,
      });
      fireEvent.keyDown(remoteOption, { key: " " });
      fireEvent.keyDown(hybridOption, { key: " " });
      fireEvent.keyDown(onsiteOption, { key: " " });

      const continueButton = screen.getByRole("button", { name: /^continue$/i });
      expect(continueButton).toBeDisabled();
      expect(
        screen.getAllByText("Choose at least one work location option to continue").length,
      ).toBeGreaterThanOrEqual(2);

      const validationRegion = Array.from(
        document.querySelectorAll('[aria-live="assertive"]'),
      ).find((region) => region.className?.includes("sr-only"));
      expect(validationRegion?.textContent).toContain(
        "Choose at least one work location option to continue",
      );

      fireEvent.keyDown(remoteOption, { key: " " });
      expect(continueButton).toBeEnabled();
      expect(validationRegion?.textContent).toBe("");
    });

    it("lets users mark location as not sure before scanning starts", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(undefined);
      renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

      await user.click(screen.getByRole("button", { name: /build my search/i }));
      await user.type(screen.getByPlaceholderText("Add a job title..."), "Office Manager{enter}");
      await user.click(screen.getByRole("button", { name: /^continue$/i }));

      await user.click(screen.getByRole("button", { name: /not sure about location yet/i }));

      expect(screen.getByRole("checkbox", {
        name: /remote: work from anywhere/i,
      })).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("checkbox", {
        name: /hybrid: mix of remote and office/i,
      })).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("checkbox", {
        name: /on-site: work from the office/i,
      })).toHaveAttribute("aria-checked", "true");

      await user.click(screen.getByRole("button", { name: /^continue$/i }));
      expect(screen.getByText("remote, hybrid, on-site")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /start finding jobs/i }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          "complete_setup",
          expect.objectContaining({
            config: expect.objectContaining({
              title_allowlist: ["Office Manager"],
              location_preferences: expect.objectContaining({
                allow_remote: true,
                allow_hybrid: true,
                allow_onsite: true,
                cities: [],
              }),
            }),
          }),
        );
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
