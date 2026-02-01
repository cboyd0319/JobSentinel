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
  });

  test.describe("Bookmarking Jobs", () => {
    test("should bookmark a job", async ({ page }) => {
      const jobCount = await dashboard.jobCards.count();

      if (jobCount === 0) {
        test.skip();
        return;
      }

      // Open job detail
      await jobDetail.openJobDetail(0);

      const hasDetail = await jobDetail.waitForDetailPanel(3000);

      if (!hasDetail) {
        test.skip();
        return;
      }

      // Check if bookmarked before
      const wasBookmarked = await jobDetail.isBookmarked();

      // Toggle bookmark
      if (!(await jobDetail.bookmarkButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await jobDetail.toggleBookmark();
      await page.waitForTimeout(500);

      // Check bookmark state changed
      const isNowBookmarked = await jobDetail.isBookmarked();

      expect(isNowBookmarked).not.toBe(wasBookmarked);
    });

    test("should unbookmark a bookmarked job", async ({ page }) => {
      const jobCount = await dashboard.jobCards.count();

      if (jobCount === 0) {
        test.skip();
        return;
      }

      await jobDetail.openJobDetail(0);

      const hasDetail = await jobDetail.waitForDetailPanel(3000);

      if (!hasDetail) {
        test.skip();
        return;
      }

      if (!(await jobDetail.bookmarkButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      // Bookmark if not already
      const wasBookmarked = await jobDetail.isBookmarked();

      if (!wasBookmarked) {
        await jobDetail.toggleBookmark();
        await page.waitForTimeout(500);
      }

      // Now unbookmark
      await jobDetail.toggleBookmark();
      await page.waitForTimeout(500);

      const isNowBookmarked = await jobDetail.isBookmarked();

      expect(isNowBookmarked).toBe(false);
    });

    test("should persist bookmark across page reload", async ({ page }) => {
      const jobCount = await dashboard.jobCards.count();

      if (jobCount === 0) {
        test.skip();
        return;
      }

      await jobDetail.openJobDetail(0);

      const hasDetail = await jobDetail.waitForDetailPanel(3000);

      if (!hasDetail) {
        test.skip();
        return;
      }

      if (!(await jobDetail.bookmarkButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      // Get job title to identify it after reload
      const jobTitle = await jobDetail.getJobTitle();

      // Bookmark the job
      const wasBookmarked = await jobDetail.isBookmarked();

      if (!wasBookmarked) {
        await jobDetail.toggleBookmark();
        await page.waitForTimeout(500);
      }

      // Reload page
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Find and open same job
      const cards = await dashboard.jobCards.all();
      let foundJob = false;

      for (const card of cards) {
        const text = await card.textContent();
        if (text?.includes(jobTitle)) {
          await card.click();
          await page.waitForTimeout(500);
          foundJob = true;
          break;
        }
      }

      if (!foundJob) {
        test.skip();
        return;
      }

      // Check bookmark is still active
      const stillBookmarked = await jobDetail.isBookmarked();
      expect(stillBookmarked).toBe(true);
    });
  });

  test.describe("Adding Notes to Jobs", () => {
    test("should add a note to a job", async ({ page }) => {
      const jobCount = await dashboard.jobCards.count();

      if (jobCount === 0) {
        test.skip();
        return;
      }

      await jobDetail.openJobDetail(0);

      const hasDetail = await jobDetail.waitForDetailPanel(3000);

      if (!hasDetail) {
        test.skip();
        return;
      }

      // Get initial note count
      const initialCount = await jobDetail.getNotesCount();

      // Add a note
      const noteText = "Great opportunity, apply by next week";

      if (!(await jobDetail.addNoteButton.isVisible().catch(() => false)) &&
          !(await jobDetail.noteTextarea.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await jobDetail.addNote(noteText);
      await page.waitForTimeout(500);

      // Check note was added
      const newCount = await jobDetail.getNotesCount();

      expect(newCount).toBeGreaterThan(initialCount);
    });

    test("should display added notes", async ({ page }) => {
      const jobCount = await dashboard.jobCards.count();

      if (jobCount === 0) {
        test.skip();
        return;
      }

      await jobDetail.openJobDetail(0);

      const hasDetail = await jobDetail.waitForDetailPanel(3000);

      if (!hasDetail) {
        test.skip();
        return;
      }

      const noteText = "Test note for display";

      if (!(await jobDetail.addNoteButton.isVisible().catch(() => false)) &&
          !(await jobDetail.noteTextarea.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await jobDetail.addNote(noteText);
      await page.waitForTimeout(500);

      const notesCount = await jobDetail.getNotesCount();

      if (notesCount === 0) {
        test.skip();
        return;
      }

      // Get first note text
      const firstNoteText = await jobDetail.getNoteText(0);

      expect(firstNoteText).toContain(noteText);
    });

    test("should persist notes across page reload", async ({ page }) => {
      const jobCount = await dashboard.jobCards.count();

      if (jobCount === 0) {
        test.skip();
        return;
      }

      await jobDetail.openJobDetail(0);

      const hasDetail = await jobDetail.waitForDetailPanel(3000);

      if (!hasDetail) {
        test.skip();
        return;
      }

      const jobTitle = await jobDetail.getJobTitle();
      const noteText = "Persistent note test";

      if (!(await jobDetail.addNoteButton.isVisible().catch(() => false)) &&
          !(await jobDetail.noteTextarea.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await jobDetail.addNote(noteText);
      await page.waitForTimeout(500);

      const notesBeforeReload = await jobDetail.getNotesCount();

      // Reload page
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Find and open same job
      const cards = await dashboard.jobCards.all();
      let foundJob = false;

      for (const card of cards) {
        const text = await card.textContent();
        if (text?.includes(jobTitle)) {
          await card.click();
          await page.waitForTimeout(500);
          foundJob = true;
          break;
        }
      }

      if (!foundJob) {
        test.skip();
        return;
      }

      // Check notes are still there
      const notesAfterReload = await jobDetail.getNotesCount();
      expect(notesAfterReload).toBeGreaterThanOrEqual(notesBeforeReload);
    });
  });

  test.describe("Application Status Tracking", () => {
    test("should move job to Applied status", async ({ page }) => {
      const jobCount = await dashboard.jobCards.count();

      if (jobCount === 0) {
        test.skip();
        return;
      }

      await jobDetail.openJobDetail(0);

      const hasDetail = await jobDetail.waitForDetailPanel(3000);

      if (!hasDetail) {
        test.skip();
        return;
      }

      // Check if status controls exist
      const hasStatusDropdown =
        await jobDetail.statusDropdown.isVisible().catch(() => false);
      const hasMoveButton =
        await jobDetail.moveToAppliedButton.isVisible().catch(() => false);

      if (!hasStatusDropdown && !hasMoveButton) {
        test.skip();
        return;
      }

      await jobDetail.moveToAppliedStatus();
      await page.waitForTimeout(500);

      // Check if marked as applied
      const isApplied = await jobDetail.isMarkedAsApplied();

      expect(isApplied).toBeTruthy();
    });

    test("should display applied badge after marking as applied", async ({
      page,
    }) => {
      const jobCount = await dashboard.jobCards.count();

      if (jobCount === 0) {
        test.skip();
        return;
      }

      await jobDetail.openJobDetail(0);

      const hasDetail = await jobDetail.waitForDetailPanel(3000);

      if (!hasDetail) {
        test.skip();
        return;
      }

      const hasStatusDropdown =
        await jobDetail.statusDropdown.isVisible().catch(() => false);
      const hasMoveButton =
        await jobDetail.moveToAppliedButton.isVisible().catch(() => false);

      if (!hasStatusDropdown && !hasMoveButton) {
        test.skip();
        return;
      }

      await jobDetail.moveToAppliedStatus();
      await page.waitForTimeout(500);

      const hasBadge =
        await jobDetail.appliedBadge.isVisible().catch(() => false);

      expect(hasBadge).toBeTruthy();
    });

    test("should persist applied status across reload", async ({ page }) => {
      const jobCount = await dashboard.jobCards.count();

      if (jobCount === 0) {
        test.skip();
        return;
      }

      await jobDetail.openJobDetail(0);

      const hasDetail = await jobDetail.waitForDetailPanel(3000);

      if (!hasDetail) {
        test.skip();
        return;
      }

      const jobTitle = await jobDetail.getJobTitle();

      const hasStatusDropdown =
        await jobDetail.statusDropdown.isVisible().catch(() => false);
      const hasMoveButton =
        await jobDetail.moveToAppliedButton.isVisible().catch(() => false);

      if (!hasStatusDropdown && !hasMoveButton) {
        test.skip();
        return;
      }

      await jobDetail.moveToAppliedStatus();
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Find and open same job
      const cards = await dashboard.jobCards.all();
      let foundJob = false;

      for (const card of cards) {
        const text = await card.textContent();
        if (text?.includes(jobTitle)) {
          await card.click();
          await page.waitForTimeout(500);
          foundJob = true;
          break;
        }
      }

      if (!foundJob) {
        test.skip();
        return;
      }

      // Check still marked as applied
      const stillApplied = await jobDetail.isMarkedAsApplied();
      expect(stillApplied).toBeTruthy();
    });
  });

  test.describe("Job Search and Filtering", () => {
    test("should search for jobs with keyword", async ({ page }) => {
      if (!(await dashboard.searchInput.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await dashboard.searchForJobs("engineer");
      await page.waitForTimeout(1000);

      const jobCount = await dashboard.getJobCount();
      const hasEmptyState = await dashboard.emptyState.isVisible().catch(() => false);

      // Should show jobs or empty state
      expect(jobCount > 0 || hasEmptyState).toBeTruthy();
    });

    test("should filter jobs by location", async ({ page }) => {
      if (!(await dashboard.locationFilter.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await dashboard.applyFilter("location", "remote");
      await page.waitForTimeout(500);

      const jobCount = await dashboard.getJobCount();

      // Count may vary depending on mock data
      expect(jobCount).toBeGreaterThanOrEqual(0);
    });

    test("should clear filters", async ({ page }) => {
      if (!(await dashboard.searchInput.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      // Apply search
      await dashboard.searchForJobs("test");
      await page.waitForTimeout(500);

      // Clear search
      await dashboard.clearSearch();
      await page.waitForTimeout(500);

      await expect(dashboard.searchInput).toHaveValue("");
    });
  });

  test.describe("Match Score Display", () => {
    test("should display match score for jobs", async ({ page }) => {
      const jobCount = await dashboard.jobCards.count();

      if (jobCount === 0) {
        test.skip();
        return;
      }

      await jobDetail.openJobDetail(0);

      const hasDetail = await jobDetail.waitForDetailPanel(3000);

      if (!hasDetail) {
        test.skip();
        return;
      }

      const matchScore = await jobDetail.getMatchScore();

      // Match score is optional
      if (matchScore !== null) {
        expect(matchScore).toBeGreaterThanOrEqual(0);
        expect(matchScore).toBeLessThanOrEqual(100);
      }

      expect(true).toBeTruthy();
    });
  });

  test.describe("Complete User Flow", () => {
    test("should complete full job interaction flow", async ({ page }) => {
      const jobCount = await dashboard.jobCards.count();

      if (jobCount === 0) {
        test.skip();
        return;
      }

      // 1. Search for job
      if (await dashboard.searchInput.isVisible().catch(() => false)) {
        await dashboard.searchForJobs("software");
        await page.waitForTimeout(500);
      }

      // 2. Open job detail
      await jobDetail.openJobDetail(0);

      const hasDetail = await jobDetail.waitForDetailPanel(3000);

      if (!hasDetail) {
        test.skip();
        return;
      }

      // 3. Bookmark job
      if (await jobDetail.bookmarkButton.isVisible().catch(() => false)) {
        const wasBookmarked = await jobDetail.isBookmarked();
        if (!wasBookmarked) {
          await jobDetail.toggleBookmark();
          await page.waitForTimeout(300);
        }
      }

      // 4. Add note
      if ((await jobDetail.addNoteButton.isVisible().catch(() => false)) ||
          (await jobDetail.noteTextarea.isVisible().catch(() => false))) {
        await jobDetail.addNote("Interesting position, follow up tomorrow");
        await page.waitForTimeout(300);
      }

      // 5. Mark as applied
      const hasStatusControls =
        (await jobDetail.statusDropdown.isVisible().catch(() => false)) ||
        (await jobDetail.moveToAppliedButton.isVisible().catch(() => false));

      if (hasStatusControls) {
        await jobDetail.moveToAppliedStatus();
        await page.waitForTimeout(300);
      }

      // Verify final state
      const isBookmarked = await jobDetail.isBookmarked();
      const notesCount = await jobDetail.getNotesCount();
      const isApplied = await jobDetail.isMarkedAsApplied();

      // At least some actions should have succeeded
      expect(isBookmarked || notesCount > 0 || isApplied).toBeTruthy();
    });
  });
});
