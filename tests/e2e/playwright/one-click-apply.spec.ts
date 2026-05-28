import { test, expect } from "@playwright/test";
import { OneClickApplyPage } from "./page-objects/OneClickApplyPage";

const MOCK_STATE_KEY = "jobsentinel.mockState.v1";

test.describe("Application Assist Settings", () => {
  let applyPage: OneClickApplyPage;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key) => {
      if (window.sessionStorage.getItem("one-click-e2e-reset")) return;
      window.localStorage.removeItem(key);
      window.sessionStorage.setItem("one-click-e2e-reset", "true");
    }, MOCK_STATE_KEY);

    applyPage = new OneClickApplyPage(page);
    await applyPage.navigateTo();
  });

  test("loads settings stats, tabs, and human-review safety copy @smoke", async ({ page }) => {
    await expect(applyPage.statCard("Forms Reviewed")).toContainText("42");
    await expect(applyPage.statCard("Marked Submitted")).toContainText("38");
    await expect(applyPage.statCard("Needs Follow-Up")).toContainText("4");
    await expect(applyPage.statCard("Review Completion")).toContainText("90%");
    await expect(applyPage.profileTab).toBeVisible();
    await expect(applyPage.screeningTab).toBeVisible();
    await expect(page.getByRole("heading", { name: "How Application Assist Works" })).toBeVisible();
    await expect(page.getByText("Submit Yourself")).toBeVisible();
    await expect(page.getByText("JobSentinel never clicks Submit")).toBeVisible();
  });

  test("loads existing application profile into editable fields", async () => {
    await expect(applyPage.profileForm).toBeVisible();
    await expect(applyPage.fullNameInput).toHaveValue("John Doe");
    await expect(applyPage.emailInput).toHaveValue("john@example.com");
    await expect(applyPage.phoneInput).toHaveValue("+1 (555) 123-4567");
    await expect(applyPage.linkedInInput).toHaveValue("https://linkedin.com/in/johndoe");
    await expect(applyPage.githubInput).toHaveValue("https://github.com/johndoe");
    await expect(applyPage.portfolioInput).toHaveValue("https://johndoe.com");
    await expect(applyPage.websiteInput).toHaveValue("https://blog.johndoe.com");
    await expect(applyPage.maxApplicationsSelect).toHaveValue("10");
    await expect(applyPage.manualApprovalCheckbox).toBeChecked();
    await expect(applyPage.browseResumeButton).toBeVisible();
  });

  test("validates required profile fields before saving", async ({ page }) => {
    await applyPage.fillProfile({
      fullName: "",
      email: "not-an-email",
      phone: "123",
      linkedin: "notaurl",
    });

    await applyPage.saveProfileButton.click();

    await expect(page.getByText("Full name is required")).toBeVisible();
    await expect(page.getByText("Please enter a valid email address")).toBeVisible();
    await expect(page.getByText("Phone number must have 10-15 digits")).toBeVisible();
    await expect(page.getByText("Please enter a valid URL")).toBeVisible();
  });

  test("saves profile changes and persists them after reload", async ({ page }) => {
    await applyPage.fillProfile({
      fullName: "Casey Sentinel",
      email: "casey@example.com",
      phone: "+1 (555) 765-4321",
      linkedin: "https://linkedin.com/in/caseysentinel",
      github: "https://github.com/caseysentinel",
      portfolio: "https://casey.example.com",
      website: "https://blog.casey.example.com",
      maxApplications: "20",
    });

    await expect(applyPage.unsavedChangesIndicator).toBeVisible();
    await applyPage.saveProfileButton.click();
    await expect(page.getByText("Profile saved")).toBeVisible();
    await expect.poll(async () => page.evaluate((key) => {
      const rawState = window.localStorage.getItem(key);
      if (!rawState) return null;
      return JSON.parse(rawState).applicationProfile?.fullName ?? null;
    }, MOCK_STATE_KEY)).toBe("Casey Sentinel");

    await page.reload();
    await applyPage.navigateTo();

    await expect(applyPage.fullNameInput).toHaveValue("Casey Sentinel");
    await expect(applyPage.emailInput).toHaveValue("casey@example.com");
    await expect(applyPage.phoneInput).toHaveValue("+1 (555) 765-4321");
    await expect(applyPage.linkedInInput).toHaveValue("https://linkedin.com/in/caseysentinel");
    await expect(applyPage.githubInput).toHaveValue("https://github.com/caseysentinel");
    await expect(applyPage.portfolioInput).toHaveValue("https://casey.example.com");
    await expect(applyPage.websiteInput).toHaveValue("https://blog.casey.example.com");
    await expect(applyPage.maxApplicationsSelect).toHaveValue("20");
  });

  test("keeps manual approval enabled and final submission manual", async ({ page }) => {
    await expect(applyPage.manualApprovalCheckbox).toBeChecked();
    await expect(page.getByText("Review each application before JobSentinel prepares details")).toBeVisible();
    await expect(page.getByText("You review every field and decide whether to submit")).toBeVisible();
  });

  test("shows saved screening answers", async ({ page }) => {
    await applyPage.switchToScreeningQuestions();

    await expect(page.getByText("work authorized")).toBeVisible();
    await expect(page.getByText("Yes", { exact: true })).toBeVisible();
    await expect(page.getByText("92% confident")).toBeVisible();
    await expect(page.getByText(/Used 4/)).toBeVisible();
  });

  test("adds a screening answer from a common pattern and persists it", async ({ page }) => {
    await applyPage.switchToScreeningQuestions();
    await applyPage.openCommonScreeningAnswer("Years of experience");
    await applyPage.saveScreeningAnswer({ answer: "8 years" });

    await expect(page.getByText("Answer saved")).toBeVisible();
    await expect(page.getByText("years of experience", { exact: true })).toBeVisible();
    await expect(page.getByText("8 years")).toBeVisible();

    await page.reload();
    await applyPage.navigateTo();
    await applyPage.switchToScreeningQuestions();

    await expect(page.getByText("years of experience", { exact: true })).toBeVisible();
    await expect(page.getByText("8 years")).toBeVisible();
  });

  test("validates screening answer pattern and answer", async ({ page }) => {
    await applyPage.switchToScreeningQuestions();
    await applyPage.openBlankScreeningAnswer();
    await applyPage.saveAnswerButton.click();

    await expect(page.getByText("Question text is required")).toBeVisible();
    await expect(page.getByText("Answer is required")).toBeVisible();

    await applyPage.saveScreeningAnswer({
      pattern: "[",
      answer: "Yes",
    });

    await expect(page.getByText("Question match has unsupported pattern symbols")).toBeVisible();
  });

  test("edits an existing screening answer", async ({ page }) => {
    await applyPage.switchToScreeningQuestions();
    await applyPage.editAnswerButtons.first().click();
    await expect(applyPage.screeningAnswerDialog).toBeVisible();

    await applyPage.saveScreeningAnswer({ answer: "No" });

    await expect(page.getByText("Answer saved")).toBeVisible();
    await expect(page.getByText("work authorized")).toBeVisible();
    await expect(page.getByText("No", { exact: true })).toBeVisible();
    await expect(page.getByText("Yes", { exact: true })).not.toBeVisible();
  });
});
