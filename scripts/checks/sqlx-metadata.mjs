#!/usr/bin/env node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), "../..");

export function reportsUnusedSqlxMetadata(output) {
  return output.includes("potentially unused queries found in .sqlx");
}

function runCargo(args, databaseUrl, captureOutput = false) {
  const options = {
    cwd: root,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      SQLX_OFFLINE: "false",
    },
  };
  if (captureOutput) {
    options.encoding = "utf8";
  } else {
    options.stdio = "inherit";
  }

  const result = spawnSync("cargo", args, options);

  if (captureOutput) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
  }

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = new Error(`cargo ${args.join(" ")} failed`);
    error.exitCode = result.status ?? 1;
    throw error;
  }
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function main() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "jobsentinel-sqlx-"));
  const databasePath = join(temporaryRoot, "jobs.db");
  const databaseUrl = `${pathToFileURL(databasePath).href.replace(/^file:/, "sqlite:")}?mode=rwc`;
  const writeMetadata = process.argv.includes("--write");

  try {
    runCargo(["sqlx", "database", "create"], databaseUrl);
    runCargo(
      [
        "sqlx",
        "migrate",
        "run",
        "--source",
        "crates/jobsentinel-storage/migrations",
      ],
      databaseUrl,
    );
    const prepareOutput = runCargo(
      [
        "sqlx",
        "prepare",
        "--workspace",
        ...(writeMetadata ? [] : ["--check"]),
      ],
      databaseUrl,
      true,
    );
    if (!writeMetadata && reportsUnusedSqlxMetadata(prepareOutput)) {
      throw new Error(
        "SQLx offline metadata contains unused query files; run npm run sqlx:prepare.",
      );
    }
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
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main();
}
