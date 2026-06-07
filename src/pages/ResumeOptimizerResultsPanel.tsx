import type { ReactElement } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card, CardHeader } from "../components/Card";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  getScoreBg,
  getScoreColor,
  getScoreLabel,
  getScoreProgressPercent,
} from "../utils/scoreUtils";
import { JobWordsOverviewCard } from "./ResumeOptimizerJobWordsOverview";
import {
  buildResumeNextActions,
  formatHardConstraintCategory,
  formatIssueSeverity,
  formatRequirementEvidenceSections,
  formatRequirementState,
  formatSuggestionCategory,
  getResumeFitEvidenceStatus,
  type AtsAnalysisResult,
  type IssueSeverity,
  type KeywordImportance,
  type MissingKeyword,
  type RequirementMatchState,
} from "./resumeOptimizerModel";

interface ResumeOptimizerResultsPanelProps {
  analyzing: boolean;
  analysisResult: AtsAnalysisResult | null;
  canShowComparison: boolean;
  showComparison: boolean;
  jobDescription: string;
  comparisonResumeText: string;
  onToggleComparison: () => void;
  onReviewInResumeBuilder?: () => void;
}

export function ResumeOptimizerResultsPanel({
  analyzing,
  analysisResult,
  canShowComparison,
  showComparison,
  jobDescription,
  comparisonResumeText,
  onToggleComparison,
  onReviewInResumeBuilder,
}: ResumeOptimizerResultsPanelProps) {
  if (analyzing) {
    return (
      <Card className="flex items-center justify-center py-32">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-surface-600 dark:text-surface-400">
            Reviewing resume...
          </p>
        </div>
      </Card>
    );
  }

  if (!analysisResult) {
    return (
      <Card className="text-center py-32">
        <div className="w-16 h-16 bg-sentinel-50 dark:bg-sentinel-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-sentinel-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="font-display text-display-md text-surface-900 dark:text-white mb-2">
          No review yet
        </h3>
        <p className="text-surface-500 dark:text-surface-400">
          Choose or add a resume, paste a job post, then review the match
        </p>
      </Card>
    );
  }

  const fitEvidenceStatus = getResumeFitEvidenceStatus(analysisResult);
  const matchedKeywords = analysisResult.keyword_matches.map((match) => match.keyword);
  const missingKeywordDetails = getMissingKeywordDetails(analysisResult);
  const missingKeywordGroups = getMissingKeywordGroups(missingKeywordDetails);
  const hardConstraintRisks = analysisResult.hard_constraint_risks ?? [];
  const requirementReviews = analysisResult.requirement_reviews ?? [];
  const resumeNextActions = buildResumeNextActions(analysisResult);

  return (
    <>
      <div className="flex gap-3">
        {canShowComparison && (
          <Button
            onClick={onToggleComparison}
            variant={showComparison ? "primary" : "secondary"}
            className="flex-1"
          >
            {showComparison ? "Hide Comparison" : "Show Comparison"}
          </Button>
        )}
        {onReviewInResumeBuilder && (
          <Button
            onClick={onReviewInResumeBuilder}
            variant="success"
            className="flex-1"
          >
            Review in Resume Builder
          </Button>
        )}
      </div>

      {showComparison && canShowComparison && (
        <Card>
          <CardHeader title="Resume-Job Comparison" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-w-0 border-b border-surface-200 pb-4 dark:border-surface-700 md:border-b-0 md:border-r md:pb-0 md:pr-4">
              <h3 className="font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-sentinel-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Job Requirements
              </h3>
              <div className="max-h-96 overflow-y-auto rounded-lg bg-surface-50 p-4 font-mono text-sm text-surface-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere] dark:bg-surface-800 dark:text-surface-300">
                {highlightKeywordGroups(
                  jobDescription,
                  matchedKeywords,
                  missingKeywordDetails.map((gap) => gap.keyword),
                )}
              </div>
            </div>

            <div className="min-w-0 md:pl-4">
              <h3 className="font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Your Resume
              </h3>
              <div className="max-h-96 overflow-y-auto rounded-lg bg-surface-50 p-4 font-mono text-sm text-surface-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere] dark:bg-surface-800 dark:text-surface-300">
                {highlightKeywords(comparisonResumeText, matchedKeywords, "match")}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 p-3 bg-sentinel-50 dark:bg-sentinel-900/20 rounded-lg">
            <svg
              className="w-5 h-5 text-sentinel-600 dark:text-sentinel-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm">
              <p className="text-sentinel-800 dark:text-sentinel-300">
                <span className="bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-100 px-1 rounded mr-1">
                  Green
                </span>
                = Words found in both
                <span className="ml-4 bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100 px-1 rounded mr-1">
                  Red
                </span>
                = Words to review
              </p>
            </div>
          </div>
        </Card>
      )}

      <JobWordsOverviewCard
        keywordMatches={analysisResult.keyword_matches}
        formatEvidenceSections={formatRequirementEvidenceSections}
      />

      <Card>
        <CardHeader title="Resume Fit" />
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getScoreColor(analysisResult.overall_score)}`}>
              {getScoreLabel(analysisResult.overall_score)}
            </div>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
              Overall fit
            </p>
          </div>
          <div className="space-y-3">
            <ScoreItem label="Job words" score={analysisResult.keyword_score} />
          </div>
        </div>
        <p className="mt-3 text-xs text-surface-500 dark:text-surface-400">
          Local evidence review, not a hiring prediction or a promise about employer systems.
        </p>
        {fitEvidenceStatus && (
          <div className="mt-4 rounded-lg border border-surface-200 bg-surface-50 p-3 text-sm dark:border-surface-700 dark:bg-surface-800/70">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-medium text-surface-800 dark:text-surface-100">
                Evidence status
              </span>
              <Badge variant={fitEvidenceStatus.variant} size="sm">
                {fitEvidenceStatus.label}
              </Badge>
            </div>
            <p className="text-surface-600 dark:text-surface-300">
              {fitEvidenceStatus.detail}
            </p>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Resume Quality" />
        <div className="space-y-3">
          <ScoreItem label="Readable format" score={analysisResult.format_score} />
          <ScoreItem label="Details included" score={analysisResult.completeness_score} />
        </div>
      </Card>

      {resumeNextActions.length > 0 && (
        <Card>
          <CardHeader title="What To Do Next" />
          <div className="space-y-3">
            {resumeNextActions.map((action, idx) => (
              <div
                key={`${action.title}-${idx}`}
                className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
              >
                <div className="flex flex-wrap items-start gap-2 mb-2">
                  <Badge variant={action.variant} size="sm">
                    {action.label}
                  </Badge>
                  <p className="font-medium text-surface-900 dark:text-surface-100 flex-1 min-w-48">
                    {action.title}
                  </p>
                </div>
                <p className="text-sm text-surface-700 dark:text-surface-300">
                  {action.detail}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {hardConstraintRisks.length > 0 && (
        <Card>
          <CardHeader title={`Hard Requirements To Check (${hardConstraintRisks.length})`} />
          <div className="space-y-3">
            {hardConstraintRisks.map((risk, idx) => (
              <div
                key={`${risk.requirement}-${idx}`}
                className="p-3 bg-danger/5 dark:bg-danger/10 rounded-lg border border-danger/20"
              >
                <div className="flex flex-wrap items-start gap-2 mb-2">
                  <Badge variant="danger" size="sm">Check first</Badge>
                  <Badge variant="surface" size="sm">
                    {formatHardConstraintCategory(risk.category)}
                  </Badge>
                  <p className="font-medium text-surface-900 dark:text-surface-100 flex-1 min-w-48">
                    {risk.requirement}
                  </p>
                </div>
                <p className="text-sm text-surface-700 dark:text-surface-300">
                  {risk.action}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                  Fit label is limited until this is confirmed.
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {requirementReviews.length > 0 && (
        <Card>
          <CardHeader title={`Requirement Review (${requirementReviews.length})`} />
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {requirementReviews.map((review, idx) => (
              <div
                key={`${review.keyword}-${idx}`}
                className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
              >
                <div className="flex flex-wrap items-start gap-2">
                  <Badge variant={getRequirementStateVariant(review.match_state)} size="sm">
                    {formatRequirementState(review.match_state)}
                  </Badge>
                  <Badge variant={getImportanceVariant(review.importance)} size="sm">
                    {review.importance}
                  </Badge>
                  {review.hard_constraint && (
                    <Badge variant="danger" size="sm">Hard requirement</Badge>
                  )}
                  <p className="font-medium text-surface-900 dark:text-surface-100 flex-1 min-w-48">
                    {review.keyword}
                  </p>
                </div>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">
                  {review.evidence_sections.length > 0
                    ? `Found in: ${formatRequirementEvidenceSections(review.evidence_sections)}`
                    : "No clear resume evidence found"}
                </p>
                <p className="text-sm text-surface-700 dark:text-surface-300 mt-2">
                  {review.recommendation}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {analysisResult.keyword_matches.length > 0 && (
        <Card>
          <CardHeader title={`Words Found (${analysisResult.keyword_matches.length})`} />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {analysisResult.keyword_matches.map((match, idx) => (
              <div
                key={idx}
                className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="break-words [overflow-wrap:anywhere] font-medium text-surface-800 dark:text-surface-200">
                      {match.keyword}
                    </p>
                    <p className="mt-0.5 break-words text-xs text-surface-500 [overflow-wrap:anywhere] dark:text-surface-400">
                      Found in: {formatRequirementEvidenceSections(match.found_in)}
                    </p>
                  </div>
                  <Badge variant={getImportanceVariant(match.importance)} size="sm" className="shrink-0">
                    {match.importance}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {missingKeywordDetails.length > 0 && (
        <Card>
          <CardHeader title={`Words To Review (${missingKeywordDetails.length})`} />
          <div className="space-y-4">
            {missingKeywordGroups.required.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-danger mb-2">
                  Required to Review
                </h4>
                <div className="flex flex-wrap gap-2">
                  {missingKeywordGroups.required.map((gap, idx) => (
                    <Badge key={idx} variant="danger">
                      {gap.keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {missingKeywordGroups.preferred.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-alert-700 dark:text-alert-400 mb-2">
                  Preferred to Review
                </h4>
                <div className="flex flex-wrap gap-2">
                  {missingKeywordGroups.preferred.map((gap, idx) => (
                    <Badge key={idx} variant="alert">
                      {gap.keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {missingKeywordGroups.other.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
                  Nice-to-Have or Other to Review
                </h4>
                <div className="flex flex-wrap gap-2">
                  {missingKeywordGroups.other.map((gap, idx) => (
                    <Badge key={idx} variant="surface">
                      {gap.keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1 text-xs text-surface-500 dark:text-surface-400">
              <p>Start with required job-post language. Preferred words can help later.</p>
              <p>Only use these words when they honestly fit your experience and improve clarity.</p>
              <p>Do not force words you cannot support with real work, training, or credentials.</p>
            </div>
          </div>
        </Card>
      )}

      {analysisResult.format_issues.length > 0 && (
        <Card>
          <CardHeader title={`Details to Check (${analysisResult.format_issues.length})`} />
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {analysisResult.format_issues.map((issue, idx) => (
              <div
                key={idx}
                className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
              >
                <div className="flex items-start gap-2 mb-2">
                  <Badge variant={getSeverityVariant(issue.severity)} size="sm">
                    {formatIssueSeverity(issue.severity)}
                  </Badge>
                  <p className="font-medium text-surface-800 dark:text-surface-200 flex-1">
                    {issue.issue}
                  </p>
                </div>
                <p className="text-sm text-surface-600 dark:text-surface-400 bg-sentinel-50 dark:bg-sentinel-900/20 px-2 py-1 rounded">
                  Possible edit to review: {issue.fix}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {analysisResult.suggestions.length > 0 && (
        <Card>
          <CardHeader title={`Suggestions (${analysisResult.suggestions.length})`} />
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {analysisResult.suggestions.map((suggestion, idx) => (
              <details
                key={idx}
                className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
              >
                <summary className="cursor-pointer font-medium text-surface-800 dark:text-surface-200 flex items-center gap-2">
                  <Badge variant="sentinel" size="sm">
                    {formatSuggestionCategory(suggestion.category)}
                  </Badge>
                  <span className="flex-1">{suggestion.suggestion}</span>
                </summary>
                <p className="text-sm text-surface-600 dark:text-surface-400 mt-2 pl-2">
                  Why it helps: {suggestion.impact}
                </p>
              </details>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function getSeverityVariant(severity: IssueSeverity): "danger" | "alert" | "sentinel" {
  if (severity === "Critical") return "danger";
  if (severity === "Warning") return "alert";
  return "sentinel";
}

function getImportanceVariant(importance: KeywordImportance): "danger" | "alert" | "success" {
  if (importance === "Required") return "danger";
  if (importance === "Preferred") return "alert";
  return "success";
}

function highlightKeywords(
  text: string,
  keywords: string[],
  type: "match" | "missing",
): ReactElement {
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

function highlightKeywordGroups(
  text: string,
  matchedKeywords: string[],
  missingKeywords: string[],
): ReactElement {
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

function getMissingKeywordDetails(analysisResult: AtsAnalysisResult): MissingKeyword[] {
  if (
    analysisResult.missing_keyword_details &&
    analysisResult.missing_keyword_details.length > 0
  ) {
    return analysisResult.missing_keyword_details;
  }

  return analysisResult.missing_keywords.map((keyword) => ({
    keyword,
    importance: "Industry",
  }));
}

function getMissingKeywordGroups(missing: MissingKeyword[]) {
  return {
    required: missing.filter((gap) => gap.importance === "Required"),
    preferred: missing.filter((gap) => gap.importance === "Preferred"),
    other: missing.filter((gap) => gap.importance === "Industry"),
  };
}

function getRequirementStateVariant(
  state: RequirementMatchState,
): "success" | "sentinel" | "alert" | "danger" | "surface" {
  if (state === "Strong") return "success";
  if (state === "Direct") return "sentinel";
  if (state === "Partial" || state === "Implied") return "alert";
  if (state === "Missing") return "danger";
  return "surface";
}

function ScoreItem({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-surface-600 dark:text-surface-400">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getScoreBg(score)} transition-all duration-300`}
            style={{ width: `${getScoreProgressPercent(score)}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-surface-700 dark:text-surface-300 w-28 text-right">
          {getScoreLabel(score)}
        </span>
      </div>
    </div>
  );
}
