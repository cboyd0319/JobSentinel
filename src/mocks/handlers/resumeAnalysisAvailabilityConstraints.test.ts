import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";

type AvailabilityConstraintCase = {
  name: string;
  achievement: string;
  jobDescription: string;
  keyword: string;
  riskRequirement?: string;
};

const availabilityConstraintCases: AvailabilityConstraintCase[] = [
  {
    name: "night shift from overnight evidence",
    achievement: "Available for overnight shift coverage.",
    jobDescription: "Required: night shift",
    keyword: "night shift",
  },
  {
    name: "night shift from third-shift evidence",
    achievement: "Available for third shift coverage.",
    jobDescription: "Required: night shift",
    keyword: "night shift",
  },
  {
    name: "weekend availability",
    achievement: "Available for weekend shifts.",
    jobDescription: "Required: weekend availability",
    keyword: "weekend availability",
  },
  {
    name: "evening shift",
    achievement: "Available for second shift coverage.",
    jobDescription: "Required: evening shift",
    keyword: "evening shift",
  },
  {
    name: "day shift",
    achievement: "Available for first shift coverage.",
    jobDescription: "Required: day shift",
    keyword: "day shift",
  },
  {
    name: "availability",
    achievement: "Available for full-time coverage.",
    jobDescription: "Required: availability",
    keyword: "availability",
  },
  {
    name: "overtime availability",
    achievement: "Available for overtime shifts during peak weeks.",
    jobDescription: "Required: overtime availability",
    keyword: "overtime availability",
  },
  {
    name: "holiday availability",
    achievement: "Available for holiday shifts during peak weeks.",
    jobDescription: "Required: holiday availability",
    keyword: "holiday availability",
  },
  {
    name: "full-time availability",
    achievement: "Available for full-time coverage.",
    jobDescription: "Required: full-time availability",
    keyword: "full-time availability",
  },
  {
    name: "part-time availability",
    achievement: "Available for part time coverage.",
    jobDescription: "Required: part-time availability",
    keyword: "part-time availability",
  },
  {
    name: "on-site role",
    achievement: "Available for onsite client-facing shifts.",
    jobDescription: "Required: on-site role",
    keyword: "on-site",
  },
  {
    name: "on site role",
    achievement: "Available for on-site client-facing shifts.",
    jobDescription: "Required: on site role",
    keyword: "on site",
  },
  {
    name: "remote work",
    achievement: "Available for remote work with a secure workspace.",
    jobDescription: "Required: remote work",
    keyword: "remote work",
  },
  {
    name: "reliable internet connection",
    achievement: "Reliable high-speed internet for remote work.",
    jobDescription: "Required: reliable internet connection",
    keyword: "reliable internet connection",
  },
  {
    name: "home office",
    achievement: "Dedicated home office for remote work.",
    jobDescription: "Required: home office",
    keyword: "home office",
  },
  {
    name: "hybrid work",
    achievement: "Available for a hybrid schedule in Denver.",
    jobDescription: "Required: hybrid work",
    keyword: "hybrid work",
  },
  {
    name: "relocation",
    achievement: "Willing to relocate for client site coverage.",
    jobDescription: "Required: relocation",
    keyword: "relocation",
  },
  {
    name: "reliable transportation",
    achievement: "Own transportation for client site visits.",
    jobDescription: "Required: reliable transportation",
    keyword: "reliable transportation",
  },
];

describe("mock resume analysis availability constraints", () => {
  beforeEach(() => {
    resetMockData();
  });

  it.each(availabilityConstraintCases)("recognizes $name evidence", async (testCase) => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: [testCase.achievement],
          },
        ],
        skills: [],
      },
      jobDescription: testCase.jobDescription,
    });
    const riskRequirement = testCase.riskRequirement ?? testCase.keyword;

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: testCase.keyword,
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: riskRequirement,
        }),
      ]),
    );
  });
});
