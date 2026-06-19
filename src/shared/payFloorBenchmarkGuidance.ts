export interface PayFloorBenchmarkGuidanceInput {
  salaryFloorAmount: number | null;
  p25Salary: number;
  medianSalary: number;
  p75Salary: number;
}

export interface PayFloorBenchmarkGuidance {
  message: string;
  tone: "neutral" | "caution";
}

function isUsableBenchmarkRange(
  p25Salary: number,
  medianSalary: number,
  p75Salary: number,
) {
  return (
    Number.isFinite(p25Salary) &&
    Number.isFinite(medianSalary) &&
    Number.isFinite(p75Salary) &&
    p25Salary > 0 &&
    medianSalary >= p25Salary &&
    p75Salary >= medianSalary
  );
}

export function getPayFloorBenchmarkGuidance({
  salaryFloorAmount,
  p25Salary,
  medianSalary,
  p75Salary,
}: PayFloorBenchmarkGuidanceInput): PayFloorBenchmarkGuidance {
  if (!isUsableBenchmarkRange(p25Salary, medianSalary, p75Salary)) {
    return {
      message: "Benchmark range is not usable yet. Check written ranges before changing your floor.",
      tone: "neutral",
    };
  }

  if (salaryFloorAmount === null) {
    return {
      message: "Add a salary floor to see when pay may be below what you need.",
      tone: "neutral",
    };
  }

  if (salaryFloorAmount > p75Salary) {
    return {
      message:
        "Your floor is above the higher-pay part of this sample. Verify level, scope, location, and range quality before lowering it.",
      tone: "caution",
    };
  }

  if (salaryFloorAmount > medianSalary) {
    return {
      message:
        "Your floor is above the middle of this sample. Use role scope and written range evidence before compromising.",
      tone: "neutral",
    };
  }

  if (salaryFloorAmount < p25Salary) {
    return {
      message:
        "Your floor is below the lower-pay part of this sample. Check whether this role is listed at too low a title or pay level, or whether your floor should move up.",
      tone: "caution",
    };
  }

  return {
    message:
      "Your floor is within the middle of this sample range. Compare benefits, schedule, level, and promotion path before deciding.",
    tone: "neutral",
  };
}
