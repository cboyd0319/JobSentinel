import {
  getScoreBg,
  getScoreLabel,
  getScoreProgressPercent,
} from "../../../utils/scoreUtils";

interface HighlightKeywordsProps {
  text: string;
  keywords: string[];
  type: "match" | "missing";
}

export function HighlightKeywords({ text, keywords, type }: HighlightKeywordsProps) {
  if (!text || keywords.length === 0) {
    return <span>{text}</span>;
  }

  const colorClass = type === "match"
    ? "bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-100"
    : "bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100";

  const parts = getKeywordParts(text, keywords).map((part) => ({
    ...part,
    type: part.isKeyword ? type : "plain",
  }));

  return (
    <>
      {parts.map((part, idx) =>
        part.type !== "plain" ? (
          <span key={idx} className={`${colorClass} px-1 rounded`}>
            {part.text}
          </span>
        ) : (
          <span key={idx}>{part.text}</span>
        ),
      )}
    </>
  );
}

interface HighlightKeywordGroupsProps {
  text: string;
  matchedKeywords: string[];
  missingKeywords: string[];
}

export function HighlightKeywordGroups({
  text,
  matchedKeywords,
  missingKeywords,
}: HighlightKeywordGroupsProps) {
  const keywordTypes = new Map<string, "match" | "missing">();
  for (const keyword of matchedKeywords) {
    keywordTypes.set(keyword.toLowerCase(), "match");
  }
  for (const keyword of missingKeywords) {
    keywordTypes.set(keyword.toLowerCase(), "missing");
  }

  const sortedKeywords = [...keywordTypes.keys()].sort((a, b) => b.length - a.length);
  if (!text || sortedKeywords.length === 0) {
    return <span>{text}</span>;
  }

  const regex = buildKeywordRegex(sortedKeywords);
  const parts: { text: string; type: "plain" | "match" | "missing" }[] = [];
  let currentIndex = 0;

  for (const match of Array.from(text.matchAll(regex))) {
    const matchStart = match.index!;
    const matchEnd = matchStart + match[0].length;

    if (matchStart > currentIndex) {
      parts.push({ text: text.slice(currentIndex, matchStart), type: "plain" });
    }

    parts.push({
      text: match[0],
      type: keywordTypes.get(match[0].toLowerCase()) ?? "match",
    });
    currentIndex = matchEnd;
  }

  if (currentIndex < text.length) {
    parts.push({ text: text.slice(currentIndex), type: "plain" });
  }

  return (
    <>
      {parts.map((part, idx) => {
        if (part.type === "plain") return <span key={idx}>{part.text}</span>;
        const colorClass = part.type === "match"
          ? "bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-100"
          : "bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100";
        return (
          <span key={idx} className={`${colorClass} px-1 rounded`}>
            {part.text}
          </span>
        );
      })}
    </>
  );
}

function getKeywordParts(text: string, keywords: string[]) {
  const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
  const regex = buildKeywordRegex(sortedKeywords);
  const matches = Array.from(text.matchAll(regex));

  if (matches.length === 0) {
    return [{ text, isKeyword: false }];
  }

  const parts: { text: string; isKeyword: boolean }[] = [];
  let currentIndex = 0;

  matches.forEach((match) => {
    const matchStart = match.index!;
    const matchEnd = matchStart + match[0].length;

    if (matchStart > currentIndex) {
      parts.push({ text: text.slice(currentIndex, matchStart), isKeyword: false });
    }
    parts.push({ text: match[0], isKeyword: true });
    currentIndex = matchEnd;
  });

  if (currentIndex < text.length) {
    parts.push({ text: text.slice(currentIndex), isKeyword: false });
  }

  return parts;
}

function buildKeywordRegex(keywords: string[]): RegExp {
  return new RegExp(`\\b(${keywords.map(escapeRegExp).join("|")})\\b`, "gi");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function ScoreItem({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="min-w-0 text-sm text-surface-600 dark:text-surface-400">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
        <div className="h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700 sm:w-24 sm:flex-none">
          <div
            className={`h-full ${getScoreBg(score)} transition-all duration-300`}
            style={{ width: `${getScoreProgressPercent(score)}%` }}
          />
        </div>
        <span className="min-w-24 text-right text-sm font-semibold text-surface-700 dark:text-surface-300 sm:w-28">
          {getScoreLabel(score)}
        </span>
      </div>
    </div>
  );
}
