/** Tests first-run choices, optional guidance, and failure-safe setup saves. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../app/providers/ToastProvider";
import SetupWizard from "./SetupWizard";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const mockInvoke = vi.mocked(invoke);
const mockOnComplete = vi.fn();

function renderWizard(onSkip = vi.fn()) {
  return render(
    <ToastProvider>
      <SetupWizard onComplete={mockOnComplete} onSkip={onSkip} />
    </ToastProvider>,
  );
}

async function reachReview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /build my search/i }));
  await user.click(screen.getByRole("button", { name: /add office assistant job title/i }));
  await user.click(screen.getByRole("button", { name: /^continue$/i }));
  await user.click(screen.getByRole("button", { name: /^continue$/i }));
}

describe("SetupWizard first-run choices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
    window.sessionStorage.clear();
  });

  it("offers optional military guidance without collecting status or saving setup", async () => {
    const user = userEvent.setup();
    renderWizard();
    const guidance = screen.getByText("Military-to-civilian guidance (optional)");
    expect(guidance.closest("details")).not.toHaveAttribute("open");
    await user.click(guidance);
    expect(guidance.closest("details")).toHaveAttribute("open");
    expect(screen.getByText(/export.*docx.*resume library/i)).toBeVisible();
    expect(screen.queryByRole("checkbox", { name: /veteran|disability/i })).not.toBeInTheDocument();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("skips only this session without saving or starting background work", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    renderWizard(onSkip);

    expect(screen.getByText(
      "Skipping lasts only for this session and saves no search. Setup returns next time. You can still review or import local jobs.",
    )).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skip for now" }));

    expect(onSkip).toHaveBeenCalledOnce();
    expect(mockOnComplete).not.toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("retains choices after a save failure and retries the same setup", async () => {
    const user = userEvent.setup();
    const saveSetup = vi.fn().mockRejectedValueOnce(new Error("disk unavailable")).mockResolvedValueOnce(undefined);
    mockInvoke.mockImplementation((command) => command === "complete_setup" ? saveSetup() : Promise.resolve([]));
    renderWizard();
    await reachReview(user);
    await user.click(screen.getByRole("button", { name: /start finding jobs/i }));

    expect(await screen.findByText(
      "Could not save your search setup. Your choices are still here.",
    )).toBeInTheDocument();
    expect(mockOnComplete).not.toHaveBeenCalled();
    expect(screen.getByText("Office Assistant")).toBeInTheDocument();
    const failedArgs = mockInvoke.mock.calls.find(([command]) => command === "complete_setup")?.[1];
    expect(failedArgs).toMatchObject({ config: { title_allowlist: ["Office Assistant"] } });

    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => {
      expect(mockInvoke.mock.calls.filter(([command]) => command === "complete_setup")).toEqual([
        ["complete_setup", failedArgs], ["complete_setup", failedArgs],
      ]);
      expect(mockOnComplete).toHaveBeenCalledOnce();
    });
  });

  it("does not start a second setup save while retrying", async () => {
    const user = userEvent.setup();
    let finishSave: (() => void) | undefined;
    const saveSetup = vi.fn()
      .mockRejectedValueOnce(new Error("disk unavailable"))
      .mockImplementationOnce(() => new Promise<void>((resolve) => {
        finishSave = resolve;
      }));
    mockInvoke.mockImplementation((command) => command === "complete_setup" ? saveSetup() : Promise.resolve([]));
    renderWizard();
    await reachReview(user);
    await user.click(screen.getByRole("button", { name: /start finding jobs/i }));
    await user.click(await screen.findByRole("button", { name: "Try again" }));

    const savingButton = await screen.findByRole("button", { name: "Saving setup" });
    expect(savingButton).toBeDisabled();
    await user.click(savingButton);
    expect(saveSetup).toHaveBeenCalledTimes(2);

    finishSave?.();
    await waitFor(() => expect(mockOnComplete).toHaveBeenCalledOnce());
  });
});
