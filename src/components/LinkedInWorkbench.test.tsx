import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../contexts";
import { openDeepLink } from "../services/deeplinks";
import { recordLinkedInWorkbenchEvent } from "../services/linkedinWorkbench";
import { LINKEDIN_WORKBENCH_ACK_STORAGE_KEY } from "../shared/linkedinWorkbench";
import { LinkedInWorkbench } from "./LinkedInWorkbench";

vi.mock("../services/deeplinks", () => ({
  openDeepLink: vi.fn(),
}));

vi.mock("../services/linkedinWorkbench", () => ({
  recordLinkedInWorkbenchEvent: vi.fn(),
}));

function renderWorkbench() {
  render(
    <ToastProvider>
      <LinkedInWorkbench />
    </ToastProvider>,
  );
}

describe("LinkedInWorkbench", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.localStorage.getItem).mockReturnValue(null);
    vi.mocked(openDeepLink).mockResolvedValue(undefined);
    vi.mocked(recordLinkedInWorkbenchEvent).mockResolvedValue({
      jobId: 1,
      jobHash: "hash",
      applicationId: 2,
      status: "applied",
      needsDetails: true,
      savedAsBookmark: true,
      hidden: false,
    });
  });

  it("keeps LinkedIn actions disabled until the user acknowledges the workbench", async () => {
    const user = userEvent.setup();
    renderWorkbench();

    expect(screen.getByRole("button", { name: /open linkedin jobs/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /log applied/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /log interview/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /add reminder/i })).toBeDisabled();

    await user.click(
      screen.getByLabelText(/I understand\. Remember this on this computer/i),
    );

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      LINKEDIN_WORKBENCH_ACK_STORAGE_KEY,
      expect.stringContaining("linkedin-workbench"),
    );
    expect(screen.getByRole("button", { name: /open linkedin jobs/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /log applied/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /log interview/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /add reminder/i })).toBeEnabled();
  });

  it("opens LinkedIn and shows a privacy reminder without a forced close", async () => {
    const user = userEvent.setup();
    renderWorkbench();

    await user.click(
      screen.getByLabelText(/I understand\. Remember this on this computer/i),
    );
    await user.click(screen.getByRole("button", { name: /open linkedin jobs/i }));

    expect(openDeepLink).toHaveBeenCalledWith("https://www.linkedin.com/jobs/");
    expect(
      await screen.findByText(/JobSentinel will not force this session closed/i),
    ).toBeInTheDocument();
  });

  it("presents Browser Import as the primary capture path", () => {
    renderWorkbench();

    expect(
      screen.getByText(/fastest path: browse normally, then save the page/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/use the browser button on a linkedin jobs page to save the visible job cards/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/then use these buttons for what you did/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log follow-up/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log rejected/i })).toBeInTheDocument();
    expect(
      screen.queryByText(/paste is the main path/i),
    ).not.toBeInTheDocument();
  });

  it("uses pasted selected text as suggestions and logs applied with one click", async () => {
    const user = userEvent.setup();
    renderWorkbench();

    await user.click(
      screen.getByLabelText(/I understand\. Remember this on this computer/i),
    );
    await user.type(
      screen.getByLabelText(/paste selected job text/i),
      "Principal Security Engineer at Example Co\nhttps://www.linkedin.com/jobs/view/123?token=secret\nli_at=raw-cookie",
    );
    await user.click(screen.getByRole("button", { name: /use pasted details/i }));
    await user.click(screen.getByRole("button", { name: /log applied/i }));

    await waitFor(() =>
      expect(recordLinkedInWorkbenchEvent).toHaveBeenCalledWith({
        eventType: "applied",
        title: "Principal Security Engineer",
        company: "Example Co",
        url: "https://www.linkedin.com/jobs/view/123",
        notes:
          "Principal Security Engineer at Example Co\nhttps://www.linkedin.com/jobs/view/123\nli_at=[REDACTED]",
      }),
    );
  });

  it("fills suggestions immediately when the user pastes selected text", async () => {
    const user = userEvent.setup();
    renderWorkbench();

    await user.click(
      screen.getByLabelText(/I understand\. Remember this on this computer/i),
    );

    fireEvent.paste(screen.getByLabelText(/paste selected job text/i), {
      clipboardData: {
        getData: () =>
          "Staff Security Engineer at Example Co\nhttps://www.linkedin.com/jobs/view/456?token=secret",
      },
    });

    expect(screen.getByRole("textbox", { name: "Job title" })).toHaveValue(
      "Staff Security Engineer",
    );
    expect(screen.getByRole("textbox", { name: "Company" })).toHaveValue(
      "Example Co",
    );
    expect(screen.getByRole("textbox", { name: "Job link" })).toHaveValue(
      "https://www.linkedin.com/jobs/view/456",
    );

    await user.click(screen.getByRole("button", { name: /save job/i }));

    await waitFor(() =>
      expect(recordLinkedInWorkbenchEvent).toHaveBeenCalledWith({
        eventType: "saved",
        title: "Staff Security Engineer",
        company: "Example Co",
        url: "https://www.linkedin.com/jobs/view/456",
        notes:
          "Staff Security Engineer at Example Co\nhttps://www.linkedin.com/jobs/view/456",
      }),
    );
  });

  it("records expanded local ledger actions from user clicks", async () => {
    const user = userEvent.setup();
    renderWorkbench();

    await user.click(
      screen.getByLabelText(/I understand\. Remember this on this computer/i),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Job title" }),
      "Content Strategist",
    );
    await user.type(screen.getByRole("textbox", { name: "Company" }), "Example Co");
    await user.click(screen.getByRole("button", { name: /log interview/i }));
    await user.click(screen.getByRole("button", { name: /log follow-up/i }));
    await user.click(screen.getByRole("button", { name: /add reminder/i }));
    await user.click(screen.getByRole("button", { name: /log rejected/i }));

    await waitFor(() => expect(recordLinkedInWorkbenchEvent).toHaveBeenCalledTimes(4));
    expect(recordLinkedInWorkbenchEvent).toHaveBeenNthCalledWith(1, {
      eventType: "interview",
      title: "Content Strategist",
      company: "Example Co",
      url: undefined,
      notes: undefined,
    });
    expect(recordLinkedInWorkbenchEvent).toHaveBeenNthCalledWith(2, {
      eventType: "follow_up",
      title: "Content Strategist",
      company: "Example Co",
      url: undefined,
      notes: undefined,
    });
    expect(recordLinkedInWorkbenchEvent).toHaveBeenNthCalledWith(3, {
      eventType: "reminder",
      title: "Content Strategist",
      company: "Example Co",
      url: undefined,
      notes: undefined,
    });
    expect(recordLinkedInWorkbenchEvent).toHaveBeenNthCalledWith(4, {
      eventType: "rejected",
      title: "Content Strategist",
      company: "Example Co",
      url: undefined,
      notes: undefined,
    });
  });
});
