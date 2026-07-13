import {
  addResumeEducation,
  addResumeExperience,
  addUserSkill,
  analyzeActiveResumeForJob,
  createMockResume,
  createMockResumeDraft,
  deleteResume,
  deleteResumeDraft,
  deleteResumeEducation,
  deleteResumeExperience,
  getMockActiveResume,
  getResumeDraft,
  getResumeTextPreview,
  matchResumeToJob,
  setActiveResume,
  setResumeSkills,
  updateResumeDraft,
  updateUserSkill,
  withSave,
  withoutSave,
} from "./resumeCommandHandlers";
import type {
  MockResumeCommandResult,
  MockResumeCommandState,
} from "./resumeCommandTypes";

export { getMockActiveResume } from "./resumeCommandHandlers";
import { ATS_POWER_WORDS } from "./resumeAnalysis";
import { improveMockBulletPoint } from "./resumeBulletPrompts";
import {
  analyzeMockResumeForJob,
  analyzeMockResumeFormat,
} from "./resumeAnalysisRunner";
import {
  exportMockResumeText,
  getResumeTemplates,
  normalizeBuilderContact,
  renderMockResumeHtml,
} from "./resumeBuilder";
import {
  getArg,
  getNumericArg,
  getResumeIdArg,
  getSkillIdArg,
  getStringArg,
} from "../../../mocks/handlers/commandHelpers";
import { extractMockAtsKeywords } from "./resumeKeywordMatching";
import { toMockResumeSummary } from "./resumeSummaryViews";

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
