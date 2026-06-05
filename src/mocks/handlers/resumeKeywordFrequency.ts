export function countMockKeywordFrequency(text: string, keyword: string): number {
  if (!keyword) return 0;
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  let count = 0;
  let start = 0;

  while (start < lowerText.length) {
    const index = lowerText.indexOf(lowerKeyword, start);
    if (index === -1) break;

    if (mockKeywordMatchHasBoundaries(lowerText, lowerKeyword, index)) {
      count += 1;
    }
    start = index + lowerKeyword.length;
  }

  return count;
}

function mockKeywordMatchHasBoundaries(text: string, keyword: string, start: number): boolean {
  const end = start + keyword.length;
  const before = start > 0 ? text[start - 1] ?? "" : "";
  const after = end < text.length ? text[end] ?? "" : "";
  return !isMockKeywordTermChar(before) && !isMockKeywordTermChar(after);
}

function isMockKeywordTermChar(ch: string): boolean {
  return /^[a-z0-9+#]$/i.test(ch);
}
