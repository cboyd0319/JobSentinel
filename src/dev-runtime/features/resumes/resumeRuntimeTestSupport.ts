import { vi } from "vitest";
import { resetMockData } from "../../mocks/handlers";

export function setupResumeRuntimeMocks() {
  vi.useRealTimers();
  let localStore: Record<string, string> = {};
  vi.mocked(window.localStorage.getItem).mockImplementation(
    (key) => localStore[key] ?? null,
  );
  vi.mocked(window.localStorage.setItem).mockImplementation((key, value) => {
    localStore[key] = value;
  });
  vi.mocked(window.localStorage.removeItem).mockImplementation((key) => {
    delete localStore[key];
  });
  vi.mocked(window.localStorage.clear).mockImplementation(() => {
    localStore = {};
  });
  resetMockData();
}
