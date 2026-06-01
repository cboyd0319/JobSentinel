import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScreeningAnswerSuggestions } from "./ScreeningAnswerSuggestions";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe("ScreeningAnswerSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });

  it("uses plain labels instead of raw confidence percentages", async () => {
    mockInvoke.mockResolvedValue([
      {
        answer: "Yes, I am available for evening shifts.",
        confidence: 0.85,
        source: { type: "manual", answerId: 1 },
        timesUsed: 4,
        timesModified: 3,
        lastUsedDaysAgo: 2,
        modificationRate: 0.75,
      },
      {
        answer: "I can relocate within 30 days.",
        confidence: 0.55,
        source: { type: "learned", learnedId: 2 },
        timesUsed: 2,
        timesModified: 1,
        lastUsedDaysAgo: 12,
        modificationRate: 0.25,
      },
      {
        answer: "My target start date is flexible.",
        confidence: 0.3,
        source: { type: "historical" },
        timesUsed: 1,
        timesModified: 0,
        lastUsedDaysAgo: null,
        modificationRate: 0,
      },
    ]);

    const onSelectAnswer = vi.fn();
    render(
      <ScreeningAnswerSuggestions
        question="When can you start?"
        onSelectAnswer={onSelectAnswer}
      />,
    );

    expect(await screen.findByText("Suggested Answers")).toBeInTheDocument();
    expect(
      screen.getByText("From answers you saved or used before"),
    ).toBeInTheDocument();
    expect(screen.getByText("Usually matches")).toBeInTheDocument();
    expect(screen.getByText("Review before using")).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
    expect(screen.getByText("Often edited")).toBeInTheDocument();
    expect(screen.getByText("Sometimes edited")).toBeInTheDocument();
    expect(screen.getByText("Saved by you")).toBeInTheDocument();
    expect(screen.getByText("Learned from use")).toBeInTheDocument();
    expect(screen.getByText("Used before")).toBeInTheDocument();
    expect(screen.getByText(/Used 4 times/)).toBeInTheDocument();
    expect(screen.getByText(/Used 1 time/)).toBeInTheDocument();

    expect(screen.queryByText(/% confident/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/modified \d+%/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Smart Suggestions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Based on your history/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Use" })[0]);

    await waitFor(() => {
      expect(onSelectAnswer).toHaveBeenCalledWith("Yes, I am available for evening shifts.");
    });
  });

  it("stays hidden when there are no useful suggestions", async () => {
    mockInvoke.mockResolvedValue([]);

    render(<ScreeningAnswerSuggestions question="Phone" />);

    await waitFor(() => {
      expect(screen.queryByText("Suggested Answers")).not.toBeInTheDocument();
    });
  });
});
