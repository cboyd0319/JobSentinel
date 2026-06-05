import { Badge } from "../components/Badge";
import { Card, CardHeader } from "../components/Card";

type JobWordImportance = "Required" | "Preferred" | "Industry";
type JobWordBadgeVariant = "danger" | "alert" | "success";

interface JobWordMatch {
  keyword: string;
  importance: JobWordImportance;
  found_in: string[];
}

interface JobWordGroupConfig {
  title: JobWordImportance;
  variant: JobWordBadgeVariant;
  className: string;
}

interface JobWordsOverviewCardProps {
  keywordMatches: JobWordMatch[];
  formatEvidenceSections: (sections: string[]) => string;
}

const jobWordGroups: JobWordGroupConfig[] = [
  {
    title: "Required",
    variant: "danger",
    className: "text-red-700 dark:text-red-400",
  },
  {
    title: "Preferred",
    variant: "alert",
    className: "text-yellow-700 dark:text-yellow-400",
  },
  {
    title: "Industry",
    variant: "success",
    className: "text-green-700 dark:text-green-400",
  },
];

function getKeywordOpacity(keywordMatches: JobWordMatch[], keyword: string): string {
  const count = keywordMatches.filter(
    (match) => match.keyword.toLowerCase() === keyword.toLowerCase(),
  ).length;

  if (count >= 5) return "opacity-100";
  if (count >= 3) return "opacity-75";
  if (count >= 2) return "opacity-60";
  return "opacity-40";
}

function getGroupMatches(keywordMatches: JobWordMatch[], importance: JobWordImportance) {
  return keywordMatches.filter((match) => match.importance === importance);
}

export function JobWordsOverviewCard({
  keywordMatches,
  formatEvidenceSections,
}: JobWordsOverviewCardProps) {
  return (
    <Card>
      <CardHeader title="Job Words Overview" />
      <div className="space-y-4">
        {jobWordGroups.map((group) => {
          const matches = getGroupMatches(keywordMatches, group.title);

          if (matches.length === 0) {
            return null;
          }

          return (
            <div key={group.title}>
              <h4 className={`text-sm font-semibold ${group.className} mb-2 flex items-center gap-2`}>
                <Badge variant={group.variant} size="sm">{group.title}</Badge>
                <span className="text-surface-500 dark:text-surface-400 font-normal">
                  ({matches.length} words)
                </span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {matches.map((match, idx) => (
                  <div
                    key={idx}
                    className={`group relative ${getKeywordOpacity(keywordMatches, match.keyword)}`}
                  >
                    <Badge variant={group.variant}>
                      {match.keyword}
                    </Badge>
                    <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-surface-900 dark:bg-surface-700 text-white text-xs rounded whitespace-nowrap z-10">
                      Found in: {formatEvidenceSections(match.found_in)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="flex items-start gap-2 p-3 bg-sentinel-50 dark:bg-sentinel-900/20 rounded-lg text-sm">
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
          <p className="text-sentinel-800 dark:text-sentinel-300">
            Darker badges appear more often in your resume. Hover over a badge to see where the word was found.
          </p>
        </div>
      </div>
    </Card>
  );
}
