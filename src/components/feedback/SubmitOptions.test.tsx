import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SubmitOptions } from "./SubmitOptions";

function renderSubmitOptions(submitting = false) {
  const onSubmitGitHub = vi.fn();
  const onSubmitDrive = vi.fn();

  render(
    <SubmitOptions
      onSubmitGitHub={onSubmitGitHub}
      onSubmitDrive={onSubmitDrive}
      submitting={submitting}
    />
  );

  return { onSubmitGitHub, onSubmitDrive };
}

describe("SubmitOptions", () => {
  it("makes the no-account safe report path primary", () => {
    renderSubmitOptions();

    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /save a safe report/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/works without a github or google account/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/you choose whether and where to share it/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /open a report with replies/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/a github account may be needed/i)).toBeInTheDocument();
    expect(screen.queryByText(/sign up/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/community/i)).not.toBeInTheDocument();
  });

  it("routes each button to the matching submit action", async () => {
    const user = userEvent.setup();
    const { onSubmitGitHub, onSubmitDrive } = renderSubmitOptions();

    await user.click(
      screen.getByRole("button", { name: /save safe report/i })
    );
    await user.click(
      screen.getByRole("button", { name: /open github issue/i })
    );

    expect(onSubmitDrive).toHaveBeenCalledTimes(1);
    expect(onSubmitGitHub).toHaveBeenCalledTimes(1);
  });

  it("disables both submit paths while a report is being prepared", () => {
    renderSubmitOptions(true);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    buttons.forEach((button) => expect(button).toBeDisabled());
  });
});
