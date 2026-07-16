import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

import {
  collectRepositoryTopologyViolations,
  repositoryArchitectureContractPath,
} from "../../harness/checks/repository-topology.mjs";

const repositoryRoot = resolve(".");
const canonicalContract = JSON.parse(
  readFileSync(join(repositoryRoot, repositoryArchitectureContractPath), "utf8"),
);

function write(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function cloneContract() {
  return structuredClone(canonicalContract);
}

function dependency(name) {
  return { name };
}

function packageRow(root, id, name, path, dependencies = []) {
  return {
    id,
    name,
    manifest_path: join(root, path, "Cargo.toml"),
    dependencies: dependencies.map(dependency),
  };
}

function targetMetadata(root, contract) {
  const entries = Object.entries(contract.members);
  return {
    workspace_members: entries.map(([name]) => `${name}-id`),
    packages: entries.map(([name, path]) =>
      packageRow(
        root,
        `${name}-id`,
        name,
        path,
        contract.allowed_internal_dependencies[name],
      ),
    ),
  };
}

function withFixture(callback, mutate = () => {}) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-topology-"));
  try {
    const contract = cloneContract();
    mutate(contract);
    write(root, repositoryArchitectureContractPath, `${JSON.stringify(contract, null, 2)}\n`);
    const contractReference = `${repositoryArchitectureContractPath}\n${contract.decision_log_id}\n`;
    if (contract.owner !== repositoryArchitectureContractPath) {
      write(root, contract.owner, contractReference);
    }
    write(root, contract.active_plan, contractReference);
    write(root, contract.architecture_doc, contractReference);
    for (const path of contract.required_paths ?? []) {
      write(root, path, "");
    }
    callback(root, contract);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function check(root, contract, metadata = targetMetadata(root, contract), files = []) {
  return collectRepositoryTopologyViolations(root, { metadata, files });
}

test("repository topology accepts the declared target workspace", () => {
  withFixture((root, contract) => {
    assert.deepEqual(check(root, contract), []);
  });
});

test("repository topology fails when a declared member disappears", () => {
  withFixture((root, contract) => {
    const metadata = targetMetadata(root, contract);
    metadata.workspace_members = metadata.workspace_members.filter(
      (id) => id !== "jobsentinel-security-id",
    );
    metadata.packages = metadata.packages.filter(
      (row) => row.name !== "jobsentinel-security",
    );
    assert.match(check(root, contract, metadata).join("\n"), /workspace members must be exactly/);
  });
});

test("repository topology rejects an unplanned member and forbidden edge", () => {
  withFixture((root, contract) => {
    const metadata = targetMetadata(root, contract);
    metadata.workspace_members.push("extra-id");
    metadata.packages.push(
      packageRow(root, "extra-id", "jobsentinel-extra", "crates/jobsentinel-extra"),
    );
    metadata.packages
      .find((row) => row.name === "jobsentinel-security")
      .dependencies.push(dependency("jobsentinel-application"));
    const violations = check(root, contract, metadata).join("\n");
    assert.match(violations, /workspace members must be exactly/);
    assert.match(violations, /workspace member jobsentinel-extra has no locked architecture owner/);
    assert.match(
      violations,
      /jobsentinel-security has forbidden internal dependency jobsentinel-application/,
    );
  });
});

test("repository topology enforces technology ownership", () => {
  withFixture((root, contract) => {
    const metadata = targetMetadata(root, contract);
    metadata.packages
      .find((row) => row.name === "jobsentinel-security")
      .dependencies.push(dependency("tauri"));
    assert.match(
      check(root, contract, metadata).join("\n"),
      /jobsentinel-security uses tauri, which belongs only to jobsentinel/,
    );
  });
});

test("repository topology permits an explicitly shared technology owner", () => {
  withFixture((root, contract) => {
    const metadata = targetMetadata(root, contract);
    metadata.packages
      .find((row) => row.name === "jobsentinel-security")
      .dependencies.push(dependency("tauri"));
    assert.doesNotMatch(
      check(root, contract, metadata).join("\n"),
      /jobsentinel-security uses tauri/,
    );
  }, (contract) => {
    contract.technology_owners.tauri = ["jobsentinel", "jobsentinel-security"];
  });
});

test("repository topology forbids catch-all and retired paths", () => {
  withFixture((root, contract) => {
    const files = [
      "crates/jobsentinel-application/src/tests/more.rs",
      "src/mocks/newOwner.ts",
    ];
    const violations = check(root, contract, undefined, files).join("\n");
    assert.match(violations, /Split files by behavior or aggregate owner/);
    assert.match(violations, /retired architecture path is forbidden: src\/mocks\/newOwner.ts/);
  });
});

test("repository topology requires scripts to live under declared owners", () => {
  withFixture((root, contract) => {
    const violations = check(root, contract, undefined, [
      "scripts/orphan.mjs",
      "scripts/misc/helper.mjs",
    ]).join("\n");
    assert.match(violations, /root-level script is forbidden: scripts\/orphan\.mjs/);
    assert.match(violations, /undeclared script owner directory: scripts\/misc\/helper\.mjs/);
  });
});

test("repository topology requires script tests to mirror declared owners", () => {
  withFixture((root, contract) => {
    const violations = check(root, contract, undefined, [
      "scripts/tests/orphan.test.mjs",
      "scripts/tests/misc/helper.test.mjs",
      "scripts/tests/checks/action-pins.test.mjs",
    ]).join("\n");
    assert.match(
      violations,
      /flat script test support file is forbidden: scripts\/tests\/orphan\.test\.mjs/,
    );
    assert.match(
      violations,
      /undeclared script test owner directory: scripts\/tests\/misc\/helper\.test\.mjs/,
    );
    assert.doesNotMatch(violations, /scripts\/tests\/checks\/action-pins\.test\.mjs/);
  });
});

test("repository topology requires declared target entrypoints", () => {
  withFixture((root, contract) => {
    rmSync(join(root, "src-tauri/src/bootstrap/mod.rs"));
    assert.match(
      check(root, contract).join("\n"),
      /required architecture path is missing: src-tauri\/src\/bootstrap\/mod\.rs/,
    );
  });
});

test("repository topology ignores deleted paths still present in the Git index", () => {
  withFixture((root, contract) => {
    const deletedPath = "src/mocks/deleted.ts";
    const execFileSync = () => `${deletedPath}\0`;
    const violations = collectRepositoryTopologyViolations(root, {
      metadata: targetMetadata(root, contract),
      execFileSync,
    });
    assert.equal(violations.some((violation) => violation.includes(deletedPath)), false);
  });
});

test("repository topology rejects a cyclic graph before source moves", () => {
  withFixture((root, contract) => {
    assert.match(
      check(root, contract).join("\n"),
      /allowed_internal_dependencies contains a dependency cycle/,
    );
  }, (contract) => {
    contract.allowed_internal_dependencies["jobsentinel-security"] = ["jobsentinel-domain"];
  });
});
