#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { npmInvocation } from "../lib/dependency/npm-invocation.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "../..");
const defaultRepoUrl = "https://github.com/cboyd0319/JobSentinel";
const installableAssetPattern = /\.(?:dmg|msi|exe|AppImage|deb)$/;

function getArgValue(args, name) {
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) {
    return args[exactIndex + 1];
  }

  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : undefined;
}

function hasArg(args, name) {
  return args.some((arg) => arg === name || arg.startsWith(`${name}=`));
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function sha256File(path) {
  return sha256Buffer(readFileSync(path));
}

function spdxIdPart(value) {
  return String(value)
    .replace(/^@/, "")
    .replace(/[^A-Za-z0-9.-]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 160);
}

function purlName(value) {
  return encodeURIComponent(value).replace(/%2F/g, "/");
}

function parseQuotedValue(line) {
  const match = line.match(/^\s*[A-Za-z0-9_-]+\s*=\s*"((?:[^"\\]|\\.)*)"\s*$/);
  if (!match) {
    return undefined;
  }

  return match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function parseQuotedListItem(line) {
  const match = line.match(/^\s*"((?:[^"\\]|\\.)*)",?\s*$/);
  if (!match) {
    return undefined;
  }

  return match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function parseDependencyEntry(value) {
  const match = value.match(/^(.+?)\s+([0-9][^\s]*)$/);
  if (!match) {
    return { name: value, version: undefined };
  }

  return { name: match[1], version: match[2] };
}

export function parseCargoLock(text) {
  const packages = [];
  const lines = String(text ?? "").split(/\r?\n/);
  let current;
  let inDependencies = false;

  function pushCurrent() {
    if (current?.name && current?.version) {
      current.dependencies ??= [];
      packages.push(current);
    }
  }

  for (const line of lines) {
    if (line.trim() === "[[package]]") {
      pushCurrent();
      current = {};
      inDependencies = false;
      continue;
    }

    if (!current) {
      continue;
    }

    if (inDependencies) {
      if (line.trim() === "]") {
        inDependencies = false;
        continue;
      }

      const value = parseQuotedListItem(line);
      if (value) {
        current.dependencies.push(parseDependencyEntry(value));
      }
      continue;
    }

    if (line.trim() === "dependencies = [") {
      current.dependencies = [];
      inDependencies = true;
      continue;
    }

    const match = line.match(/^\s*(name|version|source|checksum)\s*=/);
    if (match) {
      current[match[1]] = parseQuotedValue(line);
    }
  }

  pushCurrent();
  return packages;
}

function cargoPackageId(pkg) {
  return `SPDXRef-Cargo-Package-${spdxIdPart(pkg.name)}-${spdxIdPart(pkg.version)}`;
}

function cargoDownloadLocation(pkg) {
  if (pkg.source?.startsWith("registry+https://github.com/rust-lang/crates.io-index")) {
    return `https://crates.io/crates/${pkg.name}/${pkg.version}`;
  }

  return "NOASSERTION";
}

export function buildCargoSpdx({ packages, rootPackageName, rootPackageVersion, rootSpdxId }) {
  const packagesByName = new Map();
  const packagesByNameVersion = new Map();

  for (const pkg of packages) {
    const byName = packagesByName.get(pkg.name) ?? [];
    byName.push(pkg);
    packagesByName.set(pkg.name, byName);
    packagesByNameVersion.set(`${pkg.name}@${pkg.version}`, pkg);
  }

  const spdxPackages = packages.map((pkg) => {
    const spdxPackage = {
      name: pkg.name,
      SPDXID: cargoPackageId(pkg),
      versionInfo: pkg.version,
      packageFileName: pkg.name === rootPackageName && pkg.version === rootPackageVersion ? "src-tauri" : "",
      downloadLocation: cargoDownloadLocation(pkg),
      filesAnalyzed: false,
      homepage: "NOASSERTION",
      licenseDeclared: pkg.name === rootPackageName ? "MIT" : "NOASSERTION",
      externalRefs: [
        {
          referenceCategory: "PACKAGE-MANAGER",
          referenceType: "purl",
          referenceLocator: `pkg:cargo/${purlName(pkg.name)}@${pkg.version}`,
        },
      ],
    };

    if (/^[a-fA-F0-9]{64}$/.test(pkg.checksum ?? "")) {
      spdxPackage.checksums = [
        {
          algorithm: "SHA256",
          checksumValue: pkg.checksum.toLowerCase(),
        },
      ];
    }

    return spdxPackage;
  });

  const relationships = [];
  const rootPackage = packagesByNameVersion.get(`${rootPackageName}@${rootPackageVersion}`);
  if (rootPackage && rootSpdxId) {
    relationships.push({
      spdxElementId: rootSpdxId,
      relationshipType: "DEPENDS_ON",
      relatedSpdxElement: cargoPackageId(rootPackage),
    });
  }

  for (const pkg of packages) {
    for (const dep of pkg.dependencies ?? []) {
      const target = dep.version
        ? packagesByNameVersion.get(`${dep.name}@${dep.version}`)
        : packagesByName.get(dep.name)?.length === 1
          ? packagesByName.get(dep.name)[0]
          : undefined;

      if (!target) {
        continue;
      }

      relationships.push({
        spdxElementId: cargoPackageId(pkg),
        relationshipType: "DEPENDS_ON",
        relatedSpdxElement: cargoPackageId(target),
      });
    }
  }

  return { packages: spdxPackages, relationships };
}

