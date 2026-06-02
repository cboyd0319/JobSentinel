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
    expect(screen.getByText(/under-leveled/i)).toBeInTheDocument();
    expect(screen.getByText(/salary history/i)).toBeInTheDocument();
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
    expect(screen.getByText("Strong target from higher range")).toBeInTheDocument();
    expect(screen.queryByText(/25th %|75th %|75th percentile/i)).not.toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Draft Negotiation Notes" }));

    expect(await screen.findByText("Could not draft notes")).toBeInTheDocument();
    expect(screen.getByText(/safe support report/i)).toBeInTheDocument();
    expect(screen.queryByText(/raw-secret|chad@example\.com|\/Users\/chad/)).not.toBeInTheDocument();
  });
});
