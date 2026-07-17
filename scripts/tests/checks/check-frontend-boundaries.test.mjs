import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkFrontendBoundaries } from "../../checks/frontend-boundaries.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-frontend-boundaries-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkFrontendBoundaries rejects dynamic Tailwind class construction", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/DynamicCategory.tsx",
      `
export function DynamicCategory({ color }: { color: string }) {
  return <button className={\`bg-\${color}-600 text-white\`}>Category</button>;
}
`,
    );

    const violations = checkFrontendBoundaries(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes(
          "src/components/DynamicCategory.tsx constructs Tailwind class names with interpolation",
        ),
      ),
      violations.join("\n"),
    );
  });
});

test("checkFrontendBoundaries rejects Tailwind text classes converted to inline CSS colors", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/InvalidColor.tsx",
      `
export function InvalidColor({ colorClass }: { colorClass: string }) {
  return <div style={{ color: colorClass.split(" ")[0]?.replace("text-", "") }}>Bad</div>;
}
`,
    );

    const violations = checkFrontendBoundaries(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes(
          "src/components/InvalidColor.tsx converts Tailwind text classes into inline CSS color values",
        ),
      ),
      violations.join("\n"),
    );
  });
});

test("checkFrontendBoundaries rejects URL validation by http prefix", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/UnsafeUrlInput.tsx",
      `
export function UnsafeUrlInput({ url }: { url: string }) {
  new URL(url.startsWith("http") ? url : \`https://\${url}\`);
  return null;
}
`,
    );

    const violations = checkFrontendBoundaries(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes(
          'src/components/UnsafeUrlInput.tsx validates URLs with startsWith("http")',
        ),
      ),
      violations.join("\n"),
    );
  });
});

test("checkFrontendBoundaries resolves tsconfig path aliases", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "tsconfig.json",
      `
{
  "compilerOptions": {
    /* Path aliases */
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "exclude": ["**/*.test.tsx"]
}
`,
    );
    writeFixtureFile(
      root,
      "src/ui/BadImport.tsx",
      `
import { Dashboard } from "@/features/dashboard/DashboardPage";

export function BadImport() {
  return <Dashboard />;
}
`,
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/DashboardPage.tsx",
      `
export function Dashboard() {
  return null;
}
`,
    );

    const violations = checkFrontendBoundaries(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes(
          "src/ui/BadImport.tsx imports @/features/dashboard/DashboardPage across forbidden boundary (ui -> features)",
        ),
      ),
      violations.join("\n"),
    );
  });
});

test("checkFrontendBoundaries rejects removed root buckets", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/LegacyPanel.tsx",
      "export function LegacyPanel() { return null; }\n",
    );

    const violations = checkFrontendBoundaries(root);

    assert.ok(
      violations.includes(
        "src/components/LegacyPanel.tsx uses removed root bucket src/components/; assign it to app, a feature, shared, or ui",
      ),
      violations.join("\n"),
    );
  });
});

test("checkFrontendBoundaries rejects feature implementation imports across feature owners", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "tsconfig.json",
      JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }),
    );
    writeFixtureFile(
      root,
      "src/features/search/SearchPage.tsx",
      'import { ResumeEditor } from "@/features/resume/ResumeEditor";\nexport { ResumeEditor };\n',
    );
    writeFixtureFile(
      root,
      "src/features/resume/ResumeEditor.tsx",
      "export function ResumeEditor() { return null; }\n",
    );

    const violations = checkFrontendBoundaries(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes(
          "src/features/search/SearchPage.tsx imports @/features/resume/ResumeEditor across feature ownership boundary (search -> resume)",
        ),
      ),
      violations.join("\n"),
    );
  });
});

test("checkFrontendBoundaries allows app composition of feature facades", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "tsconfig.json",
      JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }),
    );
    writeFixtureFile(
      root,
      "src/app/router.tsx",
      'import { SearchPage } from "@/features/search";\nexport { SearchPage };\n',
    );
    writeFixtureFile(
      root,
      "src/features/search/index.ts",
      'export { SearchPage } from "./SearchPage";\n',
    );
    writeFixtureFile(
      root,
      "src/features/search/SearchPage.tsx",
      "export function SearchPage() { return null; }\n",
    );

    const violations = checkFrontendBoundaries(root);

    assert.deepEqual(violations, []);
  });
});

