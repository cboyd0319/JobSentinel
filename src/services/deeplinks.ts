/**
 * Deep Link Service
 *
 * Frontend service for generating job search deep links.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  DeepLink,
  SearchCriteria,
  SiteCategory,
  SiteInfo,
} from "../types/deeplinks";

/**
 * Generate deep links for all supported sites
 */
export async function generateDeepLinks(
  criteria: SearchCriteria
): Promise<DeepLink[]> {
  return invoke<DeepLink[]>("generate_deep_links", { criteria });
}

/**
 * Generate deep link for a specific site
 */
export async function generateDeepLink(
  siteId: string,
  criteria: SearchCriteria
): Promise<DeepLink> {
  return invoke<DeepLink>("generate_deep_link", { siteId, criteria });
}

/**
 * Get all supported job sites
 */
export async function getSupportedSites(): Promise<SiteInfo[]> {
  return invoke<SiteInfo[]>("get_supported_sites");
}

/**
 * Get sites by category
 */
export async function getSitesByCategory(
  category: SiteCategory
): Promise<SiteInfo[]> {
  return invoke<SiteInfo[]>("get_sites_by_category_cmd", { category });
}

/**
 * Open a deep link URL in the default browser
 */
export async function openDeepLink(url: string): Promise<void> {
  return invoke<void>("open_deep_link", { url });
}

/**
 * Group sites by category
 */
export function groupSitesByCategory(sites: SiteInfo[]): Map<SiteCategory, SiteInfo[]> {
  const grouped = new Map<SiteCategory, SiteInfo[]>();

  for (const site of sites) {
    const existing = grouped.get(site.category) || [];
    existing.push(site);
    grouped.set(site.category, existing);
  }

  return grouped;
}

/**
 * Filter sites by category
 */
export function filterSitesByCategory(
  sites: SiteInfo[],
  category: SiteCategory
): SiteInfo[] {
  return sites.filter((site) => site.category === category);
}

/**
 * Sort sites by name
 */
export function sortSitesByName(sites: SiteInfo[]): SiteInfo[] {
  return [...sites].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Search sites by name or ID
 */
export function searchSites(sites: SiteInfo[], query: string): SiteInfo[] {
  const lowerQuery = query.toLowerCase();
  return sites.filter(
    (site) =>
      site.name.toLowerCase().includes(lowerQuery) ||
      site.id.toLowerCase().includes(lowerQuery)
  );
}
