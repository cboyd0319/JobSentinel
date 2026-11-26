/** Validates the local search-country table and formats canonical country labels. */

const MAX_COUNTRY_OPTIONS = 249;
const MAX_COUNTRY_LABEL_LENGTH = 256;
const COUNTRY_CODE = /^[A-Z]{2}$/;

export type SearchCountryOption = readonly [code: string, label: string];

export function isSearchCountryCode(value: unknown): value is string {
  return typeof value === "string" && COUNTRY_CODE.test(value);
}

export function parseSearchCountryOptions(value: unknown): SearchCountryOption[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_COUNTRY_OPTIONS) {
    throw new Error("Invalid country options");
  }

  const codes = new Set<string>();
  return value.map((entry) => {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      !isSearchCountryCode(entry[0]) ||
      typeof entry[1] !== "string" ||
      entry[1].trim().length === 0 ||
      entry[1].length > MAX_COUNTRY_LABEL_LENGTH ||
      codes.has(entry[0])
    ) {
      throw new Error("Invalid country option");
    }
    codes.add(entry[0]);
    return [entry[0], entry[1]];
  });
}

export function searchCountryLabel(code: string): string {
  if (!isSearchCountryCode(code)) return code;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
