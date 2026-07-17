import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { expect, vi } from "vitest";
import { ScreeningAnswersForm } from "./ScreeningAnswersForm";

export const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};
vi.mock("../../shared/toast/useToast", () => ({
  useToast: () => mockToast,
}));

export function resetScreeningAnswerMocks() {
  vi.clearAllMocks();
  mockInvoke.mockReset();
}

export async function openAndSubmitAnswer(
  user: ReturnType<typeof userEvent.setup>,
  options: {
    pattern?: string;
    answer?: string;
    notes?: string;
    onSaved?: () => void;
  } = {},
) {
  render(<ScreeningAnswersForm onSaved={options.onSaved} />);
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: /add answer/i }),
    ).toBeInTheDocument();
  });
  await user.click(screen.getByRole("button", { name: /add answer/i }));
  fireEvent.change(screen.getByLabelText(/question wording to look for/i), {
    target: { value: options.pattern ?? "test.*pattern" },
  });
  fireEvent.change(screen.getByLabelText(/your answer/i), {
    target: { value: options.answer ?? "Test answer" },
  });
  if (options.notes !== undefined) {
    fireEvent.change(screen.getByLabelText(/notes/i), {
      target: { value: options.notes },
    });
  }
  await user.click(screen.getByRole("button", { name: /save answer/i }));
}
