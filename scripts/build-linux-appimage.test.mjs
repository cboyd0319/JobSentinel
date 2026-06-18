import assert from "node:assert/strict";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  expectedAppImageName,
  findSquashfsOffsets,
  removeRootAppDirDuplicates,
  resolveTauriBundlerCache,
  tauriAppImageToolDownloads,
  verifySha256,
} from "./build-linux-appimage.mjs";

test("expectedAppImageName maps Linux x86_64 to release asset naming", () => {
  assert.equal(
    expectedAppImageName("JobSentinel", "2.9.0", "x86_64-unknown-linux-gnu"),
    "JobSentinel_2.9.0_amd64.AppImage",
  );
});

test("expectedAppImageName rejects unsupported AppImage targets", () => {
  assert.throws(
    () => expectedAppImageName("JobSentinel", "2.9.0", "aarch64-unknown-linux-gnu"),
    /Unsupported Linux AppImage target/,
  );
});

test("findSquashfsOffsets returns all squashfs magic offsets", () => {
  const buffer = Buffer.concat([
    Buffer.from("prefix"),
    Buffer.from("hsqs"),
    Buffer.from("middle"),
    Buffer.from("hsqs"),
  ]);

  assert.deepEqual(findSquashfsOffsets(buffer), [6, 16]);
});

test("verifySha256 rejects helper tool hash drift", () => {
  const root = join(tmpdir(), `jobsentinel-tool-hash-${process.pid}-${Date.now()}`);
  mkdirSync(root, { recursive: true });
  const file = join(root, "linuxdeploy-plugin-gtk.sh");
  writeFileSync(file, "hello");

  verifySha256(file, "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  assert.throws(
    () => verifySha256(file, "0".repeat(64), "linuxdeploy-plugin-gtk.sh"),
    /linuxdeploy-plugin-gtk\.sh SHA-256 mismatch/,
  );
});

test("resolveTauriBundlerCache isolates default helper cache under target", () => {
  assert.equal(
    resolveTauriBundlerCache("/repo", {}),
    "/repo/src-tauri/target/.tauri",
  );
  assert.equal(resolveTauriBundlerCache("/repo", { TAURI_BUNDLER_CACHE_DIR: "/cache" }), "/cache");
});

test("AppImage helper downloads are exact-pinned HTTPS sources", () => {
  assert.deepEqual(Object.fromEntries(tauriAppImageToolDownloads), {
    "linuxdeploy-plugin-appimage-x86_64.AppImage": {
      url: "https://github.com/linuxdeploy/linuxdeploy-plugin-appimage/releases/download/continuous/linuxdeploy-plugin-appimage-x86_64.AppImage",
      sha256: "e0129b8070e0c7b37151027e46e9fa44fe97ea29e3692705a2c5cff3771d3121",
    },
    "linuxdeploy-plugin-gtk.sh": {
      url: "https://raw.githubusercontent.com/tauri-apps/linuxdeploy-plugin-gtk/master/linuxdeploy-plugin-gtk.sh",
      sha256: "cb379f9b0733e9ad9f8bd78f8c2fa038aef2478523bb7d4c8e64ff6a1ea3501a",
    },
    "linuxdeploy-x86_64.AppImage": {
      url: "https://github.com/tauri-apps/binary-releases/releases/download/linuxdeploy/linuxdeploy-x86_64.AppImage",
      sha256: "e762bea85c8eb0d4b3508d46e5c1f037f717d0f9303ae3b4aafc8b04991fa1ef",
    },
  });
});

test("removeRootAppDirDuplicates keeps canonical nested desktop file", () => {
  const root = join(tmpdir(), `jobsentinel-appdir-${process.pid}-${Date.now()}`);
  const appDir = join(root, "JobSentinel.AppDir");
  const nested = join(appDir, "usr/share/applications");
  mkdirSync(nested, { recursive: true });
  writeFileSync(join(appDir, "JobSentinel.desktop"), "[Desktop Entry]\n");
  writeFileSync(join(appDir, ".DirIcon"), "");
  writeFileSync(join(nested, "JobSentinel.desktop"), "[Desktop Entry]\n");

  assert.deepEqual(removeRootAppDirDuplicates(appDir).sort(), [".DirIcon", "JobSentinel.desktop"]);
  assert.deepEqual(readdirSync(appDir), ["usr"]);
  assert.deepEqual(readdirSync(nested), ["JobSentinel.desktop"]);
});
