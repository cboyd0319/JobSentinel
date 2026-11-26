// Owns extraction of one job block from GitHub Actions workflow text for the release and security checks.

/** The `  <job>:` block, header included, up to the next job or top-level key; "" when the job is absent. */
export function workflowJobBlock(text, job) {
  const lines = String(text ?? "").split("\n");
  const start = lines.indexOf(`  ${job}:`);
  if (start < 0) return "";
  let end = start + 1;
  while (end < lines.length && !/^(?: {2}[A-Za-z0-9_-]+:\s*$|[^\s#])/.test(lines[end])) end += 1;
  return lines.slice(start, end).join("\n");
}
