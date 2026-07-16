import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, normalize } from "node:path";

export const featureListPath = "feature_list.json";
export const progressPath = "PROGRESS.md";
export const featureListSchema = "jobsentinel.feature_list.v1";
export const allowedStatuses = new Set(["not_started", "active", "blocked", "passing"]);

function readJson(root, path, violations) {
  try {
    return JSON.parse(readFileSync(join(root, path), "utf8"));
  } catch (error) {
    violations.push(`fix invalid ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function evidenceFilePath(value) {
  return String(value).split("#", 1)[0];
}

function validateEvidencePointer(root, featureId, pointer, violations) {
  if (!nonEmptyString(pointer)) {
    violations.push(`feature ${featureId}: evidence pointers must be non-empty strings`);
    return;
  }
  const path = evidenceFilePath(pointer);
  if (isAbsolute(path) || normalize(path).startsWith("..")) {
    violations.push(`feature ${featureId}: evidence must use a repository-relative path: ${pointer}`);
  } else if (!existsSync(join(root, path))) {
    violations.push(`feature ${featureId}: evidence path does not exist: ${path}`);
  }
}

function validatePassingEvidence(root, feature, violations) {
  const pointers = Array.isArray(feature.evidence) ? feature.evidence : [];
  const structuredPointer = pointers.find((pointer) => evidenceFilePath(pointer).endsWith(".json"));
  if (!structuredPointer) {
    violations.push(`feature ${feature.id}: passing requires structured behavior evidence`);
    return;
  }
  const path = evidenceFilePath(structuredPointer);
  let evidence;
  try {
    evidence = JSON.parse(readFileSync(join(root, path), "utf8"));
  } catch (error) {
    violations.push(`feature ${feature.id}: fix invalid structured evidence ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (evidence.schema !== "jobsentinel.feature_evidence.v1") violations.push(`feature ${feature.id}: structured evidence schema must be jobsentinel.feature_evidence.v1`);
  if (evidence.feature_id !== feature.id) violations.push(`feature ${feature.id}: structured evidence feature_id must match`);
  if (evidence.behavior !== feature.behavior) violations.push(`feature ${feature.id}: structured evidence must record the exact verified behavior`);
  if (evidence.result !== "passing") violations.push(`feature ${feature.id}: structured evidence result must be passing`);
  if (Number.isNaN(Date.parse(String(evidence.verified_at ?? "")))) violations.push(`feature ${feature.id}: structured evidence requires an ISO verified_at timestamp`);
  for (const field of ["revision", "platform"]) if (!nonEmptyString(evidence[field])) violations.push(`feature ${feature.id}: structured evidence requires ${field}`);
  const commands = Array.isArray(evidence.commands) ? evidence.commands : [];
  for (const expected of feature.verification ?? []) {
    const row = commands.find((candidate) => candidate?.command === expected);
    if (!row) violations.push(`feature ${feature.id}: structured evidence omits verification command: ${expected}`);
    else {
      if (row.exit_status !== 0) violations.push(`feature ${feature.id}: passing evidence command did not exit 0: ${expected}`);
      if (!nonEmptyString(row.relevant_result)) violations.push(`feature ${feature.id}: evidence command requires relevant_result: ${expected}`);
      if (typeof row.caveat !== "string") violations.push(`feature ${feature.id}: evidence command requires a caveat field: ${expected}`);
    }
  }
  if (nonEmptyString(evidence.source) && !existsSync(join(root, evidence.source))) violations.push(`feature ${feature.id}: structured evidence source does not exist: ${evidence.source}`);
  if (/(?:\/Users\/[^/<\s]+\/|[A-Za-z]:\\Users\\[^\\<\s]+\\)/.test(JSON.stringify(evidence))) violations.push(`feature ${feature.id}: structured evidence contains a machine-specific home path`);
}

export function validateFeatureList(root, featureList) {
  const violations = [];
  if (!featureList || typeof featureList !== "object" || Array.isArray(featureList)) {
    return ["feature_list.json must contain an object"];
  }
  if (featureList.schema !== featureListSchema) {
    violations.push(`feature_list.json schema must be ${featureListSchema}`);
  }
  if (featureList.active_status !== "active") {
    violations.push('feature_list.json must declare "active" as its single active status');
  }
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(String(featureList.last_updated ?? ""))) {
    violations.push("feature_list.json last_updated must be an ISO date");
  }
  if (!Array.isArray(featureList.features) || featureList.features.length === 0) {
    return [...violations, "feature_list.json features must be a non-empty array"];
  }

  const ids = new Set();
  let activeCount = 0;
  for (const feature of featureList.features) {
    const id = nonEmptyString(feature?.id) ? feature.id : "<missing-id>";
    if (!nonEmptyString(feature?.id)) violations.push("feature id must be a non-empty string");
    else if (ids.has(id)) violations.push(`feature id must be unique: ${id}`);
    ids.add(id);
    if (!Number.isInteger(feature?.priority) || feature.priority < 1) {
      violations.push(`feature ${id}: priority must be a positive integer`);
    }
    for (const field of ["area", "title", "behavior", "user_visible_behavior"]) {
      if (!nonEmptyString(feature?.[field])) violations.push(`feature ${id}: ${field} must be non-empty`);
    }
    if (!allowedStatuses.has(feature?.status)) {
      violations.push(`feature ${id}: unsupported status ${String(feature?.status)}`);
    }
    if (feature?.status === "active") activeCount += 1;
    if (!Array.isArray(feature?.verification) || feature.verification.length === 0 || feature.verification.some((value) => !nonEmptyString(value))) {
      violations.push(`feature ${id}: verification must contain runnable steps`);
    }
    if (!Array.isArray(feature?.evidence)) {
      violations.push(`feature ${id}: evidence must be an array`);
    } else {
      for (const pointer of feature.evidence) validateEvidencePointer(root, id, pointer, violations);
    }
    if (feature?.status === "passing") {
      if (!Array.isArray(feature.evidence) || feature.evidence.length === 0) {
        violations.push(`feature ${id}: passing requires evidence`);
      } else {
        validatePassingEvidence(root, feature, violations);
      }
    }
    if (feature?.status === "blocked") {
      if (!nonEmptyString(feature.blocker)) violations.push(`feature ${id}: blocked status requires blocker`);
      if (!nonEmptyString(feature.next_trigger)) violations.push(`feature ${id}: blocked status requires next_trigger`);
    }
  }
  if (activeCount !== 1) violations.push(`feature_list.json must contain exactly one active feature; found ${activeCount}`);
  return violations;
}

export function parseProgressMarkers(text) {
  return {
    lastUpdated: /^Last updated:\s*(20\d{2}-\d{2}-\d{2})\s*$/m.exec(text)?.[1] ?? null,
    activeFeature: /^- Active feature:\s*`([^`]+)`\s*$/m.exec(text)?.[1] ?? null,
    status: /^- Status:\s*`([^`]+)`\s*$/m.exec(text)?.[1] ?? null,
  };
}

export function collectStateViolations(root) {
  const violations = [];
  for (const path of [progressPath, featureListPath]) {
    if (!existsSync(join(root, path))) violations.push(`add required state owner: ${path}`);
  }
  if (violations.length > 0) return violations;

  const featureList = readJson(root, featureListPath, violations);
  if (!featureList) return violations;
  violations.push(...validateFeatureList(root, featureList));
  const progressText = readFileSync(join(root, progressPath), "utf8");
  const markers = parseProgressMarkers(progressText);
  const active = featureList.features?.find((feature) => feature.status === "active");
  if (markers.activeFeature !== active?.id) {
    violations.push(`PROGRESS.md active feature must match feature_list.json: ${String(active?.id ?? "none")}`);
  }
  if (markers.status !== featureList.active_status) {
    violations.push(`PROGRESS.md status must be ${String(featureList.active_status)}`);
  }
  if (markers.lastUpdated !== featureList.last_updated) {
    violations.push("PROGRESS.md and feature_list.json last-updated dates must match");
  }
  if (/(?:\/Users\/[^/<\s]+\/|[A-Za-z]:\\Users\\[^\\<\s]+\\)/.test(`${progressText}\n${JSON.stringify(featureList)}`)) {
    violations.push("canonical state must not contain a machine-specific home path");
  }
  return violations;
}

export function readHarnessState(root) {
  const violations = collectStateViolations(root);
  if (violations.length > 0) throw new Error(violations.join("\n"));
  const featureList = JSON.parse(readFileSync(join(root, featureListPath), "utf8"));
  const progress = readFileSync(join(root, progressPath), "utf8");
  return { featureList, progress, markers: parseProgressMarkers(progress) };
}
