import { ATS_POWER_WORDS } from "./resumeAnalysis";
import { improveMockBulletPoint } from "./resumeBulletPrompts";
import {
  analyzeMockResumeForJob,
  analyzeMockResumeFormat,
} from "./resumeAnalysisRunner";
import {
  exportMockResumeText,
  getEmptyBuilderContact,
  getResumeTemplates,
  normalizeBuilderContact,
  normalizeBuilderEducation,
  normalizeBuilderExperience,
  normalizeBuilderSkill,
  renderMockResumeHtml,
} from "./resumeBuilder";
import {
  getArg,
  getNextId,
  getNumericArg,
  getResumeIdArg,
  getSkillIdArg,
  getStringArg,
  hasOwnInputKey,
  normalizeSkillInput,
  skillYearsOrNull,
  toScoreFraction,
  trimmedStringOrNull,
} from "./commandHelpers";
import { extractMockAtsKeywords } from "./resumeKeywordMatching";
import {
  toMockResumeSummary,
  toMockResumeTextPreview,
} from "./resumeSummaryViews";
import type {
  MockBuilderSkill,
  MockJob,
  MockMatchResult,
  MockResumeData,
  MockResumeDraft,
  MockUserSkill,
} from "./types";

export interface MockResumeCommandState {
  jobs: MockJob[];
  resumes: MockResumeData[];
  userSkills: MockUserSkill[];
  resumeDrafts: MockResumeDraft[];
  recentMatches: MockMatchResult[];
}

export interface MockResumeCommandResult {
  handled: boolean;
  shouldSave: boolean;
  state: MockResumeCommandState;
  value: unknown;
}

export function getMockActiveResume(
  resumes: MockResumeData[],
): MockResumeData | null {
  return resumes.find((resume) => resume.is_active) ?? null;
}

export function handleMockResumeCommand(
  command: string,
  args: Record<string, unknown> | undefined,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  switch (command) {
    case "get_active_resume": {
      const activeResume = getMockActiveResume(state.resumes);
      return withoutSave(
        state,
        activeResume ? toMockResumeSummary(activeResume) : null,
      );
    }

    case "list_all_resumes":
      return withoutSave(state, state.resumes.map(toMockResumeSummary));

    case "get_resume_text_preview":
      return getResumeTextPreview(args, state);

    case "set_active_resume":
      return setActiveResume(args, state);

    case "select_and_upload_resume":
      return createMockResume(
        "Mock Resume",
        "app-owned://resume-uploads/mock-resume.pdf",
        state,
      );

    case "import_json_resume": {
      const name = getStringArg(args, "name") ?? "Imported Resume";
      return createMockResume(`${name}.json`, `${name}.json`, state);
    }

    case "select_and_import_json_resume":
      return createMockResume(
        "Imported Resume",
        "app-owned://resume-imports/imported-resume.json",
        state,
      );

    case "delete_resume":
      return deleteResume(args, state);

    case "get_user_skills": {
      const resumeId = getResumeIdArg(args);
      return withoutSave(
        state,
        state.userSkills.filter((skill) => skill.resume_id === resumeId),
      );
    }

    case "add_user_skill":
      return addUserSkill(args, state);

    case "update_user_skill":
      return updateUserSkill(args, state);

    case "delete_user_skill": {
      const skillId = getSkillIdArg(args);
      return withSave(
        {
          ...state,
          userSkills: state.userSkills.filter((skill) => skill.id !== skillId),
        },
        undefined,
      );
    }

    case "get_recent_matches": {
      const resumeId = getResumeIdArg(args);
      const limit = getNumericArg(args, "limit") ?? 10;
      return withoutSave(
        state,
        state.recentMatches
          .filter((match) => match.resume_id === resumeId)
          .slice(0, limit),
      );
    }

    case "match_resume_to_job":
      return matchResumeToJob(args, state);

    case "create_resume_draft":
      return createMockResumeDraft(state);

    case "get_resume_draft":
      return withoutSave(state, getResumeDraft(args, state) ?? null);

    case "update_resume_contact": {
      const resumeId = getResumeIdArg(args);
      const contact = normalizeBuilderContact(getArg(args, "contact"));
      return updateResumeDraft(
        resumeId,
        (draft) => ({ ...draft, contact }),
        state,
      );
    }

    case "update_resume_summary": {
      const resumeId = getResumeIdArg(args);
      const summary = getStringArg(args, "summary") ?? "";
      return updateResumeDraft(
        resumeId,
        (draft) => ({ ...draft, summary }),
        state,
      );
    }

    case "add_resume_experience":
      return addResumeExperience(args, state);

    case "delete_resume_experience":
      return deleteResumeExperience(args, state);

    case "add_resume_education":
      return addResumeEducation(args, state);

    case "delete_resume_education":
      return deleteResumeEducation(args, state);

    case "set_resume_skills":
      return setResumeSkills(args, state);

    case "delete_resume_draft":
      return deleteResumeDraft(args, state);

    case "list_resume_templates":
      return withoutSave(state, getResumeTemplates());

    case "render_resume_html":
      return withoutSave(state, renderMockResumeHtml(getArg(args, "resume")));

    case "analyze_resume_format":
      return withoutSave(state, analyzeMockResumeFormat(getArg(args, "resume")));

    case "analyze_resume_for_job":
      return withoutSave(
        state,
        analyzeMockResumeForJob(
          getArg(args, "resume"),
          getStringArg(args, "jobDescription") ?? "",
        ),
      );

    case "analyze_active_resume_for_job":
      return analyzeActiveResumeForJob(args, state);

    case "get_ats_power_words":
      return withoutSave(state, [...ATS_POWER_WORDS]);

    case "improve_bullet_point":
      return withoutSave(
        state,
        improveMockBulletPoint(args, extractMockAtsKeywords),
      );

    case "export_resume_docx":
      return withoutSave(state, [80, 75, 3, 4, 20, 0, 0, 0]);

    case "export_resume_html":
      return withoutSave(state, renderMockResumeHtml(getArg(args, "resume")));

    case "export_resume_text":
      return withoutSave(state, exportMockResumeText(getArg(args, "resume")));

    default:
      return {
        handled: false,
        shouldSave: false,
        state,
        value: undefined,
      };
  }
}

