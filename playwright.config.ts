import { defineConfig, devices } from "@playwright/test";

const updateDocsScreenshots = process.env.UPDATE_DOC_SCREENSHOTS === "1";
const localWorkers = Number.parseInt(process.env.PLAYWRIGHT_WORKERS ?? "4", 10);
const workers = process.env.CI ? 1 : Math.max(1, localWorkers);
const reporter = process.env.PLAYWRIGHT_HTML_REPORT === "1" ? "html" : "line";
const port = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? "5173", 10);
const baseURL = `http://localhost:${port}`;

/**
 * Playwright configuration for JobSentinel E2E tests.
 * Tests run against the Vite dev server.
 */
export default defineConfig({
  testDir: "./tests/e2e/playwright",
  testIgnore: updateDocsScreenshots ? [] : ["**/screenshots.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers,
  reporter,
  use: {
    baseURL,
    reducedMotion: "reduce",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  webServer: {
    command: `npm run dev:mock -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
