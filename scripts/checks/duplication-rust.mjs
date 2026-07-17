function blank(text) {
  return text.replace(/[^\r\n]/g, " ");
}

function charLiteralEnd(text, start) {
  const first = text[start + 1];
  if (!first || first === "\r" || first === "\n") return -1;
  if (first === "\\") {
    let cursor = start + 2;
    while (
      cursor < text.length &&
      text[cursor] !== "\r" &&
      text[cursor] !== "\n"
    ) {
      if (text[cursor++] === "'") return cursor;
    }
    return -1;
  }
  const width = String.fromCodePoint(text.codePointAt(start + 1)).length;
  return text[start + 1 + width] === "'" ? start + 2 + width : -1;
}

function rustCodeMask(text) {
  const mask = new Uint8Array(text.length).fill(1);
  const hide = (start, end) => mask.fill(0, start, end);

  for (let index = 0; index < text.length;) {
    if (text.startsWith("//", index)) {
      const end = text.indexOf("\n", index + 2);
      hide(index, end === -1 ? text.length : end);
      index = end === -1 ? text.length : end;
      continue;
    }

    if (text.startsWith("/*", index)) {
      let depth = 1;
      let cursor = index + 2;
      while (cursor < text.length && depth > 0) {
        if (text.startsWith("/*", cursor)) {
          depth += 1;
          cursor += 2;
        } else if (text.startsWith("*/", cursor)) {
          depth -= 1;
          cursor += 2;
        } else {
          cursor += 1;
        }
      }
      hide(index, cursor);
      index = cursor;
      continue;
    }

    const rawStart =
      text[index] === "r"
        ? index
        : text[index] === "b" && text[index + 1] === "r"
          ? index + 1
          : -1;
    if (rawStart !== -1) {
      let quote = rawStart + 1;
      while (text[quote] === "#") quote += 1;
      if (text[quote] === '"') {
        const suffix = `"${"#".repeat(quote - rawStart - 1)}`;
        const closing = text.indexOf(suffix, quote + 1);
        const end = closing === -1 ? text.length : closing + suffix.length;
        hide(index, end);
        index = end;
        continue;
      }
    }

    const quote =
      text[index] === '"'
        ? index
        : text[index] === "b" && text[index + 1] === '"'
          ? index + 1
          : -1;
    if (quote !== -1) {
      let cursor = quote + 1;
      while (cursor < text.length) {
        if (text[cursor] === "\\") cursor += 2;
        else if (text[cursor++] === '"') break;
      }
      hide(index, cursor);
      index = cursor;
      continue;
    }

    if (text[index] === "'") {
      const end = charLiteralEnd(text, index);
      if (end !== -1) {
        hide(index, end);
        index = end;
        continue;
      }
    }

    index += 1;
  }

  return mask;
}

function nextCodeCharacter(text, mask, start) {
  let cursor = start;
  while (
    cursor < text.length &&
    (/\s/.test(text[cursor]) || mask[cursor] === 0)
  )
    cursor += 1;
  return cursor;
}

function matchingDelimiter(text, mask, start, opening, closing) {
  let depth = 0;
  for (let cursor = start; cursor < text.length; cursor += 1) {
    if (mask[cursor] === 0) continue;
    if (text[cursor] === opening) depth += 1;
    else if (text[cursor] === closing && --depth === 0) return cursor;
  }
  return -1;
}

function splitCfgArguments(expression) {
  const argumentsList = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < expression.length; index += 1) {
    if (expression[index] === "(") depth += 1;
    else if (expression[index] === ")") depth -= 1;
    else if (expression[index] === "," && depth === 0) {
      argumentsList.push(expression.slice(start, index));
      start = index + 1;
    }
  }
  argumentsList.push(expression.slice(start));
  return argumentsList.map((item) => item.trim()).filter(Boolean);
}

