import { describe, expect, it } from "vitest";
import { getSafeErrorToastCopy } from "./safeToastCopy";

describe("getSafeErrorToastCopy", () => {
  it("uses contextual fallback copy without exposing raw private error values", () => {
    const error = Object.assign(
      new Error(
        "unexpected token=super-secret for private@example.test at resume=private-file",
      ),
      {
        userFriendly: {
          title: "Raw backend failure",
          message:
            "token=super-secret private@example.test resume=private-file",
        },
      },
    );

    const copy = getSafeErrorToastCopy(error, {
      fallbackTitle: "Resume unavailable",
      fallbackMessage: "Your resume could not be loaded. Try again.",
    });
    const visibleCopy = `${copy.title}\n${copy.message}`;

    expect(copy.title).toBe("Resume unavailable");
    expect(copy.message).toContain("Your resume could not be loaded.");
    expect(copy.message).toContain("safe support report");
    expect(visibleCopy).not.toContain("super-secret");
    expect(visibleCopy).not.toContain("private@example.test");
    expect(visibleCopy).not.toContain("resume=private-file");
    expect(visibleCopy).not.toContain("Raw backend failure");
  });

  it("keeps known friendly error categories instead of generic fallback copy", () => {
    const copy = getSafeErrorToastCopy(new Error("database is locked"), {
      fallbackTitle: "Resume unavailable",
      fallbackMessage: "Your resume could not be loaded. Try again.",
    });

    expect(copy.title).toBe("Local Data Busy");
    expect(copy.message).toContain("JobSentinel is already saving or reading");
    expect(copy.message).toContain("safe support report");
    expect(copy.message).toContain("closing and reopening JobSentinel");
  });

  it("can omit action guidance for compact surfaces", () => {
    const copy = getSafeErrorToastCopy(new Error("some random failure"), {
      fallbackTitle: "Action failed",
      fallbackMessage: "Try again.",
      includeAction: false,
    });

    expect(copy).toEqual({
      title: "Action failed",
      message: "Try again.",
    });
  });
});
