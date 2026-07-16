import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InterviewScheduler } from "./InterviewScheduler";

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock cachedInvoke
const mockCachedInvoke = vi.fn();
vi.mock("../../platform/tauri", () => ({
  cachedInvoke: (...args: unknown[]) => mockCachedInvoke(...args),
  invalidateCacheByCommand: vi.fn(),
}));

// Mock useToast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};
vi.mock("../../shared/toast/useToast", () => ({
  useToast: () => mockToast,
}));

// Mock logError
vi.mock("../../shared/errorReporting/logger", () => ({
  logError: vi.fn(),
}));

// Mock URL methods for calendar reminder download
const mockCreateObjectURL = vi.fn(() => "blob:test");
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe("InterviewScheduler", () => {
  const mockOnClose = vi.fn();

  const mockUpcomingInterviews = [
    {
      id: 1,
      application_id: 1,
      interview_type: "technical",
      scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
      duration_minutes: 60,
      location: "Zoom Meeting",
      interviewer_name: "Morgan Rivera",
      interviewer_title: "Support Operations Manager",
      notes: "Review customer escalation examples",
      completed: false,
      outcome: null,
      post_interview_notes: null,
      job_title: "Customer Support Coordinator",
      company: "CareBridge Services",
    },
    {
      id: 2,
      application_id: 2,
      interview_type: "phone",
      scheduled_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
      duration_minutes: 30,
      location: null,
      interviewer_name: null,
      interviewer_title: null,
      notes: null,
      completed: false,
      outcome: null,
      post_interview_notes: null,
      job_title: "Program Assistant",
      company: "Neighborhood Works",
    },
  ];

  const mockPastInterviews = [
    {
      id: 3,
      application_id: 1,
      interview_type: "screening",
      scheduled_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      duration_minutes: 45,
      location: "Google Meet",
      interviewer_name: "Avery Patel",
      interviewer_title: "Recruiting Coordinator",
      notes: null,
      completed: true,
      outcome: "passed",
      post_interview_notes: "Went well, moving to next round",
      job_title: "Customer Support Coordinator",
      company: "CareBridge Services",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockCachedInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_upcoming_interviews") {
        return Promise.resolve(mockUpcomingInterviews);
      }
      if (cmd === "get_past_interviews") {
        return Promise.resolve(mockPastInterviews);
      }
      return Promise.resolve([]);
    });
    mockInvoke.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loading state", () => {
    it("shows loading skeleton initially", () => {
      mockCachedInvoke.mockImplementation(() => new Promise(() => {}));

      render(<InterviewScheduler onClose={mockOnClose} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText("Loading interviews")).toBeInTheDocument();
    });
  });

  describe("main view", () => {
    it("renders interview schedule header", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Interview Schedule")).toBeInTheDocument();
      });
    });

    it("shows upcoming and past tabs", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Upcoming \(\d+\)/)).toBeInTheDocument();
        expect(screen.getByText(/Past \(\d+\)/)).toBeInTheDocument();
      });
    });

    it("shows Schedule button", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        // Button text is "Schedule" (with icon before it)
        expect(screen.getByText("Schedule")).toBeInTheDocument();
      });
    });

    it("calls onClose when close button is clicked", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Interview Schedule")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText("Close interview scheduler"));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when clicking outside dialog", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Interview Schedule")).toBeInTheDocument();
      });

      // Click the backdrop (first role="dialog")
      fireEvent.click(screen.getAllByRole("dialog")[0]);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose on Escape key", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Interview Schedule")).toBeInTheDocument();
      });

      fireEvent.keyDown(screen.getAllByRole("dialog")[0], { key: "Escape" });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("upcoming interviews", () => {
    it("displays upcoming interviews list", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Customer Support Coordinator")).toBeInTheDocument();
        expect(screen.getByText("CareBridge Services")).toBeInTheDocument();
      });
    });

    it("shows interview type badge", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Skills Interview")).toBeInTheDocument();
      });
    });

    it("shows relative time badge", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        // Interview shows relative time (could be "1 days", "2 days" depending on time of day)
        expect(screen.getByText(/\d+ days/)).toBeInTheDocument();
      });
    });

    it("shows duration", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("60 min")).toBeInTheDocument();
      });
    });

    it("shows location when available", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Zoom Meeting")).toBeInTheDocument();
      });
    });

    it("shows interviewer info when available", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Morgan Rivera/)).toBeInTheDocument();
      });
    });

    it("shows add-to-calendar link", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getAllByText("Add to calendar").length).toBeGreaterThan(0);
      });
    });

    it("shows empty state when no upcoming interviews", async () => {
      mockCachedInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_upcoming_interviews") return Promise.resolve([]);
        if (cmd === "get_past_interviews") return Promise.resolve([]);
        return Promise.resolve([]);
      });

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("No upcoming interviews scheduled")).toBeInTheDocument();
      });
    });
  });

  describe("past interviews tab", () => {
    it("switches to past tab when clicked", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Past \(\d+\)/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Past \(\d+\)/));

      await waitFor(() => {
        expect(screen.getByText("Screening Call")).toBeInTheDocument();
      });
    });

    it("shows past interview with outcome badge", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Past \(\d+\)/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Past \(\d+\)/));

      await waitFor(() => {
        expect(screen.getByText("Went well")).toBeInTheDocument();
        expect(screen.queryByText("Passed")).not.toBeInTheDocument();
      });
    });

    it("shows post-interview notes for past interview", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Past \(\d+\)/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Past \(\d+\)/));

      await waitFor(() => {
        expect(screen.getByText(/Went well, moving to next round/)).toBeInTheDocument();
      });
    });

    it("shows empty state when no past interviews", async () => {
      mockCachedInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_upcoming_interviews") return Promise.resolve([]);
        if (cmd === "get_past_interviews") return Promise.resolve([]);
        return Promise.resolve([]);
      });

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Past \(0\)/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Past \(0\)/));

      await waitFor(() => {
        expect(screen.getByText("No past interviews yet")).toBeInTheDocument();
      });
    });
  });

  describe("calendar export", () => {
    it("triggers download when add-to-calendar link is clicked", async () => {
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");
      const anchorClickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => undefined);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getAllByText("Add to calendar").length).toBeGreaterThan(0);
      });

      fireEvent.click(screen.getAllByText("Add to calendar")[0]);

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(appendChildSpy).toHaveBeenCalled();
        expect(anchorClickSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
        expect(mockRevokeObjectURL).toHaveBeenCalled();
        expect(mockToast.success).toHaveBeenCalledWith(
          "Calendar downloaded",
          "Add to your calendar app"
        );
      });

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      anchorClickSpy.mockRestore();
    });
  });

  describe("interview type labels", () => {
    it("displays Phone Screen for phone type", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Phone Screen")).toBeInTheDocument();
      });
    });

    it("displays Skills Interview for technical type", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Skills Interview")).toBeInTheDocument();
      });
    });
  });

  describe("follow-up reminders", () => {
    it("shows follow-up checkbox for past interviews", async () => {
      mockCachedInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_upcoming_interviews") return Promise.resolve([]);
        if (cmd === "get_past_interviews") return Promise.resolve(mockPastInterviews);
        return Promise.resolve([]);
      });
      mockInvoke.mockResolvedValue(null);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Past \(1\)/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Past \(1\)/));

      await waitFor(() => {
        expect(screen.getByText("Send thank you note")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("shows error toast when fetching fails", async () => {
      mockCachedInvoke.mockRejectedValue(new Error("Network error"));

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Connection Problem",
          expect.stringContaining("Check your internet connection"),
        );
      });
    });
  });
});
