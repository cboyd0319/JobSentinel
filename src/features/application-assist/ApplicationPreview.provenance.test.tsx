import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  mockInvoke,
  mockJob,
  mockProfile,
  setupApplicationPreviewMocks,
} from "./ApplicationPreview.testSupport";
import { ApplicationPreview } from "./ApplicationPreview";

describe("ApplicationPreview provenance", () => {
  beforeEach(() => {
    setupApplicationPreviewMocks();
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
