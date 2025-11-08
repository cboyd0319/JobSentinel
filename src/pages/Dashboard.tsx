import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Job {
  id: number;
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string;
  score: number;
  discovered_at: string;
}

interface Statistics {
  total_jobs: number;
  high_matches: number;
  average_score: number;
}

interface ScrapingStatus {
  last_scrape: string | null;
  next_scrape: string | null;
  is_running: boolean;
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total_jobs: 0,
    high_matches: 0,
    average_score: 0,
  });
  const [scrapingStatus, setScrapingStatus] = useState<ScrapingStatus>({
    last_scrape: null,
    next_scrape: null,
    is_running: false,
  });
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch recent jobs, statistics, and scraping status in parallel
      const [jobsData, statsData, statusData] = await Promise.all([
        invoke<Job[]>("get_recent_jobs", { limit: 50 }),
        invoke<Statistics>("get_statistics"),
        invoke<ScrapingStatus>("get_scraping_status"),
      ]);

      setJobs(jobsData);
      setStatistics(statsData);
      setScrapingStatus(statusData);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearchNow = async () => {
    try {
      setSearching(true);
      setError(null);
      await invoke("search_jobs");
      // Refresh data after search completes
      await fetchData();
    } catch (err) {
      console.error("Failed to search jobs:", err);
      setError(err instanceof Error ? err.message : "Failed to search jobs");
    } finally {
      setSearching(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatScore = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 overflow-auto">
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            JobSentinel Dashboard
          </h1>
          <button
            onClick={handleSearchNow}
            disabled={searching}
            className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searching ? "Searching..." : "Search Now"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Total Jobs
            </h3>
            <p className="text-3xl font-bold text-primary">
              {statistics.total_jobs}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              High Matches
            </h3>
            <p className="text-3xl font-bold text-success">
              {statistics.high_matches}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Avg Score
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {formatScore(statistics.average_score)}
            </p>
          </div>
        </div>

        {/* Scraping Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Scraping Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Last Scrape</p>
              <p className="font-medium">{formatDate(scrapingStatus.last_scrape)}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Next Scrape</p>
              <p className="font-medium">{formatDate(scrapingStatus.next_scrape)}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Status</p>
              <p className="font-medium">
                {scrapingStatus.is_running ? (
                  <span className="text-primary">Running...</span>
                ) : (
                  <span className="text-gray-900">Idle</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Jobs</h2>
          {jobs.length === 0 ? (
            <p className="text-gray-600">
              No jobs found yet. Click "Search Now" to start scraping.
            </p>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {job.title}
                      </h3>
                      <p className="text-gray-600">{job.company}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          job.score >= 0.9
                            ? "bg-green-100 text-green-800"
                            : job.score >= 0.7
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {formatScore(job.score)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span>{job.location || "Remote"}</span>
                    <span>•</span>
                    <span>{job.source}</span>
                    <span>•</span>
                    <span>{formatDate(job.discovered_at)}</span>
                  </div>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-dark font-medium text-sm"
                  >
                    View Job →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
