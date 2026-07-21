import type {
  MockJob,
  MockMatchResult,
  MockResumeData,
  MockResumeDraft,
  MockSavedMatchEvidenceState,
  MockUserSkill,
} from "../../mocks/handlers/types";

export interface MockResumeCommandState {
  jobs: MockJob[];
  resumes: MockResumeData[];
  userSkills: MockUserSkill[];
  resumeDrafts: MockResumeDraft[];
  recentMatches: MockMatchResult[];
  savedMatchEvidence: Record<string, MockSavedMatchEvidenceState>;
}

export interface MockResumeCommandResult {
  handled: boolean;
  shouldSave: boolean;
  state: MockResumeCommandState;
  value: unknown;
}
