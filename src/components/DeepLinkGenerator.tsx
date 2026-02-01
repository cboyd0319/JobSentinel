/**
 * Deep Link Generator Component
 *
 * Generate pre-filled job search URLs for sites we can't scrape.
 */

import React, { useState, useEffect } from "react";
import {
  generateDeepLinks,
  getSupportedSites,
  openDeepLink,
} from "../services/deeplinks";
import type { DeepLink, SearchCriteria, SiteInfo } from "../types/deeplinks";
import { CATEGORY_METADATA, SiteCategory } from "../types/deeplinks";

interface DeepLinkGeneratorProps {
  /** Pre-filled search query */
  initialQuery?: string;
  /** Pre-filled location */
  initialLocation?: string;
}

export function DeepLinkGenerator({
  initialQuery = "",
  initialLocation = "",
}: DeepLinkGeneratorProps) {
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState(initialLocation);
  const [links, setLinks] = useState<DeepLink[]>([]);
  const [, setSites] = useState<SiteInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SiteCategory | "all">("all");

  // Load supported sites on mount
  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const supportedSites = await getSupportedSites();
      setSites(supportedSites);
    } catch (err) {
      console.error("Failed to load sites:", err);
      setError("Failed to load supported sites");
    }
  };

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
      };

      const generatedLinks = await generateDeepLinks(criteria);
      setLinks(generatedLinks);
    } catch (err) {
      console.error("Failed to generate links:", err);
      setError(`Failed to generate links: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      await openDeepLink(url);
    } catch (err) {
      console.error("Failed to open link:", err);
      setError(`Failed to open link: ${err}`);
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
              placeholder="e.g., Software Engineer, Product Manager"
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
                        ? `bg-${metadata.color}-600 text-white`
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {metadata.icon} {metadata.label} ({count})
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
                    <span className="text-xl" title={metadata.label}>
                      {metadata.icon}
                    </span>
                  </div>

                  {link.site.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {link.site.notes}
                    </p>
                  )}

                  {link.site.requires_login && (
                    <div className="mb-3 inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded text-xs text-yellow-800 dark:text-yellow-400">
                      🔐 Login required
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
