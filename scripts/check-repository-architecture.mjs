#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");
const inheritedPackageFields = [
  "version",
  "edition",
  "authors",
  "license",
  "repository",
  "keywords",
  "categories",
];
const requiredWorkspaceSections = [
  "workspace.package",
  "workspace.dependencies",
  "workspace.lints.rust",
  "workspace.lints.clippy",
  "profile.release",
];

function read(root, path) {
  return readFileSync(join(root, path), "utf8");
}

function normalizePath(path) {
  return path.split(/[\\/]/).join("/");
}

function stripTomlComments(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      let inString = false;
      let escaped = false;

      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (escaped) {
          escaped = false;
        } else if (char === "\\" && inString) {
          escaped = true;
        } else if (char === '"') {
          inString = !inString;
        } else if (char === "#" && !inString) {
          return line.slice(0, index);
        }
      }

      return line;
    })
    .join("\n");
}

function section(text, name) {
  const header = `[${name}]`;
  const start = text.indexOf(header);
  if (start === -1) {
    return null;
  }

  const contentStart = start + header.length;
  const nextHeader = text.indexOf("\n[", contentStart);
  return text.slice(contentStart, nextHeader === -1 ? text.length : nextHeader);
}

function parseWorkspaceMembers(workspaceSection) {
  const match = workspaceSection.match(/(?:^|\n)\s*members\s*=\s*\[([\s\S]*?)\]/);
  if (!match) {
    return null;
  }

  const body = match[1];
  const members = [...body.matchAll(/"([^"]+)"/g)].map((row) => row[1]);
  const residue = body.replace(/"[^"]+"/g, "").replace(/[\s,]/g, "");
  return { members, literalOnly: residue.length === 0 };
}

function discoverMemberPaths(root) {
  const members = [];
  if (existsSync(join(root, "src-tauri", "Cargo.toml"))) {
    members.push("src-tauri");
  }

  const cratesRoot = join(root, "crates");
  if (existsSync(cratesRoot)) {
    for (const entry of readdirSync(cratesRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && existsSync(join(cratesRoot, entry.name, "Cargo.toml"))) {
        members.push(`crates/${entry.name}`);
      }
    }
  }

  return members.sort();
}

function collectRustFiles(root, path) {
  const directory = join(root, path);
  if (!existsSync(directory)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const child = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRustFiles(root, normalizePath(relative(root, child))));
    } else if (entry.isFile() && entry.name.endsWith(".rs")) {
      files.push(normalizePath(relative(root, child)));
    }
  }
  return files.sort();
}

function countLines(text) {
  if (text.length === 0) {
    return 0;
  }
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines.length;
}

function checkCoreModuleBoundaries(root, violations) {
  const boundaries = [
    {
      directory: "crates/jobsentinel-core/src/core/db",
      forbidden: /(?:^|\n)\s*use\s+crate::core::credentials(?:::|\s*::|;)/,
      message: "database modules must not import credential modules",
    },
    {
      directory: "crates/jobsentinel-core/src/core/scrapers",
      forbidden: /(?:^|\n)\s*use\s+crate::core::db(?:::|\s*::|;)/,
      message: "source adapters must not import database modules",
    },
  ];

  for (const boundary of boundaries) {
    for (const path of collectRustFiles(root, boundary.directory)) {
      if (boundary.forbidden.test(read(root, path))) {
        violations.push(`${path}: ${boundary.message}`);
      }
    }
  }

  const jobHashPath = "crates/jobsentinel-core/src/core/job_hash.rs";
  if (
    existsSync(join(root, jobHashPath)) &&
    /(?:^|\n)\s*use\s+crate::core::scrapers(?:::|\s*::|;)/.test(read(root, jobHashPath))
  ) {
    violations.push(`${jobHashPath}: job identity must not import source adapter modules`);
  }
}

