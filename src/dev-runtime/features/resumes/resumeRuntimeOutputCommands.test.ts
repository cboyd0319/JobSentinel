import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke } from "../../mocks/handlers";
import { setupResumeRuntimeMocks } from "./resumeRuntimeTestSupport";

type MockJobSummary = {
  hash: string;
  score: number;
};

type MockMatchResult = {
  id: number;
  overall_match_score: number;
  skills_match_score: number | null;
  experience_match_score: number | null;
  education_match_score: number | null;
};

type MockMatchFeedback = {
  match_id: number;
  label: "useful" | "not_relevant";
  recorded_at: string;
};

type ResumeTextPreview = {
  resume_id: number;
  name: string;
  has_text: boolean;
  text_preview: string;
  text_chars: number;
  is_truncated: boolean;
};

describe("mock resume runtime output commands", () => {
  beforeEach(setupResumeRuntimeMocks);

  it("returns match scores as backend-compatible fractions", async () => {
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

  it("returns a readable preview without path details", async () => {
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

  it("stores and clears only a closed local match label", async () => {
    const [job] = await mockInvoke<MockJobSummary[]>("get_jobs", {});
    const resumeId = await mockInvoke<number>("select_and_upload_resume");
    const match = await mockInvoke<MockMatchResult>("match_resume_to_job", {
      resumeId,
      jobHash: job.hash,
    });

    const feedback = await mockInvoke<MockMatchFeedback>("set_resume_match_feedback", {
      matchId: match.id,
      label: "not_relevant",
    });

    expect(feedback).toMatchObject({
      match_id: match.id,
      label: "not_relevant",
    });
    expect(Object.keys(feedback).sort()).toEqual(["label", "match_id", "recorded_at"]);
    await expect(
      mockInvoke("set_resume_match_feedback", {
        matchId: match.id,
        label: "maybe",
      }),
    ).rejects.toThrow("Invalid saved resume match feedback");
    await expect(
      mockInvoke("set_resume_match_feedback", {
        matchId: match.id,
        label: null,
      }),
    ).resolves.toBeNull();
  });
});