test("checkFrontendBoundaries rejects ui dependencies on product features", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/ui/Button.tsx",
      'import { searchLabel } from "../features/search/model";\nexport const Button = searchLabel;\n',
    );
    writeFixtureFile(root, "src/features/search/model.ts", 'export const searchLabel = "Search";\n');

    const violations = checkFrontendBoundaries(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes(
          "src/ui/Button.tsx imports ../features/search/model across forbidden boundary (ui -> features)",
        ),
      ),
      violations.join("\n"),
    );
  });
});

test("checkFrontendBoundaries rejects shared dependencies on app, features, or ui", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/shared/format.ts",
      'import { Button } from "../ui/Button";\nexport { Button };\n',
    );
    writeFixtureFile(root, "src/ui/Button.tsx", "export function Button() { return null; }\n");

    const violations = checkFrontendBoundaries(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes(
          "src/shared/format.ts imports ../ui/Button across forbidden boundary (shared -> ui)",
        ),
      ),
      violations.join("\n"),
    );
  });
});

test("checkFrontendBoundaries rejects production imports from test support", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/app/bootstrap.tsx",
      'import { setupMocking } from "../test-support/mocks";\nexport { setupMocking };\n',
    );
    writeFixtureFile(
      root,
      "src/test-support/mocks/index.ts",
      "export function setupMocking() {}\n",
    );

    const violations = checkFrontendBoundaries(root);

    assert.ok(
      violations.includes(
        "src/app/bootstrap.tsx imports ../test-support/mocks across forbidden boundary (app -> test-support): production code must not depend on test support",
      ),
      violations.join("\n"),
    );
  });
});

test("checkFrontendBoundaries ignores colocated test support modules", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/dashboard/Dashboard.testSupport.tsx",
      [
        'import { invoke } from "@tauri-apps/api/core";',
        'import { ToastProvider } from "../../app/providers/ToastProvider";',
        "export { invoke, ToastProvider };",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/dashboardTestFixtures.ts",
      'import { UndoProvider } from "../../app/providers/UndoProvider";\nexport { UndoProvider };\n',
    );

    assert.deepEqual(checkFrontendBoundaries(root), []);
  });
});

test("checkFrontendBoundaries allows only app bootstrap and test support to import dev runtime", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/app/bootstrap.tsx",
      'if (!import.meta.env.DEV) return;\nvoid import("../dev-runtime/prepare");\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/DashboardPage.tsx",
      'import { prepareDevelopmentRuntime } from "../../dev-runtime/prepare";\nexport { prepareDevelopmentRuntime };\n',
    );
    writeFixtureFile(
      root,
      "src/dev-runtime/prepare.ts",
      "export function prepareDevelopmentRuntime() {}\n",
    );

    const violations = checkFrontendBoundaries(root);

    assert.deepEqual(violations, [
      "src/features/dashboard/DashboardPage.tsx imports ../../dev-runtime/prepare across forbidden boundary (features -> dev-runtime): only app bootstrap and test support may load the development runtime",
    ]);
  });
});

test("checkFrontendBoundaries requires an environment gate for app dev runtime loading", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/app/bootstrap.tsx",
      'void import("../dev-runtime/prepare");\n',
    );
    writeFixtureFile(
      root,
      "src/dev-runtime/prepare.ts",
      "export function prepareDevelopmentRuntime() {}\n",
    );

    const violations = checkFrontendBoundaries(root);

    assert.ok(
      violations.includes(
        "src/app/bootstrap.tsx must guard its dynamic dev-runtime import with import.meta.env.DEV",
      ),
      violations.join("\n"),
    );
  });
});

test("checkFrontendBoundaries requires production desktop APIs to use the platform owner", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/dashboard/DashboardPage.tsx",
      'import { invoke } from "@tauri-apps/api/core";\nexport { invoke };\n',
    );
    writeFixtureFile(
      root,
      "src/platform/tauri/index.ts",
      'export { invoke } from "@tauri-apps/api/core";\n',
    );

    const violations = checkFrontendBoundaries(root);

    assert.deepEqual(violations, [
      "src/features/dashboard/DashboardPage.tsx imports @tauri-apps/api/core outside src/platform: production desktop APIs must use the platform owner",
    ]);
  });
});

test("checkFrontendBoundaries rejects feature-owned mock directories", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/dashboard/mocks/commands.ts",
      "export function handleMockDashboardCommand() {}\n",
    );

    const violations = checkFrontendBoundaries(root);

    assert.deepEqual(violations, [
      "src/features/dashboard/mocks is retired: feature mock behavior belongs under src/dev-runtime/features",
    ]);
  });
});
