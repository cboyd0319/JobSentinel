import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  DEFAULT_PREFS,
  mockInvoke,
  mockToast,
  resetNotificationPreferencesMocks,
} from "./NotificationPreferences.testSupport";
import { NotificationPreferences as NotificationPreferencesComponent } from "./NotificationPreferences";

describe("NotificationPreferences error handling", () => {
  beforeEach(resetNotificationPreferencesMocks);
  describe("error handling", () => {
    it("does not show default alert rules when loading saved rules fails", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Load failed"));

      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Could not load alert rules. Your saved choices were not changed.",
          ),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText("Try again before changing alert rules."),
      ).toBeInTheDocument();
      expect(screen.queryByText("All job alerts")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /try again/i }),
      ).toBeInTheDocument();
    });

    it("shows error toast when save fails", async () => {
      mockInvoke
        .mockResolvedValueOnce(DEFAULT_PREFS) // initial load
        .mockRejectedValueOnce(new Error("Save failed")); // save fails

      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("All job alerts")).toBeInTheDocument();
      });

      // Toggle to trigger save
      const toggles = screen.getAllByRole("checkbox");
      fireEvent.click(toggles[0]);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Could not save alert settings",
          "Your last change was undone. Try again, or copy a safe support report if this keeps happening.",
        );
      });
    });
  });
});
