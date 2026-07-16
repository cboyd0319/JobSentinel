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

  const mockApplications = [
    { id: 1, job_title: "Customer Support Coordinator", company: "CareBridge Services" },
    { id: 2, job_title: "Program Assistant", company: "Neighborhood Works" },
  ];

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
        expect(screen.getByLabelText(/Interview style/)).toBeInTheDocument();
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
        expect(screen.getByLabelText(/Date and time/)).toBeInTheDocument();
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
          "Choose interview details",
          "Choose an application and time before scheduling.",
        );
      });
    });
  });

  describe("interview detail modal", () => {
    it("opens detail modal when interview is clicked", async () => {
      mockInvoke.mockResolvedValue([]);
      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Customer Support Coordinator")).toBeInTheDocument();
      });

      // Click on the interview card
      fireEvent.click(screen.getByText("Customer Support Coordinator"));

      await waitFor(() => {
        // Modal shows interview prep section
        expect(screen.getByText("Interview Prep")).toBeInTheDocument();
      });
    });

    it("shows interview prep checklist in modal", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Customer Support Coordinator")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Customer Support Coordinator"));

      await waitFor(() => {
        expect(screen.getByText("Research company background")).toBeInTheDocument();
        expect(screen.getByText("Review job description")).toBeInTheDocument();
        expect(screen.getByText("Prepare questions to ask")).toBeInTheDocument();
      });
    });

    it("opens app-composed company research", async () => {
      mockInvoke.mockResolvedValue([]);
      const renderCompanyResearch = vi.fn(({ companyName }) => (
        <div>Research for {companyName}</div>
      ));

      render(
        <InterviewScheduler
          onClose={mockOnClose}
          renderCompanyResearch={renderCompanyResearch}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Customer Support Coordinator")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Customer Support Coordinator"));
      fireEvent.click(screen.getByRole("button", { name: "Research" }));

      expect(screen.getByText("Research for CareBridge Services")).toBeInTheDocument();
      expect(renderCompanyResearch).toHaveBeenCalledWith(
        expect.objectContaining({ companyName: "CareBridge Services" }),
      );
    });

    it("shows Add to Calendar button in modal", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Customer Support Coordinator")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Customer Support Coordinator"));

      await waitFor(() => {
        expect(screen.getByText("Add to Calendar")).toBeInTheDocument();
      });
    });

    it("shows Mark as Complete section in modal", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Customer Support Coordinator")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Customer Support Coordinator"));

      await waitFor(() => {
        expect(screen.getByText("How did it go?")).toBeInTheDocument();
      });
    });

    it("shows outcome buttons in modal", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Customer Support Coordinator")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Customer Support Coordinator"));

      await waitFor(() => {
        expect(screen.getByText("Went well")).toBeInTheDocument();
        expect(screen.getByText("Not sure yet")).toBeInTheDocument();
        expect(screen.getByText("Not a fit")).toBeInTheDocument();
      });
    });

    it("shows feedback form when outcome button is clicked", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Customer Support Coordinator")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Customer Support Coordinator"));

      await waitFor(() => {
        expect(screen.getByText("Went well")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Went well"));

      await waitFor(() => {
        expect(screen.getByText("Interview outcome:")).toBeInTheDocument();
        expect(screen.getByText("Went well")).toBeInTheDocument();
      });
    });

    it("shows Delete button in modal", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Customer Support Coordinator")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Customer Support Coordinator"));

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });
    });

    it("shows delete confirmation when Delete is clicked", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<InterviewScheduler onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Customer Support Coordinator")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Customer Support Coordinator"));

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Delete"));

      await waitFor(() => {
        expect(screen.getByText("Delete this interview?")).toBeInTheDocument();
      });
    });
  });

});
