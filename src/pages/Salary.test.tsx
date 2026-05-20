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
      job_title: "Software Engineer",
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

  it("uses backend-supported principal seniority for principal and executive salary lookup", async () => {
    const user = userEvent.setup();
    renderSalary();

    await user.type(screen.getByLabelText("Job Title"), "Software Engineer");
    await user.type(screen.getByLabelText("Location"), "Denver, CO");
    await user.selectOptions(screen.getByLabelText("Seniority Level"), "principal");
    await user.click(screen.getByRole("button", { name: "Get Salary Data" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("get_salary_benchmark", {
        jobTitle: "Software Engineer",
        location: "Denver, CO",
        seniority: "principal",
      });
    });
  });
});
