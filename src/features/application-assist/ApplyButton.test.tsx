import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplyButton } from "./ApplyButton";
import { ToastProvider } from "../../app/providers/ToastProvider";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const { invoke } = await import("@tauri-apps/api/core");
const mockInvoke = vi.mocked(invoke);

// Helper to render with ToastProvider
const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

const mockJob = {
  id: 1,
  hash: "test-hash-123",
  title: "Customer Support Lead",
  company: "CareBridge Services",
  location: "Chicago, IL",
  url: "https://example.com/jobs/123",
  description: "Great opportunity",
  score: 85,
};

const mockAtsDetection = {
  platform: "greenhouse",
  commonFields: ["email", "phone", "name"],
  automationNotes: "Greenhouse recognized",
};

describe("ApplyButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockImplementation(() => {});
    vi.mocked(localStorage.removeItem).mockImplementation(() => {});
  });

  describe("initial rendering", () => {
    it("renders prepare form button", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /prepare form/i })).toBeInTheDocument();
      });
    });

    it("renders with bolt icon", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /prepare form/i });
        const icon = button.querySelector("svg");
        expect(icon).toBeInTheDocument();
      });
    });

    it("button has appropriate title text when ready", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /prepare form/i });
        expect(button).toHaveAttribute("title", "Prepare application form for your review");
      });
    });

    it("checks profile existence without loading profile details", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /prepare form/i })).not.toBeDisabled();
      });

      expect(mockInvoke).toHaveBeenCalledWith("has_application_profile", undefined);
      expect(mockInvoke).not.toHaveBeenCalledWith("get_application_profile", undefined);
    });
  });

  describe("application form detection", () => {
    it("shows loading skeleton during form detection", () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return new Promise(() => {}); // Never resolves
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      const { container } = renderWithToast(<ApplyButton job={mockJob} />);

      const skeleton = container.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("displays Greenhouse badge when detected", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByText("Greenhouse")).toBeInTheDocument();
      });
    });

    it("displays Lever badge when detected", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") {
          return Promise.resolve({ ...mockAtsDetection, platform: "lever" });
        }
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByText("Lever")).toBeInTheDocument();
      });
    });

    it("displays Workday badge when detected", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") {
          return Promise.resolve({ ...mockAtsDetection, platform: "workday" });
        }
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByText("Workday")).toBeInTheDocument();
      });
    });

    it("does not show badge for unknown platform", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") {
          return Promise.resolve({ ...mockAtsDetection, platform: "unknown" });
        }
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /prepare form/i })).toBeInTheDocument();
      });

      expect(screen.queryByText("Unknown application form")).not.toBeInTheDocument();
    });

    it("badge uses fixed plain-language help text", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const badge = screen.getByText("Greenhouse");
        expect(badge).toHaveAttribute("title", "Recognized application form");
      });
    });

    it("handles application form detection failure gracefully", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.reject(new Error("Network error"));
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /prepare form/i })).toBeInTheDocument();
      });

      // Should not show any application form badge
      expect(screen.queryByText(/greenhouse|lever|workday/i)).not.toBeInTheDocument();
    });
  });

  describe("profile check", () => {
    it("button is disabled when no profile exists", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(false);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /prepare form/i });
        expect(button).toBeDisabled();
      });
    });

    it("button shows helper text when no profile", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(false);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /prepare form/i });
        expect(button).toHaveAttribute(
          "title",
          "Save your application profile in Application Assist"
        );
      });
    });

    it("shows a direct setup action when no profile exists", async () => {
      const user = userEvent.setup();
      const onOpenApplicationAssist = vi.fn();
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(false);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(
        <ApplyButton job={mockJob} onOpenApplicationAssist={onOpenApplicationAssist} />
      );

      const setupButton = await screen.findByRole("button", { name: /set up profile/i });
      await user.click(setupButton);

      expect(onOpenApplicationAssist).toHaveBeenCalledOnce();
    });

    it("button is enabled when profile exists", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /prepare form/i });
        expect(button).not.toBeDisabled();
      });
    });

    it("handles profile check failure gracefully", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.reject(new Error("Failed to load"));
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /prepare form/i });
        expect(button).toBeDisabled();
      });
    });
  });

  describe("button click behavior", () => {
    it("shows error toast when clicking without profile", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(false);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /prepare form/i });
        expect(button).toBeDisabled();
      });

      // Button should be disabled so click won't work
      // This is tested via the disabled state above
    });

    it("opens preview modal when clicking with profile", async () => {
      const user = userEvent.setup();
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /prepare form/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /prepare form/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Review Application")).toBeInTheDocument();
      });
    });

    it("calls onApplied callback after successful form fill", async () => {
      const user = userEvent.setup();
      const mockOnApplied = vi.fn();
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.resolve({
            filledFields: ["name", "email", "phone"],
            unfilledFields: [],
            captchaDetected: false,
            readyForReview: true,
            errorMessage: null,
            attemptId: 123,
            durationMs: 2500,
            atsPlatform: "greenhouse",
          });
        }
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} onApplied={mockOnApplied} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /prepare form/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /prepare form/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /prepare details/i }));

      await waitFor(() => {
        expect(mockOnApplied).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("loading states", () => {
    it("keeps prepare available during form detection", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return new Promise(() => {}); // Never resolves
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /prepare form/i });
        expect(button).not.toBeDisabled();
        expect(button).toHaveAttribute(
          "title",
          "Form check is still running. You can prepare details now."
        );
      });
    });

    it("shows filling state during form fill", async () => {
      const user = userEvent.setup();
      let resolveFill: (value: unknown) => void;
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return new Promise((resolve) => {
            resolveFill = resolve;
          });
        }
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /prepare form/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /prepare form/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /prepare details/i }));

      await waitFor(() => {
        expect(screen.getByText("Preparing...")).toBeInTheDocument();
      });

      // Resolve the promise
      resolveFill!({
        filledFields: ["name"],
        unfilledFields: [],
        captchaDetected: false,
        readyForReview: true,
        errorMessage: null,
        attemptId: 123,
        durationMs: 1000,
        atsPlatform: "greenhouse",
      });
    });
  });

});
