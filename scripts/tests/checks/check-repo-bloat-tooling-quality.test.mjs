import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-repo-bloat-tooling-quality-"),
  );

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects redundant direct Playwright dependency", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify(
        {
          devDependencies: {
            "@playwright/test": "^1.58.2",
            playwright: "^1.57.0",
          },
        },
        null,
        2,
      ),
    );

    execFileSync("git", ["add", "package.json"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove redundant direct Playwright dependency: package.json",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects direct Playwright E2E scripts", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify(
        {
          scripts: {
            "test:e2e": "playwright test --project=chromium",
            "test:e2e:smoke":
              "node scripts/dev/run-playwright.mjs test --grep @smoke",
          },
        },
        null,
        2,
      ),
    );

    execFileSync("git", ["add", "package.json"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "route E2E scripts through Playwright wrapper: package.json",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects redundant DOMPurify stub types", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify(
        {
          dependencies: {
            "@types/dompurify": "^3.2.0",
            dompurify: "^3.3.3",
          },
        },
        null,
        2,
      ),
    );

    execFileSync("git", ["add", "package.json"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove redundant DOMPurify stub types dependency: package.json",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Tailwind PostCSS plugin in Vite app", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify(
        {
          devDependencies: {
            "@tailwindcss/postcss": "^4.3.0",
            tailwindcss: "^4.3.0",
            vite: "^8.0.14",
          },
        },
        null,
        2,
      ),
    );
    writeFixtureFile(
      root,
      "postcss.config.js",
      [
        "export default {",
        "  plugins: {",
        "    '@tailwindcss/postcss': {},",
        "    autoprefixer: {},",
        "  },",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "postcss.config.js"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "use Tailwind Vite plugin instead of PostCSS plugin: package.json",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "use Tailwind Vite plugin instead of PostCSS plugin: postcss.config.js",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale E2E runtime skip guidance", () => {
  withGitFixture((root) => {
    const runtimeSkipCall = ["test", "skip"].join(".");

    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "tests/e2e/README.md",
      [
        "## Test Patterns",
        "",
        "```typescript",
        `${runtimeSkipCall}(browserName === "webkit", "Documented platform gap");`,
        "```",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "tests/e2e/README.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace stale test-quality doc guidance: tests/e2e/README.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects focused-test commit guidance", () => {
  withGitFixture((root) => {
    const focusedTestCall = ["it", "only"].join(".");

    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/FRONTEND_TESTING.md",
      [
        "## Debugging Failed Tests",
        "",
        "```typescript",
        `${focusedTestCall}("should test this one thing", () => {});`,
        "```",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/developer/FRONTEND_TESTING.md"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace stale test-quality doc guidance: docs/developer/FRONTEND_TESTING.md",
      ),
      violations.join("\n"),
    );
  });
});
