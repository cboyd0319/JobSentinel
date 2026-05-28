import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "./BasePage";

interface ContactData {
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  location?: string;
  website?: string;
}

interface ExperienceData {
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  location?: string;
  achievements?: string[];
}

interface EducationData {
  degree: string;
  institution: string;
  graduationDate?: string;
  gpa?: string;
  location?: string;
  honors?: string[];
}

interface SkillData {
  name: string;
  category: string;
  proficiency?: "beginner" | "intermediate" | "advanced" | "expert";
}

export class ResumeBuilderPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateTo(): Promise<void> {
    await this.goto("/");
    await this.skipSetupWizard();
    await this.navigateToPage("Resume Builder");
    await expect(this.heading).toBeVisible({ timeout: 15000 });
    await this.expectStep(1, "Contact");
  }

  get heading(): Locator {
    return this.page.getByRole("heading", { name: "Resume Builder" });
  }

  get stepText(): Locator {
    return this.page.getByText(/^Step \d+ of 7:/);
  }

  get nextButton(): Locator {
    return this.page.getByRole("button", { name: "Next" });
  }

  get previousButton(): Locator {
    return this.page.getByRole("button", { name: "Previous" });
  }

  get fullNameInput(): Locator {
    return this.page.getByPlaceholder("John Doe");
  }

  get emailInput(): Locator {
    return this.page.getByPlaceholder("john@example.com");
  }

  get phoneInput(): Locator {
    return this.page.getByPlaceholder("(555) 123-4567");
  }

  get locationInput(): Locator {
    return this.page.getByPlaceholder("San Francisco, CA").first();
  }

  get linkedinInput(): Locator {
    return this.page.getByPlaceholder("linkedin.com/in/johndoe");
  }

  get githubInput(): Locator {
    return this.page.getByPlaceholder("github.com/johndoe");
  }

  get websiteInput(): Locator {
    return this.page.getByPlaceholder("https://johndoe.com");
  }

  get summaryTextarea(): Locator {
    return this.page.getByLabel("Professional Summary");
  }

  get importSkillsButton(): Locator {
    return this.page.getByRole("button", { name: "Import from Resume" });
  }

  get exportPdfButton(): Locator {
    return this.page.getByRole("button", { name: "Download PDF" });
  }

  get exportDocxButton(): Locator {
    return this.page.getByRole("button", { name: "Download DOCX" });
  }

  async expectStep(step: number, name: string): Promise<void> {
    await expect(this.stepText).toContainText(`Step ${step} of 7: ${name}`);
  }

  async goNext(step?: number, name?: string): Promise<void> {
    await this.nextButton.focus();
    await this.page.keyboard.press("Enter");
    await this.waitForReady();
    if (step && name) {
      await this.expectStep(step, name);
    }
  }

  async goPrevious(step: number, name: string): Promise<void> {
    await this.previousButton.focus();
    await this.page.keyboard.press("Enter");
    await this.waitForReady();
    await this.expectStep(step, name);
  }

  async fillContactInfo(data: ContactData): Promise<void> {
    await this.fullNameInput.fill(data.name);
    await this.emailInput.fill(data.email);
    if (data.phone) await this.phoneInput.fill(data.phone);
    if (data.location) await this.locationInput.fill(data.location);
    if (data.linkedin) await this.linkedinInput.fill(data.linkedin);
    if (data.github) await this.githubInput.fill(data.github);
    if (data.website) await this.websiteInput.fill(data.website);
  }

  async completeContact(data?: Partial<ContactData>): Promise<void> {
    await this.fillContactInfo({
      name: "Jane Smith",
      email: "jane.smith@example.com",
      phone: "+1-555-987-6543",
      location: "New York, NY",
      linkedin: "linkedin.com/in/janesmith",
      github: "github.com/janesmith",
      website: "https://janesmith.dev",
      ...data,
    });
    await this.goNext(2, "Summary");
  }

  async fillSummary(text: string): Promise<void> {
    await this.summaryTextarea.fill(text);
  }

  async completeSummary(text = "Customer success manager with deep onboarding, renewal, and customer experience results."): Promise<void> {
    await this.fillSummary(text);
    await this.goNext(3, "Experience");
  }

  async addExperience(data: ExperienceData): Promise<void> {
    await this.page.getByRole("button", { name: "+ Add Experience" }).click();
    const dialog = this.page.getByRole("dialog", { name: "Add Work Experience" });
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder("Marketing Manager").fill(data.title);
    await dialog.getByPlaceholder("Acme Corp").fill(data.company);
    await dialog.getByPlaceholder("Jan 2020").fill(data.startDate);
    if (data.endDate) await dialog.getByPlaceholder("Present").fill(data.endDate);
    if (data.location) await dialog.getByPlaceholder("San Francisco, CA").fill(data.location);
    if (data.achievements) {
      await dialog
        .getByPlaceholder("Improved renewal rate by 18%")
        .fill(data.achievements.join("\n"));
    }

    await dialog.getByRole("button", { name: "Add Experience" }).click();
    await expect(dialog).toBeHidden();
  }

  async completeExperience(data?: Partial<ExperienceData>): Promise<void> {
    const experience = {
      title: "Customer Success Manager",
      company: "Acme Corp",
      startDate: "Jan 2020",
      endDate: "Present",
      location: "Remote",
      achievements: ["Improved renewal rate by 18%", "Built onboarding checklist for new customers"],
      ...data,
    };
    await this.addExperience(experience);
    await this.goNext(4, "Education");
  }

  async addEducation(data: EducationData): Promise<void> {
    await this.page.getByRole("button", { name: "+ Add Education" }).click();
    const dialog = this.page.getByRole("dialog", { name: "Add Education" });
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder("B.A. Business Administration").fill(data.degree);
    await dialog.getByPlaceholder("Stanford University").fill(data.institution);
    if (data.graduationDate) await dialog.getByPlaceholder("May 2020").fill(data.graduationDate);
    if (data.gpa) await dialog.getByPlaceholder("3.8").fill(data.gpa);
    if (data.location) await dialog.getByPlaceholder("Stanford, CA").fill(data.location);
    if (data.honors) {
      await dialog.getByPlaceholder("Dean's List").fill(data.honors.join("\n"));
    }

    await dialog.getByRole("button", { name: "Add Education" }).click();
    await expect(dialog).toBeHidden();
  }

  async completeEducation(data?: Partial<EducationData>): Promise<void> {
    await this.addEducation({
      degree: "B.A. Business Administration",
      institution: "State University",
      graduationDate: "May 2020",
      gpa: "3.8",
      location: "New York, NY",
      honors: ["Dean's List"],
      ...data,
    });
    await this.goNext(5, "Skills");
  }

  async addSkill(data: SkillData): Promise<void> {
    await this.page.getByPlaceholder("Project Management").fill(data.name);
    await this.page.getByPlaceholder("Operations").fill(data.category);
    if (data.proficiency) {
      await this.page.getByRole("combobox").selectOption(data.proficiency);
    }
    const addButton = this.page.getByRole("button", { name: "Add", exact: true });
    await addButton.focus();
    await this.page.keyboard.press("Enter");
  }

  async completeSkills(data?: Partial<SkillData>): Promise<void> {
    await this.addSkill({
      name: "Customer Success",
      category: "Customer Experience",
      proficiency: "advanced",
      ...data,
    });
    await this.goNext(6, "Preview");
  }

  async completeRequiredResume(): Promise<void> {
    await this.completeContact();
    await this.completeSummary();
    await this.completeExperience();
    await this.completeEducation();
    await this.completeSkills();
  }

  templateButton(name: string): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(`^Select ${name} template:`, "i"),
    });
  }

  async selectTemplate(name: string): Promise<void> {
    await this.templateButton(name).click();
    await expect(this.templateButton(name)).toHaveAttribute("aria-pressed", "true");
  }

  async downloadDocx(): Promise<void> {
    const downloadPromise = this.page.waitForEvent("download");
    await this.exportDocxButton.click();
    await downloadPromise;
  }
}
