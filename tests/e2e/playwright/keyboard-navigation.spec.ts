import { expect, test, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./page-objects/BasePage";

const MAIN_HEADING_BY_SHORTCUT: Array<{
  shortcut: number;
  heading: string | RegExp;
}> = [
  { shortcut: 1, heading: "JobSentinel" },
  { shortcut: 2, heading: "Application Tracker" },
  { shortcut: 3, heading: "Resume Match" },
  { shortcut: 4, heading: "Pay Protection" },
  { shortcut: 5, heading: "Hiring Trends" },
  { shortcut: 6, heading: "Application Assist Settings" },
  { shortcut: 7, heading: "Resume Builder" },
  { shortcut: 8, heading: "Resume Match Helper" },
];

function mainHeading(page: Page, name: string | RegExp) {
  return page.locator("#main-content").getByRole("heading", { name }).first();
}

function commandPalette(page: Page) {
  return page.getByTestId("command-palette");
}

async function dispatchPrimaryShortcut(page: Page, key: string): Promise<void> {
  await page.evaluate((shortcutKey) => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        key: shortcutKey,
      }),
    );
  }, key);
}

async function dispatchSearchFocusShortcut(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        code: "Slash",
        key: "/",
      }),
    );
  });
}

async function dispatchHelpShortcut(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "?",
        shiftKey: true,
      }),
    );
  });
}

async function pressPrimaryNavigationShortcut(
  page: Page,
  shortcut: number,
  browserName: string,
): Promise<void> {
  if (browserName === "webkit") {
    // WebKit can reserve primary-modifier number chords before page JS receives them.
    await dispatchPrimaryShortcut(page, String(shortcut));
    return;
  }

  await page.keyboard.press(`Control+${shortcut}`);
}

async function isActiveElement(locator: Locator): Promise<boolean> {
  return locator
    .evaluate((element) => document.activeElement === element)
    .catch(() => false);
}

async function expectPrimaryShortcutNavigation(
  page: Page,
  shortcut: number,
  heading: string | RegExp,
  browserName: string,
  basePage: BasePage,
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await pressPrimaryNavigationShortcut(page, shortcut, browserName);
    await basePage.waitForReady();

    if (await mainHeading(page, heading).isVisible().catch(() => false)) {
      return;
    }
  }

  await expect(mainHeading(page, heading)).toBeVisible({ timeout: 15000 });
}

async function expectActiveElement(locator: Locator): Promise<void> {
  await expect.poll(() => isActiveElement(locator)).toBe(true);
}

async function waitForActiveElement(locator: Locator, timeout = 300): Promise<boolean> {
  try {
    await expect
      .poll(() => isActiveElement(locator), {
        intervals: [25, 50, 100],
        timeout,
      })
      .toBe(true);
    return true;
  } catch {
    return false;
  }
}

async function focusDashboardSearch(page: Page, searchInput: Locator, browserName: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.keyboard.press("Slash");

    if (await waitForActiveElement(searchInput)) {
      return;
    }

    if (browserName === "webkit") {
      await dispatchSearchFocusShortcut(page);

      if (await waitForActiveElement(searchInput)) {
        return;
      }
    }
  }

  await expectActiveElement(searchInput);
}

async function openCommandPalette(page: Page): Promise<void> {
  await page.keyboard.press("Control+k");
  if (!(await commandPalette(page).isVisible().catch(() => false))) {
    await dispatchPrimaryShortcut(page, "k");
  }
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
      test(`navigates to page ${shortcut} with primary modifier+${shortcut}`, async ({ page, browserName }) => {
        await expectPrimaryShortcutNavigation(page, shortcut, heading, browserName, basePage);
      });
    }

    test("keeps navigation shortcuts inactive while typing in search", async ({ page }) => {
      const searchInput = page.getByTestId("search-input");
      await expect(searchInput).toBeVisible();

      await searchInput.focus();
      await page.keyboard.press("Control+2");

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
      await dispatchHelpShortcut(page);

      const helpDialog = page.getByRole("dialog", { name: "Keyboard Help" });
      await expect(helpDialog).toBeVisible();
      await expect(helpDialog.getByText("Cmd/Ctrl+1-8")).toBeVisible();

      await page.keyboard.press("Escape");

      await expect(helpDialog).toBeHidden();
    });

    test("focuses dashboard search with slash outside inputs @smoke", async ({ page, browserName }) => {
      const searchInput = page.getByTestId("search-input");
      await expect(searchInput).toBeVisible();
      await expect(page.getByTestId("job-card").first()).toBeVisible();

      await focusDashboardSearch(page, searchInput, browserName);
      await expectActiveElement(searchInput);
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
