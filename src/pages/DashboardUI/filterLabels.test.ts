import { describe, expect, it } from "vitest";
import {
  formatScoreFilter,
  formatSortOption,
  scoreFilterOptions,
  sortOptions,
} from "./filterLabels";

describe("dashboard filter labels", () => {
  it("formats saved-search preview labels without internal filter ids", () => {
    expect(formatSortOption("score-desc")).toBe("Best Match First");
    expect(formatSortOption("score-asc")).toBe("Lowest Match First");
    expect(formatScoreFilter("high")).toBe("Strong (70%+)");
  });

  it("uses match-strength copy in dropdown options", () => {
    const allLabels = [...sortOptions, ...scoreFilterOptions]
      .map((option) => option.label)
      .join(" ");

    expect(allLabels).toContain("All Matches");
    expect(allLabels).not.toContain("Weakest Match First");
    expect(allLabels).not.toMatch(/score \(high|score \(low|all scores/i);
  });
});
