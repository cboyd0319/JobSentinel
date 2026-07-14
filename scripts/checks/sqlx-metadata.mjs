#!/usr/bin/env node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), "../..");
const temporaryRoot = mkdtempSync(join(tmpdir(), "jobsentinel-sqlx-"));
const databasePath = join(temporaryRoot, "jobs.db");
const databaseUrl = `${pathToFileURL(databasePath).href.replace(/^file:/, "sqlite:")}?mode=rwc`;
const writeMetadata = process.argv.includes("--write");

function runCargo(args) {
  const result = spawnSync("cargo", args, {
    cwd: root,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      SQLX_OFFLINE: "false",
    },
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = new Error(`cargo ${args.join(" ")} failed`);
    error.exitCode = result.status ?? 1;
    throw error;
  }
}

try {
  runCargo(["sqlx", "database", "create"]);
  runCargo([
    "sqlx",
    "migrate",
    "run",
    "--source",
    "crates/jobsentinel-core/migrations",
  ]);
  runCargo([
    "sqlx",
    "prepare",
    "--workspace",
    ...(writeMetadata ? [] : ["--check"]),
  ]);
  console.log(
    writeMetadata
      ? "SQLx offline metadata refreshed from an isolated migrated database."
      : "SQLx offline metadata check passed against an isolated migrated database.",
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = error?.exitCode ?? 1;
} finally {
  rmSync(temporaryRoot, { force: true, recursive: true });
}
