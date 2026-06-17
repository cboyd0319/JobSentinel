#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillNamePattern = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const allowedSkillRootEntries = new Set([
  "SKILL.md",
  "README.md",
  "LICENSE",
  "LICENSE.txt",
  "assets",
  "references",
  "scripts",
]);

function readText(path) {
  return readFileSync(path, "utf8");
}

function countLines(text) {
  if (text.length === 0) {
    return 0;
  }

  return text.split(/\r?\n/).length - (/\r?\n$/.test(text) ? 1 : 0);
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

  if (!match) {
    return null;
  }

  const fields = new Map();
  for (const rawLine of match[1].split(/\r?\n/)) {
    if (/^\s/.test(rawLine) || rawLine.trim() === "" || rawLine.trim().startsWith("#")) {
      continue;
    }

    const fieldMatch = rawLine.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!fieldMatch) {
      continue;
    }

    const [, key, rawValue = ""] = fieldMatch;
    fields.set(key, rawValue.trim().replace(/^["']|["']$/g, ""));
  }

  return {
    bodyStart: match[0].length,
    fields,
  };
}

function isAllowedResourceFile(path) {
  return /\.(?:csv|json|md|mjs|py|sh|txt|ya?ml)$/.test(path);
}

function collectResourceFiles(root, dir) {
  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(root, fullPath).split(/[\\/]/).join("/");

    if (entry.isDirectory()) {
      files.push(...collectResourceFiles(root, fullPath));
    } else if (entry.isFile()) {
      files.push(relPath);
    }
  }

  return files;
}

export function validateSkillPackage(skillRoot) {
  const errors = [];
  const skillDirName = skillRoot.split(/[\\/]/).pop();
  const skillPath = join(skillRoot, "SKILL.md");

  if (!existsSync(skillPath)) {
    return [`${skillDirName}/ missing SKILL.md`];
  }

  const text = readText(skillPath);
  const frontmatter = parseFrontmatter(text);

  if (!frontmatter) {
    errors.push(`${skillDirName}/SKILL.md must start with YAML frontmatter`);
    return errors;
  }

  const name = frontmatter.fields.get("name") ?? "";
  const description = frontmatter.fields.get("description") ?? "";
  const compatibility = frontmatter.fields.get("compatibility");
  const allowedTools = frontmatter.fields.get("allowed-tools");
  const body = text.slice(frontmatter.bodyStart).trim();

  if (!skillNamePattern.test(name) || name.includes("--")) {
    errors.push(`${skillDirName}/SKILL.md name must be lowercase alphanumeric hyphen format`);
  }

  if (name !== skillDirName) {
    errors.push(`${skillDirName}/SKILL.md name must match parent directory`);
  }

  if (description.length === 0 || description.length > 1024) {
    errors.push(`${skillDirName}/SKILL.md description must be 1-1024 characters`);
  }

  if (compatibility !== undefined && (compatibility.length === 0 || compatibility.length > 500)) {
    errors.push(`${skillDirName}/SKILL.md compatibility must be 1-500 characters`);
  }

  if (allowedTools !== undefined && /\s{2,}/.test(allowedTools)) {
    errors.push(`${skillDirName}/SKILL.md allowed-tools must be a space-separated string`);
  }

  if (body.length === 0) {
    errors.push(`${skillDirName}/SKILL.md must include body instructions`);
  }

  if (countLines(text) > 500) {
    errors.push(`${skillDirName}/SKILL.md must stay under 500 lines`);
  }

  if (!/^## Guardrails$/m.test(text)) {
    errors.push(`${skillDirName}/SKILL.md must include a Guardrails section`);
  }

  for (const entry of readdirSync(skillRoot, { withFileTypes: true })) {
    if (!allowedSkillRootEntries.has(entry.name)) {
      errors.push(`${skillDirName}/ contains unsupported entry: ${entry.name}`);
    }

    if (entry.isDirectory() && !["assets", "references", "scripts"].includes(entry.name)) {
      errors.push(`${skillDirName}/ contains unsupported directory: ${entry.name}`);
    }
  }

  for (const resourceDir of ["assets", "references", "scripts"]) {
    const dir = join(skillRoot, resourceDir);
    if (!existsSync(dir)) {
      continue;
    }

    for (const file of collectResourceFiles(skillRoot, dir)) {
      const fullPath = join(skillRoot, file);
      if (!isAllowedResourceFile(file)) {
        errors.push(`${skillDirName}/${file} has unsupported resource extension`);
      }

      if (statSync(fullPath).size === 0) {
        errors.push(`${skillDirName}/${file} must not be empty`);
      }
    }
  }

  return errors;
}

export function checkAgentSkills(root = repoRoot) {
  const errors = [];
  const skillsRoot = join(root, "skills");

  if (!existsSync(skillsRoot)) {
    return ["skills/ directory is required for downloadable Agent Skills"];
  }

  const entries = readdirSync(skillsRoot, { withFileTypes: true });
  const skillDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (skillDirs.length < 6) {
    errors.push("skills/ must include at least six job-search skill packages");
  }

  for (const entry of entries) {
    if (entry.isFile() && entry.name !== "README.md") {
      errors.push(`skills/ contains unsupported root file: ${entry.name}`);
    }

    if (entry.isDirectory() && (!skillNamePattern.test(entry.name) || entry.name.includes("--"))) {
      errors.push(`skills/${entry.name}/ must use lowercase alphanumeric hyphen format`);
    }
  }

  for (const skillDir of skillDirs) {
    errors.push(...validateSkillPackage(join(skillsRoot, skillDir)));
  }

  return errors;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const errors = checkAgentSkills(repoRoot);

  if (errors.length > 0) {
    console.error("Agent Skills check failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Agent Skills check passed.");
}
