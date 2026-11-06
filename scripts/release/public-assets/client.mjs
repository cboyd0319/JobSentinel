// Fetches public assets anonymously or draft assets through scoped GitHub API requests.
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

export function createReleaseClient({ repo, releaseTag, expectedRevision, draft = false,
  token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "", fetch: request = globalThis.fetch }) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) || repo.split("/").some(p => p === "." || p === "..")) {
    throw new Error("Invalid GitHub repository.");
  }
  if (draft && (!releaseTag || !token.trim())) throw new Error("Draft verification requires a tag and token.");
  const api = `https://api.github.com/repos/${repo}/releases`;
  let tag = releaseTag;
  function safeUrl(value) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) {
      throw new Error("Unsafe release URL.");
    }
    return url;
  }
  async function get(value, { authenticated = false, json = false } = {}) {
    let url = safeUrl(value);
    for (let redirects = 0; redirects < 6; redirects++) {
      const headers = { "User-Agent": "JobSentinel-release-verifier",
        Accept: json ? "application/vnd.github+json" : "application/octet-stream" };
      if (authenticated) headers.Authorization = `Bearer ${token.trim()}`;
      const response = await request(url.href, { headers, redirect: "manual" });
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Release redirect lacks a destination.");
        url = safeUrl(new URL(location, url));
        if (json || !["release-assets.githubusercontent.com", "objects.githubusercontent.com"].includes(url.hostname)) {
          throw new Error("Unexpected release redirect host.");
        }
        authenticated = false;
        continue;
      }
      if (!response.ok) throw new Error(`Release request failed: HTTP ${response.status}.`);
      return response;
    }
    throw new Error("Too many release redirects.");
  }
  async function release() {
    const path = tag ? `/tags/${encodeURIComponent(tag)}` : "/latest";
    const result = await (await get(`${api}${path}`, { authenticated: draft, json: true })).json();
    if (result.draft !== draft || (tag && result.tag_name !== tag)) throw new Error("Release state or tag does not match verification mode.");
    if (!/^v\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(result.tag_name)) throw new Error("Invalid release tag.");
    tag = result.tag_name;
    if (expectedRevision) {
      if (!/^[a-f0-9]{40}$/.test(expectedRevision)) throw new Error("Invalid expected source revision.");
      const gitApi = `https://api.github.com/repos/${repo}/git`;
      let object = (await (await get(`${gitApi}/ref/tags/${encodeURIComponent(tag)}`, { authenticated: draft, json: true })).json()).object;
      for (let depth = 0; object?.type === "tag" && depth < 5; depth++) {
        if (!/^[a-f0-9]{40}$/.test(object.sha ?? "")) throw new Error("Invalid annotated tag identity.");
        object = (await (await get(`${gitApi}/tags/${object.sha}`, { authenticated: draft, json: true })).json()).object;
      }
      if (object?.type !== "commit" || object.sha !== expectedRevision) throw new Error("Current release tag does not match the candidate source revision.");
      result.resolved_revision = object.sha;
    }
    return result;
  }
  async function asset(asset) {
    if (draft) {
      if (!Number.isSafeInteger(asset.id) || asset.id < 1 || asset.url !== `${api}/assets/${asset.id}`) {
        throw new Error("Draft asset must use its exact repository API endpoint.");
      }
      return get(asset.url, { authenticated: true });
    }
    const url = safeUrl(asset.browser_download_url);
    if (!tag || url.origin !== "https://github.com" || url.search ||
      url.pathname !== `/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(asset.name)}`) {
      throw new Error("Public asset must use its exact repository download URL.");
    }
    return get(url.href);
  }
  return { release, asset, async download(assetInfo, destination) {
    const response = await asset(assetInfo);
    if (!response.body) throw new Error("Release asset has no content.");
    await pipeline(response.body, createWriteStream(destination));
  } };
}
