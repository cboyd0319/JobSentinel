import { beforeEach, describe, expect, it, vi } from "vitest";
import { registeredMockCommands } from "./commandRegistry";
import { mockInvoke, resetMockData } from "./handlers";

type MockJobSummary = { hash: string };
type SalaryBenchmark = {
  job_title: string;
  location: string;
  seniority_level: string;
  p25_salary: number;
  median_salary: number;
  p75_salary: number;
  max_salary: number;
  sample_size: number;
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
type AnswerSuggestion = {
  answer: string;
  source: { type: "manual"; answerId: number };
  timesUsed: number;
  lastUsedDaysAgo: number | null;
};

const MOCK_INVOKE_CONTROLS_KEY = "jobsentinel.mockInvokeControls.v1";

describe("mock Tauri command facade", () => {
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
    resetMockData();
  });

  it("registers each development command once", () => {
    expect(new Set(registeredMockCommands).size).toBe(registeredMockCommands.length);
    expect(registeredMockCommands).toEqual(
      expect.arrayContaining([
        "get_jobs",
        "get_config",
        "get_active_resume",
        "fill_application_form",
        "record_linkedin_workbench_event",
      ]),
    );
  });

  it("supports forced command failures", async () => {
    window.localStorage.setItem(
      MOCK_INVOKE_CONTROLS_KEY,
      JSON.stringify({ delayMs: 0, failures: { get_jobs: "Forced test failure" } }),
    );
    await expect(mockInvoke<unknown>("get_jobs")).rejects.toThrow("Forced test failure");
  });

  it("supports command-specific delays", async () => {
    vi.useFakeTimers();
    window.localStorage.setItem(
      MOCK_INVOKE_CONTROLS_KEY,
      JSON.stringify({ delayMs: 0, delays: { get_jobs: 500 } }),
    );

    let settled = false;
    const result = mockInvoke<MockJobSummary[]>("get_jobs").finally(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(499);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ hash: expect.any(String) })]),
    );
    expect(settled).toBe(true);
  });

  it("supports response overrides", async () => {
    window.localStorage.setItem(
      MOCK_INVOKE_CONTROLS_KEY,
      JSON.stringify({
        delayMs: 0,
        responses: { get_jobs: [], is_first_run: true },
      }),
    );
    await expect(mockInvoke<MockJobSummary[]>("get_jobs")).resolves.toEqual([]);
    await expect(mockInvoke<boolean>("is_first_run")).resolves.toBe(true);
  });

  it("clears invoke controls when mock data resets", () => {
    window.localStorage.setItem(
      MOCK_INVOKE_CONTROLS_KEY,
      JSON.stringify({ failures: { get_jobs: "Forced test failure" } }),
    );
    resetMockData();
    expect(window.localStorage.getItem(MOCK_INVOKE_CONTROLS_KEY)).toBeNull();
  });

  it("routes representative runtime commands through feature owners", async () => {
    const benchmark = await mockInvoke<SalaryBenchmark>("get_salary_benchmark", {
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
    await expect(mockInvoke<void>("mark_attempt_submitted", {
      attemptId: fillResult.attemptId,
    })).resolves.toBeUndefined();
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
});
