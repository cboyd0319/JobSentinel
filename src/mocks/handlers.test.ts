import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockInvoke, resetMockData } from "./handlers";
import { atsResume } from "./handlers/resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./handlers/resumeAnalysisTestData";

type MockJobSummary = {
  hash: string;
  score: number;
};

type MockMatchResult = {
  overall_match_score: number;
  skills_match_score: number | null;
  experience_match_score: number | null;
  education_match_score: number | null;
};

type ResumeTextPreview = {
  resume_id: number;
  name: string;
  has_text: boolean;
  text_preview: string;
  text_chars: number;
  is_truncated: boolean;
};

type SalaryBenchmark = {
  job_title: string;
  location: string;
  seniority_level: string;
  min_salary: number;
  p25_salary: number;
  median_salary: number;
  p75_salary: number;
  max_salary: number;
  average_salary: number;
  sample_size: number;
  last_updated: string;
};

type AtsDetectionResponse = {
  platform: string;
  commonFields: string[];
  automationNotes: string | null;
};

type FillResultWithAttempt = {
  filledFields: string[];
  unfilledFields: string[];
  captchaDetected: boolean;
  readyForReview: boolean;
  errorMessage: string | null;
  attemptId: number | null;
  durationMs: number;
  atsPlatform: string;
};

type LinkedInWorkbenchEventResult = {
  jobId: number;
  jobHash: string;
  applicationId: number | null;
  status: string;
  needsDetails: boolean;
  savedAsBookmark: boolean;
  hidden: boolean;
};

type AnswerSuggestion = {
  answer: string;
  confidence: number;
  source: { type: "manual"; answerId: number };
  timesUsed: number;
  timesModified: number;
  lastUsedDaysAgo: number | null;
  modificationRate: number;
};

const MOCK_INVOKE_CONTROLS_KEY = "jobsentinel.mockInvokeControls.v1";

