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

  describe("error states", () => {
    it("shows error message when form fill fails", async () => {
      const user = userEvent.setup();

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.reject(new Error("Failed to open browser"));
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
        expect(screen.getByRole("dialog")).toHaveTextContent(/safe support report/i);
      });
    });

    it("displays error in modal when form fill fails", async () => {
      const user = userEvent.setup();

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.reject(new Error("Connection timeout"));
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
        // Check for error in modal specifically (not toast)
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveTextContent(/could not prepare details/i);
        expect(dialog).toHaveTextContent(/check your internet connection/i);
      });
    });

    it("shows Try Again button after error", async () => {
      const user = userEvent.setup();

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.reject(new Error("Network error"));
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
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
      });
    });

    it("allows retry after error", async () => {
      const user = userEvent.setup();
      let callCount = 0;

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
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
        expect(screen.getByRole("button", { name: /prepare form/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /prepare form/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /prepare details/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
      });

      // Retry
      await user.click(screen.getByRole("button", { name: /try again/i }));

      await waitFor(() => {
        expect(screen.getByText("Form ready for review")).toBeInTheDocument();
      });
    });

    it("does not show raw private details from form preparation failures", async () => {
      const user = userEvent.setup();

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.resolve({
            filledFields: [],
            unfilledFields: [],
            captchaDetected: false,
            readyForReview: false,
            errorMessage: "token=raw-secret private@example.test <local-path>/resume.pdf",
            attemptId: null,
            durationMs: 1000,
            atsPlatform: "greenhouse",
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
        expect(screen.getByRole("dialog")).toHaveTextContent(/safe support report/i);
      });
      expect(
        screen.queryByText(/raw-secret|private@example\.test|<local-path>/),
      ).not.toBeInTheDocument();
    });

    it("does not show raw private details from thrown preparation errors", async () => {
      const user = userEvent.setup();

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.reject(
            new Error("token=raw-secret private@example.test <local-path>/resume.pdf"),
          );
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
        expect(screen.getByRole("dialog")).toHaveTextContent(/safe support report/i);
      });
      expect(screen.queryByText(/raw-secret|private@example\.test|resume=private-file/)).not.toBeInTheDocument();
    });

    it("clears error when closing modal", async () => {
      const user = userEvent.setup();

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.reject(new Error("Test error"));
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
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveTextContent(/safe support report/i);
      });

      // Close modal
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // Reopen modal
      await user.click(screen.getByRole("button", { name: /prepare form/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        // Error should be cleared from modal (error heading won't be present)
        const dialog = screen.getByRole("dialog");
        expect(dialog.textContent).not.toMatch(/could not prepare details/i);
      });
    });
  });

});
