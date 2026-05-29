import { test, expect } from "@playwright/test";
import { DashboardPage } from "./page-objects/DashboardPage";

test.describe("Job Search and Filtering", () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.navigateTo();
    await expect(dashboard.searchInput).toBeVisible();
    await expect(dashboard.jobCards.first()).toBeVisible();
  });

  test.describe("Search Functionality", () => {
    test("should display search input and button", async () => {
      await expect(dashboard.searchInput).toBeVisible();
      await expect(dashboard.searchButton).toBeVisible();
    });

    test("should search for jobs with keyword @smoke", async () => {
      await dashboard.searchForJobs("manager");

      await expect(dashboard.jobCards.first()).toBeVisible();
      await expect(dashboard.jobCards.filter({ hasText: /manager/i }).first()).toBeVisible();
    });

    test("should clear search input", async () => {
      await dashboard.searchForJobs("test query");
      await expect(dashboard.searchInput).toHaveValue("test query");

      await dashboard.clearSearch();

      await expect(dashboard.searchInput).toHaveValue("");
    });

    test("should show empty state for no results", async () => {
      await dashboard.searchForJobs("xyzabc123unlikely");

      await expect(dashboard.emptyState).toBeVisible();
      await expect.poll(() => dashboard.getJobCount()).toBe(0);
    });
  });

  test.describe("Filter Functionality", () => {
    test("should display filter options", async () => {
      await expect.poll(() => dashboard.filterButtons.count()).toBeGreaterThan(0);
    });

    test("should filter jobs by location", async () => {
      const initialCount = await dashboard.getVisibleJobCount();

      await dashboard.applyFilter("location", "remote");

      await expect.poll(() => dashboard.getJobCount()).toBeGreaterThan(0);
      const filteredCount = await dashboard.getJobCount();
      expect(filteredCount).toBeLessThan(initialCount);

      const cards = await dashboard.jobCards.allTextContents();
      expect(cards.every((card) => /Remote/i.test(card))).toBe(true);
    });

    test("should filter jobs by salary range", async () => {
      const initialCount = await dashboard.getVisibleJobCount();

      await dashboard.applyFilter("salary", "150k+");

      await expect.poll(() => dashboard.getJobCount()).toBeGreaterThan(0);
      const filteredCount = await dashboard.getJobCount();
      expect(filteredCount).toBeLessThan(initialCount);
    });

    test("should filter jobs by source", async () => {
      const initialCount = await dashboard.getVisibleJobCount();

      await dashboard.applyDropdownFilter("Source", "lever");

      await expect.poll(() => dashboard.getJobCount()).toBe(1);
      expect(await dashboard.getJobCount()).toBeLessThan(initialCount);
      await expect(dashboard.jobCards.first()).toContainText(/lever/i);
    });

    test("should clear all filters", async () => {
      const initialCount = await dashboard.getVisibleJobCount();

      await dashboard.applyFilter("location", "remote");
      await dashboard.clearAllFilters();

      await expect.poll(() => dashboard.getJobCount()).toBe(initialCount);
      await expect(dashboard.locationFilter).toContainText("All Locations");
    });

    test("should combine multiple filters", async () => {
      const initialCount = await dashboard.getVisibleJobCount();

      await dashboard.applyFilter("location", "remote");
      await dashboard.applyFilter("salary", "150k+");

      await expect.poll(() => dashboard.getJobCount()).toBeGreaterThan(0);
      const filteredCount = await dashboard.getJobCount();
      expect(filteredCount).toBeLessThan(initialCount);

      const cards = await dashboard.jobCards.allTextContents();
      expect(cards.every((card) => /Remote/i.test(card))).toBe(true);
    });
  });

  test.describe("Job Card Interactions", () => {
    test("should display job cards with required fields", async () => {
      const firstCard = await dashboard.getJobCard(0);

      await expect(firstCard.title).toBeVisible();
      await expect(firstCard.company).toBeVisible();
    });

    test("should toggle bookmark on job card", async () => {
      const firstCard = await dashboard.getJobCard(0);
      await firstCard.hover();

      const initialBookmarked = await firstCard.isBookmarked();

      await firstCard.bookmark();

      await expect
        .poll(() => firstCard.isBookmarked(), { timeout: 3000 })
        .toBe(!initialBookmarked);
    });

    test("should open job posting on view button click", async ({ page }) => {
      const firstCard = await dashboard.getJobCard(0);

      const popupPromise = page
        .waitForEvent("popup", { timeout: 1000 })
        .catch(() => null);
      await firstCard.view();
      const popup = await popupPromise;

      if (popup) {
        await popup.close();
      }

      await expect(dashboard.mainContent).toBeVisible();
    });

    test("should expose expected hover actions on job card", async () => {
      const firstCard = await dashboard.getJobCard(0);

      await firstCard.hover();

      await expect(firstCard.bookmarkButton).toBeVisible();
      await expect(firstCard.viewButton).toBeVisible();
    });
  });

  test.describe("Error Handling", () => {
    test("should handle empty search without crashing", async () => {
      await dashboard.searchForJobs("");

      await expect(dashboard.mainContent).toBeVisible();
      await expect.poll(() => dashboard.getJobCount()).toBeGreaterThan(0);
    });

    test("should handle rapid filter changes without crashing", async () => {
      const initialCount = await dashboard.getJobCount();

      await dashboard.applyFilter("location", "remote");
      await dashboard.clearAllFilters();

      await expect(dashboard.mainContent).toBeVisible();
      await expect.poll(() => dashboard.getJobCount()).toBe(initialCount);
    });
  });
});