function checkMemberManifest(root, member, violations) {
  const path = `${member}/Cargo.toml`;
  const text = stripTomlComments(read(root, path));

  for (const field of inheritedPackageFields) {
    const inheritance = new RegExp(`(?:^|\\n)\\s*${field}\\.workspace\\s*=\\s*true\\s*(?:$|\\n)`);
    if (!inheritance.test(text)) {
      violations.push(`${path} must inherit package ${field} from the workspace`);
    }
  }

  const lints = section(text, "lints");
  if (!lints || !/(?:^|\n)\s*workspace\s*=\s*true\s*(?:$|\n)/.test(lints)) {
    violations.push(`${path} must set [lints] workspace = true`);
  }

  for (const policy of ["lints.rust", "lints.clippy"]) {
    if (section(text, policy) !== null) {
      violations.push(`${path} must inherit lint policy instead of defining [${policy}]`);
    }
  }
  if (section(text, "profile.release") !== null) {
    violations.push(
      `${path} must inherit release policy instead of defining [profile.release]`,
    );
  }
}

function checkMemberCrateRootLintPolicy(root, member, violations) {
  for (const relativePath of ["src/lib.rs", "src/main.rs"]) {
    const path = `${member}/${relativePath}`;
    if (!existsSync(join(root, path))) {
      continue;
    }

    const text = read(root, path);
    if (/#!\[(?:allow|warn|deny|forbid)\(unsafe_code\)\]/.test(text)) {
      violations.push(`${path} must inherit unsafe_code policy from Cargo.toml`);
    }
    if (/#!\[(?:allow|warn|deny|forbid)\(clippy::/.test(text)) {
      violations.push(`${path} must inherit Clippy policy from Cargo.toml`);
    }
  }
}

function checkCoreBoundary(root, violations) {
  const manifestPath = "crates/jobsentinel-core/Cargo.toml";
  if (!existsSync(join(root, manifestPath))) {
    return;
  }

  const manifest = stripTomlComments(read(root, manifestPath));
  if (/(?:^|\n)\s*tauri(?:-[\w-]+)?(?:\.workspace)?\s*=/.test(manifest)) {
    violations.push(`${manifestPath} must not depend on Tauri packages`);
  }

  for (const path of collectRustFiles(root, "crates/jobsentinel-core/src")) {
    if (/\btauri::|#\[tauri(?:::|\])/.test(read(root, path))) {
      violations.push(`${path} must not import Tauri; core is Tauri-free`);
    }
  }

  const libPath = "crates/jobsentinel-core/src/lib.rs";
  if (existsSync(join(root, libPath))) {
    const text = read(root, libPath);
    const lines = countLines(text);
    if (lines > 100) {
      violations.push(`${libPath} must stay at or below 100 lines; found ${lines}`);
    }
    if (/\bpub\s+use\s+(?:crate::)?core::\*\s*;/.test(text)) {
      violations.push(`${libPath} must export an explicit bounded core facade`);
    }
  }

  for (const path of [
    "crates/jobsentinel-core/src/core/automation/mod.rs",
    "crates/jobsentinel-core/src/core/credentials/mod.rs",
    "crates/jobsentinel-core/src/core/resume/mod.rs",
    "crates/jobsentinel-core/src/core/scrapers/mod.rs",
    "crates/jobsentinel-core/src/core/scrapers/source_adapters/mod.rs",
  ]) {
    if (!existsSync(join(root, path))) {
      continue;
    }

    if (/(?:^|\n)\s*pub\s+mod\s+\w+/.test(read(root, path))) {
      violations.push(
        `${path} must keep implementation modules private and re-export a bounded facade`,
      );
    }
  }

  const coreModulePath = "crates/jobsentinel-core/src/core/mod.rs";
  if (
    existsSync(join(root, coreModulePath)) &&
    /(?:^|\n)\s*pub\s+mod\s+scrapers\s*;/.test(read(root, coreModulePath))
  ) {
    violations.push(`${coreModulePath} must keep scraper implementations core-internal`);
  }

  const credentialsPath = "crates/jobsentinel-core/src/core/credentials/mod.rs";
  if (
    existsSync(join(root, credentialsPath)) &&
    /\bpub\s+struct\s+CredentialStore\b/.test(read(root, credentialsPath))
  ) {
    violations.push(
      `${credentialsPath} must keep the legacy OS credential adapter private`,
    );
  }

  for (const path of [
    "crates/jobsentinel-core/tests/live_scraper_test.rs",
    "crates/jobsentinel-core/tests/scraper_integration_test.rs",
  ]) {
    if (existsSync(join(root, path))) {
      violations.push(`${path} must live under the scraper source owner`);
    }
  }
}

