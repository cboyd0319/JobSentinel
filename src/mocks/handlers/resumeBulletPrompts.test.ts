import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../handlers";

async function improveBullet(bullet: string, jobContext: string) {
  return mockInvoke<string>("improve_bullet_point", {
    bullet,
    jobContext,
  });
}

describe("mock resume bullet prompt handlers", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("keeps drafted bullets truthful and review-first", async () => {
    const improved = await improveBullet(
      "helped with client scheduling",
      "Required: scheduling, case management",
    );

    expect(improved).toContain("Contributed to client scheduling");
    expect(improved).toContain("add a true number, outcome, or concrete detail if you have one");
    expect(improved).toContain("review if these are true and worth making visible");
    expect(improved).toContain("problem, your role, action, result, and evidence");
    expect(improved).not.toContain("consider adding");
  });

  it.each([
    [
      "healthcare",
      "supported patient care documentation",
      "Required: patient care, medication administration, RN license",
      [
        "healthcare evidence to check",
        "scope of practice",
        "patient safety",
        "required credentials",
      ],
    ],
    [
      "trades-field",
      "completed maintenance work orders",
      "Required: maintenance technician, equipment repair, OSHA 10, forklift operation",
      [
        "trades-field evidence to check",
        "equipment or tools used",
        "safety rules",
        "work orders",
        "required licenses",
      ],
    ],
    [
      "career-change",
      "supported customer onboarding during a career change",
      "Career change welcome. Required: transferable customer support skills and training program",
      [
        "career-change evidence to check",
        "transferable work",
        "training",
        "adjacent experience",
        "truthful gaps or transitions",
      ],
    ],
    [
      "early-career",
      "completed capstone project and trainee rotations",
      "Entry-level trainee role for new graduate applicants",
      [
        "early-career evidence to check",
        "training or coursework",
        "projects or volunteer work",
        "supervised responsibilities",
        "readiness to learn",
      ],
    ],
    [
      "regulated-work",
      "supported case files and reconciliation",
      "Required: legal research, case files, financial reconciliation",
      [
        "regulated-work evidence to check",
        "records accuracy",
        "deadlines",
        "confidentiality",
        "audit trail",
      ],
    ],
    [
      "service-operations",
      "handled client intake scheduling",
      "Required: customer service, case management, appointment setting",
      [
        "service-operations evidence to check",
        "customer impact",
        "volume",
        "escalation path",
        "response quality",
      ],
    ],
    [
      "technical-data",
      "built reporting dashboard",
      "Required: data analysis, SQL, machine learning model monitoring",
      [
        "technical-data evidence to check",
        "shipped work",
        "users or decisions supported",
        "data sources",
        "measurable outcomes",
      ],
    ],
    [
      "sales-marketing",
      "supported campaign and account follow-up",
      "Required: sales pipeline, account retention, marketing campaign",
      [
        "sales-marketing evidence to check",
        "quota or pipeline",
        "audience or account scope",
        "conversion or revenue impact",
        "retention",
      ],
    ],
    [
      "design-creative",
      "created prototypes for onboarding flow",
      "Required: product design, Figma, accessibility, design portfolio",
      [
        "design-creative evidence to check",
        "user problem",
        "audience",
        "accessibility",
        "shipped outcome",
      ],
    ],
    [
      "education-academic",
      "developed curriculum for student workshops",
      "Required: teaching, curriculum design, student assessment",
      [
        "education-academic evidence to check",
        "learner or research audience",
        "standards or methods",
        "outcomes",
        "ethics",
      ],
    ],
    [
      "executive-leadership",
      "led department change program",
      "Required: director-level people management, budget ownership, change management",
      [
        "executive-leadership evidence to check",
        "scope of ownership",
        "team or budget size",
        "decision authority",
        "business impact",
      ],
    ],
    [
      "security",
      "supported incident response reviews",
      "Required: cybersecurity, incident response, vulnerability management",
      [
        "security evidence to check",
        "authorized scope",
        "risk reduced",
        "controls or incidents handled",
        "sensitive-data handling",
      ],
    ],
    [
      "federal",
      "reviewed program case files",
      "Required: federal specialized experience, GS-09 grade level, public trust",
      [
        "federal evidence to check",
        "specialized experience",
        "grade level",
        "announcement duties",
        "required documents",
      ],
    ],
  ])("adds %s evidence guidance", async (_label, bullet, jobContext, expectedPhrases) => {
    const improved = await improveBullet(bullet, jobContext);

    for (const phrase of expectedPhrases) {
      expect(improved).toContain(phrase);
    }
  });
});
