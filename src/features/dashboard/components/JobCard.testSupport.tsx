import { render } from "@testing-library/react";
import { vi } from "vitest";
import { ToastProvider } from "../../../app/providers/ToastProvider";

vi.mock("../../../shared/search-links", () => ({
  openDeepLink: vi.fn(),
}));
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
  title: "Customer Support Lead",
  company: "CareBridge Services",
  location: "Chicago, IL",
  url: "https://example.com/job/1",
  source: "LinkedIn",
  score: 0.85,
  created_at: new Date().toISOString(),
  description:
    "We are looking for a helpful support lead to guide our care team.",
  salary_min: 55000,
  salary_max: 72000,
  remote: false,
  bookmarked: false,
  notes: null,
};

export function setupJobCardMocks() {
  vi.clearAllMocks();
  mockInvoke.mockReset();
  window.localStorage.clear();
}
