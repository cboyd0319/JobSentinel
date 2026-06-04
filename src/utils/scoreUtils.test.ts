import { describe, it, expect } from "vitest";
import {
  getScoreColor,
  getScoreBg,
  getScoreDisplayValue,
  getScoreLabel,
  getScoreProgressPercent,
  isValidScorePercent,
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

    it("returns neutral for invalid display scores", () => {
      expect(getScoreColor(Number.NaN)).toBe("text-surface-500 dark:text-surface-400");
      expect(getScoreColor(Infinity)).toBe("text-surface-500 dark:text-surface-400");
      expect(getScoreColor(-1)).toBe("text-surface-500 dark:text-surface-400");
      expect(getScoreColor(101)).toBe("text-surface-500 dark:text-surface-400");
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

    it("returns neutral for invalid display scores", () => {
      expect(getScoreBg(Number.NaN)).toBe("bg-surface-400");
      expect(getScoreBg(Infinity)).toBe("bg-surface-400");
      expect(getScoreBg(-1)).toBe("bg-surface-400");
      expect(getScoreBg(101)).toBe("bg-surface-400");
    });
  });

  describe("getScoreLabel", () => {
    it("returns 'Strong evidence' for scores >= 90", () => {
      expect(getScoreLabel(90)).toBe("Strong evidence");
      expect(getScoreLabel(100)).toBe("Strong evidence");
    });

    it("returns 'Clear evidence' for scores >= 80 and < 90", () => {
      expect(getScoreLabel(80)).toBe("Clear evidence");
      expect(getScoreLabel(89)).toBe("Clear evidence");
    });

    it("returns 'Some evidence' for scores >= 70 and < 80", () => {
      expect(getScoreLabel(70)).toBe("Some evidence");
      expect(getScoreLabel(79)).toBe("Some evidence");
    });

    it("returns 'Mixed evidence' for scores >= 60 and < 70", () => {
      expect(getScoreLabel(60)).toBe("Mixed evidence");
      expect(getScoreLabel(69)).toBe("Mixed evidence");
    });

    it("returns 'Needs review' for scores >= 40 and < 60", () => {
      expect(getScoreLabel(40)).toBe("Needs review");
      expect(getScoreLabel(59)).toBe("Needs review");
    });

    it("returns 'Low evidence' for scores < 40", () => {
      expect(getScoreLabel(0)).toBe("Low evidence");
      expect(getScoreLabel(39)).toBe("Low evidence");
    });

    it("returns unavailable label for invalid display scores", () => {
      expect(getScoreLabel(Number.NaN)).toBe("Score not shown");
      expect(getScoreLabel(Infinity)).toBe("Score not shown");
      expect(getScoreLabel(-1)).toBe("Score not shown");
      expect(getScoreLabel(101)).toBe("Score not shown");
    });
  });

  describe("score display validation", () => {
    it("accepts finite scores from 0 to 100", () => {
      expect(isValidScorePercent(0)).toBe(true);
      expect(isValidScorePercent(50)).toBe(true);
      expect(isValidScorePercent(100)).toBe(true);
    });

    it("rejects malformed display scores", () => {
      expect(isValidScorePercent(Number.NaN)).toBe(false);
      expect(isValidScorePercent(Infinity)).toBe(false);
      expect(isValidScorePercent(-1)).toBe(false);
      expect(isValidScorePercent(101)).toBe(false);
      expect(isValidScorePercent("80")).toBe(false);
    });

    it("formats invalid numeric scores as unavailable", () => {
      expect(getScoreDisplayValue(82.4)).toBe("82");
      expect(getScoreDisplayValue(Number.NaN)).toBe("--");
      expect(getScoreDisplayValue(Infinity)).toBe("--");
      expect(getScoreDisplayValue(-1)).toBe("--");
      expect(getScoreDisplayValue(101)).toBe("--");
    });

    it("uses zero progress for invalid display scores", () => {
      expect(getScoreProgressPercent(82)).toBe(82);
      expect(getScoreProgressPercent(Number.NaN)).toBe(0);
      expect(getScoreProgressPercent(Infinity)).toBe(0);
      expect(getScoreProgressPercent(-1)).toBe(0);
      expect(getScoreProgressPercent(101)).toBe(0);
    });
  });
});
