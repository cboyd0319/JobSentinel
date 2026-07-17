import { render } from "@testing-library/react";
import { vi } from "vitest";
import { UndoProvider } from "../../app/providers/UndoProvider";

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

export function renderWithProviders(ui: React.ReactElement) {
  return render(<UndoProvider>{ui}</UndoProvider>);
}

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

export const mockTemplate = {
  id: "template-1",
  name: "Test Template",
  content: "Dear {hiring_manager},\n\nI am applying for {position} at {company}.",
  category: "general" as const,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

export function setupCoverLetterTemplateMocks() {
  vi.clearAllMocks();
  mockInvoke.mockReset();
  (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockResolvedValue(
    undefined,
  );
}
