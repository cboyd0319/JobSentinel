import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplyButton } from "./ApplyButton";
import { ToastProvider } from "../../contexts";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const { invoke } = await import("@tauri-apps/api/core");
const mockInvoke = vi.mocked(invoke);

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

describe("ApplyButton lifecycle behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockImplementation(() => {});
    vi.mocked(localStorage.removeItem).mockImplementation(() => {});
  });

  describe("browser management", () => {
    it("shows Close Browser button when browser is running", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(true);
        return Promise.resolve(null);
      });

      renderWithToast(<ApplyButton job={mockJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close browser/i })).toBeInTheDocument();
      });
    });

    it("switches from prepare form to Close Browser after form fill", async () => {
      const user = userEvent.setup();

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
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
        expect(screen.getByRole("button", { name: /prepare form/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /prepare form/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /prepare details/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close browser/i })).toBeInTheDocument();
      });
    });

    it("closes browser when clicking Close Browser button", async () => {
      const user = userEvent.setup();

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
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

  describe("human-check handling", () => {
    it("shows human-check warning when the site asks for one", async () => {
      const user = userEvent.setup();

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
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
        expect(screen.getByRole("button", { name: /prepare form/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /prepare form/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /prepare details/i }));

      await waitFor(() => {
        expect(screen.getByText("Site asked for a human check")).toBeInTheDocument();
        expect(screen.queryByText(/captcha detected/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("screening questions", () => {
    it("reports screening questions filled", async () => {
      const user = userEvent.setup();

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        if (cmd === "fill_application_form") {
          return Promise.resolve({
            filledFields: ["name", "email", "screening:years_experience", "screening:work_auth"],
            screeningAnswerTopics: ["work authorization", "education"],
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
        expect(screen.getByRole("button", { name: /prepare form/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /prepare form/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /prepare details/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/prepared 2 profile fields and 2 saved screening answers/i),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/check saved answers for work authorization and education/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("localStorage persistence", () => {
    it("stores attempt ID after successful form fill", async () => {
      const user = userEvent.setup();

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
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
        expect(screen.getByRole("button", { name: /prepare form/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole("button", { name: /prepare form/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /prepare details/i }));

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith("lastAttempt_test-hash-123", "456");
      });
    });

    it("loads previous attempt ID on mount", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("789");

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
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
        if (cmd === "has_application_profile") return Promise.resolve(true);
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
        expect(screen.getByText("Did you submit the application?")).toBeInTheDocument();
      });
    });

    it("marks attempt as submitted when clicking Yes", async () => {
      const user = userEvent.setup();
      vi.mocked(localStorage.getItem).mockReturnValue("888");

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
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
        expect(screen.getByText("Did you submit the application?")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /yes, i submitted it/i }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("mark_attempt_submitted", { attemptId: 888 });
      });
    });

    it("removes localStorage entry after marking submitted", async () => {
      const user = userEvent.setup();
      vi.mocked(localStorage.getItem).mockReturnValue("777");

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
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
        expect(screen.getByText("Did you submit the application?")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /yes, i submitted it/i }));

      await waitFor(() => {
        expect(localStorage.removeItem).toHaveBeenCalledWith("lastAttempt_test-hash-123");
      });
    });

    it("skips tracking when clicking No", async () => {
      const user = userEvent.setup();
      vi.mocked(localStorage.getItem).mockReturnValue("666");

      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") return Promise.resolve(mockAtsDetection);
        if (cmd === "has_application_profile") return Promise.resolve(true);
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
        expect(screen.getByText("Did you submit the application?")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /no, skip/i }));

      await waitFor(() => {
        expect(localStorage.removeItem).toHaveBeenCalledWith("lastAttempt_test-hash-123");
        expect(screen.getByText("Not added to your board")).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("button has proper role", async () => {
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

    it("modal has proper role and title", async () => {
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
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
        expect(screen.getByText("Review Application")).toBeInTheDocument();
      });
    });
  });
});
