import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpportunityCaseAction } from "./OpportunityCaseAction";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const { invoke } = await import("@tauri-apps/api/core");
const mockInvoke = vi.mocked(invoke);

const caseFile = {
  job: {
    job_hash: "job-1",
    title: "Office Assistant",
    company: "CareBridge",
    location: "Denver, CO",
    remote: false,
    times_seen: 2,
  },
  source: {
    name: "Employer careers page",
    last_seen_at: "2026-07-21T12:00:00Z",
    connectivity_required: true,
    stale: true,
  },
  posting_risk: {
    score: 0.4,
    reasons: ["Verify the role on the employer site before tailoring."],
  },
  application: null,
  interviews: null,
  offer: null,
  outcome: null,
  evidence: { confirmed_count: 0, current_packet_count: 0, stale_packet_count: 1 },
  timeline: [
    { at: "2026-07-20T12:00:00Z", kind: "source_checked_failed" },
    { at: "2026-07-21T12:00:00Z", kind: "recovery_restored" },
  ],
};

describe("OpportunityCaseAction", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("opens a local case with only the job hash and makes review state visible", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValue(caseFile);
    render(<OpportunityCaseAction jobHash="job-1" />);

    await user.click(screen.getByRole("button", { name: "Open case" }));

    await waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith("open_opportunity_case", {
        jobHash: "job-1",
      }),
    );
    expect(await screen.findByRole("heading", { name: "Office Assistant" })).toBeVisible();
    expect(screen.getByText("Decision")).toBeVisible();
    expect(screen.getByText("Why review")).toBeVisible();
    expect(screen.getByText("Evidence")).toBeVisible();
    expect(screen.getByText("Timeline")).toBeVisible();
    expect(screen.getByText(/Seen 2 times, which may be a repost/i)).toBeVisible();
    expect(screen.getByText(/The saved source snapshot may be stale/i)).toBeVisible();
    expect(screen.getByText(/No confirmed evidence is linked yet/i)).toBeVisible();
    expect(screen.getByText(/Source refresh needs a connection/i)).toBeVisible();
    expect(screen.getByText(/Source may be stale/i)).toBeVisible();
    expect(screen.getByText(/Evidence needs review/i)).toBeVisible();
    expect(screen.getByText("Source check failed")).toBeVisible();
    expect(screen.getByText("Data restored")).toBeVisible();
    expect(screen.getByText("Source check failed").closest("li")?.querySelector("time"))
      .toHaveAttribute("datetime", "2026-07-20T12:00:00Z");
    expect(screen.getByText(/Tue, Jul 21, 2026/i)).toBeVisible();
    expect(screen.queryByText("job-1")).not.toBeInTheDocument();
  });

  it("keeps a safe error in the sheet and retries the same opaque request", async () => {
    const user = userEvent.setup();
    mockInvoke.mockRejectedValueOnce(new Error("network details"));
    mockInvoke.mockResolvedValueOnce(caseFile);
    render(<OpportunityCaseAction jobHash="job-1" />);

    await user.click(screen.getByRole("button", { name: "Open case" }));
    expect(await screen.findByText("Could not open this case.")).toBeVisible();
    expect(screen.queryByText("network details")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("heading", { name: "Office Assistant" });
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it("keeps partial evidence and source state usable on a narrow screen", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValue({
      ...caseFile,
      posting_risk: { score: null, reasons: [] },
      timeline: [],
      application: { status: "applied", has_contact: false },
      interviews: { upcoming_count: 1, completed_count: 0 },
    });
    render(<OpportunityCaseAction jobHash="job-1" />);

    await user.click(screen.getByRole("button", { name: "Open case" }));

    expect(await screen.findByText(/The saved source snapshot may be stale/i)).toBeVisible();
    expect(screen.getByText("0 confirmed, 0 current packets.")).toBeVisible();
    expect(screen.getByText("No case activity yet.")).toBeVisible();
    expect(screen.getByText("1 upcoming interview")).toBeVisible();
    expect(screen.getByText((_, element) =>
      element?.tagName === "P" &&
      Boolean(element.textContent?.includes("Source: Employer careers page. Last checked")),
    )).toBeVisible();
    expect(screen.getByRole("dialog").querySelector(".min-w-0")).toHaveClass("min-w-0");
    expect(screen.getByRole("dialog").querySelector(".app-modal-panel")).toHaveClass("max-h-[calc(100dvh-2rem)]");
  });

  it("shows a loading state before the local snapshot arrives", async () => {
    const user = userEvent.setup();
    let resolveCase: (value: typeof caseFile) => void;
    mockInvoke.mockImplementationOnce(() => new Promise((resolve) => {
      resolveCase = resolve;
    }));
    render(<OpportunityCaseAction jobHash="job-1" />);

    await user.click(screen.getByRole("button", { name: "Open case" }));
    expect(screen.getByRole("status")).toHaveTextContent("Opening case");

    resolveCase!(caseFile);
    expect(await screen.findByRole("heading", { name: "Office Assistant" })).toBeVisible();
  });
});
