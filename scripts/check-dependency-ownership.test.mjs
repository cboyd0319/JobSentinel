import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasDirectPlaywrightE2eScript,
  hasRedundantDirectPlaywrightDependency,
  hasRedundantDomPurifyTypesDependency,
  hasTailwindPostcssPlugin,
  hasUnownedStorybookAddon,
  readPackageManifest,
} from "./harness/checks/dependency-ownership.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-dependency-ownership-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("readPackageManifest parses package metadata", () => {
  withFixture((root) => {
    writeFixtureFile(root, "package.json", '{"name":"jobsentinel"}\n');
    assert.equal(readPackageManifest(root).name, "jobsentinel");
  });
});

test("Storybook addon ownership checks declared packages", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify({ devDependencies: { "@storybook/addon-a11y": "1.0.0" } }),
    );
    writeFixtureFile(
      root,
      ".storybook/main.ts",
      'export default { "addons": ["@storybook/addon-a11y", "@storybook/addon-links"] };\n',
    );

    assert.equal(hasUnownedStorybookAddon(root, ".storybook/main.ts"), true);
  });
});

test("dependency ownership checks redundant package choices", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify({
        devDependencies: {
          "@playwright/test": "1.0.0",
          "@tailwindcss/postcss": "1.0.0",
          "@types/dompurify": "1.0.0",
          dompurify: "1.0.0",
          playwright: "1.0.0",
        },
        scripts: {
          "test:e2e": "playwright test --project=chromium",
        },
      }),
    );

    assert.equal(hasRedundantDirectPlaywrightDependency(root, "package.json"), true);
    assert.equal(hasDirectPlaywrightE2eScript(root, "package.json"), true);
    assert.equal(hasRedundantDomPurifyTypesDependency(root, "package.json"), true);
    assert.equal(hasTailwindPostcssPlugin(root, "package.json"), true);
  });
});

test("Tailwind PostCSS config check covers config file drift", () => {
  withFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "postcss.config.js",
      'export default { plugins: ["@tailwindcss/postcss"] };\n',
    );

    assert.equal(hasTailwindPostcssPlugin(root, "postcss.config.js"), true);
  });
});
