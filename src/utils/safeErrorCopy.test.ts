import { describe, expect, it } from "vitest";
import { getSafeErrorToastCopy } from "./safeErrorCopy";

describe("getSafeErrorToastCopy", () => {
  it("uses contextual fallback copy without exposing raw private error values", () => {
    const error = Object.assign(
      new Error(
        "unexpected token=super-secret for chad@example.com at /Users/chad/private/resume.pdf",
      ),
      {
        userFriendly: {
          title: "Raw backend failure",
          message:
            "token=super-secret chad@example.com /Users/chad/private/resume.pdf",
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
    expect(copy.message).toContain("safe debug report");
    expect(visibleCopy).not.toContain("super-secret");
    expect(visibleCopy).not.toContain("chad@example.com");
    expect(visibleCopy).not.toContain("/Users/chad");
    expect(visibleCopy).not.toContain("Raw backend failure");
  });

  it("keeps known friendly error categories instead of generic fallback copy", () => {
    const copy = getSafeErrorToastCopy(new Error("database is locked"), {
      fallbackTitle: "Resume unavailable",
      fallbackMessage: "Your resume could not be loaded. Try again.",
    });

    expect(copy.title).toBe("Local Data Busy");
    expect(copy.message).toContain("JobSentinel is already saving or reading");
    expect(copy.message).toContain("restart the app");
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
