import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App, { StartupRecovery } from "./App";
import * as feedbackService from "../services/feedbackService";

const mockInvoke = vi.mocked(invoke);

vi.mock("../utils/errorUtils", () => ({
  logError: vi.fn(),
}));

describe("App startup recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows recovery instead of first-run setup when startup status fails", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("permission denied"));

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /could not open saved setup/i,
        }),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy Safe Support Report" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Safe Support Report" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/pick a career path/i)).not.toBeInTheDocument();
  });

  it("lets users copy a safe support report from startup recovery", async () => {
    const user = userEvent.setup();
    vi.spyOn(feedbackService, "copySanitizedDebugReport").mockResolvedValueOnce({
      content: "safe report",
      copied: true,
      errorCount: 0,
    });

    render(<StartupRecovery onRetry={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Copy Safe Support Report" }));

    expect(feedbackService.copySanitizedDebugReport).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Safe support report copied")).toBeInTheDocument();
  });

  it("opens the documented Search Links page from navigation", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(false);

    render(<App />);

    await user.click(
      await screen.findByRole("button", { name: "Search Links (Cmd/Ctrl+9)" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Job Site Search Links" }),
    ).toBeInTheDocument();
  });
});
