// Separates token-bearing GitHub API requests and id-scoped uploads from credential-free public asset downloads.
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

const userAgent = "JobSentinel-release-verifier";
const apiOrigin = "https://api.github.com/";
const uploadOrigin = "https://uploads.github.com/";
/** Per-request ceilings; every request is aborted at its ceiling or the caller's deadline, including while its body streams. */
const apiTimeoutMs = 30_000;
const downloadTimeoutMs = 10 * 60_000;
const uploadTimeoutMs = 10 * 60_000;
/** GitHub's release asset storage; asset downloads follow redirects only to these hosts. */
const assetStorageHosts = new Set(["release-assets.githubusercontent.com", "objects.githubusercontent.com"]);
const maxAssetRedirects = 5;

/**
 * Rejects dot segments, including encoded ones, and any path URL parsing would rewrite (backslashes, tabs, newlines),
 * so a repo or tag value cannot retarget a credentialed request.
 */
function assertNoDotSegments(url) {
  const path = String(url).replace(/^https:\/\/[^/]+/, "").split(/[?#]/)[0];
  if (path.split("/").some((segment) => /^(?:\.|%2e){1,2}$/i.test(segment))) {
    throw new Error(`Refusing a GitHub request path with dot segments: ${url}`);
  }
  if (!URL.canParse(url) || new URL(url).pathname !== path) {
    throw new Error(`Refusing a GitHub request path that URL parsing rewrites: ${JSON.stringify(String(url))}`);
  }
}

/** The only environment token source; it is sent solely to api.github.com, the id-scoped upload and gh attestation lookups. */
export function envToken(env = process.env) {
  return env.GITHUB_TOKEN || env.GH_TOKEN || "";
}

/** Milliseconds a step may take: `ceilingMs`, cut to what remains before `deadline` (epoch ms). Fails once it has passed. */
export function boundedTimeoutMs(ceilingMs, deadline) {
  if (deadline === undefined) return ceilingMs;
  const remaining = Math.floor(deadline - Date.now());
  if (remaining <= 0) throw new Error("Publication budget exhausted before the next request.");
  return Math.min(ceilingMs, remaining);
}

export function githubReleaseUrl(repo, releaseTag) {
  const base = `https://api.github.com/repos/${repo}/releases`;
  return releaseTag ? `${base}/tags/${encodeURIComponent(releaseTag)}` : `${base}/latest`;
}

/** Resolves a tag (annotated or lightweight) to its full commit SHA. */
export async function fetchTagCommit(repo, tag, options = {}) {
  const commit = await fetchGitHubJson(`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(tag)}`, options);
  if (!/^[0-9a-f]{40}$/.test(String(commit?.sha))) throw new Error(`Could not resolve tag ${tag} to a commit.`);
  return commit.sha;
}

/** Headers for api.github.com reads. The token is optional for public metadata and required for drafts. */
export function githubApiHeaders(token = "", accept = "application/vnd.github+json") {
  const headers = { Accept: accept, "User-Agent": userAgent };
  if (token.trim()) headers.Authorization = `Bearer ${token.trim()}`;
  return headers;
}

/** API JSON request; a 204 returns null. Redirects are errors, so the token is never forwarded to another URL. */
export async function fetchGitHubJson(url, { fetchImpl = fetch, token = "", method = "GET", body, deadline } = {}) {
  if (!url.startsWith(apiOrigin)) throw new Error(`Refusing to send GitHub API credentials outside ${apiOrigin}: ${url}`);
  assertNoDotSegments(url);
  const init = { method, headers: githubApiHeaders(token), redirect: "error", signal: AbortSignal.timeout(boundedTimeoutMs(apiTimeoutMs, deadline)) };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["Content-Type"] = "application/json";
  }
  const response = await fetchImpl(url, init);
  if (!response.ok) {
    throw Object.assign(new Error(`GitHub API request failed for ${url}: ${response.status} ${response.statusText}`), { status: response.status });
  }
  return response.status === 204 ? null : await response.json();
}

/** Uploads one asset to release `releaseId`: the only request that sends the token outside api.github.com. */
export async function uploadReleaseAsset({ repo, releaseId, name, bytes }, { fetchImpl = fetch, token, deadline } = {}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(String(repo)) || !/^[1-9][0-9]*$/.test(String(releaseId))) {
    throw new Error(`Release upload needs owner/repo and a positive release id, found ${repo} and ${releaseId}.`);
  }
  if (!token?.trim()) throw new Error("Release upload requires a GitHub token.");
  const url = `${uploadOrigin}repos/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(name)}`;
  assertNoDotSegments(url);
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { ...githubApiHeaders(token), "Content-Type": "application/octet-stream", "Content-Length": String(bytes.length) },
    body: bytes,
    redirect: "error",
    signal: AbortSignal.timeout(boundedTimeoutMs(uploadTimeoutMs, deadline)),
  });
  if (!response.ok) throw new Error(`Release asset upload failed for ${name}: ${response.status} ${response.statusText}`);
  const asset = await response.json();
  if (asset?.name !== name) throw new Error(`Release asset ${name} was stored as ${asset?.name}.`);
  return asset;
}

