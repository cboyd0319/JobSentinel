import { expect, test, type Page } from "@playwright/test";
import { BasePage } from "./page-objects/BasePage";

const NAV_DESTINATIONS: Array<{
  label: string;
  heading: string | RegExp;
}> = [
  { label: "Dashboard", heading: "JobSentinel" },
  { label: "Applications", heading: "Application Tracker" },
  { label: "Resumes", heading: "Resume Matcher" },
  { label: "Salary", heading: "Salary AI" },
  { label: "Market Intel", heading: "Market Intelligence" },
  { label: "Application Assist", heading: "Application Assist Settings" },
  { label: "Resume Builder", heading: "Resume Builder" },
  { label: "ATS Optimizer", heading: "ATS Resume Optimizer" },
];

async function openApp(page: Page): Promise<BasePage> {
  const basePage = new BasePage(page);
  await basePage.goto("/");
  await basePage.skipSetupWizard();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.locator("#main-content")).toBeVisible();
  return basePage;
}

function mainHeading(page: Page, name: string | RegExp) {
  return page.locator("#main-content").getByRole("heading", { name }).first();
}

function navButton(page: Page, label: string) {
  return page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: new RegExp(label) });
}

async function clickNavButton(page: Page, label: string) {
  const button = navButton(page, label);
  await expect(button).toBeVisible({ timeout: 15000 });
  await button.click();
  try {
    await expect(button).toHaveAttribute("aria-current", "page", {
      timeout: 5000,
    });
  } catch {
    await button.evaluate((element: HTMLElement) => element.click());
    await expect(button).toHaveAttribute("aria-current", "page", {
      timeout: 15000,
    });
  }
}

test.describe("JobSentinel App Shell", () => {
  test("loads the dashboard without rendering an error state @smoke", async ({ page }) => {
    await openApp(page);

    await expect(mainHeading(page, "JobSentinel")).toBeVisible();
    await expect(page.getByText("Privacy-preserving job search")).toBeVisible();
    await expect(page.getByTestId("btn-search-now")).toBeVisible();
    await expect(page.getByTestId("search-input")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/error boundary|failed to load/i);
  });

  test("shows the skip link as the first keyboard target", async ({ page }) => {
    await openApp(page);

    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeFocused();
  });

  test("toggles theme from the header", async ({ page }) => {
    await openApp(page);

    const html = page.locator("html");
    const themeToggle = page.getByRole("button", {
      name: /Switch to (dark|light) mode/,
    });
    const initialThemeClass = await html.getAttribute("class");
    const initialLabel = await themeToggle.getAttribute("aria-label");

    await themeToggle.click();

    await expect
      .poll(() => html.getAttribute("class"))
      .not.toBe(initialThemeClass);
    await expect(themeToggle).not.toHaveAttribute("aria-label", initialLabel ?? "");
  });

  test("shows all sidebar destinations and marks dashboard current", async ({ page }) => {
    await openApp(page);

    const nav = page.getByRole("navigation", { name: "Main navigation" });
    const buttons = nav.getByRole("button");

    await expect(buttons).toHaveCount(NAV_DESTINATIONS.length);
    await expect(nav.getByRole("button", { name: /Dashboard/ })).toHaveAttribute(
      "aria-current",
      "page",
    );

    for (const { label } of NAV_DESTINATIONS) {
      await expect(navButton(page, label)).toBeVisible();
    }
  });

  for (const { label, heading } of NAV_DESTINATIONS.slice(1)) {
    test(`navigates to ${label} from the sidebar`, async ({ page }) => {
      await openApp(page);

      await clickNavButton(page, label);

      await expect(mainHeading(page, heading)).toBeVisible({ timeout: 15000 });
      await expect(navButton(page, label)).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
  }
});

test.describe("Responsive App Shell", () => {
  for (const viewport of [
    { name: "mobile", width: 375, height: 667 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1920, height: 1080 },
  ]) {
    test(`renders core shell at ${viewport.name} viewport`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openApp(page);

      await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
      await expect(page.locator("#main-content")).toBeVisible();
      await expect(mainHeading(page, "JobSentinel")).toBeVisible();
    });
  }
});
