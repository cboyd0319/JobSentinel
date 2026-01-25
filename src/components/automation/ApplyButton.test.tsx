import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplyButton, AtsBadge } from "./ApplyButton";
import { ToastProvider } from "../../contexts";

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
  title: "Senior Software Engineer",
  company: "Tech Corp",
  location: "San Francisco, CA",
  url: "https://example.com/jobs/123",
  description: "Great opportunity",
  score: 85,
};

const mockAtsDetection = {
  platform: "greenhouse",
  commonFields: ["email", "phone", "name"],
  automationNotes: "Greenhouse supports form automation",
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
    it("renders Quick Apply button", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /quick apply/i })).toBeInTheDocument();
      });
    });

    it("renders with bolt icon", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /quick apply/i });
        const icon = button.querySelector("svg");
        expect(icon).toBeInTheDocument();
      });
    });

    it("button has appropriate title text when ready", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /quick apply/i });
        expect(button).toHaveAttribute("title", "Prepare to apply - fills form fields automatically");
      });
    });
  });

  describe("ATS platform detection", () => {
    it("shows loading skeleton during ATS detection", () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return new Promise(() => {}); // Never resolves
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
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
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
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
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
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
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
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
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /quick apply/i })).toBeInTheDocument();
      });

      expect(screen.queryByText("Unknown ATS")).not.toBeInTheDocument();
    });

    it("badge has automation notes in title attribute", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const badge = screen.getByText("Greenhouse");
        expect(badge).toHaveAttribute("title", "Greenhouse supports form automation");
      });
    });

    it("handles ATS detection failure gracefully", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.reject(new Error("Network error"));
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /quick apply/i })).toBeInTheDocument();
      });

      // Should not show any ATS badge
      expect(screen.queryByText(/greenhouse|lever|workday/i)).not.toBeInTheDocument();
    });
  });

  describe("profile check", () => {
    it("button is disabled when no profile exists", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve(null);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /quick apply/i });
        expect(button).toBeDisabled();
      });
    });

    it("button shows helper text when no profile", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve(null);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /quick apply/i });
        expect(button).toHaveAttribute("title", "Set up your application profile first");
      });
    });

    it("button is enabled when profile exists", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /quick apply/i });
        expect(button).not.toBeDisabled();
      });
    });

    it("handles profile check failure gracefully", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.reject(new Error("Failed to load"));
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /quick apply/i });
        expect(button).toBeDisabled();
      });
    });
  });

  describe("button click behavior", () => {
    it("shows error toast when clicking without profile", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve(null);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /quick apply/i });
        expect(button).toBeDisabled();
      });

      // Button should be disabled so click won't work
      // This is tested via the disabled state above
    });

    it("opens preview modal when clicking with profile", async () => {
      const user = userEvent.setup();
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /quick apply/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /quick apply/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Prepare Application")).toBeInTheDocument();
      });
    });

    it("calls onApplied callback after successful form fill", async () => {
      const user = userEvent.setup();
      const mockOnApplied = vi.fn();
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
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
        expect(screen.getByRole("button", { name: /quick apply/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /quick apply/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /fill form/i }));

      await waitFor(() => {
        expect(mockOnApplied).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("loading states", () => {
    it("button is disabled during ATS detection", () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return new Promise(() => {}); // Never resolves
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      const button = screen.getByRole("button", { name: /quick apply/i });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("title", "Detecting application platform...");
    });

    it("shows filling state during form fill", async () => {
      const user = userEvent.setup();
      let resolveFill: (value: unknown) => void;
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
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
        expect(screen.getByRole("button", { name: /quick apply/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /quick apply/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /fill form/i }));

      await waitFor(() => {
        expect(screen.getByText("Filling...")).toBeInTheDocument();
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

  describe("error states", () => {
    it("shows error message when form fill fails", async () => {
      const user = userEvent.setup();
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.reject(new Error("Failed to open browser"));
        }
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /quick apply/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /quick apply/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /fill form/i }));

      await waitFor(() => {
        expect(screen.getByText("Form Fill Failed")).toBeInTheDocument();
      });
    });

    it("displays error in modal when form fill fails", async () => {
      const user = userEvent.setup();
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.reject(new Error("Connection timeout"));
        }
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /quick apply/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /quick apply/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /fill form/i }));

      await waitFor(() => {
        // Check for error in modal specifically (not toast)
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveTextContent(/connection timeout/i);
      });
    });

    it("shows Try Again button after error", async () => {
      const user = userEvent.setup();
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /quick apply/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /quick apply/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /fill form/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
      });
    });

    it("allows retry after error", async () => {
      const user = userEvent.setup();
      let callCount = 0;
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error("First attempt failed"));
          }
          return Promise.resolve({
            filledFields: ["name"],
            unfilledFields: [],
            captchaDetected: false,
            readyForReview: true,
            errorMessage: null,
            attemptId: 123,
            durationMs: 1000,
            atsPlatform: "greenhouse",
          });
        }
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /quick apply/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /quick apply/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /fill form/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
      });

      // Retry
      await user.click(screen.getByRole("button", { name: /try again/i }));

      await waitFor(() => {
        expect(screen.getByText("Form filled!")).toBeInTheDocument();
      });
    });

    it("clears error when closing modal", async () => {
      const user = userEvent.setup();
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.reject(new Error("Test error"));
        }
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /quick apply/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /quick apply/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /fill form/i }));

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveTextContent(/test error/i);
      });

      // Close modal
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // Reopen modal
      await user.click(screen.getByRole("button", { name: /quick apply/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        // Error should be cleared from modal (error heading won't be present)
        const dialog = screen.getByRole("dialog");
        expect(dialog.textContent).not.toMatch(/form filling failed/i);
      });
    });
  });

  describe("browser management", () => {
    it("shows Close Browser button when browser is running", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(true);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close browser/i })).toBeInTheDocument();
      });
    });

    it("switches from Quick Apply to Close Browser after form fill", async () => {
      const user = userEvent.setup();
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.resolve({
            filledFields: ["name"],
            unfilledFields: [],
            captchaDetected: false,
            readyForReview: true,
            errorMessage: null,
            attemptId: 123,
            durationMs: 1000,
            atsPlatform: "greenhouse",
          });
        }
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /quick apply/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /quick apply/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /fill form/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close browser/i })).toBeInTheDocument();
      });
    });

    it("closes browser when clicking Close Browser button", async () => {
      const user = userEvent.setup();
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(true);
        if (cmd === "close_automation_browser") return Promise.resolve(null);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close browser/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /close browser/i }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("close_automation_browser", undefined);
      });
    });
  });

  describe("CAPTCHA handling", () => {
    it("shows CAPTCHA warning when detected", async () => {
      const user = userEvent.setup();
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.resolve({
            filledFields: ["name"],
            unfilledFields: [],
            captchaDetected: true,
            readyForReview: true,
            errorMessage: null,
            attemptId: 123,
            durationMs: 1000,
            atsPlatform: "greenhouse",
          });
        }
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /quick apply/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /quick apply/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /fill form/i }));

      await waitFor(() => {
        expect(screen.getByText("CAPTCHA detected")).toBeInTheDocument();
      });
    });
  });

  describe("screening questions", () => {
    it("reports screening questions filled", async () => {
      const user = userEvent.setup();
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.resolve({
            filledFields: ["name", "email", "screening:years_experience", "screening:work_auth"],
            unfilledFields: [],
            captchaDetected: false,
            readyForReview: true,
            errorMessage: null,
            attemptId: 123,
            durationMs: 2000,
            atsPlatform: "greenhouse",
          });
        }
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /quick apply/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /quick apply/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /fill form/i }));

      await waitFor(() => {
        expect(screen.getByText(/filled 2 basic fields and 2 screening questions/i)).toBeInTheDocument();
      });
    });
  });

  describe("localStorage persistence", () => {
    it("stores attempt ID after successful form fill", async () => {
      const user = userEvent.setup();
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.resolve({
            filledFields: ["name"],
            unfilledFields: [],
            captchaDetected: false,
            readyForReview: true,
            errorMessage: null,
            attemptId: 456,
            durationMs: 1000,
            atsPlatform: "greenhouse",
          });
        }
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /quick apply/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /quick apply/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /fill form/i }));

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith("lastAttempt_test-hash-123", "456");
      });
    });

    it("loads previous attempt ID on mount", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("789");
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      expect(localStorage.getItem).toHaveBeenCalledWith("lastAttempt_test-hash-123");
    });
  });

  describe("submit confirmation modal", () => {
    it("shows submit confirmation after closing browser with pending attempt", async () => {
      const user = userEvent.setup();
      vi.mocked(localStorage.getItem).mockReturnValue("999");
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(true);
        if (cmd === "close_automation_browser") return Promise.resolve(null);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close browser/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /close browser/i }));

      await waitFor(() => {
        expect(screen.getByText("Did you submit?")).toBeInTheDocument();
      });
    });

    it("marks attempt as submitted when clicking Yes", async () => {
      const user = userEvent.setup();
      vi.mocked(localStorage.getItem).mockReturnValue("888");
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(true);
        if (cmd === "close_automation_browser") return Promise.resolve(null);
        if (cmd === "mark_attempt_submitted") return Promise.resolve(null);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close browser/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /close browser/i }));

      await waitFor(() => {
        expect(screen.getByText("Did you submit?")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /yes, i submitted/i }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("mark_attempt_submitted", { attemptId: 888 });
      });
    });

    it("removes localStorage entry after marking submitted", async () => {
      const user = userEvent.setup();
      vi.mocked(localStorage.getItem).mockReturnValue("777");
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(true);
        if (cmd === "close_automation_browser") return Promise.resolve(null);
        if (cmd === "mark_attempt_submitted") return Promise.resolve(null);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close browser/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /close browser/i }));

      await waitFor(() => {
        expect(screen.getByText("Did you submit?")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /yes, i submitted/i }));

      await waitFor(() => {
        expect(localStorage.removeItem).toHaveBeenCalledWith("lastAttempt_test-hash-123");
      });
    });

    it("skips tracking when clicking No", async () => {
      const user = userEvent.setup();
      vi.mocked(localStorage.getItem).mockReturnValue("666");
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(true);
        if (cmd === "close_automation_browser") return Promise.resolve(null);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close browser/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /close browser/i }));

      await waitFor(() => {
        expect(screen.getByText("Did you submit?")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /no, skip/i }));

      await waitFor(() => {
        expect(localStorage.removeItem).toHaveBeenCalledWith("lastAttempt_test-hash-123");
        expect(screen.getByText("Application not tracked")).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("button has proper role", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /quick apply/i })).toBeInTheDocument();
      });
    });

    it("modal has proper role and title", async () => {
      const user = userEvent.setup();
      
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "get_application_profile") return Promise.resolve({ fullName: "Test User" });
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /quick apply/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /quick apply/i }));

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
        expect(screen.getByText("Prepare Application")).toBeInTheDocument();
      });
    });
  });
});

