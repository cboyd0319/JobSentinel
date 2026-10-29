/** Verifies privacy coverage, fresh unlock outcomes, and reviewed session cleanup. */

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppPrivacy } from "./AppPrivacy";
import { SettingsPrivacySection } from "../features/settings/SettingsPrivacySection";
import { invoke as invokeSession, clearCommandCache } from "../platform/tauri";
import { cacheDetectedLocation, type DetectedLocation } from "../shared/location/detectedLocationCache";

const unlocked = { enabled: true, locked: false, unlock_method: "passphrase" };
const locked = { ...unlocked, locked: true };
const callbacks = new Map<string, (event: { event: string; id: number; payload: unknown }) => void>();
const mockInvoke = vi.mocked(invoke);

function publish(event: string, payload: unknown) {
  act(() => callbacks.get(event)?.({ event, id: 0, payload }));
}

describe("app privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callbacks.clear();
    sessionStorage.clear();
    vi.mocked(listen).mockImplementation(async (event, callback) => {
      if (typeof event === "string") callbacks.set(event, callback);
      return () => {};
    });
    mockInvoke.mockResolvedValue(unlocked);
  });

  it("covers private content until native status is known", async () => {
    let finish: (value: unknown) => void = () => {};
    mockInvoke.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    render(<AppPrivacy><p>Private notes</p></AppPrivacy>);
    expect(screen.queryByText("Private notes")).not.toBeInTheDocument();
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith("get_app_privacy_status"));
    await act(async () => finish(locked));
    expect(screen.getByRole("heading", { name: "JobSentinel is locked" })).toBeVisible();
  });

  it("discards ordinary invoke replies before they can restore cleared private session data", async () => {
    let finish: (value: DetectedLocation) => void = () => {};
    mockInvoke.mockReturnValueOnce(new Promise<DetectedLocation>((resolve) => { finish = resolve; }));
    const write = invokeSession<DetectedLocation>("detect_location").then(cacheDetectedLocation);
    clearCommandCache();
    finish({ city: "Denver", region: "Colorado", country: "US", timezone: "America/Denver" });
    await expect(write).rejects.toThrow("session changed");
    expect(sessionStorage.getItem("detected_location")).toBeNull();
  });

  it("unmounts private content immediately while native locking is pending", async () => {
    const user = userEvent.setup();
    render(<AppPrivacy><p>Private notes</p></AppPrivacy>);
    await screen.findByText("Private notes");
    mockInvoke.mockImplementation(() => new Promise(() => {}));
    await user.click(screen.getByRole("button", { name: "Lock JobSentinel" }));
    expect(screen.queryByText("Private notes")).not.toBeInTheDocument();
    expect(mockInvoke).toHaveBeenLastCalledWith("lock_app");
  });

  it("covers private data on focus loss", async () => {
    render(<AppPrivacy><p>Private notes</p></AppPrivacy>);
    await screen.findByText("Private notes");
    mockInvoke.mockResolvedValueOnce(locked);
    act(() => window.dispatchEvent(new Event("blur")));
    expect(screen.queryByText("Private notes")).not.toBeInTheDocument();
    await waitFor(() => expect(mockInvoke).toHaveBeenLastCalledWith("lock_app"));
  });

  it("keeps malformed native status and failed event subscriptions covered", async () => {
    const user = userEvent.setup();
    vi.mocked(listen).mockRejectedValueOnce(new Error("event connection unavailable"));
    render(<AppPrivacy><p>Private notes</p></AppPrivacy>);
    await screen.findByRole("alert");
    expect(screen.queryByText("Private notes")).not.toBeInTheDocument();
    expect(mockInvoke).not.toHaveBeenCalled();
    mockInvoke.mockResolvedValueOnce({ enabled: true, locked: "false" });
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith("get_app_privacy_status"));
    expect(screen.queryByText("Private notes")).not.toBeInTheDocument();
  });

  it("keeps cancellation or failed verification covered and permits verified unlock", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValue(locked);
    render(<AppPrivacy><p>Private notes</p></AppPrivacy>);
    const input = await screen.findByLabelText("App unlock passphrase");
    await user.type(input, "correct horse battery");
    mockInvoke.mockRejectedValueOnce(new Error("cancelled"));
    await user.click(screen.getByRole("button", { name: "Unlock JobSentinel" }));
    expect(screen.queryByText("Private notes")).not.toBeInTheDocument();
    expect(input).toHaveValue("");
    mockInvoke.mockResolvedValueOnce(unlocked);
    await user.type(input, "correct horse battery");
    await user.click(screen.getByRole("button", { name: "Unlock JobSentinel" }));
    expect(await screen.findByText("Private notes")).toBeVisible();
  });

  it("honors native locks and rejects a stale unlock completion", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValue(locked);
    render(<AppPrivacy><p>Private notes</p></AppPrivacy>);
    await user.type(await screen.findByLabelText("App unlock passphrase"), "correct horse battery");
    let finish: (value: unknown) => void = () => {};
    mockInvoke.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await user.click(screen.getByRole("button", { name: "Unlock JobSentinel" }));
    publish("app-privacy-changed", locked);
    await act(async () => finish(unlocked));
    expect(screen.queryByText("Private notes")).not.toBeInTheDocument();
  });

  it("requires review before cleanup and clears only owned temporary browser data", async () => {
    const user = userEvent.setup();
    render(<AppPrivacy><SettingsPrivacySection /></AppPrivacy>);
    await screen.findByRole("button", { name: "Review session cleanup" });
    await user.click(screen.getByRole("button", { name: "Review session cleanup" }));
    await user.click(screen.getByRole("button", { name: "Keep session" }));
    expect(mockInvoke.mock.calls.some(([cmd]) => cmd === "clear_private_session")).toBe(false);
    sessionStorage.setItem("jobContext", "private job context");
    sessionStorage.setItem("jobsentinel-resume-match-draft-v1", "private draft");
    sessionStorage.setItem("detected_location", "private place");
    sessionStorage.setItem("unrelated", "preserve");
    await user.click(screen.getByRole("button", { name: "Review session cleanup" }));
    await user.click(screen.getByRole("button", { name: "Clear reviewed session" }));
    expect(mockInvoke).toHaveBeenLastCalledWith("clear_private_session", undefined);
    publish("private-session-cleared", null);
    expect(sessionStorage.getItem("jobContext")).toBeNull();
    expect(sessionStorage.getItem("jobsentinel-resume-match-draft-v1")).toBeNull();
    expect(sessionStorage.getItem("detected_location")).toBeNull();
    expect(sessionStorage.getItem("unrelated")).toBe("preserve");
  });

  it("preserves temporary browser data when native cleanup fails", async () => {
    const user = userEvent.setup();
    render(<AppPrivacy><SettingsPrivacySection /></AppPrivacy>);
    await user.click(await screen.findByRole("button", { name: "Review session cleanup" }));
    sessionStorage.setItem("jobContext", "private draft");
    mockInvoke.mockRejectedValueOnce(new Error("unavailable"));
    await user.click(screen.getByRole("button", { name: "Clear reviewed session" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Session cleanup did not finish");
    expect(sessionStorage.getItem("jobContext")).toBe("private draft");
  });

  it("reports cleanup failure on the lock screen after Settings is unmounted", async () => {
    const user = userEvent.setup();
    render(<AppPrivacy><SettingsPrivacySection /></AppPrivacy>);
    await user.click(await screen.findByRole("button", { name: "Review session cleanup" }));
    let fail: (error: Error) => void = () => {};
    mockInvoke.mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; }));
    await user.click(screen.getByRole("button", { name: "Clear reviewed session" }));
    publish("app-privacy-changed", locked);
    await act(async () => fail(new Error("cleanup failed")));
    expect(screen.getByRole("alert")).toHaveTextContent("Session cleanup did not finish");
    expect(screen.getByRole("heading", { name: "JobSentinel is locked" })).toBeVisible();
  });

  it("reports cleanup failure after an unprotected session is uncovered again", async () => {
    const user = userEvent.setup();
    const disabled = { ...unlocked, enabled: false };
    mockInvoke.mockResolvedValue(disabled);
    render(<AppPrivacy><SettingsPrivacySection /></AppPrivacy>);
    await user.click(await screen.findByRole("button", { name: "Review session cleanup" }));
    let fail: (error: Error) => void = () => {};
    mockInvoke.mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; }));
    await user.click(screen.getByRole("button", { name: "Clear reviewed session" }));
    publish("app-privacy-changed", { ...disabled, locked: true });
    publish("app-privacy-changed", disabled);
    await act(async () => fail(new Error("cleanup failed")));
    expect(screen.getByRole("alert")).toHaveTextContent("Session cleanup did not finish");
    expect(screen.getByRole("button", { name: "Review session cleanup" })).toBeVisible();
  });
});
