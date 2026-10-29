/** Proves saved-match actions request fresh local evidence without replacing saved scores. */
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { invoke } from "../../../platform/tauri";
import { SavedSemanticReview } from "./SavedSemanticReview";
import { ResumeRecentMatches } from "./ResumeRecentMatches";

vi.mock("../../../platform/tauri", () => ({ invoke: vi.fn() }));
vi.mock("./MatchDebuggerModal", () => ({ MatchDebuggerModal: () => null }));
vi.mock("./MilitaryTransitionReviewModal", () => ({ MilitaryTransitionReviewModal: () => null }));

const match = {
  id: 10, resume_id: 42, job_hash: "saved-job", job_title: "Coordinator", company: "Example",
  overall_match_score: 0.82, skills_match_score: 0.75, experience_match_score: 0.5,
  education_match_score: 0.25, matching_skills: ["Scheduling"], missing_skills: ["Case management"],
  gap_analysis: null, feedback: null, created_at: "2026-10-28T12:00:00Z",
};

describe("saved local evidence review", () => {
  it("dismisses a pending review without claiming its native worker has stopped", async () => {
    let complete!: (value: null) => void;
    vi.mocked(invoke).mockImplementation((command) => command === "cancel_resume_review" ? Promise.resolve(true) :
      new Promise((resolve) => { complete = resolve; }));
    render(<SavedSemanticReview resumeId={42} jobHash="job" />);
    await userEvent.click(screen.getByRole("button", { name: "Review local evidence" }));
    const requestId = vi.mocked(invoke).mock.calls.at(-1)?.[1]?.requestId;
    expect(requestId).toEqual(expect.any(String));
    await userEvent.click(screen.getByRole("button", { name: "Cancel evidence review" }));
    expect(invoke).toHaveBeenCalledWith("cancel_resume_review", { requestId });
    expect(screen.getByRole("status")).toHaveTextContent("may take a moment to stop");
    await act(async () => complete(null));
    expect(screen.queryByText(/This build uses basic matching/)).not.toBeInTheDocument();
  });
  it("dispatches the selected saved resume and job and labels model-free evidence", async () => {
    vi.mocked(invoke).mockResolvedValue({
      runtime_profile: "deterministic_exact", overall_score: 1,
      matched_skills: [{ job_skill: "Scheduling", user_skill: "Scheduling", similarity: 1 }],
      unmatched_requirements: [], match_evidence: [{ evidence_id: "evidence", source_revision: "r1", field_path: "skills.0" }],
      job_description_sha256: "a".repeat(64),
    });
    render(<ResumeRecentMatches matches={[match]} savingFeedback={false} onFeedback={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Review local evidence" }));
    expect(invoke).toHaveBeenCalledWith("match_resume_semantic", { requestId: expect.any(String), resumeId: 42, jobHash: "saved-job" });
    expect(await screen.findByText("Built-in exact matching — no model used")).toBeInTheDocument();
    expect(screen.getByText("Resume evidence: Skills list, item 1")).toBeInTheDocument();
    expect(screen.getByText("82%")).toBeInTheDocument();
  });

  it("explains basic matching when this build returns no semantic assessment", async () => {
    vi.mocked(invoke).mockResolvedValue(null);
    render(<ResumeRecentMatches matches={[match]} savingFeedback={false} onFeedback={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Review local evidence" }));
    expect(await screen.findByText(/This build uses basic matching/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("82%")).toBeInTheDocument();
  });

  it("shows a recoverable refusal when source inputs changed", async () => {
    vi.mocked(invoke).mockRejectedValue(new Error("job changed during local matching"));
    render(<ResumeRecentMatches matches={[match]} savingFeedback={false} onFeedback={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Review local evidence" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The saved match remains available. Review the resume and job requirements");
    expect(screen.queryByRole("region", { name: "Local evidence assessment" })).not.toBeInTheDocument();
  });
});

describe("saved review identity changes", () => {

  it("clears a same-ID saved assessment when the current resume revision changes", async () => {
    vi.mocked(invoke).mockResolvedValue(null);
    const view = render(<ResumeRecentMatches matches={[match]} resumeRevision="revision-1" savingFeedback={false} onFeedback={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Review local evidence" }));
    await screen.findByText(/This build uses basic matching/);
    view.rerender(<ResumeRecentMatches matches={[match]} resumeRevision="revision-2" savingFeedback={false} onFeedback={vi.fn()} />);
    expect(screen.queryByText(/This build uses basic matching/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review local evidence" })).toBeEnabled();
  });

  it.each([false, true])("clears completed evidence or refusal when the resume changes (error=%s)", async (fails) => {
    if (fails) vi.mocked(invoke).mockRejectedValue(new Error("changed"));
    else vi.mocked(invoke).mockResolvedValue({
      runtime_profile: "deterministic_exact", overall_score: 0, matched_skills: [],
      unmatched_requirements: [], match_evidence: [], job_description_sha256: "a".repeat(64),
    });
    const view = render(<SavedSemanticReview resumeId={42} jobHash="job" />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Review local evidence" }));
    if (fails) await screen.findByRole("alert");
    else await screen.findByRole("region", { name: "Local evidence assessment" });
    view.rerender(<SavedSemanticReview resumeId={43} jobHash="job" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Local evidence assessment" })).not.toBeInTheDocument();
    expect(screen.queryByText(/This build uses basic matching/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review local evidence" })).toBeEnabled();
  });

  it("clears pending state and discards the prior identity's late response", async () => {
    let finish!: (value: null) => void;
    vi.mocked(invoke).mockImplementation((command) => command === "cancel_resume_review" ? Promise.resolve(false) : new Promise((resolve) => { finish = resolve; }));
    const view = render(<SavedSemanticReview resumeId={42} jobHash="old-job" />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Review local evidence" }));
    view.rerender(<SavedSemanticReview resumeId={42} jobHash="new-job" />);
    expect(invoke).toHaveBeenCalledWith("cancel_resume_review", { requestId: expect.any(String) });
    expect(screen.getByRole("button", { name: "Review local evidence" })).toBeEnabled();
    await act(async () => finish(null));
    expect(screen.queryByText(/This build uses basic matching/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review local evidence" })).toBeEnabled();
  });
});
