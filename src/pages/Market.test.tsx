import { describe, expect, it } from "vitest";
import { getMarketDataErrorCopy } from "./marketErrorCopy";

describe("Market safe error copy", () => {
  it("does not expose raw private details in market load errors", () => {
    const copy = getMarketDataErrorCopy(
      new Error("token=raw-secret chad@example.com /Users/chad/private/resume.pdf"),
    );
    const visibleText = `${copy.inlineMessage} ${copy.toastTitle} ${copy.toastMessage}`;

    expect(copy.toastTitle).toBe("Hiring trends unavailable");
    expect(visibleText).toContain("safe support report");
    expect(visibleText).not.toMatch(/raw-secret|chad@example\.com|\/Users\/chad/);
  });
});
