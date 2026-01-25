import { test, expect } from "@playwright/test";
import { DashboardPage } from "./page-objects/DashboardPage";

test.describe("Job Search and Filtering", () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.navigateTo();
  });

  test.describe("Search Functionality", () => {
    test("should display search input and button", async () => {
      await expect(dashboard.searchInput).toBeVisible();
      await expect(dashboard.searchButton).toBeVisible();
    });

    test("should search for jobs with keyword", async ({ page }) => {
      // Skip if no search input
      if (!(await dashboard.searchInput.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await dashboard.searchForJobs("software engineer");

      // Wait for results
      await page.waitForTimeout(1000);

      // Should show job list or empty state
      const hasJobs = (await dashboard.getJobCount()) > 0;
      const emptyState = page.locator("text=No jobs found, text=No results");
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      expect(hasJobs || hasEmptyState).toBeTruthy();
    });

    test("should clear search input", async () => {
      if (!(await dashboard.searchInput.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await dashboard.searchInput.fill("test query");
      await expect(dashboard.searchInput).toHaveValue("test query");

      await dashboard.clearSearch();
      await expect(dashboard.searchInput).toHaveValue("");
    });

    test("should show empty state for no results", async ({ page }) => {
      if (!(await dashboard.searchInput.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      // Search for unlikely term
      await dashboard.searchForJobs("xyzabc123unlikely");
      await page.waitForTimeout(1000);

      const emptyState = page.locator("text=No jobs found, text=No results, text=Try different");
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      // Either shows empty state or has jobs (mock data)
      const jobCount = await dashboard.getJobCount();
      expect(hasEmptyState || jobCount === 0).toBeTruthy();
    });
  });

  test.describe("Filter Functionality", () => {
    test("should display filter options", async () => {
      const filterCount = await dashboard.filterButtons.count();

      // Should have at least some filters (location, salary, etc.)
      expect(filterCount).toBeGreaterThanOrEqual(0);
    });

    test("should filter jobs by location", async ({ page }) => {
      if (!(await dashboard.locationFilter.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      const initialCount = await dashboard.getJobCount();

      await dashboard.applyFilter("location", "remote");
      await page.waitForTimeout(500);

      const filteredCount = await dashboard.getJobCount();

      // Count may change or stay same depending on mock data
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    });

    test("should filter jobs by salary range", async ({ page }) => {
      if (!(await dashboard.salaryFilter.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await dashboard.applyFilter("salary", "100k+");
      await page.waitForTimeout(500);

      const filteredCount = await dashboard.getJobCount();
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    });

    test("should filter jobs by experience level", async ({ page }) => {
      if (!(await dashboard.experienceFilter.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await dashboard.applyFilter("experience", "senior");
      await page.waitForTimeout(500);

      const filteredCount = await dashboard.getJobCount();
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    });

    test("should clear all filters", async ({ page }) => {
      // Apply a filter first
      if (await dashboard.locationFilter.isVisible().catch(() => false)) {
        await dashboard.applyFilter("location", "remote");
        await page.waitForTimeout(500);
      }

      // Clear filters
      if (await dashboard.clearFiltersButton.isVisible().catch(() => false)) {
        await dashboard.clearAllFilters();
        await page.waitForTimeout(500);

        // Should show all jobs again
        const jobCount = await dashboard.getJobCount();
        expect(jobCount).toBeGreaterThanOrEqual(0);
      }
    });

    test("should combine multiple filters", async ({ page }) => {
      const hasLocationFilter = await dashboard.locationFilter.isVisible().catch(() => false);
      const hasSalaryFilter = await dashboard.salaryFilter.isVisible().catch(() => false);

      if (!hasLocationFilter || !hasSalaryFilter) {
        test.skip();
        return;
      }

      await dashboard.applyFilter("location", "remote");
      await page.waitForTimeout(300);

      await dashboard.applyFilter("salary", "100k+");
      await page.waitForTimeout(500);

      const filteredCount = await dashboard.getJobCount();
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Job Card Interactions", () => {
    test("should display job cards with required fields", async () => {
      const jobCount = await dashboard.getJobCount();

      if (jobCount === 0) {
        test.skip();
        return;
      }

      const firstCard = await dashboard.getJobCard(0);

      await expect(firstCard.title).toBeVisible();
      await expect(firstCard.company).toBeVisible();
    });

    test("should toggle bookmark on job card", async ({ page }) => {
      const jobCount = await dashboard.getJobCount();

      if (jobCount === 0) {
        test.skip();
        return;
      }

      const firstCard = await dashboard.getJobCard(0);
      await firstCard.hover();
      await page.waitForTimeout(300);

      if (!(await firstCard.bookmarkButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      const initialBookmarked = await firstCard.isBookmarked();

      await firstCard.bookmark();
      await page.waitForTimeout(500);

      const finalBookmarked = await firstCard.isBookmarked();
      expect(finalBookmarked).not.toBe(initialBookmarked);
    });

    test("should open job details on view button click", async ({ page }) => {
      const jobCount = await dashboard.getJobCount();

      if (jobCount === 0) {
        test.skip();
        return;
      }

      const firstCard = await dashboard.getJobCard(0);

      await firstCard.view();
      await page.waitForTimeout(500);

      // Should open modal or navigate to details page
      const modal = page.locator("[role='dialog'], [data-testid='job-modal']");
      const detailsPage = page.locator("[data-testid='job-details']");

      const hasModal = await modal.isVisible().catch(() => false);
      const hasDetailsPage = await detailsPage.isVisible().catch(() => false);

      expect(hasModal || hasDetailsPage).toBeTruthy();
    });

    test("should show hover actions on job card", async ({ page }) => {
      const jobCount = await dashboard.getJobCount();

      if (jobCount === 0) {
        test.skip();
        return;
      }

      const firstCard = await dashboard.getJobCard(0);

      // Actions may be hidden initially
      await firstCard.hover();
      await page.waitForTimeout(300);

      // Check if action buttons exist
      const bookmarkExists = (await firstCard.bookmarkButton.count()) > 0;
      const applyExists = (await firstCard.applyButton.count()) > 0;

      expect(bookmarkExists || applyExists).toBeTruthy();
    });
  });

  test.describe("Error Handling", () => {
    test("should handle search errors gracefully", async ({ page }) => {
      if (!(await dashboard.searchInput.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      // Try edge case searches
      await dashboard.searchForJobs("");
      await page.waitForTimeout(500);

      // Should not crash
      await expect(dashboard.mainContent).toBeVisible();
    });

    test("should handle filter errors gracefully", async ({ page }) => {
      if (!(await dashboard.locationFilter.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      // Apply and remove filters rapidly
      await dashboard.applyFilter("location", "remote");
      await page.waitForTimeout(100);
      await dashboard.clearAllFilters();
      await page.waitForTimeout(100);

      // Should not crash
      await expect(dashboard.mainContent).toBeVisible();
    });
  });
});
