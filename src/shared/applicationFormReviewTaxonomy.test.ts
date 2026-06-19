import { describe, expect, it } from "vitest";
import { APPLICATION_FORM_REVIEW_PROVENANCE_ITEMS } from "./applicationFormReviewTaxonomy";

describe("applicationFormReviewTaxonomy", () => {
  it("keeps required provenance categories explicit", () => {
    expect(APPLICATION_FORM_REVIEW_PROVENANCE_ITEMS.map((item) => item.id)).toEqual([
      "exact-question",
      "confirmed-answers",
      "voluntary-protected",
      "unknowns",
    ]);

    for (const item of APPLICATION_FORM_REVIEW_PROVENANCE_ITEMS) {
      expect(item.label.trim(), `${item.id} label`).not.toEqual("");
      expect(item.detail.trim(), `${item.id} detail`).not.toEqual("");
    }
  });
});
