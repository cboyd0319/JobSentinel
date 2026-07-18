import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../app/providers/ToastProvider";
import ResumeBuilderPage from "./ResumeBuilderPage";

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
