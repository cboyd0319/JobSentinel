import { describe, expect, it } from "vitest";
import {
  getResumeContactValidationMessage,
  type ResumeContactValidationInput,
} from "./resumeContactValidation";

function validContact(
  overrides: Partial<ResumeContactValidationInput> = {}
): ResumeContactValidationInput {
  return {
    name: "Jordan Lee",
    email: "jordan@example.com",
    phone: null,
    linkedin: null,
    github: null,
    website: null,
    ...overrides,
  };
}

describe("getResumeContactValidationMessage", () => {
  it("accepts valid minimal contact info", () => {
    expect(getResumeContactValidationMessage(validContact())).toBeUndefined();
  });

  it("requires name and valid email", () => {
    expect(getResumeContactValidationMessage(validContact({ name: " " }))).toBe(
      "Please enter your name"
    );
    expect(getResumeContactValidationMessage(validContact({ email: "bad" }))).toBe(
      "Please enter a valid email address (e.g., user@example.com)"
    );
  });

  it("validates optional phone number", () => {
    expect(getResumeContactValidationMessage(validContact({ phone: "123" }))).toBe(
      "Phone number must have 10-15 digits"
    );
  });

  it("accepts profile links with or without protocol", () => {
    const contact = validContact({
      linkedin: "linkedin.com/in/jordanlee",
      github: "https://github.com/jordanlee",
      website: "jordanlee.example",
    });

    expect(getResumeContactValidationMessage(contact)).toBeUndefined();
  });

  it("rejects deceptive schemes and embedded credentials before saving", () => {
    expect(
      getResumeContactValidationMessage(
        validContact({ linkedin: "httpjavascript://example.com" })
      )
    ).toBe("LinkedIn: URL must use http:// or https://");

    expect(
      getResumeContactValidationMessage(
        validContact({ website: "https://user:pass@example.com" })
      )
    ).toBe("Website: URL must not include credentials");
  });
});
