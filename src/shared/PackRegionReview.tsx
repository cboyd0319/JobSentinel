/** Re-verifies and displays an active regional pack as inert, incomplete research text. */

import { useEffect, useRef, useState } from "react";
import { invoke } from "../platform/tauri";
import type { PackManagementReview } from "./packManagementProjection";
import {
  parseRegionStarterData,
  type RegionStarterData,
} from "./regionStarterData";
import { Button } from "../ui/Button";

type RegionManifest = {
  schema: "jobsentinel.v3.region-manifest.v1";
  region_id: string;
  reviewed_on: string;
  country_codes: string[];
  languages: string[];
  currencies: string[];
  pay_periods: string[];
  location_rules: {
    remote_labels: string[];
    subdivision_required: boolean;
    locality_required: boolean;
  };
  work_authorization_labels: string[];
  source_classes: string[];
  cv_profiles: string[];
  taxonomy_ids: string[];
  policy_note_refs: string[];
  provenance_refs: string[];
  evaluation_fixture_ids: string[];
  incomplete_coverage: boolean;
  starter_data?: RegionStarterData;
};

const PAY_PERIODS = new Set([
  "hourly", "daily", "weekly", "monthly", "annual", "contract", "stipend", "not_disclosed",
]);
const SOURCE_CLASSES = new Set([
  "official_public_api", "public_ats", "public_employer_page", "regional_board",
  "restricted_public_scheduled", "user_import", "restricted_user_opened",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeText(value: unknown, maximum = 256): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function stringList(value: unknown, maximum = 64): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= maximum && value.every((item) => safeText(item));
}

function date(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function parseRegionManifest(value: unknown): RegionManifest {
  if (!isRecord(value) || value.schema !== "jobsentinel.v3.region-manifest.v1" ||
    !safeText(value.region_id, 64) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.region_id) ||
    !date(value.reviewed_on) || !stringList(value.country_codes) ||
    !value.country_codes.every((item) => /^[A-Z]{2}$/.test(item)) || !stringList(value.languages) ||
    !stringList(value.currencies) || !value.currencies.every((item) => /^[A-Z]{3}$/.test(item)) || !stringList(value.pay_periods) ||
    !value.pay_periods.every((item) => PAY_PERIODS.has(item)) || !isRecord(value.location_rules) ||
    !stringList(value.location_rules.remote_labels) ||
    typeof value.location_rules.subdivision_required !== "boolean" ||
    typeof value.location_rules.locality_required !== "boolean" ||
    !stringList(value.work_authorization_labels) || !stringList(value.source_classes) ||
    !value.source_classes.every((item) => SOURCE_CLASSES.has(item)) || !stringList(value.cv_profiles) ||
    !stringList(value.taxonomy_ids) || !stringList(value.policy_note_refs) ||
    !stringList(value.provenance_refs) || !stringList(value.evaluation_fixture_ids) ||
    value.incomplete_coverage !== true) throw new Error("invalid regional pack");
  const starterData = value.starter_data === undefined
    ? undefined
    : parseRegionStarterData(value.starter_data, {
        region_id: value.region_id,
        taxonomy_ids: value.taxonomy_ids,
        cv_profiles: value.cv_profiles,
      });
  if (value.starter_data !== undefined && starterData === null) {
    throw new Error("invalid regional starter data");
  }
  return { ...value, starter_data: starterData } as RegionManifest;
}

function label(value: string): string {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function values(items: string[]): string {
  return items.map(label).join(", ");
}

function Fact({ label: factLabel, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium text-surface-500 dark:text-surface-400">{factLabel}</dt><dd className="mt-0.5 break-words text-surface-800 [overflow-wrap:anywhere] dark:text-surface-100">{value}</dd></div>;
}

export function PackRegionReview({ pack }: { pack: PackManagementReview }) {
  const [manifest, setManifest] = useState<RegionManifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const interaction = useRef(0);

  useEffect(() => {
    interaction.current += 1;
    setManifest(null);
    setLoading(false);
    setError(false);
  }, [pack.publisherKeyId, pack.packId, pack.generation, pack.state]);

  const open = async () => {
    const interactionId = ++interaction.current;
    setLoading(true);
    setError(false);
    setManifest(null);
    try {
      const opened = parseRegionManifest(await invoke("open_region_pack", {
        publisherKeyId: pack.publisherKeyId, packId: pack.packId, expectedGeneration: pack.generation,
      }));
      if (interaction.current === interactionId) setManifest(opened);
    } catch {
      if (interaction.current === interactionId) setError(true);
    } finally {
      if (interaction.current === interactionId) setLoading(false);
    }
  };

  return <section className="mt-4 border-t border-surface-200 pt-4 dark:border-surface-700">
    <Button size="sm" variant="secondary" loading={loading} loadingText="Verifying..." onClick={() => void open()}>
      Open regional review
    </Button>
    {error ? <p role="alert" className="mt-3 text-sm text-danger">Regional research could not be verified. Refresh Packs and try again.</p> : null}
    {manifest ? <div className="mt-3 space-y-3">
      <div className="rounded-md bg-warning/10 p-3 text-sm text-surface-800 dark:text-surface-100">
        <p>Starter research. Coverage is incomplete.</p>
        <p className="mt-1">These research seeds are not integrated sources, source grants, eligibility advice, or credentials.</p>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Fact label="Region" value={manifest.region_id} />
        <Fact label="Reviewed date" value={manifest.reviewed_on} />
        <Fact label="Countries" value={manifest.country_codes.join(", ")} />
        <Fact label="Languages" value={manifest.languages.join(", ")} />
        <Fact label="Currencies" value={manifest.currencies.join(", ")} />
        <Fact label="Pay periods" value={values(manifest.pay_periods)} />
        <Fact label="Work modes" value={values(manifest.location_rules.remote_labels)} />
        <Fact label="Work authorization labels" value={values(manifest.work_authorization_labels)} />
        <Fact label="CV profiles" value={values(manifest.cv_profiles)} />
        <Fact label="Taxonomy IDs" value={values(manifest.taxonomy_ids)} />
        <Fact label="Source classes" value={values(manifest.source_classes)} />
      </dl>
      <TextList label="Source policy notes" values={manifest.policy_note_refs} />
      <TextList label="Provenance" values={manifest.provenance_refs} />
      {manifest.starter_data ? <StarterDataReview starterData={manifest.starter_data} /> : null}
    </div> : null}
  </section>;
}

function TextList({ label: heading, values: items }: { label: string; values: string[] }) {
  return <div className="rounded-md bg-surface-50 p-3 text-sm text-surface-700 dark:bg-surface-800 dark:text-surface-200">
    <h4 className="font-medium text-surface-800 dark:text-surface-100">{heading}</h4>
    <ul className="mt-1 list-disc space-y-1 pl-5">{items.map((item, index) => <li key={`${index}:${item}`} className="break-all">{item}</li>)}</ul>
  </div>;
}

function StarterDataReview({ starterData }: { starterData: RegionStarterData }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const mappings = starterData.taxonomy_mappings.filter((mapping) =>
    [mapping.source_code, mapping.source_label, mapping.canonical_term].some((value) =>
      value.toLocaleLowerCase().includes(normalizedQuery),
    ),
  );
  return <div className="space-y-3 rounded-md border border-surface-200 p-3 text-sm [overflow-wrap:anywhere] dark:border-surface-700">
    <div>
      <h4 className="font-medium text-surface-800 dark:text-surface-100">Local occupation lookup</h4>
      <p>Starter data reviewed {starterData.reviewed_on}. Match only the displayed code, label, or canonical term; verify current source classifications.</p>
    </div>
    <label className="block">
      <span className="sr-only">Find a local occupation term</span>
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search code, label, or term" aria-label="Find a local occupation term" className="w-full rounded-md border border-surface-300 bg-white px-3 py-2 dark:border-surface-600 dark:bg-surface-800" />
    </label>
    {mappings.length > 0 ? <ul className="space-y-2">{mappings.map((mapping) => <li key={`${mapping.taxonomy_id}:${mapping.source_code}`} className="rounded bg-surface-50 p-2 dark:bg-surface-800"><p><span className="font-medium">{mapping.source_code}</span> · {mapping.source_label} · {mapping.canonical_term}</p><p>{label(mapping.mapping_type)} mapping. {mapping.confidence_note}</p><p>Publisher reference: {mapping.provenance_url}</p></li>)}</ul> : <p>No local starter mapping matches this search.</p>}
    <StarterProfiles profiles={starterData.cv_profiles} />
    <StarterSourceNotes notes={starterData.source_notes} />
  </div>;
}

function StarterProfiles({ profiles }: { profiles: RegionStarterData["cv_profiles"] }) {
  return <div><h4 className="font-medium text-surface-800 dark:text-surface-100">CV starter profiles</h4>{profiles.map((profile) => <div key={profile.profile_id} className="mt-2 rounded bg-surface-50 p-2 dark:bg-surface-800"><p className="font-medium">{profile.label}</p><TextList label="Sections" values={profile.sections} /><TextList label="Guidance" values={profile.guidance} /><TextList label="Source text" values={profile.provenance_urls} /></div>)}</div>;
}

function StarterSourceNotes({ notes }: { notes: RegionStarterData["source_notes"] }) {
  return <div><h4 className="font-medium text-surface-800 dark:text-surface-100">Source research notes</h4><ul className="mt-1 space-y-2">{notes.map((note) => <li key={note.source_id} className="rounded bg-surface-50 p-2 dark:bg-surface-800"><p className="font-medium">{note.label}</p><p className="break-all">{note.url}</p><p>{note.access_note}</p></li>)}</ul></div>;
}
