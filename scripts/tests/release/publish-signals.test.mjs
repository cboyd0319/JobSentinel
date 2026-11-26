// Proves on a spawned publisher and a local HTTP server that cancellation signals re-draft only after the publish PATCH.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import test from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const releaseDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../release");
const moduleUrl = (path) => JSON.stringify(pathToFileURL(join(releaseDir, path)).href);

/** The child installs the real signal handler, then publishes; its verifier never finishes or runs a slow `gh`. */
const childSource = `
import { publishVerifiedRelease, redraftOnCancel } from ${moduleUrl("publish-release.mjs")};
import { parseArgs } from ${moduleUrl("public-assets/options.mjs")};
import { verifyGitHubAttestation } from ${moduleUrl("verify-latest-macos-release.mjs")};
const fetchImpl = (url, init) => fetch(url.replace("https://api.github.com", process.env.API_ORIGIN), init);
const publication = { patchAttempted: false };
redraftOnCancel({ repo: "o/r", releaseId: 101, publication, fetchImpl, token: "secret", delaysMs: [50] });
setInterval(() => {}, 1_000);
console.log("ready");
const verify = process.env.MODE === "attest"
  ? (_options, { deadline }) => verifyGitHubAttestation({ artifactPath: "a.zip", repo: "o/r", predicateType: "p", sourceDigest: "a".repeat(40), sourceRef: "refs/tags/v3.0.0", deadline })
  : () => new Promise(() => {});
if (process.env.MODE !== "idle") {
  const options = parseArgs(["--repo", "o/r", "--tag", "v3.0.0", "--evidence-revision", "e".repeat(40)]);
  await publishVerifiedRelease({ options, releaseId: 101, name: "JobSentinel 3.0.0", body: "notes" }, { fetchImpl, token: "secret", publication, verify });
}
`;

/** A `gh` that answers the flag probe, then records its pid and sleeps through verification. */
const slowGh = '#!/bin/sh\ncase "$*" in *--help*) echo "--source-digest --source-ref"; exit 0;; esac\necho $$ > "$GH_MARKER"\nexec sleep 30\n';

async function runChild({ mode, redraftStatuses = [200], publishDelayMs = 0, signals }) {
  const events = [];
  let published;
  const publishReceived = new Promise((resolvePublish) => (published = resolvePublish));
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", async () => {
      const sent = JSON.parse(body || "{}");
      const { draft } = sent;
      events.push(draft === false ? "publish" : "redraft");
      if (draft === false) {
        published();
        await sleep(publishDelayMs);
        events.push("publish settled");
      }
      const status = draft === true ? (redraftStatuses.length > 1 ? redraftStatuses.shift() : redraftStatuses[0]) : 200;
      response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(sent));
    });
  });
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const dir = mkdtempSync(join(tmpdir(), "jobsentinel-publish-signal-"));
  const marker = join(dir, "gh.pid");
  let child;
  let killer;
  try {
    writeFileSync(join(dir, "child.mjs"), childSource);
    writeFileSync(join(dir, "gh"), slowGh);
    chmodSync(join(dir, "gh"), 0o755);
    child = spawn(process.execPath, [join(dir, "child.mjs")], {
      env: { ...process.env, API_ORIGIN: `http://127.0.0.1:${server.address().port}`, MODE: mode, GH_MARKER: marker, PATH: `${dir}${delimiter}${process.env.PATH}` },
      stdio: ["ignore", "pipe", "pipe"],
    });
    // A child that cannot handle signals is killed, so the assertions fail instead of hanging the test run.
    killer = setTimeout(() => child.kill("SIGKILL"), 12_000);
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += chunk));
    const exited = new Promise((resolveExit) => child.on("exit", (code) => resolveExit(code)));
    await new Promise((resolveReady) => child.stdout.on("data", (chunk) => String(chunk).includes("ready") && resolveReady()));
    if (mode !== "idle") await publishReceived;
    while (mode === "attest" && !existsSync(marker)) await sleep(20);
    const signalled = Date.now();
    for (const signal of signals) child.kill(signal);
    return { code: await exited, stderr, events, elapsedMs: Date.now() - signalled };
  } finally {
    clearTimeout(killer);
    child?.kill("SIGKILL");
    if (existsSync(marker)) process.kill(Number(readFileSync(marker, "utf8")), "SIGKILL");
    server.closeAllConnections();
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

test("SIGINT then SIGTERM after the publish PATCH re-drafts once by id and exits non-zero", { timeout: 15_000 }, async () => {
  const { code, stderr, events } = await runChild({ mode: "publish", signals: ["SIGINT", "SIGTERM"] });
  assert.equal(code, 1);
  assert.match(stderr, /SIGINT received after the publish request; release 101 was returned to draft\./);
  assert.deepEqual(events, ["publish", "publish settled", "redraft"]);
});

test("a signal during an in-flight publish PATCH re-drafts only after that request settles", { timeout: 15_000 }, async () => {
  const { code, events } = await runChild({ mode: "publish", publishDelayMs: 1_000, signals: ["SIGINT"] });
  assert.equal(code, 1);
  assert.deepEqual(events, ["publish", "publish settled", "redraft"]);
});

test("a signal during a slow gh attestation call still re-drafts within the grace window", { timeout: 15_000, skip: process.platform === "win32" }, async () => {
  const { code, stderr, events, elapsedMs } = await runChild({ mode: "attest", signals: ["SIGINT"] });
  assert.equal(code, 1);
  assert.match(stderr, /SIGINT received after the publish request; release 101 was returned to draft\./);
  assert.deepEqual(events, ["publish", "publish settled", "redraft"]);
  assert(elapsedMs < 7_000, `re-drafted ${elapsedMs} ms after SIGINT`);
});

test("a cancelled publisher retries a failed re-draft within the grace window", { timeout: 15_000 }, async () => {
  const retried = await runChild({ mode: "publish", redraftStatuses: [502, 200], signals: ["SIGTERM"] });
  assert.equal(retried.code, 1);
  assert.deepEqual(retried.events, ["publish", "publish settled", "redraft", "redraft"]);

  const failed = await runChild({ mode: "publish", redraftStatuses: [404], signals: ["SIGTERM"] });
  assert.equal(failed.code, 1);
  assert.match(failed.stderr, /release 101 could not be returned to draft: .*: 404/);
});

test("a signal before the publish PATCH exits non-zero without any request", { timeout: 15_000 }, async () => {
  const { code, stderr, events } = await runChild({ mode: "idle", signals: ["SIGTERM"] });
  assert.equal(code, 1);
  assert.match(stderr, /SIGTERM received before the publish request; release 101 stays a draft\./);
  assert.deepEqual(events, []);
});

test("the publisher CLI refuses to start without the declared selection", () => {
  const script = fileURLToPath(new URL("../../release/publish-release.mjs", import.meta.url));
  const args = ["--tag", "v3.0.0", "--expected-version", "3.0.0", "--release-id", "101", "--repo", "o/r"];
  const result = spawnSync(process.execPath, [script, ...args], { encoding: "utf8", env: { ...process.env, GITHUB_TOKEN: "", GH_TOKEN: "" } });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage: publish-release\.mjs .*--selection <s>/);
});
