const promptLikeExternalAiPhrases = [
  "ignore previous instructions",
  "ignore all previous instructions",
  "ignroe previous instructions",
  "ignore previous instructons",
  "ignore prevous instructions",
  "disregard previous instructions",
  "disregard previous instructons",
  "override instructions",
  "system prompt",
  "developer message",
  "prompt injection",
  "ignore the job description",
  "do not follow the job description",
  "instruction to recruiter software",
  "for ai screeners",
];

const zeroWidthCharacters = new Set([
  "\u200B",
  "\u200C",
  "\u200D",
  "\u2060",
  "\uFEFF",
]);

const promptInspectionConfusables = new Map<string, string>([
  ["\u03B5", "e"],
  ["\u03B9", "i"],
  ["\u03BF", "o"],
  ["\u03C1", "p"],
  ["\u03C5", "y"],
  ["\u0430", "a"],
  ["\u0435", "e"],
  ["\u043E", "o"],
  ["\u0440", "p"],
  ["\u0441", "c"],
  ["\u0443", "y"],
  ["\u0445", "x"],
  ["\u0455", "s"],
  ["\u0456", "i"],
  ["\u0458", "j"],
]);

const hiddenMarkupPatterns = [
  /<!--[\s\S]*?-->/i,
  /<meta\b[^>]*(?:keywords|description|content)\b/i,
  /style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0|font-size\s*:\s*0)/i,
  /\\(?:color|textcolor)\s*\{\s*(?:white|transparent|#fff(?:fff)?|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))\s*\}/i,
];

const base64LikePattern = /\b[A-Za-z0-9+/]{24,}={0,2}\b/g;
const hexLikePattern = /\b(?:0x)?[0-9a-fA-F]{32,}\b/g;
const obfuscatedPromptPhraseTargets = [
  ["ignore", "previous", "instructions"],
  ["ignore", "instructions"],
  ["disregard", "previous", "instructions"],
  ["disregard", "instructions"],
  ["override", "instructions"],
  ["system", "prompt"],
  ["developer", "message"],
  ["prompt", "injection"],
] as const;

function isTypoglycemiaMatch(word: string, target: string): boolean {
  if (word.length !== target.length || word.length < 3) {
    return false;
  }
  if (word[0] !== target[0] || word[word.length - 1] !== target[target.length - 1]) {
    return false;
  }
  const sortStr = (s: string) => [...s].sort().join("");
  return sortStr(word.slice(1, -1)) === sortStr(target.slice(1, -1));
}

function hasAtMostOneEdit(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) {
    return false;
  }

  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) {
      return false;
    }

    if (left.length > right.length) {
      leftIndex += 1;
    } else if (right.length > left.length) {
      rightIndex += 1;
    } else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  return true;
}

function isFuzzyMatch(word: string, target: string): boolean {
  return isTypoglycemiaMatch(word, target) || hasAtMostOneEdit(word, target);
}

function hasFuzzyPhrase(
  words: string[],
  startIndex: number,
  targets: readonly string[],
): boolean {
  let cursor = startIndex;

  for (const target of targets) {
    let matchedIndex = -1;
    const end = Math.min(words.length, cursor + 2);
    for (let index = cursor; index < end; index += 1) {
      const word = words[index];
      if (word && isFuzzyMatch(word, target)) {
        matchedIndex = index;
        break;
      }
    }

    if (matchedIndex === -1) {
      return false;
    }

    cursor = matchedIndex + 1;
  }

  return true;
}

function hasObfuscatedPromptPhrases(text: string): boolean {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  for (let index = 0; index < words.length; index += 1) {
    if (
      obfuscatedPromptPhraseTargets.some((targets) =>
        hasFuzzyPhrase(words, index, targets),
      )
    ) {
      return true;
    }
  }
  return false;
}

function normalizePromptInspectionText(text: string): string {
  return [...text.normalize("NFKC").toLowerCase()]
    .map((char) => promptInspectionConfusables.get(char) ?? char)
    .join("");
}

function textHasPromptLikeExternalAiContent(text: string, decodeDepth = 0): boolean {
  if (text.split("").some((char) => zeroWidthCharacters.has(char))) {
    return true;
  }

  if (hiddenMarkupPatterns.some((pattern) => pattern.test(text))) {
    return true;
  }

  const inspectionText = normalizePromptInspectionText(text);

  if (hasObfuscatedPromptPhrases(inspectionText)) {
    return true;
  }

  if (promptLikeExternalAiPhrases.some((phrase) => inspectionText.includes(phrase))) {
    return true;
  }

  if (decodeDepth > 0) {
    return false;
  }

  return decodedCandidateText(text).some((decoded) =>
    textHasPromptLikeExternalAiContent(decoded, decodeDepth + 1),
  );
}

function decodedCandidateText(text: string): string[] {
  const decoded: string[] = [];

  for (const match of text.matchAll(base64LikePattern)) {
    const value = decodeBase64Text(match[0]);
    if (value) {
      decoded.push(value);
    }
  }

  for (const match of text.matchAll(hexLikePattern)) {
    const value = decodeHexText(match[0]);
    if (value) {
      decoded.push(value);
    }
  }

  return decoded;
}

function decodeBase64Text(value: string): string | undefined {
  try {
    const decoded = atob(value);
    return mostlyPrintable(decoded) ? decoded : undefined;
  } catch {
    return undefined;
  }
}

function decodeHexText(value: string): string | undefined {
  const normalized = value.replace(/^0x/i, "");
  if (normalized.length % 2 !== 0) {
    return undefined;
  }

  const chars: string[] = [];
  for (let index = 0; index < normalized.length; index += 2) {
    chars.push(String.fromCharCode(Number.parseInt(normalized.slice(index, index + 2), 16)));
  }

  const decoded = chars.join("");
  return mostlyPrintable(decoded) ? decoded : undefined;
}

function mostlyPrintable(value: string): boolean {
  if (value.length < 8) {
    return false;
  }

  const printable = [...value].filter((char) => /[\t\n\r -~]/.test(char)).length;
  return printable / value.length >= 0.85;
}

function valueHasPromptLikeExternalAiContent(value: unknown): boolean {
  if (typeof value === "string") {
    return textHasPromptLikeExternalAiContent(value);
  }

  if (Array.isArray(value)) {
    return value.some(valueHasPromptLikeExternalAiContent);
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.values(value).some(valueHasPromptLikeExternalAiContent);
}

export function hasPromptLikeExternalAiContent(
  payload: Record<string, unknown>,
): boolean {
  return Object.values(payload).some(valueHasPromptLikeExternalAiContent);
}
