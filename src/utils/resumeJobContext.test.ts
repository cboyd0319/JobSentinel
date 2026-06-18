import { beforeEach, describe, expect, it } from "vitest";
import { readStorageValue, writeStorageValue } from "./browserStorage";
import {
  clearStoredResumeJobContext,
  hasStoredResumeJobContext,
  readStoredResumeJobContext,
  takeStoredResumeJobContext,
  writeStoredResumeJobContext,
} from "./resumeJobContext";

describe("resumeJobContext", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("reads valid saved job context", () => {
    expect(writeStoredResumeJobContext("Required: scheduling", 1_000)).toBe(true);

    expect(readStoredResumeJobContext(1_500)).toEqual({
      timestamp: 1_000,
      description: "Required: scheduling",
    });
    expect(hasStoredResumeJobContext(1_500)).toBe(true);
  });

  it("removes malformed saved job context", () => {
    writeStorageValue(
      "session",
      "jobContext",
      JSON.stringify({ timestamp: Date.now(), description: { text: "bad" } }),
    );

    expect(readStoredResumeJobContext()).toBeNull();
    expect(readStorageValue("session", "jobContext")).toBeNull();
    expect(hasStoredResumeJobContext()).toBe(false);
  });

  it("removes expired saved job context", () => {
    const now = 100 * 60 * 60 * 1_000;
    writeStoredResumeJobContext("Expired job post", now - 31 * 60 * 1_000);

    expect(readStoredResumeJobContext(now)).toBeNull();
    expect(readStorageValue("session", "jobContext")).toBeNull();
  });

  it("takes valid saved job context once", () => {
    expect(writeStoredResumeJobContext("Required: case notes", 1_000)).toBe(true);

    expect(takeStoredResumeJobContext(1_500)).toEqual({
      timestamp: 1_000,
      description: "Required: case notes",
    });
    expect(readStorageValue("session", "jobContext")).toBeNull();
    expect(takeStoredResumeJobContext(1_600)).toBeNull();
  });

  it("does not save empty job context", () => {
    expect(writeStoredResumeJobContext("   ")).toBe(false);
    expect(readStorageValue("session", "jobContext")).toBeNull();
  });

  it("clears saved job context", () => {
    writeStoredResumeJobContext("Required: customer support");

    expect(clearStoredResumeJobContext()).toBe(true);
    expect(readStorageValue("session", "jobContext")).toBeNull();
  });
});
