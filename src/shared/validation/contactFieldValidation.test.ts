import { describe, expect, it } from "vitest";
import {
  validateEmail,
  validatePhone,
  validateRequiredEmail,
  validateUrl,
  validateUrlWithOptionalProtocol,
} from "./contactFieldValidation";

describe("contact field validation", () => {
  describe("email", () => {
    it("accepts valid and empty optional addresses", () => {
      expect(validateEmail("user@example.com")).toBeUndefined();
      expect(validateEmail("user+tag@example.com")).toBeUndefined();
      expect(validateEmail(" ")).toBeUndefined();
    });

    it("rejects invalid addresses after trimming", () => {
      expect(validateEmail(" user@example.com ")).toBeUndefined();
      expect(validateEmail("user@domain")).toBe(
        "Use an email address like user@example.com.",
      );
      expect(validateEmail("user @example.com")).toBe(
        "Use an email address like user@example.com.",
      );
    });

    it("requires an address when requested", () => {
      expect(validateRequiredEmail(" ")).toBe("Add email address.");
      expect(validateRequiredEmail("invalid")).toBe(
        "Use an email address like user@example.com.",
      );
      expect(validateRequiredEmail("user@example.com")).toBeUndefined();
    });
  });

  describe("web links", () => {
    it("accepts optional HTTP and HTTPS links", () => {
      expect(validateUrl(" ")).toBeUndefined();
      expect(
        validateUrl("https://example.com/path?query=value"),
      ).toBeUndefined();
      expect(validateUrl("http://example.com:8080")).toBeUndefined();
    });

    it("rejects missing and unsupported protocols", () => {
      expect(validateUrl("example.com")).toBe(
        "Use a web link like https://example.com.",
      );
      expect(validateUrl("javascript:alert(1)")).toBe(
        "Use a web link that starts with https:// or http://.",
      );
    });

    it("accepts profile links with an omitted protocol", () => {
      expect(
        validateUrlWithOptionalProtocol("alex-rivera.example/profile"),
      ).toBeUndefined();
      expect(
        validateUrlWithOptionalProtocol("https://example.com/profile"),
      ).toBeUndefined();
      expect(validateUrlWithOptionalProtocol(" ")).toBeUndefined();
    });

    it("rejects unsupported schemes and embedded credentials", () => {
      const schemeHelp =
        "Paste a normal web link. Start with https:// if the link does not work.";
      expect(validateUrlWithOptionalProtocol("ftp://example.com")).toBe(
        schemeHelp,
      );
      expect(
        validateUrlWithOptionalProtocol("httpjavascript://example.com"),
      ).toBe(schemeHelp);
      expect(
        validateUrlWithOptionalProtocol("https://user:pass@example.com"),
      ).toBe(
        "Remove any sign-in name or password from the link, then try again.",
      );
    });
  });

  describe("phone number", () => {
    it("accepts optional numbers with 10 to 15 digits", () => {
      expect(validatePhone(" ")).toBeUndefined();
      expect(validatePhone("(123) 456-7890")).toBeUndefined();
      expect(validatePhone("+12 345 678 901 234")).toBeUndefined();
    });

    it("rejects numbers outside the supported length", () => {
      const help = "Use a phone number with 10 to 15 digits.";
      expect(validatePhone("123456789")).toBe(help);
      expect(validatePhone("1234567890123456")).toBe(help);
    });

    it("counts digits independently of formatting", () => {
      expect(validatePhone("call: 123-456-7890")).toBeUndefined();
    });
  });
});
