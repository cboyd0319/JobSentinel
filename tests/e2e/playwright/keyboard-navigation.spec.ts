import { expect, test, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./page-objects/BasePage";

const MAIN_HEADING_BY_SHORTCUT: Array<{
  shortcut: number;
  heading: string | RegExp;
}> = [
  { shortcut: 1, heading: "JobSentinel" },
  { shortcut: 2, heading: "Application Tracker" },
  { shortcut: 3, heading: "Resume Matcher" },
  { shortcut: 4, heading: "Salary AI" },
  { shortcut: 5, heading: "Market Intelligence" },
  { shortcut: 6, heading: "One-Click Apply Settings" },
  { shortcut: 7, heading: "Resume Builder" },
  { shortcut: 8, heading: "ATS Resume Optimizer" },
];

function mainHeading(page: Page, name: string | RegExp) {
  return page.locator("#main-content").getByRole("heading", { name }).first();
}

function commandPalette(page: Page) {
  return page.getByTestId("command-palette");
}

async function expectActiveElement(locator: Locator): Promise<void> {
  await expect
    .poll(() => locator.evaluate((element) => document.activeElement === element))
    .toBe(true);
}

async function openCommandPalette(page: Page): Promise<void> {
  await page.keyboard.press("Control+k");
  await expect(commandPalette(page)).toBeVisible();
  await expectActiveElement(page.getByTestId("command-palette-input"));
}

test.describe("Keyboard Navigation", () => {
  let basePage: BasePage;

  test.beforeEach(async ({ page }) => {
    basePage = new BasePage(page);
    await basePage.goto("/");
    await basePage.skipSetupWizard();
  });

  test.describe("Global Shortcuts", () => {
    for (const { shortcut, heading } of MAIN_HEADING_BY_SHORTCUT) {
      test(`navigates to page ${shortcut} with Meta+${shortcut}`, async ({ page }) => {
        await basePage.navigateWithKeyboard(shortcut);

        await expect(mainHeading(page, heading)).toBeVisible();
      });
    }

    test("keeps navigation shortcuts inactive while typing in search", async ({ page }) => {
      const searchInput = page.getByTestId("search-input");
      await expect(searchInput).toBeVisible();

      await searchInput.focus();
      await page.keyboard.press("Meta+2");

      await expect(searchInput).toBeFocused();
      await expect(mainHeading(page, "JobSentinel")).toBeVisible();
    });

    test("ignores unsupported shortcut combinations without crashing", async ({ page }) => {
      await page.keyboard.press("Control+Shift+Alt+Z");
      await page.keyboard.press("Meta+Shift+X");

      await expect(basePage.mainContent).toBeVisible();
      await expect(mainHeading(page, "JobSentinel")).toBeVisible();
    });
  });

  test.describe("Command Palette", () => {
    test("opens with Control+K and closes with Escape", async ({ page }) => {
      await openCommandPalette(page);

      await page.keyboard.press("Escape");

      await expect(commandPalette(page)).toBeHidden();
    });

    test("opens with Meta+K", async ({ page }) => {
      await page.keyboard.press("Meta+k");

      await expect(commandPalette(page)).toBeVisible();
      await expectActiveElement(page.getByTestId("command-palette-input"));
    });

    test("filters commands and executes selected command with Enter", async ({ page }) => {
      await openCommandPalette(page);

      await page.getByTestId("command-palette-input").fill("settings");
      await expect(commandPalette(page).getByRole("option", { name: /Open settings/ })).toBeVisible();

      await page.keyboard.press("Enter");

      await expect(commandPalette(page)).toBeHidden();
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    });

    test("moves selected command with arrow keys", async ({ page }) => {
      await openCommandPalette(page);

      const options = commandPalette(page).getByRole("option");
      await expect(options.first()).toHaveAttribute("aria-selected", "true");

      await page.keyboard.press("ArrowDown");

      await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
    });

    test("keeps tab focus inside the palette", async ({ page }) => {
      await openCommandPalette(page);

      for (let index = 0; index < 4; index += 1) {
        await page.keyboard.press("Tab");
        const focusIsInsidePalette = await commandPalette(page).evaluate((palette) =>
          palette.contains(document.activeElement)
        );
        expect(focusIsInsidePalette).toBe(true);
      }
    });
  });

  test.describe("Help And Focus", () => {
    test("opens keyboard help with question mark and closes with Escape", async ({ page }) => {
      await page.keyboard.press("Shift+Slash");

      const helpDialog = page.getByRole("dialog", { name: "Keyboard Shortcuts" });
      await expect(helpDialog).toBeVisible();
      await expect(helpDialog.getByText("⌘1-8")).toBeVisible();

      await page.keyboard.press("Escape");

      await expect(helpDialog).toBeHidden();
    });

    test("focuses dashboard search with slash outside inputs", async ({ page }) => {
      const searchInput = page.getByTestId("search-input");
      await expect(searchInput).toBeVisible();

      await page.keyboard.press("/");

      await expect(searchInput).toBeFocused();
    });

    test("does not steal focus when slash is typed in search", async ({ page }) => {
      const searchInput = page.getByTestId("search-input");
      await searchInput.focus();

      await page.keyboard.type("/");

      await expect(searchInput).toBeFocused();
      await expect(searchInput).toHaveValue("/");
    });

    test("skip link moves focus to main content", async ({ page }) => {
      const skipLink = page.getByRole("link", { name: "Skip to main content" });

      await skipLink.focus();
      await expect(skipLink).toBeFocused();
      await page.keyboard.press("Enter");

      await expect(page.locator("#main-content")).toBeFocused();
    });
  });
});
