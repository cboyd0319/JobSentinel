import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockInvoke, resetMockData } from "../../mocks/handlers";

type AnswerSuggestion = {
  answer: string;
  source: { type: "manual"; answerId: number };
};

describe("application assist mock runtime commands", () => {
  let localStore: Record<string, string>;

  beforeEach(() => {
    localStore = {};
    vi.mocked(window.localStorage.getItem).mockImplementation(
      (key) => localStore[key] ?? null,
    );
    vi.mocked(window.localStorage.setItem).mockImplementation((key, value) => {
      localStore[key] = value;
    });
    vi.mocked(window.localStorage.removeItem).mockImplementation((key) => {
      delete localStore[key];
    });
    resetMockData();
  });

  it("treats saved screening-answer symbols as literal text", async () => {
    await mockInvoke<void>("upsert_screening_answer", {
      questionPattern: "Security+",
      answer: "Yes",
      answerType: "yes_no",
      notes: null,
    });

    await expect(mockInvoke<AnswerSuggestion[]>("get_suggested_answers", {
      question: "Do you have a Security+ certification?",
      limit: 3,
    })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          answer: "Yes",
          source: expect.objectContaining({ type: "manual" }),
        }),
      ]),
    );

    await expect(mockInvoke<AnswerSuggestion[]>("get_suggested_answers", {
      question: "Do you have a security clearance?",
      limit: 3,
    })).resolves.not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          answer: "Yes",
          source: expect.objectContaining({ type: "manual" }),
        }),
      ]),
    );
  });
});
