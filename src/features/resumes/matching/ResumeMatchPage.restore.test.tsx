/** Guards persisted active-resume results against switches, edits and unverified restoration. */
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockAnalysis, mockInvoke, mockReadStorageValue, setupResumeMatchMocks } from "./ResumeMatchPage.testSupport";
import ResumeMatch from "./ResumeMatchPage";

const saved = {
  id: 42, name: "Resume", is_active: true,
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z",
};
const result = { ...mockAnalysis, resume_snapshot: { resume_id: saved.id, revision: saved.updated_at } };

function restore(analysis = result) {
  mockReadStorageValue.mockReturnValue(JSON.stringify({
    jobDescription: "A saved job description", resumeJson: "", analysisResult: analysis,
    analysisInputSource: "active", matchingProfile: null, showAdvancedResumeImport: false, showComparison: false,
  }));
  render(<ResumeMatch onBack={vi.fn()} />);
}

describe("restored active-resume analysis", () => {
  beforeEach(setupResumeMatchMocks);

  it.each([
    { ...saved, id: 43 },
    { ...saved, updated_at: "2026-01-03T00:00:00Z" },
    null,
  ])("does not show a saved review for a different or missing snapshot: %j", async (current) => {
    let resolve!: (value: unknown) => void;
    mockInvoke.mockImplementation(() => new Promise((done) => { resolve = done; }));
    restore();
    expect(screen.queryByText("Resume Fit")).not.toBeInTheDocument();
    await act(async () => resolve(current));
    expect(screen.queryByText("Resume Fit")).not.toBeInTheDocument();
    expect(screen.getByText("No review yet")).toBeInTheDocument();
  });

  it("restores an unchanged snapshot only after live validation without rerunning analysis", async () => {
    let resolve!: (value: unknown) => void;
    mockInvoke.mockImplementation(() => new Promise((done) => { resolve = done; }));
    restore();
    expect(screen.queryByText("Resume Fit")).not.toBeInTheDocument();
    await act(async () => resolve(saved));
    expect(screen.getByText("Resume Fit")).toBeInTheDocument();
    expect(mockInvoke.mock.calls.map(([command]) => command)).toEqual(["get_active_resume"]);
  });

  it.each(["active", null])("refuses older drafts without the analyzed resume snapshot (source=%s)", async (source) => {
    mockInvoke.mockResolvedValue(saved);
    mockReadStorageValue.mockReturnValue(JSON.stringify({
      jobDescription: "A saved job description", resumeJson: "", analysisResult: { ...mockAnalysis, resume_snapshot: undefined },
      analysisInputSource: source,
    }));
    render(<ResumeMatch onBack={vi.fn()} />);
    await screen.findByText(/Selected resume:/);
    expect(screen.queryByText("Resume Fit")).not.toBeInTheDocument();
  });
});
