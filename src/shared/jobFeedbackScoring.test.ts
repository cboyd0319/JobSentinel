import { describe, expect, it, vi } from "vitest";
import {
  JOB_FEEDBACK_SCORING_STORAGE_KEY,
  applyJobFeedbackScoreAdjustment,
  clearJobFeedbackSignal,
  getJobFeedbackKey,
  readJobFeedbackSignal,
  writeJobFeedbackSignal,
} from "./jobFeedbackScoring";

function makeStorage(initial: Record<string, string | null> = {}) {
  const values = new Map(Object.entries(initial).filter(([, value]) => value !== null));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
}

describe("job feedback scoring", () => {
  it("uses local job identity without storing the job URL", () => {
    const key = getJobFeedbackKey({
      id: 42,
      hash: "abc123",
      url: "https://example.com/jobs/private-token",
    });

    expect(key).toBe("hash:abc123");
    expect(key).not.toContain("https://example.com");
  });

  it("stores useful and not-useful feedback locally without URL data", () => {
    const storage = makeStorage();

    writeJobFeedbackSignal(
      {
        jobKey: "hash:abc123",
        verdict: "useful",
        title: "Customer Support Lead",
        company: "CareBridge Services",
        recordedAt: "2026-06-19T12:00:00Z",
      },
      storage,
    );

    expect(readJobFeedbackSignal("hash:abc123", storage)).toMatchObject({
      verdict: "useful",
      title: "Customer Support Lead",
      company: "CareBridge Services",
    });
    expect(storage.setItem).toHaveBeenCalledWith(
      JOB_FEEDBACK_SCORING_STORAGE_KEY,
      expect.not.stringContaining("https://"),
    );
  });

  it("adjusts local fit estimates without claiming employer intent", () => {
    expect(
      applyJobFeedbackScoreAdjustment(0.86, {
        jobKey: "hash:abc123",
        verdict: "useful",
        recordedAt: "2026-06-19T12:00:00Z",
      }),
    ).toEqual({
      score: 0.91,
      delta: 0.05,
      label: "Raised by your feedback",
      description:
        "This local fit estimate was raised because you marked this job useful. It does not predict employer intent.",
    });

    expect(
      applyJobFeedbackScoreAdjustment(0.2, {
        jobKey: "hash:abc123",
        verdict: "not_useful",
        recordedAt: "2026-06-19T12:00:00Z",
      }),
    ).toMatchObject({
      score: 0.08,
      delta: -0.12,
      label: "Lowered by your feedback",
    });
  });

  it("lets users clear local feedback for one job", () => {
    const storage = makeStorage({
      [JOB_FEEDBACK_SCORING_STORAGE_KEY]: JSON.stringify({
        "hash:abc123": {
          jobKey: "hash:abc123",
          verdict: "useful",
          recordedAt: "2026-06-19T12:00:00Z",
        },
      }),
    });

    clearJobFeedbackSignal("hash:abc123", storage);

    expect(readJobFeedbackSignal("hash:abc123", storage)).toBeNull();
  });
});
