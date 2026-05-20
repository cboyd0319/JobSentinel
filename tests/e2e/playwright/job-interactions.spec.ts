import { test, expect } from "@playwright/test";
import { JobDetailPage } from "./page-objects/JobDetailPage";
import { DashboardPage } from "./page-objects/DashboardPage";

test.describe("Job Interactions and Tracking", () => {
  let jobDetail: JobDetailPage;
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    jobDetail = new JobDetailPage(page);
    dashboard = new DashboardPage(page);
    await jobDetail.navigateTo();
    await expect(dashboard.jobCards.first()).toBeVisible();
  });

  test.describe("Bookmarking Jobs", () => {
    test("should bookmark an unbookmarked job", async () => {
      await jobDetail.openJobDetail(1);

      await expect(jobDetail.bookmarkButton).toBeVisible();
      await expect.poll(() => jobDetail.isBookmarked()).toBe(false);

      await jobDetail.toggleBookmark();

      await expect.poll(() => jobDetail.isBookmarked()).toBe(true);
    });

    test("should unbookmark a bookmarked job", async () => {
      await jobDetail.openJobDetail(0);

      await expect(jobDetail.bookmarkButton).toBeVisible();
      await expect.poll(() => jobDetail.isBookmarked()).toBe(true);

      await jobDetail.toggleBookmark();

      await expect.poll(() => jobDetail.isBookmarked()).toBe(false);
    });

    test("should persist bookmark across page reload", async ({ page }) => {
      await jobDetail.openJobDetail(1);
      await jobDetail.toggleBookmark();
      await expect.poll(() => jobDetail.isBookmarked()).toBe(true);

      await page.reload();
      await page.waitForLoadState("networkidle");
      await jobDetail.openJobDetail(1);

      await expect.poll(() => jobDetail.isBookmarked()).toBe(true);
    });
  });

  test.describe("Adding Notes to Jobs", () => {
    test("should add a note to a job", async () => {
      await jobDetail.openJobDetail(1);

      await expect.poll(() => jobDetail.getNotesCount()).toBe(0);

      await jobDetail.addNote("Great opportunity, apply by next week");

      await expect.poll(() => jobDetail.getNotesCount()).toBe(1);
    });

    test("should show edit state after adding notes", async () => {
      await jobDetail.openJobDetail(1);
      await jobDetail.addNote("Test note for display");

      await expect.poll(() => jobDetail.getNotesCount()).toBe(1);
    });

    test("should persist notes across page reload", async ({ page }) => {
      const noteText = "Persistent note test";

      await jobDetail.openJobDetail(1);
      await jobDetail.addNote(noteText);

      await page.reload();
      await page.waitForLoadState("networkidle");
      await jobDetail.openJobDetail(1);

      await expect.poll(() => jobDetail.getNotesCount()).toBe(1);
    });
  });

  test.describe("Job Search and Filtering", () => {
    test("should search for jobs with keyword", async () => {
      await dashboard.searchForJobs("engineer");

      await expect(dashboard.jobCards.first()).toBeVisible();
      await expect(dashboard.jobCards.first()).toContainText(/engineer/i);
    });

    test("should filter jobs by remote location", async () => {
      const initialCount = await dashboard.getJobCount();

      await dashboard.applyFilter("location", "remote");

      await expect.poll(() => dashboard.getJobCount()).toBeGreaterThan(0);
      const filteredCount = await dashboard.getJobCount();
      expect(filteredCount).toBeGreaterThan(0);
      expect(filteredCount).toBeLessThan(initialCount);

      const cards = await dashboard.jobCards.allTextContents();
      expect(cards.every((card) => /Remote/i.test(card))).toBe(true);
    });

    test("should clear filters", async () => {
      const initialCount = await dashboard.getJobCount();

      await dashboard.searchForJobs("engineer");
      await dashboard.applyFilter("location", "remote");
      await dashboard.clearAllFilters();

      await expect.poll(() => dashboard.searchInput.inputValue()).toBe("");
      await expect.poll(() => dashboard.getJobCount()).toBe(initialCount);
    });
  });

  test.describe("Match Score Display", () => {
    test("should display match score for jobs", async () => {
      await jobDetail.openJobDetail(0);

      const matchScore = await jobDetail.getMatchScore();

      expect(matchScore).not.toBeNull();
      expect(matchScore).toBeGreaterThanOrEqual(0);
      expect(matchScore).toBeLessThanOrEqual(100);
    });
  });

  test.describe("Combined User Flow", () => {
    test("should combine search, bookmark, and score checks", async () => {
      await dashboard.searchForJobs("engineer");
      await jobDetail.openJobDetail(0);

      const title = await jobDetail.getJobTitle();
      const company = await jobDetail.getCompanyName();
      expect(title).toMatch(/engineer/i);
      expect(company.length).toBeGreaterThan(0);

      await jobDetail.toggleBookmark();
      await expect.poll(() => jobDetail.isBookmarked()).toBe(true);

      const matchScore = await jobDetail.getMatchScore();
      expect(matchScore).not.toBeNull();
    });
  });
});
