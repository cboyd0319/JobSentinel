// Exercises mock-browser military guidance, inclusive setup, and regional job discovery.

import { expect, test, type Page } from "@playwright/test";
import { DashboardPage } from "./page-objects/DashboardPage";
import { ResumeBuilderPage } from "./page-objects/ResumeBuilderPage";
import { mockConfig, mockJobs } from "../../../src/dev-runtime/mocks/data";

const MOCK_INVOKE_CONTROLS_KEY = "jobsentinel.mockInvokeControls.v1";
const MOCK_STATE_KEY = "jobsentinel.mockState.v1";

async function seedFirstRun(page: Page): Promise<void> {
  await page.addInitScript(({ controlsKey, stateKey }) => {
    window.localStorage.removeItem(stateKey);
    window.localStorage.setItem(controlsKey, JSON.stringify({
      delayMs: 0,
      responses: {
        is_first_run: true,
        get_active_resume: { id: 1, name: "Local Resume" },
        get_user_skills: [
          { skill_name: "Calendar management", source: "resume" },
          { skill_name: "Customer scheduling", source: "resume" },
        ],
      },
    }));
  }, { controlsKey: MOCK_INVOKE_CONTROLS_KEY, stateKey: MOCK_STATE_KEY });
}

async function seedExactSavedMatch(page: Page): Promise<void> {
  await page.addInitScript((stateKey) => {
    const now = "2026-09-11T12:00:00.000Z";
    window.localStorage.setItem(stateKey, JSON.stringify({
      resumes: [{ id: 42, name: "Local resume.pdf", file_path: "/tmp/local-resume.pdf", is_active: true, created_at: now, updated_at: now }],
      recentMatches: [{ id: 6, resume_id: 42, job_hash: "job-hash-1", job_title: "SEO Manager", company: "Shopify", overall_match_score: 0.8, skills_match_score: null, experience_match_score: null, education_match_score: null, matching_skills: [], missing_skills: [], gap_analysis: null, created_at: now }],
    }));
  }, MOCK_STATE_KEY);
}

async function seedWorkArrangementJobs(page: Page): Promise<void> {
  await page.addInitScript((stateKey) => {
    const now = "2026-09-11T12:00:00.000Z";
    const base = {
      company: "Example Co", source: "import", salary_min: 60_000,
      salary_max: 80_000, currency: "USD", score: 0.7, hidden: false,
      bookmarked: false, notes: null, created_at: now,
    };
    window.localStorage.setItem(stateKey, JSON.stringify({
      jobs: [
        { ...base, id: 101, hash: "arrangement-remote", title: "Remote UK Coordinator", location: "United Kingdom", description: "Hybrid office option", url: "https://example.test/remote", remote: true },
        { ...base, id: 102, hash: "arrangement-hybrid", title: "Hybrid Postcode Coordinator", location: "SW1A 1AA", description: "Hybrid office schedule", url: "https://example.test/hybrid", remote: false },
        { ...base, id: 103, hash: "arrangement-onsite", title: "On-site Postcode Coordinator", location: "80202", description: "On-site client support", url: "https://example.test/onsite", remote: false },
        { ...base, id: 104, hash: "arrangement-unknown", title: "Unspecified Arrangement Coordinator", location: "Location not disclosed", description: "Client support", url: "https://example.test/unknown", remote: false },
      ],
    }));
  }, MOCK_STATE_KEY);
}

