import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page object for Resume Builder wizard
 */
export class ResumeBuilderPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateTo() {
    await this.goto("/resume-builder");
    await this.skipSetupWizard();
  }

  // Step navigation
  get stepIndicator(): Locator {
    return this.page.locator("[data-testid='step-indicator'], [class*='step']");
  }

  get nextButton(): Locator {
    return this.page.locator("button:has-text('Next'), button:has-text('Continue')");
  }

  get backButton(): Locator {
    return this.page.locator("button:has-text('Back'), button:has-text('Previous')");
  }

  get saveButton(): Locator {
    return this.page.locator("button:has-text('Save')");
  }

  // Step 1: Contact Info
  get nameInput(): Locator {
    return this.page.locator("input[name='name'], input[placeholder*='name' i]");
  }

  get emailInput(): Locator {
    return this.page.locator("input[name='email'], input[type='email']");
  }

  get phoneInput(): Locator {
    return this.page.locator("input[name='phone'], input[placeholder*='phone' i]");
  }

  get linkedinInput(): Locator {
    return this.page.locator("input[name='linkedin'], input[placeholder*='linkedin' i]");
  }

  get githubInput(): Locator {
    return this.page.locator("input[name='github'], input[placeholder*='github' i]");
  }

  get locationInput(): Locator {
    return this.page.locator("input[name='location'], input[placeholder*='location' i]");
  }

  // Step 2: Summary
  get summaryTextarea(): Locator {
    return this.page.locator(
      "textarea[name='summary'], textarea[placeholder*='summary' i]"
    );
  }

  // Step 3: Experience
  get addExperienceButton(): Locator {
    return this.page.locator("button:has-text('Add Experience')");
  }

  get experienceTitle(): Locator {
    return this.page.locator("input[name='title'], input[placeholder*='title' i]").first();
  }

  get experienceCompany(): Locator {
    return this.page.locator("input[name='company'], input[placeholder*='company' i]").first();
  }

  get experienceStartDate(): Locator {
    return this.page.locator(
      "input[name='start_date'], input[name='startDate'], input[placeholder*='start' i]"
    ).first();
  }

  get experienceEndDate(): Locator {
    return this.page.locator(
      "input[name='end_date'], input[name='endDate'], input[placeholder*='end' i]"
    ).first();
  }

  get experienceList(): Locator {
    return this.page.locator("[data-testid='experience-item'], [class*='experience-card']");
  }

  // Step 4: Education
  get addEducationButton(): Locator {
    return this.page.locator("button:has-text('Add Education')");
  }

  get educationDegree(): Locator {
    return this.page.locator("input[name='degree'], input[placeholder*='degree' i]").first();
  }

  get educationInstitution(): Locator {
    return this.page.locator(
      "input[name='institution'], input[placeholder*='institution' i], input[placeholder*='school' i]"
    ).first();
  }

  get educationGradDate(): Locator {
    return this.page.locator(
      "input[name='graduation_date'], input[name='graduationDate']"
    ).first();
  }

  get educationList(): Locator {
    return this.page.locator("[data-testid='education-item'], [class*='education-card']");
  }

  // Step 5: Skills
  get addSkillButton(): Locator {
    return this.page.locator("button:has-text('Add Skill')");
  }

  get skillNameInput(): Locator {
    return this.page.locator(
      "input[name='skill'], input[name='skillName'], input[placeholder*='skill' i]"
    ).first();
  }

  get skillCategorySelect(): Locator {
    return this.page.locator(
      "select[name='category'], [data-testid='skill-category']"
    ).first();
  }

  get skillProficiencySelect(): Locator {
    return this.page.locator(
      "select[name='proficiency'], [data-testid='skill-proficiency']"
    ).first();
  }

  get skillsList(): Locator {
    return this.page.locator("[data-testid='skill-item'], [class*='skill-tag']");
  }

  get importSkillsButton(): Locator {
    return this.page.locator("button:has-text('Import'), button:has-text('Load from Resume')");
  }

  // Step 6: Preview
  get templateGrid(): Locator {
    return this.page.locator("[data-testid='template-grid'], [class*='template']");
  }

  get templateCard(): Locator {
    return this.page.locator(
      "[data-testid='template-card'], [class*='template-card']"
    );
  }

  get previewPane(): Locator {
    return this.page.locator("[data-testid='resume-preview'], [class*='preview']");
  }

  get atsScorePanel(): Locator {
    return this.page.locator("[data-testid='ats-score'], [class*='ats-score']");
  }

  // Step 7: Export
  get exportPdfButton(): Locator {
    return this.page.locator("button:has-text('Export PDF'), button:has-text('Download PDF')");
  }

  get exportDocxButton(): Locator {
    return this.page.locator("button:has-text('Export DOCX'), button:has-text('Download DOCX')");
  }

  // Actions
  async getCurrentStep(): Promise<number> {
    try {
      const activeStep = this.stepIndicator.locator("[class*='active'], [aria-current='step']");
      const text = await activeStep.textContent();
      const match = text?.match(/\d+/);
      return match ? parseInt(match[0]) : 1;
    } catch {
      return 1;
    }
  }

  async goToNextStep() {
    await this.nextButton.click();
    await this.waitForReady();
  }

  async goToPreviousStep() {
    await this.backButton.click();
    await this.waitForReady();
  }

  async fillContactInfo(data: {
    name: string;
    email: string;
    phone?: string;
    linkedin?: string;
    github?: string;
    location?: string;
  }) {
    await this.nameInput.fill(data.name);
    await this.emailInput.fill(data.email);

    if (data.phone && (await this.phoneInput.isVisible().catch(() => false))) {
      await this.phoneInput.fill(data.phone);
    }
    if (data.linkedin && (await this.linkedinInput.isVisible().catch(() => false))) {
      await this.linkedinInput.fill(data.linkedin);
    }
    if (data.github && (await this.githubInput.isVisible().catch(() => false))) {
      await this.githubInput.fill(data.github);
    }
    if (data.location && (await this.locationInput.isVisible().catch(() => false))) {
      await this.locationInput.fill(data.location);
    }
  }

  async fillSummary(text: string) {
    await this.summaryTextarea.fill(text);
  }

  async addExperience(data: {
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
  }) {
    await this.addExperienceButton.click();
    await this.page.waitForTimeout(300);

    await this.experienceTitle.fill(data.title);
    await this.experienceCompany.fill(data.company);
    await this.experienceStartDate.fill(data.startDate);

    if (data.endDate && (await this.experienceEndDate.isVisible().catch(() => false))) {
      await this.experienceEndDate.fill(data.endDate);
    }

    // Save experience (usually a modal with Save button)
    const saveBtn = this.page.locator("button:has-text('Save'), button:has-text('Add')");
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  async getExperienceCount(): Promise<number> {
    return await this.experienceList.count();
  }

  async addEducation(data: {
    degree: string;
    institution: string;
    graduationDate?: string;
  }) {
    await this.addEducationButton.click();
    await this.page.waitForTimeout(300);

    await this.educationDegree.fill(data.degree);
    await this.educationInstitution.fill(data.institution);

    if (data.graduationDate && (await this.educationGradDate.isVisible().catch(() => false))) {
      await this.educationGradDate.fill(data.graduationDate);
    }

    // Save education
    const saveBtn = this.page.locator("button:has-text('Save'), button:has-text('Add')");
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  async getEducationCount(): Promise<number> {
    return await this.educationList.count();
  }

  async addSkill(data: {
    name: string;
    category?: string;
    proficiency?: string;
  }) {
    await this.addSkillButton.click();
    await this.page.waitForTimeout(300);

    await this.skillNameInput.fill(data.name);

    if (data.category && (await this.skillCategorySelect.isVisible().catch(() => false))) {
      await this.skillCategorySelect.selectOption(data.category);
    }

    if (data.proficiency && (await this.skillProficiencySelect.isVisible().catch(() => false))) {
      await this.skillProficiencySelect.selectOption(data.proficiency);
    }

    // Save skill
    const saveBtn = this.page.locator("button:has-text('Save'), button:has-text('Add')");
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  async getSkillsCount(): Promise<number> {
    return await this.skillsList.count();
  }

  async selectTemplate(templateName: string) {
    const template = this.templateCard.filter({ hasText: templateName }).first();
    if (await template.isVisible().catch(() => false)) {
      await template.click();
      await this.page.waitForTimeout(500);
    }
  }

  async waitForPreview(timeout: number = 5000): Promise<boolean> {
    try {
      await this.previewPane.waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }

  async getAtsScore(): Promise<number | null> {
    try {
      const text = await this.atsScorePanel.textContent();
      const match = text?.match(/(\d+)%?/);
      return match ? parseInt(match[1]) : null;
    } catch {
      return null;
    }
  }

  async exportPdf(): Promise<boolean> {
    try {
      const downloadPromise = this.page.waitForEvent("download", { timeout: 10000 });
      await this.exportPdfButton.click();
      await downloadPromise;
      return true;
    } catch {
      return false;
    }
  }

  async exportDocx(): Promise<boolean> {
    try {
      const downloadPromise = this.page.waitForEvent("download", { timeout: 10000 });
      await this.exportDocxButton.click();
      await downloadPromise;
      return true;
    } catch {
      return false;
    }
  }
}
