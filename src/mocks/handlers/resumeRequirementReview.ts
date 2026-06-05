import { MOCK_HUMAN_LANGUAGES } from "./resumeAnalysis";
import type {
  MockAtsKeyword,
  MockHardConstraintCategory,
  MockHardConstraintRisk,
  MockKeywordImportance,
  MockKeywordMatch,
  MockRequirementMatchState,
  MockRequirementReview,
} from "./resumeAnalysis";

export function buildMockRequirementReviews(
  keywords: MockAtsKeyword[],
  keywordMatches: MockKeywordMatch[],
  missingKeywordDetails: MockAtsKeyword[],
): MockRequirementReview[] {
  const reviews: MockRequirementReview[] = [];

  for (const { keyword, importance } of keywords) {
    const matched = keywordMatches.find((candidate) =>
      candidate.keyword.toLowerCase() === keyword.toLowerCase()
    );

    if (matched) {
      const matchState = classifyMockRequirementState(matched);
      reviews.push({
        keyword,
        importance,
        match_state: matchState,
        evidence_sections: matched.found_in,
        hard_constraint: Boolean(getMockHardConstraintCategory(keyword)),
        recommendation: getMockRequirementRecommendation(matchState),
      });
      continue;
    }

    if (
      missingKeywordDetails.some((candidate) =>
        candidate.keyword.toLowerCase() === keyword.toLowerCase()
      )
    ) {
      reviews.push({
        keyword,
        importance,
        match_state: "Missing",
        evidence_sections: [],
        hard_constraint: Boolean(getMockHardConstraintCategory(keyword)),
        recommendation: getMockRequirementRecommendation("Missing"),
      });
    }
  }

  return reviews.sort((a, b) => {
    const importanceOrder: Record<MockKeywordImportance, number> = {
      Required: 0,
      Preferred: 1,
      Industry: 2,
    };
    const stateOrder: Record<MockRequirementMatchState, number> = {
      Missing: 0,
      Partial: 1,
      Implied: 2,
      Direct: 3,
      Strong: 4,
    };

    return (
      importanceOrder[a.importance] - importanceOrder[b.importance] ||
      stateOrder[a.match_state] - stateOrder[b.match_state] ||
      a.keyword.localeCompare(b.keyword)
    );
  });
}

export function buildMockHardConstraintRisks(
  requirementReviews: MockRequirementReview[],
): MockHardConstraintRisk[] {
  return requirementReviews
    .filter(
      (review) =>
        review.importance === "Required" &&
        ["Missing", "Partial", "Implied"].includes(review.match_state),
    )
    .flatMap((review) => {
      const category = getMockHardConstraintCategory(review.keyword);
      if (!category) return [];
      return [
        {
          requirement: review.keyword,
          category,
          score_cap: getMockHardConstraintScoreCap(category),
          reason: "A required hard constraint was not clearly found in the resume.",
          action: getMockHardConstraintAction(review.keyword, category),
        },
      ];
    })
    .sort(
      (a, b) =>
        a.score_cap - b.score_cap || a.requirement.localeCompare(b.requirement),
    );
}

function classifyMockRequirementState(match: MockKeywordMatch): MockRequirementMatchState {
  const hasDirectEvidence = match.found_in.some((section) =>
    [
      "resume text",
      "experience",
      "current experience",
      "recent experience",
      "summary",
      "projects",
      "education",
      "certifications",
      "licenses",
    ].includes(section)
  );

  if (hasDirectEvidence && (match.frequency > 1 || match.found_in.length > 1)) {
    return "Strong";
  }
  if (hasDirectEvidence) {
    return "Direct";
  }
  if (match.found_in.includes("skills")) {
    return "Partial";
  }
  return "Implied";
}

function getMockRequirementRecommendation(state: MockRequirementMatchState): string {
  switch (state) {
    case "Strong":
      return "Strong visible evidence found. Keep it easy to see near the relevant role.";
    case "Direct":
      return "Found visible evidence. Keep it clear and tied to real work or credentials.";
    case "Partial":
      return "Found in a lighter evidence area. Add supporting evidence only if true.";
    case "Implied":
      return "Related evidence may exist, but the wording is not clear. Review before relying on it.";
    case "Missing":
      return "Only add it if true. If this is required and not true, treat the role as higher risk.";
  }
}

