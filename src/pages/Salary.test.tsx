import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../contexts";
import Salary from "./Salary";

const mockInvoke = vi.mocked(invoke);

function renderSalary() {
  return render(
    <ToastProvider>
      <Salary onBack={vi.fn()} />
    </ToastProvider>,
  );
}

describe("Salary", () => {
  const privateFailure = new Error(
    "token=raw-secret chad@example.com /Users/chad/private/resume.pdf",
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({
      job_title: "Registered Nurse",
      location: "Denver, CO",
      seniority_level: "Principal",
      min_salary: 150000,
      p25_salary: 175000,
      median_salary: 200000,
      p75_salary: 230000,
      max_salary: 260000,
      average_salary: 205000,
      sample_size: 128,
      last_updated: "2026-05-20T00:00:00Z",
    });
  });

  it("uses broad-audience salary examples", () => {
    renderSalary();

    expect(screen.getByRole("heading", { name: "Pay Protection" })).toBeInTheDocument();
    expect(screen.getByLabelText("Salary floor")).toBeInTheDocument();
    expect(screen.getByLabelText("Role Stage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Pay Range" })).toBeInTheDocument();
    expect(screen.getByLabelText("Job Title")).toHaveAttribute(
      "placeholder",
      "e.g., Registered Nurse",
    );
  });

  it("guides users when pay details are missing", async () => {
    const user = userEvent.setup();
    renderSalary();

    await user.click(screen.getByRole("button", { name: "Check Pay Range" }));

    expect(await screen.findByText("Add job title and location, then check pay again.")).toBeInTheDocument();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("uses backend-supported principal seniority for principal and executive salary lookup", async () => {
    const user = userEvent.setup();
    renderSalary();

    await user.type(screen.getByLabelText("Job Title"), "Registered Nurse");
    await user.type(screen.getByLabelText("Location"), "Denver, CO");
    await user.selectOptions(screen.getByLabelText("Role Stage"), "principal");
    await user.click(screen.getByRole("button", { name: "Check Pay Range" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("get_salary_benchmark", {
        jobTitle: "Registered Nurse",
        location: "Denver, CO",
        seniority: "principal",
      });
    });
  });

  it("warns when the salary floor is below market evidence", async () => {
    const user = userEvent.setup();
    renderSalary();

    await user.type(screen.getByLabelText("Job Title"), "Registered Nurse");
    await user.type(screen.getByLabelText("Location"), "Denver, CO");
    await user.type(screen.getByLabelText("Salary floor"), "120000");
    await user.click(screen.getByRole("button", { name: "Check Pay Range" }));

    expect(await screen.findByText(/below the lower-pay part of this sample/i)).toBeInTheDocument();
    expect(screen.getByText(/too low a title or pay level/i)).toBeInTheDocument();
    expect(screen.getByText("Past-pay question")).toBeInTheDocument();
    expect(screen.getByText(/current or past pay/i)).toBeInTheDocument();
  });

  it("explains pay ranges without percentile shorthand", async () => {
    const user = userEvent.setup();
    renderSalary();

    await user.type(screen.getByLabelText("Job Title"), "Registered Nurse");
    await user.type(screen.getByLabelText("Location"), "Denver, CO");
    await user.click(screen.getByRole("button", { name: "Check Pay Range" }));

    expect(await screen.findByText("Lower range")).toBeInTheDocument();
    expect(screen.getByText("Middle")).toBeInTheDocument();
    expect(screen.getByText("Higher range")).toBeInTheDocument();
    expect(screen.getByText("Highest seen")).toBeInTheDocument();
    expect(screen.getByText("Higher-range reference point")).toBeInTheDocument();
    expect(screen.queryByText("Strong target from higher range")).not.toBeInTheDocument();
    expect(screen.queryByText(/25th %|75th %|75th percentile/i)).not.toBeInTheDocument();
  });

  it("labels thin salary samples as weaker evidence", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce({
      job_title: "Registered Nurse",
      location: "Denver, CO",
      seniority_level: "Principal",
      min_salary: 150000,
      p25_salary: 175000,
      median_salary: 200000,
      p75_salary: 230000,
      max_salary: 260000,
      average_salary: 205000,
      sample_size: 12,
      last_updated: "2026-05-20T00:00:00Z",
    });
    renderSalary();

    await user.type(screen.getByLabelText("Job Title"), "Registered Nurse");
    await user.type(screen.getByLabelText("Location"), "Denver, CO");
    await user.click(screen.getByRole("button", { name: "Check Pay Range" }));

    expect(await screen.findByText("12 salary records")).toBeInTheDocument();
    expect(screen.getByText("Thin sample")).toBeInTheDocument();
    expect(screen.getByText(/use this as a weak signal/i)).toBeInTheDocument();
  });

  it("shows a past-pay guardrail without making legal claims", async () => {
    const user = userEvent.setup();
    renderSalary();

    await user.type(screen.getByLabelText("Job Title"), "Registered Nurse");
    await user.type(screen.getByLabelText("Location"), "Denver, CO");
    await user.click(screen.getByRole("button", { name: "Check Pay Range" }));

    expect(await screen.findByText("Past-pay question")).toBeInTheDocument();
    expect(screen.getByText(/current or past pay/i)).toBeInTheDocument();
    expect(screen.getByText(/role range and target pay/i)).toBeInTheDocument();
    expect(screen.queryByText(/illegal|law|ban/i)).not.toBeInTheDocument();
  });

  it("shows level and scope checks before accepting a pay range", async () => {
    const user = userEvent.setup();
    renderSalary();

    await user.type(screen.getByLabelText("Job Title"), "Registered Nurse");
    await user.type(screen.getByLabelText("Location"), "Denver, CO");
    await user.click(screen.getByRole("button", { name: "Check Pay Range" }));

    expect(await screen.findByText("Level and scope check")).toBeInTheDocument();
    expect(screen.getByText(/title, seniority, and responsibilities/i)).toBeInTheDocument();
    expect(screen.getByText(/schedule, travel, expected hours, and location/i)).toBeInTheDocument();
    expect(screen.getByText(/promotion path, review timing, benefits/i)).toBeInTheDocument();
  });

  it("does not show raw private details when pay range lookup fails", async () => {
    const user = userEvent.setup();
    mockInvoke.mockRejectedValueOnce(privateFailure);
    renderSalary();

    await user.type(screen.getByLabelText("Job Title"), "Registered Nurse");
    await user.type(screen.getByLabelText("Location"), "Denver, CO");
    await user.click(screen.getByRole("button", { name: "Check Pay Range" }));

    expect(await screen.findByText("Could not check pay range")).toBeInTheDocument();
    expect(screen.getByText(/safe support report/i)).toBeInTheDocument();
    expect(screen.queryByText(/raw-secret|chad@example\.com|\/Users\/chad/)).not.toBeInTheDocument();
  });

  it("does not show raw private details when negotiation notes fail", async () => {
    const user = userEvent.setup();
    mockInvoke
      .mockResolvedValueOnce({
        job_title: "Registered Nurse",
        location: "Denver, CO",
        seniority_level: "Principal",
        min_salary: 150000,
        p25_salary: 175000,
        median_salary: 200000,
        p75_salary: 230000,
        max_salary: 260000,
        average_salary: 205000,
        sample_size: 128,
        last_updated: "2026-05-20T00:00:00Z",
      })
      .mockRejectedValueOnce(privateFailure);
    renderSalary();

    await user.type(screen.getByLabelText("Job Title"), "Registered Nurse");
    await user.type(screen.getByLabelText("Location"), "Denver, CO");
    await user.click(screen.getByRole("button", { name: "Check Pay Range" }));
    expect(await screen.findByRole("button", { name: "Draft Negotiation Notes" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Written offer"), "185000");
    await user.type(screen.getByLabelText("Target minimum"), "200000");
    await user.type(screen.getByLabelText("Target maximum"), "220000");

    await user.click(screen.getByRole("button", { name: "Draft Negotiation Notes" }));

    expect(await screen.findByText("Could not draft notes")).toBeInTheDocument();
    expect(screen.getByText(/safe support report/i)).toBeInTheDocument();
    expect(screen.queryByText(/raw-secret|chad@example\.com|\/Users\/chad/)).not.toBeInTheDocument();
  });

  it("requires user-entered offer and target range before drafting negotiation notes", async () => {
    const user = userEvent.setup();
    renderSalary();

    await user.type(screen.getByLabelText("Job Title"), "Registered Nurse");
    await user.type(screen.getByLabelText("Location"), "Denver, CO");
    await user.click(screen.getByRole("button", { name: "Check Pay Range" }));

    const draftButton = await screen.findByRole("button", {
      name: "Draft Negotiation Notes",
    });

    expect(screen.getByText("Negotiation note facts")).toBeInTheDocument();
    expect(screen.getByLabelText("Written offer")).toBeInTheDocument();
    expect(screen.getByLabelText("Target minimum")).toBeInTheDocument();
    expect(screen.getByLabelText("Target maximum")).toBeInTheDocument();
    expect(screen.getByText(/will not turn benchmark points into an offer/i)).toBeInTheDocument();
    expect(screen.getByTestId("negotiation-fact-guidance")).toHaveTextContent(
      "Add the written offer and your target range before drafting notes.",
    );
    expect(draftButton).toBeDisabled();
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("sends only user-entered offer facts to the negotiation template", async () => {
    const user = userEvent.setup();
    mockInvoke
      .mockResolvedValueOnce({
        job_title: "Registered Nurse",
        location: "Denver, CO",
        seniority_level: "Principal",
        min_salary: 150000,
        p25_salary: 175000,
        median_salary: 200000,
        p75_salary: 230000,
        max_salary: 260000,
        average_salary: 205000,
        sample_size: 128,
        last_updated: "2026-05-20T00:00:00Z",
      })
      .mockResolvedValueOnce(
        "Thank you for the offer. My target range is $210,000-$225,000, and the current offer is $185,000.",
      );
    renderSalary();

    await user.type(screen.getByLabelText("Job Title"), "Registered Nurse");
    await user.type(screen.getByLabelText("Location"), "Denver, CO");
    await user.click(screen.getByRole("button", { name: "Check Pay Range" }));
    await screen.findByRole("button", { name: "Draft Negotiation Notes" });
    await user.type(screen.getByLabelText("Company (optional)"), "CareBridge Health");
    await user.type(screen.getByLabelText("Written offer"), "185000");
    await user.type(screen.getByLabelText("Target minimum"), "210000");
    await user.type(screen.getByLabelText("Target maximum"), "225000");

    await user.click(screen.getByRole("button", { name: "Draft Negotiation Notes" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("generate_negotiation_script", {
        scenario: "initial_offer",
        params: {
          company: "CareBridge Health",
          current_offer: "$185,000",
          job_title: "Registered Nurse",
          location: "Denver, CO",
          target_min: "$210,000",
          target_max: "$225,000",
          years_experience: "5",
        },
      });
    });
    const scriptCall = mockInvoke.mock.calls.find(
      ([command]) => command === "generate_negotiation_script",
    );
    expect(scriptCall?.[1]).not.toEqual(
      expect.objectContaining({
        params: expect.objectContaining({
          current_offer: "200000",
          target_salary: "230000",
        }),
      }),
    );
    expect(await screen.findByText(/My target range is \$210,000-\$225,000/i)).toBeInTheDocument();
  });

  it("keeps notes hidden when a template returns unreplaced placeholders", async () => {
    const user = userEvent.setup();
    mockInvoke
      .mockResolvedValueOnce({
        job_title: "Registered Nurse",
        location: "Denver, CO",
        seniority_level: "Principal",
        min_salary: 150000,
        p25_salary: 175000,
        median_salary: 200000,
        p75_salary: 230000,
        max_salary: 260000,
        average_salary: 205000,
        sample_size: 128,
        last_updated: "2026-05-20T00:00:00Z",
      })
      .mockResolvedValueOnce("Discuss {{current_offer}} with {{company}}.");
    renderSalary();

    await user.type(screen.getByLabelText("Job Title"), "Registered Nurse");
    await user.type(screen.getByLabelText("Location"), "Denver, CO");
    await user.click(screen.getByRole("button", { name: "Check Pay Range" }));
    await screen.findByRole("button", { name: "Draft Negotiation Notes" });
    await user.type(screen.getByLabelText("Written offer"), "185000");
    await user.type(screen.getByLabelText("Target minimum"), "210000");
    await user.type(screen.getByLabelText("Target maximum"), "225000");

    await user.click(screen.getByRole("button", { name: "Draft Negotiation Notes" }));

    expect(await screen.findByText("The note template needs checked facts before it can be shown.")).toBeInTheDocument();
    expect(screen.queryByText("Negotiation Notes")).not.toBeInTheDocument();
    expect(screen.queryByText(/{{current_offer}}|{{company}}/)).not.toBeInTheDocument();
  });

  it("blocks negotiation notes when target maximum is below target minimum", async () => {
    const user = userEvent.setup();
    renderSalary();

    await user.type(screen.getByLabelText("Job Title"), "Registered Nurse");
    await user.type(screen.getByLabelText("Location"), "Denver, CO");
    await user.click(screen.getByRole("button", { name: "Check Pay Range" }));
    const draftButton = await screen.findByRole("button", {
      name: "Draft Negotiation Notes",
    });
    await user.type(screen.getByLabelText("Written offer"), "185000");
    await user.type(screen.getByLabelText("Target minimum"), "225000");
    await user.type(screen.getByLabelText("Target maximum"), "210000");

    expect(screen.getByTestId("negotiation-fact-guidance")).toHaveTextContent(
      "Target maximum must be at least target minimum.",
    );
    expect(draftButton).toBeDisabled();
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });
});
