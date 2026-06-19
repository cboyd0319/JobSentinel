import { expect, Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

const MOCK_STATE_KEY = "jobsentinel.mockState.v1";

/**
 * Job card interactions on the dashboard.
 */
export class JobDetailPage extends BasePage {
  private activeCardIndex = 0;
  private activeJobId: string | null = null;

  constructor(page: Page) {
    super(page);
  }

  async navigateTo() {
    await this.goto("/");
    await this.skipSetupWizard();
  }

  private get jobCards(): Locator {
    return this.page.locator("[data-testid='job-card']");
  }

  private get activeCard(): Locator {
    if (this.activeJobId) {
      const jobId = this.activeJobId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return this.page.locator(
        `[data-testid='job-card'][data-job-id="${jobId}"]`,
      );
    }

    return this.jobCards.nth(this.activeCardIndex);
  }

  get jobDetailPanel(): Locator {
    return this.activeCard;
  }

  get jobTitle(): Locator {
    return this.activeCard.locator("[data-testid='job-title']");
  }

  get companyName(): Locator {
    return this.activeCard.locator("[data-testid='job-company']");
  }

  get bookmarkButton(): Locator {
    return this.activeCard.locator("[data-testid='btn-bookmark']");
  }

  get addNoteButton(): Locator {
    return this.activeCard.locator("[data-testid='btn-notes']");
  }

  get noteTextarea(): Locator {
    return this.page.getByLabel("Job notes");
  }

  get saveNoteButton(): Locator {
    return this.page.getByRole("button", {
      name: /Save Notes|Remove Notes/,
    });
  }

  get matchScore(): Locator {
    return this.activeCard.getByLabel(/^Fit estimate:/);
  }

  async openJobDetail(index: number = 0) {
    this.activeCardIndex = index;
    this.activeJobId = null;

    const candidate = this.jobCards.nth(index);
    await expect(candidate).toBeVisible({ timeout: 5000 });
    this.activeJobId = await candidate.getAttribute("data-job-id");

    await expect(this.activeCard).toBeVisible({ timeout: 5000 });
    await this.activeCard.scrollIntoViewIfNeeded();
  }

  async openJobDetailByTitle(titlePattern: RegExp) {
    await expect(this.jobCards.first()).toBeVisible({ timeout: 15000 });
    const count = await this.jobCards.count();

    for (let index = 0; index < count; index += 1) {
      const cardTitle = await this.jobCards
        .nth(index)
        .locator("[data-testid='job-title']")
        .textContent();

      if (cardTitle && titlePattern.test(cardTitle)) {
        await this.openJobDetail(index);
        return;
      }
    }

    throw new Error(`No job card title matched ${titlePattern}`);
  }

  async waitForDetailPanel(timeout: number = 5000): Promise<boolean> {
    try {
      await this.activeCard.waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }

  async getJobTitle(): Promise<string> {
    return (await this.jobTitle.textContent())?.trim() || "";
  }

  async getCompanyName(): Promise<string> {
    return (await this.companyName.textContent())?.trim() || "";
  }

  async toggleBookmark() {
    const initialBookmarked = await this.isBookmarked();
    await this.activeCard.hover();
    await expect(this.bookmarkButton).toBeAttached({ timeout: 5000 });
    await expect(this.bookmarkButton).toBeVisible({ timeout: 5000 });
    await this.bookmarkButton.click();
    await expect.poll(() => this.isBookmarked()).toBe(!initialBookmarked);
    await this.waitForMockBookmarkState(!initialBookmarked);
  }

  private async waitForMockBookmarkState(expected: boolean) {
    if (!this.activeJobId) return;

    await expect
      .poll(
        () =>
          this.page.evaluate(
            ({ jobId, stateKey, expectedState }) => {
              const raw = window.localStorage.getItem(stateKey);
              if (!raw) return false;

              try {
                const state = JSON.parse(raw) as {
                  jobs?: Array<{ id?: number | string; bookmarked?: boolean }>;
                };
                const job = state.jobs?.find(
                  (candidate) => String(candidate.id) === jobId,
                );
                return Boolean(job?.bookmarked) === expectedState;
              } catch {
                return false;
              }
            },
            {
              jobId: this.activeJobId,
              stateKey: MOCK_STATE_KEY,
              expectedState: expected,
            },
          ),
        { timeout: 5000 },
      )
      .toBe(true);
  }

  async isBookmarked(): Promise<boolean> {
    const bookmarked = await this.bookmarkButton.getAttribute(
      "data-bookmarked",
    );
    return bookmarked !== null && bookmarked !== "false";
  }

  async addNote(noteText: string) {
    await expect(this.addNoteButton).toBeVisible({ timeout: 5000 });
    await this.addNoteButton.scrollIntoViewIfNeeded();
    await this.addNoteButton.click();
    if (!(await this.noteTextarea.isVisible({ timeout: 5000 }).catch(() => false))) {
      await this.addNoteButton.evaluate((element: HTMLElement) => element.click());
    }
    await this.noteTextarea.waitFor({ state: "visible", timeout: 10000 });
    await this.noteTextarea.fill(noteText);
    await this.saveNoteButton.waitFor({ state: "visible", timeout: 5000 });
    await this.saveNoteButton.click({ force: true });
    await this.noteTextarea.waitFor({ state: "detached", timeout: 5000 });
    await expect(this.addNoteButton).toHaveAttribute("aria-label", "Edit notes");
  }

  async getNotesCount(): Promise<number> {
    await expect(this.addNoteButton).toBeAttached({ timeout: 5000 });
    const label = await this.addNoteButton.getAttribute("aria-label");
    return label === "Edit notes" ? 1 : 0;
  }

  async getMatchScore(): Promise<number | null> {
    const label = await this.matchScore.getAttribute("aria-label");
    const match = label?.match(/Fit estimate:\s*(\d+)%/);
    return match ? parseInt(match[1], 10) : null;
  }
}
