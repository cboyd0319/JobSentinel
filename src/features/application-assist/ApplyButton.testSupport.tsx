import { render } from "@testing-library/react";
import { vi } from "vitest";
import { ToastProvider } from "../../app/providers/ToastProvider";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const { invoke } = await import("@tauri-apps/api/core");
export const mockInvoke = vi.mocked(invoke);

export function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

export const mockJob = {
  id: 1,
  hash: "test-hash-123",
  title: "Customer Support Lead",
  company: "CareBridge Services",
  location: "Chicago, IL",
  url: "https://example.com/jobs/123",
  description: "Great opportunity",
  score: 85,
};

export const mockAtsDetection = {
  platform: "greenhouse",
  commonFields: ["email", "phone", "name"],
  automationNotes: "Greenhouse recognized",
};

export function makeFormFillResult(
  overrides: Record<string, unknown> = {},
) {
  return {
    filledFields: ["name"],
    unfilledFields: [],
    captchaDetected: false,
    readyForReview: true,
    errorMessage: null,
    attemptId: 123,
    durationMs: 1000,
    atsPlatform: "greenhouse",
    ...overrides,
  };
}

export function setupApplyButtonMocks() {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(localStorage.getItem).mockReturnValue(null);
  vi.mocked(localStorage.setItem).mockImplementation(() => {});
  vi.mocked(localStorage.removeItem).mockImplementation(() => {});
}
