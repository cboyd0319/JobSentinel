import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepositoryArchitecture as checkRepositoryArchitectureWithTopology } from "../../checks/repository-architecture.mjs";

function checkRepositoryArchitecture(root) {
  return checkRepositoryArchitectureWithTopology(root, { skipTopology: true });
}

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-repository-architecture-"),
  );

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
    "crates/jobsentinel-domain/Cargo.toml",
    `${inheritedPackage()}
[dependencies]
serde.workspace = true

[lints]
workspace = true
`,
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-domain/src/lib.rs",
    "mod search;\npub use search::Search;\n",
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-domain/src/search.rs",
    "pub struct Search;\n",
  );
  writeFixtureFile(
    root,
    "src-tauri/Cargo.toml",
    `${inheritedPackage()}
[dependencies]
jobsentinel-domain.workspace = true
tauri.workspace = true

[lints]
workspace = true
`,
  );
  writeFixtureFile(
    root,
    "src-tauri/src/main.rs",
    "fn main() { jobsentinel::run(); }\n",
  );
  writeFixtureFile(
    root,
    "src-tauri/src/lib.rs",
    "mod ipc;\npub fn run() {}\n",
  );
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

function targetRootManifest(
  members = '["crates/jobsentinel-domain", "src-tauri"]',
) {
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
jobsentinel-domain = { path = "crates/jobsentinel-domain" }
serde = "1"
tauri = "2"

[workspace.lints.rust]
unsafe_code = "deny"

[workspace.lints.clippy]
pedantic = "warn"

[profile.release]
panic = "abort"

[profile.release.package."*"]
strip = "none"
`;
}

test("checkRepositoryArchitecture permits the pre-workspace migration state", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/Cargo.toml",
      '[package]\nname = "jobsentinel"\n',
    );

    assert.deepEqual(checkRepositoryArchitecture(root), []);
  });
});

test("integrated architecture check fails closed without the topology contract", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/Cargo.toml",
      '[package]\nname = "jobsentinel"\n',
    );

    assert.match(
      checkRepositoryArchitectureWithTopology(root).join("\n"),
      /add repository architecture contract/,
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
    writeFixtureFile(
      root,
      "crates/jobsentinel-extra/Cargo.toml",
      inheritedPackage(),
    );

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
        '["crates/jobsentinel-domain", "crates/jobsentinel-missing", "src-tauri"]',
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

test("checkRepositoryArchitecture requires dependency-safe release stripping", () => {
  withFixture((root) => {
    writeTargetWorkspace(
      root,
      targetRootManifest().replace(
        '\n[profile.release.package."*"]\nstrip = "none"\n',
        "",
      ),
    );

    const violations = checkRepositoryArchitecture(root);

    assert.ok(
      violations.includes(
        'Cargo.toml must centralize [profile.release.package."*"]',
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
      "crates/jobsentinel-domain/Cargo.toml",
      `[package]
name = "jobsentinel-domain"
version = "2.9.1"
edition = "2021"
`,
    );

    const violations = checkRepositoryArchitecture(root);

    assert.ok(
      violations.includes(
        "crates/jobsentinel-domain/Cargo.toml must inherit package version from the workspace",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "crates/jobsentinel-domain/Cargo.toml must set [lints] workspace = true",
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
      "crates/jobsentinel-domain/Cargo.toml",
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
        "crates/jobsentinel-domain/Cargo.toml must inherit lint policy instead of defining [lints.rust]",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "crates/jobsentinel-domain/Cargo.toml must inherit release policy instead of defining [profile.release]",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepositoryArchitecture rejects crate-root lint policy", () => {
  withFixture((root) => {
    writeTargetWorkspace(root);
    writeFixtureFile(
      root,
      "crates/jobsentinel-domain/src/lib.rs",
      "#![deny(unsafe_code)]\n#![allow(clippy::too_many_lines)]\nmod search;\n",
    );

    const violations = checkRepositoryArchitecture(root);

    assert.ok(
      violations.includes(
        "crates/jobsentinel-domain/src/lib.rs must inherit unsafe_code policy from Cargo.toml",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "crates/jobsentinel-domain/src/lib.rs must inherit Clippy policy from Cargo.toml",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepositoryArchitecture rejects Rust source outside the module graph", () => {
  withFixture((root) => {
    writeTargetWorkspace(root);
    writeFixtureFile(
      root,
      "crates/jobsentinel-domain/src/unowned.rs",
      "pub struct Unowned;\n",
    );

    const violations = checkRepositoryArchitecture(root);

    assert.ok(
      violations.includes(
        "crates/jobsentinel-domain/src/unowned.rs must be reachable from a Rust crate root",
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
      Array.from(
        { length: 21 },
        (_, index) => `const LINE_${index}: usize = ${index};`,
      ).join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/lib.rs",
      "pub mod ipc;\npub fn run() {}\n",
    );

    const violations = checkRepositoryArchitecture(root);

    assert.ok(
      violations.includes(
        "src-tauri/src/main.rs must stay at or below 20 lines; found 21",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "src-tauri/src/lib.rs must keep IPC adapters private; use mod ipc instead of pub mod ipc",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepositoryArchitecture keeps desktop service construction in the application crate", () => {
  withFixture((root) => {
    writeTargetWorkspace(root);
    writeFixtureFile(
      root,
      "src-tauri/src/bootstrap/mod.rs",
      [
        "fn setup() {",
        "  let database = Database::connect(&Database::default_path());",
        "  let credentials = CredentialService::new(database.credentials());",
        "  let scheduler = Scheduler::new_shared_with_credentials();",
        "  let bookmarklet = BookmarkletServer::new(Default::default());",
        "}",
      ].join("\n"),
    );

    const violations = checkRepositoryArchitecture(root);

    assert.ok(
      violations.includes(
        "src-tauri/src/bootstrap/mod.rs must delegate desktop service construction to jobsentinel-application",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepositoryArchitecture keeps import orchestration in the application crate", () => {
  withFixture((root) => {
    writeTargetWorkspace(root);
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/import.rs",
      [
        'async fn import_job() { sqlx::query("SELECT 1"); }',
        ...Array.from(
          { length: 200 },
          (_, index) => `const LINE_${index}: usize = ${index};`,
        ),
      ].join("\n"),
    );

    const violations = checkRepositoryArchitecture(root);

    assert.ok(
      violations.includes(
        "src-tauri/src/ipc/import.rs must stay at or below 200 lines; found 201",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "src-tauri/src/ipc/import.rs must delegate import orchestration and storage to jobsentinel-application",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepositoryArchitecture accepts an explicit sorted workspace", () => {
  withFixture((root) => {
    writeTargetWorkspace(root);

    assert.deepEqual(checkRepositoryArchitecture(root), []);
  });
});
