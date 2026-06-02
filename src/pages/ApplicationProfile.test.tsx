import { render, screen, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ApplicationProfile from "./ApplicationProfile";

const mockInvoke = vi.mocked(invoke);

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock("../contexts", () => ({
  useToast: () => mockToast,
}));

vi.mock("../utils/errorUtils", () => ({
  logError: vi.fn(),
}));

vi.mock("../components/automation/ProfileForm", () => ({
  ProfileForm: () => <div data-testid="profile-form" />,
}));

vi.mock("../components/automation/ScreeningAnswersForm", () => ({
  ScreeningAnswersForm: () => <div data-testid="screening-answers-form" />,
}));

describe("ApplicationProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({
      totalAttempts: 4,
      submitted: 3,
      failed: 0,
      pending: 1,
      successRate: 75,
    });
  });

  it("keeps application stats clear that users submit themselves", async () => {
    render(<ApplicationProfile onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("article", { name: "Submitted by You statistic" })).toBeInTheDocument();
    });

    expect(screen.getByRole("article", { name: "Forms Opened statistic" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Needs Follow-Up statistic" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Submission Rate statistic" })).toBeInTheDocument();
    expect(screen.queryByText("Marked Sent")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready to Send")).not.toBeInTheDocument();
  });
});
