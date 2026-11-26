// Proves on real local HTTP servers that release downloads never forward GitHub credentials across origins.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { downloadDraftAsset, downloadPublicAsset, fetchGitHubJson, uploadReleaseAsset } from "../../release/public-assets/http.mjs";

function listen(handler) {
  const requests = [];
  const server = createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks).toString();
      requests.push({ url: request.url, authorization: request.headers.authorization, ...(body ? { method: request.method, type: request.headers["content-type"], body } : {}) });
      handler(request, response);
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, requests, origin: `http://127.0.0.1:${server.address().port}` })));
}

/** Two origins: A plays api.github.com, uploads.github.com and github.com, B plays the storage host. */
async function withServers(run) {
  const storage = await listen((request, response) => response.end(`stored ${request.url}`));
  const api = await listen((request, response) => {
    if (request.url.startsWith("/repos/o/r/releases/101/assets?name=")) {
      const name = new URL(request.url, "http://x").searchParams.get("name");
      response.writeHead(201, { "content-type": "application/json" }).end(JSON.stringify({ name: name === "renamed.bin" ? "default.bin" : name }));
    } else if (request.url.startsWith("/repos/o/r/releases/202/assets")) {
      response.writeHead(307, { location: `${storage.origin}/upload` }).end();
    } else if (request.url === "/json-redirect") {
      response.writeHead(302, { location: `${storage.origin}/json` }).end();
    } else if (request.url === "/insecure") {
      response.writeHead(302, { location: `${storage.origin}/blob` }).end();
    } else if (request.url === "/repos/o/r/releases/assets/9" || request.url.endsWith("/foreign")) {
      response.writeHead(302, { location: "https://evil.example.test/blob" }).end();
    } else if (request.url.endsWith("/plain-http")) {
      response.writeHead(302, { location: `${storage.origin}/public` }).end();
    } else if (request.url.startsWith("/repos/")) {
      response.writeHead(302, { location: "https://objects.githubusercontent.com/blob" }).end();
    } else {
      response.writeHead(302, { location: "https://release-assets.githubusercontent.com/public" }).end();
    }
  });
  const hosts = {
    "https://api.github.com": api.origin,
    "https://github.com": api.origin,
    "https://uploads.github.com": api.origin,
    "https://objects.githubusercontent.com": storage.origin,
    "https://release-assets.githubusercontent.com": storage.origin,
    "https://evil.example.test": storage.origin,
  };
  const fetchImpl = (url, init) => {
    const host = Object.keys(hosts).find((prefix) => url.startsWith(`${prefix}/`));
    return fetch(host ? hosts[host] + url.slice(host.length) : url, init);
  };
  const dir = mkdtempSync(join(tmpdir(), "jobsentinel-http-"));
  try {
    await run({ api, storage, fetchImpl, dir });
  } finally {
    api.server.close();
    storage.server.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

test("draft downloads send the token only to the API and follow the redirect without it", async () => {
  await withServers(async ({ api, storage, fetchImpl, dir }) => {
    const destination = join(dir, "asset");
    await downloadDraftAsset({ name: "asset", url: "https://api.github.com/repos/o/r/releases/assets/1" }, destination, { fetchImpl, token: "secret" });
    assert.equal(readFileSync(destination, "utf8"), "stored /blob");
    assert.deepEqual(api.requests, [{ url: "/repos/o/r/releases/assets/1", authorization: "Bearer secret" }]);
    assert.deepEqual(storage.requests, [{ url: "/blob", authorization: undefined }]);
  });
});

test("draft downloads refuse a non-HTTPS redirect", async () => {
  await withServers(async ({ storage, fetchImpl, dir }) => {
    await assert.rejects(
      downloadDraftAsset({ name: "asset", url: "https://api.github.com/insecure" }, join(dir, "asset"), { fetchImpl, token: "secret" }),
      /redirected to a non-HTTPS location/,
    );
    assert.equal(storage.requests.length, 0);
  });
});

test("public downloads never carry credentials, even with an ambient token", async () => {
  const previous = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = "ambient";
  try {
    await withServers(async ({ api, storage, fetchImpl, dir }) => {
      const destination = join(dir, "asset");
      await downloadPublicAsset("https://github.com/o/r/releases/download/v3.0.0/asset", destination, { fetchImpl });
      assert.equal(readFileSync(destination, "utf8"), "stored /public");
      for (const request of [...api.requests, ...storage.requests]) assert.equal(request.authorization, undefined);
      assert.equal(storage.requests.length, 1);
    });
  } finally {
    if (previous === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previous;
  }
});

test("asset downloads follow redirects only to HTTPS GitHub asset storage", async () => {
  await withServers(async ({ storage, fetchImpl, dir }) => {
    const draft = { name: "asset", url: "https://api.github.com/repos/o/r/releases/assets/9" };
    await assert.rejects(downloadDraftAsset(draft, join(dir, "a"), { fetchImpl, token: "secret" }), /outside GitHub asset storage/);
    const base = "https://github.com/o/r/releases/download/v3.0.0";
    await assert.rejects(downloadPublicAsset(`${base}/foreign`, join(dir, "b"), { fetchImpl }), /outside GitHub asset storage/);
    await assert.rejects(downloadPublicAsset(`${base}/plain-http`, join(dir, "c"), { fetchImpl }), /non-HTTPS location/);
    assert.equal(storage.requests.length, 0);
  });
});

test("credentialed requests refuse dot segments that would leave the repository path", async () => {
  const fetchImpl = () => assert.fail("must not send a request");
  for (const url of ["https://api.github.com/repos/o/../evil/releases", "https://api.github.com/repos/o/%2E%2e/releases"]) {
    await assert.rejects(fetchGitHubJson(url, { fetchImpl, token: "secret" }), /dot segments/);
  }
  await assert.rejects(downloadDraftAsset({ name: "a", url: "https://api.github.com/repos/o/r/releases/assets/../1" }, "unused", { fetchImpl, token: "secret" }), /dot segments/);
  await assert.rejects(uploadReleaseAsset({ repo: "o/..", releaseId: 1, name: "a", bytes: Buffer.from("x") }, { fetchImpl, token: "secret" }), /dot segments/);
});

test("credentialed requests refuse paths that URL parsing rewrites through backslashes or tabs", async () => {
  const fetchImpl = () => assert.fail("must not send a request");
  for (const repo of ["o/r\\..\\..\\x", "o/r/.\t./x"]) {
    await assert.rejects(fetchGitHubJson(`https://api.github.com/repos/${repo}/releases`, { fetchImpl, token: "secret" }), /URL parsing rewrites/);
    await assert.rejects(downloadDraftAsset({ name: "a", url: `https://api.github.com/repos/${repo}/releases/assets/1` }, "unused", { fetchImpl, token: "secret" }), /URL parsing rewrites/);
  }
});

/** Answers each request with a redirect until `hops` redirects were sent, then with the asset bytes. */
function redirectChain(hops, location = (index) => `https://objects.githubusercontent.com/hop${index}`) {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    return urls.length <= hops ? new Response(null, { status: 302, headers: { location: location(urls.length) } }) : new Response("bytes");
  };
  return { urls, fetchImpl };
}

test("asset downloads follow at most five redirects", async () => {
  const dir = mkdtempSync(join(tmpdir(), "jobsentinel-http-hops-"));
  try {
    const five = redirectChain(5);
    await downloadPublicAsset("https://github.com/o/r/releases/download/v3.0.0/a", join(dir, "a"), { fetchImpl: five.fetchImpl });
    assert.equal(readFileSync(join(dir, "a"), "utf8"), "bytes");
    assert.equal(five.urls.length, 6);
    const six = redirectChain(6);
    await assert.rejects(downloadPublicAsset("https://github.com/o/r/releases/download/v3.0.0/a", join(dir, "b"), { fetchImpl: six.fetchImpl }), /exceeded 5 redirects/);
    assert.equal(six.urls.length, 6);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("asset downloads refuse redirects that carry userinfo, a port or a fragment", async () => {
  const dir = mkdtempSync(join(tmpdir(), "jobsentinel-http-redirect-"));
  try {
    await refusesUnsafeRedirects(join(dir, "asset"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

async function refusesUnsafeRedirects(destination) {
  for (const target of [
    // Userinfo is joined at runtime so secret scanners do not read this placeholder as a credential URI.
    `https://${["user", "pass"].join(":")}@objects.githubusercontent.com/blob`,
    "https://user@objects.githubusercontent.com/blob",
    "https://objects.githubusercontent.com:8443/blob",
    "https://objects.githubusercontent.com/blob#frag",
  ]) {
    const chain = redirectChain(1, () => target);
    await assert.rejects(downloadPublicAsset("https://github.com/o/r/releases/download/v3.0.0/a", destination, { fetchImpl: chain.fetchImpl }), /outside GitHub asset storage/, target);
    assert.equal(chain.urls.length, 1, target);
    const draft = redirectChain(1, () => target);
    await assert.rejects(downloadDraftAsset({ name: "a", url: "https://api.github.com/repos/o/r/releases/assets/1" }, destination, { fetchImpl: draft.fetchImpl, token: "secret" }), /outside GitHub asset storage/, target);
    assert.equal(draft.urls.length, 1, target);
  }
}

test("API JSON requests refuse to follow a redirect with the token", async () => {
  await withServers(async ({ storage, fetchImpl }) => {
    await assert.rejects(fetchGitHubJson("https://api.github.com/json-redirect", { fetchImpl, token: "secret" }));
    assert.deepEqual(storage.requests, []);
  });
});

test("uploads send the token only to the id-scoped upload URL and refuse redirects", async () => {
  await withServers(async ({ api, storage, fetchImpl }) => {
    const asset = await uploadReleaseAsset({ repo: "o/r", releaseId: 101, name: "JobSentinel 3.0.0.msi", bytes: Buffer.from("bytes") }, { fetchImpl, token: "secret" });
    assert.equal(asset.name, "JobSentinel 3.0.0.msi");
    assert.deepEqual(api.requests, [
      { url: "/repos/o/r/releases/101/assets?name=JobSentinel%203.0.0.msi", authorization: "Bearer secret", method: "POST", type: "application/octet-stream", body: "bytes" },
    ]);
    await assert.rejects(uploadReleaseAsset({ repo: "o/r", releaseId: 202, name: "a.bin", bytes: Buffer.from("x") }, { fetchImpl, token: "secret" }));
    await assert.rejects(
      uploadReleaseAsset({ repo: "o/r", releaseId: 101, name: "renamed.bin", bytes: Buffer.from("x") }, { fetchImpl, token: "secret" }),
      /renamed\.bin was stored as default\.bin/,
    );
    await assert.rejects(uploadReleaseAsset({ repo: "o/r", releaseId: "../1", name: "a.bin", bytes: Buffer.from("x") }, { fetchImpl, token: "secret" }), /positive release id/);
    assert.equal(storage.requests.length, 0);
  });
});

test("API requests and draft downloads refuse the upload host", async () => {
  const fetchImpl = () => assert.fail("must not send a request");
  await assert.rejects(fetchGitHubJson("https://uploads.github.com/repos/o/r/releases/1/assets", { fetchImpl, token: "secret" }), /outside https:\/\/api\.github\.com/);
  await assert.rejects(downloadDraftAsset({ name: "a", url: "https://uploads.github.com/a" }, "unused", { fetchImpl, token: "secret" }), /must use the GitHub API URL/);
});

/** Serves headers and the first body byte, then stalls; the server drops the socket after 2 s so a missing timeout fails. */
async function withStalledBodies(run) {
  const stalled = await listen((request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.write("{");
    setTimeout(() => response.destroy(), 2_000).unref();
  });
  const fetchImpl = (url, init) => fetch(stalled.origin + new URL(url).pathname, init);
  const dir = mkdtempSync(join(tmpdir(), "jobsentinel-http-stall-"));
  try {
    await run({ fetchImpl, dir, deadline: Date.now() + 200 });
  } finally {
    stalled.server.closeAllConnections();
    stalled.server.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const stalledRequests = {
  "API JSON request": ({ fetchImpl, deadline }) => fetchGitHubJson("https://api.github.com/repos/o/r/releases/1", { fetchImpl, token: "secret", deadline }),
  "public download": ({ fetchImpl, dir, deadline }) => downloadPublicAsset("https://github.com/o/r/releases/download/v3.0.0/a", join(dir, "a"), { fetchImpl, deadline }),
  "draft download": ({ fetchImpl, dir, deadline }) =>
    downloadDraftAsset({ name: "a", url: "https://api.github.com/repos/o/r/releases/assets/1" }, join(dir, "a"), { fetchImpl, token: "secret", deadline }),
};

for (const [kind, request] of Object.entries(stalledRequests)) {
  test(`${kind} aborts a stalled body at its timeout`, { timeout: 5_000 }, async () => {
    await withStalledBodies(async (context) => {
      await assert.rejects(request(context), (error) => ["TimeoutError", "AbortError"].includes(error?.name ?? error?.cause?.name));
    });
  });
}

test("requests fail before sending once the deadline has passed", async () => {
  const fetchImpl = () => assert.fail("must not send a request");
  await assert.rejects(fetchGitHubJson("https://api.github.com/x", { fetchImpl, deadline: Date.now() - 1 }), /budget exhausted/);
  await assert.rejects(downloadPublicAsset("https://github.com/x", "unused", { fetchImpl, deadline: Date.now() - 1 }), /budget exhausted/);
});
