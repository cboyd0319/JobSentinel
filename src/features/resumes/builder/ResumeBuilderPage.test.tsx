/** Tests builder recovery and optional military/early-career work-history entry. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../app/providers/ToastProvider";
import ResumeBuilderPage from "./ResumeBuilderPage";
import ExperienceStep from "./steps/ExperienceStep";

const mockInvoke = vi.mocked(invoke);

function renderBuilder(onBack = vi.fn()) {
  render(
    <ToastProvider>
      <ResumeBuilderPage onBack={onBack} />
    </ToastProvider>,
  );
}

describe("ResumeBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers military guidance while keeping work-history entry optional", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<ExperienceStep experiences={[]} onAddClick={onAdd} onDeleteClick={vi.fn()} />);
    expect(screen.getByText(/this step is optional/i)).toBeInTheDocument();
    const guidance = screen.getByText("Military-to-civilian guidance (optional)");
    await user.click(guidance);
    expect(guidance.closest("details")).toHaveAttribute("open");
    await user.click(screen.getByRole("button", { name: /add experience/i }));
    expect(onAdd).toHaveBeenCalledOnce();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("shows recovery instead of an unusable form when startup fails", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    mockInvoke.mockImplementation((command) => {
      if (command === "create_resume_draft") {
        return Promise.reject(new Error("draft store unavailable"));
      }
      return Promise.resolve([]);
    });

    renderBuilder(onBack);

    expect(
      await screen.findByRole("heading", {
        name: /resume builder did not start/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back to dashboard/i }));

    expect(onBack).toHaveBeenCalledOnce();
  });

  it("waits until the name field is touched before showing its required error", async () => {
    const user = userEvent.setup();
    mockInvoke.mockImplementation((command) => {
      if (command === "create_resume_draft") return Promise.resolve(1);
      if (command === "list_resume_templates") return Promise.resolve([]);
      return Promise.resolve(null);
    });

    renderBuilder();

    const nameInput = await screen.findByRole("textbox", { name: /full name/i });
    expect(screen.queryByText("Add your name.")).not.toBeInTheDocument();

    await user.click(nameInput);
    await user.tab();

    expect(screen.getByText("Add your name.")).toBeInTheDocument();
  });
});
