import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ApplicationPreview } from "./ApplicationPreview";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const { invoke } = await import("@tauri-apps/api/core");
const mockInvoke = vi.mocked(invoke);

const mockJob = {
  id: 1,
  hash: "test-hash-123",
  title: "Customer Support Manager",
  company: "CareBridge Health",
  location: "Chicago, IL",
  url: "https://example.com/jobs/123",
  description: "Great opportunity",
  score: 85,
};

const mockProfile = {
  fullName: "Jordan Lee",
  email: "jordan@example.com",
  phone: "+1 (555) 123-4567",
  linkedinUrl: "https://linkedin.com/in/jordanlee",
  githubUrl: "https://profile.example.com/jordanlee",
  portfolioUrl: "https://jordanlee.example.com/work",
  websiteUrl: "https://jordanlee.example.com",
  usWorkAuthorized: true,
  requiresSponsorship: false,
};

describe("ApplicationPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("shows loading spinner initially", () => {
      mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      expect(screen.getByRole("status", { name: /loading application preview/i })).toBeInTheDocument();
      const spinner = screen.getByRole("status").querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("loading spinner has proper accessibility attributes", () => {
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      const status = screen.getByRole("status", { name: /loading application preview/i });
      expect(status).toHaveAttribute("aria-busy", "true");
    });

    it("hides loading state after data loads", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
      });
    });

    it("loads only the application profile preview", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
      });

      expect(mockInvoke).toHaveBeenCalledWith("get_application_profile_preview");
      expect(mockInvoke).not.toHaveBeenCalledWith("get_application_profile");
    });
  });

  describe("no profile state", () => {
    it("shows message when profile is null", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/set up your application profile/i)).toBeInTheDocument();
      });
    });

    it("uses plain setup instruction when no profile exists", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/preview what JobSentinel can prepare/i)).toBeInTheDocument();
      });
      expect(screen.queryByText(/no profile configured/i)).not.toBeInTheDocument();
    });

    it("no profile message has proper role", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const message = screen.getByText(/set up your application profile/i);
        expect(message.closest('[role="status"]')).toBeInTheDocument();
      });
    });
  });

  describe("job summary rendering", () => {
    it("displays job title", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Customer Support Manager")).toBeInTheDocument();
      });
    });

    it("displays company name", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/CareBridge Health/)).toBeInTheDocument();
      });
    });

    it("displays location", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/Chicago, IL/)).toBeInTheDocument();
      });
    });

    it("shows application form badge when platform is known", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Greenhouse")).toBeInTheDocument();
        expect(screen.getByLabelText("Application form: Greenhouse")).toBeInTheDocument();
      });
    });

    it("formats unknown recognized platform ids as readable labels", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="smart_recruiters" />);

      await waitFor(() => {
        expect(screen.getByText("Smart Recruiters")).toBeInTheDocument();
        expect(screen.getByLabelText("Application form: Smart Recruiters")).toBeInTheDocument();
      });
    });

    it("does not show application form badge when platform is unknown", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="unknown" />);

      await waitFor(() => {
        const badge = screen.queryByLabelText(/application form/i);
        expect(badge).not.toBeInTheDocument();
      });
    });

    it("does not show application form badge when platform is null", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform={null} />);

      await waitFor(() => {
        const badge = screen.queryByLabelText(/application form/i);
        expect(badge).not.toBeInTheDocument();
      });
    });
  });

  describe("prepared fields display", () => {
    it("displays full name", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Full Name")).toBeInTheDocument();
        expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
      });
    });

    it("displays email", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Email")).toBeInTheDocument();
        expect(screen.getByText("jordan@example.com")).toBeInTheDocument();
      });
    });

    it("displays phone when provided", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Phone")).toBeInTheDocument();
        expect(screen.getByText("+1 (555) 123-4567")).toBeInTheDocument();
      });
    });

    it("displays LinkedIn when provided", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("LinkedIn")).toBeInTheDocument();
        expect(screen.getByText("https://linkedin.com/in/jordanlee")).toBeInTheDocument();
      });
    });

    it("displays work sample profile when provided", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Work samples or profile")).toBeInTheDocument();
        expect(screen.getByText("https://profile.example.com/jordanlee")).toBeInTheDocument();
      });
    });

    it("displays portfolio when provided", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Portfolio")).toBeInTheDocument();
        expect(screen.getByText("https://jordanlee.example.com/work")).toBeInTheDocument();
      });
    });

    it("displays website when provided", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Personal website or credential page")).toBeInTheDocument();
        expect(screen.getByText("https://jordanlee.example.com")).toBeInTheDocument();
      });
    });

    it("displays US work authorization status", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("US Work Authorization")).toBeInTheDocument();
        expect(screen.getByText("Yes")).toBeInTheDocument();
      });
    });

    it("displays sponsorship requirement", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Requires Sponsorship")).toBeInTheDocument();
        const values = screen.getAllByText("No");
        expect(values.length).toBeGreaterThan(0);
      });
    });

    it("shows 'No' for work authorization when false", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        usWorkAuthorized: false,
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("US Work Authorization")).toBeInTheDocument();
        const values = screen.getAllByText("No");
        expect(values.length).toBeGreaterThan(0);
      });
    });

    it("shows 'Yes' for sponsorship when true", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        requiresSponsorship: true,
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Requires Sponsorship")).toBeInTheDocument();
        const values = screen.getAllByText("Yes");
        expect(values.length).toBeGreaterThan(0);
      });
    });
  });

  describe("missing optional fields", () => {
    it("does not show phone when null", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        phone: null,
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.queryByText("Phone")).not.toBeInTheDocument();
      });
    });

    it("does not show LinkedIn when null", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        linkedinUrl: null,
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.queryByText("LinkedIn")).not.toBeInTheDocument();
      });
    });

    it("does not show work sample profile when null", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        githubUrl: null,
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.queryByText("Work samples or profile")).not.toBeInTheDocument();
      });
    });

    it("handles minimal profile with only required fields", async () => {
      mockInvoke.mockResolvedValue({
        fullName: "Jane Smith",
        email: "jane@example.com",
        phone: null,
        linkedinUrl: null,
        githubUrl: null,
        portfolioUrl: null,
        websiteUrl: null,
        usWorkAuthorized: true,
        requiresSponsorship: false,
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
        expect(screen.getByText("jane@example.com")).toBeInTheDocument();
        expect(screen.queryByText("Phone")).not.toBeInTheDocument();
        expect(screen.queryByText("LinkedIn")).not.toBeInTheDocument();
      });
    });
  });

  describe("manual tasks section", () => {
    it("displays resume file task without upload wording", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/resume file \(you choose it\)/i)).toBeInTheDocument();
        expect(screen.queryByText(/resume upload/i)).not.toBeInTheDocument();
      });
    });

    it("displays cover letter task", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/cover letter/i)).toBeInTheDocument();
      });
    });

    it("displays screening questions task", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/additional screening questions/i)).toBeInTheDocument();
      });
    });

    it("displays human-check task", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/human check/i)).toBeInTheDocument();
        expect(screen.queryByText(/captcha verification/i)).not.toBeInTheDocument();
      });
    });

    it("displays submit button reminder", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/final submit button/i)).toBeInTheDocument();
      });
    });
  });

  describe("info banner", () => {
    it("displays 'How it works' heading", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("How it works")).toBeInTheDocument();
      });
    });

    it("explains browser will open", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/browser window will open/i)).toBeInTheDocument();
      });
    });

    it("explains details will be prepared", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/matching profile details are prepared/i)).toBeInTheDocument();
      });
    });

    it("instructs user to review", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/review every prepared detail/i)).toBeInTheDocument();
      });
    });

    it("instructs user to submit the application themselves", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/submit the form yourself/i)).toBeInTheDocument();
      });
    });
  });

});
