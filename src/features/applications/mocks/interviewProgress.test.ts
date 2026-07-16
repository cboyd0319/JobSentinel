import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../../test-support/mocks/handlers";

describe("Applications interview progress mock commands", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("persists interview preparation and follow-up state", async () => {
    await expect(
      mockInvoke<void>("save_interview_prep_item", {
        interviewId: 1,
        itemId: "research",
        completed: true,
      }),
    ).resolves.toBeUndefined();
    await expect(
      mockInvoke<
        Array<{ itemId: string; completed: boolean; completedAt: string | null }>
      >("get_interview_prep_checklist", { interviewId: 1 }),
    ).resolves.toEqual([
      expect.objectContaining({ itemId: "research", completed: true }),
    ]);

    const followup = await mockInvoke<{
      interviewId: number;
      thankYouSent: boolean;
      sentAt: string | null;
    }>("save_interview_followup", {
      interviewId: 1,
      thankYouSent: true,
    });
    expect(followup).toMatchObject({
      interviewId: 1,
      thankYouSent: true,
      sentAt: expect.any(String),
    });
    await expect(
      mockInvoke("get_interview_followup", { interviewId: 1 }),
    ).resolves.toMatchObject({
      interviewId: 1,
      thankYouSent: true,
    });
  });
});