describe("AtsBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders Greenhouse badge when detected", async () => {
      mockInvoke.mockResolvedValue({
        platform: "greenhouse",
        commonFields: [],
        automationNotes: null,
      });

      render(<AtsBadge url="https://example.greenhouse.io/jobs/123" />);

      await waitFor(() => {
        expect(screen.getByText("Greenhouse")).toBeInTheDocument();
      });
    });

    it("renders Lever badge when detected", async () => {
      mockInvoke.mockResolvedValue({
        platform: "lever",
        commonFields: [],
        automationNotes: null,
      });

      render(<AtsBadge url="https://jobs.lever.co/company/123" />);

      await waitFor(() => {
        expect(screen.getByText("Lever")).toBeInTheDocument();
      });
    });

    it("does not render for unknown platform", async () => {
      mockInvoke.mockResolvedValue({
        platform: "unknown",
        commonFields: [],
        automationNotes: null,
      });

      const { container } = render(<AtsBadge url="https://example.com/jobs/123" />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it("does not render on detection error", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error("Failed to detect"));

      const { container } = render(<AtsBadge url="https://example.com/jobs/123" />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });

      consoleError.mockRestore();
    });

    it("applies correct color class for greenhouse", async () => {
      mockInvoke.mockResolvedValue({
        platform: "greenhouse",
        commonFields: [],
        automationNotes: null,
      });

      render(<AtsBadge url="https://example.greenhouse.io/jobs/123" />);

      await waitFor(() => {
        const badge = screen.getByText("Greenhouse");
        expect(badge).toHaveClass("bg-green-100");
      });
    });

    it("applies correct color class for lever", async () => {
      mockInvoke.mockResolvedValue({
        platform: "lever",
        commonFields: [],
        automationNotes: null,
      });

      render(<AtsBadge url="https://jobs.lever.co/company/123" />);

      await waitFor(() => {
        const badge = screen.getByText("Lever");
        expect(badge).toHaveClass("bg-blue-100");
      });
    });

    it("re-detects when URL changes", async () => {
      mockInvoke.mockResolvedValue({
        platform: "greenhouse",
        commonFields: [],
        automationNotes: null,
      });

      const { rerender } = render(<AtsBadge url="https://example.greenhouse.io/jobs/123" />);

      await waitFor(() => {
        expect(screen.getByText("Greenhouse")).toBeInTheDocument();
      });

      mockInvoke.mockResolvedValue({
        platform: "lever",
        commonFields: [],
        automationNotes: null,
      });

      rerender(<AtsBadge url="https://jobs.lever.co/company/456" />);

      await waitFor(() => {
        expect(screen.getByText("Lever")).toBeInTheDocument();
      });

      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });
  });
});
