import {
  generateMockNegotiationScript,
  getMockSalaryBenchmark,
} from "../mockHandlers";

export interface MockSalaryCommandResult {
  handled: boolean;
  value: unknown;
}

export function handleMockSalaryCommand(
  command: string,
  args?: Record<string, unknown>,
): MockSalaryCommandResult {
  switch (command) {
    case "predict_salary":
      return {
        handled: true,
        value: { min: 55000, max: 76000, median: 65000 },
      };
    case "get_salary_benchmark":
      return { handled: true, value: getMockSalaryBenchmark(args) };
    case "generate_negotiation_script":
      return { handled: true, value: generateMockNegotiationScript(args) };
    default:
      return { handled: false, value: undefined };
  }
}
