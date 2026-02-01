import { memo, useState, useEffect } from "react";
import { Card, Badge, Button, Skeleton } from "..";
import { invoke } from "@tauri-apps/api/core";
import { logError } from "../../utils/errorUtils";

// Types matching Rust backend
interface AnswerSuggestion {
  answer: string;
  confidence: number; // 0.0 - 1.0
  source: AnswerSource;
  timesUsed: number;
  timesModified: number;
  lastUsedDaysAgo: number | null;
  modificationRate: number; // 0.0 - 1.0
}

type AnswerSource =
  | { type: "manual"; pattern: string; answerId: number }
  | { type: "learned"; pattern: string; learnedId: number }
  | { type: "historical"; originalQuestion: string };

interface ScreeningAnswerSuggestionsProps {
  question: string;
  onSelectAnswer?: (answer: string) => void;
  limit?: number;
}

export const ScreeningAnswerSuggestions = memo(function ScreeningAnswerSuggestions({
  question,
  onSelectAnswer,
  limit = 3,
}: ScreeningAnswerSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<AnswerSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!question || question.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadSuggestions = async () => {
      try {
        setLoading(true);
        setError(null);

        const results = await invoke<AnswerSuggestion[]>("get_suggested_answers", {
          question,
          limit,
        });

        if (isMounted) {
          setSuggestions(results);
        }
      } catch (err: unknown) {
        if (isMounted) {
          logError("Failed to load answer suggestions:", err);
          setError("Failed to load suggestions");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSuggestions();

    return () => {
      isMounted = false;
    };
  }, [question, limit]);

  if (loading) {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <LightbulbIcon className="w-4 h-4 text-sentinel-500" />
          <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300">
            Smart Suggestions
          </h4>
        </div>
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-danger/30 bg-danger/5 dark:bg-danger/10">
        <div className="flex items-center gap-2 text-danger">
          <ErrorIcon className="w-4 h-4" />
          <p className="text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null; // No suggestions, don't show anything
  }

  return (
    <Card className="p-4 border-sentinel-200 dark:border-sentinel-800 bg-gradient-to-br from-sentinel-50/50 to-blue-50/50 dark:from-sentinel-900/10 dark:to-blue-900/10">
      <div className="flex items-center gap-2 mb-3">
        <LightbulbIcon className="w-4 h-4 text-sentinel-500" />
        <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300">
          Smart Suggestions
        </h4>
        <span className="text-xs text-surface-500">Based on your history</span>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard
            key={index}
            suggestion={suggestion}
            rank={index + 1}
            onSelect={onSelectAnswer}
          />
        ))}
      </div>
    </Card>
  );
});

// Individual suggestion card
interface SuggestionCardProps {
  suggestion: AnswerSuggestion;
  rank: number;
  onSelect?: (answer: string) => void;
}

function SuggestionCard({ suggestion, rank, onSelect }: SuggestionCardProps) {
  const confidencePercent = Math.round(suggestion.confidence * 100);
  const isHighConfidence = suggestion.confidence >= 0.8;
  const isMediumConfidence = suggestion.confidence >= 0.5;

  return (
    <div className="group relative p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-sentinel-300 dark:hover:border-sentinel-700 transition-all">
      {/* Rank badge */}
      <div className="absolute -left-2 -top-2 w-6 h-6 bg-sentinel-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
        {rank}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Answer text */}
          <p className="text-surface-900 dark:text-white font-medium break-words">
            {suggestion.answer}
          </p>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* Confidence badge */}
            <Badge
              variant={
                isHighConfidence ? "success" : isMediumConfidence ? "sentinel" : "surface"
              }
            >
              <CheckIcon className="w-3 h-3 mr-1" />
              {confidencePercent}% confident
            </Badge>

            {/* Source badge */}
            <SourceBadge source={suggestion.source} />

            {/* Usage stats */}
            {suggestion.timesUsed > 0 && (
              <span className="text-xs text-surface-500">
                Used {suggestion.timesUsed}×
                {suggestion.modificationRate > 0 && (
                  <span className="text-warning ml-1">
                    (modified {Math.round(suggestion.modificationRate * 100)}%)
                  </span>
                )}
              </span>
            )}

            {/* Recency indicator */}
            {suggestion.lastUsedDaysAgo !== null && suggestion.lastUsedDaysAgo <= 7 && (
              <Badge variant="alert" className="text-xs">
                Recent
              </Badge>
            )}
          </div>
        </div>

        {/* Select button */}
        {onSelect && (
          <Button
            size="sm"
            onClick={() => onSelect(suggestion.answer)}
            className="shrink-0"
          >
            Use
          </Button>
        )}
      </div>
    </div>
  );
}

// Source badge component
function SourceBadge({ source }: { source: AnswerSource }) {
  switch (source.type) {
    case "manual":
      return (
        <Badge variant="surface" className="text-xs">
          <UserIcon className="w-3 h-3 mr-1" />
          Manual
        </Badge>
      );
    case "learned":
      return (
        <Badge variant="sentinel" className="text-xs">
          <SparklesIcon className="w-3 h-3 mr-1" />
          Learned
        </Badge>
      );
    case "historical":
      return (
        <Badge variant="surface" className="text-xs">
          <ClockIcon className="w-3 h-3 mr-1" />
          History
        </Badge>
      );
    default:
      return null;
  }
}

// Icons
function LightbulbIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function UserIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function SparklesIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

function ClockIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ErrorIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
