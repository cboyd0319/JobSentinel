function packageNameFromOverrideKey(key, fallbackName = null) {
  if (key === ".") return fallbackName;

  const raw = String(key);
  if (raw.startsWith("@")) {
    const scopeSeparator = raw.indexOf("/");
    const versionSeparator = scopeSeparator === -1
      ? -1
      : raw.indexOf("@", scopeSeparator + 1);
    return versionSeparator === -1 ? raw : raw.slice(0, versionSeparator);
  }

  const versionSeparator = raw.indexOf("@");
  return versionSeparator === -1 ? raw : raw.slice(0, versionSeparator);
}

export function npmOverrideDependencyPins(packageJson) {
  const pins = [];

  function visit(value, label, packageName = null) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;

    for (const [key, spec] of Object.entries(value)) {
      const overridePackageName = packageNameFromOverrideKey(key, packageName);
      const overrideLabel = `${label}.${key}`;

      if (typeof spec === "string") {
        pins.push({
          label: overrideLabel,
          name: overridePackageName,
          version: spec,
        });
        continue;
      }

      if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
        continue;
      }

      if (typeof spec["."] === "string") {
        pins.push({
          label: `${overrideLabel}.`,
          name: overridePackageName,
          version: spec["."],
        });
      }

      for (const [childKey, childSpec] of Object.entries(spec)) {
        if (childKey === ".") continue;

        const childPackageName = packageNameFromOverrideKey(childKey, overridePackageName);
        const childLabel = `${overrideLabel}.${childKey}`;

        if (typeof childSpec === "string") {
          pins.push({
            label: childLabel,
            name: childPackageName,
            version: childSpec,
          });
          continue;
        }

        visit(childSpec, childLabel, childPackageName);
      }
    }
  }

  visit(packageJson.overrides, "package.json overrides");
  return pins;
}
