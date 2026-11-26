// Validates explicit update-reader metadata against the v3 Rust preflight contract.
const specKeys = ["version", "minimum_source", "maximum_source", "edition", "compatibility", "readers"];
const rangeKeys = ["database", "migration", "pack", "model", "browser", "region", "backup", "export"];
function requireValue(ok) { if (!ok) throw new Error("Invalid update candidate metadata"); }
function fields(value, required, optional = []) {
  requireValue(value && typeof value === "object" && !Array.isArray(value));
  requireValue(required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => [...required, ...optional].includes(key)));
}
const uint = (value, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= 0 && value <= max;
const version = value => Array.isArray(value) && value.length === 3 && value[0] === 3 && value.every(n => uint(n, 0xffffffff));
const compare = (a,b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
function archive(value, kind, protection) {
  fields(value, ["kind", "format_version", "contains_secrets", "protection", "user_review_required"]);
  requireValue(value.kind === kind && uint(value.format_version, 0xffffffff) && value.format_version > 0 &&
    value.contains_secrets === false && value.protection === protection && value.user_review_required === true);
}

export function createUpdateManifest(spec, { publisherKeyId, packageBytes, packageSha256, extension }) {
  fields(spec, specKeys);
  requireValue([spec.version, spec.minimum_source, spec.maximum_source].every(version) && compare(spec.minimum_source, spec.maximum_source) <= 0);
  requireValue(typeof publisherKeyId === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(publisherKeyId));
  const textVersion = spec.version.join(".");
  const edition = spec.edition;
  fields(edition, ["schema", "edition", "profile", "artifact_version", "platform", "architecture", "compatibility_line", "rollback_supported", "default_components", "automatic_model_downloads"]);
  const formats = {macos:[".dmg", ".pkg"], windows:[".msi", ".exe"], linux:[".deb", ".rpm"]};
  requireValue(edition.schema === "jobsentinel.v3.edition-manifest.v1" && edition.compatibility_line === 3 &&
    edition.artifact_version === textVersion && edition.rollback_supported === true &&
    ["essentials", "standard", "pro_local", "developer", "portable"].includes(edition.edition) &&
    ["balanced", "lighter", "stronger_local"].includes(edition.profile) &&
    Object.hasOwn(formats, edition.platform) && formats[edition.platform].includes(extension) &&
    ["x86_64", "aarch64"].includes(edition.architecture) && typeof edition.automatic_model_downloads === "boolean");
  requireValue(edition.edition !== "essentials" || (edition.profile === "lighter" && !edition.automatic_model_downloads));
  requireValue(Array.isArray(edition.default_components) && edition.default_components.length > 0 &&
    edition.default_components.every(v => ["deterministic_matching", "public_sources", "safe_support", "governed_model_setup", "browser_companion", "pack_diagnostics"].includes(v)));
  const data = spec.compatibility;
  fields(data, ["schema", "app_version", "compatibility_line", "database_schema", "backup", "export", "vector_backend"], ["extensions"]);
  requireValue(data.schema === "jobsentinel.v3.compatibility.v1" && data.app_version === textVersion &&
    data.compatibility_line === 3 && uint(data.database_schema, 0xffffffff) && data.database_schema > 0 && data.vector_backend === "sqlite_blob_v1");
  if (data.extensions !== undefined) {
    requireValue(data.extensions && typeof data.extensions === "object" && !Array.isArray(data.extensions) && Object.values(data.extensions).every(v => typeof v === "string"));
  }
  archive(data.backup, "backup", "encrypted");
  archive(data.export, "export", "reviewed_plaintext");
  fields(spec.readers, rangeKeys);
  for (const value of Object.values(spec.readers)) {
    fields(value, ["min", "max"]);
    requireValue(uint(value.min) && value.min > 0 && uint(value.max) && value.min <= value.max);
  }
  requireValue(spec.readers.database.max === data.database_schema);
  for (const kind of ["backup", "export"]) {
    requireValue(spec.readers[kind].min <= data[kind].format_version && spec.readers[kind].max >= data[kind].format_version);
  }
  requireValue(uint(packageBytes) && packageBytes > 0 && packageBytes <= 512 * 1024 * 1024 && /^[a-f0-9]{64}$/.test(packageSha256));
  const bytes = Buffer.from(JSON.stringify({ schema:"jobsentinel.update-candidate.v1", publisher_key_id:publisherKeyId,
    package_sha256:packageSha256, package_bytes:packageBytes, ...spec }));
  requireValue(bytes.length <= 64 * 1024);
  return bytes;
}
