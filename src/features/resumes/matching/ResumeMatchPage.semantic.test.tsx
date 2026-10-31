/** Proves maintained review dispatch, provenance display and stale-input refusal. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockAnalysis, mockInvoke, mockInvokeResponses, setupResumeMatchMocks, validResume } from "./ResumeMatchPage.testSupport";
import ResumeMatch from "./ResumeMatchPage";
import type { SemanticAssessment } from "../shared/atsAnalysisContracts";

const activeResume = { id: 42, name: "Resume", is_active: true, created_at: "2026-01-01", updated_at: "2026-01-02T00:00:00Z" };
const semantic: SemanticAssessment = {
  runtime_profile: "qwen3_reranked", overall_score: 0.8,
  matched_skills: [{ job_skill: "Account management", user_skill: "Led customer renewals", similarity: 0.8 }],
  unmatched_requirements: ["CPA license"],
  match_evidence: [{ evidence_id: "resume:42", source_revision: "revision", field_path: "experience.0.achievements.0" }],
  job_description_sha256: "a".repeat(64),
};

async function startReview() {
  const user = userEvent.setup();
  const view = render(<ResumeMatch onBack={vi.fn()} />);
  await screen.findByText("Resume", { selector: "p" });
  fireEvent.change(screen.getByRole("textbox", { name: "Job Post" }), { target: { value: "Account management and CPA license required" } });
  await user.click(screen.getByRole("button", { name: "Review Match" }));
  return view;
}

describe("local evidence in maintained resume review", () => {
  beforeEach(setupResumeMatchMocks);
  it("cancels explicitly and keeps a replacement pending when the old request completes", async () => {
    const completions: ((value: unknown) => void)[] = [];
    mockInvoke.mockImplementation((command) => command === "get_active_resume" ? Promise.resolve(activeResume) :
      command === "cancel_resume_review" ? Promise.resolve(false) : new Promise((resolve) => completions.push(resolve)));
    const view = await startReview();
    const firstId = mockInvoke.mock.calls.find(([command]) => command === "analyze_active_resume_for_job")?.[1]?.requestId;
    expect(firstId).toEqual(expect.any(String));
    await userEvent.click(screen.getByRole("button", { name: "Cancel match review" }));
    expect(mockInvoke).toHaveBeenCalledWith("cancel_resume_review", { requestId: firstId });
    await userEvent.click(screen.getByRole("button", { name: "Review Match" }));
    const secondId = mockInvoke.mock.calls.filter(([command]) => command === "analyze_active_resume_for_job").at(-1)?.[1]?.requestId;
    expect(secondId).not.toBe(firstId);
    await act(async () => completions[0]?.(mockAnalysis));
    expect(screen.getByRole("button", { name: "Cancel match review" })).toBeEnabled();
    expect(screen.queryByText("Resume Fit")).not.toBeInTheDocument();
    view.unmount();
    expect(mockInvoke).toHaveBeenCalledWith("cancel_resume_review", { requestId: secondId });
  });
  it.each([
    ["qwen3_reranked", "Stronger local matching (Qwen3)"],
    ["minilm", "Local matching (MiniLM fallback)"],
    ["deterministic_exact", "Built-in exact matching — no model used"],
  ] as const)("renders %s provenance and citations alongside unchanged scores", async (runtime, label) => {
    mockInvokeResponses({ get_active_resume: activeResume, analyze_active_resume_for_job: { ...mockAnalysis, semantic_assessment: { ...semantic, runtime_profile: runtime } } });
    await startReview();
    expect(mockInvoke).toHaveBeenCalledWith("analyze_active_resume_for_job", { requestId: expect.any(String), jobDescription: "Account management and CPA license required" });
    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.getByText(/Work experience 1, bullet 1/)).toBeInTheDocument();
    expect(screen.getByText(/does not verify credentials or eligibility/)).toBeInTheDocument();
    expect(screen.getByText(/Still needs review: CPA license/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Job Post" }), { target: { value: "Different job" } });
    expect(screen.queryByText(label)).not.toBeInTheDocument();
  });


  it("discloses basic readability review when semantic assessment is unavailable", async () => {
    mockInvokeResponses({ get_active_resume: activeResume, analyze_active_resume_for_job: mockAnalysis });
    await startReview();
    expect(await screen.findByText(/Basic readability review only/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Local evidence assessment" })).not.toBeInTheDocument();
  });


  it.each([
    ["busy", "Another local model action is running. Try the local evidence review again when it finishes."],
    ["input_unavailable", "The inputs exceed local matching limits or need review. Check the resume and job text before trying again."],
    ["model_unavailable", "The local semantic model could not run. Check local model setup before trying again."],
  ] as const)("explains %s fallback while retaining readability findings", async (reason, message) => {
    mockInvokeResponses({ get_active_resume: activeResume, analyze_active_resume_for_job: { ...mockAnalysis, semantic_unavailable_reason: reason } });
    await startReview();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByText(/Basic readability review only/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Local evidence assessment" })).not.toBeInTheDocument();
  });

  it("uses the structured review command and discards results after copied-resume edits", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ analyze_resume_for_job: { ...mockAnalysis, semantic_assessment: semantic } });
    render(<ResumeMatch onBack={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Import from Resume App" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Copied resume details" }), { target: { value: JSON.stringify(validResume) } });
    fireEvent.change(screen.getByRole("textbox", { name: "Job Post" }), { target: { value: "Account management" } });
    await user.click(screen.getByRole("button", { name: "Review Match" }));
    expect(mockInvoke).toHaveBeenCalledWith("analyze_resume_for_job", { requestId: expect.any(String), resume: validResume, jobDescription: "Account management" });
    expect(await screen.findByText("Stronger local matching (Qwen3)")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Copied resume details" }), { target: { value: "{}" } });
    expect(screen.queryByRole("region", { name: "Local evidence assessment" })).not.toBeInTheDocument();
  });


  it("discards pending format-only results after copied input changes", async () => {
    let finish!: (result: unknown) => void;
    mockInvoke.mockImplementation((command) => command === "get_active_resume"
      ? Promise.resolve(null) : new Promise((resolve) => { finish = resolve; }));
    render(<ResumeMatch onBack={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Import from Resume App" }));
    const input = screen.getByRole("textbox", { name: "Copied resume details" });
    fireEvent.change(input, { target: { value: JSON.stringify(validResume) } });
    await user.click(screen.getByRole("button", { name: "Review Format Only" }));
    fireEvent.change(input, { target: { value: "{}" } });
    await act(async () => finish({ ...mockAnalysis, resume_snapshot: undefined }));
    expect(screen.queryByText("Resume Fit")).not.toBeInTheDocument();
    expect(screen.getByText("No review yet")).toBeInTheDocument();
  });

  it("discards a pending result after the job description changes", async () => {
    let finish!: (result: unknown) => void;
    mockInvoke.mockImplementation((command) => command === "get_active_resume"
      ? Promise.resolve(activeResume)
      : command === "cancel_resume_review" ? Promise.resolve(false) : new Promise((resolve) => { finish = resolve; }));
    await startReview();
    fireEvent.change(screen.getByRole("textbox", { name: "Job Post" }), { target: { value: "Different job" } });
    expect(mockInvoke).toHaveBeenCalledWith("cancel_resume_review", { requestId: expect.any(String) });
    await act(async () => finish({ ...mockAnalysis, semantic_assessment: semantic }));
    expect(screen.queryByText("Stronger local matching (Qwen3)")).not.toBeInTheDocument();
    expect(screen.getByText("No review yet")).toBeInTheDocument();
  });
});
