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
      await dashboard.salaryFilter.fill("150000");

      await expect.poll(() => dashboard.getJobCount()).toBeGreaterThan(0);
      const cards = await dashboard.jobCards.allTextContents();
      expect(cards.every((card) => /\$(?:1[5-9]\d|[2-9]\d{2})k/i.test(card))).toBe(true);
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
      await dashboard.salaryFilter.fill("150000");

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

    test("should block opening a saved public HTTP job link", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem(
          "jobsentinel.mockState.v1",
          JSON.stringify({
            jobs: [
              {
                id: 9103,
                hash: "job-hash-public-http-link",
                title: "Operations Coordinator",
                company: "Example Services",
                location: "Denver, CO",
                description: "Coordinate operations and applicant communications.",
                url: "http://example.com/jobs/operations-coordinator",
                source: "manual",
                salary_min: null,
                salary_max: null,
                remote: false,
                score: 0.72,
                hidden: false,
                bookmarked: false,
                notes: null,
                created_at: new Date().toISOString(),
              },
            ],
          }),
        );
      });

      await dashboard.navigateTo();
      const firstCard = await dashboard.getJobCard(0);

      await expect(firstCard.locator).toContainText("Operations Coordinator");
      await expect(firstCard.locator.locator("[data-testid='job-link-guidance']")).toContainText("Check job link");

      const popupPromise = page
        .waitForEvent("popup", { timeout: 750 })
        .catch(() => null);
      await firstCard.hover();
      await firstCard.viewButton.click();

      await expect(page.getByText("This saved link does not look safe to open.")).toBeVisible();
      expect(await popupPromise).toBeNull();
      await expect(dashboard.mainContent).toBeVisible();
    });

    test("should expose expected hover actions on job card", async () => {
      const firstCard = await dashboard.getJobCard(0);

      await firstCard.hover();

      await expect(firstCard.bookmarkButton).toBeVisible();
      await expect(firstCard.viewButton).toBeVisible();
    });

    test("should flag malformed listed pay without showing it as a range", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem(
          "jobsentinel.mockState.v1",
          JSON.stringify({
            jobs: [
              {
                id: 9101,
                hash: "job-hash-malformed-pay",
                title: "Program Coordinator",
                company: "Community Services Group",
                location: "Denver, CO",
                description:
                  "Coordinate service delivery, scheduling, and participant follow-up across community programs.",
                url: "https://example.com/jobs/malformed-pay",
                source: "greenhouse",
                salary_min: 120000,
                salary_max: 70000,
                remote: false,
                score: 0.82,
                hidden: false,
                bookmarked: false,
                notes: null,
                created_at: new Date().toISOString(),
              },
            ],
          }),
        );
      });

      await dashboard.navigateTo();
      const card = dashboard.jobCards.first();

      await expect(card).toContainText("Pay not listed");
      await expect(card).toContainText("Check listed pay");
      await expect(card).toContainText("could not be read as a usable range");
      await expect(card).not.toContainText("$120k - $70k");
    });

    test("should flag MVR and auto-insurance requirements before preparing a form", async ({ page }) => {
      await page.evaluate(() => {
        const now = new Date().toISOString();
        localStorage.setItem(
          "jobsentinel.mockState.v1",
          JSON.stringify({
            jobs: [
              {
                id: 9102,
                hash: "job-hash-application-preview-mvr",
                title: "Field Operations Coordinator",
                company: "Community Services Group",
                location: "Denver, CO",
                description:
                  "Required: clean driving record, MVR review, and proof of auto insurance for field visits.",
                url: "https://example.com/jobs/application-preview-mvr",
                source: "greenhouse",
                salary_min: 70000,
                salary_max: 84000,
                remote: false,
                score: 0.82,
                hidden: false,
                bookmarked: false,
                notes: null,
                created_at: now,
              },
            ],
            applicationProfile: {
              fullName: "Jordan Lee",
              email: "jordan@example.com",
              usWorkAuthorized: true,
              requiresSponsorship: false,
            },
            screeningAnswers: [
              {
                id: 77,
                questionPattern: "proof of auto insurance",
                answer: "I have current auto insurance for field visits.",
                answerType: "yes_no",
                notes: null,
                createdAt: now,
                updatedAt: now,
              },
            ],
          }),
        );
      });

      await dashboard.navigateTo();
      const card = await dashboard.getJobCard(0);
      await expect(card.locator).toContainText("Field Operations Coordinator");

      await card.hover();
      await expect(card.applyButton).toBeEnabled();
      await card.applyButton.click();

      await expect(page.getByRole("dialog", { name: "Review Application" })).toBeVisible();
      await expect(page.getByText("Hard Question Review")).toBeVisible();
      await expect(page.getByText("Driving record, vehicle, or insurance")).toBeVisible();
      await expect(page.getByText(
        "Saved driving record or insurance answer says: I have current auto insurance for field visits. Confirm it matches the employer's wording and resume evidence before continuing.",
      )).toBeVisible();
    });
  });

  test.describe("Job Import Modal", () => {
    test("should block plain HTTP imports from the dashboard", async ({ page }) => {
      await page.getByRole("button", { name: "Import Job" }).click();

      const dialog = page.getByRole("dialog", { name: "Import Job from Link" });
      await expect(dialog).toBeVisible();

      await dialog.getByLabel("Job link").fill("http://example.com/jobs/office-manager");
      await dialog.getByRole("button", { name: "Check Job Link" }).click();

      await expect(dialog.getByRole("alert")).toContainText(
        "Paste an https job posting link from your browser address bar.",
      );

      await dialog.getByLabel("Job link").fill("http://localhost:4321/private-job");
      await dialog.getByRole("button", { name: "Check Job Link" }).click();

      await expect(dialog.getByRole("alert")).toContainText(
        "Paste a public job posting link from your browser address bar.",
      );
    });

    test("should keep blocked HTTP import guidance visible on narrow screens", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "Import Job" }).click();

      const dialog = page.getByRole("dialog", { name: "Import Job from Link" });
      await expect(dialog).toBeVisible();

      await dialog.getByLabel("Job link").fill("http://example.com/jobs/office-manager");
      await dialog.getByRole("button", { name: "Check Job Link" }).click();

      await expect(dialog.getByRole("alert")).toContainText(
        "Paste an https job posting link from your browser address bar.",
      );

      const metrics = await page.evaluate(() => {
        return {
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
        };
      });

      expect(Math.max(metrics.documentWidth, metrics.bodyWidth)).toBeLessThanOrEqual(metrics.viewportWidth);
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
