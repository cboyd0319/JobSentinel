// Owns strict JSON parsing for release inputs: duplicate object keys are errors, not silently collapsed.

/** Parses JSON and rejects duplicate object keys, which JSON.parse would silently collapse. */
export function parseStrictJson(text, label) {
  const stack = [];
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const top = stack.at(-1);
    if (char === '"') {
      let end = index + 1;
      while (end < text.length && text[end] !== '"') end += text[end] === "\\" ? 2 : 1;
      if (top?.object && top.expectKey) {
        const key = JSON.parse(text.slice(index, end + 1));
        if (top.keys.has(key)) throw new Error(`${label} has duplicate key ${key}.`);
        top.keys.add(key);
        top.expectKey = false;
      }
      index = end;
    } else if (char === "{" || char === "[") {
      stack.push({ object: char === "{", expectKey: char === "{", keys: new Set() });
    } else if (char === "}" || char === "]") {
      stack.pop();
    } else if (char === "," && top?.object) {
      top.expectKey = true;
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} is malformed JSON.`);
  }
}
