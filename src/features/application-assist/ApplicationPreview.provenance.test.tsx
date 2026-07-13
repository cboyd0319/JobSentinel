import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("ApplicationPreview provenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(mockProfile);
  });

  it("shows exact-question, confirmed-answer, voluntary, and unknown review guidance", async () => {
    render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

    expect(await screen.findByText("Answer Review Checklist")).toBeInTheDocument();
    expect(screen.getByText("Exact question")).toBeInTheDocument();
    expect(screen.getByText(/Compare every prepared answer with the exact wording/i)).toBeInTheDocument();
    expect(screen.getByText("Confirmed answers")).toBeInTheDocument();
    expect(screen.getByText(/Use only profile details and saved answers you have confirmed/i)).toBeInTheDocument();
    expect(screen.getByText("Voluntary personal questions")).toBeInTheDocument();
    expect(screen.getByText(/Voluntary or protected questions are your choice/i)).toBeInTheDocument();
    expect(screen.getByText("Unknowns")).toBeInTheDocument();
    expect(screen.getByText(/Pause on anything uncertain until you can verify it/i)).toBeInTheDocument();
  });
});
