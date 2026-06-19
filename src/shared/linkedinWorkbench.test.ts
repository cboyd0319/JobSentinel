import { describe, expect, it } from "vitest";
import {
  parseUserProvidedLinkedInText,
  shouldShowLinkedInWorkbenchPrivacyReminder,
} from "./linkedinWorkbench";

describe("linkedinWorkbench", () => {
  it("prefills from user-provided selected text", () => {
    const parsed = parseUserProvidedLinkedInText(
      [
        "Principal Security Engineer at Example Co",
        "Denver, Colorado",
        "https://www.linkedin.com/jobs/view/123?currentJobId=123",
      ].join("\n"),
    );

    expect(parsed.title).toBe("Principal Security Engineer");
    expect(parsed.company).toBe("Example Co");
    expect(parsed.url).toBe("https://www.linkedin.com/jobs/view/123?currentJobId=123");
    expect(parsed.notes).toContain("Denver, Colorado");
  });

  it("keeps empty text as empty suggestions", () => {
    expect(parseUserProvidedLinkedInText("   ")).toEqual({
      title: "",
      company: "",
      url: "",
      notes: "",
    });
  });

  it("shows privacy reminders without forcing a hard timeout", () => {
    const startedAt = 1_000;

    expect(shouldShowLinkedInWorkbenchPrivacyReminder(startedAt, startedAt + 59 * 60_000))
      .toBe(false);
    expect(shouldShowLinkedInWorkbenchPrivacyReminder(startedAt, startedAt + 60 * 60_000))
      .toBe(true);
  });
});
