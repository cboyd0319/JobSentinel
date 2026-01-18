import { Card, Badge } from "./";

interface MarketSnapshot {
  date: string;
  total_jobs: number;
  new_jobs_today: number;
  jobs_filled_today: number;
  avg_salary: number | null;
  median_salary: number | null;
  remote_job_percentage: number;
  top_skill: string | null;
  top_company: string | null;
  top_location: string | null;
  total_companies_hiring: number;
  market_sentiment: string;
}

interface MarketSnapshotCardProps {
  snapshot: MarketSnapshot | null;
  loading?: boolean;
}

export function MarketSnapshotCard({ snapshot, loading = false }: MarketSnapshotCardProps) {
  if (loading) {
    return (
      <Card className="dark:bg-surface-800 animate-pulse">
        <div className="h-24 bg-surface-200 dark:bg-surface-700 rounded" />
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card className="dark:bg-surface-800">
        <p className="text-center text-surface-500 dark:text-surface-400 py-6">
          No market snapshot available. Run analysis to generate one.
        </p>
      </Card>
    );
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case "bullish":
        return "📈";
      case "bearish":
        return "📉";
      default:
        return "➖";
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case "bullish":
        return "text-green-600 dark:text-green-400";
      case "bearish":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-surface-600 dark:text-surface-400";
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="dark:bg-surface-800">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Main stats */}
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-2xl font-bold text-surface-900 dark:text-white">
              {snapshot.total_jobs.toLocaleString()}
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400">Total Jobs</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              +{snapshot.new_jobs_today.toLocaleString()}
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400">New Today</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {snapshot.remote_job_percentage.toFixed(0)}%
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400">Remote</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-surface-900 dark:text-white">
              {formatCurrency(snapshot.median_salary)}
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400">Median Salary</p>
          </div>
        </div>

        {/* Sentiment */}
        <div className="text-right">
          <span className={`text-2xl ${getSentimentColor(snapshot.market_sentiment)}`}>
            {getSentimentIcon(snapshot.market_sentiment)} {snapshot.market_sentiment}
          </span>
          <p className="text-sm text-surface-500 dark:text-surface-400">Market Sentiment</p>
        </div>
      </div>

      {/* Top badges */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
        {snapshot.top_skill && (
          <Badge variant="sentinel">🔧 Top Skill: {snapshot.top_skill}</Badge>
        )}
        {snapshot.top_company && (
          <Badge variant="surface">🏢 Top Company: {snapshot.top_company}</Badge>
        )}
        {snapshot.top_location && (
          <Badge variant="surface">📍 Top Location: {snapshot.top_location}</Badge>
        )}
        <Badge variant="surface">
          🏭 {snapshot.total_companies_hiring.toLocaleString()} Companies Hiring
        </Badge>
      </div>
    </Card>
  );
}