export function npmSbom(root, { spawn = spawnSync, platform = process.platform, env = process.env } = {}) {
  const invocation = npmInvocation(
    ["sbom", "--package-lock-only", "--sbom-format=spdx", "--sbom-type=application"],
    platform,
    env,
  );
  const result = spawn(invocation.command, invocation.args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 32,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(String(result.stderr || result.stdout).trim());
  }

  return JSON.parse(result.stdout);
}

function releaseAssetKind(name) {
  if (installableAssetPattern.test(name)) {
    return "installer";
  }
  if (/\.sha256$/.test(name)) {
    return "checksum";
  }
  return "supporting";
}

export function collectReleaseAssets(outDir) {
  if (!existsSync(outDir)) {
    return [];
  }

  return readdirSync(outDir)
    .filter((name) => !/\.sbom\.spdx\.json$/.test(name))
    .filter((name) => !/\.sbom-manifest\.json$/.test(name))
    .filter((name) => name !== "attestation-subjects.sha256")
    .map((name) => {
      const path = join(outDir, name);
      const stat = statSync(path);
      if (!stat.isFile()) {
        return undefined;
      }
      return {
        fileName: name,
        path,
        kind: releaseAssetKind(name),
        size: stat.size,
        sha256: sha256File(path),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function repositoryUrl(pkg) {
  const repository = pkg.repository;
  if (typeof repository === "string") {
    return repository;
  }
  if (repository && typeof repository.url === "string") {
    return repository.url.replace(/^git\+/, "");
  }
  return defaultRepoUrl;
}

function sourceInfo() {
  return {
    repository: process.env.GITHUB_REPOSITORY
      ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
      : defaultRepoUrl,
    ref: process.env.GITHUB_REF_NAME || process.env.GITHUB_REF || "local",
    sha: process.env.GITHUB_SHA || "local",
    workflow: process.env.GITHUB_WORKFLOW || "local",
    runId: process.env.GITHUB_RUN_ID || "local",
  };
}

export async function generateReleaseSbom({
  root = defaultRoot,
  outDir,
  checksumOut,
  platform,
  version,
  created = new Date().toISOString(),
  requireArtifacts = false,
  npmDocument,
  platformName = process.platform,
  spawn = spawnSync,
  env = process.env,
} = {}) {
  if (!outDir) {
    throw new Error("Missing outDir");
  }
  if (!platform) {
    throw new Error("Missing platform");
  }

  const packageJson = readJson(join(root, "package.json"));
  const workspaceCargoToml = readFileSync(join(root, "Cargo.toml"), "utf8");
  const appCargoToml = readFileSync(join(root, "src-tauri/Cargo.toml"), "utf8");
  const cargoLock = readFileSync(join(root, "Cargo.lock"), "utf8");
  const releaseVersion = version ?? packageJson.version;
  const cargoName = appCargoToml.match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1] ?? packageJson.name;
  const cargoVersion = workspaceCargoToml.match(/^\s*version\s*=\s*"([^"]+)"/m)?.[1] ?? releaseVersion;
  const source = sourceInfo();
  const releaseOutDir = resolve(root, outDir);
  mkdirSync(releaseOutDir, { recursive: true });

  const assets = collectReleaseAssets(releaseOutDir);
  const installableAssets = assets.filter((asset) => asset.kind === "installer");
  if (requireArtifacts && installableAssets.length === 0) {
    throw new Error("Release SBOM generation requires at least one installable release artifact.");
  }

  const sbom = structuredClone(npmDocument ?? npmSbom(root, { spawn, platform: platformName, env }));
  if (sbom.spdxVersion !== "SPDX-2.3" || sbom.SPDXID !== "SPDXRef-DOCUMENT") {
    throw new Error("npm SBOM output must be an SPDX 2.3 JSON document.");
  }

  const npmRootId = sbom.documentDescribes?.[0] ?? `SPDXRef-Package-${spdxIdPart(packageJson.name)}-${spdxIdPart(releaseVersion)}`;
  const cargoPackages = parseCargoLock(cargoLock);
  const cargoSpdx = buildCargoSpdx({
    packages: cargoPackages,
    rootPackageName: cargoName,
    rootPackageVersion: cargoVersion,
    rootSpdxId: npmRootId,
  });

  sbom.name = `${packageJson.name}@${releaseVersion} release ${platform}`;
  sbom.documentNamespace = `${repositoryUrl(packageJson).replace(/\/$/, "")}/sbom/${releaseVersion}/${platform}/${source.sha}`;
  sbom.creationInfo = {
    ...sbom.creationInfo,
    created,
    creators: [
      ...new Set([
        ...(sbom.creationInfo?.creators ?? []),
        "Tool: JobSentinel release-sbom",
      ]),
    ],
  };
  sbom.documentDescribes = [...new Set([...(sbom.documentDescribes ?? []), npmRootId])];
  sbom.packages = [...(sbom.packages ?? []), ...cargoSpdx.packages];
  sbom.relationships = [...(sbom.relationships ?? []), ...cargoSpdx.relationships];

  const baseName = `JobSentinel-${releaseVersion}-${platform}`;
  const sbomFileName = `${baseName}.sbom.spdx.json`;
  const manifestFileName = `${baseName}.sbom-manifest.json`;
  const sbomPath = join(releaseOutDir, sbomFileName);
  const manifestPath = join(releaseOutDir, manifestFileName);
  writeJson(sbomPath, sbom);

  const sbomHash = sha256File(sbomPath);
  const manifest = {
    schemaVersion: 1,
    name: "JobSentinel release SBOM manifest",
    version: releaseVersion,
    platform,
    created,
    source,
    sbom: {
      fileName: sbomFileName,
      sha256: sbomHash,
      spdxVersion: sbom.spdxVersion,
      packageCount: sbom.packages.length,
      relationshipCount: sbom.relationships.length,
      scope: "npm package-lock.json and root Cargo.lock dependency inventory for this release build",
    },
    assets: assets.map(({ fileName, kind, size, sha256 }) => ({
      fileName,
      kind,
      size,
      sha256,
    })),
  };
  writeJson(manifestPath, manifest);

  if (checksumOut) {
    const checksumPath = resolve(root, checksumOut);
    mkdirSync(dirname(checksumPath), { recursive: true });
    writeFileSync(
      checksumPath,
      installableAssets
        .map((asset) => `${asset.sha256}  ${basename(asset.fileName)}`)
        .join("\n")
        .concat(installableAssets.length > 0 ? "\n" : ""),
    );
  }

  return {
    sbomPath,
    manifestPath,
    checksumPath: checksumOut ? resolve(root, checksumOut) : undefined,
    packageCount: sbom.packages.length,
    relationshipCount: sbom.relationships.length,
    assetCount: assets.length,
    installableAssetCount: installableAssets.length,
  };
}

export function parseArgs(args) {
  return {
    checksumOut: getArgValue(args, "--checksums-out"),
    outDir: getArgValue(args, "--out-dir") ?? "release-assets/public",
    platform: getArgValue(args, "--platform") ?? process.env.RUNNER_OS?.toLowerCase(),
    requireArtifacts: hasArg(args, "--require-artifacts"),
    root: getArgValue(args, "--root") ?? defaultRoot,
    version: getArgValue(args, "--version"),
  };
}

export async function main({ args = process.argv.slice(2) } = {}) {
  const options = parseArgs(args);
  const result = await generateReleaseSbom(options);
  console.log(`Release SBOM written: ${result.sbomPath}`);
  console.log(`Release SBOM manifest written: ${result.manifestPath}`);
  if (result.checksumPath) {
    console.log(`Attestation subjects written: ${result.checksumPath}`);
  }
  console.log(
    `Release SBOM packages=${result.packageCount} relationships=${result.relationshipCount} assets=${result.assetCount} installableAssets=${result.installableAssetCount}`,
  );
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
