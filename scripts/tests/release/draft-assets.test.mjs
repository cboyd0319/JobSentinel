// Proves on local HTTP servers that draft asset mutations re-check the guard, then delete and upload only by id.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { assetName, deleteStaleAssets, parseDraftAssetArgs, staleAssetNames, uploadAssets } from "../../release/draft-assets.mjs";
import { publicReleaseAssetSpecs } from "../../release/verify-public-release-assets.mjs";

const tagCommit = "a".repeat(40);
const target = { repo: "o/r", releaseId: 101, tag: "v3.0.0", tagCommit };

function listen(handler) {
  const requests = [];
  const server = createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      requests.push({ method: request.method, url: request.url, authorization: request.headers.authorization, body: Buffer.concat(chunks).toString() });
      handler(request, response);
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, requests, origin: `http://127.0.0.1:${server.address().port}` })));
}

/** api.github.com and uploads.github.com on separate local servers; `release` is what the API reports. */
async function withGitHub(release, run) {
  const json = (response, status, value) => response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(value));
  const api = await listen((request, response) => {
    if (request.method === "GET" && request.url === "/repos/o/r/releases/101") json(response, 200, release);
    else if (request.method === "GET" && request.url === "/repos/o/r/commits/v3.0.0") json(response, 200, { sha: tagCommit });
    else if (request.method === "DELETE" && request.url.startsWith("/repos/o/r/releases/assets/")) response.writeHead(204).end();
    else json(response, 404, {});
  });
  const uploads = await listen((request, response) => json(response, 201, { name: new URL(request.url, "http://x").searchParams.get("name") }));
  const hosts = { "https://api.github.com/": `${api.origin}/`, "https://uploads.github.com/": `${uploads.origin}/` };
  const fetchImpl = (url, init) => {
    const host = Object.keys(hosts).find((prefix) => url.startsWith(prefix));
    assert(host, `unexpected host for ${url}`);
    return fetch(hosts[host] + url.slice(host.length), init);
  };
  try {
    await run({ api, uploads, fetchImpl });
  } finally {
    api.server.close();
    uploads.server.close();
  }
}

const draft = (names) => ({ id: 101, tag_name: "v3.0.0", draft: true, assets: names.map((name, index) => ({ id: index + 1, name })) });
const files = new Map([["dist/new.msi", "msi bytes"], ["dist/new.msi.sha256", "sum"]]);
const readFile = (path) => Buffer.from(files.get(path.replaceAll("\\", "/")) ?? "");
const quiet = (run) => async () => {
  const log = console.log;
  console.log = () => {};
  try {
    await run();
  } finally {
    console.log = log;
  }
};

test("stale-asset selection equals the jq and PowerShell filters it replaced", () => {
  const release = draft([
    "a.AppImage", "a.AppImage.sha256", "a.deb", "a.deb.sha256", "a.appimage", "a.deb.sig",
    "a.dmg", "a.dmg.sha256", "a.DMG",
    "a.msi", "a.MSI", "a.exe.sha256", "a.exe.sig",
    "JobSentinel-3.0.0-agent-skills.zip", "JobSentinel-3.0.0-release-platforms.json",
  ]);
  assert.deepEqual(staleAssetNames(release, "linux"), ["a.AppImage", "a.AppImage.sha256", "a.deb", "a.deb.sha256"]);
  assert.deepEqual(staleAssetNames(release, "macos"), ["a.dmg", "a.dmg.sha256"]);
  assert.deepEqual(staleAssetNames(release, "windows"), ["a.msi", "a.MSI", "a.exe.sha256"]);
  assert.throws(() => staleAssetNames(release, "all"), /Unsupported release platform/);
});

test("stale-asset selection follows every verified installer extension and nothing else", () => {
  const all = Object.entries(publicReleaseAssetSpecs).flatMap(([platform, specs]) =>
    specs.flatMap(({ extension }) => [`a${extension}`, `a${extension}.sha256`].map((name) => ({ platform, name }))),
  );
  const release = draft([...all.map(({ name }) => name), "a.sig", "a.sha256"]);
  for (const platform of Object.keys(publicReleaseAssetSpecs)) {
    assert.deepEqual(staleAssetNames(release, platform), all.filter((item) => item.platform === platform).map(({ name }) => name), platform);
  }
  assert.throws(() => staleAssetNames(release, "toString"), /Unsupported release platform/);
});

