import { expect, test } from "@playwright/test";
import { ResumeBuilderPage } from "./page-objects/ResumeBuilderPage";

const MOCK_STATE_KEY = "jobsentinel.mockState.v1";

async function seedUploadedResumeSkills(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript((mockStateKey) => {
    const now = "2026-05-20T12:00:00.000Z";
    window.localStorage.setItem(mockStateKey, JSON.stringify({
      resumes: [
        {
          id: 9001,
          name: "Seeded Resume.pdf",
          file_path: "/tmp/seeded-resume.pdf",
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ],
      userSkills: [
        {
          id: 1,
          resume_id: 9001,
          skill_name: "TypeScript",
          skill_category: "Frontend",
          confidence_score: 0.95,
          years_experience: 6,
          proficiency_level: "advanced",
          source: "parser",
        },
        {
          id: 2,
          resume_id: 9001,
          skill_name: "Rust",
          skill_category: "Systems",
          confidence_score: 0.88,
          years_experience: 2,
          proficiency_level: "intermediate",
          source: "parser",
        },
      ],
    }));
  }, MOCK_STATE_KEY);
}

test.describe("Resume Builder Wizard", () => {
  let resumeBuilder: ResumeBuilderPage;

  test.beforeEach(async ({ page }) => {
    resumeBuilder = new ResumeBuilderPage(page);
  });

  test("loads the builder at contact step", async () => {
    await resumeBuilder.navigateTo();

    await expect(resumeBuilder.heading).toBeVisible();
    await resumeBuilder.expectStep(1, "Contact");
    await expect(resumeBuilder.previousButton).toBeDisabled();
    await expect(resumeBuilder.fullNameInput).toBeVisible();
    await expect(resumeBuilder.emailInput).toBeVisible();
    await expect(resumeBuilder.phoneInput).toBeVisible();
  });

  test("blocks contact step until required fields are entered", async ({ page }) => {
    await resumeBuilder.navigateTo();

    await resumeBuilder.goNext();

    await expect(page.getByRole("alert").filter({ hasText: "Missing information" })).toBeVisible();
    await expect(page.getByText("Please enter your name")).toBeVisible();
    await resumeBuilder.expectStep(1, "Contact");
  });

  test("saves contact details and returns with values intact", async () => {
    await resumeBuilder.navigateTo();

    await resumeBuilder.completeContact({
      name: "Jordan Lee",
      email: "jordan@example.com",
      phone: "+1-555-010-1000",
      location: "Denver, CO",
    });
    await expect(resumeBuilder.summaryTextarea).toBeVisible();

    await resumeBuilder.goPrevious(1, "Contact");
    await expect(resumeBuilder.fullNameInput).toHaveValue("Jordan Lee");
    await expect(resumeBuilder.emailInput).toHaveValue("jordan@example.com");
    await expect(resumeBuilder.phoneInput).toHaveValue("+1-555-010-1000");
    await expect(resumeBuilder.locationInput).toHaveValue("Denver, CO");
  });

  test("validates and saves professional summary", async ({ page }) => {
    await resumeBuilder.navigateTo();
    await resumeBuilder.completeContact();

    await resumeBuilder.goNext();
    await expect(page.getByRole("alert").filter({ hasText: "Missing information" })).toBeVisible();
    await expect(page.getByText("Please write a summary")).toBeVisible();
    await resumeBuilder.expectStep(2, "Summary");

    await resumeBuilder.completeSummary("Senior frontend engineer focused on accessible React and TypeScript product workflows.");
    await expect(page.getByRole("heading", { name: "Work Experience" })).toBeVisible();
    await expect(page.getByText("No work experience added yet")).toBeVisible();
  });

  test("adds work experience with achievements", async ({ page }) => {
    await resumeBuilder.navigateTo();
    await resumeBuilder.completeContact();
    await resumeBuilder.completeSummary();

    await resumeBuilder.addExperience({
      title: "Lead Frontend Engineer",
      company: "BrightByte",
      startDate: "Jan 2021",
      endDate: "Present",
      location: "Remote",
      achievements: ["Led design system migration", "Cut bundle size by 35%"],
    });

    await expect(page.getByText("Lead Frontend Engineer")).toBeVisible();
    await expect(page.getByText("BrightByte")).toBeVisible();
    await expect(page.getByText("Led design system migration")).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete experience" })).toBeVisible();
  });

  test("adds education and skills", async ({ page }) => {
    await resumeBuilder.navigateTo();
    await resumeBuilder.completeContact();
    await resumeBuilder.completeSummary();
    await resumeBuilder.completeExperience();

    await resumeBuilder.addEducation({
      degree: "B.S. Software Engineering",
      institution: "State University",
      graduationDate: "May 2020",
      gpa: "3.9",
      location: "Denver, CO",
      honors: ["Dean's List"],
    });
    await expect(page.getByText("B.S. Software Engineering")).toBeVisible();
    await expect(page.getByText("State University")).toBeVisible();

    await resumeBuilder.goNext(5, "Skills");
    await resumeBuilder.addSkill({
      name: "React",
      category: "Frontend",
      proficiency: "expert",
    });
    await expect(page.getByText("React")).toBeVisible();
    await expect(page.getByText("Frontend")).toBeVisible();
    await expect(page.getByText("expert", { exact: true }).last()).toBeVisible();
  });

  test("imports skills from active resume", async ({ page }) => {
    await seedUploadedResumeSkills(page);
    await resumeBuilder.navigateTo();
    await resumeBuilder.completeContact();
    await resumeBuilder.completeSummary();
    await resumeBuilder.completeExperience();
    await resumeBuilder.completeEducation();

    await resumeBuilder.importSkillsButton.click();

    await expect(page.getByText("Imported 2 skills")).toBeVisible();
    await expect(page.getByText("TypeScript")).toBeVisible();
    await expect(page.getByText("Rust")).toBeVisible();
  });

  test("previews, changes template, and exports DOCX", async ({ page }) => {
    await resumeBuilder.navigateTo();
    await resumeBuilder.completeRequiredResume();

    await expect(page.getByRole("heading", { name: "Choose Template" })).toBeVisible();
    await expect(resumeBuilder.templateButton("Modern Minimal")).toHaveAttribute("aria-pressed", "true");

    await resumeBuilder.selectTemplate("Technical Skills-First");
    await expect(page.getByText("ATS Format Score")).toBeVisible();
    await expect(page.getByText("Jane Smith").first()).toBeVisible();

    await resumeBuilder.goNext(7, "Export");
    await expect(page.getByRole("heading", { name: "Export Resume" })).toBeVisible();
    await expect(page.getByText("Your resume is ready!")).toBeVisible();
    await expect(resumeBuilder.exportPdfButton).toBeVisible();

    await resumeBuilder.downloadDocx();
    await expect(page.getByRole("alert").filter({ hasText: "Resume exported" })).toBeVisible();
  });
});
