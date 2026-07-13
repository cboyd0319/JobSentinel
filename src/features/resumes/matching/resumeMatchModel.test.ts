import { describe, expect, it } from "vitest";
import {
  buildResumeNextActions,
  getResumeFitEvidenceStatus,
  type AtsAnalysisResult,
  type HardConstraintCategory,
  type RequirementMatchState,
} from "./resumeMatchModel";

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

  it("uses citizenship fallback detail for citizenship hard risks", () => {
    const actions = buildResumeNextActions({
      ...baseAnalysis,
      hard_constraint_risks: [
        hardRisk("us citizenship", "Citizenship", "   "),
      ],
    });

    expect(actions[0].detail).toMatch(/If the citizenship requirement is not true/i);
    expect(actions[0].detail).not.toMatch(/If the authorization is not true/i);
  });

  it("uses age fallback detail for age hard risks", () => {
    const actions = buildResumeNextActions({
      ...baseAnalysis,
      hard_constraint_risks: [
        hardRisk("18 years of age", "Age", "   "),
      ],
    });

    expect(actions[0].detail).toMatch(/minimum-age or legal work-age/i);
    expect(actions[0].detail).toMatch(/do not claim it/i);
  });

  it("uses hard-constraint review rows when separate hard risks are absent", () => {
    const actions = buildResumeNextActions({
      ...baseAnalysis,
      requirement_reviews: [
        requiredReview("driver license", "Missing", true),
        requiredReview("crm", "Missing"),
      ],
    });

    expect(actions.map((action) => action.title)).toEqual([
      "Check driver license before tailoring",
      "Review required evidence for crm",
    ]);
    expect(actions[0]).toMatchObject({
      detail: "This is marked as a hard requirement. Only rely on it if it is true and supported by real evidence.",
      label: "Check first",
      variant: "danger",
    });
  });

  it("does not duplicate partial hard-constraint review rows as supporting-evidence actions", () => {
    const actions = buildResumeNextActions({
      ...baseAnalysis,
      requirement_reviews: [
        requiredReview("work authorization", "Partial", true),
        requiredReview("crm", "Partial"),
      ],
    });

    expect(actions.map((action) => action.title)).toEqual([
      "Check work authorization before tailoring",
      "Add supporting evidence for crm only if true",
    ]);
  });

  it("keeps required-gap actions ahead of positive visible-evidence guidance", () => {
    const actions = buildResumeNextActions({
      ...baseAnalysis,
      requirement_reviews: [
        requiredReview("case management", "Missing"),
        requiredReview("crm", "Implied"),
        requiredReview("scheduling", "Strong"),
      ],
    });

    expect(actions.map((action) => action.title)).toEqual([
      "Review required evidence for case management",
      "Add supporting evidence for crm only if true",
    ]);
    expect(actions.some((action) => action.title.includes("Keep scheduling"))).toBe(
      false,
    );
  });

  it("shows visible-evidence guidance when no required gaps come first", () => {
    const actions = buildResumeNextActions({
      ...baseAnalysis,
      requirement_reviews: [requiredReview("scheduling", "Strong")],
    });

    expect(actions.map((action) => action.title)).toEqual([
      "Keep scheduling visible",
    ]);
  });
});

describe("getResumeFitEvidenceStatus", () => {
  it("shows must-have status for hard-constraint review rows", () => {
    expect(
      getResumeFitEvidenceStatus({
        ...baseAnalysis,
        requirement_reviews: [requiredReview("driver license", "Missing", true)],
      }),
    ).toMatchObject({
      label: "Check must-haves first",
      detail: "A required item needs verification before tailoring.",
      variant: "danger",
    });
  });

  it("shows mixed evidence for weak required wording", () => {
    const weakStates: RequirementMatchState[] = ["Partial", "Implied"];

    for (const matchState of weakStates) {
      expect(
        getResumeFitEvidenceStatus({
          ...baseAnalysis,
          requirement_reviews: [requiredReview("case management", matchState)],
        }),
      ).toMatchObject({
        label: "Mixed evidence",
        detail: "Some required job-post language is missing or needs clearer support.",
        variant: "alert",
      });
    }
  });

  it("keeps clearer evidence for strong required wording", () => {
    expect(
      getResumeFitEvidenceStatus({
        ...baseAnalysis,
        requirement_reviews: [requiredReview("scheduling", "Strong")],
      }),
    ).toMatchObject({
      label: "Clearer evidence",
      variant: "success",
    });
  });
});
