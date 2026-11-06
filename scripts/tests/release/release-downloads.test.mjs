// Exercises the public verifier's complete download and checksum path without credentials or network.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildSkillsTarGz, buildSkillsZip } from "../../release/package-agent-skills.mjs";
import { parseArgs, verifyPublicReleaseAssets } from "../../release/verify-public-release-assets.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
test("public verification downloads scoped assets anonymously and rejects changed installer bytes", async t => {
  const prefix = "JobSentinel-3.0.0-agent-skills";
  const files = new Map([
    [`${prefix}.tar.gz`, buildSkillsTarGz(root, prefix)],
    [`${prefix}.zip`, buildSkillsZip(root, prefix)],
    ["JobSentinel-3.0.0-universal.dmg", Buffer.from("installer bytes")],
  ]);
  for (const [name, bytes] of [...files]) files.set(`${name}.sha256`, Buffer.from(`${hash(bytes)}  ${name}\n`));
  const repo = "owner/project", tag = "v3.0.0";
  const assets = [...files.keys()].map((name, i) => ({id:i + 1, name,
    browser_download_url:`https://github.com/${repo}/releases/download/${tag}/${name}`}));
  const release = { draft:false, tag_name:tag, assets };
  let downloads = 0;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(init.headers.Authorization, undefined);
    assert.equal(init.redirect, "manual");
    if (url === `https://api.github.com/repos/${repo}/releases/tags/${tag}`) return Response.json(release);
    const asset = assets.find(asset => asset.browser_download_url === url);
    assert(asset, `Unexpected request: ${url}`);
    downloads++;
    return new Response(files.get(asset.name));
  });
  const options = parseArgs(["--repo",repo,"--tag",tag,"--platforms","macos","--unauthenticated","--no-require-supply-chain"]);
  await verifyPublicReleaseAssets(options);
  assert.equal(downloads, 6);
  files.set("JobSentinel-3.0.0-universal.dmg", Buffer.from("changed bytes"));
  await assert.rejects(verifyPublicReleaseAssets(options), /checksum mismatch/);
});
