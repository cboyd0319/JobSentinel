import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ToastProvider } from "../contexts/ToastContext";
import { JobImportModal } from "./JobImportModal";

const renderModal = () =>
  render(
    <ToastProvider>
      <JobImportModal isOpen onClose={vi.fn()} />
    </ToastProvider>,
  );

describe("JobImportModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses plain job-link copy and broad role examples", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: "Import Job from Link" })).toBeInTheDocument();
    expect(
      screen.getByText(/Paste a job link from any website/),
    ).toBeInTheDocument();

    const input = screen.getByLabelText("Job link");
    expect(input).toHaveAttribute("placeholder", "https://example.com/jobs/office-manager");
    expect(screen.queryByText("Job URL")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/software-engineer/i)).not.toBeInTheDocument();
  });

  it("explains invalid links without technical URL wording", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText("Job link"), "not a link");
    await user.click(screen.getByRole("button", { name: "Check Job Link" }));

    expect(
      await screen.findByText("Please enter a full link that starts with http:// or https://"),
    ).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });
});
