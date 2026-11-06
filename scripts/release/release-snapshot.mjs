// Binds approval to one release identity, asset inventory and verified content snapshot.
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

export function releaseInventory(release) {
  const assets = release.assets.map(({ id, name, size, updated_at, digest }) => ({ id, name, size, updated_at, digest }));
  if (new Set(assets.map(a => a.name)).size !== assets.length || new Set(assets.map(a => a.id)).size !== assets.length) {
    throw new Error("Duplicate release asset identity.");
  }
  assets.sort((a,b) => a.name.localeCompare(b.name, "en"));
  return { revision: release.resolved_revision, id: release.id, tag: release.tag_name, draft: release.draft, prerelease: release.prerelease,
    target: release.target_commitish, title: release.name, body: release.body, assets };
}

export function verifiedSnapshot(before, after, digests, expected) {
  const inventory = releaseInventory(before);
  if (!isDeepStrictEqual(inventory, releaseInventory(after))) throw new Error("Release inventory changed during verification.");
  const contents = inventory.assets.map(asset => {
    const sha256 = digests.get(asset.id);
    if (!/^[a-f0-9]{64}$/.test(sha256 ?? "")) throw new Error("Release snapshot contains unverified bytes.");
    return { ...asset, sha256 };
  });
  const snapshot = createHash("sha256").update(JSON.stringify({ ...inventory, assets: contents })).digest("hex");
  if (expected && snapshot !== expected) throw new Error("Release changed after approval; a new verified snapshot and approval are required.");
  return snapshot;
}
