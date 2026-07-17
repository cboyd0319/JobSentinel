import { vi } from "vitest";

export { DEFAULT_PREFS } from "./notificationPreferences.testFixtures";

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
vi.mock("../../../shared/toast/useToast", () => ({
  useToast: () => mockToast,
}));

export function resetNotificationPreferencesMocks() {
  vi.clearAllMocks();
  mockInvoke.mockReset();
}
