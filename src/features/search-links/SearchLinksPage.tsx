import { useState } from "react";
import {
  generateDeepLinks,
  openDeepLink,
  type DeepLink,
  type SearchCriteria,
  SiteCategory,
} from "../../shared/search-links";
import { logError } from "../../utils/errorUtils";
import { SearchLinksForm } from "./SearchLinksForm";
import { SearchLinksResults } from "./SearchLinksResults";

export function SearchLinksPage() {
  const [links, setLinks] = useState<DeepLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SiteCategory | "all">("all");
  const [acknowledgedSiteIds, setAcknowledgedSiteIds] = useState<Set<string>>(
    () => new Set(),
  );

  const createLinks = async (criteria: SearchCriteria) => {
    if (!criteria.query) {
      setError("Add a job title or work words.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setLinks(await generateDeepLinks(criteria));
      setSelectedCategory("all");
      setAcknowledgedSiteIds(new Set());
    } catch (cause) {
      logError("Failed to generate search links:", cause);
      setError("Could not create search links");
    } finally {
      setLoading(false);
    }
  };

  const setSiteAcknowledged = (siteId: string, acknowledged: boolean) => {
    setAcknowledgedSiteIds((current) => {
      const next = new Set(current);
      if (acknowledged) {
        next.add(siteId);
      } else {
        next.delete(siteId);
      }
      return next;
    });
  };

  const openLink = async (link: DeepLink) => {
    if (
      link.site.requires_user_acknowledgement &&
      !acknowledgedSiteIds.has(link.site.id)
    ) {
      setError("Review the restricted-site warning and check the box before opening this search.");
      return;
    }

    try {
      await openDeepLink(link.url);
    } catch (cause) {
      logError("Failed to open search link:", cause);
      setError("Could not open search link");
    }
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          Job Site Search Links
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create ready-to-use searches for job sites you review in your browser
          instead of scheduled source checks.
        </p>
      </header>

      <SearchLinksForm error={error} loading={loading} onSubmit={createLinks} />
      <SearchLinksResults
        acknowledgedSiteIds={acknowledgedSiteIds}
        links={links}
        loading={loading}
        onAcknowledgementChange={setSiteAcknowledged}
        onOpen={openLink}
        onSelectedCategoryChange={setSelectedCategory}
        selectedCategory={selectedCategory}
      />
    </div>
  );
}

export default SearchLinksPage;
