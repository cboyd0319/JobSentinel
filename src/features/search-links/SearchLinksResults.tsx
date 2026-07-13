import type { DeepLink } from "../../shared/search-links";
import { SiteCategory } from "../../shared/search-links";
import { RESTRICTED_JOB_SOURCE_WARNING } from "../../shared/restrictedSourceTaxonomy";
import {
  SEARCH_LINK_CATEGORY_METADATA,
  type SearchLinkCategoryIcon,
} from "./searchLinkCategories";

interface SearchLinksResultsProps {
  acknowledgedSiteIds: Set<string>;
  links: DeepLink[];
  loading: boolean;
  onAcknowledgementChange: (siteId: string, acknowledged: boolean) => void;
  onOpen: (link: DeepLink) => Promise<void>;
  onSelectedCategoryChange: (category: SiteCategory | "all") => void;
  selectedCategory: SiteCategory | "all";
}

export function SearchLinksResults({
  acknowledgedSiteIds,
  links,
  loading,
  onAcknowledgementChange,
  onOpen,
  onSelectedCategoryChange,
  selectedCategory,
}: SearchLinksResultsProps) {
  const filteredLinks =
    selectedCategory === "all"
      ? links
      : links.filter((link) => link.site.category === selectedCategory);
  const availableCategories = Array.from(
    new Set(links.map((link) => link.site.category)),
  ).sort();

  if (links.length === 0) {
    if (loading) {
      return null;
    }
    return (
      <div className="rounded-lg bg-gray-50 p-8 text-center dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-400">
          Enter a job title and create search links to get started.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-label="Created search links">
      <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
        <div className="flex flex-wrap gap-2">
          <CategoryButton
            active={selectedCategory === "all"}
            count={links.length}
            label="All"
            onClick={() => onSelectedCategoryChange("all")}
          />
          {availableCategories.map((category) => {
            const metadata = SEARCH_LINK_CATEGORY_METADATA[category];
            return (
              <CategoryButton
                active={selectedCategory === category}
                count={links.filter((link) => link.site.category === category).length}
                icon={metadata.icon}
                key={category}
                label={metadata.label}
                onClick={() => onSelectedCategoryChange(category)}
                selectedClassName={metadata.selectedClassName}
              />
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredLinks.map((link) => (
          <SearchLinkCard
            acknowledged={acknowledgedSiteIds.has(link.site.id)}
            key={link.site.id}
            link={link}
            onAcknowledgementChange={onAcknowledgementChange}
            onOpen={onOpen}
          />
        ))}
      </div>

      {filteredLinks.length === 0 && (
        <div className="rounded-lg bg-gray-50 p-8 text-center dark:bg-gray-800">
          <p className="text-gray-600 dark:text-gray-400">No sites in this category</p>
        </div>
      )}
    </section>
  );
}

interface CategoryButtonProps {
  active: boolean;
  count: number;
  icon?: SearchLinkCategoryIcon;
  label: string;
  onClick: () => void;
  selectedClassName?: string;
}

function CategoryButton({
  active,
  count,
  icon,
  label,
  onClick,
  selectedClassName = "bg-blue-600 text-white",
}: CategoryButtonProps) {
  return (
    <button
      className={`rounded-lg px-4 py-2 font-medium transition-colors ${
        active
          ? selectedClassName
          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="inline-flex items-center gap-1.5">
        {icon && <CategoryIcon className="h-4 w-4" icon={icon} />}
        <span>{label} ({count})</span>
      </span>
    </button>
  );
}

interface SearchLinkCardProps {
  acknowledged: boolean;
  link: DeepLink;
  onAcknowledgementChange: (siteId: string, acknowledged: boolean) => void;
  onOpen: (link: DeepLink) => Promise<void>;
}

function SearchLinkCard({
  acknowledged,
  link,
  onAcknowledgementChange,
  onOpen,
}: SearchLinkCardProps) {
  const metadata = SEARCH_LINK_CATEGORY_METADATA[link.site.category];
  const needsAcknowledgement = link.site.requires_user_acknowledgement === true;

  return (
    <article className="rounded-lg bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <SiteInitial name={link.site.name} />
          <h2 className="font-semibold text-gray-900 dark:text-white">{link.site.name}</h2>
        </div>
        <span className="text-gray-500 dark:text-gray-400" title={metadata.label}>
          <CategoryIcon icon={metadata.icon} />
        </span>
      </div>

      {link.site.notes && (
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">{link.site.notes}</p>
      )}

      {link.site.requires_login && (
        <div className="mb-3 inline-flex items-center gap-1 rounded border border-yellow-300 bg-yellow-100 px-2 py-1 text-xs text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
          <CategoryIcon className="h-3.5 w-3.5" icon="lock" />
          <span>You may need to sign in on that site</span>
        </div>
      )}

      {needsAcknowledgement && (
        <div className="mb-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/25">
          <p className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
            Restricted source warning
          </p>
          <p className="text-sm leading-6 text-amber-800 dark:text-amber-200">
            {RESTRICTED_JOB_SOURCE_WARNING}
          </p>
          <label className="mt-4 flex items-start gap-3 text-sm font-medium text-amber-900 dark:text-amber-100">
            <input
              checked={acknowledged}
              className="mt-0.5 h-5 w-5 rounded border-amber-300 text-amber-700 focus:ring-amber-500"
              onChange={(event) =>
                onAcknowledgementChange(link.site.id, event.target.checked)
              }
              type="checkbox"
            />
            <span>I understand this risk and want to open this search.</span>
          </label>
        </div>
      )}

      <button
        aria-label={`Open ${link.site.name} search in your browser`}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
        disabled={needsAcknowledgement && !acknowledged}
        onClick={() => void onOpen(link)}
        type="button"
      >
        Open Search
      </button>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">Opens in your browser</p>
    </article>
  );
}

function SiteInitial({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200"
    >
      {initial}
    </span>
  );
}

function CategoryIcon({
  className = "h-5 w-5",
  icon,
}: {
  className?: string;
  icon: SearchLinkCategoryIcon;
}) {
  const commonProps = {
    "aria-hidden": true,
    className,
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
  };

  switch (icon) {
    case "globe":
    case "remote":
      return <svg {...commonProps}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3 12h18M12 3c2 2.5 3 5.5 3 9s-1 6.5-3 9c-2-2.5-3-5.5-3-9s1-6.5 3-9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} /></svg>;
    case "laptop":
      return <svg {...commonProps}><path d="M5 5h14v10H5V5zm-2 14h18" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} /></svg>;
    case "building":
      return <svg {...commonProps}><path d="M4 21V7a2 2 0 012-2h8a2 2 0 012 2v14M9 9h1m-1 4h1m4-4h1m-1 4h1M3 21h18" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} /></svg>;
    case "rocket":
      return <svg {...commonProps}><path d="M5 19c4.5-1 9.5-6 10.5-10.5L19 5l-3.5 1C11 7 6 12 5 16.5V19z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} /><path d="M9 15l-4 4m10-14l4 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} /></svg>;
    case "lock":
      return <svg {...commonProps}><path d="M7 11V8a5 5 0 0110 0v3m-9 0h8a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} /></svg>;
    case "briefcase":
      return <svg {...commonProps}><path d="M10 6V5a2 2 0 012-2h0a2 2 0 012 2v1m-9 4h14M5 8h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} /></svg>;
  }
}
