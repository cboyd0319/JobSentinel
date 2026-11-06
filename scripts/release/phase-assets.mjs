// Loads exact phase proof bytes and validates the explicitly selected local macOS origin.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { phaseEvidenceName, validateReleasePhases } from "./release-phases.mjs";

export function validateLocalMacosOrigin(record, { revision, version, artifacts, macosAsset }) {
  const origin = record.localOrigins?.macos;
  const names = [macosAsset.name, `${macosAsset.name}.sha256`,
    `JobSentinel-${version}-macos.sbom-manifest.json`, `JobSentinel-${version}-macos.sbom.spdx.json`];
  const expected = Object.fromEntries(names.map(name => [name, artifacts[name]]));
  const proof = record.phases[2].commands.find(check => check.evidence === origin?.evidence && check.platform === "macos");
  if (!origin || Object.keys(record.localOrigins).join() !== "macos" || origin.revision !== revision ||
    origin.sourceClean !== true || ![origin.buildCommand, origin.buildEnvironment].every(v => typeof v === "string" && v.trim()) ||
    names.some(name => !/^[a-f0-9]{64}$/.test(artifacts[name] ?? "")) ||
    !isDeepStrictEqual(origin.artifacts, expected) || !proof) {
    throw new Error("Local macOS origin requires exact source, artifacts, build details and accepted Security proof.");
  }
}

export async function verifyPhaseAssets({ release, tempRoot, downloadFile, revision, version,
  platforms, localMacos = false, macosAsset }) {
  const artifacts = {}, evidenceDigests = {}, evidenceRecords = {};
  let record;
  const names = new Set();
  for (const asset of release.assets) {
    if (!asset.name || asset.name !== basename(asset.name) || names.has(asset.name)) throw new Error("Invalid or duplicate release asset name.");
    names.add(asset.name);
    const path = join(tempRoot, asset.name);
    await downloadFile(asset, path);
    const bytes = await readFile(path);
    if (asset.name === phaseEvidenceName) record = JSON.parse(bytes);
    else if (asset.name.startsWith("release-evidence-")) {
      evidenceDigests[asset.name] = createHash("sha256").update(bytes).digest("hex");
      evidenceRecords[asset.name] = JSON.parse(bytes);
    } else Object.defineProperty(artifacts, asset.name, { value: createHash("sha256").update(bytes).digest("hex"), enumerable: true });
  }
  const scope = platforms ?? record?.platforms;
  if (!Array.isArray(scope) || !scope.length || new Set(scope).size !== scope.length ||
    scope.some(p => !["windows", "macos", "linux"].includes(p)) || (localMacos && !scope.includes("macos"))) {
    throw new Error("Invalid release evidence platform scope.");
  }
  validateReleasePhases(record, { revision, version, platforms: scope, artifacts, evidenceDigests, evidenceRecords });
  if (localMacos) validateLocalMacosOrigin(record, { revision, version, artifacts, macosAsset });
  else if (record.localOrigins && Object.keys(record.localOrigins).length) throw new Error("Local origin requires explicit local macOS verification.");
  console.log("Ordered candidate release phases verified.");
}
