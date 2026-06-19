import { describe, expect, it } from "vitest";
import { getPayFloorBenchmarkGuidance } from "./payFloorBenchmarkGuidance";

describe("pay floor benchmark guidance", () => {
  it("tells users to set a floor before comparing pay", () => {
    expect(
      getPayFloorBenchmarkGuidance({
        salaryFloorAmount: null,
        p25Salary: 70000,
        medianSalary: 90000,
        p75Salary: 120000,
      }),
    ).toEqual({
      message: "Add a salary floor to see when pay may be below what you need.",
      tone: "neutral",
    });
  });

  it("flags a low floor as anchoring-prone pay guidance", () => {
    expect(
      getPayFloorBenchmarkGuidance({
        salaryFloorAmount: 60000,
        p25Salary: 70000,
        medianSalary: 90000,
        p75Salary: 120000,
      }),
    ).toEqual({
      message:
        "Your floor is below the lower-pay part of this sample. Check whether this role is listed at too low a title or pay level, or whether your floor should move up.",
      tone: "caution",
    });
  });

  it("keeps higher-than-sample floors as scope checks rather than pressure to lower the floor", () => {
    expect(
      getPayFloorBenchmarkGuidance({
        salaryFloorAmount: 130000,
        p25Salary: 70000,
        medianSalary: 90000,
        p75Salary: 120000,
      }),
    ).toEqual({
      message:
        "Your floor is above the higher-pay part of this sample. Verify level, scope, location, and range quality before lowering it.",
      tone: "caution",
    });
  });

  it("treats invalid benchmark samples as unavailable", () => {
    expect(
      getPayFloorBenchmarkGuidance({
        salaryFloorAmount: 60000,
        p25Salary: 0,
        medianSalary: 90000,
        p75Salary: 120000,
      }),
    ).toEqual({
      message: "Benchmark range is not usable yet. Check written ranges before changing your floor.",
      tone: "neutral",
    });
  });
});
