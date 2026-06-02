import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ToastProvider } from "../contexts/ToastContext";
import { JobImportModal } from "./JobImportModal";

const mockInvoke = vi.mocked(invoke);

const renderModal = () =>
  render(
    <ToastProvider>
      <JobImportModal isOpen onClose={vi.fn()} />
    </ToastProvider>,
  );

describe("JobImportModal", () => {
  const privateFailure = new Error(
    "token=raw-secret chad@example.com /Users/chad/private/resume.pdf",
  );

  const preview = {
    title: "Office Manager",
    company: "Example Co",
    url: "https://example.com/jobs/office-manager",
    location: "Denver, CO",
    description_preview: "Coordinate office operations.",
    salary: "$60,000-$70,000",
    date_posted: "2026-05-01",
    valid_through: null,
    employment_types: ["Full-time"],
    remote: false,
    missing_fields: [],
    already_exists: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses plain job-link copy and broad role examples", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: "Import Job from Link" })).toBeInTheDocument();
    expect(
      screen.getByText(/Paste a link to an individual job page/),
    ).toBeInTheDocument();
    expect(screen.getByText(/review before saving/i)).toBeInTheDocument();

    const input = screen.getByLabelText("Job link");
    expect(input).toHaveAttribute("placeholder", "https://example.com/jobs/office-manager");
    expect(screen.queryByText("Job URL")).not.toBeInTheDocument();
    expect(screen.queryByText(/any website/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/automatically extract/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/software-engineer/i)).not.toBeInTheDocument();
  });

  it("guides users when the job link is missing", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Check Job Link" }));

    expect(await screen.findByText("Add a job link from your browser address bar.")).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("explains invalid links without technical URL wording", async () => {
    const user = userEvent.setup();
    renderModal();

    fireEvent.change(screen.getByLabelText("Job link"), {
      target: { value: "not a link" },
    });
    await user.click(screen.getByRole("button", { name: "Check Job Link" }));

    expect(
      await screen.findByText("Paste the full job link from your browser address bar."),
    ).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("does not show raw private details when preview fails", async () => {
    const user = userEvent.setup();
    mockInvoke.mockRejectedValueOnce(privateFailure);
    renderModal();

    fireEvent.change(screen.getByLabelText("Job link"), {
      target: { value: "https://example.com/jobs/office-manager" },
    });
    await user.click(screen.getByRole("button", { name: "Check Job Link" }));

    expect(await screen.findByText("JobSentinel ran into a problem.")).toBeInTheDocument();
    expect(screen.getByText(/safe support report/i)).toBeInTheDocument();
    expect(screen.queryByText(/raw-secret|chad@example\.com|\/Users\/chad/)).not.toBeInTheDocument();
  });

  it("does not show raw private details when saving fails", async () => {
    const user = userEvent.setup();
    mockInvoke
      .mockResolvedValueOnce(preview)
      .mockRejectedValueOnce(privateFailure);
    renderModal();

    fireEvent.change(screen.getByLabelText("Job link"), {
      target: { value: "https://example.com/jobs/office-manager" },
    });
    await user.click(screen.getByRole("button", { name: "Check Job Link" }));
    expect(await screen.findByText("Office Manager")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save Job" }));

    expect(await screen.findByText("JobSentinel ran into a problem.")).toBeInTheDocument();
    expect(screen.getByText(/safe support report/i)).toBeInTheDocument();
    expect(screen.queryByText(/raw-secret|chad@example\.com|\/Users\/chad/)).not.toBeInTheDocument();
  });

  it("lets users save jobs even when the preview is missing details", async () => {
    const user = userEvent.setup();
    mockInvoke
      .mockResolvedValueOnce({
        ...preview,
        missing_fields: ["salary", "date posted"],
      })
      .mockResolvedValueOnce({ jobId: 123 });

    renderModal();

    fireEvent.change(screen.getByLabelText("Job link"), {
      target: { value: "https://example.com/jobs/office-manager" },
    });
    await user.click(screen.getByRole("button", { name: "Check Job Link" }));

    expect(await screen.findByText(/You can still save this job/i)).toBeInTheDocument();
    const saveButton = screen.getByRole("button", { name: "Save Job" });
    expect(saveButton).not.toBeDisabled();

    await user.click(saveButton);

    expect(mockInvoke).toHaveBeenLastCalledWith("import_job_from_url", {
      url: "https://example.com/jobs/office-manager",
    });
  });
});
