/** Selects an active resume's exact saved match for military wording review. */

export type MilitaryReviewMatch = {
  id: number;
  resume_id: number;
  job_hash: string;
};

function positiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function opaqueJobHash(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 128 &&
    ![...value].some((character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127);
}

export function activeResumeId(value: unknown): number | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const resume = value as Record<string, unknown>;
  return resume.is_active === true && positiveId(resume.id) ? resume.id : null;
}

export function exactActiveSavedMatch(
  value: unknown,
  resumeId: number,
  jobHash: string,
): MilitaryReviewMatch | null {
  if (typeof value !== "object" || value === null || Array.isArray(value) || !opaqueJobHash(jobHash)) return null;
  const match = value as Record<string, unknown>;
  return positiveId(match.id) && match.resume_id === resumeId && match.job_hash === jobHash
    ? { id: match.id, resume_id: resumeId, job_hash: jobHash }
    : null;
}