function cfgRequiresTest(expression) {
  const value = expression.replace(/\s+/g, "");
  if (value === "test") return true;
  for (const operator of ["all", "any"]) {
    const prefix = `${operator}(`;
    if (!value.startsWith(prefix) || !value.endsWith(")")) continue;
    const children = splitCfgArguments(value.slice(prefix.length, -1));
    if (operator === "all") return children.some(cfgRequiresTest);
    return children.length > 0 && children.every(cfgRequiresTest);
  }
  return false;
}

function testOnlyAttribute(attribute) {
  const compact = attribute.replace(/\s+/g, "");
  if (/^#\[(?:[A-Za-z_][\w]*::)*test(?:\([^\]]*\))?\]$/.test(compact))
    return true;
  const match = compact.match(/^#\[cfg\((.*)\)\]$/s);
  return match ? cfgRequiresTest(match[1]) : false;
}

function attributeEnd(text, mask, start) {
  const bracket = nextCodeCharacter(text, mask, start + 1);
  if (text[bracket] !== "[") return -1;
  return matchingDelimiter(text, mask, bracket, "[", "]");
}

function testItemEnd(text, mask, start) {
  let parentheses = 0;
  let brackets = 0;
  for (let cursor = start; cursor < text.length; cursor += 1) {
    if (mask[cursor] === 0) continue;
    if (text[cursor] === "(") parentheses += 1;
    else if (text[cursor] === ")") parentheses -= 1;
    else if (text[cursor] === "[") brackets += 1;
    else if (text[cursor] === "]") brackets -= 1;
    else if (parentheses === 0 && brackets === 0 && text[cursor] === ";")
      return cursor + 1;
    else if (parentheses === 0 && brackets === 0 && text[cursor] === "{") {
      const end = matchingDelimiter(text, mask, cursor, "{", "}");
      return end === -1 ? text.length : end + 1;
    }
  }
  return text.length;
}

function rustTestRanges(text) {
  const mask = rustCodeMask(text);
  const ranges = [];

  for (let index = 0; index < text.length; index += 1) {
    if (mask[index] === 0 || text[index] !== "#") continue;
    const end = attributeEnd(text, mask, index);
    if (end === -1 || !testOnlyAttribute(text.slice(index, end + 1))) continue;

    let itemStart = nextCodeCharacter(text, mask, end + 1);
    while (text[itemStart] === "#") {
      const nextEnd = attributeEnd(text, mask, itemStart);
      if (nextEnd === -1) break;
      itemStart = nextCodeCharacter(text, mask, nextEnd + 1);
    }
    const itemEnd = testItemEnd(text, mask, itemStart);
    ranges.push({ start: index, end: itemEnd });
    index = itemEnd - 1;
  }

  return ranges;
}

function isRustTestPath(path) {
  return (
    /(?:^|\/)tests(?:\/|\.rs$)/.test(path) ||
    /(?:^|\/)[^/]*_tests\.rs$/.test(path)
  );
}

function retainRanges(text, ranges) {
  const output = [...blank(text)];
  for (const range of ranges) {
    for (let index = range.start; index < range.end; index += 1)
      output[index] = text[index];
  }
  return output.join("");
}

function removeRanges(text, ranges) {
  const output = [...text];
  for (const range of ranges) {
    for (let index = range.start; index < range.end; index += 1) {
      if (text[index] !== "\r" && text[index] !== "\n") output[index] = " ";
    }
  }
  return output.join("");
}

export function classifyRustSource(path, text, classification) {
  if (classification === "all" || !path.endsWith(".rs")) return text;
  if (classification !== "rust-production" && classification !== "rust-tests") {
    throw new Error(
      `unsupported duplication classification: ${classification}`,
    );
  }
  if (isRustTestPath(path))
    return classification === "rust-tests" ? text : blank(text);
  const ranges = rustTestRanges(text);
  return classification === "rust-tests"
    ? retainRanges(text, ranges)
    : removeRanges(text, ranges);
}
