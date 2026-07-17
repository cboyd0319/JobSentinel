import { vi } from "vitest";

export const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

export const testSteps = [
  { target: "#step1", title: "Step 1", content: "First step content" },
  { target: "#step2", title: "Step 2", content: "Second step content" },
  { target: "#step3", title: "Step 3", content: "Third step content" },
];

export function resetOnboardingTest() {
  localStorageMock.clear();
  vi.clearAllMocks();
}

Object.defineProperty(window, "localStorage", { value: localStorageMock });
