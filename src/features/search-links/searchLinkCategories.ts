import { SiteCategory } from "../../shared/search-links";

export type SearchLinkCategoryIcon =
  | "briefcase"
  | "building"
  | "globe"
  | "laptop"
  | "lock"
  | "remote"
  | "rocket";

interface SearchLinkCategoryMetadata {
  icon: SearchLinkCategoryIcon;
  label: string;
  selectedClassName: string;
}

export const SEARCH_LINK_CATEGORY_METADATA: Record<
  SiteCategory,
  SearchLinkCategoryMetadata
> = {
  [SiteCategory.General]: {
    icon: "globe",
    label: "General",
    selectedClassName: "bg-blue-600 text-white",
  },
  [SiteCategory.Tech]: {
    icon: "laptop",
    label: "Tech",
    selectedClassName: "bg-purple-600 text-white",
  },
  [SiteCategory.Government]: {
    icon: "building",
    label: "Government",
    selectedClassName: "bg-indigo-600 text-white",
  },
  [SiteCategory.Remote]: {
    icon: "remote",
    label: "Remote",
    selectedClassName: "bg-green-600 text-white",
  },
  [SiteCategory.Startups]: {
    icon: "rocket",
    label: "Startups",
    selectedClassName: "bg-orange-600 text-white",
  },
  [SiteCategory.Cleared]: {
    icon: "lock",
    label: "Cleared",
    selectedClassName: "bg-red-600 text-white",
  },
  [SiteCategory.Professional]: {
    icon: "briefcase",
    label: "Professional",
    selectedClassName: "bg-sky-600 text-white",
  },
};
