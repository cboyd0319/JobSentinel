import { test, expect, Page } from "@playwright/test";
import { ResumePage } from "./page-objects/ResumePage";

const MOCK_STATE_KEY = "jobsentinel.mockState.v1";

interface SeedResume {
  id: number;
  name: string;
  file_path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SeedSkill {
  id: number;
  resume_id: number;
  skill_name: string;
  skill_category: string | null;
  confidence_score: number;
  years_experience: number | null;
  proficiency_level: string | null;
  source: string;
}

interface SeedMatch {
  id: number;
  resume_id: number;
  job_hash: string;
  job_title: string;
  company: string;
  overall_match_score: number;
  skills_match_score: number | null;
  experience_match_score: number | null;
  education_match_score: number | null;
  matching_skills: string[];
  missing_skills: string[];
  gap_analysis: string | null;
  created_at: string;
}

interface ResumeSeedState {
  resumes: SeedResume[];
  userSkills: SeedSkill[];
  recentMatches: SeedMatch[];
}

const activeResume: SeedResume = {
  id: 101,
  name: "community-program-resume.pdf",
  file_path: "/tmp/community-program-resume.pdf",
  is_active: true,
  created_at: "2026-05-18T16:00:00.000Z",
  updated_at: "2026-05-18T16:00:00.000Z",
};

const archivedResume: SeedResume = {
  id: 202,
  name: "marketing-resume.pdf",
  file_path: "/tmp/marketing-resume.pdf",
  is_active: false,
  created_at: "2026-05-17T16:00:00.000Z",
  updated_at: "2026-05-17T16:00:00.000Z",
};

const seededSkills: SeedSkill[] = [
  {
    id: 1,
    resume_id: activeResume.id,
    skill_name: "Community Outreach",
    skill_category: "Work Skills",
    confidence_score: 0.95,
    years_experience: 5,
    proficiency_level: "Expert",
    source: "resume",
  },
  {
    id: 2,
    resume_id: activeResume.id,
    skill_name: "Client Intake",
    skill_category: "Customer or Patient Support",
    confidence_score: 0.9,
    years_experience: 4,
    proficiency_level: "Advanced",
    source: "resume",
  },
  {
    id: 3,
    resume_id: activeResume.id,
    skill_name: "Spreadsheet Reporting",
    skill_category: "Tools and Systems",
    confidence_score: 0.72,
    years_experience: 3,
    proficiency_level: "Intermediate",
    source: "manual",
  },
];

const seededMatches: SeedMatch[] = [
  {
    id: 50,
    resume_id: activeResume.id,
    job_hash: "job-hash-2",
    job_title: "Community Program Coordinator",
    company: "Neighborhood Health Center",
    overall_match_score: 0.86,
    skills_match_score: 0.88,
    experience_match_score: 0.82,
    education_match_score: 0.74,
    matching_skills: ["Community Outreach", "Client Intake"],
    missing_skills: ["Volunteer Scheduling"],
    gap_analysis: "Outreach and intake experience match\nAdd volunteer scheduling examples",
    created_at: "2026-05-19T16:00:00.000Z",
  },
];

function buildResumeState(
  overrides: Partial<ResumeSeedState> = {},
): ResumeSeedState {
  return {
    resumes: [activeResume, archivedResume],
    userSkills: seededSkills,
    recentMatches: seededMatches,
    ...overrides,
  };
}

async function seedResumeState(
  page: Page,
  overrides: Partial<ResumeSeedState> = {},
) {
  const state = buildResumeState(overrides);
  await page.addInitScript(
    ({ key, value }) => {
      if (window.sessionStorage.getItem("resume-e2e-seeded")) return;
      window.localStorage.setItem(key, JSON.stringify(value));
      window.sessionStorage.setItem("resume-e2e-seeded", "true");
    },
    { key: MOCK_STATE_KEY, value: state },
  );
}

test.describe("Resume Upload and Matching", () => {
  let resumePage: ResumePage;

  test.beforeEach(async ({ page }) => {
    resumePage = new ResumePage(page);
  });

  test("shows no-resume state and native import actions", async ({ page }) => {
    await seedResumeState(page, {
      resumes: [],
      userSkills: [],
      recentMatches: [],
    });

    await resumePage.navigateTo();

    await expect(resumePage.emptyState).toBeVisible();
    await expect(resumePage.uploadResumeButton).toBeVisible();
    await expect(resumePage.importJsonButton).toBeVisible();
    await expect(page.getByText("Upload your resume to review skills")).toBeVisible();
  });

  test("renders active resume, extracted skills, and recent matches @smoke", async ({ page }) => {
    await seedResumeState(page);

    await resumePage.navigateTo();

    await expect(resumePage.activeResumeHeading).toBeVisible();
    await expect(page.getByText(activeResume.name)).toBeVisible();
    await expect(page.getByText("Saved Skills (3)")).toBeVisible();
    await expect(page.getByText("Community Outreach", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Client Intake", { exact: true }).first()).toBeVisible();
    await expect(resumePage.recentMatchesHeading).toBeVisible();
    await expect(page.getByRole("heading", { name: "Community Program Coordinator" })).toBeVisible();
    await expect(page.getByText("Skills found in both (2)")).toBeVisible();
    await expect(page.getByText("Skills to review (1)")).toBeVisible();
    await expect(page.getByText("Add volunteer scheduling examples")).toBeVisible();
  });

  test("adds a manual skill and persists it after reload", async ({ page }) => {
    await seedResumeState(page);

    await resumePage.navigateTo();
    await resumePage.openAddSkillForm();
    await resumePage.fillSkillForm({
      name: "Grant Reporting",
      proficiency: "Regular use",
      category: "Tools and Systems",
      years: "2",
    });
    await resumePage.saveNewSkill();

    await expect(page.getByText("Grant Reporting", { exact: true }).first()).toBeVisible();
    await page.reload();
    await resumePage.navigateTo();
    await expect(page.getByText("Grant Reporting", { exact: true }).first()).toBeVisible();
  });

  test("opens the add-skill form from empty extracted-skills state", async ({ page }) => {
    await seedResumeState(page, {
      userSkills: [],
      recentMatches: [],
    });

    await resumePage.navigateTo();
    await expect(page.getByText("No skills saved yet")).toBeVisible();

    await resumePage.openEmptyStateAddSkillForm();
    await resumePage.fillSkillForm({
      name: "Appointment Scheduling",
      proficiency: "Some practice",
      category: "Operations and Administration",
    });
    await resumePage.saveNewSkill();

    await expect(page.getByText("Appointment Scheduling", { exact: true }).first()).toBeVisible();
  });

  test("edits and deletes a skill", async ({ page }) => {
    await seedResumeState(page);

    await resumePage.navigateTo();
    await resumePage.editSkill("Spreadsheet Reporting", "Budget Tracking", "Regular use");

    await expect(page.getByText("Budget Tracking", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Spreadsheet Reporting", { exact: true })).not.toBeVisible();

    await resumePage.deleteSkill("Budget Tracking");

    await expect(page.getByText("Budget Tracking", { exact: true })).not.toBeVisible();
  });

  test("filters skills by category", async ({ page }) => {
    await seedResumeState(page);

    await resumePage.navigateTo();
    await resumePage.categoryFilter.selectOption("Work Skills");

    await expect(page.getByText("Community Outreach", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Spreadsheet Reporting", { exact: true })).not.toBeVisible();
  });

  test("switches active resume from the library", async ({ page }) => {
    await seedResumeState(page, {
      userSkills: [
        ...seededSkills,
        {
          id: 4,
          resume_id: archivedResume.id,
          skill_name: "Lifecycle Marketing",
          skill_category: "Work Skills",
          confidence_score: 0.81,
          years_experience: 6,
          proficiency_level: "Advanced",
          source: "resume",
        },
      ],
      recentMatches: [],
    });

    await resumePage.navigateTo();
    await resumePage.openLibrary();
    await resumePage.activateResume(archivedResume.name);

    await expect(page.getByText(archivedResume.name)).toBeVisible();
    await expect(page.getByText("Lifecycle Marketing", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Community Outreach", { exact: true })).not.toBeVisible();
  });

  test("deletes an inactive resume from the library", async ({ page }) => {
    await seedResumeState(page);

    await resumePage.navigateTo();
    await resumePage.openLibrary();
    await resumePage.deleteLibraryResume(archivedResume.name);

    await expect(page.getByText(archivedResume.name)).not.toBeVisible();
    await expect(resumePage.libraryButton).not.toBeVisible();
  });
});