function getMockHardConstraintAction(
  keyword: string,
  category: MockHardConstraintCategory,
): string {
  if (category === "Experience" && isMockSeniorityLevelConstraint(keyword)) {
    return "Check whether your visible level matches this role; lower-title or fewer-years evidence may not satisfy it. Do not round up, stretch titles, or imply more experience than you have.";
  }
  if (
    category === "Citizenship" ||
    (category === "WorkAuthorization" && isMockCitizenshipConstraint(keyword))
  ) {
    return "Check citizenship before tailoring. If it is not true for you, do not claim it. Do not treat work authorization as citizenship.";
  }
  if (isMockDrivingRecordConstraint(keyword) || isMockVehicleInsuranceConstraint(keyword)) {
    return "Check driving record, vehicle, or auto insurance before tailoring. If it is not current, workable, or true for you, do not claim it.";
  }

  switch (category) {
    case "WorkAuthorization":
      return "Check work authorization before tailoring. If it is not true for you, do not claim it.";
    case "SecurityClearance":
      return "Check clearance before tailoring. If it is not current or true for you, do not claim it.";
    case "LicenseOrCertification":
      return "Check license or certification before tailoring. If it is not current or true for you, do not claim it.";
    case "Education":
      return "Check the degree or education requirement before tailoring. If it is not true for you, do not claim it.";
    case "Experience":
      return "Check years or level before tailoring. Do not round up, stretch titles, or imply more experience than you have.";
    case "Language":
      return "Check language fluency before tailoring. If it is not true for you, do not claim it.";
    case "BackgroundScreening":
      return "Check background, drug, or pre-employment screening before tailoring. If it is not workable or true for you, do not claim or imply that it is.";
    case "PhysicalRequirement":
      return "Check this physical demand before tailoring. If it is not workable or safe for you, do not claim it.";
    case "Location":
      return "Check location, schedule, availability, or travel before tailoring. If it is not workable for you, do not claim it.";
  }
}

function isMockCitizenshipConstraint(keyword: string): boolean {
  const lower = keyword.toLowerCase();
  return (
    lower.includes("us citizenship") ||
    lower.includes("u.s. citizenship") ||
    lower.includes("us citizen") ||
    lower.includes("u.s. citizen") ||
    lower.includes("citizenship required")
  );
}

function isMockSeniorityLevelConstraint(keyword: string): boolean {
  return [
    "senior-level experience",
    "mid-level experience",
    "lead-level experience",
    "staff/principal-level experience",
    "director-level experience",
    "executive-level experience",
  ].includes(keyword.toLowerCase());
}

function isMockDrivingRecordConstraint(keyword: string): boolean {
  const lower = keyword.toLowerCase();
  return (
    lower.includes("driving record") ||
    lower === "mvr" ||
    lower.includes("motor vehicle record")
  );
}

function isMockVehicleInsuranceConstraint(keyword: string): boolean {
  const lower = keyword.toLowerCase();
  return (
    lower.includes("proof of auto insurance") ||
    lower.includes("proof of insurance") ||
    lower.includes("auto insurance") ||
    lower.includes("car insurance") ||
    lower.includes("vehicle insurance") ||
    lower.includes("insured vehicle") ||
    lower.includes("reliable vehicle")
  );
}

function getMockHardConstraintScoreCap(category: MockHardConstraintCategory): number {
  switch (category) {
    case "WorkAuthorization":
    case "Citizenship":
      return 50;
    case "SecurityClearance":
    case "LicenseOrCertification":
      return 60;
    case "Education":
    case "Experience":
    case "Language":
      return 65;
    case "BackgroundScreening":
      return 70;
    case "PhysicalRequirement":
    case "Location":
      return 70;
  }
}

