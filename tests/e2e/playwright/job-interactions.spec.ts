import { test, expect, type Page } from "@playwright/test";
import { JobDetailPage } from "./page-objects/JobDetailPage";
import { DashboardPage } from "./page-objects/DashboardPage";

async function openDashboard(page: Page) {
  const jobDetail = new JobDetailPage(page);
  const dashboard = new DashboardPage(page);

  await jobDetail.navigateTo();
  await expect(dashboard.jobCards.first()).toBeVisible();

  return { jobDetail, dashboard };
}

const JOB_INDEXES = {
  bookmarkCreate: 2,
  bookmarkRemove: 3,
  bookmarkPersist: 4,
  noteCreate: 5,
  noteEdit: 6,
  notePersist: 7,
} as const;

test.describe("Job Interactions and Tracking", () => {
  test.describe("Bookmarking Jobs", () => {
    test("should bookmark an unbookmarked job", async ({ page }) => {
      const { jobDetail } = await openDashboard(page);

      await jobDetail.openJobDetail(JOB_INDEXES.bookmarkCreate);

      await expect(jobDetail.bookmarkButton).toBeVisible();
      await expect.poll(() => jobDetail.isBookmarked()).toBe(false);

      await jobDetail.toggleBookmark();

      await expect.poll(() => jobDetail.isBookmarked()).toBe(true);
    });

    test("should unbookmark a bookmarked job", async ({ page }) => {
      const { jobDetail } = await openDashboard(page);

      await jobDetail.openJobDetail(JOB_INDEXES.bookmarkRemove);

      await expect(jobDetail.bookmarkButton).toBeVisible();
      await expect.poll(() => jobDetail.isBookmarked()).toBe(true);

      await jobDetail.toggleBookmark();

      await expect.poll(() => jobDetail.isBookmarked()).toBe(false);
    });

    test("should persist bookmark across page reload", async ({ page }) => {
      const { jobDetail } = await openDashboard(page);

      await jobDetail.openJobDetail(JOB_INDEXES.bookmarkPersist);
      await expect.poll(() => jobDetail.isBookmarked()).toBe(false);

      await jobDetail.toggleBookmark();
      await expect.poll(() => jobDetail.isBookmarked()).toBe(true);

      await page.reload();
      await page.waitForLoadState("networkidle");
      await jobDetail.openJobDetail(JOB_INDEXES.bookmarkPersist);

      await expect.poll(() => jobDetail.isBookmarked()).toBe(true);
    });
  });

  test.describe("Adding Notes to Jobs", () => {
    test("should add a note to a job", async ({ page }) => {
      const { jobDetail } = await openDashboard(page);

      await jobDetail.openJobDetail(JOB_INDEXES.noteCreate);

      await expect.poll(() => jobDetail.getNotesCount()).toBe(0);

      await jobDetail.addNote("Great opportunity, apply by next week");

      await expect.poll(() => jobDetail.getNotesCount()).toBe(1);
    });

    test("should show edit state after adding notes", async ({ page }) => {
      const { jobDetail } = await openDashboard(page);

      await jobDetail.openJobDetail(JOB_INDEXES.noteEdit);
      await jobDetail.addNote("Test note for display");

      await expect.poll(() => jobDetail.getNotesCount()).toBe(1);
    });

    test("should persist notes across page reload", async ({ page }) => {
      const { jobDetail } = await openDashboard(page);
      const noteText = "Persistent note test";

      await jobDetail.openJobDetail(JOB_INDEXES.notePersist);
      await jobDetail.addNote(noteText);

      await page.reload();
      await page.waitForLoadState("networkidle");
      await jobDetail.openJobDetail(JOB_INDEXES.notePersist);

      await expect.poll(() => jobDetail.getNotesCount()).toBe(1);
    });
  });

  test.describe("Job Search and Filtering", () => {
    test("should search for jobs with keyword", async ({ page }) => {
      const { dashboard } = await openDashboard(page);

      await dashboard.searchForJobs("manager");

      await expect(dashboard.jobCards.first()).toBeVisible();
      await expect(dashboard.jobCards.filter({ hasText: /manager/i }).first()).toBeVisible();
    });

    test("should filter jobs by remote location", async ({ page }) => {
      const { dashboard } = await openDashboard(page);
      const initialCount = await dashboard.getVisibleJobCount();

      await dashboard.applyFilter("location", "remote");

      await expect.poll(() => dashboard.getJobCount()).toBeGreaterThan(0);
      const filteredCount = await dashboard.getJobCount();
      expect(filteredCount).toBeGreaterThan(0);
      expect(filteredCount).toBeLessThan(initialCount);

      const cards = await dashboard.jobCards.allTextContents();
      expect(cards.every((card) => /Remote/i.test(card))).toBe(true);
    });

    test("should clear filters", async ({ page }) => {
      const { dashboard } = await openDashboard(page);
      const initialCount = await dashboard.getVisibleJobCount();

      await dashboard.searchForJobs("manager");
      await dashboard.applyFilter("location", "remote");
      await dashboard.clearAllFilters();

      await expect.poll(() => dashboard.searchInput.inputValue()).toBe("");
      await expect.poll(() => dashboard.getJobCount()).toBe(initialCount);
    });
  });

  test.describe("Match Strength Display", () => {
    test("should display match strength for jobs", async ({ page }) => {
      const { jobDetail } = await openDashboard(page);

      await jobDetail.openJobDetail(0);

      const matchScore = await jobDetail.getMatchScore();

      expect(matchScore).not.toBeNull();
      expect(matchScore).toBeGreaterThanOrEqual(0);
      expect(matchScore).toBeLessThanOrEqual(100);
    });
  });

  test.describe("Combined User Flow", () => {
    test("should combine search, bookmark toggle, and match checks", async ({
      page,
    }) => {
      const { jobDetail, dashboard } = await openDashboard(page);

      await dashboard.searchForJobs("manager");
      await jobDetail.openJobDetailByTitle(/manager/i);

      const title = await jobDetail.getJobTitle();
      const company = await jobDetail.getCompanyName();
      expect(title).toMatch(/manager/i);
      expect(company.length).toBeGreaterThan(0);

      const initialBookmarked = await jobDetail.isBookmarked();
      await jobDetail.toggleBookmark();
      await expect.poll(() => jobDetail.isBookmarked()).toBe(!initialBookmarked);

      const matchScore = await jobDetail.getMatchScore();
      expect(matchScore).not.toBeNull();
    });
  });
});
