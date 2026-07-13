import {
  getNextId,
  getStringArg,
} from "../../../mocks/handlers/commandHelpers";
import type { MockJob } from "../../../mocks/handlers/types";
import {
  isLocalOrPrivateHost,
  isSafeExternalHttpsUrl,
} from "../../../mocks/externalUrlSafety";

export interface MockJobImportPreview {
  title: string;
  company: string;
  url: string;
  location: string | null;
  description_preview: string | null;
  salary: string | null;
  date_posted: string | null;
  valid_through: string | null;
  employment_types: string[];
  remote: boolean;
  missing_fields: string[];
  already_exists: boolean;
}

export interface MockJobImportResult {
  jobId: number;
}

interface MockJobImportCommandState {
  jobs: MockJob[];
}

export interface MockJobImportCommandResult {
  handled: boolean;
  shouldSave: boolean;
  state: MockJobImportCommandState;
  value: unknown;
}

const STRIPPED_JOB_IMPORT_QUERY_KEYS = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "msclkid",
  "ref",
  "referrer",
  "source",
]);

const STRIPPED_JOB_IMPORT_QUERY_MARKERS = [
  "token",
  "session",
  "auth",
  "credential",
  "password",
  "email",
  "candidate",
];

export function handleMockJobImportCommand(
  command: string,
  args: Record<string, unknown> | undefined,
  state: MockJobImportCommandState,
): MockJobImportCommandResult {
  switch (command) {
    case "preview_job_import":
      return withoutSave(state, previewMockJobImport(args, state.jobs));
    case "import_job_from_url":
      return importMockJobFromUrl(args, state);
    default:
      return { handled: false, shouldSave: false, state, value: undefined };
  }
}

function importMockJobFromUrl(
  args: Record<string, unknown> | undefined,
  state: MockJobImportCommandState,
): MockJobImportCommandResult {
  const preview = previewMockJobImport(args, state.jobs);
  if (preview.already_exists) {
    throw new Error("This job is already in your saved jobs");
  }

  const job = buildMockImportedJob(
    preview,
    getNextId(state.jobs),
    new Date().toISOString(),
  );
  return {
    handled: true,
    shouldSave: true,
    state: { jobs: [job, ...state.jobs] },
    value: { jobId: job.id } satisfies MockJobImportResult,
  };
}

function previewMockJobImport(
  args: Record<string, unknown> | undefined,
  jobs: readonly MockJob[],
): MockJobImportPreview {
  const url = getJobImportUrl(args);
  const title = getMockImportTitle(url);
  const company = new URL(url).hostname;

  return {
    title,
    company,
    url,
    location: "Remote",
    description_preview: `${title} role imported from ${company}. Review details before saving.`,
    salary: "$55k-$72k",
    date_posted: new Date().toISOString(),
    valid_through: null,
    employment_types: ["FULL_TIME"],
    remote: true,
    missing_fields: [],
    already_exists: jobs.some((job) => job.url === url),
  };
}

function buildMockImportedJob(
  preview: MockJobImportPreview,
  id: number,
  createdAt: string,
): MockJob {
  return {
    id,
    hash: `mock-import-${hashString(preview.url)}`,
    title: preview.title,
    company: preview.company,
    location: preview.location ?? "Remote",
    description: preview.description_preview ?? "",
    url: preview.url,
    source: "import",
    salary_min: 55000,
    salary_max: 72000,
    remote: preview.remote,
    score: 1,
    hidden: false,
    bookmarked: false,
    notes: null,
    created_at: createdAt,
  };
}

function getJobImportUrl(args: Record<string, unknown> | undefined): string {
  const url = getStringArg(args, "url")?.trim();
  if (!url) {
    throw new Error("Paste the full job link from your browser address bar.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Paste the full job link from your browser address bar.");
  }

  if (parsedUrl.protocol === "http:" && !isLocalOrPrivateHost(parsedUrl.hostname)) {
    throw new Error("Paste an https job posting link from your browser address bar.");
  }

  if (!isSafeExternalHttpsUrl(url)) {
    throw new Error("Paste the full job link from your browser address bar.");
  }

  return canonicalizeMockJobImportUrl(url);
}

function canonicalizeMockJobImportUrl(url: string): string {
  const parsed = new URL(url);
  parsed.username = "";
  parsed.password = "";
  parsed.hash = "";

  const keptParams = new URLSearchParams();
  parsed.searchParams.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (!isStrippedJobImportQueryParam(normalizedKey, value)) {
      keptParams.append(key, value);
    }
  });

  const query = keptParams.toString();
  parsed.search = query ? `?${query}` : "";
  return parsed.toString();
}

function isStrippedJobImportQueryParam(
  normalizedKey: string,
  value: string,
): boolean {
  return (
    normalizedKey.startsWith("utm_") ||
    STRIPPED_JOB_IMPORT_QUERY_KEYS.has(normalizedKey) ||
    STRIPPED_JOB_IMPORT_QUERY_MARKERS.some((marker) =>
      normalizedKey.includes(marker)
    ) ||
    isSensitiveJobImportQueryValue(value)
  );
}

function isSensitiveJobImportQueryValue(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    const normalizedValue = value.toLowerCase();
    return STRIPPED_JOB_IMPORT_QUERY_MARKERS.some(
      (marker) =>
        normalizedValue.includes(`${marker}=`) ||
        normalizedValue.includes(`${marker}%3d`),
    );
  }
}

function getMockImportTitle(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const slug = parts[parts.length - 1] ?? "imported-job";
  return (
    slug
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim() || "Imported Job"
  );
}

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function withoutSave(
  state: MockJobImportCommandState,
  value: unknown,
): MockJobImportCommandResult {
  return { handled: true, shouldSave: false, state, value };
}
