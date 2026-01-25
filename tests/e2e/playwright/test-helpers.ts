import { Page } from "@playwright/test";

/**
 * Common test helper functions
 */

/**
 * Safely check if an element is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).isVisible().catch(() => false);
}

/**
 * Wait for element with timeout
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.locator(selector).waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get text content safely
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  try {
    const element = page.locator(selector);
    return (await element.textContent()) || "";
  } catch {
    return "";
  }
}

/**
 * Click with retry on failure
 */
export async function clickWithRetry(
  page: Page,
  selector: string,
  retries: number = 3
): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await page.locator(selector).click({ timeout: 3000 });
      return true;
    } catch {
      if (i === retries - 1) return false;
      await page.waitForTimeout(500);
    }
  }
  return false;
}

/**
 * Fill input with validation
 */
export async function fillInput(
  page: Page,
  selector: string,
  value: string
): Promise<boolean> {
  try {
    const input = page.locator(selector);
    await input.fill(value);
    const actualValue = await input.inputValue();
    return actualValue === value;
  } catch {
    return false;
  }
}

/**
 * Wait for network idle
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 5000): Promise<void> {
  try {
    await page.waitForLoadState("networkidle", { timeout });
  } catch {
    // Timeout is OK, just continue
  }
}

/**
 * Take screenshot on failure (for debugging)
 */
export async function screenshotOnFailure(
  page: Page,
  testName: string,
  error: Error
): Promise<void> {
  try {
    const sanitizedName = testName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    await page.screenshot({
      path: `test-results/failure-${sanitizedName}-${Date.now()}.png`,
      fullPage: true,
    });
  } catch (screenshotError) {
    console.error("Failed to take screenshot:", screenshotError);
  }
  throw error;
}

/**
 * Get element count safely
 */
export async function getElementCount(page: Page, selector: string): Promise<number> {
  try {
    return await page.locator(selector).count();
  } catch {
    return 0;
  }
}

/**
 * Check if element has class
 */
export async function hasClass(
  page: Page,
  selector: string,
  className: string
): Promise<boolean> {
  try {
    const element = page.locator(selector);
    const classes = await element.getAttribute("class");
    return classes?.includes(className) || false;
  } catch {
    return false;
  }
}

/**
 * Wait for animation to complete
 */
export async function waitForAnimation(page: Page, duration: number = 300): Promise<void> {
  await page.waitForTimeout(duration);
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(page: Page, selector: string): Promise<boolean> {
  try {
    await page.locator(selector).scrollIntoViewIfNeeded();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get computed style property
 */
export async function getComputedStyle(
  page: Page,
  selector: string,
  property: string
): Promise<string> {
  try {
    return await page.locator(selector).evaluate(
      (el, prop) => window.getComputedStyle(el).getPropertyValue(prop),
      property
    );
  } catch {
    return "";
  }
}

/**
 * Check if element is focused
 */
export async function isFocused(page: Page, selector: string): Promise<boolean> {
  try {
    return await page.locator(selector).evaluate((el) => el === document.activeElement);
  } catch {
    return false;
  }
}

/**
 * Simulate keyboard navigation
 */
export async function tabTo(page: Page, targetSelector: string, maxTabs: number = 20): Promise<boolean> {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);

    const focused = await isFocused(page, targetSelector);
    if (focused) return true;
  }
  return false;
}

/**
 * Wait for text to appear
 */
export async function waitForText(
  page: Page,
  text: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.locator(`text=${text}`).waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear local storage and reload
 */
export async function resetApp(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await waitForNetworkIdle(page);
}