function checkTauriShell(root, violations) {
  const mainPath = "src-tauri/src/main.rs";
  if (existsSync(join(root, mainPath))) {
    const lines = countLines(read(root, mainPath));
    if (lines > 20) {
      violations.push(`${mainPath} must stay at or below 20 lines; found ${lines}`);
    }
  }

  const libPath = "src-tauri/src/lib.rs";
  if (existsSync(join(root, libPath))) {
    const text = read(root, libPath);
    const lines = countLines(text);
    if (lines > 100) {
      violations.push(`${libPath} must stay at or below 100 lines; found ${lines}`);
    }
    if (/(?:^|\n)\s*pub\s+mod\s+commands\s*;/.test(text)) {
      violations.push(
        `${libPath} must keep commands private; use mod commands instead of pub mod commands`,
      );
    }
  }

  const registryPath = "src-tauri/src/command_handlers.rs";
  if (existsSync(join(root, registryPath))) {
    const lines = countLines(read(root, registryPath));
    if (lines > 300) {
      violations.push(`${registryPath} must stay at or below 300 lines; found ${lines}`);
    }
  }
}

export function checkRepositoryArchitecture(root = defaultRoot) {
  const rootManifestPath = join(root, "Cargo.toml");
  const discoveredMembers = discoverMemberPaths(root);
  const violations = [];
  checkCoreModuleBoundaries(root, violations);
  if (!existsSync(rootManifestPath)) {
    return discoveredMembers.some((member) => member.startsWith("crates/"))
      ? [...violations, "add root Cargo.toml before adding workspace crates"]
      : violations;
  }

  const rootManifest = stripTomlComments(read(root, "Cargo.toml"));
  if (section(rootManifest, "package") !== null) {
    violations.push("Cargo.toml must be a virtual workspace without [package]");
  }

  const workspace = section(rootManifest, "workspace");
  if (workspace === null) {
    violations.push("Cargo.toml must define [workspace]");
    return violations;
  }

  const parsedMembers = parseWorkspaceMembers(workspace);
  if (parsedMembers === null) {
    violations.push("Cargo.toml [workspace] must define an explicit members array");
  } else {
    if (!parsedMembers.literalOnly) {
      violations.push("Cargo.toml workspace members must contain only quoted literal paths");
    }
    for (const member of parsedMembers.members) {
      if (/[*?\[]/.test(member)) {
        violations.push(
          `Cargo.toml workspace members must be literal paths; wildcard member ${member} is forbidden`,
        );
      }
      if (!existsSync(join(root, member, "Cargo.toml"))) {
        violations.push(`Cargo.toml workspace member ${member} has no Cargo.toml`);
      }
    }
    for (const member of discoveredMembers) {
      if (!parsedMembers.members.includes(member)) {
        violations.push(`Cargo.toml workspace members must list tracked crate ${member}`);
      }
    }
    if (parsedMembers.members.join("\n") !== [...parsedMembers.members].sort().join("\n")) {
      violations.push("Cargo.toml workspace members must be sorted for deterministic review");
    }
  }

  if (!/(?:^|\n)\s*resolver\s*=\s*"2"\s*(?:$|\n)/.test(workspace)) {
    violations.push('Cargo.toml [workspace] must set resolver = "2" for Rust 2021 members');
  }
  for (const required of requiredWorkspaceSections) {
    if (section(rootManifest, required) === null) {
      violations.push(`Cargo.toml must centralize [${required}]`);
    }
  }

  for (const member of discoveredMembers) {
    checkMemberManifest(root, member, violations);
    checkMemberCrateRootLintPolicy(root, member, violations);
  }
  checkCoreBoundary(root, violations);
  checkTauriShell(root, violations);

  return violations;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const violations = checkRepositoryArchitecture(root);

  if (violations.length > 0) {
    console.error("Repository architecture check failed:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log("Repository architecture check passed.");
}
