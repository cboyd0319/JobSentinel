/** Classifies bounded mock job geography for browser-development country filtering. */

import { isMockSearchCountry, mockSearchCountryOptions } from "../../mocks/data";
import type { MockSearchCountry } from "../../mocks/data";
import type { MockJob } from "../../mocks/handlers/types";
import { deriveMockWorkArrangement } from "./workArrangement";

const MAX_LOCATION_OBSERVATIONS_PER_KIND = 16;
const MAX_RAW_LOCATION_BYTES = 1024;
const MAX_RAW_COUNTRY_BYTES = 256;

export type MockCountryScope = "unfiltered" | "match" | "mismatch" | "unknown";

export function classifyMockCountryScope(
  job: MockJob,
  searchCountry: string | null,
): MockCountryScope {
  if (searchCountry === null) return "unfiltered";
  if (!isMockSearchCountry(searchCountry)) return "unknown";

  const geography = job.geography;
  if (!isRecord(geography)) return "unknown";
  const worksites = readMockLocations(geography.worksite_locations);
  const remoteApplicants = readMockLocations(geography.remote_applicant_locations);
  if (worksites === null || remoteApplicants === null) return "unknown";

  const locations = deriveMockWorkArrangement(job) === "remote"
    ? remoteApplicants
    : worksites;
  if (locations.length === 0) return "unknown";

  let hasUnknownObservation = false;
  for (const country of locations) {
    if (country === null) {
      hasUnknownObservation = true;
      continue;
    }
    if (country === searchCountry) return "match";
  }

  return hasUnknownObservation ? "unknown" : "mismatch";
}

function readMockLocations(value: unknown): Array<MockSearchCountry | null> | null {
  if (
    !Array.isArray(value) ||
    value.length > MAX_LOCATION_OBSERVATIONS_PER_KIND
  ) {
    return null;
  }

  const countries: Array<MockSearchCountry | null> = [];
  for (const location of value) {
    const country = readMockCountry(location);
    if (country === undefined) return null;
    countries.push(country);
  }
  return countries;
}

function readMockCountry(
  location: unknown,
): MockSearchCountry | null | undefined {
  if (!isRecord(location) || !isBoundedText(location.raw_location, MAX_RAW_LOCATION_BYTES)) {
    return undefined;
  }
  const country = location.country;
  if (country === null) return null;
  if (!isRecord(country) || !isBoundedText(country.raw_country, MAX_RAW_COUNTRY_BYTES)) {
    return undefined;
  }
  if (!isMockSearchCountry(country.alpha2)) return undefined;

  const rawCountryCode = mockSearchCountryOptions.find(
    ([code, name]) => country.raw_country === code || country.raw_country === name,
  )?.[0];
  return rawCountryCode === country.alpha2 ? country.alpha2 : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedText(value: unknown, maxBytes: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    new TextEncoder().encode(value).length <= maxBytes
  );
}