function getMockHardConstraintCategory(keyword: string): MockHardConstraintCategory | null {
  const lower = keyword.toLowerCase();
  if (isMockCitizenshipConstraint(lower)) {
    return "Citizenship";
  }
  if (
    lower.includes("work authorization") ||
    lower.includes("authorized to work") ||
    lower.includes("visa sponsorship")
  ) {
    return "WorkAuthorization";
  }
  if (lower.includes("security clearance") || lower === "clearance") {
    return "SecurityClearance";
  }
  if (
    lower.includes("license") ||
    lower.includes("certification") ||
    ["cdl", "cissp", "security+", "rn", "bls", "acls", "cpr"].includes(lower) ||
    lower.includes("certified information systems security professional") ||
    lower === "security plus" ||
    lower === "cna" ||
    lower === "lpn" ||
    lower === "lvn" ||
    lower.includes("certified nursing assistant") ||
    lower.includes("certified nurse assistant") ||
    lower.includes("certified nurse aide") ||
    lower.includes("licensed practical nurse") ||
    lower.includes("licensed vocational nurse") ||
    lower === "pmp" ||
    lower.includes("project management professional") ||
    lower === "servsafe" ||
    lower.includes("food safety certification") ||
    lower.includes("food handler") ||
    lower.includes("food-handler") ||
    lower.includes("first aid") ||
    lower.includes("first-aid") ||
    lower.includes("forklift certification") ||
    lower.includes("forklift certified") ||
    lower.includes("forklift license") ||
    lower.includes("forklift operator") ||
    lower.includes("osha 10") ||
    lower.includes("osha10") ||
    lower.includes("osha 30") ||
    lower.includes("osha30") ||
    lower.includes("basic life support") ||
    lower.includes("advanced cardiovascular life support") ||
    lower.includes("cardiopulmonary resuscitation")
  ) {
    return "LicenseOrCertification";
  }
  if (lower.includes("equivalent experience")) {
    return null;
  }
  if (
    lower.includes("degree") ||
    lower.includes("bachelor") ||
    lower.includes("master") ||
    lower.includes("phd") ||
    lower.includes("ph.d") ||
    lower.includes("doctorate") ||
    lower.includes("doctoral") ||
    lower.includes("high school") ||
    lower.includes("high-school") ||
    lower.includes("general education development") ||
    lower === "ged"
  ) {
    return "Education";
  }
  if (
    lower.includes("year") ||
    lower.includes("yrs") ||
    lower.includes("level experience") ||
    lower === "management experience"
  ) {
    return "Experience";
  }
  if (isMockKnownHumanLanguageRequirement(lower)) {
    return "Language";
  }
  if (
    lower.includes("background check") ||
    lower.includes("background screening") ||
    lower.includes("pre-employment screening") ||
    lower.includes("pre employment screening") ||
    lower.includes("drug screen") ||
    lower.includes("drug screening") ||
    lower.includes("drug test") ||
    lower.includes("drug testing") ||
    isMockDrivingRecordConstraint(lower)
  ) {
    return "BackgroundScreening";
  }
  if (
    lower.includes("lift ") ||
    lower.includes("pound") ||
    lower.includes("lbs") ||
    lower.includes("physical requirement") ||
    lower.includes("physical demand") ||
    lower.includes("stand for long") ||
    lower.includes("standing for long")
  ) {
    return "PhysicalRequirement";
  }
  if (
    lower.includes("onsite") ||
    lower.includes("on-site") ||
    lower.includes("on site") ||
    lower.includes("remote") ||
    lower.includes("hybrid") ||
    lower.includes("relocation") ||
    lower.includes("relocate") ||
    lower.includes("travel") ||
    lower.includes("transportation") ||
    isMockVehicleInsuranceConstraint(lower) ||
    lower.includes("commute") ||
    lower.includes("commuting") ||
    lower.includes("availability") ||
    lower.includes("available") ||
    lower.includes("schedule") ||
    lower.includes("weekend") ||
    lower.includes("night shift") ||
    lower.includes("overnight shift") ||
    lower.includes("third shift") ||
    lower.includes("3rd shift") ||
    lower.includes("second shift") ||
    lower.includes("2nd shift") ||
    lower.includes("day shift") ||
    lower.includes("first shift") ||
    lower.includes("1st shift") ||
    lower.includes("evening") ||
    lower.includes("overtime") ||
    lower.includes("holiday") ||
    lower.includes("full-time") ||
    lower.includes("full time") ||
    lower.includes("part-time") ||
    lower.includes("part time")
  ) {
    return "Location";
  }
  return null;
}

function isMockKnownHumanLanguageRequirement(lower: string): boolean {
  if (lower.includes("bilingual")) {
    return true;
  }

  return MOCK_HUMAN_LANGUAGES.some((language) =>
    lower.includes(`${language} fluency`) ||
      lower.includes(`fluent ${language}`) ||
      lower.includes(`fluent in ${language}`) ||
      lower.includes(`${language} language`) ||
      lower.includes(`english/${language}`) ||
      lower.includes(`english and ${language}`),
  );
}
