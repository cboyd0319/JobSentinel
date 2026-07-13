import { useState, type FormEvent } from "react";
import {
  JobType,
  RemoteType,
  type SearchCriteria,
} from "../../shared/search-links";

interface SearchLinksFormProps {
  error: string | null;
  loading: boolean;
  onSubmit: (criteria: SearchCriteria) => Promise<void>;
}

export function SearchLinksForm({ error, loading, onSubmit }: SearchLinksFormProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState<JobType | "">("");
  const [remoteType, setRemoteType] = useState<RemoteType | "">("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit({
      query: query.trim(),
      location: location.trim() || undefined,
      job_type: jobType || undefined,
      remote_type: remoteType || undefined,
    });
  };

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <form className="space-y-4" noValidate onSubmit={submit}>
        <div>
          <label
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="search-links-query"
          >
            Job title or work words
          </label>
          <input
            aria-required="true"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            id="search-links-query"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g., Marketing Manager, Registered Nurse"
            type="text"
            value={query}
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="search-links-location"
          >
            Location (optional)
          </label>
          <input
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            id="search-links-location"
            onChange={(event) => setLocation(event.target.value)}
            placeholder="e.g., Chicago, IL or Remote"
            type="text"
            value={location}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              htmlFor="search-links-job-type"
            >
              Job Type (optional)
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              id="search-links-job-type"
              onChange={(event) => setJobType(event.target.value as JobType | "")}
              value={jobType}
            >
              <option value="">Any job type</option>
              <option value={JobType.FullTime}>Full-time</option>
              <option value={JobType.PartTime}>Part-time</option>
              <option value={JobType.Contract}>Contract</option>
              <option value={JobType.Temporary}>Temporary</option>
              <option value={JobType.Internship}>Internship</option>
            </select>
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              htmlFor="search-links-work-mode"
            >
              Work Mode (optional)
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              id="search-links-work-mode"
              onChange={(event) => setRemoteType(event.target.value as RemoteType | "")}
              value={remoteType}
            >
              <option value="">Any work mode</option>
              <option value={RemoteType.Remote}>Remote</option>
              <option value={RemoteType.Hybrid}>Hybrid</option>
              <option value={RemoteType.Onsite}>Onsite</option>
            </select>
          </div>
        </div>

        {error && (
          <div
            aria-live="assertive"
            className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
            role="alert"
          >
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          className="w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400"
          disabled={loading}
          type="submit"
        >
          {loading ? "Creating Links..." : "Create Search Links"}
        </button>
      </form>
    </section>
  );
}
