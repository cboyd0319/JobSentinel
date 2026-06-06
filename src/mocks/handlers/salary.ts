export interface MockSalaryBenchmark {
  job_title: string;
  location: string;
  seniority_level: string;
  min_salary: number;
  p25_salary: number;
  median_salary: number;
  p75_salary: number;
  max_salary: number;
  average_salary: number;
  sample_size: number;
  last_updated: string;
}

export function getMockSalaryBenchmark(args?: Record<string, unknown>): MockSalaryBenchmark {
  const jobTitle = getStringArg(args, "jobTitle") ?? getStringArg(args, "job_title") ?? "Marketing Manager";
  const location = getStringArg(args, "location") ?? "Remote";
  const yearsExperience = getNumberArg(args, "yearsExperience") ?? getNumberArg(args, "years_experience");
  const seniority = yearsExperience === undefined
    ? getStringArg(args, "seniority") ?? "mid"
    : seniorityForYears(yearsExperience);
  const seniorityLabel = toMockSeniorityLabel(seniority);
  const seniorityMultiplier = seniorityLabel === "Entry"
    ? 0.72
    : seniorityLabel === "Senior"
      ? 1.18
      : seniorityLabel === "Staff" || seniorityLabel === "Principal"
        ? 1.38
        : 1;
  const base = Math.round(68000 * seniorityMultiplier);

  return {
    job_title: jobTitle,
    location,
    seniority_level: seniorityLabel,
    min_salary: base - 35000,
    p25_salary: base - 15000,
    median_salary: base,
    p75_salary: base + 30000,
    max_salary: base + 55000,
    average_salary: base + 5000,
    sample_size: 128,
    last_updated: new Date().toISOString(),
  };
}

function seniorityForYears(years: number): string {
  if (years <= 2) return "entry";
  if (years <= 5) return "mid";
  if (years <= 10) return "senior";
  if (years <= 15) return "staff";
  return "principal";
}

function toMockSeniorityLabel(value: string): string {
  switch (value.toLowerCase()) {
    case "entry":
      return "Entry";
    case "senior":
      return "Senior";
    case "staff":
      return "Staff";
    case "principal":
    case "executive":
      return "Principal";
    case "mid":
      return "Mid";
    default:
      return "Unknown";
  }
}

export function generateMockNegotiationScript(args?: Record<string, unknown>): string {
  const params = isRecord(getArg(args, "params")) ? getArg(args, "params") as Record<string, unknown> : {};
  const scenario = getStringArg(args, "scenario") ?? "initial_offer";
  const jobTitle = typeof params.job_title === "string" ? params.job_title : "the role";
  const company = typeof params.company === "string" ? params.company : "the employer";
  const location = typeof params.location === "string" ? params.location : "this location";
  const yearsExperience =
    typeof params.years_experience === "string" ? params.years_experience : "5";
  const targetMin = typeof params.target_min === "string" ? params.target_min : "68000";
  const targetMax = typeof params.target_max === "string" ? params.target_max : targetMin;
  const currentOffer = typeof params.current_offer === "string" ? params.current_offer : "64000";

  return [
    `Scenario: ${scenario.replace(/_/g, " ")}`,
    "",
    `Thank you for the offer for ${jobTitle} at ${company} in ${location}. Based on the role and my ${yearsExperience} years of experience, my target range is ${formatMockCurrency(targetMin)}-${formatMockCurrency(targetMax)}.`,
    `Given the current offer of ${formatMockCurrency(currentOffer)}, I would like to discuss aligning compensation closer to that range.`,
    "",
    "Key points:",
    "- Confirm every offer, target, and company detail before sending.",
    "- Keep tone collaborative and specific.",
    "- Ask whether base salary, bonus, or equity can close the gap.",
  ].join("\n");
}

function formatMockCurrency(value: string): string {
  const numeric = Number(value.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) {
    return value;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function getStringArg(
  args: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = getArg(args, key);
  return typeof value === "string" ? value : undefined;
}

function getNumberArg(
  args: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const value = getArg(args, key);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getArg(
  args: Record<string, unknown> | undefined,
  key: string,
): unknown {
  const nestedArgs = args?.payload as Record<string, unknown> | undefined;
  return args?.[key] ?? nestedArgs?.[key];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
