/** Verifies portable profile admission, passphrase handling, and late native reply isolation. */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PortableStartup } from "./PortableStartup";

const existing = { portable: true, unlocked: false, new_profile: false };
const mockInvoke = vi.mocked(invoke);

describe("portable startup", () => {
  beforeEach(() => { mockInvoke.mockReset(); });

  it("admits an installed profile only after native status confirms it", async () => {
    let finish: (value: unknown) => void = () => {};
    mockInvoke.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<PortableStartup><p>Private application</p></PortableStartup>);
    expect(screen.queryByText("Private application")).not.toBeInTheDocument();
    await act(async () => finish({ portable: false, unlocked: true, new_profile: false }));
    expect(screen.getByText("Private application")).toBeVisible();
  });

  it("requires matching confirmation for a new profile and reads native status after creation", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce({ ...existing, new_profile: true });
    render(<PortableStartup><p>Private application</p></PortableStartup>);
    const password = await screen.findByLabelText("Portable profile passphrase");
    const confirm = screen.getByLabelText("Confirm portable profile passphrase");
    await user.type(password, "portable-profile-passphrase");
    const button = screen.getByRole("button", { name: "Create portable profile" });
    expect(button).toBeDisabled();
    await user.type(confirm, "portable-profile-passphrase");
    mockInvoke.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ ...existing, unlocked: true });
    await user.click(button);
    expect(mockInvoke).toHaveBeenCalledWith("unlock_portable_profile", {
      passphrase: "portable-profile-passphrase", confirmPassphrase: "portable-profile-passphrase",
    });
    expect(mockInvoke).toHaveBeenLastCalledWith("get_portable_profile_status");
    expect(await screen.findByText("Private application")).toBeVisible();
  });

  it("stays covered after wrong passphrase or cancellation and clears the entry", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(existing);
    render(<PortableStartup><p>Private application</p></PortableStartup>);
    const password = await screen.findByLabelText("Portable profile passphrase");
    expect(screen.queryByLabelText("Confirm portable profile passphrase")).not.toBeInTheDocument();
    await user.type(password, "wrong-portable-passphrase");
    mockInvoke.mockRejectedValueOnce(new Error("cancelled"));
    await user.click(screen.getByRole("button", { name: "Unlock portable profile" }));
    expect(password).toHaveValue("");
    expect(screen.getByRole("alert")).toHaveTextContent("Could not open this portable profile");
    expect(screen.queryByText("Private application")).not.toBeInTheDocument();
    await user.type(password, "portable-profile-passphrase");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(password).toHaveValue("");
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it("requires confirmed native unlock rather than trusting the command response", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(existing);
    render(<PortableStartup><p>Private application</p></PortableStartup>);
    await user.type(await screen.findByLabelText("Portable profile passphrase"), "portable-profile-passphrase");
    mockInvoke.mockResolvedValueOnce(undefined).mockResolvedValueOnce(existing);
    await user.click(screen.getByRole("button", { name: "Unlock portable profile" }));
    expect(screen.queryByText("Private application")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("still locked");
    await user.type(screen.getByLabelText("Portable profile passphrase"), "portable-profile-passphrase");
    mockInvoke.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ ...existing, unlocked: true });
    await user.click(screen.getByRole("button", { name: "Unlock portable profile" }));
    expect(await screen.findByText("Private application")).toBeVisible();
  });

  it("keeps malformed and failed status checks covered and allows retry", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce({ ...existing, unlocked: "true" });
    render(<PortableStartup><p>Private application</p></PortableStartup>);
    await screen.findByRole("alert");
    expect(screen.queryByText("Private application")).not.toBeInTheDocument();
    mockInvoke.mockRejectedValueOnce(new Error("unavailable"));
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("alert");
    mockInvoke.mockResolvedValueOnce(existing);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("Portable profile passphrase")).toBeVisible();
  });

  it("does not let a late response from a removed gate open a new gate", async () => {
    let finish: (value: unknown) => void = () => {};
    mockInvoke.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const view = render(<PortableStartup key="old"><p>Private application</p></PortableStartup>);
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledTimes(1));
    mockInvoke.mockResolvedValueOnce(existing);
    view.rerender(<PortableStartup key="new"><p>Private application</p></PortableStartup>);
    await screen.findByLabelText("Portable profile passphrase");
    await act(async () => finish({ ...existing, unlocked: true }));
    expect(screen.queryByText("Private application")).not.toBeInTheDocument();
  });

  it("counts Unicode characters and UTF-8 bytes separately", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(existing);
    render(<PortableStartup><p>Private application</p></PortableStartup>);
    const password = await screen.findByLabelText("Portable profile passphrase");
    await user.type(password, "😀".repeat(8));
    expect(screen.getByRole("button", { name: "Unlock portable profile" })).toBeDisabled();
    await user.type(password, "😀".repeat(8));
    expect(screen.getByRole("button", { name: "Unlock portable profile" })).toBeEnabled();
    fireEvent.change(password, { target: { value: "😀".repeat(257) } });
    expect(screen.getByRole("button", { name: "Unlock portable profile" })).toBeDisabled();
    fireEvent.change(password, { target: { value: " ".repeat(16) } });
    expect(screen.getByRole("button", { name: "Unlock portable profile" })).toBeDisabled();
  });

  it("rejects space-padded short secrets before native profile creation", async () => {
    mockInvoke.mockResolvedValueOnce({ ...existing, new_profile: true });
    render(<PortableStartup><p>Private application</p></PortableStartup>);
    const password = await screen.findByLabelText("Portable profile passphrase");
    const confirm = screen.getByLabelText("Confirm portable profile passphrase");
    for (const value of ["a" + " ".repeat(15), " ".repeat(15) + "a"]) {
      fireEvent.change(password, { target: { value } });
      fireEvent.change(confirm, { target: { value } });
      const submit = screen.getByRole("button", { name: "Create portable profile" });
      expect(submit).toBeDisabled();
      fireEvent.click(submit);
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    }
    fireEvent.change(password, { target: { value: "x".repeat(16) } });
    fireEvent.change(confirm, { target: { value: "x".repeat(16) } });
    expect(screen.getByRole("button", { name: "Create portable profile" })).toBeEnabled();
  });
});
