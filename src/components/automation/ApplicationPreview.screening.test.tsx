import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ApplicationPreview } from "./ApplicationPreview";

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

    it("reloads hard-question review when the job description changes", async () => {
      let profileLoadCount = 0;
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          profileLoadCount += 1;
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              questionPattern: "background check",
              answer: "Completed background screening for client-site work.",
            },
          ]);
        }

        return Promise.resolve(null);
      });

      const { rerender } = render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Great opportunity with a supportive team.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
      });
      expect(screen.queryByText("Hard Question Review")).not.toBeInTheDocument();
      expect(mockInvoke).not.toHaveBeenCalledWith("get_screening_answers");

      rerender(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Offer requires a background check before start.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(screen.getByText("Background check or drug screen")).toBeInTheDocument();
      expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers");
      expect(profileLoadCount).toBeGreaterThanOrEqual(2);
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

    it("flags legal work-eligibility wording as work authorization", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description:
              "Applicants must be legally authorized and eligible to work in the United States.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(screen.getByText("Work authorization")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved profile says US work authorization is available and sponsorship is not needed. Confirm the application asks the same thing before submitting.",
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

    it("flags management-experience requirements from job details", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Required: managed a team for client intake coverage.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(screen.getByText("Management experience")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Check management, supervision, or lead-experience answers before submission.",
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

    it("flags overtime availability requirements from job details", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Overtime is required during peak weeks.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(screen.getByText("Salary or availability")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Review salary, start-date, schedule, and availability answers before submission.",
        ),
      ).toBeInTheDocument();
    });

    it("flags holiday availability requirements from job details", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description: "Holiday work is required during peak weeks.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(screen.getByText("Salary or availability")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Review salary, start-date, schedule, and availability answers before submission.",
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

    it("shows saved education answers when the job asks about education", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "education",
              answer: "I completed an approved training program.",
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
            description: "Education required: approved training program accepted.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved education answer says: I completed an approved training program. Confirm it matches the employer's wording and resume evidence before continuing.",
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

    it("shows saved schedule answers when the job asks about schedule", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "schedule",
              answer: "I can work a rotating schedule with advance notice.",
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
            description: "Schedule requirement: rotating weekends with notice.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved availability answer says: I can work a rotating schedule with advance notice. Confirm it matches the employer's wording and resume evidence before continuing.",
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

    it("shows saved availability answers when the job asks about overtime availability", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "overtime",
              answer: "I am available for overtime during peak weeks.",
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
            description: "Overtime is required during peak weeks.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved availability answer says: I am available for overtime during peak weeks. Confirm it matches the employer's wording and resume evidence before continuing.",
        ),
      ).toBeInTheDocument();
      expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers");
    });

    it("shows saved availability answers when the job asks about holiday availability", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "holiday",
              answer: "I am available for holiday shifts during peak weeks.",
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
            description: "Holiday work is required during peak weeks.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved availability answer says: I am available for holiday shifts during peak weeks. Confirm it matches the employer's wording and resume evidence before continuing.",
        ),
      ).toBeInTheDocument();
      expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers");
    });

    it("shows saved management answers when the job asks about managed-team experience", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_profile_preview") {
          return Promise.resolve(mockProfile);
        }

        if (command === "get_screening_answers") {
          return Promise.resolve([
            {
              id: 1,
              questionPattern: "managed a team",
              answer: "I managed staff schedules for client intake coverage.",
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
            description: "Required: managed a team for client intake coverage.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Saved management experience answer says: I managed staff schedules for client intake coverage. Confirm it matches the employer's wording and resume evidence before continuing.",
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

});
