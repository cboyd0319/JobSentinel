import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
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

  describe("hard screening question review", () => {
    it("flags hard screening topics from job details for resume-answer consistency", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description:
              "Required: work authorization, RN license, 3+ years of experience, and willingness to relocate.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText("Make saved answers and resume evidence agree before submitting."),
      ).toBeInTheDocument();
      expect(screen.getByText("Work authorization")).toBeInTheDocument();
      expect(screen.getByText("License, certification, or clearance")).toBeInTheDocument();
      expect(screen.getByText("Years of experience")).toBeInTheDocument();
      expect(screen.getByText("Location, relocation, or travel")).toBeInTheDocument();
    });

    it("flags background check and drug screen requirements from job details", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Offer requires a background check and drug screen before start.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(screen.getByText("Background check or drug screen")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Confirm background-check, drug-screen, or pre-employment screening requirements before continuing.",
        ),
      ).toBeInTheDocument();
    });

    it("flags citizenship requirements from job details", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Applicants must be U.S. citizens for this contract.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(screen.getByText("Citizenship requirement")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Check citizenship requirements before answering. Do not treat work authorization as citizenship.",
        ),
      ).toBeInTheDocument();
    });

    it("flags transportation requirements from job details", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Required: reliable transportation for visits to client sites.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(screen.getByText("Transportation requirement")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Confirm transportation or vehicle requirements before answering. Use only commute, license, or vehicle details that are true.",
        ),
      ).toBeInTheDocument();
    });

    it("flags language fluency requirements from job details", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Required: bilingual Spanish for client intake calls.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(screen.getByText("Language fluency")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Check language fluency before answering. Use only languages you can truthfully use for the work.",
        ),
      ).toBeInTheDocument();
    });

    it("flags physical-demand requirements from job details", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Must be able to lift 50 lbs and stand for long periods.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(screen.getByText("Physical requirement")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Check physical requirements before answering. If it is not workable or safe for you, do not claim it.",
        ),
      ).toBeInTheDocument();
    });

    it("flags minimum-age requirements from job details", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Applicants must be 18 years of age before start.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(screen.getByText("Age requirement")).toBeInTheDocument();
      expect(screen.queryByText("Years of experience")).not.toBeInTheDocument();
      expect(
        screen.getByText(
          "Check minimum-age or legal work-age requirements before answering. Use only truthful answers.",
        ),
      ).toBeInTheDocument();
    });

    it("shows saved work-authorization answers when the job asks about sponsorship", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        requiresSponsorship: true,
      });

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Applicants must be authorized to work without visa sponsorship.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved profile says sponsorship is needed. Check the employer's sponsorship question and resume evidence before continuing.",
        ),
      ).toBeInTheDocument();
    });

    it("shows saved travel answers when the job asks about travel", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "travel",
              answer: "I can travel up to 25% for client visits.",
              answerType: "text",
              notes: null,
              timesUsed: 0,
              timesModified: 0,
              confidenceScore: 0,
              lastUsedAt: null,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ]);
        }

        return Promise.reject(new Error(`Unexpected command: ${command}`));
      });

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "This role requires travel to client sites up to 25%.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved travel answer says: I can travel up to 25% for client visits. Confirm it matches the employer's wording and resume evidence before continuing.",
        ),
      ).toBeInTheDocument();
      expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers");
    });

    it("shows saved credential answers when the job asks about certifications", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "certification",
              answer: "I hold an active PMP certification.",
              answerType: "text",
              notes: null,
              timesUsed: 0,
              timesModified: 0,
              confidenceScore: 0,
              lastUsedAt: null,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ]);
        }

        return Promise.reject(new Error(`Unexpected command: ${command}`));
      });

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "PMP certification required for this role.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved credential answer says: I hold an active PMP certification. Confirm it matches the employer's wording and resume evidence before continuing.",
        ),
      ).toBeInTheDocument();
      expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers");
    });

    it("shows saved education answers when the job asks about a degree", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "education",
              answer: "I have a bachelor's degree in business administration.",
              answerType: "text",
              notes: null,
              timesUsed: 0,
              timesModified: 0,
              confidenceScore: 0,
              lastUsedAt: null,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ]);
        }

        return Promise.reject(new Error(`Unexpected command: ${command}`));
      });

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Bachelor's degree required, or equivalent education.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved education answer says: I have a bachelor's degree in business administration. Confirm it matches the employer's wording and resume evidence before continuing.",
        ),
      ).toBeInTheDocument();
      expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers");
    });

    it("shows saved experience answers when the job asks about years of experience", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "years of experience",
              answer: "I have 6 years of customer support experience.",
              answerType: "text",
              notes: null,
              timesUsed: 0,
              timesModified: 0,
              confidenceScore: 0,
              lastUsedAt: null,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ]);
        }

        return Promise.reject(new Error(`Unexpected command: ${command}`));
      });

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "5+ years of experience required.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved experience answer says: I have 6 years of customer support experience. Confirm it matches the employer's wording and resume evidence before continuing.",
        ),
      ).toBeInTheDocument();
      expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers");
    });

    it("shows saved salary answers when the job asks about compensation", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "salary",
              answer: "My target salary range is $85,000 to $95,000.",
              answerType: "text",
              notes: null,
              timesUsed: 0,
              timesModified: 0,
              confidenceScore: 0,
              lastUsedAt: null,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ]);
        }

        return Promise.reject(new Error(`Unexpected command: ${command}`));
      });

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Please include salary or compensation expectations.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved salary answer says: My target salary range is $85,000 to $95,000. Confirm it matches the employer's wording and resume evidence before continuing.",
        ),
      ).toBeInTheDocument();
      expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers");
    });

    it("shows saved availability answers when the job asks about weekend availability", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "availability",
              answer: "I am available for weekend shifts with two weeks of notice.",
              answerType: "text",
              notes: null,
              timesUsed: 0,
              timesModified: 0,
              confidenceScore: 0,
              lastUsedAt: null,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ]);
        }

        return Promise.reject(new Error(`Unexpected command: ${command}`));
      });

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Weekend availability is required for this role.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved availability answer says: I am available for weekend shifts with two weeks of notice. Confirm it matches the employer's wording and resume evidence before continuing.",
        ),
      ).toBeInTheDocument();
      expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers");
    });

    it("shows saved screening answers when the job asks about a background check", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "background check",
              answer: "I can complete the required background check.",
              answerType: "text",
              notes: null,
              timesUsed: 0,
              timesModified: 0,
              confidenceScore: 0,
              lastUsedAt: null,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ]);
        }

        return Promise.reject(new Error(`Unexpected command: ${command}`));
      });

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Background check is required after offer.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved screening answer says: I can complete the required background check. Confirm it matches the employer's wording and resume evidence before continuing.",
        ),
      ).toBeInTheDocument();
      expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers");
    });

    it("shows saved language answers when the job asks about bilingual fluency", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "bilingual Spanish",
              answer: "I am fluent in Spanish for customer calls.",
              answerType: "text",
              notes: null,
              timesUsed: 0,
              timesModified: 0,
              confidenceScore: 0,
              lastUsedAt: null,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ]);
        }

        return Promise.reject(new Error(`Unexpected command: ${command}`));
      });

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "This role requires bilingual Spanish fluency.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved language answer says: I am fluent in Spanish for customer calls. Confirm it matches the employer's wording and resume evidence before continuing.",
        ),
      ).toBeInTheDocument();
      expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers");
    });

    it("shows saved physical-demand answers when the job asks about lifting", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "lift 50 pounds",
              answer: "I can lift 50 pounds safely.",
              answerType: "text",
              notes: null,
              timesUsed: 0,
              timesModified: 0,
              confidenceScore: 0,
              lastUsedAt: null,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ]);
        }

        return Promise.reject(new Error(`Unexpected command: ${command}`));
      });

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Must be able to lift 50 lbs throughout the shift.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved physical requirement answer says: I can lift 50 pounds safely. Confirm it matches the employer's wording and resume evidence before continuing.",
        ),
      ).toBeInTheDocument();
      expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers");
    });

    it("shows saved transportation answers when the job asks about reliable transportation", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "reliable transportation",
              answer: "Yes, I have reliable transportation for client-site visits.",
              answerType: "yes_no",
              notes: null,
              timesUsed: 0,
              timesModified: 0,
              confidenceScore: 0,
              lastUsedAt: null,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ]);
        }

        return Promise.reject(new Error(`Unexpected command: ${command}`));
      });

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Required: reliable transportation for visits to client sites.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved transportation answer says: Yes, I have reliable transportation for client-site visits. Confirm it matches the employer's wording and resume evidence before continuing.",
        ),
      ).toBeInTheDocument();
      expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers");
    });

    it("shows saved citizenship answers when the job asks about citizenship", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "US citizen",
              answer: "Yes, I am a U.S. citizen.",
              answerType: "yes_no",
              notes: null,
              timesUsed: 0,
              timesModified: 0,
              confidenceScore: 0,
              lastUsedAt: null,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ]);
        }

        return Promise.reject(new Error(`Unexpected command: ${command}`));
      });

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Applicants must be U.S. citizens for this contract.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved citizenship answer says: Yes, I am a U.S. citizen. Confirm it matches the employer's wording before continuing.",
        ),
      ).toBeInTheDocument();
      expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers");
    });

    it("shows saved age answers when the job asks about minimum age", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "18 years of age",
              answer: "Yes, I meet the 18 years of age requirement.",
              answerType: "text",
              notes: null,
              timesUsed: 0,
              timesModified: 0,
              confidenceScore: 0,
              lastUsedAt: null,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ]);
        }

        return Promise.reject(new Error(`Unexpected command: ${command}`));
      });

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Applicants must be 18 years of age before start.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved age requirement answer says: Yes, I meet the 18 years of age requirement. Confirm it matches the employer's wording before continuing.",
        ),
      ).toBeInTheDocument();
      expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers");
    });

    it("keeps hard question review when saved screening answers cannot load", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.reject(new Error("saved answers unavailable"));
        }

        return Promise.reject(new Error(`Unexpected command: ${command}`));
      });

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "This role requires travel to client sites.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText("Confirm location, commute, relocation, remote, hybrid, travel, and shift constraints."),
      ).toBeInTheDocument();
      expect(screen.queryByText(/saved answers unavailable/i)).not.toBeInTheDocument();
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

  describe("accessibility", () => {
    it("has region landmark for preview content", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const region = screen.getByRole("region", { name: /application preview/i });
        expect(region).toBeInTheDocument();
      });
    });

    it("has labeled group for prepared fields", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const heading = screen.getByText(/fields JobSentinel can prepare/i);
        expect(heading).toHaveAttribute("id", "prepared-fields-heading");
      });
    });

    it("has labeled group for manual fields", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const heading = screen.getByText(/you will complete and review/i);
        expect(heading).toHaveAttribute("id", "manual-fields-heading");
      });
    });

    it("icons are present in the component", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      const { container } = render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const icons = container.querySelectorAll('svg');
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it("prepared fields list has proper role", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const list = screen.getByRole("list", { name: /prepared fields/i });
        expect(list).toBeInTheDocument();
      });
    });

    it("manual tasks list has proper role", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const list = screen.getByRole("list", { name: /manual tasks/i });
        expect(list).toBeInTheDocument();
      });
    });

    it("info banner has complementary role", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const banner = screen.getByRole("complementary");
        expect(banner).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("handles invoke error gracefully", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error("Failed to load profile"));

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
      });

      consoleError.mockRestore();
    });

    it("clears loading state on error", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error("Network error"));

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      // Should show loading first
      expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();

      // Then clear loading state
      await waitFor(() => {
        expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
      });

      consoleError.mockRestore();
    });
  });

  describe("cleanup", () => {
    it("aborts fetch on unmount", async () => {
      let resolveProfile: (value: typeof mockProfile) => void = () => {};
      mockInvoke.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveProfile = resolve;
          })
      );

      const { container, unmount } = render(
        <ApplicationPreview job={mockJob} atsPlatform="greenhouse" />
      );

      expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();

      unmount();
      expect(container).toBeEmptyDOMElement();

      await act(async () => {
        resolveProfile(mockProfile);
        await Promise.resolve();
      });

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByText("Jordan Lee")).not.toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles empty string values gracefully", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        phone: "",
        linkedinUrl: "",
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
        // Empty strings should not be displayed
        expect(screen.queryByText("Phone")).not.toBeInTheDocument();
        expect(screen.queryByText("LinkedIn")).not.toBeInTheDocument();
      });
    });

    it("handles very long field values", async () => {
      const longUrl = "https://example.com/" + "a".repeat(200);
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        linkedinUrl: longUrl,
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("LinkedIn")).toBeInTheDocument();
        expect(screen.getByText(longUrl)).toBeInTheDocument();
      });
    });

    it("handles special characters in profile data", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        fullName: "José García-López",
        email: "josé+test@example.com",
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("José García-López")).toBeInTheDocument();
        expect(screen.getByText("josé+test@example.com")).toBeInTheDocument();
      });
    });
  });
});
