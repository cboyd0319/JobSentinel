import { describe, expect, it, vi } from "vitest";
import {
  BROWSER_ASSIST_LEARNING_ENABLED_STORAGE_KEY,
  BROWSER_ASSIST_LEARNING_STORAGE_KEY,
  clearBrowserAssistLearningSignals,
  readBrowserAssistLearningEnabled,
  readBrowserAssistLearningSignals,
  recordBrowserAssistLearningSignal,
  summarizeBrowserAssistLearningSignals,
  writeBrowserAssistLearningEnabled,
} from "./browserAssistLearning";

function makeStorage(initial: Record<string, string | null> = {}) {
  const values = new Map(Object.entries(initial).filter(([, value]) => value !== null));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
}

describe("browser assistance learning", () => {
  it("keeps watch-and-learn off unless the user turns it on", () => {
    const storage = makeStorage();

    expect(readBrowserAssistLearningEnabled(storage)).toBe(false);

    writeBrowserAssistLearningEnabled(true, storage);
    expect(storage.setItem).toHaveBeenCalledWith(
      BROWSER_ASSIST_LEARNING_ENABLED_STORAGE_KEY,
      "true",
    );
    expect(readBrowserAssistLearningEnabled(storage)).toBe(true);

    writeBrowserAssistLearningEnabled(false, storage);
    expect(storage.removeItem).toHaveBeenCalledWith(
      BROWSER_ASSIST_LEARNING_ENABLED_STORAGE_KEY,
    );
    expect(readBrowserAssistLearningEnabled(storage)).toBe(false);
  });

  it("stores capped local action signals without notes or browser state", () => {
    const storage = makeStorage();

    const summary = recordBrowserAssistLearningSignal(
      {
        source: "linkedin-workbench",
        action: "saved",
        title: "Principal Security Engineer",
        company: "Example Co",
        recordedAt: "2026-06-19T12:00:00Z",
      },
      storage,
    );

    expect(summary).toMatchObject({
      totalSignals: 1,
      positiveSignals: 1,
      suggestedTitles: ["Principal Security Engineer"],
      suggestedCompanies: ["Example Co"],
    });
    expect(storage.setItem).toHaveBeenCalledWith(
      BROWSER_ASSIST_LEARNING_STORAGE_KEY,
      expect.stringContaining("Principal Security Engineer"),
    );
    expect(storage.setItem).not.toHaveBeenCalledWith(
      BROWSER_ASSIST_LEARNING_STORAGE_KEY,
      expect.stringContaining("cookie"),
    );
  });

  it("summarizes positive and not-interested signals separately", () => {
    expect(
      summarizeBrowserAssistLearningSignals([
        {
          source: "linkedin-workbench",
          action: "saved",
          title: "Program Manager",
          company: "Example Co",
          recordedAt: "2026-06-19T12:00:00Z",
        },
        {
          source: "linkedin-workbench",
          action: "not_interested",
          title: "Door-to-door Sales",
          company: "Example Co",
          recordedAt: "2026-06-19T12:01:00Z",
        },
      ]),
    ).toEqual({
      totalSignals: 2,
      positiveSignals: 1,
      negativeSignals: 1,
      suggestedTitles: ["Program Manager"],
      suggestedCompanies: ["Example Co"],
      avoidTitles: ["Door-to-door Sales"],
    });
  });

  it("ignores malformed stored learning data", () => {
    const storage = makeStorage({
      [BROWSER_ASSIST_LEARNING_STORAGE_KEY]: JSON.stringify([
        { source: "linkedin-workbench", action: "saved" },
        {
          source: "linkedin-workbench",
          action: "saved",
          title: "Support Lead",
          recordedAt: "2026-06-19T12:00:00Z",
        },
      ]),
    });

    expect(readBrowserAssistLearningSignals(storage)).toEqual([
      {
        source: "linkedin-workbench",
        action: "saved",
        title: "Support Lead",
        recordedAt: "2026-06-19T12:00:00Z",
      },
    ]);
  });

  it("lets the user clear learned signals", () => {
    const storage = makeStorage({
      [BROWSER_ASSIST_LEARNING_STORAGE_KEY]: "[]",
    });

    expect(clearBrowserAssistLearningSignals(storage)).toEqual({
      totalSignals: 0,
      positiveSignals: 0,
      negativeSignals: 0,
      suggestedTitles: [],
      suggestedCompanies: [],
      avoidTitles: [],
    });
    expect(storage.removeItem).toHaveBeenCalledWith(
      BROWSER_ASSIST_LEARNING_STORAGE_KEY,
    );
  });
});
