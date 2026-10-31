/** Proves pending builder reviews are cancelled and cannot overwrite newer inputs or pending state. */
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AtsLiveScorePanel } from "./AtsLiveScorePanel";
import { mockAnalysis, mockResumeData } from "./AtsLiveScorePanel.testData";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("../../../platform/tauri", () => ({ invoke }));
beforeEach(() => {
  invoke.mockReset();
  sessionStorage.clear();
  sessionStorage.setItem("jobContext", JSON.stringify({ timestamp: Date.now(), description: "Customer support" }));
});
describe("builder review cancellation", () => {
  it("cancels changed inputs and ignores the obsolete result and finally handler", async () => {
    const finish: ((value: unknown) => void)[] = [];
    invoke.mockImplementation((command: string) => command === "cancel_resume_review"
      ? Promise.resolve(false) : new Promise((resolve) => finish.push(resolve)));
    const view = render(<AtsLiveScorePanel resumeData={mockResumeData} currentStep={1} debounceMs={1} />);
    await waitFor(() => expect(finish).toHaveLength(1));
    view.rerender(<AtsLiveScorePanel resumeData={{ ...mockResumeData, summary: "New summary" }} currentStep={1} debounceMs={1} />);
    expect(invoke).toHaveBeenCalledWith("cancel_resume_review", { requestId: expect.any(String) });
    await waitFor(() => expect(finish).toHaveLength(2));
    await act(async () => finish[0]?.({ ...mockAnalysis, missing_keywords: ["OBSOLETE"] }));
    expect(screen.getByText("checking...")).toBeInTheDocument();
    expect(screen.queryByText("Review Details")).not.toBeInTheDocument();
    await act(async () => finish[1]?.(mockAnalysis));
    expect(screen.queryByText("checking...")).not.toBeInTheDocument();
    expect(screen.getByText("Review Details")).toBeInTheDocument();
  });
  it("cancels pending native work on unmount", async () => {
    invoke.mockImplementation((command: string) => command === "cancel_resume_review" ? Promise.resolve(false) : new Promise(() => {}));
    const view = render(<AtsLiveScorePanel resumeData={mockResumeData} currentStep={1} debounceMs={1} />);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("analyze_resume_for_job", expect.anything()));
    view.unmount();
    expect(invoke).toHaveBeenCalledWith("cancel_resume_review", { requestId: expect.any(String) });
  });
});
