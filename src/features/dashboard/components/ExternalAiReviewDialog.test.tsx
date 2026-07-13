import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ExternalAiReviewDialog } from "./ExternalAiReviewDialog";
import type { ExternalAiRequest } from "../../../services/aiGatewayTypes";

const publicRequest: ExternalAiRequest = {
  feature: "job-description-summary",
  labels: ["External AI optional", "Public-data only"],
  dataCategories: ["job_posting", "public_metadata"],
  payload: {
    title: "Operations Manager",
    company: "Example Co",
    description: "Lead scheduling and vendor coordination.",
    sourceUrl: "https://jobs.example.test/operations-manager",
  },
  redactedPayload: {
    title: "Operations Manager",
    company: "Example Co",
    description: "Lead scheduling and vendor coordination.",
    sourceUrl: "https://jobs.example.test/operations-manager",
  },
  previewShown: false,
  userApproved: false,
};

function renderDialog(
  request: ExternalAiRequest | null = publicRequest,
  props: Partial<ComponentProps<typeof ExternalAiReviewDialog>> = {},
) {
  const onCancel = vi.fn();
  const onApprove = vi.fn();

  render(
    <ExternalAiReviewDialog
      isOpen
      providerLabel="OpenAI"
      request={request}
      allowSensitivePayloads={false}
      onCancel={onCancel}
      onApprove={onApprove}
      {...props}
    />,
  );

  return { onCancel, onApprove };
}

describe("ExternalAiReviewDialog", () => {
  it("cancels without approving a request", async () => {
    const user = userEvent.setup();
    const { onCancel, onApprove } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("approves the edited reviewed details", async () => {
    const user = userEvent.setup();
    const { onApprove } = renderDialog();
    const textarea = screen.getByLabelText("Details to send");

    fireEvent.change(textarea, {
      target: {
        value: JSON.stringify(
          {
            title: "Operations Manager",
            company: "Example Co",
            description: "Reviewed summary.",
            sourceUrl: "https://jobs.example.test/operations-manager",
          },
          null,
          2,
        ),
      },
    });
    await user.click(
      screen.getByRole("button", { name: "Send Reviewed Details" }),
    );

    expect(onApprove).toHaveBeenCalledWith(
      expect.objectContaining({
        previewShown: true,
        userApproved: true,
        redactedPayload: expect.objectContaining({
          description: "Reviewed summary.",
        }),
      }),
    );
  });

  it("blocks invalid edited details", async () => {
    const user = userEvent.setup();
    const { onApprove } = renderDialog();

    fireEvent.change(screen.getByLabelText("Details to send"), {
      target: { value: "{" },
    });

    expect(
      screen.getByText("Fix the formatting before sending."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send Reviewed Details" }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "Send Reviewed Details" }),
    );
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation for private details", async () => {
    const user = userEvent.setup();
    const privateRequest: ExternalAiRequest = {
      ...publicRequest,
      labels: ["External AI optional", "Sensitive"],
      dataCategories: ["job_posting", "resume"],
      payload: {
        title: "Operations Manager",
        resumeText: "Private resume evidence",
      },
      redactedPayload: {
        title: "Operations Manager",
        resumeText: "Private resume evidence",
      },
    };
    const { onApprove } = renderDialog(privateRequest, {
      allowSensitivePayloads: true,
    });

    const sendButton = screen.getByRole("button", {
      name: "Send Reviewed Details",
    });
    expect(sendButton).toBeDisabled();

    await user.click(
      screen.getByRole("checkbox", {
        name: /I reviewed these private details/i,
      }),
    );
    await user.click(sendButton);

    expect(onApprove).toHaveBeenCalledWith(
      expect.objectContaining({
        explicitlyIncludedSensitiveData: true,
      }),
    );
  });

  it("explains when private details are off in settings", () => {
    const privateRequest: ExternalAiRequest = {
      ...publicRequest,
      labels: ["External AI optional", "Sensitive"],
      dataCategories: ["resume"],
      payload: { resumeText: "Private resume evidence" },
      redactedPayload: { resumeText: "Private resume evidence" },
    };

    renderDialog(privateRequest);

    expect(
      screen.getByText(/Private details are off in Settings/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send Reviewed Details" }),
    ).toBeDisabled();
  });
});
