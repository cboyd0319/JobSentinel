import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScreeningAnswersForm } from "./ScreeningAnswersForm";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("../../shared/toast/useToast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

describe("ScreeningAnswersForm initial state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });

  describe("form rendering", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue([]);
    });

    it("renders title and description", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText("Screening Question Answers")).toBeInTheDocument();
        expect(screen.getByText(/save answers to common questions/i)).toBeInTheDocument();
      });
    });

    it("renders the Add Answer button", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });
    });

    it("renders the heading beside its help control", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText("Screening Question Answers")).toBeInTheDocument();
      });
    });
  });

  it("shows the loading spinner initially", () => {
    mockInvoke.mockImplementation(() => new Promise(() => {}));

    render(<ScreeningAnswersForm />);

    expect(
      screen.getByRole("status", { name: /loading screening answers/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status").querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("marks the loading spinner as busy", () => {
    mockInvoke.mockImplementation(() => new Promise(() => {}));

    render(<ScreeningAnswersForm />);

    expect(
      screen.getByRole("status", { name: /loading screening answers/i }),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("hides the loading state after data loads", async () => {
    mockInvoke.mockResolvedValue([]);

    render(<ScreeningAnswersForm />);

    await waitFor(() => {
      expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
    });
  });
});
