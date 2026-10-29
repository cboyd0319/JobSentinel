/** Validates, formats, and compares native listed-pay evidence without currency assumptions. */

export type ListedPayPeriod =
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "annual"
  | "contract"
  | "stipend"
  | "not_disclosed";
export type ListedPayQualifier = "ctc" | "pro_rata" | "stipend";

export interface ListedPay {
  min: number | null;
  max: number | null;
  currency: string | null;
  period: ListedPayPeriod;
  qualifiers: ListedPayQualifier[];
  raw_text: string | null;
}

export interface UsdAnnualPayBounds {
  min: number | null;
  max: number | null;
}

export interface JobPayInput {
  listed_pay?: unknown | null;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
}

const LISTED_PAY_KEYS = [
  "min",
  "max",
  "currency",
  "period",
  "qualifiers",
  "raw_text",
] as const;
const PAY_PERIODS: readonly ListedPayPeriod[] = [
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "annual",
  "contract",
  "stipend",
  "not_disclosed",
];
const PAY_QUALIFIERS: readonly ListedPayQualifier[] = [
  "ctc",
  "pro_rata",
  "stipend",
];
const CURRENCY_CODE = /^[A-Z]{3}$/u;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
}

function isCurrency(value: unknown): value is string {
  return typeof value === "string" && CURRENCY_CODE.test(value);
}

function hasHiddenControl(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 ||
      (code >= 0x200c && code <= 0x200f) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x206f) ||
      (code >= 0xfff9 && code <= 0xfffb);
  });
}

function isRawText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && new TextEncoder().encode(value).length <= 1024 && !hasHiddenControl(value);
}

function isPeriod(value: unknown): value is ListedPayPeriod {
  return typeof value === "string" && PAY_PERIODS.includes(value as ListedPayPeriod);
}

function isQualifier(value: unknown): value is ListedPayQualifier {
  return typeof value === "string" && PAY_QUALIFIERS.includes(value as ListedPayQualifier);
}

/** Parses the exact IPC shape accepted by the persisted native-pay contract. */
export function parseListedPay(value: unknown): ListedPay | null {
  try {
    const pay = asRecord(value);
    if (!pay) return null;
    const keys = Object.keys(pay);
    if (keys.length !== LISTED_PAY_KEYS.length || keys.some((key) => !LISTED_PAY_KEYS.includes(key as (typeof LISTED_PAY_KEYS)[number]))) return null;

    const min = pay.min === null ? null : isAmount(pay.min) ? pay.min : null;
    const max = pay.max === null ? null : isAmount(pay.max) ? pay.max : null;
    const currency = pay.currency === null ? null : isCurrency(pay.currency) ? pay.currency : null;
    const rawText = pay.raw_text === null ? null : isRawText(pay.raw_text) ? pay.raw_text : null;
    if (
      (pay.min !== null && min === null) ||
      (pay.max !== null && max === null) ||
      (pay.currency !== null && currency === null) ||
      (pay.raw_text !== null && rawText === null) ||
      !isPeriod(pay.period) ||
      !Array.isArray(pay.qualifiers) ||
      pay.qualifiers.length > 3 ||
      !pay.qualifiers.every(isQualifier) ||
      new Set(pay.qualifiers).size !== pay.qualifiers.length ||
      (min !== null && max !== null && min > max) ||
      (min === null && max === null && rawText === null)
    ) return null;

    return { min, max, currency, period: pay.period, qualifiers: pay.qualifiers, raw_text: rawText };
  } catch {
    return null;
  }
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 20 }).format(value);
}

function formatAmountRange(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return min === max ? formatAmount(min) : `${formatAmount(min)}–${formatAmount(max)}`;
  if (min !== null) return `From ${formatAmount(min)}`;
  if (max !== null) return `Up to ${formatAmount(max)}`;
  return null;
}

const periodLabels: Record<ListedPayPeriod, string> = {
  hourly: "hourly",
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  annual: "annual",
  contract: "contract",
  stipend: "stipend",
  not_disclosed: "period not disclosed",
};
const qualifierLabels: Record<ListedPayQualifier, string> = {
  ctc: "CTC",
  pro_rata: "Pro rata",
  stipend: "Stipend",
};

/** Formats valid native evidence as published, without FX conversion or annualization. */
export function formatNativeListedPay(pay: ListedPay): string {
  const amount = formatAmountRange(pay.min, pay.max);
  const context = [
    pay.currency ?? "Currency not disclosed",
    periodLabels[pay.period],
    ...pay.qualifiers.map((qualifier) => qualifierLabels[qualifier]),
    ...(amount !== null && pay.raw_text ? [`Source text: ${pay.raw_text}`] : []),
  ];
  return `${amount ?? `Source text: ${pay.raw_text ?? ""}`} ${context.join(" · ")}`;
}

function legacyBounds(input: JobPayInput): UsdAnnualPayBounds | null {
  const min = input.salary_min;
  const max = input.salary_max;
  if (
    (min !== null && min !== undefined && !isAmount(min)) ||
    (max !== null && max !== undefined && !isAmount(max)) ||
    (min != null && max != null && min > max) ||
    (min == null && max == null)
  ) return null;
  return { min: min ?? null, max: max ?? null };
}

function formatUsdAnnualAmount(value: number): string {
  return value >= 1_000 ? `$${Math.round(value / 1_000)}k` : `$${value}`;
}

function formatLegacyListedPay(input: JobPayInput): string {
  const bounds = legacyBounds(input);
  if (!bounds) return input.salary_min == null && input.salary_max == null ? "Pay not listed" : "Listed pay could not be read";
  if (input.currency === "USD") {
    if (bounds.min !== null && bounds.max !== null) return `${formatUsdAnnualAmount(bounds.min)} - ${formatUsdAnnualAmount(bounds.max)}`;
    if (bounds.min !== null) return `${formatUsdAnnualAmount(bounds.min)}+`;
    if (bounds.max !== null) return `Up to ${formatUsdAnnualAmount(bounds.max)}`;
    return "Pay not listed";
  }
  const amount = formatAmountRange(bounds.min, bounds.max);
  if (amount === null) return "Pay not listed";
  if (input.currency === null || input.currency === undefined) {
    return `${amount} Currency not disclosed · period not recorded`;
  }
  if (!isCurrency(input.currency)) return "Listed pay could not be read";
  return `${amount} ${input.currency} · period not recorded`;
}

/** Returns display text while blocking legacy fallback when a supplied native object is malformed. */
export function formatJobListedPay(input: JobPayInput): string {
  if (input.listed_pay !== null && input.listed_pay !== undefined) {
    const nativePay = parseListedPay(input.listed_pay);
    return nativePay ? formatNativeListedPay(nativePay) : "Listed pay could not be read";
  }
  return formatLegacyListedPay(input);
}

/** Returns bounds only when evidence explicitly represents unqualified annual USD pay. */
export function getJobUsdAnnualPayBounds(input: JobPayInput): UsdAnnualPayBounds | null {
  if (input.listed_pay !== null && input.listed_pay !== undefined) {
    const nativePay = parseListedPay(input.listed_pay);
    return nativePay && nativePay.currency === "USD" && nativePay.period === "annual" && nativePay.qualifiers.length === 0 && (nativePay.min !== null || nativePay.max !== null)
      ? { min: nativePay.min, max: nativePay.max }
      : null;
  }
  return input.currency === "USD" ? legacyBounds(input) : null;
}
