/** Exercises explicit update discovery, signed review, cancellation, and failed installer handoff. */
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalUpdatePanel } from "./LocalUpdatePanel";
import type { LocalUpdateReview } from "./localUpdateContract";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("../../../platform/tauri", () => ({ invoke }));
vi.mock("../../../shared/search-links", () => ({ openDeepLink: vi.fn() }));
const status = { trustedPublisherConfigured: true, pendingReview: false, restartRequired: false };
const review: LocalUpdateReview = {
  reviewId: "native-review-1", currentVersion: "3.0.0", targetVersion: "3.0.1",
  direction: "update", packageName: "JobSentinel.dmg", packageBytes: 4096,
  platform: "macos", architecture: "aarch64", edition: "Essentials",
  compatibilitySummary: "Saved data is compatible.",
  componentSummary: ["Essentials app updated; optional models preserved."],
  recoverySummary: "A verified local recovery copy is required before installation.", requiresRestart: true,
};
beforeEach(() => {
  invoke.mockReset();
  invoke.mockImplementation(async (command: string) => {
    if (command === "get_local_update_status") return status;
    if (command === "select_local_update") return review;
    if (command === "check_update_availability") return {
      status: "available", currentVersion: "3.0.0", availableVersion: "3.0.1",
      releaseUrl: "https://github.com/cboyd0319/JobSentinel/releases/tag/v3.0.1",
    };
    if (command === "apply_local_update") return { outcome: "installer_opened", restartRequired: true };
    if (command === "cancel_local_update") return;
    throw new Error(`Unexpected command ${command}`);
  });
});
async function choose() {
  await userEvent.click(screen.getByRole("button", { name: "Review downloaded installer" }));
  return screen.findByRole("heading", { name: /Review (app update|compatible v3 rollback)/ });
}
describe("LocalUpdatePanel", () => {
  it("checks online only on request and does not authorize installation from discovery", async () => {
    render(<LocalUpdatePanel />);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("get_local_update_status"));
    expect(invoke).not.toHaveBeenCalledWith("check_update_availability");
    await userEvent.click(screen.getByRole("button", { name: "Check for updates" }));
    expect(await screen.findByText(/Version 3.0.1 is available/)).toHaveTextContent("Availability does not verify an installer");
    expect(screen.queryByRole("button", { name: /Confirm install/ })).not.toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalledWith("select_local_update");
    expect(screen.getByRole("button", { name: "Open release downloads" })).toBeEnabled();
  });
  it("does not offer an unexpected release link", async () => {
    invoke.mockImplementation(async (command: string) => command === "get_local_update_status" ? status : {
      status: "available", currentVersion: "3.0.0", availableVersion: "3.0.1",
      releaseUrl: "https://github.com/other/repository/releases/tag/v3.0.1",
    });
    render(<LocalUpdatePanel />);
    await userEvent.click(screen.getByRole("button", { name: "Check for updates" }));
    await screen.findByText(/Version 3.0.1 is available/);
    expect(screen.queryByRole("button", { name: "Open release downloads" })).not.toBeInTheDocument();
  });
  it("reviews all native facts and installs only after explicit confirmation", async () => {
    render(<LocalUpdatePanel />);
    const heading = await choose();
    expect(heading).toHaveFocus();
    for (const text of ["3.0.0 → 3.0.1", "JobSentinel.dmg", "4,096 bytes", "macos / aarch64", review.compatibilitySummary, review.componentSummary[0] ?? "", review.recoverySummary]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(invoke).not.toHaveBeenCalledWith("apply_local_update", expect.anything());
    await userEvent.click(screen.getByRole("button", { name: "Confirm install and close app" }));
    expect(invoke).toHaveBeenCalledWith("apply_local_update", { reviewId: review.reviewId });
    expect(await screen.findByText(/Installer opened/)).toHaveTextContent("Installation is not yet confirmed");
    expect(screen.getByRole("button", { name: "Review downloaded installer" })).toBeDisabled();
  });
  it("labels compatible rollback separately and cancels without installing", async () => {
    invoke.mockImplementation(async (command: string) => command === "get_local_update_status" ? status :
      command === "select_local_update" ? { ...review, direction: "rollback", targetVersion: "3.0.0" } : undefined);
    render(<LocalUpdatePanel />);
    await choose();
    expect(screen.getByRole("button", { name: "Confirm rollback and close app" })).toBeEnabled();
    expect(screen.getByText(/does not restore an older copy/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel installer review" }));
    expect(invoke).toHaveBeenCalledWith("cancel_local_update", { reviewId: review.reviewId });
    expect(await screen.findByText(/Installer review cancelled/)).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalledWith("apply_local_update", expect.anything());
  });
  it("fails closed without publisher trust while preserving recovery actions", async () => {
    invoke.mockResolvedValue({ ...status, trustedPublisherConfigured: false });
    render(<LocalUpdatePanel />);
    expect(await screen.findByText(/no trusted update publisher configured/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review downloaded installer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Check for updates" })).toBeEnabled();
    expect(screen.getByRole("link", { name: /Review encrypted backup/ })).toHaveAttribute("href", "#portable-recovery-heading");
  });
  it.each(["reject", "unavailable"])("keeps local review usable after online %s", async (outcome) => {
    invoke.mockImplementation(async (command: string) => {
      if (command === "get_local_update_status") return status;
      if (outcome === "reject") throw new Error("private network detail");
      return { status: "unavailable", currentVersion: "3.0.0", availableVersion: null, releaseUrl: null };
    });
    render(<LocalUpdatePanel />);
    await userEvent.click(screen.getByRole("button", { name: "Check for updates" }));
    expect(await screen.findByText(/Your local work and recovery tools remain available/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review downloaded installer" })).toBeEnabled();
    expect(screen.queryByText(/private network detail/)).not.toBeInTheDocument();
  });
  it("treats chooser cancellation as no review and rejects malformed native review", async () => {
    invoke.mockImplementation(async (command: string) => command === "get_local_update_status" ? status : null);
    render(<LocalUpdatePanel />);
    await userEvent.click(screen.getByRole("button", { name: "Review downloaded installer" }));
    expect(await screen.findByText(/Installer selection cancelled/)).toBeInTheDocument();
    invoke.mockImplementation(async (command: string) => command === "get_local_update_status" ? status : { ...review, packageBytes: -1 });
    await userEvent.click(screen.getByRole("button", { name: "Review downloaded installer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be verified");
    expect(screen.queryByRole("button", { name: /Confirm install/ })).not.toBeInTheDocument();
  });
  it("invalidates failed installation review and reads native restart requirements", async () => {
    let failed = false;
    invoke.mockImplementation(async (command: string) => {
      if (command === "get_local_update_status") return { ...status, restartRequired: failed };
      if (command === "select_local_update") return review;
      failed = true;
      throw new Error("private installer path");
    });
    render(<LocalUpdatePanel />);
    await choose();
    await userEvent.click(screen.getByRole("button", { name: "Confirm install and close app" }));
    expect(await screen.findByText(/Installation could not be confirmed/)).toBeInTheDocument();
    expect(screen.getByText(/Restart JobSentinel before continuing/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirm install/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/private installer path/)).not.toBeInTheDocument();
  });
  it("prevents duplicate installation while native preparation is pending", async () => {
    let finish: ((value: unknown) => void) | undefined;
    invoke.mockImplementation(async (command: string) => command === "get_local_update_status" ? status :
      command === "select_local_update" ? review : new Promise((resolve) => { finish = resolve; }));
    render(<LocalUpdatePanel />);
    await choose();
    const confirm = screen.getByRole("button", { name: "Confirm install and close app" });
    await userEvent.dblClick(confirm);
    expect(confirm).toBeDisabled();
    expect(invoke.mock.calls.filter(([command]) => command === "apply_local_update")).toHaveLength(1);
    await act(async () => finish?.({ outcome: "installer_opened", restartRequired: true }));
  });
});
