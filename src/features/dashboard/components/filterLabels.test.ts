import { describe, expect, it } from "vitest";
import {
  formatBookmarkFilter,
  formatNotesFilter,
  formatRemoteFilter,
  formatScoreFilter,
  formatSortOption,
  scoreFilterOptions,
  sortOptions,
} from "./filterLabels";

describe("dashboard filter labels", () => {
  it("formats saved-search preview labels without internal filter ids", () => {
    expect(formatSortOption("score-desc")).toBe("Closest Fit First");
    expect(formatSortOption("score-asc")).toBe("Needs Review First");
    expect(formatScoreFilter("high")).toBe("Strong Fit");
    expect(formatRemoteFilter("remote")).toBe("Remote Only");
    expect(formatBookmarkFilter("bookmarked")).toBe("Bookmarked");
    expect(formatNotesFilter("has-notes")).toBe("With Notes");
  });

  it("uses fit and review copy in dropdown options", () => {
    const allLabels = [...sortOptions, ...scoreFilterOptions]
      .map((option) => option.label)
      .join(" ");

    expect(allLabels).toContain("All Fit Levels");
    expect(allLabels).toContain("Needs Review");
    expect(allLabels).not.toContain("Best Match First");
    expect(allLabels).not.toContain("Lowest Match First");
    expect(allLabels).not.toContain("Weakest Match First");
    expect(allLabels).not.toMatch(/\d+%\+?|\d+-\d+%|<\d+%/);
    expect(allLabels).not.toMatch(/score \(high|score \(low|all scores/i);
  });
});
