const allowedCargoLatestStableExceptions = new Map([
  [
    "libsqlite3-sys",
    {
      version: "0.37.0",
      section: "workspace.dependencies",
      constrainedBy: { name: "sqlx", version: "0.9.0" },
      requiredFeature: "bundled-sqlcipher-vendored-openssl",
      reason:
        "SQLx 0.9.0 requires libsqlite3-sys >=0.30.1,<0.38.0; this is the newest compatible stable SQLCipher feature bridge.",
    },
  ],
]);

function cargoDependencyCurrentVersion(dependency) {
  return dependency?.version?.startsWith("=") ? dependency.version.slice(1) : null;
}

export function cargoLatestStableException(dependency, dependencies, cargoTomlText) {
  const exception = allowedCargoLatestStableExceptions.get(dependency.name);

  if (!exception || dependency.section !== exception.section) {
    return null;
  }

  if (cargoDependencyCurrentVersion(dependency) !== exception.version) {
    return null;
  }

  const constrainedBy = dependencies.find(
    (candidate) =>
      candidate.name === exception.constrainedBy.name &&
      cargoDependencyCurrentVersion(candidate) === exception.constrainedBy.version,
  );
  if (!constrainedBy) {
    return null;
  }

  const line = cargoTomlText.split(/\r?\n/)[dependency.line - 1] ?? "";
  if (!line.includes(exception.requiredFeature)) {
    return null;
  }

  return exception;
}
