import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../contexts/ToastContext";
import { ExternalAiJobSummary } from "./ExternalAiJobSummary";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const { invoke } = await import("@tauri-apps/api/core");
const mockInvoke = vi.mocked(invoke);

const job = {
  id: 42,
  hash: "job-hash",
  title: "Customer Support Lead",
  company: "CareBridge Services",
  location: "Chicago, IL",
  url: "https://example.com/job/42",
  source: "greenhouse",
  created_at: "2026-06-18T12:00:00.000Z",
  description: "Guide care teams and improve customer support workflows.",
  salary_min: 55_000,
  salary_max: 72_000,
  remote: false,
  score: 0.92,
  notes: "Private local note",
};

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

function enabledExternalAiConfig() {
  return {
    enabled: true,
    provider: "open_ai",
    enabled_providers: ["open_ai"],
    require_payload_preview: true,
    allow_sensitive_payloads: false,
    redaction: { enabled: true },
    log_requests_locally: false,
  };
}

describe("ExternalAiJobSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
    window.localStorage.clear();
  });

  it("guides the user to settings when outside AI is not configured", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValue({ external_ai: { enabled: false } });

    renderWithToast(<ExternalAiJobSummary job={job} />);
    await user.click(
      screen.getByRole("button", {
        name: "Summarize posting with Outside AI",
      }),
    );

    expect(await screen.findByText("Outside AI is not ready")).toBeInTheDocument();
    expect(
      screen.getByText(/Turn on Outside AI in Settings/i),
    ).toBeInTheDocument();
    expect(mockInvoke).toHaveBeenCalledWith("get_config", {});
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "send_external_ai_request",
      expect.anything(),
    );
  });

  it("sends only reviewed public job details through the backend command", async () => {
    const user = userEvent.setup();
    let sentArgs: unknown;

    mockInvoke.mockImplementation((cmd, args) => {
      if (cmd === "get_config") {
        return Promise.resolve({ external_ai: enabledExternalAiConfig() });
      }
      if (cmd === "send_external_ai_request") {
        sentArgs = args;
        return Promise.resolve({
          text: "Summary\nThis is a public posting summary.",
        });
      }
      return Promise.resolve(null);
    });

    renderWithToast(<ExternalAiJobSummary job={job} />);
    await user.click(
      screen.getByRole("button", {
        name: "Summarize posting with Outside AI",
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "Review Outside AI Details" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Send Reviewed Details" }),
    );

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "send_external_ai_request",
        expect.anything(),
      );
    });
    expect(sentArgs).toMatchObject({
      request: {
        feature: "job-description-summary",
        provider: "open_ai",
        labels: ["External AI optional", "Public-data only"],
        dataCategories: ["job_posting", "public_metadata"],
        previewShown: true,
        userApproved: true,
        payload: {
          title: "Customer Support Lead",
          company: "CareBridge Services",
          sourceUrl: "https://example.com/job/42",
          source: "greenhouse",
          jobId: "42",
          location: "Chicago, IL",
          description: "Guide care teams and improve customer support workflows.",
          salaryRange: "$55k - $72k",
        },
      },
    });
    expect(JSON.stringify(sentArgs)).not.toContain("Private local note");
    expect(JSON.stringify(sentArgs)).not.toContain("0.92");
    expect(
      await screen.findByRole("heading", { name: "Posting Summary" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/public posting summary/i)).toBeInTheDocument();
  });
});
