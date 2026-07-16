import { spawnSync } from "node:child_process";
import { preparePlaywrightEnv } from "./run-playwright.mjs";

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const args = [
  "--no-install",
  "playwright",
  "test",
  "tests/e2e/playwright/screenshots.spec.ts",
  "--project=chromium",
  ...process.argv.slice(2),
];

const result = spawnSync(npxCommand, args, {
  stdio: "inherit",
  env: await preparePlaywrightEnv({
    ...process.env,
    UPDATE_DOC_SCREENSHOTS: "1",
  }),
});

process.exit(result.status ?? 1);
