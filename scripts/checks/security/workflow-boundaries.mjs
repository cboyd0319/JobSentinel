export function checkWorkflowRunExpressionBoundary(path, text, violations = []) {
  const forbiddenRunExpression = /\$\{\{\s*(?:github\.event|inputs(?:\.|\[))/;
  const lines = text.split(/\r?\n/);
  let runBlockParentIndent = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const indent = line.match(/^\s*/)[0].length;

    if (runBlockParentIndent !== null) {
      if (trimmed !== "" && indent <= runBlockParentIndent) {
        runBlockParentIndent = null;
      } else {
        if (forbiddenRunExpression.test(line)) {
          violations.push(formatRunExpressionViolation(path, index));
        }
        continue;
      }
    }

    const runMatch = line.match(/^(\s*)(?:-\s*)?run:\s*(.*)$/);
    if (!runMatch) {
      continue;
    }

    const runValue = runMatch[2].trim();
    if (runValue.startsWith("|") || runValue.startsWith(">")) {
      runBlockParentIndent = runMatch[1].length;
      continue;
    }

    if (forbiddenRunExpression.test(runValue)) {
      violations.push(formatRunExpressionViolation(path, index));
    }
  }

  return violations;
}

function formatRunExpressionViolation(path, zeroBasedLine) {
  return `${path}:${zeroBasedLine + 1} workflow run scripts must pass GitHub event data and workflow inputs through env variables`;
}
