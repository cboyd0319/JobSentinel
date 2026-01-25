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
vi.mock("../utils/api", () => ({
  cachedInvoke: (...args: unknown[]) => mockCachedInvoke(...args),
  invalidateCacheByCommand: vi.fn(),
}));

// Mock useToast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};
vi.mock("../contexts", () => ({
  useToast: () => mockToast,
}));

// Mock logError
vi.mock("../utils/errorUtils", () => ({
  logError: vi.fn(),
  getErrorMessage: (err: Error) => err.message,
}));

// Mock URL methods for iCal download
const mockCreateObjectURL = vi.fn(() => "blob:test");
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe("InterviewScheduler", () => {
  const mockOnClose = vi.fn();

  const mockApplications = [
    { id: 1, job_title: "Software Engineer", company: "TechCorp" },
    { id: 2, job_title: "Frontend Developer", company: "WebStart" },
  ];

  const mockUpcomingInterviews = [
    {
      id: 1,
      application_id: 1,
      interview_type: "technical",
      scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
      duration_minutes: 60,
      location: "Zoom Meeting",
      interviewer_name: "John Smith",
      interviewer_title: "Engineering Manager",
      notes: "Prepare system design",
      completed: false,
      outcome: null,
      post_interview_notes: null,
      job_title: "Software Engineer",
      company: "TechCorp",
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
      job_title: "Frontend Developer",
      company: "WebStart",
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
      interviewer_name: "Jane Doe",
      interviewer_title: "HR Manager",
      notes: null,
      completed: true,
      outcome: "passed",
      post_interview_notes: "Went well, moving to next round",
      job_title: "Software Engineer",
      company: "TechCorp",
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
        expect(screen.getByText("Software Engineer")).toBeInTheDocument();
        expect(screen.getByText("TechCorp")).toBeInTheDocument();
      });
    });

    it("shows interview type badge", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Technical Interview")).toBeInTheDocument();
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
        expect(screen.getByText(/John Smith/)).toBeInTheDocument();
      });
    });

    it("shows iCal download link", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getAllByText("iCal").length).toBeGreaterThan(0);
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
        expect(screen.getByText("Passed")).toBeInTheDocument();
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

  describe("add interview form", () => {
    it("opens form when Schedule button is clicked", async () => {
      render(
        <InterviewScheduler onClose={mockOnClose} applications={mockApplications} />
      );

      await waitFor(() => {
        expect(screen.getByText("Schedule")).toBeInTheDocument();
      });

      // Find and click the Schedule button (first one, in header)
      const scheduleButtons = screen.getAllByText("Schedule");
      fireEvent.click(scheduleButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Schedule Interview")).toBeInTheDocument();
      });
    });

    it("shows application dropdown in form", async () => {
      render(
        <InterviewScheduler onClose={mockOnClose} applications={mockApplications} />
      );

      await waitFor(() => {
        expect(screen.getByText("Schedule")).toBeInTheDocument();
      });

      const scheduleButtons = screen.getAllByText("Schedule");
      fireEvent.click(scheduleButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText(/Application/)).toBeInTheDocument();
      });
    });

    it("shows interview type dropdown in form", async () => {
      render(
        <InterviewScheduler onClose={mockOnClose} applications={mockApplications} />
      );

      await waitFor(() => {
        expect(screen.getByText("Schedule")).toBeInTheDocument();
      });

      const scheduleButtons = screen.getAllByText("Schedule");
      fireEvent.click(scheduleButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText(/Interview Type/)).toBeInTheDocument();
      });
    });

    it("shows date/time input in form", async () => {
      render(
        <InterviewScheduler onClose={mockOnClose} applications={mockApplications} />
      );

      await waitFor(() => {
        expect(screen.getByText("Schedule")).toBeInTheDocument();
      });

      const scheduleButtons = screen.getAllByText("Schedule");
      fireEvent.click(scheduleButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText(/Date & Time/)).toBeInTheDocument();
      });
    });

    it("shows duration dropdown in form", async () => {
      render(
        <InterviewScheduler onClose={mockOnClose} applications={mockApplications} />
      );

      await waitFor(() => {
        expect(screen.getByText("Schedule")).toBeInTheDocument();
      });

      const scheduleButtons = screen.getAllByText("Schedule");
      fireEvent.click(scheduleButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText(/Duration/)).toBeInTheDocument();
      });
    });

    it("closes form when Cancel is clicked", async () => {
      render(
        <InterviewScheduler onClose={mockOnClose} applications={mockApplications} />
      );

      await waitFor(() => {
        expect(screen.getByText("Schedule")).toBeInTheDocument();
      });

      const scheduleButtons = screen.getAllByText("Schedule");
      fireEvent.click(scheduleButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Schedule Interview")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(screen.queryByText("Schedule Interview")).not.toBeInTheDocument();
      });
    });

    it("shows error when required fields are missing", async () => {
      render(
        <InterviewScheduler onClose={mockOnClose} applications={mockApplications} />
      );

      await waitFor(() => {
        expect(screen.getByText("Schedule")).toBeInTheDocument();
      });

      // Open the form
      const scheduleButtons = screen.getAllByText("Schedule");
      fireEvent.click(scheduleButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Schedule Interview")).toBeInTheDocument();
      });

      // Click the form's Schedule button (second one after modal opens)
      const allScheduleButtons = screen.getAllByText("Schedule");
      fireEvent.click(allScheduleButtons[allScheduleButtons.length - 1]);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Missing required fields",
          "Please select an application and date/time"
        );
      });
    });
  });

  describe("interview detail modal", () => {
    it("opens detail modal when interview is clicked", async () => {
      mockInvoke.mockResolvedValue([]);
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      });

      // Click on the interview card
      fireEvent.click(screen.getByText("Software Engineer"));

      await waitFor(() => {
        // Modal shows interview prep section
        expect(screen.getByText("Interview Prep")).toBeInTheDocument();
      });
    });

    it("shows interview prep checklist in modal", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Software Engineer"));

      await waitFor(() => {
        expect(screen.getByText("Research company background")).toBeInTheDocument();
        expect(screen.getByText("Review job description")).toBeInTheDocument();
        expect(screen.getByText("Prepare questions to ask")).toBeInTheDocument();
      });
    });

    it("shows Add to Calendar button in modal", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Software Engineer"));

      await waitFor(() => {
        expect(screen.getByText("Add to Calendar")).toBeInTheDocument();
      });
    });

    it("shows Mark as Complete section in modal", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Software Engineer"));

      await waitFor(() => {
        expect(screen.getByText("Mark as Complete")).toBeInTheDocument();
      });
    });

    it("shows outcome buttons in modal", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Software Engineer"));

      await waitFor(() => {
        expect(screen.getByText("✓ Passed")).toBeInTheDocument();
        expect(screen.getByText("⏳ Pending")).toBeInTheDocument();
        expect(screen.getByText("✗ Failed")).toBeInTheDocument();
      });
    });

    it("shows feedback form when outcome button is clicked", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Software Engineer"));

      await waitFor(() => {
        expect(screen.getByText("✓ Passed")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("✓ Passed"));

      await waitFor(() => {
        expect(screen.getByText("Interview Outcome:")).toBeInTheDocument();
      });
    });

    it("shows Delete button in modal", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Software Engineer"));

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });
    });

    it("shows delete confirmation when Delete is clicked", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Software Engineer"));

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Delete"));

      await waitFor(() => {
        expect(screen.getByText("Delete this interview?")).toBeInTheDocument();
      });
    });
  });

  describe("iCal export", () => {
    it("triggers download when iCal link is clicked", async () => {
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getAllByText("iCal").length).toBeGreaterThan(0);
      });

      fireEvent.click(screen.getAllByText("iCal")[0]);

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
        expect(mockRevokeObjectURL).toHaveBeenCalled();
        expect(mockToast.success).toHaveBeenCalledWith(
          "Calendar downloaded",
          "Add to your calendar app"
        );
      });

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe("interview type labels", () => {
    it("displays Phone Screen for phone type", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Phone Screen")).toBeInTheDocument();
      });
    });

    it("displays Technical Interview for technical type", async () => {
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Technical Interview")).toBeInTheDocument();
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
          "Failed to load interviews",
          "Network error"
        );
      });
    });
  });
});
