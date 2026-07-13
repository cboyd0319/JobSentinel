import { describe, expect, it } from "vitest";
import {
  validateRequired,
  validateRequiredQuestionWording,
} from "./applicationFormValidation";

describe("application form validation", () => {
  describe("required fields", () => {
    it("accepts non-empty values", () => {
      expect(validateRequired(" value ")).toBeUndefined();
    });

    it("uses plain guidance for the default field", () => {
      expect(validateRequired(" ")).toBe("Add this detail.");
    });

    it("names a provided field", () => {
      expect(validateRequired("", "Full name")).toBe("Add full name.");
    });
  });

  describe("screening-question wording", () => {
    it("accepts wording and treats symbols as literal text", () => {
      expect(
        validateRequiredQuestionWording("salary expectation"),
      ).toBeUndefined();
      expect(validateRequiredQuestionWording("[warehouse")).toBeUndefined();
      expect(
        validateRequiredQuestionWording("Security+ certification"),
      ).toBeUndefined();
    });

    it("rejects empty wording", () => {
      expect(validateRequiredQuestionWording(" ")).toBe(
        "Add question wording.",
      );
    });
  });
});
