// Exercises update sidecar production, explicit compatibility and secret-safe file failures.
import assert from "node:assert/strict";
import { createPrivateKey, createPublicKey, verify, createHash } from "node:crypto";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { main } from "../../release/sign-update-candidate.mjs";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createUpdateManifest } from "../../release/update-candidate-metadata.mjs";

const script = fileURLToPath(new URL("../../release/sign-update-candidate.mjs", import.meta.url));
const key = createPrivateKey({key:Buffer.concat([Buffer.from("302e020100300506032b657004220420","hex"),Buffer.alloc(32,41)]),format:"der",type:"pkcs8"});
const privateKey = key.export({format:"der",type:"pkcs8"}).toString("base64");
const publicKey = createPublicKey(key), publicHex = publicKey.export({format:"der",type:"spki"}).subarray(-32).toString("hex");
function spec() {
  return {version:[3,1,0],minimum_source:[3,0,0],maximum_source:[3,0,0],
    edition:{schema:"jobsentinel.v3.edition-manifest.v1",edition:"essentials",profile:"lighter",artifact_version:"3.1.0",platform:"macos",architecture:"aarch64",compatibility_line:3,rollback_supported:true,default_components:["deterministic_matching"],automatic_model_downloads:false},
    compatibility:{schema:"jobsentinel.v3.compatibility.v1",app_version:"3.1.0",compatibility_line:3,database_schema:3,
      backup:{kind:"backup",format_version:1,contains_secrets:false,protection:"encrypted",user_review_required:true},
      export:{kind:"export",format_version:1,contains_secrets:false,protection:"reviewed_plaintext",user_review_required:true},vector_backend:"sqlite_blob_v1"},
    readers:Object.fromEntries(["database","migration","pack","model","browser","region","backup","export"].map(name => [name,{min:1,max:3}]))};
}
const info = {publisherKeyId:"release-test",packageBytes:7,packageSha256:createHash("sha256").update("package").digest("hex"),extension:".pkg"};
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(),"jobsentinel-update-signing-"));
  t.after(() => rmSync(root,{recursive:true,force:true}));
  const pkg = join(root,"candidate.pkg"), metadata = join(root,"spec.json");
  writeFileSync(pkg,"package"); writeFileSync(metadata,JSON.stringify(spec()));
  const args = ["--package",pkg,"--metadata",metadata,"--publisher-key-id","release-test","--expected-public-key-hex",publicHex,"--key-env","FIXTURE_UPDATE_KEY"];
  const run = (extra = [], keyValue = privateKey) => spawnSync(process.execPath,[script,...args,...extra],{env:{...process.env,FIXTURE_UPDATE_KEY:keyValue},encoding:"utf8"});
  return {root,pkg,metadata,run,args};
}

test("producer signs exact adjacent bytes with update context and preserves overwrite targets", t => {
  const {pkg,run} = fixture(t);
  const result = run(); assert.equal(result.status,0,result.stderr);
  const bytes = readFileSync(`${pkg}.manifest.json`), signature = readFileSync(`${pkg}.sig`,"utf8");
  assert.equal(JSON.parse(bytes).package_sha256,info.packageSha256);
  assert.match(signature,/^[a-f0-9]{128}$/);
  assert(verify(null,Buffer.concat([Buffer.from("jobsentinel.update-candidate.v1\0"),bytes]),publicKey,Buffer.from(signature,"hex")));
  assert.equal(run().status,1); assert.deepEqual(readFileSync(`${pkg}.manifest.json`),bytes);
});

test("pair failure leaves existing signature intact and removes only newly created manifest", t => {
  const {pkg,run} = fixture(t); writeFileSync(`${pkg}.sig`,"preserve");
  assert.equal(run().status,1); assert.equal(existsSync(`${pkg}.manifest.json`),false);
  assert.equal(readFileSync(`${pkg}.sig`,"utf8"),"preserve");
});