describe("mock Tauri handlers", () => {
  let localStore: Record<string, string>;

  beforeEach(() => {
    vi.useRealTimers();
    localStore = {};
    vi.mocked(window.localStorage.getItem).mockImplementation(
      (key) => localStore[key] ?? null,
    );
    vi.mocked(window.localStorage.setItem).mockImplementation((key, value) => {
      localStore[key] = value;
    });
    vi.mocked(window.localStorage.removeItem).mockImplementation((key) => {
      delete localStore[key];
    });
    vi.mocked(window.localStorage.clear).mockImplementation(() => {
      localStore = {};
    });
    resetMockData();
  });

  it("supports forced command failures for browser state verification", async () => {
    window.localStorage.setItem(
      MOCK_INVOKE_CONTROLS_KEY,
      JSON.stringify({
        delayMs: 0,
        failures: {
          get_jobs: "Forced test failure",
        },
      }),
    );

    await expect(mockInvoke<unknown>("get_jobs")).rejects.toThrow(
      "Forced test failure",
    );
  });

  it("supports command-specific delays for loading-state verification", async () => {
    vi.useFakeTimers();
    window.localStorage.setItem(
      MOCK_INVOKE_CONTROLS_KEY,
      JSON.stringify({
        delayMs: 0,
        delays: {
          get_jobs: 500,
        },
      }),
    );

    let settled = false;
    const result = mockInvoke<MockJobSummary[]>("get_jobs").finally(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(499);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ hash: expect.any(String) }),
      ]),
    );
    expect(settled).toBe(true);
  });

  it("supports response overrides for empty and first-run verification", async () => {
    window.localStorage.setItem(
      MOCK_INVOKE_CONTROLS_KEY,
      JSON.stringify({
        delayMs: 0,
        responses: {
          get_jobs: [],
          is_first_run: true,
        },
      }),
    );

    await expect(mockInvoke<MockJobSummary[]>("get_jobs")).resolves.toEqual([]);
    await expect(mockInvoke<boolean>("is_first_run")).resolves.toBe(true);
  });

  it("clears forced mock controls when mock data resets", async () => {
    window.localStorage.setItem(
      MOCK_INVOKE_CONTROLS_KEY,
      JSON.stringify({
        delayMs: 0,
        failures: {
          get_jobs: "Forced test failure",
        },
      }),
    );

    resetMockData();

    expect(window.localStorage.getItem(MOCK_INVOKE_CONTROLS_KEY)).toBeNull();
  });

  it("does not cap degree-or-equivalent experience requirements in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        education: [],
        experience: [
          {
            ...atsResume.experience[0],
            achievements: [
              "6 years of client operations experience and records management.",
            ],
          },
        ],
      },
      jobDescription: "Required: bachelor's degree or equivalent experience",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "degree or equivalent experience",
          match_state: "Strong",
          hard_constraint: false,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: expect.stringContaining("degree"),
        }),
      ]),
    );
  });

  it("does not cap degree-or-equivalent combination requirements in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        education: [],
        experience: [
          {
            ...atsResume.experience[0],
            achievements: [
              "6 years of client operations experience and records management.",
            ],
          },
        ],
      },
      jobDescription:
        "Required: bachelor's degree or equivalent combination of education and experience",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "degree or equivalent experience",
          match_state: "Strong",
          hard_constraint: false,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: expect.stringContaining("degree"),
        }),
      ]),
    );
  });

  it("does not cap associate-degree-or-equivalent experience requirements in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        education: [],
        experience: [
          {
            ...atsResume.experience[0],
            achievements: [
              "6 years of client operations experience and records management.",
            ],
          },
        ],
      },
      jobDescription: "Required: associate degree or equivalent experience",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "degree or equivalent experience",
          match_state: "Strong",
          hard_constraint: false,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: expect.stringContaining("degree"),
        }),
      ]),
    );
  });

  it("does not cap doctorate-degree-or-equivalent experience requirements in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        education: [],
        experience: [
          {
            ...atsResume.experience[0],
            achievements: [
              "6 years of client operations experience and records management.",
            ],
          },
        ],
      },
      jobDescription: "Required: doctorate degree or equivalent experience",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "degree or equivalent experience",
          match_state: "Strong",
          hard_constraint: false,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: expect.stringContaining("degree"),
        }),
      ]),
    );
  });

  it("recognizes GED as high-school diploma evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        education: [
          {
            degree: "GED",
            institution: "Adult Learning Center",
            location: "Denver, CO",
            graduation_date: "2018",
            gpa: null,
            honors: [],
          },
        ],
      },
      jobDescription: "Required: high school diploma",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "high school diploma",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["education"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "high school diploma",
        }),
      ]),
    );
  });

  it("matches high-school hyphen variants in mock hard constraints", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        education: [
          {
            degree: "High school diploma",
            institution: "Adult Learning Center",
            location: "Denver, CO",
            graduation_date: "2018",
            gpa: null,
            honors: [],
          },
        ],
      },
      jobDescription: "Required: high-school diploma",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "high-school diploma",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["education"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "high-school diploma",
        }),
      ]),
    );
  });

  it("recognizes Certified Nursing Assistant as CNA evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Certified Nursing Assistant"],
      },
      jobDescription: "Required: CNA certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "cna",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "cna",
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "certification",
        }),
      ]),
    );
  });

  it("recognizes Licensed Practical Nurse as LPN evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Licensed Practical Nurse"],
      },
      jobDescription: "Required: LPN license",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "lpn",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "lpn",
        }),
      ]),
    );
  });

  it("recognizes Project Management Professional as PMP evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Project Management Professional"],
      },
      jobDescription: "Required: PMP certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "pmp",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "pmp",
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "certification",
        }),
      ]),
    );
  });

  it("recognizes ServSafe as food-safety certification evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["ServSafe Food Handler"],
      },
      jobDescription: "Required: food safety certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "food safety certification",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "food safety certification",
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "certification",
        }),
      ]),
    );
  });

  it("matches food-handler hyphen variants in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Food handler card"],
      },
      jobDescription: "Required: food-handler card",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "food-handler card",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "food-handler card",
        }),
      ]),
    );
  });

  it("matches food handler's card wording in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Food handler card"],
      },
      jobDescription: "Required: food handler's card",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "food handler's card",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "food handler's card",
        }),
      ]),
    );
  });

  it("matches Security Plus wording variants in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Security Plus"],
      },
      jobDescription: "Required: Security+ certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "security+",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "security+",
        }),
      ]),
    );
  });

  it("matches CISSP full-name wording in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["CISSP"],
      },
      jobDescription: "Required: Certified Information Systems Security Professional",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "certified information systems security professional",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "certified information systems security professional",
        }),
      ]),
    );
  });

  it("recognizes First Aid Certified as first-aid certification evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["First Aid Certified"],
      },
      jobDescription: "Required: first aid certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "first aid certification",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "first aid certification",
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "certification",
        }),
      ]),
    );
  });

  it("recognizes forklift operator certification as forklift certification evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Forklift Operator Certification"],
      },
      jobDescription: "Required: forklift certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "forklift certification",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "forklift certification",
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "certification",
        }),
      ]),
    );
  });

  it("recognizes OSHA 10-Hour as OSHA 10 certification evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["OSHA 10-Hour Construction Safety"],
      },
      jobDescription: "Required: OSHA 10 certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "osha 10 certification",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "osha 10 certification",
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "certification",
        }),
      ]),
    );
  });

  it("recognizes OSHA 30-Hour as OSHA 30 certification evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["OSHA 30-Hour Construction Safety"],
      },
      jobDescription: "Required: OSHA 30 certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "osha 30 certification",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "osha 30 certification",
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "certification",
        }),
      ]),
    );
  });

  it("recognizes Certified Public Accountant as CPA evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Certified Public Accountant"],
      },
      jobDescription: "Required: CPA certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "cpa",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "cpa",
        }),
      ]),
    );
  });

  it("does not treat CPA optimization as an accounting credential in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Reduced paid search CPA through conversion optimization."],
          },
        ],
      },
      jobDescription: "Required: CPA optimization and paid search reporting",
    });

    expect(result.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "cpa",
          hard_constraint: true,
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "cpa",
        }),
      ]),
    );
  });

  it("recognizes Six Sigma belt evidence for certification requirements in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Lean Six Sigma Green Belt"],
      },
      jobDescription: "Required: Six Sigma certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "six sigma certification",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
  });

  it("recognizes AWS Certified credential wording in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["AWS Certified Cloud Practitioner"],
      },
      jobDescription: "Required: AWS certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "aws certification",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
  });

  it("recognizes SHRM-CP credential wording in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["SHRM Certified Professional"],
      },
      jobDescription: "Required: SHRM-CP certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "shrm-cp",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
  });

  it("returns mock resume match scores as backend-compatible fractions", async () => {
    const [job] = await mockInvoke<MockJobSummary[]>("get_jobs", {});
    const resumeId = await mockInvoke<number>("select_and_upload_resume");

    const match = await mockInvoke<MockMatchResult>("match_resume_to_job", {
      resumeId,
      jobHash: job.hash,
    });

    expect(match.overall_match_score).toBe(job.score);
    expect(match.skills_match_score).toBe(job.score);
    expect(match.experience_match_score).toBe(Number((job.score - 0.05).toFixed(2)));
    expect(match.education_match_score).toBeNull();
    expect(match.overall_match_score).toBeGreaterThanOrEqual(0);
    expect(match.overall_match_score).toBeLessThanOrEqual(1);
    expect(match.skills_match_score).toBeGreaterThanOrEqual(0);
    expect(match.skills_match_score).toBeLessThanOrEqual(1);
    expect(match.experience_match_score).toBeGreaterThanOrEqual(0);
    expect(match.experience_match_score).toBeLessThanOrEqual(1);
  });

  it("returns a mock readable resume preview without path details", async () => {
    const resumeId = await mockInvoke<number>("select_and_upload_resume");
    const summary = await mockInvoke<Record<string, unknown>>("get_active_resume");
    const preview = await mockInvoke<ResumeTextPreview>("get_resume_text_preview", { resumeId });

    expect(preview).toMatchObject({
      resume_id: resumeId,
      name: "Mock Resume",
      has_text: true,
      is_truncated: false,
    });
    expect(preview.text_preview).toContain("Mock Resume");
    expect(preview.text_chars).toBe(preview.text_preview.length);
    expect(JSON.stringify(summary)).not.toContain("app-owned://");
    expect(JSON.stringify(preview)).not.toContain("app-owned://");
    expect(JSON.stringify(preview)).not.toContain("file_path");
  });

  it("handles runtime frontend command names in dev mocks", async () => {
    const benchmark = await mockInvoke<SalaryBenchmark | null>("get_salary_benchmark", {
      jobTitle: "Training Coordinator",
      location: "Chicago, IL",
      seniority: "mid",
    });
    expect(benchmark).toMatchObject({
      job_title: "Training Coordinator",
      location: "Chicago, IL",
      seniority_level: "Mid",
      p25_salary: expect.any(Number),
      median_salary: expect.any(Number),
      p75_salary: expect.any(Number),
      max_salary: expect.any(Number),
      sample_size: expect.any(Number),
    });

    const script = await mockInvoke<string>("generate_negotiation_script", {
      scenario: "initial_offer",
      params: {
        company: "CareBridge Health",
        current_offer: "60000",
        job_title: "Training Coordinator",
        location: "Chicago, IL",
        target_min: "68000",
        target_max: "74000",
        years_experience: "5",
      },
    });
    expect(script).toContain("Training Coordinator");
    expect(script).toContain("$68,000");
    expect(script).toContain("$74,000");

    const ats = await mockInvoke<AtsDetectionResponse>("detect_ats_platform", {
      url: "https://boards.greenhouse.io/example/jobs/123",
    });
    expect(ats).toMatchObject({
      platform: "greenhouse",
      commonFields: expect.arrayContaining(["firstName", "lastName", "email"]),
      automationNotes: expect.any(String),
    });

    const fillResult = await mockInvoke<FillResultWithAttempt>("fill_application_form", {
      jobUrl: "https://boards.greenhouse.io/example/jobs/123",
      jobHash: "job-hash-1",
    });
    expect(fillResult).toMatchObject({
      filledFields: expect.arrayContaining(["firstName", "lastName", "email"]),
      unfilledFields: expect.any(Array),
      captchaDetected: false,
      readyForReview: true,
      errorMessage: null,
      attemptId: expect.any(Number),
      durationMs: expect.any(Number),
      atsPlatform: "greenhouse",
    });

    await expect(mockInvoke<boolean>("is_browser_running")).resolves.toBe(true);
    await expect(mockInvoke<void>("mark_attempt_submitted", { attemptId: fillResult.attemptId }))
      .resolves.toBeUndefined();
    await expect(mockInvoke<void>("close_automation_browser")).resolves.toBeUndefined();
    await expect(mockInvoke<boolean>("is_browser_running")).resolves.toBe(false);

    const suggestions = await mockInvoke<AnswerSuggestion[]>("get_suggested_answers", {
      question: "Are you authorized to work in the United States?",
      limit: 3,
    });
    expect(suggestions[0]).toMatchObject({
      answer: "Yes",
      source: { type: "manual", answerId: 1 },
      timesUsed: expect.any(Number),
      lastUsedDaysAgo: expect.any(Number),
    });

    await expect(mockInvoke<void>("complete_setup", { config: {} })).resolves.toBeUndefined();
    await expect(mockInvoke<void>("mark_job_as_real", { jobId: 1 })).resolves.toBeUndefined();
    await expect(mockInvoke<void>("mark_job_as_ghost", { jobId: 1 })).resolves.toBeUndefined();
  });

  it("records LinkedIn workbench actions in dev mocks", async () => {
    const result = await mockInvoke<LinkedInWorkbenchEventResult>(
      "record_linkedin_workbench_event",
      {
        input: {
          eventType: "applied",
          title: "Principal Security Engineer",
          company: "Example Co",
          url: "https://www.linkedin.com/jobs/view/123?token=secret",
          notes:
            "User clicked Log applied from https://www.linkedin.com/jobs/view/123?token=secret li_at=raw-cookie.",
        },
      },
    );

    expect(result).toMatchObject({
      status: "applied",
      needsDetails: false,
      savedAsBookmark: true,
      hidden: false,
      applicationId: expect.any(Number),
    });
    expect(result.jobHash).not.toContain("token=secret");

    const linkedInJobs = await mockInvoke<Array<{
      title: string;
      company: string;
      url: string;
      bookmarked: boolean;
      notes: string | null;
    }>>("get_jobs", { source: "linkedin" });
    expect(linkedInJobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Principal Security Engineer",
          company: "Example Co",
          url: "https://www.linkedin.com/jobs/view/123",
          bookmarked: true,
          notes:
            "User clicked Log applied from https://www.linkedin.com/jobs/view/123 li_at=[REDACTED]",
        }),
      ]),
    );
  });

  it("records expanded LinkedIn workbench ledger actions in dev mocks", async () => {
    for (const [eventType, expectedStatus] of [
      ["interview", "interview"],
      ["follow_up", "follow_up"],
      ["reminder", "reminder"],
      ["rejected", "rejected"],
    ] as const) {
      const result = await mockInvoke<LinkedInWorkbenchEventResult>(
        "record_linkedin_workbench_event",
        {
          input: {
            eventType,
            title: "Content Strategist",
            company: "Example Co",
            url: "https://www.linkedin.com/jobs/view/456",
          },
        },
      );

      expect(result).toMatchObject({
        status: expectedStatus,
        needsDetails: false,
        applicationId: expect.any(Number),
      });
    }
  });

  it("treats saved screening-answer symbols as literal text in dev mocks", async () => {
    await mockInvoke<void>("upsert_screening_answer", {
      questionPattern: "Security+",
      answer: "Yes",
      answerType: "yes_no",
      notes: null,
    });

    await expect(mockInvoke<AnswerSuggestion[]>("get_suggested_answers", {
      question: "Do you have a Security+ certification?",
      limit: 3,
    })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          answer: "Yes",
          source: expect.objectContaining({ type: "manual" }),
        }),
      ]),
    );

    await expect(mockInvoke<AnswerSuggestion[]>("get_suggested_answers", {
      question: "Do you have a security clearance?",
      limit: 3,
    })).resolves.not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          answer: "Yes",
          source: expect.objectContaining({ type: "manual" }),
        }),
      ]),
    );
  });

});
