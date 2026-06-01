import { describe, it, expect } from "vitest";
import {
  getScoreColor,
  getScoreBg,
  getScoreLabel,
  scoreFractionToPercent,
} from "./scoreUtils";

describe("scoreUtils", () => {
  describe("scoreFractionToPercent", () => {
    it("converts backend score fractions to display percentages", () => {
      expect(scoreFractionToPercent(0)).toBe(0);
      expect(scoreFractionToPercent(0.5)).toBe(50);
      expect(scoreFractionToPercent(0.756)).toBe(76);
      expect(scoreFractionToPercent(1)).toBe(100);
    });

    it("clamps out-of-range score fractions", () => {
      expect(scoreFractionToPercent(-0.25)).toBe(0);
      expect(scoreFractionToPercent(1.25)).toBe(100);
    });
  });

  describe("getScoreColor", () => {
    it("returns green for scores >= 80", () => {
      expect(getScoreColor(80)).toBe("text-green-600 dark:text-green-400");
      expect(getScoreColor(90)).toBe("text-green-600 dark:text-green-400");
      expect(getScoreColor(100)).toBe("text-green-600 dark:text-green-400");
    });

    it("returns yellow for scores >= 60 and < 80", () => {
      expect(getScoreColor(60)).toBe("text-yellow-600 dark:text-yellow-400");
      expect(getScoreColor(70)).toBe("text-yellow-600 dark:text-yellow-400");
      expect(getScoreColor(79)).toBe("text-yellow-600 dark:text-yellow-400");
    });

    it("returns orange for scores >= 40 and < 60", () => {
      expect(getScoreColor(40)).toBe("text-orange-600 dark:text-orange-400");
      expect(getScoreColor(50)).toBe("text-orange-600 dark:text-orange-400");
      expect(getScoreColor(59)).toBe("text-orange-600 dark:text-orange-400");
    });

    it("returns red for scores < 40", () => {
      expect(getScoreColor(0)).toBe("text-red-600 dark:text-red-400");
      expect(getScoreColor(20)).toBe("text-red-600 dark:text-red-400");
      expect(getScoreColor(39)).toBe("text-red-600 dark:text-red-400");
    });
  });

  describe("getScoreBg", () => {
    it("returns green for scores >= 80", () => {
      expect(getScoreBg(80)).toBe("bg-green-500");
      expect(getScoreBg(100)).toBe("bg-green-500");
    });

    it("returns yellow for scores >= 60 and < 80", () => {
      expect(getScoreBg(60)).toBe("bg-yellow-500");
      expect(getScoreBg(79)).toBe("bg-yellow-500");
    });

    it("returns orange for scores >= 40 and < 60", () => {
      expect(getScoreBg(40)).toBe("bg-orange-500");
      expect(getScoreBg(59)).toBe("bg-orange-500");
    });

    it("returns red for scores < 40", () => {
      expect(getScoreBg(0)).toBe("bg-red-500");
      expect(getScoreBg(39)).toBe("bg-red-500");
    });
  });

  describe("getScoreLabel", () => {
    it("returns 'Strong' for scores >= 90", () => {
      expect(getScoreLabel(90)).toBe("Strong");
      expect(getScoreLabel(100)).toBe("Strong");
    });

    it("returns 'Useful' for scores >= 80 and < 90", () => {
      expect(getScoreLabel(80)).toBe("Useful");
      expect(getScoreLabel(89)).toBe("Useful");
    });

    it("returns 'Some' for scores >= 70 and < 80", () => {
      expect(getScoreLabel(70)).toBe("Some");
      expect(getScoreLabel(79)).toBe("Some");
    });

    it("returns 'Review' for scores >= 60 and < 70", () => {
      expect(getScoreLabel(60)).toBe("Review");
      expect(getScoreLabel(69)).toBe("Review");
    });

    it("returns 'Needs review' for scores >= 40 and < 60", () => {
      expect(getScoreLabel(40)).toBe("Needs review");
      expect(getScoreLabel(59)).toBe("Needs review");
    });

    it("returns 'Low evidence' for scores < 40", () => {
      expect(getScoreLabel(0)).toBe("Low evidence");
      expect(getScoreLabel(39)).toBe("Low evidence");
    });
  });
});
