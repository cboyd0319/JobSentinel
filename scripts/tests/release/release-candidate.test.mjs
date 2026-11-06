// Exercises mixed-origin publication, approved-byte binding and mutable GitHub inventory failures.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseArgs as parseMacosArgs, verifyLatestMacosRelease } from "../../release/verify-latest-macos-release.mjs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildSkillsTarGz, buildSkillsZip } from "../../release/package-agent-skills.mjs";
import { parseArgs, verifyPublicReleaseAssets, validatePublicationPlatformScope } from "../../release/verify-public-release-assets.mjs";
import { createReleaseClient } from "../../release/public-assets/client.mjs";
import { verifiedSnapshot } from "../../release/release-snapshot.mjs";

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const sha = "a".repeat(40), repo = "owner/project", tag = "v3.0.0";
const root = fileURLToPath(new URL("../../../", import.meta.url));
function candidate() {
  const prefix = "JobSentinel-3.0.0-agent-skills";
  const files = new Map([[`${prefix}.tar.gz`, buildSkillsTarGz(root, prefix)], [`${prefix}.zip`, buildSkillsZip(root, prefix)]]);
  const installers = { macos:["app_3.0.0_universal.dmg"], windows:["app-3.0.0_unsigned.msi", "app-3.0.0_unsigned.exe"], linux:["app-3.0.0-x.AppImage", "app-3.0.0-x.deb"] };
  for (const names of Object.values(installers)) for (const name of names) files.set(name, Buffer.from(name));
  for (const [name, bytes] of [...files]) files.set(`${name}.sha256`, Buffer.from(`${hash(bytes)}  ${name}\n`));
  for (const [platform, names] of Object.entries(installers)) {
    const sbomName = `JobSentinel-3.0.0-${platform}.sbom.spdx.json`;
    files.set(sbomName, Buffer.from(JSON.stringify({spdxVersion:"SPDX-2.3", SPDXID:"SPDXRef-DOCUMENT", packages:[{name:"test"}]})));
    files.set(`JobSentinel-3.0.0-${platform}.sbom-manifest.json`, Buffer.from(JSON.stringify({schemaVersion:1, version:"3.0.0", platform,
      sbom:{fileName:sbomName, sha256:hash(files.get(sbomName))}, assets:names.map(fileName => ({fileName,kind:"installer",sha256:hash(files.get(fileName))}))})));
  }
  files.set("__proto__", Buffer.from("must be inventoried"));
  const artifacts = Object.fromEntries([...files].map(([name,bytes]) => [name,hash(bytes)]));
  const platforms = ["windows","macos","linux"];
  const phases = ["Stability","Performance","Security"].map((name,i) => {
    const startedAt = `2026-11-0${i+1}T00:00:00Z`, completedAt = `2026-11-0${i+1}T01:00:00Z`;
    return {name,status:"passed",revision:sha,scope:"Full scope",plan:"Full phase plan",startedAt,completedAt,remainingRisks:[],
      decision:{owner:"owner",rationale:"accepted",acceptedAt:completedAt},commands:platforms.map(platform => {
        const evidence = `release-evidence-${name}-${platform}.json`, command = `${name} ${platform}`;
        files.set(evidence, Buffer.from(JSON.stringify({schemaVersion:1,phase:name,revision:sha,artifacts,command,platform,exitCode:0,output:"captured check output",startedAt,completedAt})));
        return {command,platform,exitCode:0,evidence,sha256:hash(files.get(evidence))};
      })};
  });
  const localNames = [installers.macos[0], `${installers.macos[0]}.sha256`, "JobSentinel-3.0.0-macos.sbom-manifest.json", "JobSentinel-3.0.0-macos.sbom.spdx.json"];
  const record = {schemaVersion:1,revision:sha,version:"3.0.0",platforms,artifacts,phases,
    localOrigins:{macos:{revision:sha,sourceClean:true,buildCommand:"npm run tauri:build:macos",buildEnvironment:"macOS",artifacts:Object.fromEntries(localNames.map(n => [n,artifacts[n]])),evidence:"release-evidence-Security-macos.json"}}};
  const refresh = () => files.set("release-evidence-phases.json", Buffer.from(JSON.stringify(record)));
  refresh();
  return {files,record,refresh};
}

test("mixed publication retains hosted proofs, local phases and exact approved snapshot", async t => {
  const {files,record,refresh} = candidate();
  const calls = [];
  t.mock.method(childProcess, "spawnSync", (_,args) => { calls.push(args); return {status:0}; });
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  const assets = [...files.keys()].map((name,i) => ({id:i+1,name,url:`https://api.github.com/repos/${repo}/releases/assets/${i+1}`,browser_download_url:`https://github.com/${repo}/releases/download/${tag}/${name}`}));
  let lookups = 0, drift = false;
  t.mock.method(globalThis,"fetch", async url => {
    if (url.endsWith(`/git/ref/tags/${tag}`)) return Response.json({object:{type:"commit",sha}});
    if (url.endsWith(`/releases/tags/${tag}`)) {
      lookups++;
      return Response.json({id:42,draft:true,tag_name:tag,assets:drift && lookups % 2 === 0 ? [...assets,{id:99,name:"injected"}] : assets});
    }
    const asset = assets.find(a => a.url === url); assert(asset); return new Response(files.get(asset.name));
  });
  const options = {...parseArgs(["--repo",repo,"--tag",tag,"--draft","--local-macos","--require-phases","--expected-revision",sha]),token:"test"};
  const approved = await verifyPublicReleaseAssets(options);
  assert.equal(calls.length,10);
  assert(calls.every(args => !args.includes(`${repo}/.github/workflows/release-build-macos.yml`)));
  assert(calls.every(args => args.includes("--source-digest")));
  await verifyPublicReleaseAssets({...options,expectedSnapshot:approved});
  delete record.localOrigins.macos; refresh();
  await assert.rejects(verifyPublicReleaseAssets(options), /Local macOS origin/);
  Object.assign(record.localOrigins, candidate().record.localOrigins); refresh();
  record.phases[2].decision.rationale = "different accepted record"; refresh();
  await assert.rejects(verifyPublicReleaseAssets({...options,expectedSnapshot:approved}), /changed after approval/);
  drift = true; lookups = 0;
  await assert.rejects(verifyPublicReleaseAssets(options), /inventory changed/);
  drift = false;
  delete record.artifacts.__proto__; refresh();
  await assert.rejects(verifyPublicReleaseAssets(options), /artifact inventory mismatch/);
});

