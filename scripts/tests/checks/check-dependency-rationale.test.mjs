import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { checkDependencyRationale } from "../../checks/dependency-rationale.mjs";

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-dep-rationale-"));
  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function write(root, path, content) {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, "utf8");
}

function seed(root, { npmDeps, cargoDeps, rationale }) {
  write(root, "package.json", JSON.stringify({ dependencies: npmDeps }));
  write(
    root,
    "Cargo.toml",
    `[dependencies]\n${Object.entries(cargoDeps)
      .map(([name, version]) => `${name} = "${version}"`)
      .join("\n")}\n`,
  );
  write(root, "validation/dependency_rationale.json", JSON.stringify(rationale));
}

test("passes when every direct dependency has a rationale", () => {
  withFixture((root) => {
    seed(root, {
      npmDeps: { react: "19.0.0" },
      cargoDeps: { tokio: "1.0.0" },
      rationale: { npm: { react: "UI framework." }, cargo: { tokio: "Async runtime." } },
    });

    assert.deepEqual(checkDependencyRationale(root), []);
  });
});

test("fails when a new dependency has no rationale", () => {
  withFixture((root) => {
    seed(root, {
      npmDeps: { react: "19.0.0", leftpad: "1.0.0" },
      cargoDeps: { tokio: "1.0.0", anyhow: "1.0.0" },
      rationale: { npm: { react: "UI framework." }, cargo: { tokio: "Async runtime." } },
    });

    const violations = checkDependencyRationale(root);
    assert.ok(violations.some((v) => v.includes("add npm dependency rationale") && v.includes("leftpad")));
    assert.ok(violations.some((v) => v.includes("add cargo dependency rationale") && v.includes("anyhow")));
  });
});

test("fails on an empty rationale and on a stale entry", () => {
  withFixture((root) => {
    seed(root, {
      npmDeps: { react: "19.0.0" },
      cargoDeps: { tokio: "1.0.0" },
      rationale: {
        npm: { react: "  " },
        cargo: { tokio: "Async runtime.", removed_crate: "Was here once." },
      },
    });

    const violations = checkDependencyRationale(root);
    assert.ok(violations.some((v) => v.includes("add npm dependency rationale") && v.includes("react")));
    assert.ok(
      violations.some((v) => v.includes("remove stale cargo dependency rationale") && v.includes("removed_crate")),
    );
  });
});

test("fails on an unused Cargo workspace dependency", () => {
  withFixture((root) => {
    write(root, "package.json", '{"dependencies":{}}\n');
    write(
      root,
      "Cargo.toml",
      '[workspace.dependencies]\ntokio = "=1.0.0"\nunused = "=1.0.0"\n',
    );
    write(root, "crates/app/Cargo.toml", "[dependencies]\ntokio.workspace = true\n");
    write(
      root,
      "repository-structure-policy.json",
      JSON.stringify({
        structure: {
          units: [{ manifest: "crates/app/Cargo.toml" }],
        },
      }),
    );
    write(
      root,
      "validation/dependency_rationale.json",
      JSON.stringify({
        npm: {},
        cargo: { tokio: "Async runtime.", unused: "Not actually used." },
      }),
    );

    assert.ok(
      checkDependencyRationale(root).includes(
        "remove unused Cargo workspace dependency from Cargo.toml: unused",
      ),
    );
  });
});
