import { describe, expect, it } from "vitest";
import {
  DEFAULT_RESTRICTED_SOURCE_ACKNOWLEDGEMENTS,
  isRestrictedJobSourceHost,
  isRestrictedJobSourceUrl,
  normalizeRestrictedSourceAcknowledgements,
  restrictedScheduledJobSourceLabel,
} from "./restrictedSourceTaxonomy";

describe("restrictedSourceTaxonomy", () => {
  it("matches restricted source hostnames and subdomains", () => {
    expect(isRestrictedJobSourceHost("linkedin.com")).toBe(true);
    expect(isRestrictedJobSourceHost("www.glassdoor.com")).toBe(true);
    expect(isRestrictedJobSourceHost("builtin.com")).toBe(true);
    expect(isRestrictedJobSourceHost("www.builtincolorado.com")).toBe(true);
    expect(isRestrictedJobSourceHost("jobs.naukri.com")).toBe(true);
    expect(isRestrictedJobSourceHost("boards.greenhouse.io")).toBe(false);
    expect(isRestrictedJobSourceHost("jobs.lever.co")).toBe(false);
  });

  it("matches restricted source URLs without throwing on invalid input", () => {
    expect(isRestrictedJobSourceUrl("https://www.indeed.com/jobs?q=manager")).toBe(true);
    expect(isRestrictedJobSourceUrl("https://builtin.com/jobs")).toBe(true);
    expect(isRestrictedJobSourceUrl("https://remoteok.com/remote-jobs")).toBe(false);
    expect(isRestrictedJobSourceUrl("not a url")).toBe(false);
  });

  it("normalizes scheduled source acknowledgement defaults", () => {
    expect(normalizeRestrictedSourceAcknowledgements({ dice: true })).toEqual({
      ...DEFAULT_RESTRICTED_SOURCE_ACKNOWLEDGEMENTS,
      dice: true,
    });
  });

  it("keeps user-facing labels centralized", () => {
    expect(restrictedScheduledJobSourceLabel("simplyhired")).toBe("SimplyHired");
  });
});
