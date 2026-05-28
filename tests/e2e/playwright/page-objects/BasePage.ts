import { Page, Locator, expect } from "@playwright/test";

/**
 * Base page object with common functionality
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string = "/") {
    await this.page.goto(path, { waitUntil: "domcontentloaded" });
    await this.waitForReady();
  }

  async skipSetupWizard() {
    const skipButton = this.page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await this.waitForReady();
    }
  }

  async waitForReady() {
    await this.page.locator("#main-content").waitFor({
      state: "visible",
      timeout: 15000,
    });
  }

  async navigateWithKeyboard(pageNumber: number) {
    await this.page.keyboard.press(`Control+${pageNumber}`);
    await this.waitForReady();
  }

  async navigateToPage(label: string) {
    const navButton = this.page
      .locator(`nav button[aria-label^="${label}"]`)
      .first();
    await expect(navButton).toBeVisible({ timeout: 15000 });
    await navButton.scrollIntoViewIfNeeded();
    await navButton.click();
    try {
      await expect(navButton).toHaveAttribute("aria-current", "page", {
        timeout: 5000,
      });
    } catch {
      await navButton.evaluate((element: HTMLElement) => element.click());
      await expect(navButton).toHaveAttribute("aria-current", "page", {
        timeout: 15000,
      });
    }
    await this.waitForReady();
  }

  get sidebar(): Locator {
    return this.page.locator("nav").first();
  }

  get mainContent(): Locator {
    return this.page.locator("#root > *").first();
  }
}