test.describe("Mock-browser military and inclusive journey", () => {
  test("applies and clears a saved search country without stale cached jobs", async ({ page }) => {
    await page.addInitScript(({ controlsKey, stateKey, config, base }) => {
      const location = (code: string) => ({ raw_location: code, country: { raw_country: code, alpha2: code } });
      window.localStorage.setItem(controlsKey, JSON.stringify({ delayMs: 0, responses: { is_first_run: false } }));
      window.localStorage.setItem(stateKey, JSON.stringify({
        config: { ...config, auto_refresh: { enabled: false, interval_minutes: 30 }, location_preferences: { ...config.location_preferences, search_country: null } },
        jobs: [
          { ...base, id: 901, hash: "country-us", title: "US Office Coordinator", location: "New York, US", remote: false, description: "On-site work", geography: { worksite_locations: [location("US")], remote_applicant_locations: [] } },
          { ...base, id: 902, hash: "country-gb", title: "UK Remote Coordinator", location: "US headquarters", remote: true, geography: { worksite_locations: [location("US")], remote_applicant_locations: [location("GB")] } },
          { ...base, id: 903, hash: "country-unknown", title: "Unknown Country Coordinator", location: "Location not stated", remote: false, geography: null },
        ],
      }));
    }, { controlsKey: MOCK_INVOKE_CONTROLS_KEY, stateKey: MOCK_STATE_KEY, config: mockConfig, base: mockJobs[0] });
    const dashboard = new DashboardPage(page);
    await dashboard.navigateTo();

    for (const country of ["GB", ""]) {
      await page.getByRole("button", { name: "Open settings", exact: true }).click();
      await page.getByRole("combobox", { name: "Search country (optional)" }).selectOption(country);
      await page.evaluate(async () => {
        const moduleUrl = "/src/platform/tauri/index.ts";
        const api = await import(/* @vite-ignore */ moduleUrl);
        api.invalidateCacheByCommand("get_recent_jobs");
        await api.cachedInvoke("get_recent_jobs", { limit: 50 }, 10_000);
      });
      await page.getByRole("button", { name: "Save Changes", exact: true }).click();
      if (country) {
        await expect(page.getByText("Searching in United Kingdom", { exact: true })).toBeVisible();
        await expect(page.getByRole("heading", { name: "US Office Coordinator", exact: true })).toHaveCount(0);
        await expect(page.getByRole("heading", { name: "UK Remote Coordinator", exact: true })).toBeVisible();
        await expect(page.getByText("Country scope unclear", { exact: true })).toBeVisible();
        await expect(dashboard.jobCards).toHaveCount(2);
      } else {
        await expect(page.getByText("Searching in United Kingdom", { exact: true })).toHaveCount(0);
        await expect(page.getByRole("heading", { name: "US Office Coordinator", exact: true })).toBeVisible();
        await expect(page.getByText("Country scope unclear", { exact: true })).toHaveCount(0);
        await expect(dashboard.jobCards).toHaveCount(3);
      }
    }
  });

  test("keeps onboarding guidance optional without a protected-status requirement", async ({ page }) => {
    await seedFirstRun(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Work You Want" })).toBeVisible({ timeout: 30_000 });

    const guidance = page.getByText("Military-to-civilian guidance (optional)");
    await expect(guidance).toBeVisible();
    await guidance.click();
    await expect(page.getByText(/using these tools does not require medical or disability details/i)).toBeVisible();
    await expect(page.locator('input[name*="veteran" i], input[name*="disability" i]')).toHaveCount(0);
  });

  test("allows an early-career builder path without invented work history", async ({ page }) => {
    const builder = new ResumeBuilderPage(page);
    await builder.navigateTo();
    await builder.completeContact();
    await builder.completeSummary("Early-career applicant with confirmed education, projects, and volunteering.");

    await expect(page.getByText(/this step is optional.*do not invent employment/i)).toBeVisible();
    await builder.goNext(4, "Education");
  });

  test("opens military review only from the exact mock saved match and returns focus to its case", async ({ page }) => {
    await seedExactSavedMatch(page);
    const dashboard = new DashboardPage(page);
    await dashboard.navigateTo();

    await dashboard.jobCards.first().getByRole("button", { name: "Open case" }).click();
    const caseDialog = page.getByRole("dialog", { name: "Opportunity case" });
    await expect(caseDialog).toBeVisible();
    await caseDialog.getByRole("button", { name: "Review military wording" }).click();

    const reviewDialog = page.getByRole("dialog", { name: "Military transition wording review" });
    await expect(reviewDialog).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await reviewDialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(caseDialog).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(caseDialog.locator(".app-modal-panel")).toBeFocused();
  });

  test("filters exact mock work arrangements without hiding regional geography", async ({ page }) => {
    await seedWorkArrangementJobs(page);
    const dashboard = new DashboardPage(page);
    await dashboard.navigateTo();

    await expect(page.getByText("Remote · United Kingdom")).toBeVisible();
    await expect(page.getByText("Hybrid · SW1A 1AA")).toBeVisible();
    await expect(page.getByText("On-site · 80202")).toBeVisible();
    const locationFilter = page.getByRole("button", { name: "All Locations" });
    await locationFilter.click();
    await page.getByRole("option", { name: "Hybrid Only" }).click();
    await expect(page.getByText("Hybrid Postcode Coordinator")).toBeVisible();
    await expect(page.getByText("On-site Postcode Coordinator")).toBeHidden();
    await expect(page.getByText("Unspecified Arrangement Coordinator")).toBeHidden();

    await page.getByRole("button", { name: "Hybrid Only" }).click();
    await page.getByRole("option", { name: "On-site Only" }).click();
    await expect(page.getByText("On-site Postcode Coordinator")).toBeVisible();
    await expect(page.getByText("Unspecified Arrangement Coordinator")).toBeHidden();

    await page.getByRole("button", { name: "On-site Only" }).click();
    await page.getByRole("option", { name: "Not disclosed / unspecified" }).click();
    await expect(page.getByText("Unspecified Arrangement Coordinator")).toBeVisible();
    await expect(page.getByText("On-site Postcode Coordinator")).toBeHidden();
  });
});
