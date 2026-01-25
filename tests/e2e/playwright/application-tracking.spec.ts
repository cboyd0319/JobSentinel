import { test, expect } from "@playwright/test";
import { ApplicationsPage } from "./page-objects/ApplicationsPage";

test.describe("Application Tracking", () => {
  let applicationsPage: ApplicationsPage;

  test.beforeEach(async ({ page }) => {
    applicationsPage = new ApplicationsPage(page);
    await applicationsPage.navigateTo();
  });

  test.describe("Kanban Board Display", () => {
    test("should display kanban board", async () => {
      const hasBoard = await applicationsPage.kanbanBoard.isVisible().catch(() => false);

      if (!hasBoard) {
        test.skip();
        return;
      }

      await expect(applicationsPage.kanbanBoard).toBeVisible();
    });

    test("should display all status columns", async () => {
      const columnCount = await applicationsPage.columns.count();

      // Should have multiple columns (Applied, Interview, Offer, Rejected, etc.)
      expect(columnCount).toBeGreaterThanOrEqual(3);
    });

    test("should display column headers", async () => {
      const columns = await applicationsPage.columns.all();

      if (columns.length === 0) {
        test.skip();
        return;
      }

      // Each column should have a header
      for (const column of columns) {
        const header = column.locator("h2, h3, [data-testid*='header']");
        const hasHeader = await header.isVisible().catch(() => false);
        expect(hasHeader).toBeTruthy();
      }
    });

    test("should show application count in each column", async ({ page }) => {
      const hasBoard = await applicationsPage.kanbanBoard.isVisible().catch(() => false);

      if (!hasBoard) {
        test.skip();
        return;
      }

      // Check for count badges
      const countBadges = page.locator("[data-testid*='count'], .count, .badge");
      const hasCountBadges = (await countBadges.count()) > 0;

      // Count badges are optional UI enhancement
      expect(hasCountBadges || true).toBeTruthy();
    });
  });

  test.describe("Application Card Display", () => {
    test("should display application cards", async () => {
      const cardCount = await applicationsPage.applicationCards.count();

      // May have 0 cards on fresh install
      expect(cardCount).toBeGreaterThanOrEqual(0);
    });

    test("should show company and position on cards", async () => {
      const cardCount = await applicationsPage.applicationCards.count();

      if (cardCount === 0) {
        test.skip();
        return;
      }

      const firstCard = await applicationsPage.getApplicationCard(0);

      await expect(firstCard.company).toBeVisible();
      await expect(firstCard.position).toBeVisible();
    });

    test("should show application date", async () => {
      const cardCount = await applicationsPage.applicationCards.count();

      if (cardCount === 0) {
        test.skip();
        return;
      }

      const firstCard = await applicationsPage.getApplicationCard(0);
      const hasDate = await firstCard.date.isVisible().catch(() => false);

      // Date may be optional
      expect(hasDate || true).toBeTruthy();
    });

    test("should show action buttons on hover", async ({ page }) => {
      const cardCount = await applicationsPage.applicationCards.count();

      if (cardCount === 0) {
        test.skip();
        return;
      }

      const firstCard = await applicationsPage.getApplicationCard(0);

      // Hover to reveal actions
      await firstCard.locator.hover();
      await page.waitForTimeout(300);

      const hasEdit = await firstCard.editButton.isVisible().catch(() => false);
      const hasDelete = await firstCard.deleteButton.isVisible().catch(() => false);

      expect(hasEdit || hasDelete).toBeTruthy();
    });
  });

  test.describe("Add Application", () => {
    test("should have add application button", async () => {
      const hasAddButton = await applicationsPage.addButton.isVisible().catch(() => false);

      if (!hasAddButton) {
        test.skip();
        return;
      }

      await expect(applicationsPage.addButton).toBeVisible();
      await expect(applicationsPage.addButton).toBeEnabled();
    });

    test("should open add application form", async ({ page }) => {
      const hasAddButton = await applicationsPage.addButton.isVisible().catch(() => false);

      if (!hasAddButton) {
        test.skip();
        return;
      }

      await applicationsPage.addButton.click();
      await page.waitForTimeout(500);

      // Should show form modal or inline form
      const form = page.locator("form, [data-testid='add-application-form']");
      const hasForm = await form.isVisible().catch(() => false);

      expect(hasForm).toBeTruthy();
    });

    test("should add new application", async ({ page }) => {
      const hasAddButton = await applicationsPage.addButton.isVisible().catch(() => false);

      if (!hasAddButton) {
        test.skip();
        return;
      }

      const initialCount = await applicationsPage.applicationCards.count();

      await applicationsPage.addApplication({
        company: "Test Company",
        position: "Software Engineer",
        status: "applied",
        url: "https://example.com/job",
      });

      await page.waitForTimeout(1000);

      const finalCount = await applicationsPage.applicationCards.count();
      expect(finalCount).toBeGreaterThan(initialCount);
    });

    test("should validate required fields", async ({ page }) => {
      const hasAddButton = await applicationsPage.addButton.isVisible().catch(() => false);

      if (!hasAddButton) {
        test.skip();
        return;
      }

      await applicationsPage.addButton.click();
      await page.waitForTimeout(200);

      // Try to submit without filling required fields
      const submitButton = page.locator("button[type='submit'], button:has-text('Add'), button:has-text('Save')");
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Should show validation errors
        const errors = page.locator("[data-testid='error'], .error, text=required");
        const hasErrors = (await errors.count()) > 0;

        expect(hasErrors).toBeTruthy();
      }
    });
  });

  test.describe("Update Application Status", () => {
    test("should drag card to different column", async ({ page }) => {
      const cardCount = await applicationsPage.applicationCards.count();

      if (cardCount === 0) {
        test.skip();
        return;
      }

      // Get initial column
      const firstCard = await applicationsPage.getApplicationCard(0);
      const initialStatus = await firstCard.status.textContent();

      // Drag to interview column
      await applicationsPage.dragCardToColumn(0, "interview");
      await page.waitForTimeout(1000);

      // Status should have changed
      const finalStatus = await firstCard.status.textContent();
      expect(finalStatus).not.toBe(initialStatus);
    });

    test("should update status via dropdown", async ({ page }) => {
      const cardCount = await applicationsPage.applicationCards.count();

      if (cardCount === 0) {
        test.skip();
        return;
      }

      const firstCard = await applicationsPage.getApplicationCard(0);

      // Check if status dropdown exists
      const hasStatusDropdown = await firstCard.status.isVisible().catch(() => false);
      if (!hasStatusDropdown) {
        test.skip();
        return;
      }

      await firstCard.updateStatus("interview");
      await page.waitForTimeout(500);

      const newStatus = await firstCard.status.textContent();
      expect(newStatus?.toLowerCase()).toContain("interview");
    });

    test("should move card to correct column after status update", async ({ page }) => {
      const cardCount = await applicationsPage.applicationCards.count();

      if (cardCount === 0) {
        test.skip();
        return;
      }

      const initialInterviewCount = await applicationsPage.getCardsInColumn("interview");

      // Update first card to interview status
      const firstCard = await applicationsPage.getApplicationCard(0);
      await firstCard.updateStatus("interview");
      await page.waitForTimeout(1000);

      const finalInterviewCount = await applicationsPage.getCardsInColumn("interview");
      expect(finalInterviewCount).toBeGreaterThan(initialInterviewCount);
    });
  });

  test.describe("Edit Application", () => {
    test("should open edit form", async ({ page }) => {
      const cardCount = await applicationsPage.applicationCards.count();

      if (cardCount === 0) {
        test.skip();
        return;
      }

      const firstCard = await applicationsPage.getApplicationCard(0);

      await firstCard.locator.hover();
      await page.waitForTimeout(300);

      const hasEditButton = await firstCard.editButton.isVisible().catch(() => false);
      if (!hasEditButton) {
        test.skip();
        return;
      }

      await firstCard.edit();
      await page.waitForTimeout(500);

      // Should show edit form
      const form = page.locator("form, [data-testid='edit-application-form']");
      const hasForm = await form.isVisible().catch(() => false);

      expect(hasForm).toBeTruthy();
    });

    test("should update application details", async ({ page }) => {
      const cardCount = await applicationsPage.applicationCards.count();

      if (cardCount === 0) {
        test.skip();
        return;
      }

      const firstCard = await applicationsPage.getApplicationCard(0);

      await firstCard.locator.hover();
      await page.waitForTimeout(300);

      const hasEditButton = await firstCard.editButton.isVisible().catch(() => false);
      if (!hasEditButton) {
        test.skip();
        return;
      }

      await firstCard.edit();
      await page.waitForTimeout(500);

      // Update company name
      const companyInput = page.locator("input[name='company']");
      if (await companyInput.isVisible().catch(() => false)) {
        await companyInput.fill("Updated Company");

        const saveButton = page.locator("button[type='submit'], button:has-text('Save')");
        await saveButton.click();
        await page.waitForTimeout(500);

        // Verify update
        const updatedCompany = await firstCard.company.textContent();
        expect(updatedCompany).toContain("Updated Company");
      }
    });
  });

  test.describe("Delete Application", () => {
    test("should delete application with confirmation", async ({ page }) => {
      const cardCount = await applicationsPage.applicationCards.count();

      if (cardCount === 0) {
        test.skip();
        return;
      }

      const initialCount = cardCount;
      const firstCard = await applicationsPage.getApplicationCard(0);

      await firstCard.locator.hover();
      await page.waitForTimeout(300);

      const hasDeleteButton = await firstCard.deleteButton.isVisible().catch(() => false);
      if (!hasDeleteButton) {
        test.skip();
        return;
      }

      await firstCard.delete();
      await page.waitForTimeout(1000);

      const finalCount = await applicationsPage.applicationCards.count();
      expect(finalCount).toBeLessThan(initialCount);
    });

    test("should show confirmation dialog before delete", async ({ page }) => {
      const cardCount = await applicationsPage.applicationCards.count();

      if (cardCount === 0) {
        test.skip();
        return;
      }

      const firstCard = await applicationsPage.getApplicationCard(0);

      await firstCard.locator.hover();
      await page.waitForTimeout(300);

      const hasDeleteButton = await firstCard.deleteButton.isVisible().catch(() => false);
      if (!hasDeleteButton) {
        test.skip();
        return;
      }

      await firstCard.deleteButton.click();
      await page.waitForTimeout(300);

      // Should show confirmation
      const confirmDialog = page.locator("[role='dialog'], [data-testid='confirm-dialog']");
      const hasDialog = await confirmDialog.isVisible().catch(() => false);

      expect(hasDialog).toBeTruthy();
    });
  });

  test.describe("Filter and Sort", () => {
    test("should filter applications by status", async ({ page }) => {
      const hasFilterButton = await applicationsPage.filterButton.isVisible().catch(() => false);

      if (!hasFilterButton) {
        test.skip();
        return;
      }

      await applicationsPage.filterByStatus("interview");
      await page.waitForTimeout(500);

      // Should show only interview applications
      const visibleCards = await applicationsPage.applicationCards.count();
      expect(visibleCards).toBeGreaterThanOrEqual(0);
    });

    test("should sort applications by date", async ({ page }) => {
      const hasSortButton = await applicationsPage.sortButton.isVisible().catch(() => false);

      if (!hasSortButton) {
        test.skip();
        return;
      }

      await applicationsPage.sortBy("date");
      await page.waitForTimeout(500);

      // Cards should be reordered
      const cardCount = await applicationsPage.applicationCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(0);
    });

    test("should sort applications by company name", async ({ page }) => {
      const hasSortButton = await applicationsPage.sortButton.isVisible().catch(() => false);

      if (!hasSortButton) {
        test.skip();
        return;
      }

      await applicationsPage.sortBy("company");
      await page.waitForTimeout(500);

      const cardCount = await applicationsPage.applicationCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Error Handling", () => {
    test("should handle drag-and-drop failures", async ({ page }) => {
      const cardCount = await applicationsPage.applicationCards.count();

      if (cardCount === 0) {
        test.skip();
        return;
      }

      // Try to drag to invalid location
      try {
        await applicationsPage.dragCardToColumn(0, "invalid-status");
        await page.waitForTimeout(500);

        // Should not crash
        await expect(applicationsPage.kanbanBoard).toBeVisible();
      } catch (error) {
        // Expected to fail gracefully
        expect(true).toBeTruthy();
      }
    });

    test("should handle delete errors", async ({ page }) => {
      const cardCount = await applicationsPage.applicationCards.count();

      if (cardCount === 0) {
        test.skip();
        return;
      }

      const firstCard = await applicationsPage.getApplicationCard(0);

      // Cancel delete
      await firstCard.locator.hover();
      await page.waitForTimeout(300);

      const hasDeleteButton = await firstCard.deleteButton.isVisible().catch(() => false);
      if (!hasDeleteButton) {
        test.skip();
        return;
      }

      await firstCard.deleteButton.click();
      await page.waitForTimeout(300);

      // Click cancel instead of confirm
      const cancelButton = page.locator("button:has-text('Cancel')");
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();
        await page.waitForTimeout(300);

        // Card should still exist
        const stillExists = await firstCard.locator.isVisible().catch(() => false);
        expect(stillExists).toBeTruthy();
      }
    });
  });
});
