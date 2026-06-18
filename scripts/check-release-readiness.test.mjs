import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateReleaseReadiness,
  evaluateReleaseReadinessFromInputs,
  formatReleaseReadinessReport,
  loadReleaseReadinessInputs,
  parseArgs,
} from "./check-release-readiness.mjs";

test("release readiness accepts the current local v2.9.0 gate posture", () => {
  const report = evaluateReleaseReadiness({ env: {} });

  assert.equal(report.expectedVersion, "2.9.0");
  assert.deepEqual(
    report.criteria.filter((item) => !item.ok).map((item) => item.id),
    [],
  );
  assert.match(formatReleaseReadinessReport(report), /JobSentinel release readiness: PASS/);
  assert.match(formatReleaseReadinessReport(report), /INFO Windows: public asset pending/);
  assert.match(formatReleaseReadinessReport(report), /INFO Linux: public assets pending/);
});

test("release readiness rejects version metadata drift", () => {
  const report = evaluateReleaseReadiness({ version: "9.9.9", env: {} });

  assert(
    report.criteria.some(
      (item) => item.id === "release metadata matches expected version" && !item.ok,
    ),
  );
});

test("release readiness rejects Windows upload without signature gate", () => {
  const inputs = loadReleaseReadinessInputs({ env: {} });
  const report = evaluateReleaseReadinessFromInputs({
    ...inputs,
    releaseWorkflow: inputs.releaseWorkflow.replace("Get-AuthenticodeSignature", ""),
  });

  assert(
    report.criteria.some(
      (item) => item.id === "Windows public upload is signature and checksum gated" && !item.ok,
    ),
  );
});

test("release readiness rejects Linux upload without package verification", () => {
  const inputs = loadReleaseReadinessInputs({ env: {} });
  const report = evaluateReleaseReadinessFromInputs({
    ...inputs,
    releaseWorkflow: inputs.releaseWorkflow.replace("dpkg-deb --contents", ""),
  });

  assert(
    report.criteria.some(
      (item) => item.id === "Linux public upload is package and checksum gated" && !item.ok,
    ),
  );
});

test("release readiness rejects release preflight without Node security sensors", () => {
  const inputs = loadReleaseReadinessInputs({ env: {} });
  const report = evaluateReleaseReadinessFromInputs({
    ...inputs,
    releaseWorkflow: inputs.releaseWorkflow.replace("npm run lint:security", ""),
  });

  assert(
    report.criteria.some(
      (item) => item.id === "release preflight blocks security scanners" && !item.ok,
    ),
  );
});

test("release readiness rejects release preflight without workflow static analysis", () => {
  const inputs = loadReleaseReadinessInputs({ env: {} });
  const report = evaluateReleaseReadinessFromInputs({
    ...inputs,
    releaseWorkflow: inputs.releaseWorkflow.replace("zizmorcore/zizmor-action@", ""),
  });

  assert(
    report.criteria.some(
      (item) => item.id === "release preflight blocks security scanners" && !item.ok,
    ),
  );
});

test("release readiness rejects missing Agent Skills archive upload", () => {
  const inputs = loadReleaseReadinessInputs({ env: {} });
  const report = evaluateReleaseReadinessFromInputs({
    ...inputs,
    releaseWorkflow: inputs.releaseWorkflow.replace("package-agent-skills:", ""),
  });

  assert(
    report.criteria.some(
      (item) => item.id === "release workflow publishes downloadable Agent Skills" && !item.ok,
    ),
  );
});

test("release readiness rejects public verifier without Agent Skills checks", () => {
  const inputs = loadReleaseReadinessInputs({ env: {} });
  const report = evaluateReleaseReadinessFromInputs({
    ...inputs,
    verifyPublicScript: inputs.verifyPublicScript.replaceAll("validateAgentSkillsArchiveContents", ""),
  });

  assert(
    report.criteria.some(
      (item) => item.id === "public release verifier covers installers and supply chain" && !item.ok,
    ),
  );
});

test("release readiness rejects Agent Skills packages without ZIP artifact", () => {
  const inputs = loadReleaseReadinessInputs({ env: {} });
  const report = evaluateReleaseReadinessFromInputs({
    ...inputs,
    releaseWorkflow: inputs.releaseWorkflow.replaceAll("agent-skills.zip", "agent-skills.tar.gz"),
  });

  assert(
    report.criteria.some(
      (item) => item.id === "release workflow publishes downloadable Agent Skills" && !item.ok,
    ),
  );
});

test("release readiness rejects Agent Skills docs without Windows ZIP guidance", () => {
  const inputs = loadReleaseReadinessInputs({ env: {} });
  const report = evaluateReleaseReadinessFromInputs({
    ...inputs,
    readme: inputs.readme.replace("Use the ZIP archive on Windows", "Use either archive"),
  });

  assert(
    report.criteria.some(
      (item) => item.id === "Agent Skills download docs stay Windows-portable" && !item.ok,
    ),
  );
});

test("release readiness parses version flags", () => {
  assert.deepEqual(parseArgs(["--version", "v2.9.0"]), { version: "v2.9.0" });
  assert.deepEqual(parseArgs(["--tag=v2.9.0"]), { version: "v2.9.0" });
});
