#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkRustSourceOwnership } from "../harness/checks/rust-source-ownership.mjs";
import { collectRepositoryTopologyViolations } from "../harness/checks/repository-topology.mjs";
import { collectCanonicalRepositoryStructureViolations } from "../harness/checks/canonical-repository-structure.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "../..");
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
  'profile.release.package."*"',
];

function read(root, path) {
  return readFileSync(join(root, path), "utf8");
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
  const match = workspaceSection.match(
    /(?:^|\n)\s*members\s*=\s*\[([\s\S]*?)\]/,
  );
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
      if (
        entry.isDirectory() &&
        existsSync(join(cratesRoot, entry.name, "Cargo.toml"))
      ) {
        members.push(`crates/${entry.name}`);
      }
    }
  }

  return members.sort();
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

function checkMemberManifest(root, member, violations) {
  const path = `${member}/Cargo.toml`;
  const text = stripTomlComments(read(root, path));

  for (const field of inheritedPackageFields) {
    const inheritance = new RegExp(
      `(?:^|\\n)\\s*${field}\\.workspace\\s*=\\s*true\\s*(?:$|\\n)`,
    );
    if (!inheritance.test(text)) {
      violations.push(
        `${path} must inherit package ${field} from the workspace`,
      );
    }
  }

  const lints = section(text, "lints");
  if (!lints || !/(?:^|\n)\s*workspace\s*=\s*true\s*(?:$|\n)/.test(lints)) {
    violations.push(`${path} must set [lints] workspace = true`);
  }

  for (const policy of ["lints.rust", "lints.clippy"]) {
    if (section(text, policy) !== null) {
      violations.push(
        `${path} must inherit lint policy instead of defining [${policy}]`,
      );
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
      violations.push(
        `${path} must inherit unsafe_code policy from Cargo.toml`,
      );
    }
    if (/#!\[(?:allow|warn|deny|forbid)\(clippy::/.test(text)) {
      violations.push(`${path} must inherit Clippy policy from Cargo.toml`);
    }
  }
}

function checkTauriShell(root, violations) {
  const mainPath = "src-tauri/src/main.rs";
  if (existsSync(join(root, mainPath))) {
    const lines = countLines(read(root, mainPath));
    if (lines > 20) {
      violations.push(
        `${mainPath} must stay at or below 20 lines; found ${lines}`,
      );
    }
  }

  const libPath = "src-tauri/src/lib.rs";
  if (existsSync(join(root, libPath))) {
    const text = read(root, libPath);
    const lines = countLines(text);
    if (lines > 100) {
      violations.push(
        `${libPath} must stay at or below 100 lines; found ${lines}`,
      );
    }
    if (/(?:^|\n)\s*pub\s+mod\s+ipc\s*;/.test(text)) {
      violations.push(
        `${libPath} must keep IPC adapters private; use mod ipc instead of pub mod ipc`,
      );
    }
  }

  const bootstrapPath = "src-tauri/src/bootstrap/mod.rs";
  if (existsSync(join(root, bootstrapPath))) {
    const text = read(root, bootstrapPath);
    if (
      /\bConfig\s*\{|\bDatabase::(?:connect|default_path)\b|\bCredentialService::new\b|\bScheduler::new_shared_with_credentials\b|\bBookmarkletServer::new\b/.test(
        text,
      )
    ) {
      violations.push(
        `${bootstrapPath} must delegate desktop service construction to jobsentinel-application`,
      );
    }
  }

  const registryPath = "src-tauri/src/ipc/registry.rs";
  if (existsSync(join(root, registryPath))) {
    const lines = countLines(read(root, registryPath));
    if (lines > 300) {
      violations.push(
        `${registryPath} must stay at or below 300 lines; found ${lines}`,
      );
    }
  }

  const importCommandPath = "src-tauri/src/ipc/import.rs";
  if (existsSync(join(root, importCommandPath))) {
    const text = read(root, importCommandPath);
    const lines = countLines(text);
    if (lines > 200) {
      violations.push(
        `${importCommandPath} must stay at or below 200 lines; found ${lines}`,
      );
    }
    if (
      /\bsqlx::|\bfetch_job_page\b|\bparse_schema_org_job_posting\b|\bcalculate_job_hash\b/.test(
        text,
      )
    ) {
      violations.push(
        `${importCommandPath} must delegate import orchestration and storage to jobsentinel-application`,
      );
    }
  }
}

export function checkRepositoryArchitecture(root = defaultRoot, options = {}) {
  const rootManifestPath = join(root, "Cargo.toml");
  const discoveredMembers = discoverMemberPaths(root);
  const violations = [];
  if (!options.skipTopology) {
    violations.push(...collectCanonicalRepositoryStructureViolations(root, options));
  }
  if (!existsSync(rootManifestPath)) {
    if (discoveredMembers.some((member) => member.startsWith("crates/"))) {
      violations.push("add root Cargo.toml before adding workspace crates");
    }
    if (!options.skipTopology) {
      violations.push(...collectRepositoryTopologyViolations(root, options));
    }
    return [...new Set(violations)].sort();
  }

  const rootManifest = stripTomlComments(read(root, "Cargo.toml"));
  if (section(rootManifest, "package") !== null) {
    violations.push("Cargo.toml must be a virtual workspace without [package]");
  }

  const workspace = section(rootManifest, "workspace");
  if (workspace === null) {
    violations.push("Cargo.toml must define [workspace]");
    if (!options.skipTopology) {
      violations.push(...collectRepositoryTopologyViolations(root, options));
    }
    return [...new Set(violations)].sort();
  }

  const parsedMembers = parseWorkspaceMembers(workspace);
  if (parsedMembers === null) {
    violations.push(
      "Cargo.toml [workspace] must define an explicit members array",
    );
  } else {
    if (!parsedMembers.literalOnly) {
      violations.push(
        "Cargo.toml workspace members must contain only quoted literal paths",
      );
    }
    for (const member of parsedMembers.members) {
      if (/[*?\[]/.test(member)) {
        violations.push(
          `Cargo.toml workspace members must be literal paths; wildcard member ${member} is forbidden`,
        );
      }
      if (!existsSync(join(root, member, "Cargo.toml"))) {
        violations.push(
          `Cargo.toml workspace member ${member} has no Cargo.toml`,
        );
      }
    }
    for (const member of discoveredMembers) {
      if (!parsedMembers.members.includes(member)) {
        violations.push(
          `Cargo.toml workspace members must list tracked crate ${member}`,
        );
      }
    }
    if (
      parsedMembers.members.join("\n") !==
      [...parsedMembers.members].sort().join("\n")
    ) {
      violations.push(
        "Cargo.toml workspace members must be sorted for deterministic review",
      );
    }
  }

  if (!/(?:^|\n)\s*resolver\s*=\s*"2"\s*(?:$|\n)/.test(workspace)) {
    violations.push(
      'Cargo.toml [workspace] must set resolver = "2" for Rust 2021 members',
    );
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
  checkTauriShell(root, violations);
  violations.push(...checkRustSourceOwnership(root, discoveredMembers));
  if (!options.skipTopology) {
    violations.push(...collectRepositoryTopologyViolations(root, options));
  }

  return [...new Set(violations)].sort();
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
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
