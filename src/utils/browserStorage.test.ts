import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStorage,
  readStorageValue,
  removeStorageValue,
  writeStorageValue,
} from "./browserStorage";

describe("browserStorage", () => {
  const localStore: Record<string, string> = {};

  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockImplementation((key) => localStore[key] ?? null);
    vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
      localStore[key] = value;
    });
    vi.mocked(localStorage.removeItem).mockImplementation((key) => {
      delete localStore[key];
    });
    vi.mocked(localStorage.clear).mockImplementation(() => {
      Object.keys(localStore).forEach((key) => delete localStore[key]);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.keys(localStore).forEach((key) => delete localStore[key]);
    sessionStorage.clear();
  });

  it("reads and writes local storage values", () => {
    expect(writeStorageValue("local", "jobsentinel-test", "value")).toBe(true);
    expect(readStorageValue("local", "jobsentinel-test")).toBe("value");
  });

  it("removes session storage values", () => {
    expect(writeStorageValue("session", "jobsentinel-test", "value")).toBe(true);
    expect(removeStorageValue("session", "jobsentinel-test")).toBe(true);
    expect(readStorageValue("session", "jobsentinel-test")).toBeNull();
  });

  it("clears local storage values", () => {
    expect(writeStorageValue("local", "jobsentinel-test", "value")).toBe(true);
    expect(clearStorage("local")).toBe(true);
    expect(readStorageValue("local", "jobsentinel-test")).toBeNull();
  });

  it("returns safe fallbacks when storage access throws", () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.mocked(localStorage.removeItem).mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.mocked(localStorage.clear).mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    expect(readStorageValue("local", "jobsentinel-test")).toBeNull();
    expect(writeStorageValue("local", "jobsentinel-test", "value")).toBe(false);
    expect(removeStorageValue("local", "jobsentinel-test")).toBe(false);
    expect(clearStorage("local")).toBe(false);
  });
});