test("asset names come from Windows and POSIX paths", () => {
  assert.equal(assetName("release-assets\\public\\JobSentinel_3.0.0_x64_en-US_unsigned.msi"), "JobSentinel_3.0.0_x64_en-US_unsigned.msi");
  assert.equal(assetName("D:/a/JobSentinel/release-assets/public/setup.exe.sha256"), "setup.exe.sha256");
  assert.equal(assetName("release-assets/public/JobSentinel_3.0.0_amd64.deb"), "JobSentinel_3.0.0_amd64.deb");
});

test("delete-stale re-checks the draft, then deletes only the platform's assets by id", quiet(async () => {
  await withGitHub(draft(["a.deb", "a.deb.sha256", "a.msi"]), async ({ api, uploads, fetchImpl }) => {
    assert.deepEqual(await deleteStaleAssets({ ...target, platform: "linux" }, { fetchImpl, token: "secret" }), ["a.deb", "a.deb.sha256"]);
    assert.deepEqual(api.requests.map(({ method, url }) => `${method} ${url}`), [
      "GET /repos/o/r/releases/101",
      "GET /repos/o/r/commits/v3.0.0",
      "DELETE /repos/o/r/releases/assets/1",
      "DELETE /repos/o/r/releases/assets/2",
    ]);
    assert(api.requests.every((request) => request.authorization === "Bearer secret"));
    assert.equal(uploads.requests.length, 0);
  });
}));

test("upload re-checks the draft, replaces same-name assets by id and uploads by release id", quiet(async () => {
  await withGitHub(draft(["new.msi", "keep.deb"]), async ({ api, uploads, fetchImpl }) => {
    const names = await uploadAssets({ ...target, files: ["dist\\new.msi", "dist/new.msi.sha256"] }, { fetchImpl, token: "secret", readFile });
    assert.deepEqual(names, ["new.msi", "new.msi.sha256"]);
    assert.deepEqual(api.requests.map(({ method, url }) => `${method} ${url}`), [
      "GET /repos/o/r/releases/101",
      "GET /repos/o/r/commits/v3.0.0",
      "DELETE /repos/o/r/releases/assets/1",
    ]);
    assert.deepEqual(uploads.requests, [
      { method: "POST", url: "/repos/o/r/releases/101/assets?name=new.msi", authorization: "Bearer secret", body: "msi bytes" },
      { method: "POST", url: "/repos/o/r/releases/101/assets?name=new.msi.sha256", authorization: "Bearer secret", body: "sum" },
    ]);
  });
}));

test("a failed guard performs no mutation", async () => {
  const cases = [
    [{ ...draft(["a.deb"]), draft: false }, /no longer a draft/],
    [{ ...draft(["a.deb"]), tag_name: "v2.9.5" }, /no longer belongs to tag v3\.0\.0/],
  ];
  for (const [release, message] of cases) {
    await withGitHub(release, async ({ api, uploads, fetchImpl }) => {
      await assert.rejects(deleteStaleAssets({ ...target, platform: "linux" }, { fetchImpl, token: "secret" }), message);
      await assert.rejects(uploadAssets({ ...target, files: ["dist/new.msi"] }, { fetchImpl, token: "secret", readFile }), message);
      assert(api.requests.every((request) => request.method === "GET"));
      assert.equal(uploads.requests.length, 0);
    });
  }
  await withGitHub(draft(["a.deb"]), async ({ api, uploads, fetchImpl }) => {
    await assert.rejects(uploadAssets({ ...target, tagCommit: "b".repeat(40), files: ["dist/new.msi"] }, { fetchImpl, token: "secret", readFile }), /moved after verification/);
    await assert.rejects(uploadAssets({ ...target, files: ["dist/empty.bin"] }, { fetchImpl, token: "secret", readFile }), /empty/);
    await assert.rejects(uploadAssets({ ...target, files: ["dist/new.msi", "dist\\new.msi"] }, { fetchImpl, token: "secret", readFile }), /unique/);
    assert(api.requests.every((request) => request.method === "GET"));
    assert.equal(uploads.requests.length, 0);
  });
});

test("draft asset arguments name the command, target and files", () => {
  const base = ["--repo", "o/r", "--release-id", "101", "--tag", "v3.0.0", "--tag-commit", tagCommit];
  assert.deepEqual(parseDraftAssetArgs(["upload", ...base, "--", "a.msi", "--b"]).files, ["a.msi", "--b"]);
  assert.equal(parseDraftAssetArgs(["delete-stale", "--platform", "macos", ...base]).platform, "macos");
  assert.throws(() => parseDraftAssetArgs(["delete-stale", ...base]), /Usage:/);
  assert.throws(() => parseDraftAssetArgs(["publish", ...base]), /Usage:/);
});
