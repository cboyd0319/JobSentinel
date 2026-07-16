const allowedNpmLatestStableExceptions = new Map([
  [
    "typescript",
    {
      version: "6.0.3",
      constrainedBy: { name: "typescript-eslint", version: "8.64.0" },
      peerDependency: "typescript",
      requiredRange: ">=4.8.4 <6.1.0",
      reason:
        "typescript-eslint 8.64.0 does not support TypeScript 7; 6.0.3 is the newest supported stable release.",
    },
  ],
]);

function directVersion(packageJson, name) {
  return packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name] ?? null;
}

export function npmLatestStableException(dependency, packageJson, registryByName) {
  const exception = allowedNpmLatestStableExceptions.get(dependency.name);
  if (!exception || dependency.version !== exception.version) return null;

  if (directVersion(packageJson, exception.constrainedBy.name) !== exception.constrainedBy.version) {
    return null;
  }

  const constraint = registryByName
    .get(exception.constrainedBy.name)
    ?.versions?.[exception.constrainedBy.version]?.peerDependencies?.[exception.peerDependency];
  return constraint === exception.requiredRange ? exception : null;
}

export function npmCompatibleOutdatedException(dependency, packageJson, packageLock) {
  const exception = allowedNpmLatestStableExceptions.get(dependency.name);
  if (!exception || dependency.current !== exception.version) return null;
  if (directVersion(packageJson, dependency.name) !== exception.version) return null;
  if (directVersion(packageJson, exception.constrainedBy.name) !== exception.constrainedBy.version) {
    return null;
  }

  const constrainedPackage =
    packageLock.packages?.[`node_modules/${exception.constrainedBy.name}`];
  const constraint = constrainedPackage?.peerDependencies?.[exception.peerDependency];
  return constrainedPackage?.version === exception.constrainedBy.version &&
    constraint === exception.requiredRange
    ? exception
    : null;
}