test("CLI refuses identity mismatch and never prints key, spec or package data", t => {
  const {pkg,args} = fixture(t); args[args.indexOf(publicHex)] = "00".repeat(32);
  const result = spawnSync(process.execPath,[script,...args],{env:{...process.env,FIXTURE_UPDATE_KEY:privateKey},encoding:"utf8"});
  assert.equal(result.status,1); assert.equal(result.stderr,"Update candidate signing failed.\n");
  assert.equal(result.stdout,""); assert(!result.stderr.includes(privateKey)); assert(!existsSync(`${pkg}.sig`));
});

test("CLI refuses symlink inputs and existing output symlinks", {skip:process.platform === "win32"}, t => {
  const {root,pkg,run} = fixture(t), target = join(root,"preserved"); writeFileSync(target,"original");
  symlinkSync(target,`${pkg}.manifest.json`);
  assert.equal(run().status,1); assert.equal(readFileSync(target,"utf8"),"original");
  rmSync(`${pkg}.manifest.json`); rmSync(pkg); symlinkSync(target,pkg);
  assert.equal(run().status,1); assert(!existsSync(`${pkg}.manifest.json`));
});

test("metadata validates actual v3 reader boundaries without current-writer ceilings", () => {
  assert.doesNotThrow(() => createUpdateManifest(spec(),info));
  for (const mutate of [s=>s.version[1]=1.5,s=>s.minimum_source=[4,0,0],s=>s.maximum_source=[3,0,-1],
    s=>s.edition.platform="other",s=>s.edition.architecture="universal",s=>s.edition.profile="balanced",
    s=>s.compatibility.app_version="3.2.0",s=>s.readers.database.max=2,s=>s.readers.backup.min=2,
    s=>s.compatibility.backup.contains_secrets=true,s=>s.compatibility.export.protection="encrypted",
    s=>s.readers.pack.min=0,s=>s.readers.migration.max=Number.MAX_SAFE_INTEGER+1,s=>s.extra=true]) {
    const value = spec(); mutate(value); assert.throws(()=>createUpdateManifest(value,info));
  }
  assert.throws(()=>createUpdateManifest(spec(),{...info,extension:".exe"}));
  assert.throws(()=>createUpdateManifest(spec(),{...info,packageBytes:512*1024*1024+1}));
  const large=spec();large.compatibility.extensions={note:"x".repeat(65536)};
  assert.throws(()=>createUpdateManifest(large,info));
});

test("failed pair cleanup preserves a concurrently replaced output", t => {
  const {pkg,args} = fixture(t), write = fs.writeFileSync;
  let writes = 0;
  t.mock.method(fs,"writeFileSync", (...parameters) => {
    writes++;
    if (writes === 2) {
      fs.unlinkSync(`${pkg}.manifest.json`);
      write(`${pkg}.manifest.json`,"replacement owner");
      throw new Error("synthetic write failure");
    }
    return write(...parameters);
  });
  syncBuiltinESMExports();
  try {
    assert.throws(()=>main({args,environment:{FIXTURE_UPDATE_KEY:privateKey}}));
  } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(readFileSync(`${pkg}.manifest.json`,"utf8"),"replacement owner");
  assert(!existsSync(`${pkg}.sig`));
});

test("package mutation during output creation refuses the pair", t => {
  const {pkg,args} = fixture(t), write = fs.writeFileSync;
  t.mock.method(fs,"writeFileSync", (...parameters) => {
    const result = write(...parameters);
    write(pkg,"modified installer");
    return result;
  });
  syncBuiltinESMExports();
  try {
    assert.throws(()=>main({args,environment:{FIXTURE_UPDATE_KEY:privateKey}}), /Package changed/);
  } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert(!existsSync(`${pkg}.manifest.json`)); assert(!existsSync(`${pkg}.sig`));
  assert.equal(readFileSync(pkg,"utf8"),"modified installer");
});
