const requiredRendererCspDirectives = [
  ["default-src", ["'self'"]],
  ["connect-src", ["'self'"]],
  ["img-src", ["'self'", "data:"]],
  ["font-src", ["'self'"]],
  ["style-src", ["'self'", "'unsafe-inline'"]],
  ["script-src", ["'self'"]],
  ["object-src", ["'none'"]],
  ["base-uri", ["'self'"]],
  ["form-action", ["'none'"]],
];

const allowedRendererCspDirectives = new Set(
  requiredRendererCspDirectives.map(([name]) => name),
);

function parseRendererCsp(csp, violations) {
  const directives = new Map();

  for (const rawDirective of csp.split(";")) {
    const directive = rawDirective.trim();
    if (!directive) {
      continue;
    }

    const [rawName, ...tokens] = directive.split(/\s+/);
    const name = rawName.toLowerCase();

    if (!tokens.length) {
      violations.push(`Tauri renderer CSP directive ${name} must include sources`);
      continue;
    }

    if (directives.has(name)) {
      violations.push(`Tauri renderer CSP must not duplicate directive: ${name}`);
      continue;
    }

    directives.set(name, tokens);
  }

  return directives;
}

function directiveSourceList(directive, sources) {
  return `${directive} ${sources.join(" ")}`;
}

function sameSources(actual, expected) {
  return (
    actual.length === expected.length &&
    actual.every((source, index) => source === expected[index])
  );
}

export function rendererCspViolations(csp) {
  const violations = [];

  if (typeof csp !== "string" || !csp.trim()) {
    return ["Tauri renderer CSP must be a non-empty string"];
  }

  const directives = parseRendererCsp(csp, violations);

  for (const [directive, expectedSources] of requiredRendererCspDirectives) {
    const actualSources = directives.get(directive);
    const expectedDirective = directiveSourceList(directive, expectedSources);

    if (!actualSources) {
      violations.push(`Tauri renderer CSP is missing directive: ${expectedDirective}`);
    } else if (!sameSources(actualSources, expectedSources)) {
      violations.push(
        `Tauri renderer CSP directive ${directive} must equal "${expectedDirective}"`,
      );
    }
  }

  for (const directive of directives.keys()) {
    if (!allowedRendererCspDirectives.has(directive)) {
      violations.push(`Tauri renderer CSP must not add unreviewed directive: ${directive}`);
    }
  }

  return violations;
}

export function checkRendererCspBoundary(csp, violations) {
  violations.push(...rendererCspViolations(csp));
}
