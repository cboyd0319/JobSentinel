export function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function hasAll(text, snippets) {
  const normalizedText = normalizeText(text);
  return snippets.every((snippet) => normalizedText.includes(normalizeText(snippet)));
}

export function hasAny(text, snippets) {
  const normalizedText = normalizeText(text);
  return snippets.some((snippet) => normalizedText.includes(normalizeText(snippet)));
}
