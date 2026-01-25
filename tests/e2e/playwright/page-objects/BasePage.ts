import { Page, Locator } from "@playwright/test";

/**
 * Base page object with common functionality
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string = "/") {
    await this.page.goto(path);
    await this.page.waitForLoadState("networkidle");
  }

  async skipSetupWizard() {
    const skipButton = this.page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(500);
    }
  }

  async waitForReady() {
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(300);
  }

  async navigateWithKeyboard(pageNumber: number) {
    await this.page.keyboard.press(`Meta+${pageNumber}`);
    await this.waitForReady();
  }

  get sidebar(): Locator {
    return this.page.locator("nav").first();
  }

  get mainContent(): Locator {
    return this.page.locator("main, [role='main'], #root");
  }
}
