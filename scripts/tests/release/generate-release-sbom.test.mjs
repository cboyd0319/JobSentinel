import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildCargoSpdx,
  generateReleaseSbom,
  npmSbom,
  parseCargoLock,
} from "../../release/generate-release-sbom.mjs";

const minimalNpmSbom = {
  spdxVersion: "SPDX-2.3",
  dataLicense: "CC0-1.0",
  SPDXID: "SPDXRef-DOCUMENT",
  name: "jobsentinel@9.9.9",
  documentNamespace: "http://spdx.org/spdxdocs/jobsentinel-test",
  creationInfo: {
    created: "2026-01-01T00:00:00.000Z",
    creators: ["Tool: npm/cli-11.17.0"],
  },
  documentDescribes: ["SPDXRef-Package-jobsentinel-9.9.9"],
  packages: [
    {
      name: "jobsentinel",
      SPDXID: "SPDXRef-Package-jobsentinel-9.9.9",
      versionInfo: "9.9.9",
      downloadLocation: "NOASSERTION",
      filesAnalyzed: false,
      licenseDeclared: "NOASSERTION",
    },
  ],
  relationships: [],
};

test("parseCargoLock reads packages, checksums, and versioned dependencies", () => {
  const packages = parseCargoLock(`
version = 4

[[package]]
name = "jobsentinel"
version = "9.9.9"
dependencies = [
 "anyhow",
 "windows-sys 0.60.2",
]

[[package]]
name = "anyhow"
version = "1.0.102"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7f202df86484c868dbad7eaa557ef785d5c66295e41b460ef922eca0723b842c"

[[package]]
name = "windows-sys"
version = "0.60.2"
`);

  assert.equal(packages.length, 3);
  assert.deepEqual(packages[0].dependencies, [
    { name: "anyhow", version: undefined },
    { name: "windows-sys", version: "0.60.2" },
  ]);
  assert.equal(packages[1].checksum, "7f202df86484c868dbad7eaa557ef785d5c66295e41b460ef922eca0723b842c");
});

test("buildCargoSpdx creates package purls, checksums, and dependency relationships", () => {
  const packages = parseCargoLock(`
[[package]]
name = "jobsentinel"
version = "9.9.9"
dependencies = [
 "anyhow",
]

[[package]]
name = "anyhow"
version = "1.0.102"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7f202df86484c868dbad7eaa557ef785d5c66295e41b460ef922eca0723b842c"
`);

  const spdx = buildCargoSpdx({
    packages,
    rootPackageName: "jobsentinel",
    rootPackageVersion: "9.9.9",
  });

  assert.equal(spdx.packages.length, 2);
  assert(
    spdx.packages.some((pkg) =>
      pkg.externalRefs.some((ref) => ref.referenceLocator === "pkg:cargo/anyhow@1.0.102"),
    ),
  );
  assert(
    spdx.relationships.some(
      (relationship) =>
        relationship.spdxElementId === "SPDXRef-Cargo-Package-jobsentinel-9.9.9" &&
        relationship.relatedSpdxElement === "SPDXRef-Cargo-Package-anyhow-1.0.102",
    ),
  );
});

test("generateReleaseSbom writes SPDX, manifest, and installable attestation checksums", async () => {
  const root = mkdtempRoot("jobsentinel-release-sbom-");
  mkdirSync(join(root, "src-tauri"), { recursive: true });
  mkdirSync(join(root, "release-assets/public"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "jobsentinel",
      version: "9.9.9",
      description: "Test app",
      repository: { url: "https://github.com/cboyd0319/JobSentinel" },
    }),
  );
  writeFileSync(
    join(root, "src-tauri/Cargo.toml"),
    '[package]\nname = "jobsentinel"\nversion.workspace = true\nlicense = "MIT"\n',
  );
  writeFileSync(join(root, "Cargo.toml"), '[workspace.package]\nversion = "9.9.9"\n');
  writeFileSync(
    join(root, "Cargo.lock"),
    `
[[package]]
name = "jobsentinel"
version = "9.9.9"
dependencies = [
 "anyhow",
]

[[package]]
name = "anyhow"
version = "1.0.102"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7f202df86484c868dbad7eaa557ef785d5c66295e41b460ef922eca0723b842c"
`,
  );
  writeFileSync(join(root, "release-assets/public/JobSentinel_9.9.9_no-account_universal.dmg"), "dmg");
  writeFileSync(join(root, "release-assets/public/JobSentinel_9.9.9_no-account_universal.dmg.sha256"), "digest  file");

  const result = await generateReleaseSbom({
    root,
    outDir: "release-assets/public",
    checksumOut: "release-assets/attestation-subjects.sha256",
    platform: "macos",
    version: "9.9.9",
    created: "2026-01-01T00:00:00.000Z",
    requireArtifacts: true,
    npmDocument: minimalNpmSbom,
  });

  const sbom = JSON.parse(readFileSync(result.sbomPath, "utf8"));
  const manifest = JSON.parse(readFileSync(result.manifestPath, "utf8"));
  const checksums = readFileSync(result.checksumPath, "utf8");

  assert.equal(sbom.spdxVersion, "SPDX-2.3");
  assert(sbom.packages.some((pkg) => pkg.SPDXID === "SPDXRef-Cargo-Package-anyhow-1.0.102"));
  assert.equal(manifest.sbom.fileName, "JobSentinel-9.9.9-macos.sbom.spdx.json");
  assert.equal(manifest.assets.length, 2);
  assert.match(checksums, /^[a-f0-9]{64} {2}JobSentinel_9\.9\.9_no-account_universal\.dmg\n$/);
});

test("npmSbom routes Windows npm through cmd", () => {
  const calls = [];
  const result = npmSbom("C:\\repo", {
    platform: "win32",
    env: { ComSpec: "C:\\Windows\\System32\\cmd.exe" },
    spawn: (command, args, options) => {
      calls.push([command, args, options.cwd]);
      return {
        status: 0,
        stdout: JSON.stringify(minimalNpmSbom),
        stderr: "",
      };
    },
  });

  assert.equal(result.spdxVersion, "SPDX-2.3");
  assert.deepEqual(calls, [
    [
      "C:\\Windows\\System32\\cmd.exe",
      [
        "/d",
        "/s",
        "/c",
        "npm.cmd",
        "sbom",
        "--package-lock-only",
        "--sbom-format=spdx",
        "--sbom-type=application",
      ],
      "C:\\repo",
    ],
  ]);
});

test("generateReleaseSbom rejects required artifact mode without installable files", async () => {
  const root = mkdtempRoot("jobsentinel-release-sbom-empty-");
  mkdirSync(join(root, "src-tauri"), { recursive: true });
  mkdirSync(join(root, "release-assets/public"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "jobsentinel", version: "9.9.9" }));
  writeFileSync(join(root, "src-tauri/Cargo.toml"), '[package]\nname = "jobsentinel"\nversion.workspace = true\n');
  writeFileSync(join(root, "Cargo.toml"), '[workspace.package]\nversion = "9.9.9"\n');
  writeFileSync(join(root, "Cargo.lock"), "");

  await assert.rejects(
    generateReleaseSbom({
      root,
      outDir: "release-assets/public",
      platform: "macos",
      version: "9.9.9",
      requireArtifacts: true,
      npmDocument: minimalNpmSbom,
    }),
    /requires at least one installable release artifact/,
  );
});

function mkdtempRoot(prefix) {
  const root = join(tmpdir(), `${prefix}${process.pid}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(root, { recursive: true });
  return root;
}