async function writeResponse(response, destination, label) {
  if (!response.ok || !response.body) {
    throw new Error(`${label} download failed: ${response.status} ${response.statusText}`);
  }
  await pipeline(response.body, createWriteStream(destination));
}

/** Validates a redirect target: HTTPS on GitHub asset storage, without credentials, port or fragment. */
function assetRedirectUrl(response, from, label) {
  const location = response.headers.get("location") ?? "";
  const url = URL.canParse(location, from) ? new URL(location, from) : undefined;
  if (url?.protocol !== "https:") throw new Error(`${label} redirected to a non-HTTPS location.`);
  if (!assetStorageHosts.has(url.hostname) || url.username || url.password || url.port || url.hash) {
    throw new Error(`${label} redirected outside GitHub asset storage: ${url.hostname}`);
  }
  return url.href;
}

/** Fetches asset bytes without credentials, following only validated redirects to GitHub asset storage. */
async function fetchAnonymousAsset(url, { fetchImpl, signal, label }) {
  let current = url;
  for (let redirects = 0; ; redirects += 1) {
    const response = await fetchImpl(current, {
      headers: { Accept: "application/octet-stream", "User-Agent": userAgent },
      credentials: "omit",
      redirect: "manual",
      signal,
    });
    if (response.status < 300 || response.status >= 400) return response;
    if (redirects === maxAssetRedirects) throw new Error(`${label} exceeded ${maxAssetRedirects} redirects.`);
    current = assetRedirectUrl(response, current, label);
  }
}

/** Downloads a published asset anonymously: no Authorization header and no ambient credentials. */
export async function downloadPublicAsset(url, destination, { fetchImpl = fetch, deadline } = {}) {
  if (!String(url).startsWith("https://")) throw new Error(`Public release asset must use HTTPS: ${url}`);
  const signal = AbortSignal.timeout(boundedTimeoutMs(downloadTimeoutMs, deadline));
  const response = await fetchAnonymousAsset(String(url), { fetchImpl, signal, label: "Public release asset" });
  await writeResponse(response, destination, "Public release asset");
}

/**
 * Downloads a draft asset through the authenticated asset API. Draft assets have no anonymous URL.
 * The token goes only to the API request; redirects are followed manually, without it, to GitHub asset storage.
 */
export async function downloadDraftAsset(asset, destination, { fetchImpl = fetch, token, deadline }) {
  if (!String(asset?.url).startsWith(apiOrigin)) throw new Error(`Draft release asset must use the GitHub API URL: ${asset?.name}`);
  if (!token?.trim()) throw new Error("Draft release verification requires a GitHub token.");
  assertNoDotSegments(asset.url);
  const signal = AbortSignal.timeout(boundedTimeoutMs(downloadTimeoutMs, deadline));
  let response = await fetchImpl(asset.url, { headers: githubApiHeaders(token, "application/octet-stream"), redirect: "manual", signal });
  if (response.status >= 300 && response.status < 400) {
    const label = `Draft release asset ${asset.name}`;
    response = await fetchAnonymousAsset(assetRedirectUrl(response, asset.url, label), { fetchImpl, signal, label });
  }
  await writeResponse(response, destination, "Draft release asset");
}
