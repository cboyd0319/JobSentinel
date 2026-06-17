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

    it("flags driving-record and auto-insurance requirements from job details", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(
        <ApplicationPreview
          job={{
            ...mockJob,
            description:
              "Required: clean driving record, MVR review, and proof of auto insurance for field visits.",
          }}
          atsPlatform="greenhouse"
        />,
      );

      expect(await screen.findByText("Hard Question Review")).toBeInTheDocument();
      expect(screen.getByText("Driving record, vehicle, or insurance")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Confirm driving record, vehicle, or auto insurance requirements before answering. If it is not current, workable, or true for you, do not claim it.",
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

  });
});