test("publication rejects unselected installers while scoped audits can retain their scope", () => {
  assert.throws(() => validatePublicationPlatformScope({assets:[{name:"app-3.0.0.exe"}]},["linux"]), /outside/);
  assert.throws(() => validatePublicationPlatformScope({assets:[{name:"app-3.0.0.dmg.sha256"}]},["linux"]), /outside/);
  assert.doesNotThrow(() => validatePublicationPlatformScope({assets:[{name:"app-3.0.0.deb"}]},["linux"]));
});

test("current tag dereference accepts annotated tags and rejects moved or cyclic tags", async () => {
  for (const mode of ["annotated","moved","cycle"]) {
    const client = createReleaseClient({repo,releaseTag:tag,expectedRevision:sha,fetch:async url => {
      if (url.includes("/releases/")) return Response.json({draft:false,tag_name:tag,assets:[]});
      if (url.includes("/git/ref/")) return Response.json({object:{type:"tag",sha:"b".repeat(40)}});
      return Response.json({object:{type:mode === "cycle" ? "tag" : "commit",sha:mode === "annotated" ? sha : "b".repeat(40)}});
    }});
    if (mode === "annotated") assert.equal((await client.release()).resolved_revision,sha);
    else await assert.rejects(client.release(), /candidate source revision/);
  }
});

test("approval digest includes proof bytes and every asset identity", () => {
  const release = {id:1,draft:true,tag_name:tag,resolved_revision:sha,assets:[{id:2,name:"__proto__"}]};
  const before = verifiedSnapshot(release,release,new Map([[2,hash("A")]]));
  assert.throws(() => verifiedSnapshot(release,release,new Map([[2,hash("B")]]),before), /changed after approval/);
  assert.throws(() => verifiedSnapshot(release,{...release,assets:[]},new Map()), /inventory changed/);
});

test("native local-origin verification mounts only the previously accepted bytes", async t => {
  const {files,record,refresh} = candidate();
  const assets = [...files.keys()].map((name,i) => ({id:i+1,name,
    browser_download_url:`https://github.com/${repo}/releases/download/${tag}/${name}`}));
  const replacements = new Map(files);
  const dmgName = "app_3.0.0_universal.dmg";
  replacements.set(dmgName, Buffer.from("coherent replacement installer"));
  replacements.set(`${dmgName}.sha256`, Buffer.from(`${hash(replacements.get(dmgName))}  ${dmgName}\n`));
  const manifestName = "JobSentinel-3.0.0-macos.sbom-manifest.json";
  const manifest = JSON.parse(files.get(manifestName));
  manifest.assets[0].sha256 = hash(replacements.get(dmgName));
  replacements.set(manifestName, Buffer.from(JSON.stringify(manifest)));
  const requests = new Map();
  t.mock.method(globalThis,"fetch", async url => {
    if (url.endsWith(`/git/ref/tags/${tag}`)) return Response.json({object:{type:"commit",sha}});
    if (url.endsWith(`/releases/tags/${tag}`)) return Response.json({id:42,draft:false,tag_name:tag,assets});
    const asset = assets.find(a => a.browser_download_url === url); assert(asset);
    const count = (requests.get(asset.id) ?? 0) + 1; requests.set(asset.id,count);
    return new Response((count === 1 ? files : replacements).get(asset.name));
  });
  const options = parseMacosArgs(["--repo",repo,"--tag",tag,"--local-macos","--expected-revision",sha,"--no-require-no-account-label"]);
  let mounts = 0;
  const verifyPackage = async ({dmgPath}) => {
    mounts++;
    for (const [name,digest] of Object.entries(record.localOrigins.macos.artifacts)) {
      assert.equal(hash(await readFile(join(dirname(dmgPath),name))),digest);
    }
  };
  await verifyLatestMacosRelease(options,{verifyPackage});
  assert.equal(mounts,1);
  assert([...requests.values()].every(count => count === 1), "never refetch accepted bytes before mounting");
  requests.clear(); mounts = 0;
  record.localOrigins.macos.artifacts["app_3.0.0_universal.dmg"] = "0".repeat(64); refresh();
  await assert.rejects(verifyLatestMacosRelease(options,{verifyPackage}), /Local macOS origin/);
  assert.equal(mounts,0);
});
