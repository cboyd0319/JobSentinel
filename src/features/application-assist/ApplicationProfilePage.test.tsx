import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ApplicationProfilePage from "./ApplicationProfilePage";

const mockInvoke = vi.mocked(invoke);

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock("../../shared/toast/useToast", () => ({
  useToast: () => mockToast,
}));

vi.mock("../../shared/errorReporting/logger", () => ({
  logError: vi.fn(),
}));

vi.mock("./ProfileForm", () => ({
  ProfileForm: () => <div data-testid="profile-form" />,
}));

vi.mock("./ScreeningAnswersForm", () => ({
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
    render(<ApplicationProfilePage onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("article", { name: "Submitted by You statistic" })).toBeInTheDocument();
    });

    expect(screen.getByRole("article", { name: "Opened for Review statistic" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Needs Follow-Up statistic" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Sent After Review statistic" })).toBeInTheDocument();
    expect(screen.queryByText("Marked Sent")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready to Send")).not.toBeInTheDocument();
    expect(screen.queryByText("Submission Rate")).not.toBeInTheDocument();
  });

  it("keeps the visible selected tab state aligned with the active panel", async () => {
    const user = userEvent.setup();

    render(<ApplicationProfilePage onBack={vi.fn()} />);

    const profileTab = screen.getByRole("tab", { name: "Profile" });
    const screeningTab = screen.getByRole("tab", { name: "Screening Questions" });

    expect(profileTab).toHaveAttribute("aria-selected", "true");
    expect(profileTab).toHaveAttribute("data-visual-state", "selected");
    expect(profileTab).toHaveClass("app-section-tab-selected");
    expect(screen.getByTestId("application-assist-tab-indicator-profile")).toBeInTheDocument();
    expect(screen.getByTestId("profile-form")).toBeInTheDocument();

    await user.click(screeningTab);

    expect(screeningTab).toHaveAttribute("aria-selected", "true");
    expect(screeningTab).toHaveAttribute("data-visual-state", "selected");
    expect(screeningTab).toHaveClass("app-section-tab-selected");
    expect(screen.getByTestId("application-assist-tab-indicator-screening")).toBeInTheDocument();
    expect(profileTab).toHaveAttribute("data-visual-state", "idle");
    expect(profileTab).toHaveClass("app-section-tab-idle");
    expect(screen.queryByTestId("application-assist-tab-indicator-profile")).not.toBeInTheDocument();
    expect(screen.getByTestId("screening-answers-form")).toBeInTheDocument();
  });

  it("keeps keyboard tab navigation in sync with the visible selected tab state", async () => {
    const user = userEvent.setup();

    render(<ApplicationProfilePage onBack={vi.fn()} />);

    const profileTab = screen.getByRole("tab", { name: "Profile" });
    const screeningTab = screen.getByRole("tab", { name: "Screening Questions" });

    profileTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(screeningTab).toHaveAttribute("aria-selected", "true");
    expect(screeningTab).toHaveAttribute("data-visual-state", "selected");
    expect(screeningTab).toHaveClass("app-section-tab-selected");
    expect(screen.getByTestId("application-assist-tab-indicator-screening")).toBeInTheDocument();
    expect(screen.getByTestId("screening-answers-form")).toBeInTheDocument();

    await user.keyboard("{Home}");

    expect(profileTab).toHaveAttribute("aria-selected", "true");
    expect(profileTab).toHaveAttribute("data-visual-state", "selected");
    expect(profileTab).toHaveClass("app-section-tab-selected");
    expect(screen.getByTestId("application-assist-tab-indicator-profile")).toBeInTheDocument();
    expect(screen.getByTestId("profile-form")).toBeInTheDocument();
  });
});
