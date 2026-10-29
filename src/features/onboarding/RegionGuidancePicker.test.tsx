/** Verifies optional onboarding access to installed regional guidance only. */

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { RegionGuidancePicker } from "./RegionGuidancePicker";
import { pack, release } from "../settings/packs/packManagementTestData";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const mockInvoke = vi.mocked(invoke);

function regionalPack(
  overrides: Record<string, unknown> = {},
  packOverrides: Record<string, unknown> = {},
) {
  const currentRelease = release({
    packType: "region",
    purpose: "regional_guidance",
    isActive: true,
    ...overrides,
  });
  return pack({ packId: "jobsentinel.region.example", state: "ready", currentRelease, releases: [currentRelease], ...packOverrides });
}

describe("RegionGuidancePicker", () => {
  beforeEach(() => mockInvoke.mockReset());

  it("does not list packs until the user explicitly checks installed guidance", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce([]);
    render(<RegionGuidancePicker />);

    await user.click(screen.getByText("Regional guidance (optional)"));
    expect(mockInvoke).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Check installed guides" }));

    expect(mockInvoke).toHaveBeenCalledWith("list_pack_management");
    expect(screen.getByText(/No active regional guidance is installed/i)).toBeInTheDocument();
  });

  it("offers only active ready regional guidance and opens selected content without country inference", async () => {
    const user = userEvent.setup();
    const available = regionalPack({ publisherName: "Regional publisher", packVersion: "3.0.1" });
    const inactiveRelease = release({ packType: "region", purpose: "regional_guidance", isActive: true, publisherName: "Inactive publisher" });
    const inactive = pack({ state: "disabled", currentRelease: inactiveRelease, releases: [inactiveRelease] });
    const source = pack({ currentRelease: release({ purpose: "source_support" }) });
    mockInvoke.mockResolvedValueOnce([available, inactive, source]);
    render(<RegionGuidancePicker />);

    await user.click(screen.getByText("Regional guidance (optional)"));
    await user.click(screen.getByRole("button", { name: "Check installed guides" }));
    await user.click(screen.getByRole("button", { name: "Use Regional publisher · 3.0.1 · jobsentinel.region.example" }));

    expect(screen.getByRole("button", { name: "Open regional review" })).toBeInTheDocument();
    expect(screen.queryByText(/United Kingdom|Germany|India/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Inactive publisher")).not.toBeInTheDocument();
  });

  it("offers a local retry after a list error", async () => {
    const user = userEvent.setup();
    mockInvoke.mockRejectedValueOnce(new Error("unavailable")).mockResolvedValueOnce([]);
    render(<RegionGuidancePicker />);

    await user.click(screen.getByText("Regional guidance (optional)"));
    await user.click(screen.getByRole("button", { name: "Check installed guides" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load installed regional guidance.");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText(/No active regional guidance is installed/i)).toBeInTheDocument();
  });

  it("discards an older list response after refresh", async () => {
    const user = userEvent.setup();
    let resolve!: (value: unknown) => void;
    mockInvoke.mockReturnValueOnce(new Promise((done) => { resolve = done; })).mockResolvedValueOnce([]);
    render(<RegionGuidancePicker />);

    await user.click(screen.getByText("Regional guidance (optional)"));
    await user.click(screen.getByRole("button", { name: "Check installed guides" }));
    await user.click(screen.getByRole("button", { name: "Refresh installed guides" }));
    await act(async () => resolve([regionalPack({ publisherName: "Older publisher" })]));

    expect(screen.getByText(/No active regional guidance is installed/i)).toBeInTheDocument();
    expect(screen.queryByText("Older publisher")).not.toBeInTheDocument();
  });

  it("clears an older guide and review while refresh is pending or fails", async () => {
    const user = userEvent.setup();
    const guide = regionalPack({ publisherName: "Regional publisher", packVersion: "3.0.1" });
    let reject!: (reason: Error) => void;
    mockInvoke.mockResolvedValueOnce([guide]).mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    render(<RegionGuidancePicker />);

    await user.click(screen.getByText("Regional guidance (optional)"));
    await user.click(screen.getByRole("button", { name: "Check installed guides" }));
    await user.click(screen.getByRole("button", { name: "Use Regional publisher · 3.0.1 · jobsentinel.region.example" }));
    expect(screen.getByRole("button", { name: "Open regional review" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refresh installed guides" }));

    expect(screen.queryByRole("button", { name: "Open regional review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Use Regional publisher/i })).not.toBeInTheDocument();
    await act(async () => reject(new Error("unavailable")));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load installed regional guidance.");
    expect(screen.queryByRole("button", { name: "Open regional review" })).not.toBeInTheDocument();
  });

  it("gives same-version guides distinct installed identities", async () => {
    const user = userEvent.setup();
    const first = regionalPack({ publisherName: "Regional publisher", packVersion: "3.0.1" }, { packId: "jobsentinel.region.alpha" });
    const second = regionalPack({ publisherName: "Regional publisher", packVersion: "3.0.1" }, { packId: "jobsentinel.region.beta" });
    mockInvoke.mockResolvedValueOnce([first, second]);
    render(<RegionGuidancePicker />);

    await user.click(screen.getByText("Regional guidance (optional)"));
    await user.click(screen.getByRole("button", { name: "Check installed guides" }));

    expect(screen.getByRole("button", { name: "Use Regional publisher · 3.0.1 · jobsentinel.region.alpha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use Regional publisher · 3.0.1 · jobsentinel.region.beta" })).toBeInTheDocument();
  });
});
