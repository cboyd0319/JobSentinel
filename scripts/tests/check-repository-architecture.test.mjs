import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepositoryArchitecture } from "../check-repository-architecture.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repository-architecture-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeTargetWorkspace(root, rootManifest = targetRootManifest()) {
  writeFixtureFile(root, "Cargo.toml", rootManifest);
  writeFixtureFile(
    root,
    "crates/jobsentinel-core/Cargo.toml",
    `${inheritedPackage()}
[dependencies]
serde.workspace = true

[lints]
workspace = true
`,
  );
  writeFixtureFile(root, "crates/jobsentinel-core/src/lib.rs", "mod search;\npub use search::Search;\n");
  writeFixtureFile(root, "crates/jobsentinel-core/src/search.rs", "pub struct Search;\n");
  writeFixtureFile(
    root,
    "src-tauri/Cargo.toml",
    `${inheritedPackage()}
[dependencies]
jobsentinel-core.workspace = true
tauri.workspace = true

[lints]
workspace = true
`,
  );
  writeFixtureFile(root, "src-tauri/src/main.rs", "fn main() { jobsentinel::run(); }\n");
  writeFixtureFile(root, "src-tauri/src/lib.rs", "mod commands;\npub fn run() {}\n");
}

function inheritedPackage() {
  return `[package]
name = "fixture"
version.workspace = true
edition.workspace = true
authors.workspace = true
license.workspace = true
repository.workspace = true
keywords.workspace = true
categories.workspace = true
`;
}

function targetRootManifest(members = '["crates/jobsentinel-core", "src-tauri"]') {
  return `[workspace]
members = ${members}
resolver = "2"

[workspace.package]
version = "2.9.1"
edition = "2021"
authors = ["Fixture"]
license = "MIT"
repository = "https://example.com"
keywords = ["fixture"]
categories = ["development-tools"]

[workspace.dependencies]
jobsentinel-core = { path = "crates/jobsentinel-core" }
serde = "1"
tauri = "2"

[workspace.lints.rust]
unsafe_code = "deny"

[workspace.lints.clippy]
pedantic = "warn"

[profile.release]
panic = "abort"
`;
}

test("checkRepositoryArchitecture permits the pre-workspace migration state", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src-tauri/Cargo.toml", "[package]\nname = \"jobsentinel\"\n");

    assert.deepEqual(checkRepositoryArchitecture(root), []);
  });
});

test("checkRepositoryArchitecture rejects cyclic core module imports before extraction", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src-tauri/Cargo.toml", "[package]\nname = \"jobsentinel\"\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/encryption.rs",
      "use crate::core::credentials::SecretVault;\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/example.rs",
      "use crate::core::db::Job;\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/job_hash.rs",
      "use crate::core::scrapers::normalize_url;\n",
    );

    const violations = checkRepositoryArchitecture(root);

    assert.ok(
      violations.includes(
        "src-tauri/src/core/db/encryption.rs: database modules must not import credential modules",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "src-tauri/src/core/scrapers/example.rs: source adapters must not import database modules",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "src-tauri/src/core/job_hash.rs: job identity must not import source adapter modules",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepositoryArchitecture rejects wildcard workspace member discovery", () => {
  withFixture((root) => {
    writeTargetWorkspace(root, targetRootManifest('["crates/*", "src-tauri"]'));

    const violations = checkRepositoryArchitecture(root);

    assert.ok(
      violations.includes(
        "Cargo.toml workspace members must be literal paths; wildcard member crates/* is forbidden",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepositoryArchitecture rejects tracked member manifests omitted from the workspace", () => {
  withFixture((root) => {
    writeTargetWorkspace(root);
    writeFixtureFile(root, "crates/jobsentinel-extra/Cargo.toml", inheritedPackage());

    const violations = checkRepositoryArchitecture(root);

    assert.ok(
      violations.includes(
        "Cargo.toml workspace members must list tracked crate crates/jobsentinel-extra",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepositoryArchitecture rejects workspace members without manifests", () => {
  withFixture((root) => {
    writeTargetWorkspace(
      root,
      targetRootManifest(
        '["crates/jobsentinel-core", "crates/jobsentinel-missing", "src-tauri"]',
      ),
    );

    const violations = checkRepositoryArchitecture(root);

    assert.ok(
      violations.includes(
        "Cargo.toml workspace member crates/jobsentinel-missing has no Cargo.toml",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepositoryArchitecture requires workspace package and lint inheritance", () => {
  withFixture((root) => {
    writeTargetWorkspace(root);
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/Cargo.toml",
      `[package]
name = "jobsentinel-core"
version = "2.9.1"
edition = "2021"
`,
    );

    const violations = checkRepositoryArchitecture(root);

    assert.ok(
      violations.includes(
        "crates/jobsentinel-core/Cargo.toml must inherit package version from the workspace",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "crates/jobsentinel-core/Cargo.toml must set [lints] workspace = true",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepositoryArchitecture rejects member-owned workspace lint and release policy", () => {
  withFixture((root) => {
    writeTargetWorkspace(root);
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/Cargo.toml",
      `${inheritedPackage()}
[lints]
workspace = true

[lints.rust]
unsafe_code = "deny"

[profile.release]
panic = "abort"
`,
    );

    const violations = checkRepositoryArchitecture(root);

    assert.ok(
      violations.includes(
        "crates/jobsentinel-core/Cargo.toml must inherit lint policy instead of defining [lints.rust]",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "crates/jobsentinel-core/Cargo.toml must inherit release policy instead of defining [profile.release]",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepositoryArchitecture rejects Tauri dependencies and imports in core", () => {
  withFixture((root) => {
    writeTargetWorkspace(root);
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/Cargo.toml",
      `${inheritedPackage()}
[dependencies]
tauri.workspace = true

[lints]
workspace = true
`,
    );
    writeFixtureFile(root, "crates/jobsentinel-core/src/lib.rs", "use tauri::Manager;\n");

    const violations = checkRepositoryArchitecture(root);

    assert.ok(
      violations.includes(
        "crates/jobsentinel-core/Cargo.toml must not depend on Tauri packages",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "crates/jobsentinel-core/src/lib.rs must not import Tauri; core is Tauri-free",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepositoryArchitecture enforces thin private Tauri entrypoints", () => {
  withFixture((root) => {
    writeTargetWorkspace(root);
    writeFixtureFile(
      root,
      "src-tauri/src/main.rs",
      Array.from({ length: 21 }, (_, index) => `const LINE_${index}: usize = ${index};`).join(
        "\n",
      ),
    );
    writeFixtureFile(root, "src-tauri/src/lib.rs", "pub mod commands;\npub fn run() {}\n");

    const violations = checkRepositoryArchitecture(root);

    assert.ok(
      violations.includes("src-tauri/src/main.rs must stay at or below 20 lines; found 21"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "src-tauri/src/lib.rs must keep commands private; use mod commands instead of pub mod commands",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepositoryArchitecture accepts the deliberate two-member workspace", () => {
  withFixture((root) => {
    writeTargetWorkspace(root);

    assert.deepEqual(checkRepositoryArchitecture(root), []);
  });
});
