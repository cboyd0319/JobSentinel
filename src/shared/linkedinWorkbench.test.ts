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
        "https://www.linkedin.com/jobs/view/123?currentJobId=123&token=secret",
      ].join("\n"),
    );

    expect(parsed.title).toBe("Principal Security Engineer");
    expect(parsed.company).toBe("Example Co");
    expect(parsed.url).toBe("https://www.linkedin.com/jobs/view/123");
    expect(parsed.notes).toContain("Denver, Colorado");
    expect(parsed.notes).toContain("https://www.linkedin.com/jobs/view/123");
    expect(parsed.notes).not.toContain("token=secret");
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

  it("removes pasted cookies and token-like fields from local notes", () => {
    const parsed = parseUserProvidedLinkedInText(
      [
        "Principal Security Engineer at Example Co",
        "https://www.linkedin.com/jobs/view/123?token=secret",
        "li_at=raw-cookie session=abc",
      ].join("\n"),
    );

    expect(parsed.notes).toContain("li_at=[REDACTED]");
    expect(parsed.notes).toContain("session=[removed]");
    expect(parsed.notes).not.toContain("raw-cookie");
    expect(parsed.notes).not.toContain("token=secret");
  });
});
