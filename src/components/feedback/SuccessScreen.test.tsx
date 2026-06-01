import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SuccessScreen } from "./SuccessScreen";

const savedFeedbackFile = {
  fileName: "jobsentinel-feedback-2026-05-29.md",
  revealToken: "feedback-file-token",
};

function renderSuccessScreen(submittedVia: "github" | "local") {
  const onRevealFile = vi.fn();
  const onClose = vi.fn();

  render(
    <SuccessScreen
      submittedVia={submittedVia}
      savedFeedbackFile={submittedVia === "local" ? savedFeedbackFile : null}
      onRevealFile={onRevealFile}
      onClose={onClose}
    />
  );

  return { onRevealFile, onClose };
}

describe("SuccessScreen", () => {
  it("explains the remaining GitHub steps without claiming submission is done", async () => {
    const user = userEvent.setup();
    const { onClose } = renderSuccessScreen("github");

    expect(
      screen.getByRole("heading", { name: /ready to finish the report/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/your safe support report is in your clipboard/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/add anything else you want us to know/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/paste the safe support report if it is not already included/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/keeps replies and updates in one place/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/ready to submit/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /done/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the saved-file path plain and actionable", async () => {
    const user = userEvent.setup();
    const { onRevealFile, onClose } =
      renderSuccessScreen("local");

    expect(screen.getByRole("heading", { name: /safe support report saved/i })).toBeInTheDocument();
    expect(screen.getByText(savedFeedbackFile.fileName)).toBeInTheDocument();
    expect(screen.getByText(/show the saved file/i)).toBeInTheDocument();
    expect(screen.getByText(/share it only if you want help/i)).toBeInTheDocument();
    expect(
      screen.getByText(/keep it local if you do not want to send it/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/that's it/i)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /show saved file/i })
    );
    expect(screen.queryByRole("button", { name: /open shared folder/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /done/i }));

    expect(onRevealFile).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
