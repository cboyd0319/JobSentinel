import { describe, expect, it } from "vitest";
import {
  buildResumeNextActions,
  type AtsAnalysisResult,
  type HardConstraintCategory,
  type RequirementMatchState,
} from "./resumeOptimizerModel";

const baseAnalysis: AtsAnalysisResult = {
  overall_score: 80,
  keyword_score: 80,
  format_score: 80,
  completeness_score: 80,
  keyword_matches: [],
  missing_keywords: [],
  missing_keyword_details: [],
  requirement_reviews: [],
  hard_constraint_risks: [],
  format_issues: [],
  suggestions: [],
};

function hardRisk(
  requirement: string,
  category: HardConstraintCategory,
  action = `Check ${requirement} before tailoring.`,
) {
  return {
    requirement,
    category,
    score_cap: 60,
    reason: `${requirement} is required and not clearly found.`,
    action,
  };
}

function requiredReview(
  keyword: string,
  matchState: RequirementMatchState,
  hardConstraint = false,
) {
  return {
    keyword,
    importance: "Required" as const,
    match_state: matchState,
    evidence_sections: ["experience"],
    hard_constraint: hardConstraint,
    recommendation: "Review before tailoring.",
  };
}

describe("buildResumeNextActions", () => {
  it("prioritizes up to five hard constraints before other next actions", () => {
    const actions = buildResumeNextActions({
      ...baseAnalysis,
      hard_constraint_risks: [
        hardRisk("security clearance", "SecurityClearance"),
        hardRisk("8+ years", "Experience"),
        hardRisk("driver license", "LicenseOrCertification"),
        hardRisk("background screening", "BackgroundScreening"),
        hardRisk("Spanish fluency", "Language"),
        hardRisk("onsite travel", "Location"),
      ],
      requirement_reviews: [
        requiredReview("crm", "Missing"),
        requiredReview("scheduling", "Strong"),
      ],
    });

    expect(actions).toHaveLength(5);
    expect(actions.map((action) => action.label)).toEqual([
      "Check first",
      "Check first",
      "Check first",
      "Check first",
      "Check first",
    ]);
    expect(actions.map((action) => action.title)).toEqual([
      "Check security clearance before tailoring",
      "Check 8+ years before tailoring",
      "Check driver license before tailoring",
      "Check background screening before tailoring",
      "Check Spanish fluency before tailoring",
    ]);
  });

  it("suppresses positive keep-visible guidance while hard blockers remain", () => {
    const actions = buildResumeNextActions({
      ...baseAnalysis,
      hard_constraint_risks: [
        hardRisk("security clearance", "SecurityClearance"),
      ],
      requirement_reviews: [
        requiredReview("crm", "Partial"),
        requiredReview("scheduling", "Strong"),
      ],
    });

    expect(actions.map((action) => action.title)).toEqual([
      "Check security clearance before tailoring",
      "Add supporting evidence for crm only if true",
    ]);
    expect(actions.some((action) => action.title.includes("Keep scheduling"))).toBe(
      false,
    );
  });

  it("uses backend hard-risk action text with category fallback", () => {
    const actions = buildResumeNextActions({
      ...baseAnalysis,
      hard_constraint_risks: [
        hardRisk(
          "8+ years",
          "Experience",
          "Check visible seniority; do not stretch titles or years.",
        ),
        hardRisk("work authorization", "WorkAuthorization", "   "),
      ],
    });

    expect(actions[0].detail).toBe(
      "Check visible seniority; do not stretch titles or years.",
    );
    expect(actions[1].detail).toMatch(/If the authorization is not true/i);
  });
});
