import { describe, expect, it } from "vitest";
import { COVER_LETTER_REVIEW_ITEMS } from "./coverLetterReviewTaxonomy";

describe("coverLetterReviewTaxonomy", () => {
  it("keeps cover letter safety checks explicit", () => {
    expect(COVER_LETTER_REVIEW_ITEMS.map((item) => item.id)).toEqual([
      "replace-blanks",
      "verify-claims",
      "match-job",
    ]);

    for (const item of COVER_LETTER_REVIEW_ITEMS) {
      expect(item.label.trim(), `${item.id} label`).not.toEqual("");
      expect(item.detail.trim(), `${item.id} detail`).not.toEqual("");
    }
  });
});
