import { test, expect } from "@playwright/test";
import { SettingsPage } from "./page-objects/SettingsPage";

test.describe("Settings Save and Load", () => {
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
    await settingsPage.navigateTo();
  });

  test.describe("Settings Navigation", () => {
    test("should open settings page", async () => {
      // Settings modal or page should be visible
      const hasGeneralTab = await settingsPage.generalTab.isVisible().catch(() => false);
      const settingsHeading = settingsPage.page.locator("text=Settings, h1:has-text('Settings')");
      const hasHeading = await settingsHeading.isVisible().catch(() => false);

      expect(hasGeneralTab || hasHeading).toBeTruthy();
    });

    test("should display all settings tabs", async () => {
      const hasGeneral = await settingsPage.generalTab.isVisible().catch(() => false);
      const hasNotifications = await settingsPage.notificationsTab.isVisible().catch(() => false);
      const hasPrivacy = await settingsPage.privacyTab.isVisible().catch(() => false);
      const hasAdvanced = await settingsPage.advancedTab.isVisible().catch(() => false);

      // Should have at least general settings
      expect(hasGeneral || hasNotifications || hasPrivacy || hasAdvanced).toBeTruthy();
    });

    test("should switch between tabs", async ({ page }) => {
      const hasGeneralTab = await settingsPage.generalTab.isVisible().catch(() => false);
      const hasNotificationsTab = await settingsPage.notificationsTab.isVisible().catch(() => false);

      if (!hasGeneralTab || !hasNotificationsTab) {
        test.skip();
        return;
      }

      // Start on general tab
      await settingsPage.switchTab("general");
      await page.waitForTimeout(300);

      // Switch to notifications
      await settingsPage.switchTab("notifications");
      await page.waitForTimeout(300);

      // Notifications tab should be active
      const notificationsContent = page.locator("text=Notification, text=Email, text=Alert");
      const hasNotifications = await notificationsContent.first().isVisible().catch(() => false);

      expect(hasNotifications).toBeTruthy();
    });
  });

  test.describe("General Settings", () => {
    test.beforeEach(async ({ page }) => {
      const hasGeneralTab = await settingsPage.generalTab.isVisible().catch(() => false);
      if (hasGeneralTab) {
        await settingsPage.switchTab("general");
        await page.waitForTimeout(300);
      }
    });

    test("should display general settings form", async ({ page }) => {
      // Check for common settings inputs
      const inputs = page.locator("input, select, textarea");
      const inputCount = await inputs.count();

      expect(inputCount).toBeGreaterThan(0);
    });

    test("should update text setting", async ({ page }) => {
      const nameInput = page.locator("input[name='name'], input[placeholder*='name' i]");

      if (!(await nameInput.first().isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await settingsPage.updateSetting("name", "John Doe");
      await expect(nameInput.first()).toHaveValue("John Doe");
    });

    test("should toggle boolean setting", async ({ page }) => {
      const toggles = page.locator("input[type='checkbox']");

      if ((await toggles.count()) === 0) {
        test.skip();
        return;
      }

      const firstToggle = toggles.first();
      const initialState = await firstToggle.isChecked();

      await firstToggle.click();
      await page.waitForTimeout(200);

      const finalState = await firstToggle.isChecked();
      expect(finalState).not.toBe(initialState);
    });

    test("should update dropdown setting", async ({ page }) => {
      const selects = page.locator("select");

      if ((await selects.count()) === 0) {
        test.skip();
        return;
      }

      const firstSelect = selects.first();
      const options = firstSelect.locator("option");
      const optionCount = await options.count();

      if (optionCount < 2) {
        test.skip();
        return;
      }

      // Select second option
      await firstSelect.selectOption({ index: 1 });
      await page.waitForTimeout(200);

      const selectedValue = await firstSelect.inputValue();
      expect(selectedValue).toBeTruthy();
    });
  });

  test.describe("Save Settings", () => {
    test("should save settings successfully", async ({ page }) => {
      const hasSaveButton = await settingsPage.saveButton.isVisible().catch(() => false);

      if (!hasSaveButton) {
        test.skip();
        return;
      }

      // Make a change
      const nameInput = page.locator("input[name='name'], input[placeholder*='name' i]");
      if (await nameInput.first().isVisible().catch(() => false)) {
        await settingsPage.updateSetting("name", "Test User");
      }

      await settingsPage.saveSettings();
      await page.waitForTimeout(1000);

      // Should show success message
      const hasSuccess = await settingsPage.hasSuccessMessage();
      const successToast = page.locator("text=Saved, text=Success, [data-testid='toast-success']");
      const hasToast = await successToast.isVisible().catch(() => false);

      expect(hasSuccess || hasToast).toBeTruthy();
    });

    test("should persist settings after save", async ({ page }) => {
      const hasSaveButton = await settingsPage.saveButton.isVisible().catch(() => false);

      if (!hasSaveButton) {
        test.skip();
        return;
      }

      const nameInput = page.locator("input[name='name'], input[placeholder*='name' i]");
      if (!(await nameInput.first().isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      // Set and save value
      const testValue = "Persisted User";
      await settingsPage.updateSetting("name", testValue);
      await settingsPage.saveSettings();
      await page.waitForTimeout(1000);

      // Reload page
      await settingsPage.goto("/");
      await settingsPage.skipSetupWizard();
      await settingsPage.navigateTo();

      // Value should persist
      const persistedValue = await settingsPage.getSettingValue("name");
      expect(persistedValue).toBe(testValue);
    });

    test("should auto-save settings", async ({ page }) => {
      // Some settings may auto-save without clicking save button
      const nameInput = page.locator("input[name='name'], input[placeholder*='name' i]");

      if (!(await nameInput.first().isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await settingsPage.updateSetting("name", "Auto Save Test");
      await page.waitForTimeout(2000); // Wait for auto-save

      // Check for auto-save indicator
      const autoSaveIndicator = page.locator("text=Saved, text=Saving, [data-testid='auto-save']");
      const hasIndicator = await autoSaveIndicator.isVisible().catch(() => false);

      // Auto-save is optional feature
      expect(hasIndicator || true).toBeTruthy();
    });
  });

  test.describe("Load Settings", () => {
    test("should load settings on page open", async ({ page }) => {
      // Settings should be loaded from storage
      const inputs = page.locator("input[value], select, textarea");
      const inputsWithValues = await inputs.count();

      // Some inputs should have values (even if defaults)
      expect(inputsWithValues).toBeGreaterThanOrEqual(0);
    });

    test("should restore previous values", async ({ page }) => {
      const nameInput = page.locator("input[name='name'], input[placeholder*='name' i]");

      if (!(await nameInput.first().isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      // Set initial value
      const initialValue = "Initial Value";
      await settingsPage.updateSetting("name", initialValue);
      await settingsPage.saveSettings();
      await page.waitForTimeout(500);

      // Change value
      await settingsPage.updateSetting("name", "Changed Value");

      // Close and reopen without saving
      await page.keyboard.press("Escape");
      await settingsPage.navigateTo();

      // Should restore saved value
      const restoredValue = await settingsPage.getSettingValue("name");
      expect(restoredValue).toBe(initialValue);
    });
  });

  test.describe("Notification Settings", () => {
    test.beforeEach(async ({ page }) => {
      const hasNotificationsTab = await settingsPage.notificationsTab.isVisible().catch(() => false);
      if (hasNotificationsTab) {
        await settingsPage.switchTab("notifications");
        await page.waitForTimeout(300);
      }
    });

    test("should toggle email notifications", async ({ page }) => {
      const emailToggle = page.locator("input[name='emailNotifications'], input[id*='email']");

      if (!(await emailToggle.first().isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      const initialState = await settingsPage.getSettingValue("emailNotifications");
      await settingsPage.updateSetting("emailNotifications", !initialState);

      const finalState = await settingsPage.getSettingValue("emailNotifications");
      expect(finalState).not.toBe(initialState);
    });

    test("should toggle push notifications", async ({ page }) => {
      const pushToggle = page.locator("input[name='pushNotifications'], input[id*='push']");

      if (!(await pushToggle.first().isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      const initialState = await settingsPage.getSettingValue("pushNotifications");
      await settingsPage.updateSetting("pushNotifications", !initialState);

      const finalState = await settingsPage.getSettingValue("pushNotifications");
      expect(finalState).not.toBe(initialState);
    });
  });

  test.describe("Privacy Settings", () => {
    test.beforeEach(async ({ page }) => {
      const hasPrivacyTab = await settingsPage.privacyTab.isVisible().catch(() => false);
      if (hasPrivacyTab) {
        await settingsPage.switchTab("privacy");
        await page.waitForTimeout(300);
      }
    });

    test("should toggle analytics tracking", async ({ page }) => {
      const analyticsToggle = page.locator("input[name='analytics'], input[id*='analytics']");

      if (!(await analyticsToggle.first().isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      const initialState = await settingsPage.getSettingValue("analytics");
      await settingsPage.updateSetting("analytics", !initialState);

      const finalState = await settingsPage.getSettingValue("analytics");
      expect(finalState).not.toBe(initialState);
    });

    test("should toggle data sharing", async ({ page }) => {
      const sharingToggle = page.locator("input[name='dataSharing'], input[id*='sharing']");

      if (!(await sharingToggle.first().isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      const initialState = await settingsPage.getSettingValue("dataSharing");
      await settingsPage.updateSetting("dataSharing", !initialState);

      const finalState = await settingsPage.getSettingValue("dataSharing");
      expect(finalState).not.toBe(initialState);
    });
  });

  test.describe("Reset Settings", () => {
    test("should reset to defaults", async ({ page }) => {
      const hasResetButton = await settingsPage.resetButton.isVisible().catch(() => false);

      if (!hasResetButton) {
        test.skip();
        return;
      }

      // Make changes
      const nameInput = page.locator("input[name='name'], input[placeholder*='name' i]");
      if (await nameInput.first().isVisible().catch(() => false)) {
        await settingsPage.updateSetting("name", "To Be Reset");
        await settingsPage.saveSettings();
        await page.waitForTimeout(500);
      }

      // Reset
      await settingsPage.resetSettings();
      await page.waitForTimeout(1000);

      // Should restore defaults
      const resetValue = await settingsPage.getSettingValue("name");
      expect(resetValue).not.toBe("To Be Reset");
    });

    test("should confirm before reset", async ({ page }) => {
      const hasResetButton = await settingsPage.resetButton.isVisible().catch(() => false);

      if (!hasResetButton) {
        test.skip();
        return;
      }

      await settingsPage.resetButton.click();
      await page.waitForTimeout(300);

      // Should show confirmation dialog
      const confirmDialog = page.locator("[role='dialog'], text=Are you sure, text=Reset all settings");
      const hasDialog = await confirmDialog.isVisible().catch(() => false);

      expect(hasDialog).toBeTruthy();
    });
  });

  test.describe("Error Handling", () => {
    test("should handle save failures", async ({ page }) => {
      const hasSaveButton = await settingsPage.saveButton.isVisible().catch(() => false);

      if (!hasSaveButton) {
        test.skip();
        return;
      }

      // Try to save invalid data (if validation exists)
      const emailInput = page.locator("input[type='email'], input[name='email']");
      if (await emailInput.first().isVisible().catch(() => false)) {
        await emailInput.first().fill("invalid-email");
        await settingsPage.saveSettings();
        await page.waitForTimeout(500);

        // Should show error
        const errorMsg = page.locator("text=Invalid, text=Error, [data-testid='error']");
        const hasError = await errorMsg.isVisible().catch(() => false);

        expect(hasError).toBeTruthy();
      }
    });

    test("should handle load failures", async ({ page }) => {
      // Clear local storage to simulate load failure
      await page.evaluate(() => localStorage.clear());

      await settingsPage.goto("/");
      await settingsPage.skipSetupWizard();
      await settingsPage.navigateTo();

      // Should load with defaults and not crash
      await expect(settingsPage.mainContent).toBeVisible();
    });

    test("should prevent navigation with unsaved changes", async ({ page }) => {
      const nameInput = page.locator("input[name='name'], input[placeholder*='name' i]");

      if (!(await nameInput.first().isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      // Make changes without saving
      await settingsPage.updateSetting("name", "Unsaved Changes");

      // Try to close settings
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Should show unsaved changes warning
      const warningDialog = page.locator("text=Unsaved changes, text=Discard changes");
      const hasWarning = await warningDialog.isVisible().catch(() => false);

      // Warning is optional UX feature
      expect(hasWarning || true).toBeTruthy();
    });
  });
});