function getResumeTextPreview(
  args: Record<string, unknown> | undefined,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  const resumeId = getResumeIdArg(args);
  const selectedResume = state.resumes.find((resume) => resume.id === resumeId);
  if (!selectedResume) {
    throw new Error("Resume not found");
  }
  return withoutSave(state, toMockResumeTextPreview(selectedResume));
}

function setActiveResume(
  args: Record<string, unknown> | undefined,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  const resumeId = getResumeIdArg(args);
  if (
    typeof resumeId !== "number" ||
    !state.resumes.some((resume) => resume.id === resumeId)
  ) {
    throw new Error("Resume not found");
  }

  return withSave(
    {
      ...state,
      resumes: state.resumes.map((resume) => ({
        ...resume,
        is_active: resume.id === resumeId,
      })),
    },
    undefined,
  );
}

function createMockResume(
  name: string,
  filePath: string,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  const now = new Date().toISOString();
  const id = getNextId(state.resumes);
  const parsedText = [
    name,
    "Care coordinator supporting intake, scheduling, and case management.",
    "Skills: patient scheduling, community outreach, documentation.",
  ].join("\n");

  return withSave(
    {
      ...state,
      resumes: [
        ...state.resumes.map((resume) => ({ ...resume, is_active: false })),
        {
          id,
          name,
          file_path: filePath,
          parsed_text: parsedText,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ],
    },
    id,
  );
}

function deleteResume(
  args: Record<string, unknown> | undefined,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  const resumeId = getResumeIdArg(args);
  if (typeof resumeId !== "number") {
    return withoutSave(state, undefined);
  }

  const wasActive = state.resumes.some(
    (resume) => resume.id === resumeId && resume.is_active,
  );
  let resumes = state.resumes.filter((resume) => resume.id !== resumeId);
  if (wasActive && resumes.length > 0) {
    resumes = resumes.map((resume, index) => ({
      ...resume,
      is_active: index === 0,
    }));
  }

  return withSave(
    {
      ...state,
      resumes,
      userSkills: state.userSkills.filter(
        (skill) => skill.resume_id !== resumeId,
      ),
      recentMatches: state.recentMatches.filter(
        (match) => match.resume_id !== resumeId,
      ),
    },
    undefined,
  );
}

function addUserSkill(
  args: Record<string, unknown> | undefined,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  const resumeId = getResumeIdArg(args);
  const skill = normalizeSkillInput(getArg(args, "skill"));
  const skillName = trimmedStringOrNull(skill.skill_name);
  if (typeof resumeId !== "number" || !skillName) {
    return withoutSave(state, undefined);
  }

  const newSkill: MockUserSkill = {
    id: getNextId(state.userSkills),
    resume_id: resumeId,
    skill_name: skillName,
    skill_category: trimmedStringOrNull(skill.skill_category),
    confidence_score: 1,
    years_experience: skillYearsOrNull(skill.years_experience),
    proficiency_level: trimmedStringOrNull(skill.proficiency_level),
    source: "manual",
  };

  return withSave(
    { ...state, userSkills: [...state.userSkills, newSkill] },
    newSkill.id,
  );
}

function updateUserSkill(
  args: Record<string, unknown> | undefined,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  const skillId = getSkillIdArg(args);
  const updates = normalizeSkillInput(getArg(args, "updates"));
  if (
    typeof skillId !== "number" ||
    !state.userSkills.some((skill) => skill.id === skillId)
  ) {
    throw new Error("Skill not found");
  }

  return withSave(
    {
      ...state,
      userSkills: state.userSkills.map((skill) =>
        skill.id === skillId
          ? {
              ...skill,
              skill_name:
                trimmedStringOrNull(updates.skill_name) ?? skill.skill_name,
              skill_category: hasOwnInputKey(updates, "skill_category")
                ? trimmedStringOrNull(updates.skill_category)
                : skill.skill_category,
              proficiency_level: hasOwnInputKey(updates, "proficiency_level")
                ? trimmedStringOrNull(updates.proficiency_level)
                : skill.proficiency_level,
              years_experience: hasOwnInputKey(updates, "years_experience")
                ? skillYearsOrNull(updates.years_experience)
                : skill.years_experience,
              source: "manual",
            }
          : skill,
      ),
    },
    undefined,
  );
}

function matchResumeToJob(
  args: Record<string, unknown> | undefined,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  const resumeId = getResumeIdArg(args);
  const jobHash = getStringArg(args, "jobHash") ?? getStringArg(args, "job_hash");
  const job = state.jobs.find((item) => item.hash === jobHash);
  if (typeof resumeId !== "number" || !jobHash || !job) {
    return withoutSave(state, undefined);
  }

  const skills = state.userSkills
    .filter((skill) => skill.resume_id === resumeId)
    .map((skill) => skill.skill_name);
  const matchScore = toScoreFraction(job.score);
  const match: MockMatchResult = {
    id: getNextId(state.recentMatches),
    resume_id: resumeId,
    job_hash: jobHash,
    job_title: job.title,
    company: job.company,
    overall_match_score: matchScore,
    skills_match_score: matchScore,
    experience_match_score: Math.max(0, Number((matchScore - 0.05).toFixed(2))),
    education_match_score: null,
    matching_skills: skills.slice(0, 3),
    missing_skills: ["Role-specific evidence"],
    gap_analysis: "Matching: Existing skills align\nMissing: Add one role-specific example",
    created_at: new Date().toISOString(),
  };

  return withSave(
    {
      ...state,
      recentMatches: [
        match,
        ...state.recentMatches.filter((item) => item.job_hash !== jobHash),
      ],
    },
    match,
  );
}

function createMockResumeDraft(
  state: MockResumeCommandState,
): MockResumeCommandResult {
  const now = new Date().toISOString();
  const id = getNextId(state.resumeDrafts);

  return withSave(
    {
      ...state,
      resumeDrafts: [
        ...state.resumeDrafts,
        {
          id,
          contact: getEmptyBuilderContact(),
          summary: "",
          experience: [],
          education: [],
          skills: [],
          certifications: [],
          projects: [],
          created_at: now,
          updated_at: now,
        },
      ],
    },
    id,
  );
}

function getResumeDraft(
  args: Record<string, unknown> | undefined,
  state: MockResumeCommandState,
): MockResumeDraft | undefined {
  const resumeId = getResumeIdArg(args);
  return state.resumeDrafts.find((draft) => draft.id === resumeId);
}

function updateResumeDraft(
  resumeId: number | undefined,
  updater: (draft: MockResumeDraft) => MockResumeDraft,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  if (typeof resumeId !== "number") throw new Error("Resume draft not found");

  const found = state.resumeDrafts.some((draft) => draft.id === resumeId);
  if (!found) throw new Error("Resume draft not found");

  return withSave(
    {
      ...state,
      resumeDrafts: state.resumeDrafts.map((draft) =>
        draft.id === resumeId
          ? updater({ ...draft, updated_at: new Date().toISOString() })
          : draft,
      ),
    },
    undefined,
  );
}

function addResumeExperience(
  args: Record<string, unknown> | undefined,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  const resumeId = getResumeIdArg(args);
  const draft = getResumeDraft(args, state);
  const newId = getNextId(draft?.experience ?? []);
  const experience = normalizeBuilderExperience(getArg(args, "experience"), newId);
  const result = updateResumeDraft(
    resumeId,
    (current) => ({
      ...current,
      experience: [...current.experience, { ...experience, id: newId }],
    }),
    state,
  );
  return { ...result, value: newId };
}

function deleteResumeExperience(
  args: Record<string, unknown> | undefined,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  const resumeId = getResumeIdArg(args);
  const experienceId =
    getNumericArg(args, "experienceId") ?? getNumericArg(args, "experience_id");
  const draft = getResumeDraft(args, state);
  if (!draft || !draft.experience.some((experience) => experience.id === experienceId)) {
    throw new Error("Experience entry not found");
  }
  return updateResumeDraft(
    resumeId,
    (draft) => ({
      ...draft,
      experience: draft.experience.filter(
        (experience) => experience.id !== experienceId,
      ),
    }),
    state,
  );
}

function addResumeEducation(
  args: Record<string, unknown> | undefined,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  const resumeId = getResumeIdArg(args);
  const draft = getResumeDraft(args, state);
  const newId = getNextId(draft?.education ?? []);
  const education = normalizeBuilderEducation(getArg(args, "education"), newId);
  const result = updateResumeDraft(
    resumeId,
    (current) => ({
      ...current,
      education: [...current.education, { ...education, id: newId }],
    }),
    state,
  );
  return { ...result, value: newId };
}

function deleteResumeEducation(
  args: Record<string, unknown> | undefined,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  const resumeId = getResumeIdArg(args);
  const educationId =
    getNumericArg(args, "educationId") ?? getNumericArg(args, "education_id");
  const draft = getResumeDraft(args, state);
  if (!draft || !draft.education.some((education) => education.id === educationId)) {
    throw new Error("Education entry not found");
  }
  return updateResumeDraft(
    resumeId,
    (draft) => ({
      ...draft,
      education: draft.education.filter((education) => education.id !== educationId),
    }),
    state,
  );
}

function setResumeSkills(
  args: Record<string, unknown> | undefined,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  const resumeId = getResumeIdArg(args);
  const rawSkills = getArg(args, "skills");
  const skills = Array.isArray(rawSkills)
    ? rawSkills
        .map(normalizeBuilderSkill)
        .filter((skill): skill is MockBuilderSkill => !!skill)
    : [];
  return updateResumeDraft(
    resumeId,
    (draft) => ({ ...draft, skills }),
    state,
  );
}

function deleteResumeDraft(
  args: Record<string, unknown> | undefined,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  const resumeId = getResumeIdArg(args);
  if (
    typeof resumeId !== "number" ||
    !state.resumeDrafts.some((draft) => draft.id === resumeId)
  ) {
    throw new Error("Resume draft not found");
  }

  return withSave(
    {
      ...state,
      resumeDrafts: state.resumeDrafts.filter((draft) => draft.id !== resumeId),
    },
    undefined,
  );
}

function analyzeActiveResumeForJob(
  args: Record<string, unknown> | undefined,
  state: MockResumeCommandState,
): MockResumeCommandResult {
  const activeResume = getMockActiveResume(state.resumes);
  if (!activeResume) {
    throw new Error("Choose or add a resume before reviewing job fit.");
  }

  const readableText = (activeResume.parsed_text ?? "").trim();
  if (!readableText) {
    throw new Error("JobSentinel could not find readable text in the active resume.");
  }

  return withoutSave(
    state,
    analyzeMockResumeForJob(
      {
        summary: readableText,
        experience: [],
        skills: [],
        education: [],
        certifications: [],
        projects: [],
        custom_sections: {},
      },
      getStringArg(args, "jobDescription") ?? "",
    ),
  );
}

function withoutSave(
  state: MockResumeCommandState,
  value: unknown,
): MockResumeCommandResult {
  return {
    handled: true,
    shouldSave: false,
    state,
    value,
  };
}

function withSave(
  state: MockResumeCommandState,
  value: unknown,
): MockResumeCommandResult {
  return {
    handled: true,
    shouldSave: true,
    state,
    value,
  };
}
