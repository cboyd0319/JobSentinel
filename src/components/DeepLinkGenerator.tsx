/**
 * Deep Link Generator Component
 *
 * Generate pre-filled job search URLs for sites we can't scrape.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  generateDeepLinks,
  getSupportedSites,
  openDeepLink,
} from "../services/deeplinks";
import type { CategoryMetadata, DeepLink, SearchCriteria, SiteInfo } from "../types/deeplinks";
import {
  CATEGORY_METADATA,
  JobType,
  RemoteType,
  SiteCategory,
} from "../types/deeplinks";
import { logError } from "../utils/errorUtils";

interface DeepLinkGeneratorProps {
  /** Pre-filled search query */
  initialQuery?: string;
  /** Pre-filled location */
  initialLocation?: string;
}

function CategoryIcon({
  icon,
  className = "h-5 w-5",
}: {
  icon: CategoryMetadata["icon"];
  className?: string;
}) {
  const commonProps = {
    className,
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    "aria-hidden": true,
  };

  switch (icon) {
    case "globe":
    case "remote":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3 12h18M12 3c2 2.5 3 5.5 3 9s-1 6.5-3 9c-2-2.5-3-5.5-3-9s1-6.5 3-9z" />
        </svg>
      );
    case "laptop":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5h14v10H5V5zm-2 14h18" />
        </svg>
      );
    case "building":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 21V7a2 2 0 012-2h8a2 2 0 012 2v14M9 9h1m-1 4h1m4-4h1m-1 4h1M3 21h18" />
        </svg>
      );
    case "rocket":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 19c4.5-1 9.5-6 10.5-10.5L19 5l-3.5 1C11 7 6 12 5 16.5V19z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 15l-4 4m10-14l4 4" />
        </svg>
      );
    case "lock":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 11V8a5 5 0 0110 0v3m-9 0h8a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6a2 2 0 012-2z" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6V5a2 2 0 012-2h0a2 2 0 012 2v1m-9 4h14M5 8h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z" />
        </svg>
      );
  }
}

export function DeepLinkGenerator({
  initialQuery = "",
  initialLocation = "",
}: DeepLinkGeneratorProps) {
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState(initialLocation);
  const [jobType, setJobType] = useState<JobType | "">("");
  const [remoteType, setRemoteType] = useState<RemoteType | "">("");
  const [links, setLinks] = useState<DeepLink[]>([]);
  const [, setSites] = useState<SiteInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SiteCategory | "all">("all");

  const loadSites = useCallback(async () => {
    try {
      const supportedSites = await getSupportedSites();
      setSites(supportedSites);
    } catch (err) {
      logError("Failed to load deep-link sites:", err);
      setError("Failed to load supported sites");
    }
  }, []);

  // Load supported sites on mount
  useEffect(() => {
    void loadSites();
  }, [loadSites]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError("Please enter a job title or keywords");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const criteria: SearchCriteria = {
        query: query.trim(),
        location: location.trim() || undefined,
        job_type: jobType || undefined,
        remote_type: remoteType || undefined,
      };

      const generatedLinks = await generateDeepLinks(criteria);
      setLinks(generatedLinks);
    } catch (err) {
      logError("Failed to generate deep links:", err);
      setError("Failed to generate links");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      await openDeepLink(url);
    } catch (err) {
      logError("Failed to open deep link:", err);
      setError("Failed to open link");
    }
  };

  // Filter links by category
  const filteredLinks =
    selectedCategory === "all"
      ? links
      : links.filter((link) => link.site.category === selectedCategory);

  // Group links by category
  const linksByCategory = new Map<SiteCategory, DeepLink[]>();
  for (const link of filteredLinks) {
    const existing = linksByCategory.get(link.site.category) || [];
    existing.push(link);
    linksByCategory.set(link.site.category, existing);
  }

  // Get unique categories from generated links
  const availableCategories = Array.from(
    new Set(links.map((link) => link.site.category))
  ).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Deep Link Generator
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Generate pre-filled search URLs for job sites. Click any link to open it in
          your browser with your search criteria ready.
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label
              htmlFor="query"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Job Title or Keywords *
            </label>
            <input
              type="text"
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Marketing Manager, Registered Nurse"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Location (optional)
            </label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., San Francisco, CA or Remote"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="job-type"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Job Type (optional)
              </label>
              <select
                id="job-type"
                value={jobType}
                onChange={(e) => setJobType(e.target.value as JobType | "")}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                htmlFor="work-mode"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Work Mode (optional)
              </label>
              <select
                id="work-mode"
                value={remoteType}
                onChange={(e) => setRemoteType(e.target.value as RemoteType | "")}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Any work mode</option>
                <option value={RemoteType.Remote}>Remote</option>
                <option value={RemoteType.Hybrid}>Hybrid</option>
                <option value={RemoteType.Onsite}>Onsite</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? "Generating Links..." : "Generate Deep Links"}
          </button>
        </form>
      </div>

      {/* Results */}
      {links.length > 0 && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                All ({links.length})
              </button>
              {availableCategories.map((category) => {
                const metadata = CATEGORY_METADATA[category];
                const count = links.filter((l) => l.site.category === category).length;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedCategory === category
                        ? metadata.selectedClassName
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <CategoryIcon icon={metadata.icon} className="h-4 w-4" />
                      <span>{metadata.label} ({count})</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLinks.map((link) => {
              const metadata = CATEGORY_METADATA[link.site.category];
              return (
                <div
                  key={link.site.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {link.site.logo_url && (
                        <img
                          src={link.site.logo_url}
                          alt={`${link.site.name} logo`}
                          className="w-6 h-6 rounded"
                        />
                      )}
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {link.site.name}
                      </h3>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400" title={metadata.label}>
                      <CategoryIcon icon={metadata.icon} />
                    </span>
                  </div>

                  {link.site.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {link.site.notes}
                    </p>
                  )}

                  {link.site.requires_login && (
                    <div className="mb-3 inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded text-xs text-yellow-800 dark:text-yellow-400">
                      <CategoryIcon icon="lock" className="h-3.5 w-3.5" />
                      <span>Login required</span>
                    </div>
                  )}

                  <button
                    onClick={() => handleOpenLink(link.url)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Open Search
                  </button>

                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-500 truncate">
                    {link.url}
                  </p>
                </div>
              );
            })}
          </div>

          {filteredLinks.length === 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No sites in this category
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {links.length === 0 && !loading && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Enter a job title and click "Generate Deep Links" to get started
          </p>
        </div>
      )}
    </div>
  );
}
