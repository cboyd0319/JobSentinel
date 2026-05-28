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
    expect(screen.getByRole("button", { name: "Check Pay Range" })).toBeInTheDocument();
    expect(screen.getByLabelText("Job Title")).toHaveAttribute(
      "placeholder",
      "e.g., Registered Nurse",
    );
  });

  it("uses backend-supported principal seniority for principal and executive salary lookup", async () => {
    const user = userEvent.setup();
    renderSalary();

    await user.type(screen.getByLabelText("Job Title"), "Registered Nurse");
    await user.type(screen.getByLabelText("Location"), "Denver, CO");
    await user.selectOptions(screen.getByLabelText("Seniority Level"), "principal");
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

    expect(await screen.findByText(/below the 25th percentile sample/i)).toBeInTheDocument();
    expect(screen.getByText(/under-leveled/i)).toBeInTheDocument();
    expect(screen.getByText(/salary history/i)).toBeInTheDocument();
  });
});
