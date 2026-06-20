import { beforeEach, describe, expect, it } from "vitest";
import type { ExternalAiRequestLog } from "./aiGatewayTypes";
import {
  EXTERNAL_AI_REQUEST_LOG_STORAGE_KEY,
  appendExternalAiRequestLog,
  clearExternalAiRequestLog,
  readExternalAiRequestLog,
} from "./externalAiRequestLog";

const baseEntry: ExternalAiRequestLog = {
  feature: "job-description-summary",
  provider: "open_ai",
  timestamp: "2026-06-19T12:00:00.000Z",
  labels: ["External AI optional", "Public-data only"],
  dataCategories: ["job_posting", "public_metadata"],
};

describe("externalAiRequestLog", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores request metadata without preserving unexpected payload fields", () => {
    const entryWithExtraPayload = {
      ...baseEntry,
      payload: {
        resumeText: "private resume text",
      },
    };

    expect(
      appendExternalAiRequestLog(entryWithExtraPayload as ExternalAiRequestLog),
    ).toBe(true);

    const stored = window.localStorage.getItem(
      EXTERNAL_AI_REQUEST_LOG_STORAGE_KEY,
    );
    expect(stored).toContain("job-description-summary");
    expect(stored).not.toContain("private resume text");
    expect(stored).not.toContain("payload");
    expect(readExternalAiRequestLog()).toEqual([baseEntry]);
  });

  it("drops corrupt or invalid stored entries", () => {
    window.localStorage.setItem(
      EXTERNAL_AI_REQUEST_LOG_STORAGE_KEY,
      JSON.stringify([
        baseEntry,
        {
          feature: "invalid",
          provider: "none",
          timestamp: "not-a-date",
          labels: ["Sensitive"],
          dataCategories: ["resume"],
        },
      ]),
    );

    expect(readExternalAiRequestLog()).toEqual([baseEntry]);
  });

  it("keeps the newest 50 entries", () => {
    for (let index = 0; index < 55; index += 1) {
      appendExternalAiRequestLog({
        ...baseEntry,
        feature: `feature-${index}`,
        timestamp: new Date(Date.UTC(2026, 5, 19, 12, index)).toISOString(),
      });
    }

    const entries = readExternalAiRequestLog();
    expect(entries).toHaveLength(50);
    expect(entries[0]?.feature).toBe("feature-54");
    expect(entries[49]?.feature).toBe("feature-5");
  });

  it("clears the local request history", () => {
    appendExternalAiRequestLog(baseEntry);

    expect(clearExternalAiRequestLog()).toBe(true);
    expect(readExternalAiRequestLog()).toEqual([]);
  });
});
