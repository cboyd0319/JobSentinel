import { describe, expect, it } from "vitest";
import { CAREER_PROFILES } from "./careerProfileTaxonomy";
import resumeKeywordTaxonomy from "./resumeKeywordTaxonomy.json";
import {
  REQUIRED_RESUME_ROLE_FAMILY_IDS,
  RESUME_ROLE_FAMILY_TAXONOMY,
  resumeRoleFamiliesForSummary,
} from "./resumeRoleFamilyTaxonomy";

describe("resumeRoleFamilyTaxonomy", () => {
  it("covers every v2.9 resume assistance role family with user-facing examples", () => {
    const familyIds = RESUME_ROLE_FAMILY_TAXONOMY.map((family) => family.id);

    expect(familyIds).toEqual(
      expect.arrayContaining([...REQUIRED_RESUME_ROLE_FAMILY_IDS]),
    );
    expect(new Set(familyIds).size).toBe(familyIds.length);

    for (const family of RESUME_ROLE_FAMILY_TAXONOMY) {
      expect(family.label.trim(), `${family.id} label`).not.toEqual("");
      expect(family.plainLanguageCue.trim(), `${family.id} cue`).not.toEqual("");
      expect(family.examples.length, `${family.id} examples`).toBeGreaterThanOrEqual(3);
      expect(family.evidencePrompt.trim(), `${family.id} evidence prompt`).toMatch(
        /evidence|example|record|work|training|credential/i,
      );
    }
  });

  it("keeps the short UI summary readable", () => {
    const summary = resumeRoleFamiliesForSummary();

    expect(summary).toEqual([
      "technical",
      "content",
      "operations",
      "healthcare",
      "service",
      "trades",
      "education",
      "sales",
      "early career",
    ]);
  });

  it("references existing profile and resume evidence prompt taxonomy entries", () => {
    const profileIds = new Set(CAREER_PROFILES.map((profile) => profile.id));
    const evidencePromptIds = new Set(
      resumeKeywordTaxonomy.roleSpecificEvidencePrompts.map(
        (prompt) => prompt.id,
      ),
    );

    for (const family of RESUME_ROLE_FAMILY_TAXONOMY) {
      for (const profileId of family.careerProfileIds) {
        expect(profileIds.has(profileId), `${family.id} profile ${profileId}`).toBe(true);
      }
      for (const promptId of family.resumeEvidencePromptIds) {
        expect(
          evidencePromptIds.has(promptId),
          `${family.id} evidence prompt ${promptId}`,
        ).toBe(true);
      }
    }
  });

  it("keeps modern retail fulfillment and merchandising terms in shared taxonomy", () => {
    const retailProfile = CAREER_PROFILES.find(
      (profile) => profile.id === "retail-hospitality",
    );
    const servicePrompt = resumeKeywordTaxonomy.roleSpecificEvidencePrompts.find(
      (prompt) => prompt.id === "service_operations",
    );
    const supplementalTerms = new Set(
      resumeKeywordTaxonomy.supplementalKeywordGroups.flatMap((group) => group.terms),
    );

    expect(retailProfile?.keywordsBoost).toEqual(
      expect.arrayContaining(["BOPIS", "Curbside Pickup", "Planograms", "Shrink"]),
    );
    expect(servicePrompt?.terms).toEqual(
      expect.arrayContaining([
        "buy online pick up in store",
        "curbside pickup",
        "planogram",
        "shrink",
      ]),
    );
    expect(Array.from(supplementalTerms)).toEqual(
      expect.arrayContaining(["bopis", "ship-from-store", "retail shrink"]),
    );
  });
});
