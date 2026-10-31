/** Validates bounded, inert regional starter data against its containing manifest. */

import { isCredentialFreePublicHttpsUrl } from "./externalUrlPolicy";

export type RegionStarterMappingType =
  | "exact"
  | "close"
  | "broader"
  | "narrower"
  | "regional_synonym";

export interface RegionStarterData {
  schema: "jobsentinel.v3.region-starter-data.v1";
  region_id: string;
  reviewed_on: string;
  taxonomy_mappings: RegionStarterTaxonomyMapping[];
  cv_profiles: RegionStarterCvProfile[];
  source_notes: RegionStarterSourceNote[];
}

export interface RegionStarterTaxonomyMapping {
  taxonomy_id: string;
  source_code: string;
  source_label: string;
  canonical_term: string;
  mapping_type: RegionStarterMappingType;
  confidence_note: string;
  provenance_url: string;
}

export interface RegionStarterCvProfile {
  profile_id: string;
  label: string;
  sections: string[];
  guidance: string[];
  provenance_urls: string[];
}

export interface RegionStarterSourceNote {
  source_id: string;
  label: string;
  url: string;
  access_note: string;
}

export interface RegionStarterManifestBinding {
  region_id: string;
  taxonomy_ids: string[];
  cv_profiles: string[];
}

const HIDDEN_CONTROL_RANGES = [
  [0, 31], [127, 159], [0x200b, 0x200f], [0x202a, 0x202e],
  [0x2060, 0x2064], [0x2066, 0x206f], [0xfeff, 0xfeff], [0xfff9, 0xfffb],
] as const;
const encoder = new TextEncoder();
const MAX_SERIALIZED_BYTES = 64 * 1024;

function recordWithKeys(
  value: unknown,
  expectedKeys: readonly string[],
): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  return keys.length === expectedKeys.length && keys.every((key) => expectedKeys.includes(key))
    ? record
    : null;
}

function containsHiddenControl(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return HIDDEN_CONTROL_RANGES.some(([minimum, maximum]) => code >= minimum && code <= maximum);
  });
}

function boundedText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && encoder.encode(value).length <= maximum && !containsHiddenControl(value);
}

function date(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day && value <= new Date().toISOString().slice(0, 10);
}

function stringList(value: unknown, maximum: number, itemMaximum: number): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > maximum) return null;
  const result: string[] = [];
  for (const item of value) {
    if (!boundedText(item, itemMaximum)) return null;
    result.push(item);
  }
  return result;
}

function array(value: unknown, maximum: number): unknown[] | null {
  return Array.isArray(value) && value.length > 0 && value.length <= maximum ? value : null;
}

function parsedList<T>(
  value: unknown,
  maximum: number,
  parser: (item: unknown) => T | null,
): T[] | null {
  const values = array(value, maximum);
  if (!values) return null;
  const result: T[] = [];
  for (const item of values) {
    const parsed = parser(item);
    if (parsed === null) return null;
    result.push(parsed);
  }
  return result;
}

function httpsUrl(value: unknown): value is string {
  return boundedText(value, 2_048) && isCredentialFreePublicHttpsUrl(value);
}

function mappingType(value: unknown): value is RegionStarterMappingType {
  return value === "exact" || value === "close" || value === "broader" ||
    value === "narrower" || value === "regional_synonym";
}

function mapping(value: unknown, binding: RegionStarterManifestBinding): RegionStarterTaxonomyMapping | null {
  const item = recordWithKeys(value, ["taxonomy_id", "source_code", "source_label", "canonical_term", "mapping_type", "confidence_note", "provenance_url"]);
  if (!item || !boundedText(item.taxonomy_id, 64) || !binding.taxonomy_ids.includes(item.taxonomy_id) ||
    !boundedText(item.source_code, 256) || !boundedText(item.source_label, 256) ||
    !boundedText(item.canonical_term, 256) || !mappingType(item.mapping_type) ||
    !boundedText(item.confidence_note, 512) || !httpsUrl(item.provenance_url)) return null;
  return {
    taxonomy_id: item.taxonomy_id,
    source_code: item.source_code,
    source_label: item.source_label,
    canonical_term: item.canonical_term,
    mapping_type: item.mapping_type,
    confidence_note: item.confidence_note,
    provenance_url: item.provenance_url,
  };
}

function cvProfile(value: unknown, binding: RegionStarterManifestBinding): RegionStarterCvProfile | null {
  const item = recordWithKeys(value, ["profile_id", "label", "sections", "guidance", "provenance_urls"]);
  if (!item || !boundedText(item.profile_id, 64) || !binding.cv_profiles.includes(item.profile_id) ||
    !boundedText(item.label, 256) || !Array.isArray(item.provenance_urls) ||
    item.provenance_urls.length === 0 || item.provenance_urls.length > 16 ||
    !item.provenance_urls.every(httpsUrl)) return null;
  const sections = stringList(item.sections, 16, 512);
  const guidance = stringList(item.guidance, 16, 512);
  return sections && guidance
    ? { profile_id: item.profile_id, label: item.label, sections, guidance, provenance_urls: [...item.provenance_urls] }
    : null;
}

function sourceNote(value: unknown): RegionStarterSourceNote | null {
  const item = recordWithKeys(value, ["source_id", "label", "url", "access_note"]);
  if (!item || !boundedText(item.source_id, 64) || !boundedText(item.label, 256) ||
    !httpsUrl(item.url) || !boundedText(item.access_note, 512)) return null;
  return { source_id: item.source_id, label: item.label, url: item.url, access_note: item.access_note };
}

/** Returns null for malformed supplied data so callers never render a manifest-only fallback. */
export function parseRegionStarterData(
  value: unknown,
  binding: RegionStarterManifestBinding,
): RegionStarterData | null {
  try {
    const starter = recordWithKeys(value, ["schema", "region_id", "reviewed_on", "taxonomy_mappings", "cv_profiles", "source_notes"]);
    if (!starter || starter.schema !== "jobsentinel.v3.region-starter-data.v1" ||
      !boundedText(starter.region_id, 64) || starter.region_id !== binding.region_id || !date(starter.reviewed_on)) return null;
    const mappings = parsedList(starter.taxonomy_mappings, 64, (item) => mapping(item, binding));
    const profiles = parsedList(starter.cv_profiles, 8, (item) => cvProfile(item, binding));
    const notes = parsedList(starter.source_notes, 16, sourceNote);
    if (!mappings || !profiles || !notes ||
      new Set(mappings.map((item) => `${item.taxonomy_id}\u0000${item.source_code}`)).size !== mappings.length ||
      new Set(profiles.map((item) => item.profile_id)).size !== profiles.length ||
      new Set(notes.map((item) => item.source_id)).size !== notes.length) return null;
    const parsed: RegionStarterData = {
      schema: "jobsentinel.v3.region-starter-data.v1",
      region_id: starter.region_id,
      reviewed_on: starter.reviewed_on,
      taxonomy_mappings: mappings,
      cv_profiles: profiles,
      source_notes: notes,
    };
    return encoder.encode(JSON.stringify(parsed)).length <= MAX_SERIALIZED_BYTES
      ? parsed
      : null;
  } catch {
    return null;
  }
}
